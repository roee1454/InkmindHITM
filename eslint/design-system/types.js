/**
 * The shape every design-system rule file exports. `eslint.config.js` merges all of them into
 * one `no-restricted-syntax` and one `no-restricted-imports` (ESLint keeps only the last config
 * of a rule, so pillars can't each configure their own).
 *
 * @typedef {{ selector: string, message: string }} SyntaxRule
 * @typedef {{ name: string, importNames?: string[], message: string }} ImportPath
 * @typedef {{ group: string[], importNames?: string[], message: string }} ImportPattern
 * @typedef {{
 *   exempt: string[],
 *   syntax: SyntaxRule[],
 *   imports: { paths: ImportPath[], patterns: ImportPattern[] },
 * }} DesignSystemRules
 */
export {}
