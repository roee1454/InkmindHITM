/**
 * Moves every toast call from the positional API to the spec's options object:
 *
 *   toast('הפרטים נשמרו', '', 'success')            →  toast({ tone: 'success', title: 'הפרטים נשמרו' })
 *   toast('שגיאה', err.message, 'error', 8000, go)    →  toast({ tone: 'destructive', title: 'שגיאה', description: err.message, duration: 8000, onClick: go })
 *   const { toast } = useIMToast()                    →  const { show: toast } = useIMToast()
 *
 *   pnpm ds:codemod toast-api              rewrite src/ and tests/ in place
 *   pnpm ds:codemod toast-api --dry        report what would change, write nothing
 *
 * A call is a toast call when its resolved signature is the positional `toast` declared in
 * src/components/ui/toast.tsx (TypeScript compiler API), so `toastRef.current(…)` is found too and
 * an unrelated `toast()` is not. Type → tone: info → (default, omitted), success → success,
 * error → destructive, warning → warning. An empty message is dropped. Run it before toast.tsx
 * switches to the options API: afterwards no positional signature is left to find, so a second run
 * is a no-op. Anything it can't rewrite safely (a computed type, a spread argument) is reported.
 */
import path from 'node:path'
import { writeFileSync } from 'node:fs'
import ts from 'typescript'

const ROOT = path.resolve(import.meta.dirname, '../../..')
const TOAST_FILE = path.join(ROOT, 'src/components/ui/toast.tsx')

const TONES: Record<string, string | null> = { info: null, success: 'success', error: 'destructive', warning: 'warning' }

interface Edit {
  start: number
  end: number
  text: string
}

function loadProgram(): ts.Program {
  const configPath = path.join(ROOT, 'tsconfig.json')
  const { config, error } = ts.readConfigFile(configPath, ts.sys.readFile)
  if (error) throw new Error(ts.flattenDiagnosticMessageText(error.messageText, '\n'))
  const parsed = ts.parseJsonConfigFileContent(config, ts.sys, ROOT)
  return ts.createProgram({ rootNames: parsed.fileNames, options: parsed.options })
}

function inScope(fileName: string): boolean {
  const rel = path.relative(ROOT, fileName)
  return /^(src|tests)\//.test(rel) && !rel.startsWith('src/components/ui/')
}

/** The positional toast signature: `(title, message, type?, duration?, onClick?) => void` in toast.tsx. */
function isPositionalToast(call: ts.CallExpression, checker: ts.TypeChecker): boolean {
  const declaration = checker.getResolvedSignature(call)?.declaration
  if (!declaration || path.resolve(declaration.getSourceFile().fileName) !== TOAST_FILE) return false
  if (!ts.isFunctionTypeNode(declaration) && !ts.isFunctionLike(declaration)) return false
  const [first, second] = declaration.parameters
  return first?.name.getText() === 'title' && second?.name.getText() === 'message'
}

/** `tone: …` for the type argument, or null to omit it; undefined when it can't be mapped. */
function toneOf(expr: ts.Expression, sf: ts.SourceFile): string | null | undefined {
  if (ts.isStringLiteralLike(expr)) {
    const tone = TONES[expr.text]
    return tone === undefined ? undefined : tone && `'${tone}'`
  }
  if (expr.kind === ts.SyntaxKind.UndefinedKeyword || (ts.isIdentifier(expr) && expr.text === 'undefined')) return null
  if (ts.isParenthesizedExpression(expr)) return toneOf(expr.expression, sf)
  if (ts.isConditionalExpression(expr)) {
    // Inside a branch `info` can't be omitted: it becomes the explicit `default`.
    const branch = (b: ts.Expression) => {
      const t = toneOf(b, sf)
      return t === null ? `'default'` : t
    }
    const whenTrue = branch(expr.whenTrue)
    const whenFalse = branch(expr.whenFalse)
    if (whenTrue === undefined || whenFalse === undefined) return undefined
    return `${expr.condition.getText(sf)} ? ${whenTrue} : ${whenFalse}`
  }
  return undefined
}

const isOmitted = (expr: ts.Expression | undefined) =>
  !expr || (ts.isIdentifier(expr) && expr.text === 'undefined')

function indentAt(sf: ts.SourceFile, pos: number): string {
  const lineStart = sf.getPositionOfLineAndCharacter(sf.getLineAndCharacterOfPosition(pos).line, 0)
  return /^\s*/.exec(sf.text.slice(lineStart))?.[0] ?? ''
}

