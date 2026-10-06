/** Builds the browser-reachable Pocketbase file URL for a message's cached media.
 *  Media is downloaded and stored on the `messages.media` field at ingest time, so this
 *  points straight at Pocketbase — no proxy route and no round-trip to Meta per view. */
export function messageMediaUrl(messageId: string, filename: string): string {
  const base = import.meta.env.VITE_POCKETBASE_URL ?? 'http://127.0.0.1:8090'
  return `${base}/api/files/messages/${messageId}/${encodeURIComponent(filename)}`
}
