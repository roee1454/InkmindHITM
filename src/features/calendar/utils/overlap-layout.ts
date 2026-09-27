export interface TimedItem {
  startMinutes: number
  endMinutes: number
}

export interface OverlapLayout {
  column: number
  columnCount: number
  /** How many columns wide the item is: it expands right across columns nothing conflicting holds. */
  span: number
}

function conflicts(a: TimedItem, b: TimedItem): boolean {
  return a.startMinutes < b.endMinutes && a.endMinutes > b.startMinutes
}

/**
 * Lays overlapping appointments out side by side. Columns are assigned greedily, then each item
 * **expands right** across columns no conflicting item occupies (track-b B6.8).
 *
 * Without that expansion an item is as narrow as the busiest moment of its whole overlap chain,
 * even when nothing is beside it: a 14:00 appointment chained to a long morning one would render
 * at a third width because of two appointments that had already ended.
 */
export function layoutOverlaps<T extends TimedItem>(items: T[]): Map<T, OverlapLayout> {
  const layout = new Map<T, OverlapLayout>()
  const sorted = [...items].sort((a, b) => a.startMinutes - b.startMinutes)

  let activeColumns: (T | null)[] = []
  let group: T[] = []

  const closeGroup = () => {
    if (group.length === 0) return
    const columnCount = activeColumns.length
    for (const item of group) {
      const { column } = layout.get(item)!
      let span = 1
      while (column + span < columnCount) {
        const target = column + span
        const blocked = group.some(
          (other) => other !== item && layout.get(other)!.column === target && conflicts(item, other),
        )
        if (blocked) break
        span++
      }
      layout.set(item, { column, columnCount, span })
    }
    group = []
    activeColumns = []
  }

  for (const item of sorted) {
    for (let i = 0; i < activeColumns.length; i++) {
      if (activeColumns[i] && activeColumns[i]!.endMinutes <= item.startMinutes) activeColumns[i] = null
    }
    if (activeColumns.every((c) => c === null)) closeGroup()

    let column = activeColumns.findIndex((c) => c === null)
    if (column === -1) {
      column = activeColumns.length
      activeColumns.push(item)
    } else {
      activeColumns[column] = item
    }

    layout.set(item, { column, columnCount: 1, span: 1 })
    group.push(item)
  }
  closeGroup()

  return layout
}
