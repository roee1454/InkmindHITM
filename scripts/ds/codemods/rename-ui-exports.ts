/**
 * Renames every import and use of an old `src/components/ui` export to its `IM*` name, across src/
 * and tests/, by symbol resolution (TypeScript compiler API) — never by text, so a feature's own
 * `Badge`, a legacy `Calendar` glyph from ui/icon or a `Link` from the router are left alone.
 *
 *   pnpm ds:codemod rename-ui-exports              rewrite src/ and tests/ in place
 *   pnpm ds:codemod rename-ui-exports --dry        report what would change, write nothing
 *   pnpm ds:codemod rename-ui-exports <paths…>     only files under these paths
 *
 * Per file it:
 *   1. rewrites the import specifier (`{ Button }` → `{ IMButton }`, `{ Button as B }` → `{ IMButton as B }`)
 *      and every reference to the imported binding (JSX tags, values, types, shorthand properties);
 *   2. normalises the module specifier to the import convention, `@/components/ui/<file>` (no `#/`,
 *      no extension; `ToastProvider` → `toast`);
 *   3. applies the prop renames the API pass made, on JSX of the renamed components (`variant="default"`
 *      → `variant="primary"` on IMButton, IMConfirmDialog `tone` → `variant`, …), including string
 *      literals in the branches of a conditional.
 * It reports — and leaves — what it can't do safely: removed exports, barrel imports, dynamic prop
 * values, name collisions. src/components/ui itself is hand-written and skipped. Icon, typography and
 * tone modules belong to other pillars and are never touched.
 */
import path from 'node:path'
import { writeFileSync } from 'node:fs'
import ts from 'typescript'

const ROOT = path.resolve(import.meta.dirname, '../../..')
const UI_DIR = path.join(ROOT, 'src/components/ui')

