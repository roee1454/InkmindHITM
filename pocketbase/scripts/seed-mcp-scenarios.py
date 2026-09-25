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
  blank-new          Wipes every application collection — no settings row, no staff, no data at
                     all. The "nothing has happened yet" state: opening the app should drop you
                     on the very first auth/onboarding step. Destructive; prompts before wiping
                     unless --force.
  blank-onboarded    Wipes, then seeds only what finishing onboarding produces: the singleton
                     `settings` record with onboarding_completed = true, one `owner` staff
                     member (owner@inkmind.local / Inkmind123) and their `artist_profiles` row
                     with Sun–Thu 10:00–18:00 hours. Zero customers/conversations/appointments —
                     the "day one after setup" state. Destructive; see --force.
  production         Wipes, then seeds a studio running at peak load — a genuinely full
                     appointment calendar for real-scale testing. An onboarded `settings`, N
                     staff (--staff-count, default 5) each with a profile + working hours, a
                     large client base (~1 customer per 2.5 appointments, so lots of repeat
                     clients), and ~M appointments (--appointments, default 1000) spread from
                     ~6 weeks ago to ~7 weeks out. Every working day is busy and ~70% run
                     at/near capacity (4 sessions/artist/day), so most days are packed and
                     near-term availability is essentially gone. Realistic status mix — past
                     appointments completed/no-show/cancelled, upcoming confirmed/pending.
                     Writes ~1400 records over REST, so it takes a minute or two. Destructive;
                     see --force. Pass a smaller --appointments for a lighter book.
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


# ---------------------------------------------------------------------------
# Whole-system scenarios (blank-new / blank-onboarded / production)
#
# Unlike the MCP scenarios above these describe the *entire* system state, so they start by
# wiping every application collection (guarded by a confirmation prompt unless --force).
# ---------------------------------------------------------------------------

# Child collections first so a relation constraint never blocks a parent's delete.
WIPE_ORDER = [
    "messages",
    "audit_log",
    "mcp_actions",
    "mcp_messages",
    "mcp_conversations",
    "waitlist_entries",
    "appointments",
    "conversations",
    "notifications",
    "whatsapp_error_log",
    "faq",
    "credentials",
    "studio_closures",
    "customers",
    "staff",
    "settings",
]

# Sun–Thu 10:00–18:00 — mirrors DEFAULT_HOURS_PRESET in
# src/features/onboarding/server/onboarding.ts (dayOfWeek 0 = Sunday).
DEFAULT_WORK_HOURS = [
    {"dayOfWeek": day, "startTime": "10:00", "endTime": "18:00"} for day in (0, 1, 2, 3, 4)
]
# Mirrors DEFAULT_ARTIST_FLEXIBILITY in src/features/settings/server/profiles.ts.
DEFAULT_FLEXIBILITY = {"allowTier2": True, "tier2ExtensionMinutes": 90, "tier2MaxSessionMinutes": 60}

HEB_FIRST_NAMES = [
    "דנה", "נועה", "מאיה", "יעל", "תמר", "רוני", "שירה", "ליאור", "אורי", "איתי",
    "עומר", "נדב", "גיא", "עדן", "טל", "שחר", "אלה", "הדר", "אביב", "יובל", "רותם", "ניר",
]
HEB_LAST_NAMES = [
    "כהן", "לוי", "מזרחי", "פרץ", "ביטון", "אברהם", "פרידמן", "דהן", "אזולאי", "גבאי",
    "שרון", "ברק", "נחמיאס", "אוחיון", "בן דוד", "אשכנזי",
]
ARTIST_BIOS = [
    "מתמחה בריאליזם ובשחור-לבן, 8 שנות ותק.",
    "פיין-ליין ועיצובים מינימליסטיים עדינים.",
    "בלאקוורק וגיאומטריה, אוהב פרויקטים גדולים.",
    "צבע וסטייל ניאו-טרדישיונל.",
    "כתב, לטרינג וקעקועים קטנים.",
]
TATTOO_DESCRIPTIONS = [
    "פרח קטן על היד", "שם בכתב יד על האמה", "אריה על הזרוע", "עיצוב גיאומטרי על הגב",
    "ציפור מעופפת על הכתף", "משפט קצר על הצלע", "שרוול חצי — מוטיב בוטני", "נחש סביב הקרסול",
]


def random_person_name():
    return f"{random.choice(HEB_FIRST_NAMES)} {random.choice(HEB_LAST_NAMES)}"


def delete_all(token, collection):
    """Delete every record in a collection, page by page (superuser bypasses API rules)."""
    removed = 0
    while True:
        result = pb_request("GET", f"/api/collections/{collection}/records?perPage=200", token=token)
        items = result.get("items", [])
        if not items:
            break
        for item in items:
            pb_request("DELETE", f"/api/collections/{collection}/records/{item['id']}", token=token)
            removed += 1
    if removed:
        print(f"  - {collection}: deleted {removed}")
    return removed


