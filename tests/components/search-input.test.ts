import { describe, it, expect } from 'vitest'
import { getSearchInputClasses } from '@/components/ui/search-input'

describe('getSearchInputClasses', () => {
  it('generates correct classes for default size and card variant (Calendar)', () => {
    const classes = getSearchInputClasses('default', 'card')
    expect(classes).toContain('h-12')
    expect(classes).toContain('ps-10')
    expect(classes).toContain('pe-10')
    expect(classes).toContain('rounded-2xl')
    expect(classes).toContain('bg-card')
    expect(classes).toContain('border-input')
  })

  it('generates correct classes for lg size and card variant (Customers & Leads)', () => {
    const classes = getSearchInputClasses('lg', 'card')
    expect(classes).toContain('h-13')
    expect(classes).toContain('md:h-12')
    expect(classes).toContain('ps-11')
    expect(classes).toContain('pe-10')
    expect(classes).toContain('text-base')
    expect(classes).toContain('rounded-2xl')
    expect(classes).toContain('bg-card')
  })

  it('generates correct classes for sm size and muted variant (Conversations)', () => {
    const classes = getSearchInputClasses('sm', 'muted')
    expect(classes).toContain('h-9.5')
    expect(classes).toContain('ps-9')
    expect(classes).toContain('pe-8')
    expect(classes).toContain('text-xs')
    expect(classes).toContain('rounded-xl')
    expect(classes).toContain('bg-muted/40')
    expect(classes).toContain('border-border')
  })

  it('merges custom className overrides cleanly', () => {
    const classes = getSearchInputClasses('sm', 'card', 'h-9 text-xs')
    expect(classes).toContain('h-9')
    expect(classes).toContain('text-xs')
  })
})

