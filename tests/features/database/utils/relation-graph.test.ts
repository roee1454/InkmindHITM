import { describe, expect, it } from 'vitest'
import {
  extractRelationEdges,
  impactFilter,
  planDeleteImpact,
} from '@/features/database/utils/relation-graph'
import type { CollectionSchema } from '@/features/database/utils/relation-graph'

const rel = (name: string, collectionId: string, opts: { cascade?: boolean; required?: boolean } = {}) => ({
  name,
  type: 'relation',
  collectionId,
  cascadeDelete: opts.cascade ?? false,
  required: opts.required ?? false,
})

// A trimmed-down copy of the real schema after 1786830040_data_integrity_cascade.js.
const schema: CollectionSchema[] = [
  { id: 'c_customers', name: 'customers', fields: [{ name: 'phone', type: 'text' }] },
  { id: 'c_staff', name: 'staff', fields: [] },
  { id: 'c_conversations', name: 'conversations', fields: [rel('customer', 'c_customers', { cascade: true, required: true }), rel('assigned_staff', 'c_staff')] },
  { id: 'c_messages', name: 'messages', fields: [rel('conversation', 'c_conversations', { cascade: true, required: true }), rel('appointment', 'c_appointments'), rel('sender_staff', 'c_staff')] },
  { id: 'c_appointments', name: 'appointments', fields: [rel('customer', 'c_customers', { cascade: true, required: true }), rel('staff', 'c_staff')] },
  { id: 'c_audit', name: 'audit_log', fields: [rel('conversation', 'c_conversations')] },
  { id: 'c_log', name: 'deletion_log', fields: [rel('actor', 'c_staff')] },
  { id: 'c_mcp_conv', name: 'mcp_conversations', fields: [rel('staff', 'c_staff', { cascade: true, required: true })] },
  { id: 'c_mcp_msg', name: 'mcp_messages', fields: [rel('conversation', 'c_mcp_conv', { cascade: true, required: true })] },
  { id: 'c_mcp_act', name: 'mcp_actions', fields: [rel('conversation', 'c_mcp_conv', { cascade: true, required: true }), rel('message', 'c_mcp_msg', { cascade: true, required: true })] },
  { id: 'c_sys', name: '_superusers', system: true, fields: [rel('owner', 'c_staff', { cascade: true })] },
]

describe('extractRelationEdges', () => {
  const edges = extractRelationEdges(schema)

  it('maps each relation field to a policy', () => {
    expect(edges).toContainEqual({ from: 'messages', field: 'conversation', to: 'conversations', policy: 'cascade' })
    expect(edges).toContainEqual({ from: 'messages', field: 'appointment', to: 'appointments', policy: 'nullify' })
  })

  it('treats a required relation without cascade as blocking', () => {
    const restricted = extractRelationEdges([
      { id: 'a', name: 'parents', fields: [] },
      { id: 'b', name: 'children', fields: [rel('parent', 'a', { required: true })] },
    ])
    expect(restricted).toEqual([{ from: 'children', field: 'parent', to: 'parents', policy: 'restrict' }])
  })

  it('ignores system collections, non-relation fields and relations to unknown collections', () => {
    const extra = extractRelationEdges([...schema, { id: 'x', name: 'orphaned', fields: [rel('ghost', 'missing')] }])
    expect(extra.some((e) => e.from === '_superusers' || e.from === 'orphaned')).toBe(false)
    expect(extra.some((e) => e.field === 'phone')).toBe(false)
  })
})

describe('planDeleteImpact', () => {
  const edges = extractRelationEdges(schema)

  it('follows cascades through grandchildren and builds a filter path back to the root', () => {
    const plan = planDeleteImpact(edges, 'customers')
    expect(plan).toContainEqual({ collection: 'conversations', policy: 'cascade', paths: ['customer'] })
    expect(plan).toContainEqual({ collection: 'messages', policy: 'cascade', paths: ['conversation.customer'] })
    expect(plan).toContainEqual({ collection: 'audit_log', policy: 'nullify', paths: ['conversation.customer'] })
  })

  it('drops nullify entries for collections that are cascade-deleted anyway', () => {
    // messages.appointment (nullify) is reachable via appointments, but messages are deleted by
    // the conversation cascade — listing them twice would only confuse.
    const plan = planDeleteImpact(edges, 'customers')
    expect(plan.filter((n) => n.collection === 'messages')).toEqual([
      { collection: 'messages', policy: 'cascade', paths: ['conversation.customer'] },
    ])
  })

  it('merges every path to the same collection so shared descendants are counted once', () => {
    const actions = planDeleteImpact(edges, 'staff').find((n) => n.collection === 'mcp_actions')
    expect(actions?.paths).toEqual(['conversation.staff', 'message.conversation.staff'])
    expect(impactFilter(actions!)).toBe('conversation.staff = {:id} || message.conversation.staff = {:id}')
  })

  it('separates what a staff delete removes from what it only unassigns', () => {
    const plan = planDeleteImpact(edges, 'staff', { ignore: ['deletion_log'] })
    const byPolicy = (policy: string) => plan.filter((n) => n.policy === policy).map((n) => n.collection).sort()
    expect(byPolicy('cascade')).toEqual(['mcp_actions', 'mcp_conversations', 'mcp_messages'])
    expect(byPolicy('nullify')).toEqual(['appointments', 'conversations', 'messages'])
  })

  it('stops at cycles and at the depth limit', () => {
    const cyclic = extractRelationEdges([
      { id: 'a', name: 'a', fields: [rel('b', 'b', { cascade: true })] },
      { id: 'b', name: 'b', fields: [rel('a', 'a', { cascade: true })] },
    ])
    expect(planDeleteImpact(cyclic, 'a')).toEqual([
      { collection: 'b', policy: 'cascade', paths: ['a'] },
      { collection: 'a', policy: 'cascade', paths: ['b.a'] },
    ])

    const chain = extractRelationEdges(
      ['l0', 'l1', 'l2', 'l3'].map((name, i) => ({
        id: name,
        name,
        fields: i === 0 ? [] : [rel('up', `l${i - 1}`, { cascade: true })],
      })),
    )
    expect(planDeleteImpact(chain, 'l0', { maxDepth: 2 }).map((n) => n.collection)).toEqual(['l1', 'l2'])
  })
})
