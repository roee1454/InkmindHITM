#!/usr/bin/env python3
"""
Converts `artist_profiles.tattoo_styles` from a fixed-enum `select` field to a `json`
field. The onboarding UI (StyleTagSelector.tsx) lets artists add arbitrary custom
styles beyond the 12 suggested ones, but a `select` field rejects any value outside
its fixed `values` list — every save with a custom style failed with a raw
"Failed to create record." error. `json` (same type already used for `work_hours`)
accepts any string array.
"""
import sys, os
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(SCRIPT_DIR, "..", "..", ".claude", "skills", "pocketbase", "scripts"))
from pb_config import pb_authed_request, PBRequestError

try:
    collection = pb_authed_request("GET", "/api/collections/artist_profiles")
    fields = collection["fields"]

    # Pocketbase forbids changing a field's type in place — drop the old select field
    # (no real style data exists yet in this dev instance) and add a fresh json field
    # with the same name.
    fields = [f for f in fields if f["name"] != "tattoo_styles"]
    fields.append({"name": "tattoo_styles", "type": "json", "maxSize": 8192, "required": False})

    pb_authed_request("PATCH", "/api/collections/artist_profiles", data={"fields": fields})
    print("artist_profiles.tattoo_styles is now type=json")
except PBRequestError as e:
    print(f"FAILED: {e.status} {e.data}")
    sys.exit(1)
