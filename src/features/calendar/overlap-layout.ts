export interface TimedItem {
  startMinutes: number
  endMinutes: number
}

export interface OverlapLayout {
  column: number
  columnCount: number
}

export function layoutOverlaps<T extends TimedItem>(items: T[]): Map<T, OverlapLayout> {
  const layout = new Map<T, OverlapLayout>()
  const sorted = [...items].sort((a, b) => a.startMinutes - b.startMinutes)

  let activeColumns: (T | null)[] = []
  let group: T[] = []

  const closeGroup = () => {
    if (group.length === 0) return
    const columnCount = activeColumns.length
    for (const item of group) layout.set(item, { ...layout.get(item)!, columnCount })
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

    layout.set(item, { column, columnCount: 1 })
    group.push(item)
  }
  closeGroup()

  return layout
}
