import { afterAll, describe, expect, it } from 'vitest'
import { cp, mkdir, readdir } from 'node:fs/promises'
import path from 'node:path'
import PocketBase from 'pocketbase'
import {
  HOOKS_DIR,
  MIGRATIONS_DIR,
  SUPERUSER,
  TEST_ONLY_HOOKS_DIR,
  createWorkspace,
  migrate,
  removeWorkspace,
  serve,
} from './setup/pocketbase-process'
import type { PocketBaseWorkspace } from './setup/pocketbase-process'

// Runs 1786830050_projects.js against records created under the schema that came before it, the
// way it will run on an existing studio's database.
const PROJECTS_MIGRATION = '1786830050_projects.js'
const iso = (hours: number) => new Date(Date.now() + hours * 3_600_000).toISOString()

let workspace: PocketBaseWorkspace | undefined

afterAll(async () => {
  if (workspace) await removeWorkspace(workspace)
})

async function client(url: string) {
  const pb = new PocketBase(url)
  pb.autoCancellation(false)
  await pb.collection('_superusers').authWithPassword(SUPERUSER.email, SUPERUSER.password)
  return pb
}

describe('projects backfill migration', () => {
  it('gives every appointment a project and joins old "continue to tattoo" sessions to their consultation', async () => {
    // The legacy phase runs without the app's hooks: today's hooks target today's schema (they write
    // to collections the old schema doesn't have). The upgraded phase gets all of them.
    workspace = await createWorkspace([TEST_ONLY_HOOKS_DIR])
    const legacyMigrations = path.join(workspace.workDir, 'legacy_migrations')
    await mkdir(legacyMigrations)
    for (const file of await readdir(MIGRATIONS_DIR)) {
      if (file < PROJECTS_MIGRATION) await cp(path.join(MIGRATIONS_DIR, file), path.join(legacyMigrations, file))
    }

    // 1. The old world: no projects, follow-ups linked only by a line in `notes`.
    migrate(workspace, legacyMigrations)
    const legacy = await serve(workspace, legacyMigrations)
    const pb = await client(legacy.url)
    const makeCustomer = (name: string) => pb.collection('customers').create({ name, phone: `+97252${String(Math.random()).slice(2, 9)}` })
    const book = (customer: string, hours: number, type: string, extra: Record<string, unknown> = {}) =>
      pb.collection('appointments').create({ customer, start_time: iso(hours), status: 'completed', type, ...extra })

    const dana = await makeCustomer('דנה')
    const danaSketch = await book(dana.id, -100, 'sketch', { tattoo_description: 'פרחים על הכתף' })
    const danaTattoo = await book(dana.id, -10, 'tattoo', { notes: 'בהמשך לפגישת סקיצה מתאריך 2026-09-01' })

    const yossi = await makeCustomer('יוסי')
    const yossiTattoo = await book(yossi.id, -10, 'tattoo', { tattoo_description: 'אריה' })

    const noa = await makeCustomer('נועה')
    await book(noa.id, -300, 'sketch')
    const noaLatestSketch = await book(noa.id, -200, 'sketch')
    const noaTattoo = await book(noa.id, -10, 'tattoo', { notes: 'בהמשך לפגישת סקיצה מתאריך 2026-08-01' })

    const paidDeposit = await book(yossi.id, 100, 'tattoo', { status: 'confirmed', deposit_amount: 250, deposit_paid: true })

    const orphan = await makeCustomer('בלי סקיצה')
    const orphanTattoo = await book(orphan.id, -10, 'tattoo', { notes: 'בהמשך לפגישת סקיצה מתאריך 2026-01-01' })
    await legacy.stop()

    // 2. Upgrade, with the current hooks in place as on a real deploy.
    await cp(HOOKS_DIR, workspace.hooksDir, { recursive: true })
    const output = migrate(workspace)
    expect(output).toContain(PROJECTS_MIGRATION)

    // 3. The new world.
    const upgraded = await serve(workspace)
    try {
      const db = await client(upgraded.url)
      const read = (id: string) => db.collection('appointments').getOne(id)

      const [sketchAfter, tattooAfter] = await Promise.all([read(danaSketch.id), read(danaTattoo.id)])
      expect(sketchAfter.kind).toBe('consultation')
      expect(tattooAfter.kind).toBe('session')
      expect(tattooAfter.project).toBe(sketchAfter.project)
      expect(await db.collection('projects').getOne(sketchAfter.project)).toMatchObject({ customer: dana.id, title: 'פרחים על הכתף' })

      expect((await read(yossiTattoo.id)).project).not.toBe('')
      expect((await read(noaTattoo.id)).project).toBe((await read(noaLatestSketch.id)).project)

      const orphanAfter = await read(orphanTattoo.id)
      expect((await db.collection('projects').getOne(orphanAfter.project)).customer).toBe(orphan.id)

      expect(await db.collection('appointments').getFullList({ filter: "project = ''" })).toHaveLength(0)

      // 1786830070_payments_and_close_out.js: deposits verified before the ledger existed.
      const deposits = await db.collection('payments').getFullList({ filter: db.filter('appointment = {:a}', { a: paidDeposit.id }) })
      expect(deposits).toMatchObject([{ kind: 'deposit', amount: 250, status: 'verified', project: (await read(paidDeposit.id)).project }])
    } finally {
      await upgraded.stop()
    }
  }, 90_000)
})
