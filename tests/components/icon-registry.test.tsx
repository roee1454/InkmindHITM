import { readFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { IM_ICONS } from '@/components/ui/icon-registry'
import * as legacyModule from '@/components/ui/icon-legacy'
import { LEGACY_TO_IM } from '@/components/ui/icon-legacy'

const ROOT = path.resolve(import.meta.dirname, '../..')
const entries = Object.entries(IM_ICONS)

/** Pure strokes: Phosphor's `fill` weight boxes these into a square, so they stay `bold`. */
const STROKES = [
  'check',
  'check-double',
  'close',
  'spinner',
  'plus',
  'refresh',
  'undo',
  'redo',
  'repeat',
  'reply',
  'download',
  'upload',
  'link',
  'attach',
  'more',
  'menu',
  'arrow-back',
  'arrow-up',
  'trend-up',
  'activity',
]

describe('icon registry', () => {
  it('names every icon in semantic kebab-case', () => {
    for (const [name] of entries) expect(name).toMatch(/^[a-z]+(?:-[a-z]+)*$/)
  })

  it('draws every glyph', () => {
    for (const [name, { glyph, weight }] of entries) {
      expect(
        renderToStaticMarkup(createElement(glyph, { weight })),
        name,
      ).toMatch(/^<svg[^>]*><path /)
    }
  })

  it('uses one glyph per name — duplicates are folded into one name', () => {
    const glyphs = entries.map(([, e]) => e.glyph)
    expect(new Set(glyphs).size).toBe(glyphs.length)
  })

  it('follows the fill rule: fill wherever the glyph has an inside, bold only for pure strokes', () => {
    for (const [name, { weight }] of entries) {
      expect(weight, name).toBe(STROKES.includes(name) ? 'bold' : 'fill')
    }
  })

  // INTERIM: the spec mirror goes in plan Phase 3, item 3.3 — delete this test with it.
  it('matches the approved spec (docs/im-design-system/spec/icon-registry.json)', () => {
    const spec = z
      .record(
        z.string(),
        z.object({
          glyph: z.string(),
          weight: z.enum(['fill', 'bold']),
          mirrorInRtl: z.boolean(),
        }),
      )
      .parse(
        JSON.parse(
          readFileSync(
            path.join(ROOT, 'docs/im-design-system/spec/icon-registry.json'),
            'utf8',
          ),
        ),
      )
    const ours = Object.fromEntries(
      entries.map(([name, e]) => [
        name,
        {
          glyph: e.glyph.displayName?.replace(/Icon$/, ''),
          weight: e.weight,
          mirrorInRtl: e.mirrorInRtl === true,
        },
      ]),
    )
    expect(ours).toEqual(spec)
  })
})

// INTERIM: goes with src/components/ui/icon-legacy.ts in plan Phase 3, item 3.1.
describe('legacy icon map', () => {
  const legacyNames = Object.keys(LEGACY_TO_IM)

  it('maps every legacy name to a registry name', () => {
    for (const [legacy, name] of Object.entries(LEGACY_TO_IM))
      expect(IM_ICONS, legacy).toHaveProperty([name])
  })

  it('exports exactly one component per mapped name', () => {
    const exported = Object.keys(legacyModule).filter(
      (key) => key !== 'LEGACY_TO_IM',
    )
    expect(exported.sort()).toEqual([...legacyNames].sort())
  })

  it('is what the lint rule flags', async () => {
    const rulesUrl = pathToFileURL(
      path.join(ROOT, 'eslint/design-system/icons.js'),
    ).href
    const rules = z
      .object({
        default: z.object({
          imports: z.object({
            paths: z.array(
              z.object({
                name: z.string(),
                importNames: z.array(z.string()).optional(),
              }),
            ),
          }),
        }),
      })
      .parse(await import(/* @vite-ignore */ rulesUrl))
    const iconModule = rules.default.imports.paths.find(
      (p) => p.name === '@/components/ui/icon',
    )
    expect(iconModule?.importNames?.sort()).toEqual([...legacyNames].sort())
  })
})
