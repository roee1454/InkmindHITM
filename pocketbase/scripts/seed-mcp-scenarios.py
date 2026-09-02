#!/usr/bin/env python3
"""
Seeds specific data scenarios into a local PocketBase instance for manually testing the MCP
assistant (see docs/mcp-assistant-design/testing-checklist.md). Self-contained (stdlib only, no
dependency on the .claude/skills/pocketbase scripts) so any teammate can run it without Claude
Code installed — but follows the same superuser-auth + REST pattern those scripts use.

Usage:
  python pocketbase/scripts/seed-mcp-scenarios.py <scenario> [--staff-id ID]
  pnpm scenario <scenario> [-- --staff-id ID]

Scenarios:
  busy               Fully books an existing staff member's next several days (starting today —
                     see --days, default 5), each with its own distinct customer per slot, so
                     availability-rejection paths (find_free_slots, create_appointment hitting
                     "slot_taken") are exercisable across a genuinely busy calendar. Assumes that
                     staff member already has working hours configured for those weekdays.
  waitlist-ready     Creates 2-3 customers each with a `watching` waitlist entry (wants earlier
                     than their own later appointment), then cancels a separate appointment for
                     the same staff member to fire the real PocketBase hook -> internal route ->
                     waitlist matcher chain end to end. Multiple candidates so the "decline ->
                     offered to the next candidate" step is actually observable, not just the
                     first match. Requires the dev server (`pnpm dev`) AND PocketBase (with
                     pb_hooks loaded) to actually be running — this writes through the REST API
                     like any other client, so the real hooks fire exactly as they would in
                     production.
  outside-24h-window Creates a customer whose WhatsApp session window has already expired, for
                     manually verifying the ERROR_REENGAGEMENT_REQUIRED path when approving an
                     `offer_waitlist_slot`/`send_reminder`/etc. action.
  pending-actions    Creates several pending mcp_actions across multiple conversations, for
                     checking the bubble's badge count and the unread/pending-dot priority.

All dates are computed relative to today, so scenarios stay valid no matter when you run them.
Every seeded customer gets a random unique phone number, so re-running the same scenario twice
in a row won't collide on the `customers.phone` unique index.

Run `pnpm db:reset` first for a clean slate — these scenarios are additive and not fully
idempotent (re-running creates new records rather than reusing previous ones).
"""

import argparse
import json
import os
import random
import sys
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone


def _load_env_file():
    """Read repo-root .env (walking up from this script's location)."""
    search_dir = os.path.dirname(os.path.abspath(__file__))
    while True:
        candidate = os.path.join(search_dir, ".env")
        if os.path.isfile(candidate):
            with open(candidate) as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith("#") or "=" not in line:
                        continue
                    key, _, value = line.partition("=")
                    key = key.strip()
                    value = value.strip().strip('"\'')
                    if key and key not in os.environ:
                        os.environ[key] = value
            return
        parent = os.path.dirname(search_dir)
        if parent == search_dir:
            return
        search_dir = parent


_load_env_file()

PB_URL = os.environ.get("PB_URL", "http://127.0.0.1:8090").rstrip("/")
PB_SUPERUSER_EMAIL = os.environ.get("PB_SUPERUSER_EMAIL", "")
PB_SUPERUSER_PASSWORD = os.environ.get("PB_SUPERUSER_PASSWORD", "")


def pb_request(method, path, data=None, token=None):
    url = f"{PB_URL}{path}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    body = json.dumps(data).encode() if data is not None else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as res:
            raw = res.read()
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        detail = e.read().decode(errors="replace")
        raise SystemExit(f"PocketBase {method} {path} failed ({e.code}): {detail}")


def auth_superuser():
    if not PB_SUPERUSER_EMAIL or not PB_SUPERUSER_PASSWORD:
        raise SystemExit("PB_SUPERUSER_EMAIL / PB_SUPERUSER_PASSWORD not set (.env)")
    result = pb_request(
        "POST",
        "/api/collections/_superusers/auth-with-password",
        {"identity": PB_SUPERUSER_EMAIL, "password": PB_SUPERUSER_PASSWORD},
    )
    return result["token"]


