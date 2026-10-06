/// <reference path="../pb_data/types.d.ts" />

routerAdd("POST", "/api/inkmind/send-invite-email", (e) => {
  let data = {}
  try {
    const reqInfo = e.requestInfo()
    data = reqInfo?.body || {}
  } catch (err) {
    try {
      const parsed = new DynamicModel({ to: "", name: "", inviteUrl: "" })
      e.bindBody(parsed)
      data = parsed
    } catch (_) {}
  }

  if (typeof data === "string") {
    try {
      data = JSON.parse(data)
    } catch (_) {}
  }

  if (!data || !data.to || !data.inviteUrl) {
    return e.json(400, { error: "Missing required fields: to and inviteUrl are required" })
  }

  const settings = $app.settings()

  // Normalize invite URL: ensure valid protocol and host
  let fullInviteUrl = String(data.inviteUrl || "").trim()
  if (!fullInviteUrl.startsWith("http://") && !fullInviteUrl.startsWith("https://")) {
    const rawBase = (settings.meta && settings.meta.appUrl) ? settings.meta.appUrl : ($os.getenv("APP_URL") || "http://localhost:3101")
    const base = rawBase.replace(/\/+$/, "")
    const path = fullInviteUrl.startsWith("/") ? fullInviteUrl : "/" + fullInviteUrl
    fullInviteUrl = base + path
  }

  // In development environments without configured SMTP, log the invite URL and succeed gracefully
  if (!settings.smtp || !settings.smtp.enabled) {
    console.log(`[mailer.pb.js] SMTP is not enabled. Skipping email delivery to ${data.to}. Invite URL: ${fullInviteUrl}`)
    return e.json(200, { ok: true, skipped: true, inviteUrl: fullInviteUrl })
  }

  const recipientName = data.name ? String(data.name).trim() : "איש צוות"

  const plainText = [
    `הוזמנת להצטרף לצוות הסטודיו ב-Inkmind CRM`,
    ``,
    `שלום ${recipientName},`,
    `מנהל הסטודיו הזמין אותך להצטרף לצוות המערכת.`,
    `באמצעות הקישור תוכל להגדיר סיסמה אישית, שעות פעילות ולסנכרן את יומן העבודה שלך.`,
    ``,
    `להשלמת תהליך ההצטרפות, לחץ על הקישור הבא:`,
    fullInviteUrl,
    ``,
    `לתשומת לבך: קישור זה הינו אישי ותקף למשך 7 ימים.`,
    ``,
    `הודעה זו נשלחה אוטומטית ממערכת Inkmind CRM.`
  ].join("\n")

  const html = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>הזמנה להצטרפות לצוות הסטודיו</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f7f7f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; direction: rtl; text-align: right;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f7f7f8; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 520px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e6e6e8; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
          <!-- Header Bar -->
          <tr>
            <td style="padding: 28px 32px 20px 32px; border-bottom: 1px solid #f0f0f2;">
              <span style="font-size: 18px; font-weight: 800; color: #111113; letter-spacing: -0.5px;">Inkmind CRM</span>
            </td>
          </tr>
          <!-- Body Content -->
          <tr>
            <td style="padding: 32px 32px 28px 32px;">
              <h1 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 800; color: #111113; line-height: 1.3;">הוזמנת להצטרף לצוות הסטודיו!</h1>
              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #3a3a3c;">שלום ${recipientName},</p>
              <p style="margin: 0 0 28px 0; font-size: 15px; line-height: 1.6; color: #3a3a3c;">מנהל הסטודיו הזמין אותך להצטרף למערכת הניהול והתיאום של Inkmind. לחץ על הכפתור למטה כדי להגדיר סיסמה אישית, שעות פעילות ולסנכרן את יומן העבודה שלך:</p>
              
              <!-- CTA Button -->
              <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="margin: 0 0 28px 0; width: 100%;">
                <tr>
                  <td align="center">
                    <a href="${fullInviteUrl}" target="_blank" rel="noopener" style="display: block; width: 100%; box-sizing: border-box; text-align: center; background-color: #0f172a; color: #ffffff; padding: 14px 24px; border-radius: 12px; font-size: 16px; font-weight: 700; text-decoration: none;">השלמת תהליך ההצטרפות</a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 8px 0; font-size: 13px; line-height: 1.5; color: #8e8e93;">אם הכפתור אינו נפתח, העתק והדבק את הקישור הבא בדפדפן:</p>
              <p style="margin: 0; font-size: 13px; line-height: 1.5; word-break: break-all;"><a href="${fullInviteUrl}" style="color: #2563eb; text-decoration: underline;">${fullInviteUrl}</a></p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px 24px 32px; background-color: #fafafb; border-top: 1px solid #f0f0f2;">
              <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #8e8e93;">הזמנה זו תקפה ל-7 ימים ונשלחה אוטומטית ממערכת Inkmind CRM.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  try {
    const senderAddress = (settings.meta && settings.meta.senderAddress) || (settings.smtp && settings.smtp.username) || "inkmind@roee.fyi"
    const senderName = (settings.meta && settings.meta.senderName) || "Inkmind CRM"

    const message = new MailerMessage({
      from: {
        address: senderAddress,
        name: senderName,
      },
      to: [{ address: data.to }],
      subject: "הזמנה להצטרפות לצוות הסטודיו - Inkmind CRM",
      text: plainText,
      html: html,
      headers: {
        "X-Entity-Ref-ID": `staff-invite-${Date.now()}`,
        "Auto-Submitted": "auto-generated",
      }
    })
    $app.newMailClient().send(message)
    return e.json(200, { ok: true, inviteUrl: fullInviteUrl })
  } catch (err) {
    console.error(`[mailer.pb.js] Failed to send email via SMTP:`, err)
    return e.json(500, { error: String(err) })
  }
})