def wipe_all(token, force=False):
    if not force:
        reply = input(f"\n⚠  This DELETES ALL DATA in {PB_URL}. Type 'wipe' to continue: ").strip()
        if reply != "wipe":
            raise SystemExit("Aborted — nothing was changed.")
    print("Wiping every application collection...")
    for collection in WIPE_ORDER:
        delete_all(token, collection)


def create_onboarded_settings(token):
    """The singleton `settings` row exactly as it looks right after onboarding completes."""
    return create(
        token,
        "settings",
        {
            "studio_name": "Inkmind Studio",
            "timezone": "Asia/Jerusalem",  # STUDIO_TIMEZONE (src/lib/timezone.ts)
            "currency": "ILS",
            "ai_enabled": True,
            "bot_schedule_mode": "always_on",
            "deposit_required": True,
            "deposit_amount": 150,
            "cancellation_cutoff_hours": 48,
            "payment_instructions": "העברה בביט/פייבוקס למספר 050-0000000.",
            "onboarding_completed": True,
        },
    )


def create_staff_with_profile(token, name, email, role, bio, portfolio_url="https://instagram.com/inkmind.tattoo", phone="050-1234567"):
    """Creates a full login-ready staff account with all mandatory artist details (portfolio, phone, work hours)."""
    staff = create(
        token,
        "staff",
        {
            "name": name,
            "email": email,
            "phone": phone,
            "password": "Inkmind123",
            "passwordConfirm": "Inkmind123",
            "role": role,
            "portfolio_url": portfolio_url,
            "bio": bio,
            "work_hours": DEFAULT_WORK_HOURS,
            "active": True,
            "emailVisibility": True,
            "verified": True,
        },
    )
    return staff


def scenario_blank_new(token, force=False):
    wipe_all(token, force=force)
    print("\nDone. The system is completely blank — no settings row, no staff, no data.")
    print("Opening the app should land on the first auth/onboarding step.")


def scenario_blank_onboarded(token, force=False):
    wipe_all(token, force=force)
    print("\nSeeding a freshly-onboarded studio (settings singleton + one owner with full profile)...")
    create_onboarded_settings(token)
    create_staff_with_profile(
        token,
        name="בעל/ת הסטודיו",
        email="owner@inkmind.local",
        phone="050-1234567",
        role="owner",
        portfolio_url="https://instagram.com/inkmind.owner",
        bio="מקעקע/ת ראשי/ת ובעל/ת הסטודיו.",
    )
    print("\nDone. onboarding_completed = true, one owner artist with Sun–Thu 10:00–18:00 hours,")
    print("and zero customers / conversations / appointments — the 'day one after setup' state.")
    print("Login: owner@inkmind.local / Inkmind123")