def create(token, collection, fields):
    result = pb_request("POST", f"/api/collections/{collection}/records", fields, token)
    print(f"  + {collection}/{result['id']}")
    return result


def update(token, collection, record_id, fields):
    pb_request("PATCH", f"/api/collections/{collection}/records/{record_id}", fields, token)
    print(f"  ~ {collection}/{record_id} -> {fields}")


def first_staff_id(token, override):
    if override:
        return override
    result = pb_request("GET", "/api/collections/staff/records?perPage=1", token=token)
    items = result.get("items", [])
    if not items:
        raise SystemExit("No staff records found — create at least one staff member first, or pass --staff-id.")
    return items[0]["id"]


def iso(dt):
    return dt.strftime("%Y-%m-%dT%H:%M:%S.000Z")


def today_start():
    """Midnight UTC today — the anchor every scenario's dates are computed relative to, so
    they stay valid no matter when this script is run."""
    now = datetime.now(timezone.utc)
    return now.replace(hour=0, minute=0, second=0, microsecond=0)


def random_phone():
    """A realistic-looking, unique-enough `+9725XXXXXXX` number. `customers.phone` has a unique
    index, so reusing a fixed number (as this script did originally) breaks on the second run of
    the same scenario without a full `pnpm db:reset` in between."""
    return "+9725" + "".join(random.choices("0123456789", k=7))


def scenario_busy_day(token, staff_id, days=5):
    print(f"Booking {days} full working day(s) starting today so availability checks reject every slot...")
    base = today_start()
    count = 0
    for day_offset in range(days):
        day = base + timedelta(days=day_offset)
        for hour in range(10, 18, 2):  # 10:00, 12:00, 14:00, 16:00 — matches the default 2h slot size
            start = day.replace(hour=hour)
            count += 1
            customer = create(
                token,
                "customers",
                {"name": f"לקוח בדיקה — יום עמוס #{count}", "phone": random_phone()},
            )
            create(
                token,
                "appointments",
                {
                    "customer": customer["id"],
                    "staff": staff_id,
                    "start_time": iso(start),
                    "duration_minutes": 120,
                    "status": "confirmed",
                    "source": "staff_manual",
                },
            )
    first_day = base.strftime("%Y-%m-%d")
    last_day = (base + timedelta(days=days - 1)).strftime("%Y-%m-%d")
    print(f"Done. Booked {count} appointments across {first_day}..{last_day} for this staff member — "
          "every 10/12/14/16 slot on each of those days should read as taken.")


def scenario_waitlist_ready(token, staff_id):
    print("Seeding several watching waitlist candidates, then cancelling a separate appointment to fire the real hook chain...")
    base = today_start()
    candidate_names = ["דנה", "נועה", "מאיה"]
    # Different "current" appointment dates (all later than the slot about to free up, 10 days
    # out below) — the matcher picks the soonest first, so declining that offer should fall
    # through to the next one, then the next, exactly like the manual checklist's decline step.
    for i, name in enumerate(candidate_names):
        candidate = create(token, "customers", {"name": f"{name} (רשימת המתנה)", "phone": random_phone()})
        later = base + timedelta(days=20 + i * 3, hours=10)
        later_appt = create(
            token,
            "appointments",
            {
                "customer": candidate["id"],
                "staff": staff_id,
                "start_time": iso(later),
                "duration_minutes": 120,
                "status": "confirmed",
                "source": "staff_manual",
            },
        )
        create(
            token,
            "waitlist_entries",
            {
                "customer": candidate["id"],
                "current_appointment": later_appt["id"],
                "status": "watching",
                "source": "staff_manual",
            },
        )

    freed_customer = create(token, "customers", {"name": "לקוח שמבטל", "phone": random_phone()})
    soon = base + timedelta(days=10, hours=10)
    freed_appt = create(
        token,
        "appointments",
        {
            "customer": freed_customer["id"],
            "staff": staff_id,
            "start_time": iso(soon),
            "duration_minutes": 120,
            "status": "confirmed",
            "source": "staff_manual",
        },
    )
    print("Cancelling the freed appointment now — this should trigger pb_hooks/appointments.pb.js -> "
          "internal/appointment-freed -> the waitlist matcher, IF the dev server + PocketBase hooks are running.")
    update(token, "appointments", freed_appt["id"], {"status": "cancelled"})
    print(f"Done. {len(candidate_names)} candidates are waiting for this slot — check the MCP chat (as the "
          "staff member above) for a new proactively-started conversation offering it to the soonest one first.")


