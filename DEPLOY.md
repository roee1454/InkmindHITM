# Production Deployment (Dokploy on Hetzner VPS)

This guide covers deploying and managing Inkmind CRM on a **Hetzner VPS** using **Dokploy**.

Dokploy automates building, deploying, rolling back, and routing through Docker Compose upon every push to your `main` branch.

---

## 1. Architecture Overview

Dokploy orchestrates the stack defined in [`docker-compose.prod.yml`](./docker-compose.prod.yml):

```
                   Internet (HTTPS)
                          │
            ┌─────────────┴─────────────┐
            │  Dokploy Host Proxy       │
            │  (Traefik - SSL / Let's   │
            │   Encrypt auto-renewal)   │
            └──────┬─────────────┬──────┘
                   │             │
        app.domain.com       pb.domain.com
                   │             │
                   ▼             ▼
              ┌─────────┐   ┌────────────┐
              │   web   │   │ pocketbase │
              │ (:3101) │   │  (:8090)   │
              └────┬────┘   └─────▲──────┘
                   │              │
                   │    ┌─────────┴─────────┐
                   │    │    studio-sync    │
                   │    │ (runs on deploy   │
                   │    │  before web boot) │
                   │    └───────────────────┘
                   ▼
              ┌─────────┐
              │  redis  │
              │ (:6379) │
              └─────────┘
```

* **`pocketbase`**: SQLite database, authentication, file storage.
* **`studio-sync`**: Provisioning job that runs on every deploy after PocketBase is healthy. Upserts [`src/config/studio.config.ts`](./src/config/studio.config.ts) into the database and seeds initial FAQs.
* **`web`**: TanStack Start / Nitro production runner (`node .output/server/index.mjs`). Boots **only** after `studio-sync` finishes successfully.
* **`redis`**: BullMQ queue for WhatsApp message processing and background tasks.

---

## 2. DNS Setup

Point two DNS A records to your Hetzner VPS IP address:

| Hostname | Type | Target | Purpose |
|---|---|---|---|
| `app.yourdomain.com` | A | `<Hetzner VPS IP>` | Web application UI & webhook endpoints |
| `pb.yourdomain.com` | A | `<Hetzner VPS IP>` | Direct PocketBase API & realtime events |

*(PocketBase requires its own public domain because browser clients talk to it directly for realtime subscriptions and uploaded assets).*

---

## 3. Dokploy Project Setup

1. Open your **Dokploy Dashboard** on the Hetzner VPS.
2. Click **Create Project** (e.g. `Inkmind CRM - Main Studio`).
3. Click **Add Service** → select **Compose**.
4. Configure the Git repository:
   * **Repository URL**: `https://github.com/your-username/InkmindHITM`
   * **Branch**: `main`
   * **Build Type**: `docker-compose`
   * **Compose Path**: `docker-compose.prod.yml`
5. Enable **Auto Deploy** (triggers deploy whenever you push to `main`).

---

## 4. Environment Variables in Dokploy

In Dokploy, go to the **Environment** tab of your Compose application and paste the production secrets:

```env
# Public domain used at build time to configure the client browser client
VITE_POCKETBASE_URL=https://pb.yourdomain.com
APP_URL=https://app.yourdomain.com

# PocketBase internal and superuser service account
PB_HOOK_SECRET=your_32_byte_random_secret_hex
PB_SUPERUSER_EMAIL=admin@yourdomain.com
PB_SUPERUSER_PASSWORD=your_strong_password_123

# WhatsApp Cloud API credentials
WHATSAPP_PHONE_NUMBER_ID=your_phone_id
WHATSAPP_BUSINESS_ACCOUNT_ID=your_waba_id
WHATSAPP_ACCESS_TOKEN=your_meta_system_user_token
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your_custom_verify_token
WHATSAPP_APP_SECRET=your_meta_app_secret

# AI & LLM Engine
ANTHROPIC_API_KEY=sk-ant-api03-...

# Google Calendar OAuth credentials
GOOGLE_OAUTH_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=GOCSPX-...
GOOGLE_OAUTH_REDIRECT_URI=https://app.yourdomain.com/api/google-calendar/oauth/callback

# Groq Whisper Voice Transcription
GROQ_API_KEY=gsk_...

# Health Declaration Webhook Secret
HEALTH_DECLARATION_WEBHOOK_SECRET=your_custom_secret

# Web Push (VAPID) for iOS PWA and Desktop Notifications (RFC 8292)
VAPID_PUBLIC_KEY=BAuiYqFr_Ly1fOMyQ2nUyv6ell9yamMQy3wD-7fZwQvqamp1Q3DYudnoZa3lG7D5PId4GW6h3ppJuVwIq6B203A
VAPID_PRIVATE_KEY=0bwVqv1EMqLfpMIZpRZ5mz000YR48cNbacic6H1rSY4
VAPID_SUBJECT=mailto:admin@inkmind.io
```