def scenario_production(token, staff_count=5, appointment_count=1000, force=False):
    wipe_all(token, force=force)
    print(f"\nSeeding a studio at peak load: {staff_count} staff, ~{appointment_count} appointments.")
    print("This writes a lot of records one-by-one over the REST API — give it a minute or two.")
    create_onboarded_settings(token)

    staff_ids = [
        create_staff_with_profile(
            token,
            name="בעל/ת הסטודיו",
            email="owner@inkmind.local",
            role="owner",
            bio="מקעקע/ת ראשי/ת ובעל/ת הסטודיו.",
        )["id"]
    ]
    for i in range(max(0, staff_count - 1)):
        staff_ids.append(
            create_staff_with_profile(
                token,
                name=random_person_name(),
                email=f"artist{i + 1}@inkmind.local",
                role="staff",
                bio=random.choice(ARTIST_BIOS),
            )["id"]
        )

    # A big client base — roughly one customer per 2.5 appointments, so most customers have
    # 2–4 visits on the books (repeat clients) and a real "customers" list to search/scroll.
    customer_count = max(12, round(appointment_count / 2.5))
    print(f"\nCreating {customer_count} customers...")
    customer_ids = [
        create(
            token,
            "customers",
            {
                "name": random_person_name(),
                "phone": random_phone(),
                "source": random.choice(["whatsapp", "instagram", "walk_in", "referral"]),
                "is_vip": random.random() < 0.08,
            },
        )["id"]
        for _ in range(customer_count)
    ]

    # Studio open Sun–Thu (shut Fri/Sat), ~6 weeks back to ~7 weeks out. Each artist runs up to
    # 4 sessions a day (10:00 / 12:00 / 14:00 / 16:00) — a full book.
    base = today_start()
    hours = (10, 12, 14, 16)
    working_days = [
        base + timedelta(days=off)
        for off in range(-42, 50)
        if (base + timedelta(days=off)).weekday() not in (4, 5)  # Fri=4, Sat=5
    ]
    day_capacity = len(hours) * len(staff_ids)

    # Every open day carries a "load": ~70% run at/near capacity (peak), the rest are merely
    # busy. Hand out the target appointment count in proportion to load, capped at capacity —
    # so the whole calendar is dense, with the peak days genuinely full.
    loads = [
        (day, random.uniform(0.82, 1.0) if random.random() < 0.7 else random.uniform(0.45, 0.75))
        for day in working_days
    ]
    weight_total = sum(w for _, w in loads) or 1.0

    booked = []  # (start_datetime, staff_id)
    for day, load in loads:
        want = min(day_capacity, round(appointment_count * load / weight_total))
        slots = [(h, s) for h in hours for s in staff_ids]  # distinct (hour, artist) pairs
        random.shuffle(slots)
        for hour, staff_id in slots[:want]:
            booked.append((day.replace(hour=hour), staff_id))

    random.shuffle(booked)
    now = datetime.now(timezone.utc)
    soon = now + timedelta(days=10)
    customer_day = set()  # (customer_id, date) — nobody overlaps themselves
    created_count = 0
    fully_booked_days = {}
    for start, staff_id in booked:
        customer_id = next(
            (
                c
                for c in random.sample(customer_ids, k=len(customer_ids))
                if (c, start.date()) not in customer_day
            ),
            None,
        )
        if customer_id is None:
            continue
        customer_day.add((customer_id, start.date()))

        if start < now:
            status = random.choices(["completed", "no_show", "cancelled"], weights=[80, 12, 8])[0]
        elif start < soon:
            status = random.choices(["confirmed", "pending"], weights=[92, 8])[0]
        else:
            status = random.choices(["confirmed", "pending"], weights=[70, 30])[0]
        settled = status in ("completed", "confirmed")
        price_min = random.choice([400, 600, 800, 1200, 1800, 2500])
        create(
            token,
            "appointments",
            {
                "customer": customer_id,
                "staff": staff_id,
                "start_time": iso(start),
                "duration_minutes": random.choice([60, 90, 90, 120, 180]),
                "status": status,
                "source": random.choices(["ai_bot", "staff_manual"], weights=[6, 4])[0],
                "type": random.choices(["tattoo", "sketch"], weights=[5, 1])[0],
                "tattoo_description": random.choice(TATTOO_DESCRIPTIONS),
                "price_min": price_min,
                "price_max": price_min + random.choice([200, 400, 600]),
                "deposit_amount": 150,
                "deposit_paid": settled and random.random() < 0.85,
                "slot_confirmed": settled,
            },
        )
        created_count += 1
        fully_booked_days[start.date()] = fully_booked_days.get(start.date(), 0) + 1

    packed = sum(1 for n in fully_booked_days.values() if n >= day_capacity * 0.9)
    span = sorted(fully_booked_days)
    print(f"\nDone. {len(staff_ids)} staff, {customer_count} customers, {created_count} appointments "
          f"across {len(fully_booked_days)} working days ({span[0]} … {span[-1]}).")
    print(f"{packed} of those days are ≥90% booked — the calendar reads as a studio at peak.")
    print("Login: owner@inkmind.local / Inkmind123  (extra artists: artistN@inkmind.local / Inkmind123)")


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


# Scenarios that describe the whole system: they wipe first and take no --staff-id.
WHOLE_SYSTEM_SCENARIOS = {"blank-new", "blank-onboarded", "production"}

SCENARIOS = {
    "blank-new": scenario_blank_new,
    "blank-onboarded": scenario_blank_onboarded,
    "production": scenario_production,
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
    parser.add_argument("--force", action="store_true", help="whole-system scenarios (blank-new/blank-onboarded/production): skip the 'type wipe to confirm' prompt")
    parser.add_argument("--staff-count", type=int, default=5, help="'production' only: how many staff to create, owner included (default: 5)")
    parser.add_argument("--appointments", type=int, default=1000, help="'production' only: roughly how many appointments to create (default: 1000 — a full peak-load calendar)")
    args = parser.parse_args()

    token = auth_superuser()

    if args.scenario in WHOLE_SYSTEM_SCENARIOS:
        if args.scenario == "blank-new":
            scenario_blank_new(token, force=args.force)
        elif args.scenario == "blank-onboarded":
            scenario_blank_onboarded(token, force=args.force)
        else:
            scenario_production(
                token,
                staff_count=args.staff_count,
                appointment_count=args.appointments,
                force=args.force,
            )
        return

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
