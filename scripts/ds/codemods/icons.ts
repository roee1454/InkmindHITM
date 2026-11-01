/**
 * Icon codemod: legacy glyph components → `<IMIcon name="…" />`.
 *
 *   pnpm ds:codemod icons <file|folder>            dry run: what would change, per area
 *   pnpm ds:codemod icons <file|folder> --write    apply it
 *
 * `<Trash2 className="h-4 w-4 text-muted-foreground" />` becomes
 * `<IMIcon name="trash" size="sm" tone="muted" />`, and the import drops `Trash2` for `IMIcon`.
 *
 * - Name: `LEGACY_TO_IM` (src/components/ui/icon-legacy.ts). The legacy export already draws that
 *   registry glyph, weight and mirroring, so what can change is the size (snapped to a token) and
 *   `text-primary` → `accent` (the same ink in light mode, a step dimmer in dark).
 * - Size: `size-N`, `h-N w-N`, `size-[Npx]` or `size={N}` → the nearest token, ties going up:
 *   ≤13 xs · 14–17 sm · 18–21 md · 22–27 lg · ≥28 xl. `md` is the default, so it isn't written.
 * - Tone: a token colour class (`text-muted-foreground`, `text-primary`, `text-artist-3`…) → `tone`.
 *   Other classes stay in `className`, including opacity variants (`text-muted-foreground/60`)
 *   and state variants (`group-hover:text-foreground`). `shrink-0` goes: IMIcon has it.
 * - `animate-spin` on `Loader2` → `spin`. `aria-hidden` goes (IMIcon's default); `aria-label` → `label`.
 *
 * Sites it can't rewrite are left untouched and reported as `file:line reason`: component
 * references (`icon: Calendar`, `typeof Sun`), spread props, a dynamic `className`/`size`, a
 * `weight` override, other props, a manual flip on a glyph the registry mirrors. It also lists
 * dynamic icon renderers (`<item.icon />`, `<Icon />`), which take an `IMIconName` once their
 * source is converted. Rules: docs/design-system/icons.md.
 */
import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'
import { LEGACY_TO_IM } from '../../../src/components/ui/icon-legacy'
import { IM_ICONS } from '../../../src/components/ui/icon-registry'
import type { IMIconName } from '../../../src/components/ui/icon-registry'
import type { IMIconSize, IMIconTone } from '../../../src/components/ui/icon'

const ROOT = path.resolve(import.meta.dirname, '../../..')

export interface IconIssue {
  line: number
  reason: string
}

export interface IconTransform {
  output: string
  /** Legacy JSX sites and component references found. */
  sites: number
  rewritten: number
  /** Sites left untouched — fix by hand. */
  skipped: IconIssue[]
  /** `<item.icon />`-style renderers, fed by a component reference somewhere. */
  dynamic: IconIssue[]
  /** Rewritten, but worth a look (an unsized source, a colour class kept in `className`). */
  notes: IconIssue[]
}

const SIZE_STEPS: ReadonlyArray<readonly [maxPx: number, size: IMIconSize]> = [
  [13, 'xs'],
  [17, 'sm'],
  [21, 'md'],
  [27, 'lg'],
]

/** Nearest size token for a pixel size; a tie goes to the larger token (14 → sm, 18 → md…). */
export function sizeToken(px: number): IMIconSize {
  return SIZE_STEPS.find(([max]) => px <= max)?.[1] ?? 'xl'
}

const TONE_BY_CLASS: Readonly<Record<string, IMIconTone>> = {
  'text-muted-foreground': 'muted',
  'text-foreground': 'default',
  'text-destructive': 'destructive',
  'text-success': 'success',
  'text-warning': 'warning',
  'text-accent-ink': 'accent',
  'text-primary': 'accent',
  'text-artist-1': 'artist-1',
  'text-artist-2': 'artist-2',
  'text-artist-3': 'artist-3',
  'text-artist-4': 'artist-4',
  'text-artist-5': 'artist-5',
  'text-artist-6': 'artist-6',
  'text-artist-7': 'artist-7',
  'text-artist-8': 'artist-8',
}

