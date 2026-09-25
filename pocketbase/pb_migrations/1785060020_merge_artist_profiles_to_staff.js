/// <reference path="../pb_data/types.d.ts" />

// Merges `artist_profiles` directly into `staff` collection:
// 1. Adds `portfolio_url`, `bio`, and `work_hours` fields to `staff`.
// 2. Backfills all data from `artist_profiles` into the corresponding `staff` records.
// 3. Drops the redundant `artist_profiles` collection.
migrate(
  (app) => {
    const staff = app.findCollectionByNameOrId('staff')

    // 1. Add fields to staff
    staff.fields.add(
      new Field({
        exceptDomains: null,
        hidden: false,
        id: 'url_staff_portfolio',
        name: 'portfolio_url',
        onlyDomains: null,
        presentable: false,
        required: false,
        system: false,
        type: 'url',
      }),
    )

    staff.fields.add(
      new Field({
        autogeneratePattern: '',
        hidden: false,
        id: 'text_staff_bio',
        max: 2000,
        min: 0,
        name: 'bio',
        pattern: '',
        presentable: false,
        primaryKey: false,
        required: false,
        system: false,
        type: 'text',
      }),
    )

    staff.fields.add(
      new Field({
        hidden: false,
        id: 'json_staff_work_hours',
        maxSize: 8192,
        name: 'work_hours',
        presentable: false,
        required: false,
        system: false,
        type: 'json',
      }),
    )

    app.save(staff)

    // 2. Backfill from artist_profiles into staff if the collection exists
    try {
      const artistProfiles = app.findCollectionByNameOrId('artist_profiles') || app.findCollectionByNameOrId('pbc_1568047859')
      if (artistProfiles) {
        const records = app.findRecordsByFilter('artist_profiles', '', '', 0, 0)
        for (const r of records) {
          const staffId = r.get('staff')
          if (!staffId) continue
          try {
            const staffRecord = app.findRecordById('staff', staffId)
            if (staffRecord) {
              const portfolioUrl = r.get('portfolio_url') || ''
              const bio = r.get('bio') || ''
              const workHours = r.get('work_hours') || null

              if (portfolioUrl) staffRecord.set('portfolio_url', portfolioUrl)
              if (bio) staffRecord.set('bio', bio)
              if (workHours) staffRecord.set('work_hours', workHours)

              app.save(staffRecord)
            }
          } catch (err) {
            console.warn(`[migration] could not backfill staff record ${staffId}:`, err)
          }
        }

        // 3. Remove artist_profiles collection
        app.delete(artistProfiles)
      }
    } catch (err) {
      console.warn('[migration] artist_profiles collection not found or already deleted:', err)
    }

    return null
  },
  () => {
    // Irreversible cleanup - artist_profiles is permanently consolidated into staff
    return null
  },
)