def scenario_outside_24h_window(token, staff_id, phone=None):
    print("Creating a customer whose WhatsApp session window already expired...")
    customer = create(token, "customers", {"name": "לקוח מחוץ לחלון", "phone": phone or random_phone()})
    expired = datetime.now(timezone.utc) - timedelta(hours=48)
    conversation = create(
        token,
        "conversations",
        {
            "customer": customer["id"],
            "status": "staff_handling",
            "state": "NEW",
            "last_message_at": iso(expired),
            "whatsapp_window_expires_at": iso(expired),
        },
    )
    later = today_start() + timedelta(days=14, hours=10)
    appt = create(
        token,
        "appointments",
        {
            "customer": customer["id"],
            "staff": staff_id,
            "start_time": iso(later),
            "duration_minutes": 120,
            "status": "confirmed",
            "source": "staff_manual",
        },
    )
    create(
        token,
        "waitlist_entries",
        {"customer": customer["id"], "current_appointment": appt["id"], "status": "watching", "source": "staff_manual"},
    )
    print(f"Done. Conversation {conversation['id']} is outside the 24h window — approving a "
          "send_reminder/send_update_message/offer_waitlist_slot action for this customer should surface "
          "the 'חלון 24 השעות' error.")


def scenario_pending_actions_pile_up(token, staff_id):
    print("Creating several pending mcp_actions across multiple conversations...")
    base = today_start()
    for i in range(3):
        customer = create(token, "customers", {"name": f"לקוח ממתין {i + 1}", "phone": random_phone()})
        appt = create(
            token,
            "appointments",
            {
                "customer": customer["id"],
                "staff": staff_id,
                "start_time": iso(base + timedelta(days=5 + i, hours=10)),
                "duration_minutes": 120,
                "status": "confirmed",
                "source": "staff_manual",
            },
        )
        conversation = create(token, "mcp_conversations", {"staff": staff_id, "title": f"בדיקה — פעולה ממתינה {i + 1}", "channel": "web"})
        message = create(
            token,
            "mcp_messages",
            {"conversation": conversation["id"], "role": "assistant", "body": f"הצעה לביטול תור {i + 1} לבדיקה."},
        )
        create(
            token,
            "mcp_actions",
            {
                "conversation": conversation["id"],
                "message": message["id"],
                "tool_name": "cancel_appointment",
                "args": {"appointmentId": appt["id"]},
                "diff": {"summary": "ביטול תור לבדיקה", "rows": [{"label": customer["name"], "before": "מאושר", "after": "בוטל"}]},
                "status": "pending",
            },
        )
    print("Done. The MCP bubble's badge should now show 3 pending actions.")


SCENARIOS = {
    "busy": scenario_busy_day,
    "waitlist-ready": scenario_waitlist_ready,
    "outside-24h-window": scenario_outside_24h_window,
    "pending-actions": scenario_pending_actions_pile_up,
}


def main():
    parser = argparse.ArgumentParser(description="Seed MCP assistant testing scenarios into PocketBase")
    parser.add_argument("scenario", choices=sorted(SCENARIOS.keys()))
    parser.add_argument("--staff-id", help="Staff record id to use (default: first staff record found)")
    parser.add_argument("--days", type=int, default=5, help="'busy' only: how many consecutive days to fully book (default: 5)")
    parser.add_argument("--phone", help="'outside-24h-window' only: real phone number to use instead of a random one, so you can actually test the WhatsApp send")
    args = parser.parse_args()

    token = auth_superuser()
    staff_id = first_staff_id(token, args.staff_id)
    print(f"Using staff: {staff_id}")
    if args.scenario == "busy":
        scenario_busy_day(token, staff_id, days=args.days)
    elif args.scenario == "outside-24h-window":
        scenario_outside_24h_window(token, staff_id, phone=args.phone)
    else:
        SCENARIOS[args.scenario](token, staff_id)


if __name__ == "__main__":
    main()
