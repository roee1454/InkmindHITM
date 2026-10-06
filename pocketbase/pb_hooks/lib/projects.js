/// <reference path="../../pb_data/types.d.ts" />

// Shared logic for pb_hooks/projects.pb.js (handlers run in isolated VMs and require() this).
// Covered by tests/integration/projects.test.ts.

const KIND_BY_TYPE = { sketch: 'consultation', tattoo: 'session' }
const TYPE_BY_KIND = { consultation: 'sketch', session: 'tattoo', touch_up: 'tattoo' }

const PROJECT_CUSTOMER_MISMATCH = 'integrity:project_customer_mismatch'

/**
 * Runs `fn` and the rest of the hook chain in one transaction, so a project created for an
 * appointment rolls back with it if the appointment itself fails to save.
 */
function inTransaction(e, fn) {
  if (e.app.isTransactional()) {
    fn(e.app)
    e.next()
    return
  }
  e.app.runInTransaction((txApp) => {
    e.app = txApp
    fn(txApp)
    e.next()
  })
}

/**
 * `kind` (consultation | session | touch_up) is the new field; the legacy `type` (sketch | tattoo)
 * is still read in many places, so whichever one the writer changed wins and the other follows.
 */
function syncKindAndType(record, original) {
  const kind = record.getString('kind')
  const type = record.getString('type')
  const kindChanged = !original || kind !== original.getString('kind')
  const typeChanged = !original || type !== original.getString('type')

  if (kind && kindChanged) {
    record.set('type', TYPE_BY_KIND[kind] || 'tattoo')
    return
  }
  if (typeChanged || !kind) {
    const previousKind = original ? original.getString('kind') : ''
    const derived = KIND_BY_TYPE[type || 'tattoo']
    // Changing sketch → tattoo on a touch-up must not silently turn it into a regular session.
    record.set('kind', derived === 'session' && previousKind === 'touch_up' ? 'touch_up' : derived)
    if (!type) record.set('type', 'tattoo')
  }
}

function newProjectFor(app, record, customerId) {
  const project = new Record(app.findCollectionByNameOrId('projects'))
  const kind = record.getString('kind')
  project.set('customer', customerId)
  project.set('title', record.getString('tattoo_description').slice(0, 200) || (kind === 'consultation' ? 'פגישת ייעוץ' : 'קעקוע'))
  project.set('primary_staff', record.getString('staff'))
  const priceMin = record.getFloat('price_min')
  const priceMax = record.getFloat('price_max')
  if (priceMin > 0) project.set('quote_min', priceMin)
  if (priceMax > 0) project.set('quote_max', priceMax)
  app.save(project)
  return project.id
}

/**
 * Every appointment with a customer belongs to a project of that same customer.
 * - No project given: a new one is created (the default for a first booking).
 * - A project of another customer on create: rejected — that's a caller bug.
 * - The customer changed on update: the project follows if this was its only appointment;
 *   otherwise the appointment moves to a new project of the new customer.
 */
function ensureProject(app, record, original) {
  const customerId = record.getString('customer')
  if (!customerId) return

  const projectId = record.getString('project')
  if (!projectId) {
    record.set('project', newProjectFor(app, record, customerId))
    return
  }

  const project = app.findRecordById('projects', projectId)
  if (project.getString('customer') === customerId) {
    const pMin = project.getFloat('quote_min')
    const pMax = project.getFloat('quote_max')
    const aMin = record.getFloat('price_min')
    const aMax = record.getFloat('price_max')
    if (!pMin && !pMax && (aMin > 0 || aMax > 0)) {
      if (aMin > 0) project.set('quote_min', aMin)
      if (aMax > 0) project.set('quote_max', aMax)
      app.save(project)
    }
    return
  }

  const customerChanged = original && original.getString('customer') !== customerId
  const projectUnchanged = original && original.getString('project') === projectId
  if (!customerChanged || !projectUnchanged) {
    throw new BadRequestError(PROJECT_CUSTOMER_MISMATCH)
  }

  const siblings = app.findRecordsByFilter('appointments', 'project = {:project} && id != {:id}', '', 1, 0, {
    project: projectId,
    id: record.id,
  })
  if (siblings.length === 0) {
    project.set('customer', customerId)
    app.save(project)
  } else {
    record.set('project', newProjectFor(app, record, customerId))
  }
}

module.exports = { inTransaction, syncKindAndType, ensureProject, PROJECT_CUSTOMER_MISMATCH }
