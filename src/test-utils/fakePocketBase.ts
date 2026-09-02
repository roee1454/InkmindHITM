/**
 * Minimal in-memory fake of the PocketBase client surface this codebase actually calls
 * (`collection(name).getOne/getFirstListItem/getFullList/getList/create/update`). Extends the
 * one-off `fakeSu()` pattern already used in `state-machine.test.ts` into a shared helper, since
 * the MCP assistant's tests need the same shape across many files.
 *
 * Deliberately NOT a full PocketBase filter-string parser — it supports exactly the filter
 * shapes this codebase actually writes: `field = "value"` comparisons joined by `&&`, with one
 * level of `(a || b)` grouping (e.g. `status = "watching" && (preferred_staff = "" ||
 * preferred_staff = "xyz")`). An unrecognized comparison shape matches everything rather than
 * throwing — tests relying on filtering should seed only the records they want matched and keep
 * assertions focused on the code under test, not on this helper's parsing completeness.
 */

export interface FakeRecord {
  id: string
  [key: string]: unknown
}

interface ListOptions {
  filter?: string
  expand?: string
  sort?: string
}

function splitTopLevel(input: string, separator: string): string[] {
  const parts: string[] = []
  let depth = 0
  let current = ''
  let i = 0
  while (i < input.length) {
    const ch = input[i]
    if (ch === '(') depth++
    if (ch === ')') depth--
    if (depth === 0 && input.slice(i, i + separator.length) === separator) {
      parts.push(current)
      current = ''
      i += separator.length
      continue
    }
    current += ch
    i++
  }
  parts.push(current)
  return parts.map((p) => p.trim()).filter(Boolean)
}

function parseComparison(expr: string): (record: FakeRecord) => boolean {
  const match = expr.trim().match(/^(\S+)\s*=\s*"([^"]*)"$/)
  if (!match) return () => true
  const [, field, value] = match
  return (record) => String(record[field!] ?? '') === value
}

function parseOrGroup(clause: string): (record: FakeRecord) => boolean {
  let inner = clause.trim()
  if (inner.startsWith('(') && inner.endsWith(')')) inner = inner.slice(1, -1).trim()
  const orClauses = splitTopLevel(inner, '||')
  if (orClauses.length > 1) {
    const fns = orClauses.map(parseComparison)
    return (record) => fns.some((fn) => fn(record))
  }
  return parseComparison(inner)
}

function parseFilter(filter: string | undefined): (record: FakeRecord) => boolean {
  if (!filter || !filter.trim()) return () => true
  const andClauses = splitTopLevel(filter, '&&').map(parseOrGroup)
  return (record) => andClauses.every((fn) => fn(record))
}

export function createFakePocketBase(seed: Record<string, FakeRecord[]> = {}) {
  const store = new Map<string, FakeRecord[]>()
  for (const [name, records] of Object.entries(seed)) store.set(name, [...records])

  function getStore(name: string): FakeRecord[] {
    if (!store.has(name)) store.set(name, [])
    return store.get(name)!
  }

  function expandRecord(record: FakeRecord, expand?: string): FakeRecord {
    if (!expand) return record
    const expanded: Record<string, unknown> = {}
    for (const rawKey of expand.split(',')) {
      const key = rawKey.trim()
      const relId = record[key]
      if (typeof relId !== 'string' || !relId) continue
      for (const records of store.values()) {
        const found = records.find((r) => r.id === relId)
        if (found) {
          expanded[key] = found
          break
        }
      }
    }
    return { ...record, expand: expanded }
  }

  function seedCollection(name: string, records: FakeRecord[]) {
    store.set(name, [...records])
  }

  const client = {
    collection(name: string) {
      return {
        async getOne(id: string, options?: { expand?: string }): Promise<FakeRecord> {
          const found = getStore(name).find((r) => r.id === id)
          if (!found) throw new Error(`fakePocketBase: record "${id}" not found in "${name}"`)
          return expandRecord(found, options?.expand)
        },
        async getFirstListItem(filter: string, options?: { expand?: string }): Promise<FakeRecord> {
          const match = getStore(name).find(parseFilter(filter))
          if (!match) throw new Error(`fakePocketBase: no record in "${name}" matched filter: ${filter}`)
          return expandRecord(match, options?.expand)
        },
        async getFullList(options?: ListOptions): Promise<FakeRecord[]> {
          return getStore(name)
            .filter(parseFilter(options?.filter))
            .map((r) => expandRecord(r, options?.expand))
        },
        async getList(page: number, perPage: number, options?: ListOptions) {
          const items = getStore(name)
            .filter(parseFilter(options?.filter))
            .map((r) => expandRecord(r, options?.expand))
          return {
            page,
            perPage,
            totalItems: items.length,
            totalPages: Math.max(1, Math.ceil(items.length / perPage)),
            items: items.slice((page - 1) * perPage, page * perPage),
          }
        },
        async create(fields: Record<string, unknown>): Promise<FakeRecord> {
          const record: FakeRecord = {
            ...fields,
            id: (fields.id as string) || `fake_${name}_${getStore(name).length + 1}`,
          }
          getStore(name).push(record)
          return record
        },
        async update(id: string, fields: Record<string, unknown>): Promise<FakeRecord> {
          const records = getStore(name)
          const idx = records.findIndex((r) => r.id === id)
          if (idx === -1) throw new Error(`fakePocketBase: record "${id}" not found in "${name}"`)
          records[idx] = { ...records[idx]!, ...fields, id }
          return records[idx]
        },
      }
    },
    /** Test-only escape hatch: seed or directly inspect a collection's in-memory records. */
    _seed: seedCollection,
    _dump: (name: string) => getStore(name),
  }

  return client
}

export type FakePocketBase = ReturnType<typeof createFakePocketBase>
