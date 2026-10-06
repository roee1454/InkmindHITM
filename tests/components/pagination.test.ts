import { describe, it, expect } from 'vitest'
import { getPaginationPages } from '@/components/ui/pagination'

describe('getPaginationPages (Windowing Algorithm)', () => {
  it('returns all pages when totalPages <= 7', () => {
    expect(getPaginationPages(1, 1)).toEqual([1])
    expect(getPaginationPages(1, 5)).toEqual([1, 2, 3, 4, 5])
    expect(getPaginationPages(3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7])
  })

  it('shows trailing ellipsis when near the start (currentPage <= 4)', () => {
    expect(getPaginationPages(1, 10)).toEqual([1, 2, 3, 4, 5, 'ellipsis-end', 10])
    expect(getPaginationPages(4, 10)).toEqual([1, 2, 3, 4, 5, 'ellipsis-end', 10])
  })

  it('shows leading ellipsis when near the end (currentPage >= totalPages - 3)', () => {
    expect(getPaginationPages(7, 10)).toEqual([1, 'ellipsis-start', 6, 7, 8, 9, 10])
    expect(getPaginationPages(10, 10)).toEqual([1, 'ellipsis-start', 6, 7, 8, 9, 10])
  })

  it('shows both leading and trailing ellipsis when in the middle', () => {
    expect(getPaginationPages(5, 10)).toEqual([1, 'ellipsis-start', 4, 5, 6, 'ellipsis-end', 10])
    expect(getPaginationPages(6, 10)).toEqual([1, 'ellipsis-start', 5, 6, 7, 'ellipsis-end', 10])
    expect(getPaginationPages(50, 100)).toEqual([1, 'ellipsis-start', 49, 50, 51, 'ellipsis-end', 100])
  })

  it('never produces more than 7 items in the array (preventing horizontal overflow)', () => {
    for (let total = 1; total <= 50; total++) {
      for (let current = 1; current <= total; current++) {
        const pages = getPaginationPages(current, total)
        expect(pages.length).toBeLessThanOrEqual(7)
      }
    }
  })
})

