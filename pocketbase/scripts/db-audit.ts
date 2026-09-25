/**
 * `pnpm db:audit` — read-only integrity report for the PocketBase in .env (see
 * src/features/database/server/integrity-audit.server.ts). Exits 1 when it finds anything.
 */
import { getSuperuserClient } from '@/integrations/pocketbase/superuser.server'
import { auditIntegrity } from '@/features/database/server/integrity-audit.server'

const su = await getSuperuserClient()
const report = await auditIntegrity(su)

for (const ref of report.danglingReferences) {
  console.log(`dangling  ${ref.collection}.${ref.field}  record=${ref.recordId} → missing ${ref.missingId}`)
}
for (const ts of report.futureTimestamps) {
  console.log(`future    ${ts.collection}.${ts.field}  record=${ts.recordId}  ${ts.value}`)
}

const problems = report.danglingReferences.length + report.futureTimestamps.length
console.log(problems === 0 ? 'db:audit — clean.' : `db:audit — ${problems} problem(s) found.`)
process.exit(problems === 0 ? 0 : 1)
