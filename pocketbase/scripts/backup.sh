#!/usr/bin/env bash
# ============================================================
# backup.sh — creates a PocketBase backup if one is due
# ============================================================
# Intended to run frequently from cron (hourly recommended — see crontab line below); this
# script itself decides whether it's actually time to back up, based on backup_enabled /
# backup_interval_hours read from the `settings` collection. That's what makes the interval
# genuinely changeable from the CRM's own Settings screen (BackupSettingsTab) without ever
# touching crontab again — the cron schedule itself never needs to change.
#
# Independent of the Node app on purpose: as long as PocketBase itself is up, backups keep
# running even if the Node app has crashed.
#
# Requires: curl, jq
#
# Crontab entry (runs the tick every hour; the script no-ops if a backup isn't due yet):
#   0 * * * *  /path/to/pocketbase/scripts/backup.sh >> /var/log/inkmind-backup.log 2>&1
# ============================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$ROOT_DIR/../.env"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source <(grep -v '^#' "$ENV_FILE" | grep -v '^$')
  set +a
fi

PB_URL="${PB_URL:-${POCKETBASE_URL:-http://127.0.0.1:8090}}"
: "${PB_SUPERUSER_EMAIL:?PB_SUPERUSER_EMAIL must be set (via .env or the environment)}"
: "${PB_SUPERUSER_PASSWORD:?PB_SUPERUSER_PASSWORD must be set (via .env or the environment)}"

log() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*"; }

TOKEN="$(curl -sS -X POST "$PB_URL/api/collections/_superusers/auth-with-password" \
  -H "Content-Type: application/json" \
  -d "$(jq -n --arg id "$PB_SUPERUSER_EMAIL" --arg pw "$PB_SUPERUSER_PASSWORD" '{identity:$id, password:$pw}')" \
  | jq -r '.token')"

if [[ -z "$TOKEN" || "$TOKEN" == "null" ]]; then
  log "✗ Failed to authenticate as PocketBase superuser — aborting."
  exit 1
fi

SETTINGS_JSON="$(curl -sS "$PB_URL/api/collections/settings/records?perPage=1" -H "Authorization: $TOKEN")"
SETTINGS_ID="$(echo "$SETTINGS_JSON" | jq -r '.items[0].id // empty')"

if [[ -z "$SETTINGS_ID" ]]; then
  log "✗ No settings record found — aborting."
  exit 1
fi

ENABLED="$(echo "$SETTINGS_JSON" | jq -r '.items[0].backup_enabled // false')"
if [[ "$ENABLED" != "true" ]]; then
  log "Backups disabled in Settings — nothing to do."
  exit 0
fi

INTERVAL_HOURS="$(echo "$SETTINGS_JSON" | jq -r '.items[0].backup_interval_hours // 24')"
RETENTION_COUNT="$(echo "$SETTINGS_JSON" | jq -r '.items[0].backup_retention_count // 7')"
LAST_BACKUP_AT="$(echo "$SETTINGS_JSON" | jq -r '.items[0].last_backup_at // empty')"

NOW_EPOCH="$(date -u +%s)"
if [[ -n "$LAST_BACKUP_AT" ]]; then
  LAST_EPOCH="$(date -u -d "$LAST_BACKUP_AT" +%s 2>/dev/null || echo 0)"
  ELAPSED_HOURS="$(( (NOW_EPOCH - LAST_EPOCH) / 3600 ))"
  if (( ELAPSED_HOURS < INTERVAL_HOURS )); then
    log "Not due yet (last backup ${ELAPSED_HOURS}h ago, interval ${INTERVAL_HOURS}h) — skipping."
    exit 0
  fi
fi

BACKUP_NAME="backup-$(date -u +%Y%m%d-%H%M%S).zip"
log "Creating backup '$BACKUP_NAME'..."

HTTP_STATUS="$(curl -sS -o /tmp/backup-response.json -w '%{http_code}' -X POST "$PB_URL/api/backups" \
  -H "Authorization: $TOKEN" -H "Content-Type: application/json" \
  -d "$(jq -n --arg name "$BACKUP_NAME" '{name:$name}')")"

NOW_ISO="$(date -u +%Y-%m-%dT%H:%M:%S.000Z)"

if [[ "$HTTP_STATUS" -ge 200 && "$HTTP_STATUS" -lt 300 ]]; then
  log "✓ Backup created."
  curl -sS -X PATCH "$PB_URL/api/collections/settings/records/$SETTINGS_ID" \
    -H "Authorization: $TOKEN" -H "Content-Type: application/json" \
    -d "$(jq -n --arg at "$NOW_ISO" '{last_backup_at:$at, last_backup_ok:true, last_backup_error:""}')" \
    >/dev/null
else
  ERROR_MSG="$(jq -r '.message // "unknown error"' </tmp/backup-response.json 2>/dev/null || echo "HTTP $HTTP_STATUS")"
  log "✗ Backup failed: $ERROR_MSG"
  curl -sS -X PATCH "$PB_URL/api/collections/settings/records/$SETTINGS_ID" \
    -H "Authorization: $TOKEN" -H "Content-Type: application/json" \
    -d "$(jq -n --arg at "$NOW_ISO" --arg err "$ERROR_MSG" '{last_backup_at:$at, last_backup_ok:false, last_backup_error:$err}')" \
    >/dev/null
  exit 1
fi

# Prune down to the configured retention count, oldest first.
log "Pruning backups beyond retention count ($RETENTION_COUNT)..."
BACKUPS="$(curl -sS "$PB_URL/api/backups" -H "Authorization: $TOKEN" | jq -r 'sort_by(.modified) | reverse | .[].key')"
INDEX=0
while IFS= read -r KEY; do
  [[ -z "$KEY" ]] && continue
  INDEX=$((INDEX + 1))
  if (( INDEX > RETENTION_COUNT )); then
    log "  Deleting old backup: $KEY"
    curl -sS -X DELETE "$PB_URL/api/backups/$KEY" -H "Authorization: $TOKEN" >/dev/null
  fi
done <<<"$BACKUPS"

log "Done."
