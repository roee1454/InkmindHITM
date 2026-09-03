/// <reference path="../pb_data/types.d.ts" />

// Phase 1 Calendar Refactor:
// Direct Node.js TypeScript services now handle all Google Calendar synchronization
// and waitlist matching directly upon appointment creation, updates, and cancellations
// (see src/integrations/google-calendar/server/google-sync.ts).
// Goja-based HTTP callbacks have been safely deprecated to guarantee 100% reliable,
// non-blocking, typed operations with zero port or secret mismatch issues.
