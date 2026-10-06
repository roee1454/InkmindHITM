/// <reference path="../pb_data/types.d.ts" />
// The studio's first policy answers (docs/projects-payments/decisions.md, 2026-09-26): a touch-up is
// free for the first 7 days after the work is finished, and every session takes its own deposit,
// set against that session. Only empty settings are filled: a value staff already chose in the
// settings screen is kept. Everything stays editable there.
const DECISIONS = {
  touch_up_policy: 'free_within_days',
  touch_up_free_days: 7,
  deposit_per_session: 'required',
  deposit_application: 'first_session',
}

function isEmpty(value) {
  return value === '' || value === null || value === undefined || value === 0
}

migrate(
  (app) => {
    for (const settings of app.findAllRecords('settings')) {
      let changed = false
      for (const [field, value] of Object.entries(DECISIONS)) {
        if (isEmpty(settings.get(field))) {
          settings.set(field, value)
          changed = true
        }
      }
      if (changed) app.save(settings)
    }
  },
  (app) => {
    for (const settings of app.findAllRecords('settings')) {
      let changed = false
      for (const [field, value] of Object.entries(DECISIONS)) {
        if (settings.get(field) === value) {
          settings.set(field, typeof value === 'number' ? 0 : '')
          changed = true
        }
      }
      if (changed) app.save(settings)
    }
  },
)
