#!/usr/bin/env bash
# ============================================================
# rollback.sh — revert to the previous deployed image, no rebuild
# ============================================================
# Usage:
#   ./scripts/rollback.sh            # rolls back to the tag before the current one
#   ./scripts/rollback.sh <git-sha>  # rolls back to a specific previously-deployed tag
#
# Reads deploy-history.log (written by deploy.sh) to find the tag to roll back to, confirms
# that image is still present locally, then just re-points docker compose at it and restarts —
# the image is already built, so this is seconds, not a rebuild.
# ============================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$ROOT_DIR"

HISTORY_FILE="$ROOT_DIR/deploy-history.log"
DEPLOY_TAG_FILE="$ROOT_DIR/.deploy-tag"

if [[ ! -f "$HISTORY_FILE" ]]; then
  echo "✗ No deploy-history.log found — nothing to roll back to. Has deploy.sh ever run?" >&2
  exit 1
fi

if [[ $# -ge 1 ]]; then
  TARGET_TAG="$1"
else
  CURRENT_TAG="$(cat "$DEPLOY_TAG_FILE" 2>/dev/null || tail -n1 "$HISTORY_FILE" | awk '{print $2}')"
  # Previous tag = the last history entry that isn't the current one.
  TARGET_TAG="$(awk -v cur="$CURRENT_TAG" '$2 != cur {t=$2} END{print t}' "$HISTORY_FILE")"
  if [[ -z "$TARGET_TAG" ]]; then
    echo "✗ Could not find a previous tag in deploy-history.log before '$CURRENT_TAG'." >&2
    echo "  Pass one explicitly: ./scripts/rollback.sh <git-sha>" >&2
    exit 1
  fi
fi

if ! docker image inspect "inkmind-crm-web:$TARGET_TAG" >/dev/null 2>&1; then
  echo "✗ Image inkmind-crm-web:$TARGET_TAG is not present locally (was it pruned?)." >&2
  echo "  Available tags:" >&2
  docker images "inkmind-crm-web" --format '  {{.Tag}}' >&2
  exit 1
fi

echo "→ Rolling back to '$TARGET_TAG'..."
WEB_IMAGE_TAG="$TARGET_TAG" docker compose up -d

echo "$(date -u +%Y-%m-%dT%H:%M:%SZ)  $TARGET_TAG  (rollback)" >>"$HISTORY_FILE"
echo "$TARGET_TAG" >"$DEPLOY_TAG_FILE"
echo "✓ Rolled back to $TARGET_TAG"
