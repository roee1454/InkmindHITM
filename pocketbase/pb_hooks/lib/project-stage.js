/// <reference path="../../pb_data/types.d.ts" />

// The project funnel stage (docs/architecture.md §9). A project's stage is derived from its own
// milestones and its appointments, never picked by hand, so it can't drift from what happened.
// Called from pb_hooks/appointment-lifecycle.pb.js and pb_hooks/project-stage.pb.js, inside the
// save's transaction. Covered by tests/integration/project-stage.test.ts and, for the pure rule,
// tests/features/projects/project-stage-rule.test.ts.

const STAGES = [
  'inquiry',
  'consultation_scheduled',
  'consultation_done',
  'quoted',
  'booked',
  'in_progress',
  'completed',
  'lost',
]

/**
 * Pure: the stage for a project's milestones and its appointments' { kind, status }.
 * Checked in order, the first match wins. Touch-ups never move the stage, and cancelled or
 * no-show appointments don't count, so cancelling a session moves the project back.
 */
function deriveProjectStage(project, appointments) {
  if (project.lostAt) return 'lost'
  if (project.completedAt) return 'completed'
  const has = (kind, statuses) => appointments.some((a) => a.kind === kind && statuses.indexOf(a.status) !== -1)
  if (has('session', ['completed'])) return 'in_progress'
  if (has('session', ['confirmed'])) return 'booked'
  if (project.quoteSentAt) return 'quoted'
  if (has('consultation', ['completed'])) return 'consultation_done'
  if (has('consultation', ['pending', 'confirmed'])) return 'consultation_scheduled'
  return 'inquiry'
}

/**
 * Migrations older than 1786830100_project_stage.js run with today's hooks too (upgrading an old
 * database), before projects have a stage. The rule stays out of the way until its schema exists.
 */
function stageTracked(app) {
  return !!app.findCollectionByNameOrId('projects').fields.getByName('stage')
}

function pbNow() {
  return new Date().toISOString().replace('T', ' ')
}

function milestones(project) {
  return {
    lostAt: project.getString('lost_at'),
    completedAt: project.getString('completed_at'),
    quoteSentAt: project.getString('quote_sent_at'),
  }
}

function appointmentsOf(app, projectId) {
  return app
    .findRecordsByFilter('appointments', 'project = {:project}', '', 0, 0, { project: projectId })
    .map((a) => ({ kind: a.getString('kind'), status: a.getString('status') }))
}

function logTransition(app, projectId, from, to, attribution) {
  const log = new Record(app.findCollectionByNameOrId('state_transitions'))
  log.set('entity', 'projects')
  log.set('entity_id', projectId)
  log.set('from', from)
  log.set('to', to)
  log.set('actor', attribution.actor || '')
  log.set('reason', attribution.reason || '')
  app.save(log)
}

/**
 * For a project being saved (hook on `projects`): consumes the writer's stage_actor/stage_reason,
 * derives the stage and, when it changed, stamps and logs it. The caller saves the record.
 */
const PROJECT_HAS_ACTIVE_APPOINTMENTS = 'integrity:project_has_active_appointments'

/** Losing a customer who still has a booking is a contradiction: cancel the booking first. */
function assertCanBeLost(app, project, original) {
  const becomesLost = project.getString('lost_at') && !(original && original.getString('lost_at'))
  if (!becomesLost) return
  const active = app.findRecordsByFilter(
    'appointments',
    "project = {:project} && start_time > {:now} && (status = 'pending' || status = 'confirmed')",
    '',
    1,
    0,
    { project: project.id, now: pbNow() },
  )
  if (active.length > 0) throw new BadRequestError(PROJECT_HAS_ACTIVE_APPOINTMENTS)
}

function applyStage(app, project, original) {
  if (!stageTracked(app)) return
  assertCanBeLost(app, project, original)
  const attribution = { actor: project.getString('stage_actor'), reason: project.getString('stage_reason') }
  project.set('stage_actor', '')
  project.set('stage_reason', '')
  // Compared with the stored stage, so a value someone wrote into `stage` is simply replaced.
  const from = original ? original.getString('stage') : ''
  const to = deriveProjectStage(milestones(project), original ? appointmentsOf(app, project.id) : [])
  project.set('stage', to)
  if (from === to) return
  project.set('stage_changed_at', pbNow())
  // A new project's first stage is where it starts, not a move.
  if (original) logTransition(app, project.id, from, to, attribution)
}

/**
 * After an appointment was written or deleted: re-derives its project (and the project it left,
 * if it moved). Saving the project runs applyStage through the projects hook; the attribution is
 * the appointment change's own, so the log says who moved the funnel.
 */
function refreshProjects(app, projectIds, attribution) {
  if (!stageTracked(app)) return
  const seen = {}
  for (const projectId of projectIds) {
    if (!projectId || seen[projectId]) continue
    seen[projectId] = true
    let project
    try {
      project = app.findRecordById('projects', projectId)
    } catch (_) {
      continue // deleted in the same cascade
    }
    const next = deriveProjectStage(milestones(project), appointmentsOf(app, projectId))
    if (next === project.getString('stage')) continue
    project.set('stage_actor', attribution.actor || '')
    project.set('stage_reason', attribution.reason || '')
    // Only derived fields change here. Skipping validation matters inside a customer delete:
    // the cascade removes the customer before this project, and the relation check would fail.
    app.saveNoValidate(project)
  }
}

module.exports = { STAGES, PROJECT_HAS_ACTIVE_APPOINTMENTS, deriveProjectStage, applyStage, refreshProjects }
