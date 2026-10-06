/// <reference path="../pb_data/types.d.ts" />

// Consolidates artist profile URLs into a single `portfolio_url` field.
// Drops redundant `portfolio_website`, `portfolio_instagram`, and `website_url` fields.
migrate(
  (app) => {
    const artistProfiles = app.findCollectionByNameOrId('pbc_1568047859')

    // 1. Add new consolidated portfolio_url field
    artistProfiles.fields.add(
      new Field({
        exceptDomains: null,
        hidden: false,
        id: 'url_portfolio_url_1',
        name: 'portfolio_url',
        onlyDomains: null,
        presentable: false,
        required: false,
        system: false,
        type: 'url',
      }),
    )
    app.save(artistProfiles)

    // 2. Backfill: copy any existing URL from the old fields into portfolio_url
    const records = app.findRecordsByFilter('artist_profiles', '', '', 0, 0)
    for (const r of records) {
      const url = r.get('portfolio_website') || r.get('portfolio_instagram') || r.get('website_url') || ''
      if (url) {
        r.set('portfolio_url', url)
        app.save(r)
      }
    }

    // 3. Remove old redundant fields
    artistProfiles.fields.removeById('url299528745') // portfolio_website
    artistProfiles.fields.removeById('url2046881775') // portfolio_instagram
    artistProfiles.fields.removeById('url_website_url_1') // website_url

    return app.save(artistProfiles)
  },
  (app) => {
    const artistProfiles = app.findCollectionByNameOrId('pbc_1568047859')

    // Restore old fields
    artistProfiles.fields.add(
      new Field({
        exceptDomains: null,
        hidden: false,
        id: 'url299528745',
        name: 'portfolio_website',
        onlyDomains: null,
        presentable: false,
        required: false,
        system: false,
        type: 'url',
      }),
    )
    artistProfiles.fields.add(
      new Field({
        exceptDomains: null,
        hidden: false,
        id: 'url2046881775',
        name: 'portfolio_instagram',
        onlyDomains: null,
        presentable: false,
        required: false,
        system: false,
        type: 'url',
      }),
    )
    artistProfiles.fields.add(
      new Field({
        exceptDomains: null,
        hidden: false,
        id: 'url_website_url_1',
        name: 'website_url',
        onlyDomains: null,
        presentable: false,
        required: false,
        system: false,
        type: 'url',
      }),
    )
    app.save(artistProfiles)

    // Backfill from portfolio_url
    const records = app.findRecordsByFilter('artist_profiles', '', '', 0, 0)
    for (const r of records) {
      const url = r.get('portfolio_url') || ''
      if (url) {
        r.set('portfolio_website', url)
        app.save(r)
      }
    }

    artistProfiles.fields.removeById('url_portfolio_url_1')
    return app.save(artistProfiles)
  },
)