/** `text-*` utilities that aren't colours. */
const NON_COLOUR_TEXT =
  /^text-(?:xs|sm|base|lg|[2-9]?xl|2xs|micro|mini|left|right|center|start|end|justify|wrap|nowrap|balance|pretty|ellipsis|clip|\[[\d.]+(?:px|rem|em)\])$/

/** Redundant on IMIcon: it never shrinks, and `inherit` is its default tone. */
const DROPPED_CLASSES = new Set([
  'shrink-0',
  'flex-shrink-0',
  'text-inherit',
  'text-current',
])
const FLIP_CLASS = /^-?(?:rotate-180|scale-x-\S+)$/
const ICON_MODULE = /^[@#]\/components\/ui\/icon(?:\.tsx)?$/

const isLegacyName = (name: string): name is keyof typeof LEGACY_TO_IM =>
  Object.hasOwn(LEGACY_TO_IM, name)

function sizeFromValue(value: string): number | null {
  const scale = /^(\d+(?:\.\d+)?)$/.exec(value)
  if (scale?.[1]) return Number(scale[1]) * 4
  const px = /^\[(\d+(?:\.\d+)?)px\]$/.exec(value)
  if (px?.[1]) return Number(px[1])
  const rem = /^\[(\d+(?:\.\d+)?)rem\]$/.exec(value)
  if (rem?.[1]) return Number(rem[1]) * 16
  return null
}

interface ClassResult {
  px: number | null
  tone: IMIconTone | null
  spin: boolean
  kept: string[]
  notes: string[]
}

/** Splits a static class string into IMIcon props and the classes that stay. A string is a skip reason. */
function analyseClasses(
  classes: string,
  name: IMIconName,
): ClassResult | string {
  const result: ClassResult = {
    px: null,
    tone: null,
    spin: false,
    kept: [],
    notes: [],
  }
  const box: { size?: number; h?: number; w?: number } = {}
  for (const cls of classes.split(/\s+/).filter(Boolean)) {
    const variant = cls.includes(':') ? cls.slice(0, cls.lastIndexOf(':')) : ''
    const base = cls.slice(variant ? variant.length + 1 : 0)
    const dimension = /^(size|h|w)-(.+)$/.exec(base)
    if (dimension?.[1] && dimension[2]) {
      if (variant)
        return `variant size class \`${cls}\` — sizes are tokens, pick one by hand`
      const px = sizeFromValue(dimension[2])
      if (px === null) return `size class \`${cls}\` has no token`
      if (dimension[1] === 'size') box.size = px
      else if (dimension[1] === 'h') box.h = px
      else box.w = px
      continue
    }
    if (!variant && base in TONE_BY_CLASS) {
      const tone = TONE_BY_CLASS[base]
      if (result.tone && result.tone !== tone) return 'two tone classes'
      result.tone = tone ?? null
      continue
    }
    if (
      base === 'animate-spin' &&
      (variant === '' || variant === 'motion-safe')
    ) {
      if (name !== 'spinner')
        return `\`${cls}\` on \`${name}\` — only the spinner spins`
      result.spin = true
      continue
    }
    if (!variant && DROPPED_CLASSES.has(base)) continue
    if (FLIP_CLASS.test(base) && IM_ICONS[name].mirrorInRtl) {
      return `manual flip \`${cls}\` on \`${name}\`, which the registry already mirrors in RTL — check the direction by hand`
    }
    if (
      !variant &&
      base.startsWith('text-') &&
      !NON_COLOUR_TEXT.test(base) &&
      !/^text-[\w-]+\/\d+$/.test(base)
    ) {
      result.notes.push(
        `kept colour class \`${cls}\` — use a tone, or keep it if no tone fits`,
      )
    }
    result.kept.push(cls)
  }
  if (box.size !== undefined) result.px = box.size
  else if (box.h !== undefined || box.w !== undefined) {
    if (box.h !== box.w) return 'width and height classes differ'
    result.px = box.h ?? null
  }
  if (result.spin)
    result.kept = result.kept.filter((c) => c !== 'motion-reduce:animate-none')
  return result
}

/** The text of a static string attribute (`a="x"`, `a={'x'}`, `a={`x`}`), or null. */
function staticString(init: ts.JsxAttributeValue | undefined): string | null {
  if (!init) return null
  if (ts.isStringLiteral(init)) return init.text
  if (ts.isJsxExpression(init) && init.expression) {
    const e = init.expression
    if (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e))
      return e.text
  }
  return null
}

