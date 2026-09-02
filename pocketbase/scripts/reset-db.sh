#!/usr/bin/env bash
# ============================================================
# reset-db.sh  —  מחיקת ה-DB של PocketBase ואתחול מחדש
# ============================================================
# שימוש:
#   ./reset-db.sh            ← מאפס ומפעיל מחדש (FOREGROUND)
#   ./reset-db.sh --bg       ← מאפס ומפעיל PB ב-background
#   ./reset-db.sh --wipe-only ← מחיקה בלבד, ללא הפעלה מחדש
# ============================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PB_DIR="$(dirname "$SCRIPT_DIR")"
PB_BIN="$PB_DIR/pocketbase"
PB_DATA="$PB_DIR/pb_data"
ENV_FILE="$(dirname "$PB_DIR")/.env"

# ─── Load .env ───────────────────────────────────────────
if [[ -f "$ENV_FILE" ]]; then
  export $(grep -v '^#' "$ENV_FILE" | grep -v '^$' | xargs)
fi

PB_URL="${POCKETBASE_URL:-http://127.0.0.1:8090}"
PB_HOST="${PB_URL#http://}"   # e.g. 127.0.0.1:8090
SUPERUSER_EMAIL="${PB_SUPERUSER_EMAIL:-admin@inkmind.local}"
SUPERUSER_PASSWORD="${PB_SUPERUSER_PASSWORD:-Roeeheily123}"

MODE="restart"
if [[ "$1" == "--bg" ]]; then MODE="bg"; fi
if [[ "$1" == "--wipe-only" ]]; then MODE="wipe-only"; fi

echo ""
echo "🗑️  מוחק את ה-DB של PocketBase..."

# ─── Kill running PocketBase ─────────────────────────────
if pgrep -f "$PB_BIN serve" > /dev/null 2>&1; then
  echo "   ⏹  מכבה את תהליך PocketBase..."
  pkill -f "$PB_BIN serve" || true
  sleep 1
fi

# ─── Wipe DB files ───────────────────────────────────────
rm -f "$PB_DATA/data.db" "$PB_DATA/data.db-shm" "$PB_DATA/data.db-wal"
rm -f "$PB_DATA/auxiliary.db" "$PB_DATA/auxiliary.db-shm" "$PB_DATA/auxiliary.db-wal"
# Keep pb_data/storage (uploaded files) — remove if you also want to reset uploads:
# rm -rf "$PB_DATA/storage"
echo "   ✅ קבצי DB נמחקו"

if [[ "$MODE" == "wipe-only" ]]; then
  echo ""
  echo "✅ DB נמחק. PocketBase לא הופעל מחדש."
  echo "   הפעל ידנית: $PB_BIN serve --http=$PB_HOST"
  exit 0
fi

# ─── Start PocketBase (to run migrations) ─────────────────
echo "   🚀 מפעיל PocketBase (הגרסה: $(\"$PB_BIN\" --version 2>/dev/null))..."
"$PB_BIN" serve --http="$PB_HOST" > /tmp/pb_reset_startup.log 2>&1 &
PB_PID=$!

# Wait for PocketBase to be ready (up to 15s)
echo -n "   ⏳ מחכה ל-PocketBase..."
for i in $(seq 1 30); do
  if curl -sf "$PB_URL/api/health" > /dev/null 2>&1; then
    echo " מוכן!"
    break
  fi
  sleep 0.5
  echo -n "."
  if [[ $i -eq 30 ]]; then
    echo ""
    echo "❌ PocketBase לא ענה תוך 15 שניות. בדוק: /tmp/pb_reset_startup.log"
    exit 1
  fi
done

# ─── Create superuser ─────────────────────────────────────
echo "   🔑 יוצר superuser ($SUPERUSER_EMAIL)..."
"$PB_BIN" superuser upsert "$SUPERUSER_EMAIL" "$SUPERUSER_PASSWORD" \
  --dir="$PB_DATA" > /dev/null 2>&1 && echo "   ✅ Superuser נוצר/עודכן" \
  || echo "   ⚠️  לא ניתן ליצור superuser — בדוק הרשאות"

if [[ "$MODE" == "bg" ]]; then
  echo ""
  echo "✅ DB אופס! PocketBase רץ ב-background (PID: $PB_PID)"
  echo "   PocketBase URL: $PB_URL"
  echo "   לוגים:          /tmp/pb_reset_startup.log"
  echo "   לעצירה:         pkill -f '$PB_BIN serve'"
else
  # Foreground — keep PB alive, kill bg process and run in fg
  kill $PB_PID 2>/dev/null || true
  sleep 0.5
  echo ""
  echo "✅ DB אופס! מפעיל PocketBase ב-foreground..."
  echo "   (Ctrl+C לעצירה)"
  echo ""
  exec "$PB_BIN" serve --http="$PB_HOST"
fi
