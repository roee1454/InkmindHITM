import type PocketBase from 'pocketbase'
import { extractRelationEdges } from '../utils/relation-graph'
import { loadCollectionSchemas } from './relation-schema.server'

/**
 * Read-only health check of the data PocketBase can't protect by itself. Used by
 * `pnpm db:audit` (pocketbase/scripts/db-audit.ts) and asserted clean after the integration suite.
 * - Dangling references: relation values pointing at records that no longer exist (left behind
 *   by deletes from before the cascade migration, or by raw SQL edits).
 * - Future timestamps: records stamped later than "now", the fingerprint of a wall clock that was
 *   moved forward. Lifecycle windows compare against these fields and silently misfire.
 */
export interface DanglingReference {
  collection: string
  field: string
  recordId: string
  missingId: string
}

export interface FutureTimestamp {
  collection: string
  field: string
  recordId: string
  value: string
}

export interface IntegrityAuditReport {
  danglingReferences: DanglingReference[]
  futureTimestamps: FutureTimestamp[]
}

const FUTURE_TOLERANCE_MS = 5 * 60 * 1000

function relationValues(value: unknown): string[] {
  if (typeof value === 'string') return value ? [value] : []
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string' && v !== '')
  return []
}

export async function auditIntegrity(su: PocketBase, now: Date = new Date()): Promise<IntegrityAuditReport> {
  const schemas = await loadCollectionSchemas(su)
  const idCache = new Map<string, Set<string>>()
  async function idsOf(collection: string): Promise<Set<string>> {
    const cached = idCache.get(collection)
    if (cached) return cached
    const records = await su.collection(collection).getFullList({ fields: 'id' })
    const ids = new Set(records.map((r) => r.id))
    idCache.set(collection, ids)
    return ids
  }

  const danglingReferences: DanglingReference[] = []
  for (const edge of extractRelationEdges(schemas)) {
    const existing = await idsOf(edge.to)
    const records = await su.collection(edge.from).getFullList({
      fields: `id,${edge.field}`,
      filter: `${edge.field} != ''`,
    })
    for (const record of records) {
      for (const referencedId of relationValues(record[edge.field])) {
        if (!existing.has(referencedId)) {
          danglingReferences.push({ collection: edge.from, field: edge.field, recordId: record.id, missingId: referencedId })
        }
      }
    }
  }

  const limit = new Date(now.getTime() + FUTURE_TOLERANCE_MS)
  const futureTimestamps: FutureTimestamp[] = []
  for (const schema of schemas) {
    if (schema.system) continue
    const autodates = schema.fields.filter((f) => f.type === 'autodate').map((f) => f.name)
    for (const field of autodates) {
      const records = await su.collection(schema.name).getFullList({
        fields: `id,${field}`,
        filter: su.filter(`${field} > {:limit}`, { limit }),
      })
      for (const record of records) {
        futureTimestamps.push({ collection: schema.name, field, recordId: record.id, value: String(record[field]) })
      }
    }
  }

  return { danglingReferences, futureTimestamps }
}
