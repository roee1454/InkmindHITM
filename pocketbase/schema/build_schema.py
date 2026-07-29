#!/usr/bin/env python3
"""
Creates the Inkmind CRM Pocketbase schema from scratch, in dependency order,
substituting real collection IDs into relation fields as each collection is
created (avoids gambling on name-based collectionId resolution).

Single-tenant: one studio per deployment. Studio-wide config (name, timezone,
currency, business hours, WhatsApp/Google credentials) lives in the single
`settings` record, not a `studios` collection.

Usage: python3 pocketbase/schema/build_schema.py
Requires PB_URL / PB_SUPERUSER_EMAIL / PB_SUPERUSER_PASSWORD in .env.
"""
import sys
import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(SCRIPT_DIR, "..", "..", ".claude", "skills", "pocketbase", "scripts"))
from pb_config import pb_authed_request, PBRequestError  # noqa: E402

ids = {}


def rel(name, max_select=1, required=True, cascade=False):
    return {
        "type": "relation",
        "collectionId": ids[name],
        "maxSelect": max_select,
        "required": required,
        "cascadeDelete": cascade,
    }


def create(definition):
    name = definition["name"]
    try:
        data = pb_authed_request("POST", "/api/collections", data=definition)
        ids[name] = data["id"]
        print(f"created {name} -> {data['id']}")
    except PBRequestError as e:
        print(f"FAILED {name}: {e.status} {e.data}")
        sys.exit(1)


def f(name, type_, **kwargs):
    return {"name": name, "type": type_, **kwargs}


# ---------------------------------------------------------------------------
# 1. staff — auth collection
# ---------------------------------------------------------------------------
create({
    "name": "staff",
    "type": "auth",
    "fields": [
        f("role", "select", required=True, values=["owner", "admin", "staff"], maxSelect=1),
        f("name", "text", required=True, max=200),
        f("phone", "text", max=32),
        f("avatar", "file", maxSelect=1, mimeTypes=["image/png", "image/jpeg", "image/webp"]),
        f("active", "bool"),
        f("calendar_feed_token", "text", autogeneratePattern="[a-z0-9]{24}"),
    ],
    "indexes": ["CREATE UNIQUE INDEX idx_staff_calendar_feed_token ON staff (calendar_feed_token)"],
    "listRule": "@request.auth.id != ''", "viewRule": "@request.auth.id != ''",
    "createRule": None, "updateRule": None, "deleteRule": None,
})

# ---------------------------------------------------------------------------
# 2. artist_profiles — 1:1 with staff
# ---------------------------------------------------------------------------
create({
    "name": "artist_profiles",
    "type": "base",
    "fields": [
        {**f("staff", "relation"), **rel("staff")},
        f("portfolio_website", "url"),
        f("portfolio_instagram", "url"),
        f("portfolio_facebook", "url"),
        f("tattoo_styles", "select", values=[
            "fine_line", "traditional", "neo_traditional", "realism", "blackwork",
            "japanese", "geometric", "watercolor", "tribal", "lettering", "minimalist", "portrait",
        ], maxSelect=12),
        f("bio", "text", max=2000),
        f("work_hours", "json", maxSize=8192),
        f("created", "autodate", onCreate=True),
        f("updated", "autodate", onCreate=True, onUpdate=True),
    ],
    "indexes": ["CREATE UNIQUE INDEX idx_artist_profiles_staff ON artist_profiles (staff)"],
    "listRule": "@request.auth.id != ''", "viewRule": "@request.auth.id != ''",
    "createRule": None, "updateRule": None, "deleteRule": None,
})

# ---------------------------------------------------------------------------
# 3. credentials — Google Calendar OAuth per staff member
# ---------------------------------------------------------------------------
create({
    "name": "credentials",
    "type": "base",
    "fields": [
        {**f("staff", "relation"), **rel("staff")},
        f("provider", "select", required=True, values=["google_calendar"], maxSelect=1),
        f("google_calendar_id", "text", max=200),
        f("access_token", "text", hidden=True, max=4096),
        f("refresh_token", "text", hidden=True, max=4096),
        f("token_expires_at", "date"),
        f("scope", "text", max=500),
        f("connected_at", "autodate", onCreate=True),
    ],
    "indexes": ["CREATE UNIQUE INDEX idx_credentials_staff_provider ON credentials (staff, provider)"],
    "listRule": None, "viewRule": None, "createRule": None, "updateRule": None, "deleteRule": None,
})

# ---------------------------------------------------------------------------
# 4. customers
# ---------------------------------------------------------------------------
create({
    "name": "customers",
    "type": "base",
    "fields": [
        f("name", "text", max=200),
        f("phone", "text", required=True, max=32),
        f("whatsapp_chat_id", "text", max=64),
        f("email", "email"),
        f("source", "text", max=100),
        f("is_vip", "bool"),
        f("lead_stage", "select", values=[
            "new", "intake", "awaiting_price", "awaiting_payment", "booked", "lost",
        ], maxSelect=1),
        f("notes", "text", max=5000),
        f("created", "autodate", onCreate=True),
        f("updated", "autodate", onCreate=True, onUpdate=True),
    ],
    "indexes": ["CREATE UNIQUE INDEX idx_customers_phone ON customers (phone)"],
    "listRule": "@request.auth.id != ''", "viewRule": "@request.auth.id != ''",
    "createRule": "@request.auth.id != ''", "updateRule": "@request.auth.id != ''", "deleteRule": None,
})