function staticNumber(init: ts.JsxAttributeValue | undefined): number | null {
  const text = staticString(init)
  if (text !== null) return /^\d+(?:\.\d+)?$/.test(text) ? Number(text) : null
  if (
    init &&
    ts.isJsxExpression(init) &&
    init.expression &&
    ts.isNumericLiteral(init.expression)
  ) {
    return Number(init.expression.text)
  }
  return null
}

/** True when an identifier names a value (not a property key, member name, or JSX attribute). */
function isReference(id: ts.Identifier): boolean {
  const p = id.parent
  if (
    (ts.isPropertyAccessExpression(p) || ts.isQualifiedName(p)) &&
    (ts.isPropertyAccessExpression(p) ? p.name : p.right) === id
  )
    return false
  if (
    (ts.isPropertyAssignment(p) ||
      ts.isPropertySignature(p) ||
      ts.isPropertyDeclaration(p) ||
      ts.isMethodDeclaration(p) ||
      ts.isEnumMember(p)) &&
    p.name === id
  )
    return false
  if (ts.isBindingElement(p) && p.propertyName === id) return false
  if (ts.isJsxAttribute(p) || ts.isJsxClosingElement(p)) return false
  // A JSX tag is handled as an element, not as a reference.
  if (
    (ts.isJsxOpeningElement(p) || ts.isJsxSelfClosingElement(p)) &&
    p.tagName === id
  )
    return false
  return true
}

const DYNAMIC_TAG = /^(?:[A-Z]\w*)?Icon$/

/** `a` in `a.b.c` — `SelectPrimitive.Icon` comes from an import and is no icon renderer. */
function rootName(expr: ts.Expression): string {
  return ts.isPropertyAccessExpression(expr)
    ? rootName(expr.expression)
    : expr.getText()
}

