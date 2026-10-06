import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { IMField } from '@/components/ui/field'
import { IMInput } from '@/components/ui/input'

const attr = (html: string, tag: string, name: string) =>
  new RegExp(`<${tag}[^>]*\\s${name}="([^"]*)"`).exec(html)?.[1]

describe('IMField', () => {
  it('points the label at the control', () => {
    const html = renderToStaticMarkup(
      <IMField label="מספר טלפון">
        <IMInput dir="ltr" />
      </IMField>,
    )
    const id = attr(html, 'input', 'id')
    expect(id).toBeTruthy()
    expect(attr(html, 'label', 'for')).toBe(id)
    expect(attr(html, 'input', 'aria-describedby')).toBeUndefined()
  })

  it('uses a given id', () => {
    const html = renderToStaticMarkup(
      <IMField label="אימייל" id="staff-email">
        <IMInput />
      </IMField>,
    )
    expect(attr(html, 'input', 'id')).toBe('staff-email')
    expect(attr(html, 'label', 'for')).toBe('staff-email')
  })

  it('describes the control with the help line', () => {
    const html = renderToStaticMarkup(
      <IMField label="מקדמה" id="deposit" help="נגבית לפני שריון התור.">
        <IMInput />
      </IMField>,
    )
    expect(attr(html, 'input', 'aria-describedby')).toBe('deposit-help')
    expect(html).toContain('id="deposit-help"')
    expect(attr(html, 'input', 'aria-invalid')).toBeUndefined()
  })

  it('an error replaces the help, marks the control invalid and describes it', () => {
    const html = renderToStaticMarkup(
      <IMField label="מקדמה" id="deposit" help="נגבית לפני שריון התור." error="המחיר צריך להיות מספר חיובי.">
        <IMInput />
      </IMField>,
    )
    expect(attr(html, 'input', 'aria-invalid')).toBe('true')
    expect(attr(html, 'input', 'aria-describedby')).toBe('deposit-error')
    expect(html).toContain('id="deposit-error"')
    expect(html).not.toContain('id="deposit-help"')
    expect(html).toContain('data-invalid="true"')
  })

  it('an empty error string is no error', () => {
    const html = renderToStaticMarkup(
      <IMField label="שם" id="name" error="">
        <IMInput />
      </IMField>,
    )
    expect(attr(html, 'input', 'aria-invalid')).toBeUndefined()
    expect(html).not.toContain('id="name-error"')
  })

  it('a required field marks the label and sets aria-required on the control', () => {
    const html = renderToStaticMarkup(
      <IMField label="שם" required>
        <IMInput />
      </IMField>,
    )
    expect(attr(html, 'input', 'aria-required')).toBe('true')
    expect(html).toMatch(/<span aria-hidden="true"[^>]*>\*<\/span>/)
  })
})
