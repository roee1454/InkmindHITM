import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { IMPagination, imPaginationPages } from '@/components/ui/pagination'

const noop = () => {}

describe('imPaginationPages (windowing)', () => {
  it('returns every page when there are at most 7', () => {
    expect(imPaginationPages(1, 1)).toEqual([1])
    expect(imPaginationPages(1, 5)).toEqual([1, 2, 3, 4, 5])
    expect(imPaginationPages(3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7])
  })

  it('shows a trailing ellipsis near the start (currentPage <= 4)', () => {
    expect(imPaginationPages(1, 10)).toEqual([1, 2, 3, 4, 5, 'ellipsis-end', 10])
    expect(imPaginationPages(4, 10)).toEqual([1, 2, 3, 4, 5, 'ellipsis-end', 10])
  })

  it('shows a leading ellipsis near the end (currentPage >= totalPages - 3)', () => {
    expect(imPaginationPages(7, 10)).toEqual([1, 'ellipsis-start', 6, 7, 8, 9, 10])
    expect(imPaginationPages(10, 10)).toEqual([1, 'ellipsis-start', 6, 7, 8, 9, 10])
  })

  it('shows both ellipses in the middle', () => {
    expect(imPaginationPages(5, 10)).toEqual([1, 'ellipsis-start', 4, 5, 6, 'ellipsis-end', 10])
    expect(imPaginationPages(50, 100)).toEqual([1, 'ellipsis-start', 49, 50, 51, 'ellipsis-end', 100])
  })

  it('never produces more than 7 slots, so the row cannot overflow', () => {
    for (let total = 1; total <= 50; total++) {
      for (let current = 1; current <= total; current++) {
        expect(imPaginationPages(current, total).length).toBeLessThanOrEqual(7)
      }
    }
  })
})

describe('IMPagination', () => {
  it('renders nothing for a single page', () => {
    expect(renderToStaticMarkup(<IMPagination currentPage={1} totalPages={1} onPageChange={noop} />)).toBe('')
  })

  it('summarises the range with the item label', () => {
    const html = renderToStaticMarkup(
      <IMPagination currentPage={2} totalPages={6} totalItems={57} itemsPerPage={10} itemLabel="לקוחות" onPageChange={noop} />,
    )
    expect(html).toContain('11–20')
    expect(html).toContain('57')
    expect(html).toContain('לקוחות')
  })

  it('caps the last range at the total', () => {
    const html = renderToStaticMarkup(
      <IMPagination currentPage={6} totalPages={6} totalItems={57} itemsPerPage={10} onPageChange={noop} />,
    )
    expect(html).toContain('51–57')
  })

  it('marks the current page and clamps an out-of-range page', () => {
    const html = renderToStaticMarkup(<IMPagination currentPage={99} totalPages={7} onPageChange={noop} />)
    expect(html).toMatch(/aria-current="page"[^>]*><span data-slot="im-num" dir="ltr"[^>]*>7</)
    expect(html.match(/aria-current="page"/g)).toHaveLength(1)
  })

  it('collapses to "page / total" on phones', () => {
    const html = renderToStaticMarkup(<IMPagination currentPage={2} totalPages={7} onPageChange={noop} />)
    expect(html).toMatch(/dir="ltr"[^>]*>2(?:<!-- -->)? \/ (?:<!-- -->)?7</)
    expect(html).not.toContain('עמוד 2 מתוך')
  })

  it('disables previous on the first page and next on the last', () => {
    const first = renderToStaticMarkup(<IMPagination currentPage={1} totalPages={3} onPageChange={noop} />)
    expect(first).toMatch(/<button[^>]*disabled=""[^>]*aria-label="עמוד קודם"/)
    expect(first).not.toMatch(/<button[^>]*disabled=""[^>]*aria-label="עמוד הבא"/)
    const last = renderToStaticMarkup(<IMPagination currentPage={3} totalPages={3} onPageChange={noop} />)
    expect(last).toMatch(/<button[^>]*disabled=""[^>]*aria-label="עמוד הבא"/)
  })
})