export function transformIcons(
  fileName: string,
  source: string,
): IconTransform {
  const kind = fileName.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  const sf = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
    kind,
  )
  const lineOf = (node: ts.Node) =>
    sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1
  const result: IconTransform = {
    output: source,
    sites: 0,
    rewritten: 0,
    skipped: [],
    dynamic: [],
    notes: [],
  }

  const inUi = /components[\\/]ui$/.test(path.dirname(fileName))
  const iconImports: ts.ImportDeclaration[] = []
  const localToIm = new Map<string, IMIconName>()
  const importedLocals = new Set<string>()
  for (const st of sf.statements) {
    if (!ts.isImportDeclaration(st) || !ts.isStringLiteral(st.moduleSpecifier))
      continue
    const clause = st.importClause
    for (const el of clause?.namedBindings &&
    ts.isNamedImports(clause.namedBindings)
      ? clause.namedBindings.elements
      : []) {
      importedLocals.add(el.name.text)
    }
    if (clause?.name) importedLocals.add(clause.name.text)
    if (clause?.namedBindings && ts.isNamespaceImport(clause.namedBindings))
      importedLocals.add(clause.namedBindings.name.text)
    const spec = st.moduleSpecifier.text
    if (!ICON_MODULE.test(spec) && !(inUi && spec === './icon')) continue
    if (!clause || clause.isTypeOnly) continue
    if (clause.namedBindings && ts.isNamespaceImport(clause.namedBindings)) {
      result.skipped.push({
        line: lineOf(st),
        reason: 'namespace import of the icon module',
      })
      continue
    }
    if (!clause.namedBindings) continue
    iconImports.push(st)
    for (const el of clause.namedBindings.elements) {
      const imported = (el.propertyName ?? el.name).text
      if (!el.isTypeOnly && isLegacyName(imported))
        localToIm.set(el.name.text, LEGACY_TO_IM[imported])
    }
  }

  const edits: Array<{ start: number; end: number; text: string }> = []
  const stillUsed = new Set<string>()
  let needsIMIcon = false

  const rewriteElement = (
    el: ts.JsxSelfClosingElement | ts.JsxElement,
    local: string,
    name: IMIconName,
  ) => {
    result.sites++
    const line = lineOf(el)
    const skip = (reason: string) => {
      result.skipped.push({ line, reason: `<${local}>: ${reason}` })
      stillUsed.add(local)
    }
    if (
      ts.isJsxElement(el) &&
      el.children.some(
        (c) => !(ts.isJsxText(c) && c.containsOnlyTriviaWhiteSpaces),
      )
    ) {
      return skip('has children')
    }
    const opening = ts.isJsxElement(el) ? el.openingElement : el
    let classes = ''
    let sizeProp: number | null = null
    let label: string | null = null
    let key: string | null = null
    for (const attr of opening.attributes.properties) {
      if (ts.isJsxSpreadAttribute(attr)) return skip('spread props')
      const prop = attr.name.getText(sf)
      const init = attr.initializer
      switch (prop) {
        case 'className': {
          const text = staticString(init)
          if (text === null) return skip('dynamic className')
          classes = text
          break
        }
        case 'size': {
          sizeProp = staticNumber(init)
          if (sizeProp === null) return skip('dynamic size')
          break
        }
        case 'weight': {
          if (staticString(init) !== IM_ICONS[name].weight)
            return skip('weight override — the registry decides the weight')
          break
        }
        case 'aria-hidden': {
          const value = !init
            ? 'true'
            : ts.isJsxExpression(init)
              ? init.expression?.getText(sf)
              : staticString(init)
          if (value !== 'true') return skip('aria-hidden is not "true"')
          break
        }
        case 'aria-label':
          if (!init) return skip('empty aria-label')
          label = init.getText(sf)
          break
        case 'role':
          if (staticString(init) !== 'img')
            return skip(`role="${staticString(init) ?? '…'}"`)
          break
        case 'key':
          if (!init) return skip('empty key')
          key = init.getText(sf)
          break
        default:
          return skip(`unsupported prop \`${prop}\``)
      }
    }
    const analysed = analyseClasses(classes, name)
    if (typeof analysed === 'string') return skip(analysed)
    const px = analysed.px ?? sizeProp
    if (px === null) {
      result.notes.push({
        line,
        reason: `<${local}> had no size (1em, or its holder's svg rule) — IMIcon defaults to md 20px; check: xs badge · sm menu item/input · md button`,
      })
    }
    for (const note of analysed.notes)
      result.notes.push({ line, reason: `<${local}>: ${note}` })
    const size = px === null ? 'md' : sizeToken(px)
    const attrs = [
      key !== null && `key=${key}`,
      `name="${name}"`,
      size !== 'md' && `size="${size}"`,
      analysed.tone && `tone="${analysed.tone}"`,
      label !== null && `label=${label}`,
      analysed.spin && 'spin',
      analysed.kept.length > 0 && `className="${analysed.kept.join(' ')}"`,
    ].filter(Boolean)
    edits.push({
      start: el.getStart(sf),
      end: el.getEnd(),
      text: `<IMIcon ${attrs.join(' ')} />`,
    })
    result.rewritten++
    needsIMIcon = true
  }

  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node)) return
    if (ts.isJsxSelfClosingElement(node) || ts.isJsxElement(node)) {
      const tag = ts.isJsxElement(node)
        ? node.openingElement.tagName
        : node.tagName
      const im = ts.isIdentifier(tag) ? localToIm.get(tag.text) : undefined
      if (ts.isIdentifier(tag) && im) {
        const before = edits.length
        rewriteElement(node, tag.text, im)
        // A site left untouched may hold more icons in its props or children.
        if (edits.length === before) node.forEachChild(visit)
        return
      }
      const isDynamic =
        (ts.isPropertyAccessExpression(tag) &&
          /icon$/i.test(tag.name.text) &&
          !importedLocals.has(rootName(tag))) ||
        (ts.isIdentifier(tag) &&
          DYNAMIC_TAG.test(tag.text) &&
          !importedLocals.has(tag.text))
      if (isDynamic) {
        result.dynamic.push({
          line: lineOf(node),
          reason: `<${tag.getText(sf)} /> renders an icon component — once its source is an IMIconName, render <IMIcon name={…} />`,
        })
      }
    }
    if (
      ts.isIdentifier(node) &&
      localToIm.has(node.text) &&
      isReference(node)
    ) {
      result.sites++
      stillUsed.add(node.text)
      const how = ts.isTypeQueryNode(node.parent)
        ? `typeof ${node.text}`
        : node.text
      result.skipped.push({
        line: lineOf(node),
        reason: `component reference \`${how}\` — pass the name '${localToIm.get(node.text)}' (IMIconName) instead`,
      })
      return
    }
    node.forEachChild(visit)
  }
  sf.forEachChild(visit)

  if (result.rewritten === 0) return result

  // Imports: drop legacy specifiers that have no use left, and import IMIcon once.
  const hasIMIcon = iconImports.some((d) => {
    const nb = d.importClause?.namedBindings
    return (
      nb &&
      ts.isNamedImports(nb) &&
      nb.elements.some((el) => (el.propertyName ?? el.name).text === 'IMIcon')
    )
  })
  let imIconPlaced = hasIMIcon || !needsIMIcon
  for (const decl of iconImports) {
    const nb = decl.importClause?.namedBindings
    if (!nb || !ts.isNamedImports(nb)) continue
    const kept = nb.elements.filter(
      (el) => !localToIm.has(el.name.text) || stillUsed.has(el.name.text),
    )
    const specifiers = kept.map((el) => el.getText(sf))
    if (!imIconPlaced) {
      specifiers.push('IMIcon')
      imIconPlaced = true
    }
    if (
      specifiers.length === nb.elements.length &&
      kept.length === nb.elements.length
    )
      continue
    if (specifiers.length === 0 && !decl.importClause?.name) {
      const end =
        source[decl.getEnd()] === '\n' ? decl.getEnd() + 1 : decl.getEnd()
      edits.push({ start: decl.getStart(sf), end, text: '' })
      continue
    }
    // One line when it fits prettier's 80 columns, else one specifier per line as before.
    const oneLine = `{ ${specifiers.join(', ')} }`
    const indent = /\n([ \t]+)\S/.exec(nb.getText(sf))?.[1]
    const lineLength =
      decl.getText(sf).length - nb.getText(sf).length + oneLine.length
    const text =
      indent && lineLength > 80
        ? `{\n${specifiers.map((s) => `${indent}${s},`).join('\n')}\n}`
        : oneLine
    edits.push({ start: nb.getStart(sf), end: nb.getEnd(), text })
  }

  let output = source
  for (const edit of edits.sort((a, b) => b.start - a.start)) {
    output = output.slice(0, edit.start) + edit.text + output.slice(edit.end)
  }
  result.output = output
  return result
}