function rewriteCall(call: ts.CallExpression, sf: ts.SourceFile, warnings: string[]): Edit | null {
  const rel = path.relative(ROOT, sf.fileName)
  const where = `${rel}:${sf.getLineAndCharacterOfPosition(call.getStart(sf)).line + 1}`
  const [title, message, type, duration, onClick] = call.arguments
  if (call.arguments.some(ts.isSpreadElement) || !title) {
    warnings.push(`${where}: spread or missing arguments — rewrite by hand.`)
    return null
  }

  const fields: [string, string][] = []
  if (type && !isOmitted(type)) {
    const tone = toneOf(type, sf)
    if (tone === undefined) {
      warnings.push(`${where}: computed type '${type.getText(sf)}' — map it to a tone by hand.`)
      return null
    }
    if (tone !== null) fields.push(['tone', tone])
  }
  fields.push(['title', title.getText(sf)])
  const emptyMessage = message && ts.isStringLiteralLike(message) && message.text === ''
  if (message && !emptyMessage && !isOmitted(message)) fields.push(['description', message.getText(sf)])
  if (!isOmitted(duration)) fields.push(['duration', duration!.getText(sf)])
  if (!isOmitted(onClick)) fields.push(['onClick', onClick!.getText(sf)])

  const entry = ([key, value]: [string, string]) => (value === key ? key : `${key}: ${value}`)
  const open = call.arguments.pos
  const close = call.end - 1
  const multiline = sf.text.slice(open, close).includes('\n')
  if (!multiline) {
    return { start: open, end: close, text: `{ ${fields.map(entry).join(', ')} }` }
  }
  const inner = indentAt(sf, title.getStart(sf))
  const outer = indentAt(sf, close)
  return { start: open, end: close, text: `{\n${fields.map((f) => `${inner}${entry(f)},\n`).join('')}${outer}}` }
}

/** `const { toast } = useIMToast()` → `const { show: toast } = useIMToast()`. */
function rewriteBinding(node: ts.BindingElement, checker: ts.TypeChecker, sf: ts.SourceFile): Edit | null {
  const pattern = node.parent
  const declaration = pattern.parent
  if (!ts.isVariableDeclaration(declaration) || !declaration.initializer || !ts.isCallExpression(declaration.initializer)) return null
  const callee = checker.getSymbolAtLocation(declaration.initializer.expression)
  const target = callee && callee.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(callee) : callee
  const file = target?.declarations?.[0]?.getSourceFile().fileName
  if (target?.name !== 'useIMToast' || !file || path.resolve(file) !== TOAST_FILE) return null
  const key = node.propertyName ?? node.name
  if (!ts.isIdentifier(key) || key.text !== 'toast') return null
  return node.propertyName
    ? { start: key.getStart(sf), end: key.getEnd(), text: 'show' }
    : { start: key.getStart(sf), end: key.getEnd(), text: 'show: toast' }
}

export async function run(args: string[]): Promise<void> {
  const dry = args.includes('--dry')
  const program = loadProgram()
  const checker = program.getTypeChecker()
  const changed: string[] = []
  const warnings: string[] = []
  let calls = 0

  for (const sf of program.getSourceFiles()) {
    if (sf.isDeclarationFile || !inScope(sf.fileName)) continue
    const edits: Edit[] = []
    const visit = (node: ts.Node): void => {
      if (ts.isCallExpression(node) && isPositionalToast(node, checker)) {
        const edit = rewriteCall(node, sf, warnings)
        if (edit) {
          edits.push(edit)
          calls++
        }
        // Arguments can't hold another toast call worth rewriting in the same pass.
        return
      }
      if (ts.isBindingElement(node)) {
        const edit = rewriteBinding(node, checker, sf)
        if (edit) edits.push(edit)
      }
      node.forEachChild(visit)
    }
    sf.forEachChild(visit)
    if (edits.length === 0) continue

    let text = sf.text
    for (const edit of [...edits].sort((a, b) => b.start - a.start)) {
      text = text.slice(0, edit.start) + edit.text + text.slice(edit.end)
    }
    changed.push(path.relative(ROOT, sf.fileName))
    if (!dry) writeFileSync(sf.fileName, text)
  }

  console.log(`${dry ? '[dry run] ' : ''}${changed.length} files, ${calls} toast calls rewritten.`)
  for (const file of changed) console.log(`  ${file}`)
  if (warnings.length) {
    console.log(`\n${warnings.length} to rewrite by hand:`)
    for (const w of warnings) console.log(`  ${w}`)
  }
}
