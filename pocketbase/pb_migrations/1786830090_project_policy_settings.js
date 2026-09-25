/// <reference path="../pb_data/types.d.ts" />

// How the studio runs a project (src/lib/project-policy.ts). Every field is optional and empty
// means "not decided yet": the app then applies a default equal to the behaviour before these
// settings existed. Several are the studio's call (docs/projects-payments/track-a-after-client-call.md).
const SETTINGS = 'pbc_2769025244'

const FIELDS = [
  { id: 'select_settings_touch_up_policy', name: 'touch_up_policy', type: 'select', maxSelect: 1, values: ['free_within_days', 'charged'] },
  { id: 'number_settings_touch_up_free_days', name: 'touch_up_free_days', type: 'number', onlyInt: true },
  { id: 'select_settings_deposit_application', name: 'deposit_application', type: 'select', maxSelect: 1, values: ['first_session', 'last_session'] },
  { id: 'select_settings_deposit_per_session', name: 'deposit_per_session', type: 'select', maxSelect: 1, values: ['required', 'not_required'] },
  { id: 'number_settings_healing_period_days', name: 'healing_period_days', type: 'number', onlyInt: true },
  { id: 'number_settings_consult_followup_days', name: 'consultation_followup_days', type: 'number', onlyInt: true },
  { id: 'number_settings_consult_lost_days', name: 'consultation_lost_after_days', type: 'number', onlyInt: true },
  { id: 'number_settings_inquiry_lost_days', name: 'inquiry_lost_after_days', type: 'number', onlyInt: true },
  { id: 'number_settings_dormant_after_months', name: 'dormant_after_months', type: 'number', onlyInt: true },
  { id: 'select_settings_post_project_feedback', name: 'post_project_feedback', type: 'select', maxSelect: 1, values: ['review_links', 'nps_then_review'] },
  { id: 'text_settings_easy_review_link', name: 'easy_review_link', type: 'text', max: 2000 },
]

migrate(
  (app) => {
    const settings = app.findCollectionByNameOrId(SETTINGS)
    for (const field of FIELDS) {
      if (!settings.fields.getByName(field.name)) settings.fields.add(new Field({ required: false, ...field }))
    }
    app.save(settings)
  },
  (app) => {
    const settings = app.findCollectionByNameOrId(SETTINGS)
    for (const field of FIELDS) settings.fields.removeByName(field.name)
    app.save(settings)
  },
)
