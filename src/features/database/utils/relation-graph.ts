/**
 * Derives "what happens to everything else if I delete this record" straight from the PocketBase
 * schema, so the delete preview can never drift from what PocketBase actually does:
 * - cascade:  cascadeDelete relation — the referencing records are deleted too (recursively).
 * - nullify:  optional relation without cascade — PocketBase unsets the reference, record stays.
 * - restrict: required relation without cascade — PocketBase refuses the delete.
 */
export type RelationPolicy = 'cascade' | 'nullify' | 'restrict'

export interface SchemaField {
  name: string
  type: string
  collectionId?: string
  cascadeDelete?: boolean
  required?: boolean
}

export interface CollectionSchema {
  id: string
  name: string
  system?: boolean
  fields: SchemaField[]
}

export interface RelationEdge {
  /** Collection holding the relation field. */
  from: string
  field: string
  /** Collection the relation points at. */
  to: string
  policy: RelationPolicy
}

export interface ImpactNode {
  collection: string
  policy: RelationPolicy
  /**
   * PocketBase filter paths from a record of `collection` back to the deleted record, e.g.
   * `conversation.customer` for messages of a deleted customer. A record matches if any path
   * equals the deleted id; joining them with `||` counts records reachable twice only once.
   */
  paths: string[]
}

function policyOf(field: SchemaField): RelationPolicy {
  if (field.cascadeDelete) return 'cascade'
  return field.required ? 'restrict' : 'nullify'
}

export function extractRelationEdges(collections: CollectionSchema[]): RelationEdge[] {
  const nameById = new Map(collections.map((c) => [c.id, c.name]))
  const edges: RelationEdge[] = []
  for (const collection of collections) {
    if (collection.system) continue
    for (const field of collection.fields) {
      if (field.type !== 'relation' || !field.collectionId) continue
      const to = nameById.get(field.collectionId)
      if (!to) continue
      edges.push({ from: collection.name, field: field.name, to, policy: policyOf(field) })
    }
  }
  return edges
}

/**
 * Walks cascade edges outward from `root` (depth-limited, cycle-safe) and collects every
 * collection the delete touches. Nullify/restrict entries for a collection that is also
 * cascade-deleted are dropped: those records disappear anyway, listing them twice only confuses.
 */
export function planDeleteImpact(
  edges: RelationEdge[],
  root: string,
  options: { ignore?: string[]; maxDepth?: number } = {},
): ImpactNode[] {
  const ignore = new Set(options.ignore ?? [])
  const maxDepth = options.maxDepth ?? 4
  const byKey = new Map<string, ImpactNode>()

  function add(collection: string, policy: RelationPolicy, path: string) {
    const key = `${collection}:${policy}`
    const node = byKey.get(key)
    if (!node) byKey.set(key, { collection, policy, paths: [path] })
    else if (!node.paths.includes(path)) node.paths.push(path)
  }

  function walk(target: string, suffix: string, depth: number, ancestors: Set<string>) {
    for (const edge of edges) {
      if (edge.to !== target || ignore.has(edge.from)) continue
      const path = suffix ? `${edge.field}.${suffix}` : edge.field
      add(edge.from, edge.policy, path)
      if (edge.policy === 'cascade' && depth < maxDepth && !ancestors.has(edge.from)) {
        walk(edge.from, path, depth + 1, new Set([...ancestors, edge.from]))
      }
    }
  }

  walk(root, '', 1, new Set([root]))

  const cascaded = new Set([...byKey.values()].filter((n) => n.policy === 'cascade').map((n) => n.collection))
  return [...byKey.values()]
    .filter((n) => n.policy === 'cascade' || !cascaded.has(n.collection))
    .map((n) => ({ ...n, paths: [...n.paths].sort() }))
}

/** Builds the PocketBase filter for an impact node; `{:id}` is bound to the deleted record's id. */
export function impactFilter(node: ImpactNode): string {
  return node.paths.map((path) => `${path} = {:id}`).join(' || ')
}
