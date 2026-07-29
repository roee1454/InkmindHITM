#!/usr/bin/env python3
"""
Enables password login on the `staff` collection. Auth is email + password for now
(Google OAuth was tried and reverted — see CLAUDE.md).
"""
import sys, os
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(SCRIPT_DIR, "..", "..", ".claude", "skills", "pocketbase", "scripts"))
from pb_config import pb_authed_request, PBRequestError

try:
    pb_authed_request("PATCH", "/api/collections/staff", data={
        "passwordAuth": {"enabled": True, "identityFields": ["email"]},
    })
    print("staff.passwordAuth.enabled = True")
except PBRequestError as e:
    print(f"FAILED: {e.status} {e.data}")
    sys.exit(1)
