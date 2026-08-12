/// <reference path="../pb_data/types.d.ts" />

// Onboarding restructure: settings gets a persisted setup_checklist (the non-blocking
// "השלמת הגדרה" list) and a real logo file field (studio logo used to be localStorage-only,
// never persisted server-side). Also bundles Phase 7's ui_dark_mode — same migration batch,
// same settings collection, no reason to split it.
//
// artist_profiles drops the style-tag concept (migrated into `bio` so nothing is lost) and
// `portfolio_facebook` (not part of the new 3-link shape), and gains `website_url` — distinct
// from `portfolio_website` ("portfolio link" in the new copy).
migrate(
  (app) => {
    const settings = app.findCollectionByNameOrId('pbc_2769025244')
    settings.fields.add(
      new Field({ hidden: false, id: 'json_setup_checklist_1', maxSize: 8192, name: 'setup_checklist', presentable: false, required: false, system: false, type: 'json' }),
    )
    settings.fields.add(
      new Field({ hidden: false, id: 'file_studio_logo_1', maxSelect: 1, maxSize: 5242880, mimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'], name: 'logo', presentable: false, protected: false, required: false, system: false, thumbs: [], type: 'file' }),
    )
    settings.fields.add(
      new Field({ hidden: false, id: 'bool_ui_dark_mode_1', name: 'ui_dark_mode', presentable: false, required: false, system: false, type: 'bool' }),
    )
    app.save(settings)

    const artistProfiles = app.findCollectionByNameOrId('pbc_1568047859')

    // Backfill: concatenate any existing style tags into bio before the field disappears.
    const rows = app.findRecordsByFilter('artist_profiles', '', '', 0, 0)
    for (const record of rows) {
      const styles = record.get('tattoo_styles')
      if (Array.isArray(styles) && styles.length > 0) {
        const bio = record.get('bio') || ''
        const stylesLine = `סגנונות: ${styles.join(', ')}`
        record.set('bio', bio ? `${bio}\n${stylesLine}` : stylesLine)
        app.save(record)
      }
    }

    artistProfiles.fields.add(
      new Field({ exceptDomains: null, hidden: false, id: 'url_website_url_1', name: 'website_url', onlyDomains: null, presentable: false, required: false, system: false, type: 'url' }),
    )
    app.save(artistProfiles)

    artistProfiles.fields.removeById('json797133326') // tattoo_styles
    artistProfiles.fields.removeById('url402559608') // portfolio_facebook
    return app.save(artistProfiles)
  },
  (app) => {
    const settings = app.findCollectionByNameOrId('pbc_2769025244')
    settings.fields.removeById('json_setup_checklist_1')
    settings.fields.removeById('file_studio_logo_1')
    settings.fields.removeById('bool_ui_dark_mode_1')
    app.save(settings)

    const artistProfiles = app.findCollectionByNameOrId('pbc_1568047859')
    artistProfiles.fields.add(
      new Field({ help: '', hidden: false, id: 'select797133326', maxSelect: 12, name: 'tattoo_styles', presentable: false, required: false, system: false, type: 'select', values: ['fine_line', 'traditional', 'neo_traditional', 'realism', 'blackwork', 'japanese', 'geometric', 'watercolor', 'tribal', 'lettering', 'minimalist', 'portrait'] }),
    )
    artistProfiles.fields.add(
      new Field({ exceptDomains: null, help: '', hidden: false, id: 'url402559608', name: 'portfolio_facebook', onlyDomains: null, presentable: false, required: false, system: false, type: 'url' }),
    )
    artistProfiles.fields.removeById('url_website_url_1')
    return app.save(artistProfiles)
  },
)
