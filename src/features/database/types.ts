import type { EntityCollection } from '@/lib/query-keys'
import type { RelationPolicy } from './utils/relation-graph'

export type DeletableCollection = EntityCollection
export type { RelationPolicy }

export interface DeleteImpactItem {
  collection: string
  policy: RelationPolicy
  count: number
}

export interface ActiveAppointmentSummary {
  id: string
  startTime: string
  status: string
  staffName: string | null
}

/** Why a delete can't go ahead right now — each maps to its own explanation and next step in the UI. */
export type DeleteBlocker =
  | { code: 'active_appointments'; appointments: ActiveAppointmentSummary[] }
  | { code: 'last_owner' }
  | { code: 'self_delete' }
  | { code: 'restricted_relation'; collection: string; count: number }

export type DeleteImpactResult =
  | { status: 'ok'; label: string; items: DeleteImpactItem[]; blockers: DeleteBlocker[] }
  | { status: 'not_found' }
  | { status: 'forbidden' }

export type DeleteEntityResult =
  | { status: 'deleted'; label: string }
  | { status: 'not_found' }
  | { status: 'forbidden' }
  | { status: 'blocked'; blocker: DeleteBlocker }
  | { status: 'failed'; message: string }