/** module (file basename under ui/) → old export → new export. `null` = removed, no replacement. */
const RENAMES: Record<string, Record<string, string | null>> = {
  avatar: {
    Avatar: 'IMAvatar',
    AvatarImage: 'IMAvatarImage',
    AvatarFallback: 'IMAvatarFallback',
    AvatarBadge: null,
    AvatarGroup: null,
    AvatarGroupCount: null,
  },
  badge: { Badge: 'IMBadge', badgeVariants: null },
  button: { Button: 'IMButton', buttonVariants: null },
  calendar: { Calendar: 'IMCalendar', CalendarProps: 'IMCalendarProps' },
  card: {
    Card: 'IMCard',
    CardHeader: 'IMCardHeader',
    CardTitle: 'IMCardTitle',
    CardDescription: 'IMCardDescription',
    CardAction: 'IMCardAction',
    CardContent: 'IMCardContent',
    CardFooter: 'IMCardFooter',
  },
  chart: {
    ChartConfig: 'IMChartConfig',
    ChartContainer: 'IMChartContainer',
    ChartTooltip: 'IMChartTooltip',
    ChartTooltipContent: 'IMChartTooltipContent',
    ChartLegend: 'IMChartLegend',
    ChartLegendContent: 'IMChartLegendContent',
    ChartStyle: null,
  },
  checkbox: { Checkbox: 'IMCheckbox' },
  'confirm-dialog': { ConfirmDialog: 'IMConfirmDialog', ConfirmDetail: 'IMConfirmDetail' },
  'date-picker': { DatePicker: 'IMDatePicker', DatePickerProps: 'IMDatePickerProps' },
  dialog: {
    Dialog: 'IMDialog',
    DialogTrigger: 'IMDialogTrigger',
    DialogContent: 'IMDialogContent',
    DialogHeader: 'IMDialogHeader',
    DialogTitle: 'IMDialogTitle',
    DialogDescription: 'IMDialogDescription',
    DialogClose: null,
    DialogFooter: null,
    DialogOverlay: null,
    DialogPortal: null,
  },
  'dropdown-menu': {
    DropdownMenu: 'IMDropdownMenu',
    DropdownMenuTrigger: 'IMDropdownMenuTrigger',
    DropdownMenuContent: 'IMDropdownMenuContent',
    DropdownMenuItem: 'IMDropdownMenuItem',
    DropdownMenuLabel: 'IMDropdownMenuLabel',
    DropdownMenuSeparator: 'IMDropdownMenuSeparator',
    DropdownMenuShortcut: 'IMDropdownMenuShortcut',
    DropdownMenuSub: 'IMDropdownMenuSub',
    DropdownMenuSubTrigger: 'IMDropdownMenuSubTrigger',
    DropdownMenuSubContent: 'IMDropdownMenuSubContent',
    DropdownMenuPortal: null,
    DropdownMenuGroup: null,
    DropdownMenuCheckboxItem: null,
    DropdownMenuRadioGroup: null,
    DropdownMenuRadioItem: null,
  },
  form: {
    Form: 'IMForm',
    FormField: 'IMFormField',
    FormItem: 'IMFormItem',
    FormLabel: 'IMFormLabel',
    FormControl: 'IMFormControl',
    FormDescription: 'IMFormDescription',
    FormMessage: 'IMFormMessage',
    useFormField: null,
  },
  'hour-picker': { HourPicker: 'IMHourPicker', HourPickerProps: 'IMHourPickerProps' },
  input: { Input: 'IMInput' },
  label: { Label: 'IMLabel' },
  pagination: {
    Pagination: 'IMPagination',
    PaginationProps: 'IMPaginationProps',
    PaginationItem: 'IMPaginationItem',
    getPaginationPages: 'imPaginationPages',
  },
  popover: {
    Popover: 'IMPopover',
    PopoverTrigger: 'IMPopoverTrigger',
    PopoverContent: 'IMPopoverContent',
    PopoverAnchor: null,
  },
  'responsive-dialog': {
    ResponsiveDialog: 'IMResponsiveDialog',
    DialogActions: 'IMDialogActions',
    DialogSize: 'IMDialogSize',
  },
  'search-input': {
    SearchInput: 'IMSearchInput',
    SearchInputProps: 'IMSearchInputProps',
    SearchInputSize: 'IMSearchInputSize',
    SearchInputVariant: 'IMSearchInputVariant',
    getSearchInputClasses: null,
  },
  select: {
    Select: 'IMSelect',
    SelectGroup: 'IMSelectGroup',
    SelectValue: 'IMSelectValue',
    SelectTrigger: 'IMSelectTrigger',
    SelectContent: 'IMSelectContent',
    SelectLabel: 'IMSelectLabel',
    SelectItem: 'IMSelectItem',
    SelectSeparator: 'IMSelectSeparator',
    SelectScrollUpButton: null,
    SelectScrollDownButton: null,
  },
  'select-input': { SelectInput: 'IMSelectInput' },
  sheet: {
    Sheet: 'IMSheet',
    SheetTrigger: 'IMSheetTrigger',
    SheetContent: 'IMSheetContent',
    SheetHeader: 'IMSheetHeader',
    SheetFooter: 'IMSheetFooter',
    SheetTitle: 'IMSheetTitle',
    SheetDescription: 'IMSheetDescription',
    SheetClose: null,
    SheetOverlay: null,
    SheetPortal: null,
  },
  skeleton: { Skeleton: 'IMSkeleton' },
  'status-label': { StatusLabel: 'IMStatusLabel', StatusRole: 'IMStatusRole' },
  switch: { Switch: 'IMSwitch' },
  tabs: { Tabs: 'IMTabs', TabsList: 'IMTabsList', TabsTrigger: 'IMTabsTrigger', TabsContent: 'IMTabsContent' },
  textarea: { Textarea: 'IMTextarea' },
  toast: { ToastProvider: 'IMToastProvider', useToast: 'useIMToast', ToastType: null, ToastItem: null },
}

/** Old file basename → new one. */
const MODULE_RENAMES: Record<string, string> = { ToastProvider: 'toast' }

/** Owned by other pillars: never renamed, never normalised here. */
const FOREIGN_MODULES = new Set(['icon', 'icon-legacy', 'icon-registry', 'typography', 'tones'])

