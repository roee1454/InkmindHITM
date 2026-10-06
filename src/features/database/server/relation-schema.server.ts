import type PocketBase from 'pocketbase'
import { extractRelationEdges } from '../utils/relation-graph'
import type { CollectionSchema, RelationEdge } from '../utils/relation-graph'

const CACHE_TTL_MS = 60_000

// performance.now() rather than Date.now(): a monotonic clock, so a wall-clock jump can't pin a
// stale schema in memory (the same failure mode that once froze the React Query cache).
let cache: { edges: RelationEdge[]; loadedAt: number } | null = null

export async function loadCollectionSchemas(su: PocketBase): Promise<CollectionSchema[]> {
  const collections = await su.collections.getFullList()
  return collections.map((collection) => ({
    id: collection.id,
    name: collection.name,
    system: collection.system,
    fields: collection.fields.map((field) => ({
      name: field.name,
      type: field.type,
      collectionId: typeof field.collectionId === 'string' ? field.collectionId : undefined,
      cascadeDelete: field.cascadeDelete === true,
      required: field.required === true,
    })),
  }))
}

/** Relation edges of the live schema. Cached briefly: the schema only changes with a migration. */
export async function getRelationEdges(su: PocketBase): Promise<RelationEdge[]> {
  if (cache && performance.now() - cache.loadedAt < CACHE_TTL_MS) return cache.edges
  const edges = extractRelationEdges(await loadCollectionSchemas(su))
  cache = { edges, loadedAt: performance.now() }
  return edges
}
