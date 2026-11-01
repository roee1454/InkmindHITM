// Design system — typography pillar (docs/design-system/typography.md). Text is set through the
// roles in src/components/ui/typography.tsx (IMHeading / IMText and their shortcuts), never sized,
// weighted or styled by hand. Every message starts with `[ds:typography]` so `pnpm ds:audit` can
// count it.
//
// Class strings are matched as string literals and template-literal chunks anywhere in a file,
// like colors.js does: inside `className="…"`, `cn(…)` and lookup maps alike.

/** A class token (with any `hover:` / `lg:` / `data-[…]:` variant and `!` important marker). */
const token = (body) => `(?:^|[\\s:!])(?:${body})!?(?=\\s|$)`
/** Attribute values that are names, not classes (`data-slot="form-label"`, `id`, `aria-*`). */
const NOT_A_CLASS =
  ':not(JSXAttribute[name.name=/^(?:data-|aria-|id$|htmlFor$|name$|role$|type$)/] > Literal)'
/** Matches a class token in a string literal or a template-literal chunk. */
const classLiteral = (body) =>
  `:matches(Literal[value=/${token(body)}/]${NOT_A_CLASS}, TemplateElement[value.raw=/${token(body)}/])`

/** A size step, with or without a `/leading` modifier (`text-sm/6`). */
const SIZES = 'text-(?:2xs|xs|sm|base|lg|xl|[2-9]xl)(?:\\/\\S+)?'
const WEIGHTS =
  'font-(?:thin|extralight|light|normal|medium|semibold|bold|extrabold|black)'

/** @type {import('./types.js').DesignSystemRules} */
export default {
  exempt: [],
  syntax: [
    {
      // Interim alias, plan item 3.2. ui/ already has no uses, so this applies everywhere.
      selector: classLiteral('font-assistant'),
      message:
        '[ds:typography] font-assistant is a legacy alias of the body font (it never rendered Assistant). Delete it: text inherits Open Sans from <body>, and the Assistant roles are IMDisplay / IMHeadline.',
    },
    {
      selector: classLiteral('font-(?:display|body)'),
      message:
        '[ds:typography] Font families are set by the text roles only. Use IMDisplay / IMHeadline for Assistant; everything else inherits Open Sans.',
      outsideUi: true,
    },
    {
      selector: 'JSXOpeningElement[name.name=/^h[1-6]$/]',
      message:
        '[ds:typography] Raw <h1>–<h6>. Use IMHeadline / IMTitle / IMSubtitle / IMDisplay (or IMHeading variant=…), with `as` for the outline level.',
      outsideUi: true,
    },
    {
      // Decided in docs/design-system/typography.md ("Lint"): an error, not an audit-only count.
      selector: `JSXOpeningElement[name.name=/^(?:p|span)$/] > JSXAttribute[name.name="className"] ${classLiteral(`${SIZES}|${WEIGHTS}`)}`,
      message:
        '[ds:typography] <p>/<span> sized or weighted by class. Use a text role (IMText variant=…, IMCaption, IMSubtitle…) per the migration table in docs/design-system/typography.md; inline emphasis is <strong>.',
      outsideUi: true,
    },
    {
      selector: classLiteral('text-(?:micro|mini)'),
      message:
        '[ds:typography] text-micro / text-mini are interim aliases (plan Phase 3). Use the role: IMText variant="micro" for text-micro, IMCaption for text-mini.',
    },
    {
      selector: classLiteral(
        'auth-title|auth-sub|step-question|step-hint|form-label',
      ),
      message:
        '[ds:typography] Legacy text class from styles.css. auth-title → IMHeadline, step-question → IMDisplay, auth-sub / step-hint → IMText tone="muted", form-label → IMLabel.',
    },
    {
      selector: classLiteral('uppercase|lowercase|capitalize'),
      message:
        '[ds:typography] Hebrew has no letter case. Drop uppercase / lowercase / capitalize.',
    },
    {
      selector: classLiteral('tracking-\\S+'),
      message:
        '[ds:typography] No letter-spacing (tracking-*): it breaks Hebrew letterforms. The text roles set none.',
    },
    {
      selector: classLiteral('text-(?:left|right)'),
      message:
        '[ds:typography] text-left / text-right are physical. Use text-start / text-end (RTL-first).',
    },
  ],
  imports: { paths: [], patterns: [] },
}