---

## 5. Domain Routing in Dokploy

In your Compose application in Dokploy, navigate to the **Domains** tab and configure two routes:

1. **CRM Web App Route**:
   * **Host**: `app.yourdomain.com`
   * **Service**: `web`
   * **Container Port**: `3101`
   * **HTTPS / SSL**: Enabled (Let's Encrypt automatic certificate)

2. **PocketBase API Route**:
   * **Host**: `pb.yourdomain.com`
   * **Service**: `pocketbase`
   * **Container Port**: `8090`
   * **HTTPS / SSL**: Enabled (Let's Encrypt automatic certificate)

---

## 6. Preflight CI/CD & Automated Releases

GitHub Actions runs preflight checks on every push and pull request ([`.github/workflows/ci.yml`](./.github/workflows/ci.yml)):

1. **Preflight Job**:
   * Validates TypeScript types (`pnpm tsc --noEmit`).
   * Runs the full unit test suite (129 test files, 1,080 tests).
   * Validates [`docker-compose.prod.yml`](./docker-compose.prod.yml) configuration and syntax.
2. **Integration Job**:
   * Downloads PocketBase v0.39.10 into a throwaway container.
   * Runs the real SQLite integration test suite (`pnpm test:integration`).
3. **Automated Dokploy Deploy Gate**:
   * If you configure a GitHub secret named **`DOKPLOY_DEPLOY_WEBHOOK_URL`** (obtained from your Dokploy Application's Deployments/Webhook settings), GitHub Actions will trigger Dokploy's deploy webhook **only after** all preflight and integration tests pass.
   * This guarantees that broken code or bad configs are never deployed to your VPS.

---

## 7. How Container Deployment & Migrations Work

When Dokploy starts a release:

1. **Build stage**: Docker BuildKit builds the `runner` (web) and `sync` (studio-sync) images. Shared dependencies are cached in seconds.
2. **PocketBase launch**: PocketBase container starts and bootstraps the superuser if not yet initialized.
3. **Healthcheck verification**: PocketBase runs its health check (`/api/health`).
4. **Studio Synchronization (`studio-sync`)**:
   * Executes `pnpm studio:sync`.
   * Pushes constants from [`studio.config.ts`](./src/config/studio.config.ts) directly into PocketBase `settings`.
   * Seeds initial FAQs into the `faq` collection if empty.
   * If sync fails, the deployment stops immediately without starting `web`.
5. **Web launch**: The `web` container starts only after `studio-sync` exits with code `0`.
6. **Traefik live routing**: Zero-downtime cutover to the new container.

---

## 8. One-Click Rollbacks in Dokploy

If an issue occurs after a release:
1. Open the Dokploy application and go to the **Deployments** tab.
2. Locate any previous successful deployment commit.
3. Click **Redeploy**.
4. Dokploy will immediately rebuild and restart the containers from that exact commit.

---

## 9. Database Backups (Off-Site S3 / R2)

To ensure data integrity:
1. In Dokploy, go to the **Backups** tab of your project.
2. Add a scheduled backup for the volume **`pb_data`**.
3. Set your destination: **Cloudflare R2**, **AWS S3**, or **Hetzner Storage Box**.
4. Set schedule to daily or every 6 hours (`0 */6 * * *`).

---

## 10. Scaling to Multiple Client Studios

To give each tattoo studio an isolated, custom environment:

1. Create a dedicated Git branch for the studio (e.g. `studio/black-pearl`).
2. Customize that branch's [`src/config/studio.config.ts`](./src/config/studio.config.ts) and [`public/branding/logo.png`](./public/branding/logo.png).
3. In Dokploy, create a new Compose Project: `Inkmind CRM - Black Pearl`.
4. Point to the repository and branch `studio/black-pearl`.
5. Provide that studio's domain (`bp.yourdomain.com`, `bp-pb.yourdomain.com`) and specific WhatsApp / Google credentials in the Dokploy Environment tab.
6. Deploy!
   * Each studio runs in complete database isolation (`pb_data_<studio>`).
   * No multi-tenant data leak risks.
   * A single Hetzner CPX31/CPX41 VPS can host 10–25 studio stacks concurrently.