type ValueMap = Record<string, string>
interface PropRename {
  /** The prop's new name, when it changed. */
  name?: string
  values?: ValueMap
}

/** Component (new name) → prop → rename. Follows the API pass; see docs/design-system/components.md. */
const PROP_RENAMES: Record<string, Record<string, PropRename>> = {
  IMButton: { variant: { values: { default: 'primary' } }, size: { values: { default: 'md' } } },
  IMBadge: { variant: { values: { default: 'wait' } } },
  IMSelectTrigger: { size: { values: { default: 'md' } } },
  IMSearchInput: {
    variant: { values: { card: 'default', muted: 'subtle' } },
    size: { values: { default: 'md', lg: 'md' } },
  },
  IMConfirmDialog: { tone: { name: 'variant', values: { default: 'primary' } } },
}

interface Edit {
  start: number
  end: number
  text: string
}

interface Report {
  changedFiles: string[]
  renames: number
  propEdits: number
  warnings: string[]
}

const UI_SPECIFIER = /^[@#]\/components\/ui\/([\w-]+?)(?:\.tsx?)?$/
const BARREL_SPECIFIER = /^[@#]\/components\/ui(?:\/index(?:\.ts)?)?$/

/** The ui/ module a specifier points at (alias or relative), or null when it's not ui/. */
function uiModuleOf(specifier: string, fromFile: string): string | null {
  const aliased = UI_SPECIFIER.exec(specifier)
  if (aliased?.[1]) return aliased[1]
  if (!specifier.startsWith('.')) return null
  const resolved = path.resolve(path.dirname(fromFile), specifier)
  if (path.dirname(resolved) !== UI_DIR) return null
  return path.basename(resolved).replace(/\.tsx?$/, '')
}

function loadProgram(): ts.Program {
  const configPath = path.join(ROOT, 'tsconfig.json')
  const { config, error } = ts.readConfigFile(configPath, ts.sys.readFile)
  if (error) throw new Error(ts.flattenDiagnosticMessageText(error.messageText, '\n'))
  const parsed = ts.parseJsonConfigFileContent(config, ts.sys, ROOT)
  return ts.createProgram({ rootNames: parsed.fileNames, options: parsed.options })
}

function inScope(fileName: string, filters: string[]): boolean {
  const rel = path.relative(ROOT, fileName)
  if (!/^(src|tests)\//.test(rel) || rel.startsWith('src/components/ui/')) return false
  return filters.length === 0 || filters.some((f) => rel.startsWith(path.relative(ROOT, path.resolve(ROOT, f))))
}

/** Every string literal in a value position of a prop expression; reports the rest. */
function literalBranches(expr: ts.Expression, out: ts.StringLiteralLike[]): boolean {
  if (ts.isStringLiteralLike(expr)) {
    out.push(expr)
    return true
  }
  if (ts.isParenthesizedExpression(expr) || ts.isAsExpression(expr) || ts.isSatisfiesExpression(expr)) {
    return literalBranches(expr.expression, out)
  }
  if (ts.isConditionalExpression(expr)) {
    const a = literalBranches(expr.whenTrue, out)
    const b = literalBranches(expr.whenFalse, out)
    return a && b
  }
  if (ts.isBinaryExpression(expr) && expr.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken) {
    const a = literalBranches(expr.left, out)
    const b = literalBranches(expr.right, out)
    return a && b
  }
  return false
}

function rewriteFile(sf: ts.SourceFile, checker: ts.TypeChecker, report: Report): Edit[] {
  const rel = path.relative(ROOT, sf.fileName)
  const edits: Edit[] = []
  /** local binding symbol → the export's new name */
  const renamedLocals = new Map<ts.Symbol, string>()
  /** local binding symbol → the component's new name (aliased or not), for prop renames */
  const componentOf = new Map<ts.Symbol, string>()
  const fileLocals = new Set<string>()
  sf.forEachChild(function collect(node) {
    if ((ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node) || ts.isVariableDeclaration(node)) && node.name && ts.isIdentifier(node.name)) {
      fileLocals.add(node.name.text)
    }
    node.forEachChild(collect)
  })

  for (const statement of sf.statements) {
    const isImport = ts.isImportDeclaration(statement)
    const isReExport = ts.isExportDeclaration(statement) && statement.moduleSpecifier !== undefined
    if (!isImport && !isReExport) continue
    const specNode = statement.moduleSpecifier
    if (!specNode || !ts.isStringLiteral(specNode)) continue
    const specifier = specNode.text

    if (BARREL_SPECIFIER.test(specifier)) {
      report.warnings.push(`${rel}: imports the deleted ui barrel '${specifier}' — import each name from its own file.`)
      continue
    }
    const module = uiModuleOf(specifier, sf.fileName)
    if (!module || FOREIGN_MODULES.has(module)) continue
    const targetModule = MODULE_RENAMES[module] ?? module
    // A module with no entry (chip, field…) was born IM-only: nothing to rename, but non-IM names are reported.
    const renames = RENAMES[targetModule] ?? {}

    const normalised = `@/components/ui/${targetModule}`
    if (specifier !== normalised) {
      edits.push({ start: specNode.getStart(sf) + 1, end: specNode.getEnd() - 1, text: normalised })
    }

    if (isImport) {
      const clause = statement.importClause
      if (clause?.name) report.warnings.push(`${rel}: default import from '${specifier}' — ui/ has named exports only.`)
      if (clause?.namedBindings && ts.isNamespaceImport(clause.namedBindings)) {
        report.warnings.push(`${rel}: namespace import from '${specifier}' — rename its member accesses by hand.`)
      }
    }
    const elements = isImport
      ? statement.importClause?.namedBindings && ts.isNamedImports(statement.importClause.namedBindings)
        ? statement.importClause.namedBindings.elements
        : []
      : statement.exportClause && ts.isNamedExports(statement.exportClause)
        ? statement.exportClause.elements
        : []

    const importedHere = new Set(elements.map((el) => (el.propertyName ?? el.name).text))
    for (const element of elements) {
      const imported = (element.propertyName ?? element.name).text
      if (!(imported in renames)) {
        if (!/^(IM|im|useIM)/.test(imported)) {
          report.warnings.push(`${rel}: '${imported}' is not a known export of ui/${targetModule}.`)
        }
        if (isImport && /^IM[A-Z]/.test(imported)) {
          const local = checker.getSymbolAtLocation(element.name)
          if (local) componentOf.set(local, imported)
        }
        continue
      }
      const next = renames[imported]
      if (next === null || next === undefined) {
        report.warnings.push(`${rel}: '${imported}' was removed from ui/${targetModule} (no replacement) — rewrite this use by hand.`)
        continue
      }
      if (importedHere.has(next)) {
        report.warnings.push(`${rel}: imports both '${imported}' and '${next}' from ui/${targetModule} — merge them by hand.`)
        continue
      }
      report.renames++
      const local = isImport ? checker.getSymbolAtLocation(element.name) : undefined
      if (element.propertyName || !isImport) {
        // `{ Button as Btn }` keeps its local name; a re-export keeps the name it exports.
        const target = element.propertyName ?? element.name
        const text = element.propertyName ? next : `${next} as ${imported}`
        edits.push({ start: target.getStart(sf), end: target.getEnd(), text })
        if (local) componentOf.set(local, next)
        continue
      }
      if (fileLocals.has(next)) {
        report.warnings.push(`${rel}: '${next}' is already declared in this file — rename '${imported}' by hand.`)
        continue
      }
      edits.push({ start: element.name.getStart(sf), end: element.name.getEnd(), text: next })
      if (local) {
        renamedLocals.set(local, next)
        componentOf.set(local, next)
      }
    }
  }

  if (componentOf.size === 0) return edits

  const visit = (node: ts.Node): void => {
    if (ts.isIdentifier(node) && renamedLocals.size > 0 && !ts.isImportSpecifier(node.parent)) {
      const parent = node.parent
      if (ts.isShorthandPropertyAssignment(parent) && parent.name === node) {
        const symbol = checker.getShorthandAssignmentValueSymbol(parent)
        const next = symbol && renamedLocals.get(symbol)
        if (next) edits.push({ start: node.getStart(sf), end: node.getEnd(), text: `${node.text}: ${next}` })
      } else if (ts.isExportSpecifier(parent) && !parent.propertyName) {
        const symbol = checker.getExportSpecifierLocalTargetSymbol(parent)
        const next = symbol && renamedLocals.get(symbol)
        if (next) edits.push({ start: node.getStart(sf), end: node.getEnd(), text: `${next} as ${node.text}` })
      } else {
        const symbol = checker.getSymbolAtLocation(node)
        const next = symbol && renamedLocals.get(symbol)
        if (next) edits.push({ start: node.getStart(sf), end: node.getEnd(), text: next })
      }
    }
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) propEdits(node)
    node.forEachChild(visit)
  }

  const propEdits = (node: ts.JsxOpeningElement | ts.JsxSelfClosingElement) => {
    const symbol = ts.isIdentifier(node.tagName) ? checker.getSymbolAtLocation(node.tagName) : undefined
    const component = symbol && componentOf.get(symbol)
    const rules = component && PROP_RENAMES[component]
    if (!rules) return
    for (const attr of node.attributes.properties) {
      if (!ts.isJsxAttribute(attr) || !ts.isIdentifier(attr.name)) continue
      const rule = rules[attr.name.text]
      if (!rule) continue
      if (rule.name) {
        edits.push({ start: attr.name.getStart(sf), end: attr.name.getEnd(), text: rule.name })
        report.propEdits++
      }
      if (!rule.values || !attr.initializer) continue
      const literals: ts.StringLiteralLike[] = []
      const init = attr.initializer
      const expr = ts.isStringLiteral(init) ? init : ts.isJsxExpression(init) ? init.expression : undefined
      const complete = expr ? literalBranches(expr, literals) : false
      for (const literal of literals) {
        const next = rule.values[literal.text]
        if (next === undefined) continue
        const raw = literal.getText(sf)
        edits.push({ start: literal.getStart(sf), end: literal.getEnd(), text: `${raw[0]}${next}${raw[raw.length - 1]}` })
        report.propEdits++
      }
      if (!complete) {
        const { line } = sf.getLineAndCharacterOfPosition(attr.getStart(sf))
        report.warnings.push(`${rel}:${line + 1}: <${component} ${attr.name.text}={…}> is computed — check it against: ${JSON.stringify(rule.values)}.`)
      }
    }
  }

  sf.forEachChild(visit)
  return edits
}

function applyEdits(text: string, edits: Edit[]): string {
  const sorted = [...edits].sort((a, b) => b.start - a.start)
  let out = text
  let lastStart = Number.POSITIVE_INFINITY
  for (const edit of sorted) {
    if (edit.end > lastStart) throw new Error(`overlapping edits at ${edit.start}`)
    out = out.slice(0, edit.start) + edit.text + out.slice(edit.end)
    lastStart = edit.start
  }
  return out
}

export async function run(args: string[]): Promise<void> {
  const dry = args.includes('--dry')
  const filters = args.filter((a) => !a.startsWith('--'))
  const program = loadProgram()
  const checker = program.getTypeChecker()
  const report: Report = { changedFiles: [], renames: 0, propEdits: 0, warnings: [] }

  for (const sf of program.getSourceFiles()) {
    if (sf.isDeclarationFile || !inScope(sf.fileName, filters)) continue
    const edits = rewriteFile(sf, checker, report)
    if (edits.length === 0) continue
    const next = applyEdits(sf.text, edits)
    if (next === sf.text) continue
    report.changedFiles.push(path.relative(ROOT, sf.fileName))
    if (!dry) writeFileSync(sf.fileName, next)
  }

  console.log(`${dry ? '[dry run] ' : ''}${report.changedFiles.length} files, ${report.renames} import renames, ${report.propEdits} prop edits.`)
  for (const file of report.changedFiles) console.log(`  ${file}`)
  if (report.warnings.length) {
    console.log(`\n${report.warnings.length} to check by hand:`)
    for (const w of report.warnings) console.log(`  ${w}`)
  }
}
