# Deploying to a VPS (Docker Compose + Caddy)

This is the self-hosted alternative to the Render Blueprint described in `README.md`. Everything
runs via `docker compose`: the app (`web`), PocketBase (`pocketbase`), and Caddy (`caddy`) as a
reverse proxy that gets you HTTPS automatically — no certbot, no manual cert renewal cron.

Two DNS-backed hostnames are needed, not one: the browser talks to PocketBase **directly** for
realtime updates and file access (`VITE_POCKETBASE_URL`), so it needs its own public subdomain —
it is not just an internal implementation detail proxied behind the app.

## 1. Point DNS at the VPS

Create two A records pointing at the VPS's IP address:

```
app.yourdomain.com   → <VPS IP>
pb.yourdomain.com    → <VPS IP>
```

(Any subdomain names work — just keep them consistent with the `Caddyfile` and `.env` in the
steps below.)

## 2. VPS prep

As a non-root sudo user:

```bash
sudo apt update && sudo apt install -y docker.io docker-compose-plugin jq curl git
sudo systemctl enable --now docker
sudo usermod -aG docker "$USER"   # log out/in after this so `docker` works without sudo

sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

(PocketBase's own port, 8090, is bound to `127.0.0.1` in `docker-compose.yml` — not reachable
from the internet regardless of firewall rules — so it doesn't need a `ufw` rule.)

## 3. Clone the repo and configure `.env`

```bash
git clone <your-repo-url> inkmind-crm
cd inkmind-crm
cp .env.example .env
```

Edit `.env` — production values differ from the local-dev defaults for:

| Variable | Production value |
|---|---|
| `VITE_POCKETBASE_URL` | `https://pb.yourdomain.com` — **baked into the client bundle at build time**, must be correct before running `docker compose build`, not just at runtime |
| `GOOGLE_OAUTH_REDIRECT_URI` | `https://app.yourdomain.com/api/google-calendar/oauth/callback` — also add this exact URI as an authorized redirect in Google Cloud Console (separate step, the env var alone isn't enough) |
| `APP_INTERNAL_URL` | `http://web:3101` (compose-network service name — already the default) |
| `PB_HOOK_SECRET` | generate a real random value, e.g. `openssl rand -hex 32` — the placeholder from local dev is not safe to reuse |
| `WHATSAPP_*`, `ANTHROPIC_API_KEY`, `GOOGLE_OAUTH_CLIENT_SECRET` | your real production credentials |
| `PB_SUPERUSER_EMAIL` / `PB_SUPERUSER_PASSWORD` | pick real credentials — this is a **backend-only PocketBase service account**, see step 5, not the CRM login |

Also edit `Caddyfile` and replace `app.yourdomain.com` / `pb.yourdomain.com` with your real
hostnames.

## 4. Build

```bash
docker compose build
```

## 5. Bootstrap the PocketBase superuser (first deploy only)

This is a separate account from the CRM's own studio-owner login — the PocketBase superuser is
what `getSuperuserClient()` in the app authenticates as internally; you never log into the CRM
UI with it. It only needs to exist once, on a fresh `pb_data` volume:

```bash
docker compose up -d pocketbase
docker compose exec pocketbase /pb/pocketbase superuser upsert <PB_SUPERUSER_EMAIL> <PB_SUPERUSER_PASSWORD> --dir /pb/pb_data
```

## 6. Bring everything up

```bash
docker compose up -d
docker compose logs -f caddy   # watch for successful cert issuance, then Ctrl-C
```

Both `https://app.yourdomain.com` and `https://pb.yourdomain.com/api/health` should now respond
with valid certificates.

## 7. Create the studio owner and finish onboarding

Visit `https://app.yourdomain.com/auth/setup` to create the actual CRM login (this is the
account you'll use day to day — distinct from the PocketBase superuser above), then walk through
the onboarding wizard.

## 8. Point external services at the real domain

- **WhatsApp Cloud API**: Meta App Dashboard → your app → WhatsApp → Configuration → set the
  webhook Callback URL to `https://app.yourdomain.com/api/whatsapp-webhook` and the Verify Token
  to match `WHATSAPP_WEBHOOK_VERIFY_TOKEN` from `.env`. Subscribe to the `messages` field.
- **Google OAuth**: Google Cloud Console → your OAuth client → Authorized redirect URIs → add
  `https://app.yourdomain.com/api/google-calendar/oauth/callback` (matching step 3's
  `GOOGLE_OAUTH_REDIRECT_URI`).

## 9. Schedule backups

`pocketbase/scripts/backup.sh` is idempotent per-tick — safe to run hourly; it decides on its
own whether a backup is actually due, based on the interval configured in the CRM's own
Settings → גיבויים tab, so this crontab line never needs to change:

```bash
crontab -e
# add:
0 * * * *  /home/<user>/inkmind-crm/pocketbase/scripts/backup.sh >> /var/log/inkmind-backup.log 2>&1
```

## Ongoing deploys and rollback

```bash
./scripts/deploy.sh      # tags the build with the current git SHA, backs up PocketBase first, builds, deploys
./scripts/rollback.sh    # reverts to the previous tag — no rebuild, just restarts with the old image
```

Both scripts run from the repo root and assume `.env` is already in place. See their headers
for details.
