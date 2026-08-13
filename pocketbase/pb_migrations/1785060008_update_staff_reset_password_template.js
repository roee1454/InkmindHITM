/// <reference path="../pb_data/types.d.ts" />

// PocketBase's default resetPasswordTemplate links to its own Admin UI
// (/_/#/auth/confirm-password-reset/{TOKEN}), which staff never see or use — the app has its own
// /auth/reset-password page (src/routes/auth/reset-password.tsx) that calls
// confirmStaffPasswordReset. Point the email there instead, with Inkmind-branded Hebrew copy.
migrate((app) => {
  const collection = app.findCollectionByNameOrId("staff")

  collection.resetPasswordTemplate = {
    subject: "איפוס סיסמה ל-Inkmind CRM",
    body: `<p>שלום,</p>
<p>קיבלנו בקשה לאיפוס הסיסמה שלך במערכת Inkmind CRM.</p>
<p>
  <a class="btn" href="{APP_URL}/auth/reset-password?token={TOKEN}" target="_blank" rel="noopener">איפוס סיסמה</a>
</p>
<p><i>אם לא ביקשת לאפס את הסיסמה, אפשר להתעלם מהודעה זו.</i></p>
<p>
  בברכה,<br/>
  צוות Inkmind
</p>`,
  }

  app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("staff")

  collection.resetPasswordTemplate = {
    subject: "Reset your {APP_NAME} password",
    body: `<p>Hello,</p>
<p>Click on the button below to reset your password.</p>
<p>
  <a class="btn" href="{APP_URL}/_/#/auth/confirm-password-reset/{TOKEN}" target="_blank" rel="noopener">Reset password</a>
</p>
<p><i>If you didn't ask to reset your password, please ignore this email.</i></p>
<p>
  Thanks,<br/>
  {APP_NAME} team
</p>`,
  }

  app.save(collection)
})
