/**
 * Design-system codemods: `pnpm ds:codemod <name> [args…]` runs scripts/ds/codemods/<name>.ts,
 * which exports `run(args: string[]): Promise<void>`. Each codemod documents its own args.
 */
export {}

const [name, ...args] = process.argv.slice(2)
if (!name || !/^[a-z0-9-]+$/.test(name)) {
  console.error('usage: pnpm ds:codemod <name> [args…]')
  process.exit(2)
}
const codemod = (await import(`./${name}.ts`)) as { run: (args: string[]) => Promise<void> }
await codemod.run(args)
