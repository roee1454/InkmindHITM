/// <reference path="../pb_data/types.d.ts" />

// Guarantees Google Calendar sync fires for every `appointments` write, regardless of which
// Node code path created/moved/deleted it (dashboard, AI agent, and — eventually — MCP tools).
// The actual Google Calendar/OAuth work stays in Node (googleapis has no Goja equivalent);
// each hook only notifies the app's internal sync endpoint after the write has committed.
// See src/routes/api/internal.appointment-sync.ts for the receiving side and
// src/integrations/google-calendar/server/google-sync.ts for the sync logic itself.
//
// The POST body/URL-building logic is duplicated across the three hooks below on purpose:
// PocketBase evaluates each onRecord*Success callback in its own isolated scope, so a shared
// top-level helper function is NOT visible from inside them (confirmed empirically — a shared
// `function notifyAppointmentSync(...)` here threw `ReferenceError: ... is not defined` at
// runtime, breaking every appointments write). Keep each hook fully self-contained.

onRecordAfterCreateSuccess((e) => {
  const baseUrl = $os.getenv("APP_INTERNAL_URL") || "http://127.0.0.1:3101";
  const secret = $os.getenv("PB_HOOK_SECRET") || "";
  try {
    const res = $http.send({
      url: baseUrl + "/api/internal/appointment-sync",
      method: "POST",
      headers: { "Content-Type": "application/json", "X-PB-Hook-Secret": secret },
      body: JSON.stringify({ event: "create", appointmentId: e.record.get("id") }),
      timeout: 5,
    });
    if (res.statusCode >= 400) {
      console.error("[appointments-hook:create] sync endpoint returned", res.statusCode, res.body);
    }
  } catch (err) {
    // Best-effort: the appointment write already committed successfully by the time this
    // *AfterSuccess* hook runs, so a callback failure here must never surface as a write error.
    console.error("[appointments-hook:create] failed to notify sync endpoint:", err);
  }
  e.next();
}, "appointments");

onRecordAfterUpdateSuccess((e) => {
  const baseUrl = $os.getenv("APP_INTERNAL_URL") || "http://127.0.0.1:3101";
  const secret = $os.getenv("PB_HOOK_SECRET") || "";
  try {
    const res = $http.send({
      url: baseUrl + "/api/internal/appointment-sync",
      method: "POST",
      headers: { "Content-Type": "application/json", "X-PB-Hook-Secret": secret },
      body: JSON.stringify({ event: "update", appointmentId: e.record.get("id") }),
      timeout: 5,
    });
    if (res.statusCode >= 400) {
      console.error("[appointments-hook:update] sync endpoint returned", res.statusCode, res.body);
    }
  } catch (err) {
    console.error("[appointments-hook:update] failed to notify sync endpoint:", err);
  }
  e.next();
}, "appointments");

onRecordAfterDeleteSuccess((e) => {
  const baseUrl = $os.getenv("APP_INTERNAL_URL") || "http://127.0.0.1:3101";
  const secret = $os.getenv("PB_HOOK_SECRET") || "";
  try {
    const res = $http.send({
      url: baseUrl + "/api/internal/appointment-sync",
      method: "POST",
      headers: { "Content-Type": "application/json", "X-PB-Hook-Secret": secret },
      body: JSON.stringify({
        event: "delete",
        record: {
          staff: e.record.get("staff"),
          google_event_id: e.record.get("google_event_id"),
        },
      }),
      timeout: 5,
    });
    if (res.statusCode >= 400) {
      console.error("[appointments-hook:delete] sync endpoint returned", res.statusCode, res.body);
    }
  } catch (err) {
    console.error("[appointments-hook:delete] failed to notify sync endpoint:", err);
  }
  e.next();
}, "appointments");
