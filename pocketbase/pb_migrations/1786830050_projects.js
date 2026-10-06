/// <reference path="../pb_data/types.d.ts" />

// Projects: one tattoo piece = one project, and every appointment for it — consultation, the
// sessions, a touch-up — belongs to that project (docs/architecture.md §9). Before this, a tattoo
// session booked after a consultation was a free-standing copy whose only link to the consultation
// was a line in `notes`, so the calendar and analytics counted one piece of work twice.
//
// - projects: customer (cascade), title, description, primary_staff (nullify).
// - appointments.project (cascade: deleting a project deletes its appointments) and
//   appointments.kind (consultation | session | touch_up). `type` (sketch | tattoo) stays for now
//   and is kept in sync with `kind` by pb_hooks/projects.pb.js.
// - conversations.active_project: the project the bot is currently booking for.
//
// Backfill: every existing customer appointment gets a project. A session created through the old
// "continue to tattoo" flow (notes contain "בהמשך לפגישת סקיצה") joins the project of that
// customer's latest earlier consultation. Every decision is printed to the log for review.
const CUSTOMERS = 'pbc_108570809'
const STAFF = 'pbc_829252413'
const APPOINTMENTS = 'pbc_1037645436'
const CONVERSATIONS = 'pbc_728114816'
const FOLLOW_UP_MARKER = 'בהמשך לפגישת סקיצה'

migrate(
  (app) => {
    app.save(
      new Collection({
        id: 'pbc_projects',
        name: 'projects',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: null,
        updateRule: null,
        deleteRule: null,
        fields: [
          { name: 'customer', type: 'relation', required: true, maxSelect: 1, cascadeDelete: true, collectionId: CUSTOMERS },
          { name: 'title', type: 'text', required: false, max: 200 },
          { name: 'description', type: 'text', required: false, max: 4000 },
          { name: 'primary_staff', type: 'relation', required: false, maxSelect: 1, cascadeDelete: false, collectionId: STAFF },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE INDEX idx_projects_customer ON projects (customer)'],
      }),
    )

    const appointments = app.findCollectionByNameOrId(APPOINTMENTS)
    appointments.fields.add(
      new Field({
        id: 'relation_appt_project',
        name: 'project',
        type: 'relation',
        required: false,
        maxSelect: 1,
        cascadeDelete: true,
        collectionId: 'pbc_projects',
      }),
    )
    appointments.fields.add(
      new Field({
        id: 'select_appt_kind',
        name: 'kind',
        type: 'select',
        required: false,
        maxSelect: 1,
        values: ['consultation', 'session', 'touch_up'],
      }),
    )
    appointments.indexes = appointments.indexes.concat(['CREATE INDEX idx_appointments_project ON appointments (project)'])
    app.save(appointments)

    const conversations = app.findCollectionByNameOrId(CONVERSATIONS)
    conversations.fields.add(
      new Field({
        id: 'relation_conv_active_project',
        name: 'active_project',
        type: 'relation',
        required: false,
        maxSelect: 1,
        cascadeDelete: false,
        collectionId: 'pbc_projects',
      }),
    )
    app.save(conversations)

    backfill(app)
  },
  (app) => {
    const conversations = app.findCollectionByNameOrId(CONVERSATIONS)
    conversations.fields.removeById('relation_conv_active_project')
    app.save(conversations)

    const appointments = app.findCollectionByNameOrId(APPOINTMENTS)
    appointments.fields.removeById('relation_appt_project')
    appointments.fields.removeById('select_appt_kind')
    appointments.indexes = appointments.indexes.filter((index) => index.indexOf('idx_appointments_project') === -1)
    app.save(appointments)

    app.delete(app.findCollectionByNameOrId('projects'))
  },
)

function backfill(app) {
  const projectsCollection = app.findCollectionByNameOrId('pbc_projects')
  const records = app.findAllRecords(APPOINTMENTS)
  records.sort((a, b) => (a.getString('created') < b.getString('created') ? -1 : 1))

  const consultationsByCustomer = {}
  let projectsCreated = 0
  let followUpsLinked = 0

  for (const record of records) {
    const kind = record.getString('type') === 'sketch' ? 'consultation' : 'session'
    record.set('kind', kind)

    const customer = record.getString('customer')
    if (customer) {
      let projectId = ''
      if (kind === 'session' && record.getString('notes').indexOf(FOLLOW_UP_MARKER) !== -1) {
        const earlier = consultationsByCustomer[customer] || []
        const consultation = earlier[earlier.length - 1]
        if (consultation) {
          projectId = consultation.projectId
          followUpsLinked++
          console.log(`[projects backfill] linked session ${record.id} to consultation ${consultation.id} (project ${projectId})`)
        } else {
          console.log(`[projects backfill] session ${record.id} mentions a consultation but none was found — new project`)
        }
      }

      if (!projectId) {
        const project = new Record(projectsCollection)
        project.set('customer', customer)
        project.set('title', (record.getString('tattoo_description') || '').slice(0, 200) || (kind === 'consultation' ? 'פגישת ייעוץ' : 'קעקוע'))
        project.set('primary_staff', record.getString('staff'))
        app.save(project)
        projectId = project.id
        projectsCreated++
      }

      record.set('project', projectId)
      if (kind === 'consultation') {
        consultationsByCustomer[customer] = (consultationsByCustomer[customer] || []).concat([{ id: record.id, projectId }])
      }
    }

    app.save(record)
  }

  console.log(`[projects backfill] ${records.length} appointments: ${projectsCreated} projects created, ${followUpsLinked} follow-up sessions linked`)
}
