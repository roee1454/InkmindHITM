/**
 * The shape every design-system rule file exports. `eslint.config.js` merges all of them into
 * one `no-restricted-syntax` and one `no-restricted-imports` (ESLint keeps only the last config
 * of a rule, so pillars can't each configure their own).
 *
 * `outsideUi: true` keeps a rule out of src/components/ui/, where the primitives are built from
 * the raw elements the rule bans everywhere else (a raw <button>, a radix-ui import).
 * `exempt` files skip every design-system rule — keep that list short and commented.
 *
 * @typedef {{ selector: string, message: string, outsideUi?: boolean }} SyntaxRule
 * @typedef {{ name: string, importNames?: string[], message: string, outsideUi?: boolean }} ImportPath
 * @typedef {{ group: string[], importNames?: string[], message: string, outsideUi?: boolean }} ImportPattern
 * @typedef {{
 *   exempt: string[],
 *   syntax: SyntaxRule[],
 *   imports: { paths: ImportPath[], patterns: ImportPattern[] },
 * }} DesignSystemRules
 */
export {}
