export interface DetectedStyle {
  key: string
  label: string
}

export const KNOWN_STYLES: Array<{ key: string; label: string; regex: RegExp }> = [
  {
    key: 'sketch',
    label: 'פגישת סקיצה וייעוץ',
    regex: /סקיצה|ייעוץ|sketch|consultation|בניית.?סקיצה/i,
  },
  {
    key: 'cover_up',
    label: 'קאבר-אפ (כיסוי)',
    regex: /קאבר|cover.?up|כיסוי|לכסות/i,
  },
  {
    key: 'lettering',
    label: 'כיתוב / אותיות / פונט',
    regex: /כיתוב|אותיות|פונט|lettering|quote|משפט|תאריך|ציטוט|script/i,
  },
  {
    key: 'anime',
    label: 'אנימה / מנגה',
    regex: /אנימה|מנגה|anime|manga|נארוטו|גוקו|דרגון.?בול/i,
  },
  {
    key: 'realism',
    label: 'ריאליזם / מיקרו-ריאליזם',
    regex: /ריאליזם|ריאליסטי|מיקרו.?ריאליזם|realism|realistic|פורטרט|portrait/i,
  },
  {
    key: 'fine_line',
    label: 'קו דק / מינימליסטי',
    regex: /קו.?דק|fine.?line|מינימליסט|minimalist|מיקרו.?קעקוע/i,
  },
  {
    key: 'traditional',
    label: 'טרדישיונל / אולד סקול',
    regex: /טרדישיונל|traditional|אולד.?סקול|old.?school|ניאו.?טרדישיונל|neo.?traditional/i,
  },
  {
    key: 'blackwork',
    label: 'בלאקוורק / שבטי',
    regex: /בלאקוורק|blackwork|שבטי|tribal|דארק|black.?and.?grey/i,
  },
  {
    key: 'geometric',
    label: 'גיאומטרי / מנדלה',
    regex: /גיאומטרי|geometric|מנדלה|mandala|פאטרן|קווים/i,
  },
  {
    key: 'color',
    label: 'צבעוני / צבעי מים',
    regex: /צבעוני|צבע|watercolor|color|צבעי.?מים/i,
  },
]

/**
 * Classifies tattoo text / description into a standardized style category.
 */
export function detectTattooStyle(description?: string | null): DetectedStyle {
  if (!description || !description.trim()) {
    return { key: 'other', label: 'כללי / שונות' }
  }

  const clean = description.trim()
  for (const style of KNOWN_STYLES) {
    if (style.regex.test(clean)) {
      return { key: style.key, label: style.label }
    }
  }

  return { key: 'other', label: 'כללי / שונות' }
}

