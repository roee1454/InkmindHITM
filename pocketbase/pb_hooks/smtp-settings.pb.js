/// <reference path="../pb_data/types.d.ts" />

// Applies SMTP config from the environment at boot, so mail settings are declarative (checked
// into this repo, reproducible across dev/prod) instead of a one-off click-through in the Admin
// UI — same reasoning as the PB_SUPERUSER_EMAIL/PASSWORD bootstrap in pocketbase/Dockerfile.
// These env vars are read by the Go binary directly (not Node's dotenv) — export them in the
// actual environment running `./pocketbase serve`, and in Render's inkmind-crm-pocketbase
// service Environment tab in production. Unset locally = this hook no-ops and dev boots as before.
onBootstrap((e) => {
  e.next()

  const host = $os.getenv("SMTP_HOST")
  const username = $os.getenv("SMTP_USERNAME")
  const password = $os.getenv("SMTP_PASSWORD")
  const fromAddress = $os.getenv("SMTP_FROM_ADDRESS")

  if (!host || !username || !password || !fromAddress) {
    return
  }

  const port = parseInt($os.getenv("SMTP_PORT") || "587", 10)
  const fromName = $os.getenv("SMTP_FROM_NAME") || "Inkmind CRM"

  const settings = $app.settings()
  settings.smtp.enabled = true
  settings.smtp.host = host
  settings.smtp.port = port
  settings.smtp.username = username
  settings.smtp.password = password
  settings.smtp.authMethod = "PLAIN"
  settings.smtp.tls = false // STARTTLS on 587 negotiates its own upgrade; see docker-mailserver setup notes
  settings.meta.senderAddress = fromAddress
  settings.meta.senderName = fromName

  $app.save(settings)
})
