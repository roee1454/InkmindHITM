import type { TestProject } from 'vitest/node'
import { SUPERUSER, createWorkspace, migrate, removeWorkspace, serve } from './pocketbase-process'

/** Boots the PocketBase shared by every integration test file (schema: pb_migrations, rules: pb_hooks). */
export default async function setup(project: TestProject) {
  const workspace = await createWorkspace()
  migrate(workspace)
  const pocketbase = await serve(workspace)

  project.provide('pocketbase', { url: pocketbase.url, ...SUPERUSER, logPath: pocketbase.logPath })

  return async () => {
    await pocketbase.stop()
    await removeWorkspace(workspace)
  }
}

declare module 'vitest' {
  export interface ProvidedContext {
    pocketbase: { url: string; email: string; password: string; logPath: string }
  }
}