/** features/<x> → x · components/ui → ui · components → shell · routes · else other (as `pnpm ds:audit`). */
function areaOf(file: string): string {
  const [top, second] = path
    .relative(path.join(ROOT, 'src'), file)
    .split(path.sep)
  if (top === 'features' && second) return second
  if (top === 'components') return second === 'ui' ? 'ui' : 'shell'
  if (top === 'routes') return 'routes'
  return 'other'
}

const OWN_FILES = /components[\\/]ui[\\/]icon(?:-legacy|-registry)?\.tsx?$/

function listFiles(target: string): string[] {
  const stat = fs.statSync(target)
  if (stat.isFile()) return [target]
  return fs
    .readdirSync(target, { withFileTypes: true, recursive: true })
    .filter(
      (e) => e.isFile() && /\.tsx?$/.test(e.name) && !e.name.endsWith('.d.ts'),
    )
    .map((e) => path.join(e.parentPath, e.name))
    .filter(
      (f) =>
        !f.includes(`${path.sep}node_modules${path.sep}`) && !OWN_FILES.test(f),
    )
    .sort()
}

export async function run(args: string[]): Promise<void> {
  const write = args.includes('--write')
  const target = args.find((a) => !a.startsWith('--'))
  if (!target) {
    console.error('usage: pnpm ds:codemod icons <file|folder> [--write]')
    process.exitCode = 2
    return
  }
  const abs = path.resolve(process.cwd(), target)
  if (!fs.existsSync(abs)) {
    console.error(`no such file or folder: ${target}`)
    process.exitCode = 2
    return
  }

  interface Row {
    files: number
    sites: number
    rewritten: number
    skipped: number
    dynamic: number
    notes: number
  }
  const rows = new Map<string, Row>()
  const report: Record<'skipped' | 'dynamic' | 'notes', string[]> = {
    skipped: [],
    dynamic: [],
    notes: [],
  }
  let changedFiles = 0

  for (const file of listFiles(abs)) {
    const source = fs.readFileSync(file, 'utf8')
    const t = transformIcons(file, source)
    if (t.sites === 0 && t.dynamic.length === 0 && t.skipped.length === 0)
      continue
    const rel = path.relative(ROOT, file)
    const area = areaOf(file)
    const row = rows.get(area) ?? {
      files: 0,
      sites: 0,
      rewritten: 0,
      skipped: 0,
      dynamic: 0,
      notes: 0,
    }
    row.files++
    row.sites += t.sites
    row.rewritten += t.rewritten
    row.skipped += t.sites - t.rewritten
    row.dynamic += t.dynamic.length
    row.notes += t.notes.length
    rows.set(area, row)
    for (const key of ['skipped', 'dynamic', 'notes'] as const) {
      for (const issue of t[key])
        report[key].push(`${rel}:${issue.line}  ${issue.reason}`)
    }
    if (t.output !== source) {
      changedFiles++
      if (write) fs.writeFileSync(file, t.output)
    }
  }

  const sorted = [...rows.entries()].sort((a, b) => b[1].sites - a[1].sites)
  const total = sorted.reduce<Row>(
    (acc, [, r]) => ({
      files: acc.files + r.files,
      sites: acc.sites + r.sites,
      rewritten: acc.rewritten + r.rewritten,
      skipped: acc.skipped + r.skipped,
      dynamic: acc.dynamic + r.dynamic,
      notes: acc.notes + r.notes,
    }),
    { files: 0, sites: 0, rewritten: 0, skipped: 0, dynamic: 0, notes: 0 },
  )
  const pct = (r: Row) =>
    r.sites ? `${Math.round((100 * r.rewritten) / r.sites)}%` : '—'
  console.log(
    `Icon codemod — ${write ? 'WRITE' : 'dry run'} — ${path.relative(ROOT, abs) || '.'}\n`,
  )
  console.log(
    '| area | files | sites | rewritten | by hand | coverage | dynamic renderers | notes |',
  )
  console.log('|---|---:|---:|---:|---:|---:|---:|---:|')
  for (const [area, r] of [...sorted, ['**all**', total] as const]) {
    console.log(
      `| ${area} | ${r.files} | ${r.sites} | ${r.rewritten} | ${r.skipped} | ${pct(r)} | ${r.dynamic} | ${r.notes} |`,
    )
  }
  const section = (title: string, lines: string[]) => {
    if (lines.length)
      console.log(
        `\n${title} (${lines.length}):\n${lines.map((l) => `  ${l}`).join('\n')}`,
      )
  }
  section('Left untouched — fix by hand', report.skipped)
  section('Dynamic icon renderers', report.dynamic)
  section('Rewritten — check', report.notes)
  console.log(
    write
      ? `\nWrote ${changedFiles} file(s). Next: pnpm tsc --noEmit, then prettier on the touched files.`
      : `\n${changedFiles} file(s) would change. Re-run with --write to apply.`,
  )
}
