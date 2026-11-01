import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { sizeToken, transformIcons } from '../../../scripts/ds/codemods/icons'

const FIXTURES = path.join(import.meta.dirname, 'fixtures/icons')

function fixture(name: string) {
  const input = readFileSync(path.join(FIXTURES, `${name}.input.txt`), 'utf8')
  const expected = readFileSync(
    path.join(FIXTURES, `${name}.output.txt`),
    'utf8',
  )
  return {
    result: transformIcons(`src/features/demo/${name}.tsx`, input),
    expected,
  }
}

const reasons = (issues: Array<{ line: number; reason: string }>) =>
  issues.map((i) => `${i.line} ${i.reason}`)

describe('sizeToken', () => {
  it('snaps to the nearest token, ties going up', () => {
    const cases: Array<[number, string]> = [
      [10, 'xs'],
      [12, 'xs'],
      [13, 'xs'],
      [14, 'sm'],
      [15, 'sm'],
      [16, 'sm'],
      [17, 'sm'],
      [18, 'md'],
      [20, 'md'],
      [21, 'md'],
      [22, 'lg'],
      [24, 'lg'],
      [27, 'lg'],
      [28, 'xl'],
      [32, 'xl'],
      [48, 'xl'],
    ]
    for (const [px, token] of cases)
      expect(sizeToken(px), `${px}px`).toBe(token)
  })
})

describe('icons codemod', () => {
  it('rewrites sized, toned legacy icons and swaps the import for IMIcon', () => {
    const { result, expected } = fixture('basic')
    expect(result.output).toBe(expected)
    expect(result.rewritten).toBe(2)
    expect(result.skipped).toEqual([])
  })

  it('maps sizes and tones, keeps the other classes, drops what IMIcon already does', () => {
    const { result, expected } = fixture('sizes-and-tones')
    expect(result.output).toBe(expected)
    expect(result.rewritten).toBe(10)
    expect(reasons(result.notes)).toEqual([
      expect.stringMatching(/^15 <Check> had no size/),
    ])
  })

  it('leaves what it cannot rewrite untouched, reports it, and keeps those imports', () => {
    const { result, expected } = fixture('partial')
    expect(result.output).toBe(expected)
    expect(result.rewritten).toBe(2)
    expect(reasons(result.skipped)).toEqual([
      expect.stringMatching(/^11 component reference `Check`/),
      expect.stringMatching(/^11 component reference `CheckCheck`/),
      '19 <Check>: spread props',
      '20 <Check>: dynamic className',
      '21 <Check>: dynamic size',
      '23 <Check>: weight override — the registry decides the weight',
      '24 <Check>: unsupported prop `onClick`',
      expect.stringMatching(/^25 <Send>: manual flip `rotate-180` on `send`/),
      '26 <RefreshCw>: `animate-spin` on `refresh` — only the spinner spins',
    ])
    expect(result.sites).toBe(result.rewritten + result.skipped.length)
  })

  it('reports component references and the dynamic renderers they feed', () => {
    const { result, expected } = fixture('references')
    expect(result.output).toBe(expected)
    expect(reasons(result.skipped)).toEqual([
      expect.stringMatching(/^5 component reference `typeof Home`/),
      expect.stringMatching(/^6 component reference `Home`/),
      expect.stringMatching(/^7 component reference `Users`/),
    ])
    // `<SelectPrimitive.Icon />` is a library part, not a renderer of icon components.
    expect(reasons(result.dynamic)).toEqual([
      expect.stringMatching(/^14 <item.icon \/>/),
      expect.stringMatching(/^16 <Icon \/>/),
    ])
  })

  it('leaves a file without legacy icons byte-for-byte alone', () => {
    const source =
      'import { IMIcon } from \'@/components/ui/icon\'\n\nexport const A = () => <IMIcon name="plus" />\n'
    const result = transformIcons('src/features/demo/clean.tsx', source)
    expect(result.output).toBe(source)
    expect(result.sites).toBe(0)
  })
})
