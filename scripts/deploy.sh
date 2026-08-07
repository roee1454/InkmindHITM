#!/usr/bin/env bash
# ============================================================
# deploy.sh — build + tag a new image and bring it up
# ============================================================
# Usage:
#   ./scripts/deploy.sh
#
# What it does:
#   1. Tags the build with the current git short SHA (never `latest` — that's what makes
#      rollback.sh possible without a rebuild).
#   2. Backs up PocketBase's data BEFORE bringing up the new containers — belt-and-suspenders
#      on top of the scheduled cron backup (pocketbase/scripts/backup.sh); a deploy is exactly
#      the moment a bad migration could land.
#   3. Records the new tag in deploy-history.log (append-only audit trail) so rollback.sh knows
#      what the previous good tag was.
#   4. `docker compose build` + `up -d`.
# ============================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$ROOT_DIR"

HISTORY_FILE="$ROOT_DIR/deploy-history.log"
TAG="$(git rev-parse --short HEAD)"

if [[ -n "$(git status --porcelain)" ]]; then
  echo "⚠️  Working tree has uncommitted changes — deploying HEAD (\"$TAG\") anyway, but the" >&2
  echo "   running image won't exactly match what's on disk. Commit first if that matters." >&2
fi

echo "→ Backing up PocketBase data before deploy..."
if [[ -x "$ROOT_DIR/pocketbase/scripts/backup.sh" ]]; then
  "$ROOT_DIR/pocketbase/scripts/backup.sh" || echo "⚠️  Pre-deploy backup failed — continuing anyway (see output above)." >&2
else
  echo "⚠️  pocketbase/scripts/backup.sh not found or not executable — skipping pre-deploy backup." >&2
fi

echo "→ Building images tagged '$TAG'..."
WEB_IMAGE_TAG="$TAG" docker compose build

echo "$(date -u +%Y-%m-%dT%H:%M:%SZ)  $TAG" >>"$HISTORY_FILE"

echo "→ Starting '$TAG'..."
WEB_IMAGE_TAG="$TAG" docker compose up -d

echo "$TAG" >"$ROOT_DIR/.deploy-tag"
echo "✓ Deployed $TAG"
