import { describe, it, expect } from 'vitest'
import { detectTattooStyle } from '@/features/analytics/utils/styles'

describe('detectTattooStyle', () => {
  it('detects realism and micro-realism', () => {
    expect(detectTattooStyle('קעקוע אריה מיקרו-ריאליזם על האמה').key).toBe('realism')
    expect(detectTattooStyle('פורטרט ריאליסטי של סבא').key).toBe('realism')
    expect(detectTattooStyle('black and grey realistic lion').key).toBe('realism')
  })

  it('detects fine line / minimalist tattoos', () => {
    expect(detectTattooStyle('קעקוע קו דק פרפר קטן').key).toBe('fine_line')
    expect(detectTattooStyle('מינימליסטי עדין מאחורי האוזן').key).toBe('fine_line')
    expect(detectTattooStyle('fine line flower').key).toBe('fine_line')
  })

  it('detects traditional and old school tattoos', () => {
    expect(detectTattooStyle('סנונית אולד סקול צבעונית').key).toBe('traditional')
    expect(detectTattooStyle('ורד טרדישיונל').key).toBe('traditional')
    expect(detectTattooStyle('neo traditional dagger').key).toBe('traditional')
  })

  it('detects lettering / typography', () => {
    expect(detectTattooStyle('משפט בכיתוב עדין בצלעות').key).toBe('lettering')
    expect(detectTattooStyle('תאריך לידה אותיות רומיות').key).toBe('lettering')
    expect(detectTattooStyle('script quote on collarbone').key).toBe('lettering')
  })

  it('detects anime / manga', () => {
    expect(detectTattooStyle('קעקוע אנימה נארוטו').key).toBe('anime')
    expect(detectTattooStyle('manga panel goku').key).toBe('anime')
  })

  it('detects cover-ups', () => {
    expect(detectTattooStyle('קאבר אפ על קעקוע ישן').key).toBe('cover_up')
    expect(detectTattooStyle('כיסוי צלקת ביד').key).toBe('cover_up')
  })

  it('detects sketch / consultation appointments', () => {
    expect(detectTattooStyle('פגישת סקיצה וייעוץ לקראת שרוול').key).toBe('sketch')
    expect(detectTattooStyle('בניית סקיצה מותאמת אישית').key).toBe('sketch')
  })

  it('falls back to other for generic or empty descriptions', () => {
    expect(detectTattooStyle('משהו יפה').key).toBe('other')
    expect(detectTattooStyle('').key).toBe('other')
    expect(detectTattooStyle(null).key).toBe('other')
  })
})

