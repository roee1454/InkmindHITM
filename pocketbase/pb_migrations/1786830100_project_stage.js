/// <reference path="../pb_data/types.d.ts" />

// The project funnel (docs/architecture.md §9). `stage` is derived by pb_hooks/lib/project-stage.js
// from the project's milestones and its appointments; these fields are its inputs and outputs.
// - stage, stage_changed_at: the derived stage and when it last moved.
// - stage_actor, stage_reason: transient attribution consumed by the hook (like status_actor).
// - lost_*, completed_at, quote_*: the explicit milestones the Node server writes.
// - estimated_sessions: the size of a multi-session piece ("session 2 of ~3").
// - nps_score, lifecycle_sent: end-of-project feedback, once per project.
//
// Backfill: every existing project gets its stage. The rule is copied here on purpose: a migration
// must keep computing what it computed when it was written, even after the live rule changes.
const PROJECTS = 'pbc_projects'

const FIELDS = [
  {
    id: 'select_project_stage',
    name: 'stage',
    type: 'select',
    maxSelect: 1,
    values: ['inquiry', 'consultation_scheduled', 'consultation_done', 'quoted', 'booked', 'in_progress', 'completed', 'lost'],
  },
  { id: 'date_project_stage_changed_at', name: 'stage_changed_at', type: 'date' },
  { id: 'select_project_stage_actor', name: 'stage_actor', type: 'select', maxSelect: 1, values: ['customer', 'staff', 'bot', 'system'] },
  { id: 'text_project_stage_reason', name: 'stage_reason', type: 'text', max: 200 },
  {
    id: 'select_project_lost_reason',
    name: 'lost_reason',
    type: 'select',
    maxSelect: 1,
    values: ['price', 'no_response', 'chose_other_studio', 'customer_cancelled', 'no_show', 'other'],
  },
  { id: 'text_project_lost_note', name: 'lost_note', type: 'text', max: 1000 },
  { id: 'date_project_lost_at', name: 'lost_at', type: 'date' },
  { id: 'date_project_completed_at', name: 'completed_at', type: 'date' },
  { id: 'number_project_quote_min', name: 'quote_min', type: 'number', min: 0 },
  { id: 'number_project_quote_max', name: 'quote_max', type: 'number', min: 0 },
  { id: 'date_project_quote_sent_at', name: 'quote_sent_at', type: 'date' },
  { id: 'number_project_estimated_sessions', name: 'estimated_sessions', type: 'number', min: 0, onlyInt: true },
  { id: 'number_project_nps_score', name: 'nps_score', type: 'number', min: 0, max: 10, onlyInt: true },
  { id: 'json_project_lifecycle_sent', name: 'lifecycle_sent', type: 'json', maxSize: 20000 },
]

const INDEXES = [
  'CREATE INDEX idx_projects_stage ON projects (stage)',
  'CREATE INDEX idx_projects_customer_stage ON projects (customer, stage)',
]

// Snapshot of deriveProjectStage (pb_hooks/lib/project-stage.js) as of this migration.
function stageAtMigration(project, appointments) {
  if (project.getString('lost_at')) return 'lost'
  if (project.getString('completed_at')) return 'completed'
  const has = (kind, statuses) => appointments.some((a) => a.getString('kind') === kind && statuses.indexOf(a.getString('status')) !== -1)
  if (has('session', ['completed'])) return 'in_progress'
  if (has('session', ['confirmed'])) return 'booked'
  if (project.getString('quote_sent_at')) return 'quoted'
  if (has('consultation', ['completed'])) return 'consultation_done'
  if (has('consultation', ['pending', 'confirmed'])) return 'consultation_scheduled'
  return 'inquiry'
}

// Appointments priced before projects carried the quote: the earliest priced appointment's range
// becomes the project's quote, so "quoted" survives the upgrade.
function backfillQuote(project, appointments) {
  const priced = appointments
    .filter((a) => a.getFloat('price_min') > 0 || a.getFloat('price_max') > 0)
    .sort((a, b) => (a.getString('created') < b.getString('created') ? -1 : 1))[0]
  if (!priced) return
  project.set('quote_min', priced.getFloat('price_min'))
  project.set('quote_max', priced.getFloat('price_max'))
  project.set('quote_sent_at', priced.getString('created'))
}

function backfill(app) {
  const counts = {}
  for (const project of app.findAllRecords(PROJECTS)) {
    const appointments = app.findRecordsByFilter('appointments', 'project = {:project}', '', 0, 0, { project: project.id })
    backfillQuote(project, appointments)
    const stage = stageAtMigration(project, appointments)
    project.set('stage', stage)
    project.set('stage_changed_at', project.getString('updated'))
    // saveNoValidate: hooks and validation aren't what a backfill should trip over.
    app.saveNoValidate(project)
    counts[stage] = (counts[stage] || 0) + 1
  }
  console.log(`[1786830100_project_stage] backfilled project stages: ${JSON.stringify(counts)}`)
}

migrate(
  (app) => {
    const projects = app.findCollectionByNameOrId(PROJECTS)
    for (const field of FIELDS) {
      if (!projects.fields.getByName(field.name)) projects.fields.add(new Field({ required: false, ...field }))
    }
    projects.indexes = projects.indexes.concat(INDEXES)
    app.save(projects)
    backfill(app)
  },
  (app) => {
    const projects = app.findCollectionByNameOrId(PROJECTS)
    for (const field of FIELDS) projects.fields.removeByName(field.name)
    projects.indexes = projects.indexes.filter((index) => INDEXES.indexOf(index) === -1)
    app.save(projects)
  },
)
