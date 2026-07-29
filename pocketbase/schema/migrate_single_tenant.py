#!/usr/bin/env python3
"""
One-off migration: removes multi-tenancy from the schema. Deletes the
`studio` relation field from every collection, updates indexes that were
scoped by studio, then deletes the now-unreferenced `studios` collection.

Usage: python3 pocketbase/schema/migrate_single_tenant.py
"""
import sys
import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(SCRIPT_DIR, "..", "..", ".claude", "skills", "pocketbase", "scripts"))
from pb_config import pb_authed_request, PBRequestError  # noqa: E402

# collection -> new indexes (studio-free)
NEW_INDEXES = {
    "staff": [
        "CREATE UNIQUE INDEX idx_staff_calendar_feed_token ON staff (calendar_feed_token)",
    ],
    "artist_profiles": [
        "CREATE UNIQUE INDEX idx_artist_profiles_staff ON artist_profiles (staff)",
    ],
    "credentials": [
        "CREATE UNIQUE INDEX idx_credentials_staff_provider ON credentials (staff, provider)",
    ],
    "customers": [
        "CREATE UNIQUE INDEX idx_customers_phone ON customers (phone)",
    ],
    "appointments": [],
    "conversations": [
        "CREATE UNIQUE INDEX idx_conversations_customer ON conversations (customer)",
    ],
    "messages": [
        "CREATE UNIQUE INDEX idx_messages_wa_id ON messages (whatsapp_message_id)",
    ],
    "settings": [],
    "studio_closures": [],
}

COLLECTIONS = list(NEW_INDEXES.keys())


def strip_studio_field(name):
    data = pb_authed_request("GET", f"/api/collections/{name}")
    fields = [f for f in data["fields"] if f["name"] != "studio"]
    payload = {"fields": fields, "indexes": NEW_INDEXES[name]}
    pb_authed_request("PATCH", f"/api/collections/{name}", data=payload)
    print(f"updated {name}: removed studio field, {len(fields)} fields remain")


for name in COLLECTIONS:
    try:
        strip_studio_field(name)
    except PBRequestError as e:
        print(f"FAILED {name}: {e.status} {e.data}")
        sys.exit(1)

try:
    pb_authed_request("DELETE", "/api/collections/studios")
    print("deleted studios collection")
except PBRequestError as e:
    print(f"FAILED deleting studios: {e.status} {e.data}")
    sys.exit(1)