# ---------------------------------------------------------------------------
# 5. appointments
# ---------------------------------------------------------------------------
create({
    "name": "appointments",
    "type": "base",
    "fields": [
        {**f("customer", "relation"), **rel("customers")},
        {**f("staff", "relation"), **rel("staff", required=False)},
        f("start_time", "date", required=True),
        f("duration_hours", "number", min=0.5, max=24),
        f("status", "select", required=True, values=["pending", "confirmed", "cancelled", "completed"], maxSelect=1),
        f("tattoo_description", "text", max=2000),
        f("price_amount", "number", min=0),
        f("deposit_paid", "bool"),
        f("notes", "text", max=2000),
        f("is_exception", "bool"),
        f("customer_name_override", "text", max=200),
        f("customer_phone_override", "text", max=32),
        f("google_event_id", "text", max=200),
        f("google_sync_status", "select", values=["synced", "pending", "push_failed"], maxSelect=1),
        f("reminder_24h_sent_at", "date"),
        f("nps_sent_at", "date"),
        f("source", "select", values=["ai_bot", "staff_manual"], maxSelect=1),
        f("created", "autodate", onCreate=True),
        f("updated", "autodate", onCreate=True, onUpdate=True),
    ],
    "listRule": "@request.auth.id != ''", "viewRule": "@request.auth.id != ''",
    "createRule": "@request.auth.id != ''", "updateRule": "@request.auth.id != ''", "deleteRule": None,
})

# ---------------------------------------------------------------------------
# 6. conversations — thread-level AI/staff handoff state
# ---------------------------------------------------------------------------
create({
    "name": "conversations",
    "type": "base",
    "fields": [
        {**f("customer", "relation"), **rel("customers")},
        {**f("assigned_staff", "relation"), **rel("staff", required=False)},
        f("status", "select", required=True, values=["bot_active", "escalated", "staff_handling", "closed"], maxSelect=1),
        f("state", "text", max=100),
        f("tattoo_info", "json", maxSize=16384),
        f("is_staff_called", "bool"),
        f("staff_call_reason", "text", max=500),
        f("last_message_at", "date"),
        f("whatsapp_window_expires_at", "date"),
        f("created", "autodate", onCreate=True),
        f("updated", "autodate", onCreate=True, onUpdate=True),
    ],
    "indexes": ["CREATE UNIQUE INDEX idx_conversations_customer ON conversations (customer)"],
    "listRule": "@request.auth.id != ''", "viewRule": "@request.auth.id != ''",
    "createRule": None, "updateRule": "@request.auth.id != ''", "deleteRule": None,
})

# ---------------------------------------------------------------------------
# 7. messages — persisted WhatsApp history (Cloud API gives no history API)
# ---------------------------------------------------------------------------
create({
    "name": "messages",
    "type": "base",
    "fields": [
        {**f("conversation", "relation"), **rel("conversations")},
        f("whatsapp_message_id", "text", required=True, max=200),
        f("direction", "select", required=True, values=["inbound", "outbound"], maxSelect=1),
        f("sender_type", "select", required=True, values=["customer", "ai_bot", "staff"], maxSelect=1),
        {**f("sender_staff", "relation"), **rel("staff", required=False)},
        f("type", "select", required=True, values=["text", "image", "audio", "document", "template", "interactive"], maxSelect=1),
        f("body", "text", max=8192),
        f("media", "file", maxSelect=1),
        f("status", "select", values=["sent", "delivered", "read", "failed"], maxSelect=1),
        f("timestamp", "date", required=True),
        f("created", "autodate", onCreate=True),
    ],
    "indexes": ["CREATE UNIQUE INDEX idx_messages_wa_id ON messages (whatsapp_message_id)"],
    "listRule": "@request.auth.id != ''", "viewRule": "@request.auth.id != ''",
    "createRule": None, "updateRule": None, "deleteRule": None,
})

# ---------------------------------------------------------------------------
# 8. settings — single record for the whole deployment (studio-wide config:
#    name, timezone, currency, AI/WhatsApp/deposit policy). App code must
#    enforce that only one record ever exists.
# ---------------------------------------------------------------------------
create({
    "name": "settings",
    "type": "base",
    "fields": [
        f("studio_name", "text", required=True, max=200),
        f("timezone", "text", required=True, max=64),
        f("currency", "text", required=True, max=8),
        f("ai_enabled", "bool"),
        f("ai_model", "text", max=100),
        f("ai_temperature", "number", min=0, max=2),
        f("ai_max_tokens", "number", min=1),
        f("bot_schedule_mode", "select", values=["always_on", "custom_hours"], maxSelect=1),
        f("bot_active_hours", "json", maxSize=8192),
        f("whatsapp_phone_number_id", "text", max=64),
        f("whatsapp_access_token", "text", hidden=True, max=4096),
        f("whatsapp_business_account_id", "text", max=64),
        f("whatsapp_webhook_verify_token", "text", hidden=True, max=200),
        f("payment_instructions", "text", max=2000),
        f("google_review_link", "url"),
        f("cancellation_cutoff_hours", "number", min=0),
        f("staff_notification_phone", "text", max=32),
        f("default_session_duration_hours", "number", min=0.5),
        f("deposit_required", "bool"),
        f("deposit_amount", "number", min=0),
        f("onboarding_completed", "bool"),
        f("created", "autodate", onCreate=True),
        f("updated", "autodate", onCreate=True, onUpdate=True),
    ],
    "listRule": None, "viewRule": None, "createRule": None, "updateRule": None, "deleteRule": None,
})

# ---------------------------------------------------------------------------
# 9. studio_closures — one-off closed dates
# ---------------------------------------------------------------------------
create({
    "name": "studio_closures",
    "type": "base",
    "fields": [
        f("date", "date", required=True),
        f("reason", "text", max=200),
        f("created", "autodate", onCreate=True),
    ],
    "listRule": "@request.auth.id != ''", "viewRule": "@request.auth.id != ''",
    "createRule": None, "updateRule": None, "deleteRule": None,
})

print("\nAll collections created:", ids)
