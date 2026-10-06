// Design system — components pillar. Owned by the Phase 1 "components" agent (docs/im-design-system/plan.md).
// Every message starts with `[ds:components]` so `pnpm ds:audit` can count it.
// The primitives, and which one to pick: docs/design-system/components.md.

// Every module form that names a source: static and dynamic imports, re-exports.
const SOURCE = ':matches(ImportDeclaration, ImportExpression, ExportNamedDeclaration, ExportAllDeclaration)'

// The component classes in src/styles.css that IM* primitives replace. They still have live callers
// (Phase 2 migrates them, Phase 3 deletes the classes), so this rule is what the audit counts.
const SUPERSEDED_CLASSES = '(?:btn-native|btn-native-ghost|card-native|row-native|field-native|pill|tap-target|avatar-native)'
const SUPERSEDED_MESSAGE =
  '[ds:components] Superseded component class. btn-native/btn-native-ghost/tap-target → IMButton (lg / secondary / size="icon"), card-native → IMCard, row-native → IMListRow, field-native → IMInput / IMField, pill → IMBadge or IMChip, avatar-native → IMAvatar.'

/** @type {import('./types.js').DesignSystemRules} */
export default {
  exempt: [],
  syntax: [
    {
      selector: "JSXOpeningElement[name.name='button']",
      message:
        '[ds:components] Raw <button>. Use IMButton (icon-only: size="icon" or "icon-sm" with an aria-label), IMChip for a toggleable option, or IMListRow asChild for a pressable row.',
      outsideUi: true,
    },
    {
      // A hidden file picker has no look of its own — its visible trigger is an IMButton.
      selector: "JSXOpeningElement[name.name='input']:not(:has(JSXAttribute[name.name='type'][value.value='file']))",
      message: '[ds:components] Raw <input>. Use IMInput (with IMField for label + help/error), IMSearchInput, IMCheckbox or IMSwitch.',
      outsideUi: true,
    },
    {
      selector: "JSXOpeningElement[name.name='select']",
      message: '[ds:components] Raw <select>. Use IMSelect; IMSelectInput only for long numeric ranges on phones.',
      outsideUi: true,
    },
    {
      selector: "JSXOpeningElement[name.name='textarea']",
      message: '[ds:components] Raw <textarea>. Use IMTextarea (with IMField for label + help/error).',
      outsideUi: true,
    },
    // Import convention: one file per primitive, `@/components/ui/<file>`.
    {
      selector: `${SOURCE}[source.value=/^[@#]\\/components\\/ui(?:\\/index(?:\\.tsx?)?)?$/]`,
      message: '[ds:components] There is no ui barrel. Import each primitive from its own file: `@/components/ui/<file>`.',
    },
    {
      selector: `${SOURCE}[source.value=/^#\\/components\\/ui\\//]`,
      message: '[ds:components] Import ui primitives as `@/components/ui/<file>`, not through `#/`.',
    },
    {
      selector: `${SOURCE}[source.value=/^@\\/components\\/ui\\/.+\\.tsx?$/]`,
      message: '[ds:components] Drop the extension: `@/components/ui/<file>`.',
    },
    {
      selector: `Literal[value=/(?:^|\\s)${SUPERSEDED_CLASSES}(?=\\s|$)/]`,
      message: SUPERSEDED_MESSAGE,
    },
    {
      selector: `TemplateElement[value.raw=/(?:^|\\s)${SUPERSEDED_CLASSES}(?=\\s|$)/]`,
      message: SUPERSEDED_MESSAGE,
    },
    // Import bans as syntax rules, so they also catch dynamic imports and re-exports.
    {
      selector: `${SOURCE}[source.value=/^(?:radix-ui|@radix-ui\\/)/]`,
      message: '[ds:components] Radix is wrapped in src/components/ui. Use the IM* primitive; if none fits, report it as a gap.',
      outsideUi: true,
    },
    {
      selector: `${SOURCE}[source.value=/^[@#]\\/components\\/ui\\/dialog(?:\\.tsx)?$/]`,
      message:
        '[ds:components] IMDialog is the primitive behind the dialogs. Features use IMResponsiveDialog (a sheet on phones) or IMConfirmDialog.',
      outsideUi: true,
    },
  ],
  imports: { paths: [], patterns: [] },
}
