/// <reference path="../pb_data/types.d.ts" />
// The review request used to carry the studio's Google and Easy links written in code
// (lifecycle-service.ts). It now reads them from the settings (track-b B5.1), so the links it sent
// until now move there, only where the settings are still empty. Editable in the settings screen.
const LINKS = {
  google_review_link: 'https://g.co/kgs/HUr9g2G',
  easy_review_link: 'https://easy.co.il/page/10068219?utm_medium=social&utm_source=easy_app&utm_campaign=bizpage_header_share',
}

migrate(
  (app) => {
    for (const settings of app.findAllRecords('settings')) {
      let changed = false
      for (const [field, value] of Object.entries(LINKS)) {
        if (!settings.getString(field)) {
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
      for (const [field, value] of Object.entries(LINKS)) {
        if (settings.getString(field) === value) {
          settings.set(field, '')
          changed = true
        }
      }
      if (changed) app.save(settings)
    }
  },
)
