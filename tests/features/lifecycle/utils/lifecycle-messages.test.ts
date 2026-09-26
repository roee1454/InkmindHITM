import { describe, expect, it } from 'vitest'
import { consultationFollowupMessage, healingCheckMessage, npsRequestMessage, reviewRequestMessage } from '@/features/lifecycle/utils/lifecycle-messages'

describe('lifecycle messages and their templates', () => {
  it('checks the healing, and between sessions invites the next one, with its own template', () => {
    const plain = healingCheckMessage({ name: 'דנה', inviteNextSession: false })
    expect(plain.body).toContain('איך הקעקוע החלים?')
    expect(plain.templateName).toBe('healing_check')
    const invite = healingCheckMessage({ name: 'דנה', inviteNextSession: true })
    expect(invite.body).toContain('נשמח לקבוע את הסשן הבא')
    expect(invite.templateName).toBe('healing_check_next_session')
    expect(invite.templateComponents).toEqual([{ type: 'body', parameters: [{ type: 'text', text: 'דנה' }] }])
  })

  it('asks for reviews with the links from the settings, not hard-coded ones', () => {
    const message = reviewRequestMessage({ name: 'דנה', studioName: 'אינק מיינד', googleReviewLink: 'https://g.page/x', easyReviewLink: null })
    expect(message.body).toContain('תודה רבה שבחרת באינק מיינד!')
    expect(message.body).toContain('https://g.page/x')
    expect(message.body).not.toContain('easy.co.il')
    expect(message.templateComponents[0]?.parameters).toEqual([{ type: 'text', text: 'דנה' }, { type: 'text', text: 'https://g.page/x' }])
  })

  it('asks for a 1–10 score in plain words', () => {
    const message = npsRequestMessage({ name: null, studioName: 'אינק מיינד' })
    expect(message.body).toContain('בסולם 1 עד 10')
    expect(message.templateComponents[0]?.parameters).toEqual([{ type: 'text', text: 'לקוח/ה יקר/ה' }])
  })

  it('follows up after a consultation, naming the artist when known', () => {
    expect(consultationFollowupMessage({ name: 'דנה', artistName: 'נועה' }).body).toContain('איך היה בפגישת הייעוץ עם נועה?')
    expect(consultationFollowupMessage({ name: 'דנה', artistName: null }).templateName).toBe('consultation_followup')
  })
})
