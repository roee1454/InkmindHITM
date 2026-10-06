import { spawn, execFileSync } from 'node:child_process'
import type { ChildProcess } from 'node:child_process'
import { createWriteStream, readFileSync } from 'node:fs'
import { cp, mkdtemp, rm } from 'node:fs/promises'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import path from 'node:path'

/**
 * Throwaway PocketBase instances for the integration suite: the shared one booted by
 * pocketbase.global-setup.ts, and short-lived ones for tests that need a specific schema version
 * (e.g. running a data migration against records created under the previous schema).
 */
export const ROOT = path.resolve(__dirname, '../../..')
export const SUPERUSER = { email: 'integration@inkmind.test', password: 'integration-secret-123' }
export const PB_BIN = process.env.PB_BIN ?? path.join(ROOT, 'pocketbase/pocketbase')
// Overridable so the suite can run against work-in-progress hooks/migrations without writing them
// into pocketbase/pb_hooks, which a running dev PocketBase hot-reloads (and restarts on) instantly.
export const MIGRATIONS_DIR = process.env.PB_TEST_MIGRATIONS_DIR ?? path.join(ROOT, 'pocketbase/pb_migrations')
export const HOOKS_DIR = process.env.PB_TEST_HOOKS_DIR ?? path.join(ROOT, 'pocketbase/pb_hooks')
export const TEST_ONLY_HOOKS_DIR = path.join(__dirname, 'hooks')

export interface PocketBaseWorkspace {
  workDir: string
  dataDir: string
  hooksDir: string
}

/** Creates a temp workspace: an empty data dir and a hooks dir assembled from `hookSources`. */
export async function createWorkspace(hookSources: string[] = [HOOKS_DIR, TEST_ONLY_HOOKS_DIR]): Promise<PocketBaseWorkspace> {
  const workDir = await mkdtemp(path.join(tmpdir(), 'inkmind-pb-'))
  const hooksDir = path.join(workDir, 'pb_hooks')
  for (const source of hookSources) await cp(source, hooksDir, { recursive: true })
  return { workDir, dataDir: path.join(workDir, 'pb_data'), hooksDir }
}

/** Applies every pending migration in `migrationsDir` and (re)creates the test superuser. */
export function migrate(workspace: PocketBaseWorkspace, migrationsDir: string = MIGRATIONS_DIR): string {
  const output = execFileSync(PB_BIN, ['migrate', 'up', '--dir', workspace.dataDir, '--migrationsDir', migrationsDir], {
    encoding: 'utf8',
  })
  execFileSync(PB_BIN, ['superuser', 'upsert', SUPERUSER.email, SUPERUSER.password, '--dir', workspace.dataDir], { stdio: 'pipe' })
  return output
}

function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer()
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      const port = typeof address === 'object' && address ? address.port : 0
      server.close(() => resolve(port))
    })
  })
}

async function waitForHealth(url: string, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const ok = await fetch(`${url}/api/health`).then((r) => r.ok).catch(() => false)
    if (ok) return true
    await new Promise((r) => setTimeout(r, 150))
  }
  return false
}

function stopProcess(child: ChildProcess): Promise<void> {
  return new Promise((resolve) => {
    if (child.exitCode !== null) return resolve()
    child.once('exit', () => resolve())
    child.kill('SIGTERM')
  })
}

export interface RunningPocketBase {
  url: string
  logPath: string
  stop: () => Promise<void>
}

export async function serve(workspace: PocketBaseWorkspace, migrationsDir: string = MIGRATIONS_DIR): Promise<RunningPocketBase> {
  const port = await getFreePort()
  const url = `http://127.0.0.1:${port}`
  const logPath = path.join(workspace.workDir, `pocketbase-${port}.log`)
  const log = createWriteStream(logPath)
  const child = spawn(
    PB_BIN,
    [
      'serve',
      '--dir', workspace.dataDir,
      '--migrationsDir', migrationsDir,
      '--hooksDir', workspace.hooksDir,
      '--hooksWatch=false',
      '--http', `127.0.0.1:${port}`,
    ],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  )
  child.stdout?.pipe(log)
  child.stderr?.pipe(log)

  if (!(await waitForHealth(url, 20_000))) {
    await stopProcess(child)
    throw new Error(`Integration PocketBase failed to start. Log:\n${readFileSync(logPath, 'utf8')}`)
  }
  return { url, logPath, stop: () => stopProcess(child) }
}

export async function removeWorkspace(workspace: PocketBaseWorkspace): Promise<void> {
  if (process.env.PB_TEST_KEEP_DIR) {
    console.info(`[integration] kept PocketBase dir: ${workspace.workDir}`)
    return
  }
  await rm(workspace.workDir, { recursive: true, force: true })
}
