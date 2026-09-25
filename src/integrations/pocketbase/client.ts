import PocketBase from 'pocketbase'

/**
 * Browser client — auth persisted to localStorage by the SDK's default AuthStore.
 * Lazily constructed (not a module-scope singleton) so the URL read happens at call
 * time, never baked into the client bundle at module-load time. Requires
 * VITE_POCKETBASE_URL (not POCKETBASE_URL — only VITE_-prefixed vars reach the client).
 *
 * The server-only clients (`createRequestClient`, `getSuperuserClient`) live in
 * `./superuser.server.ts` — kept out of this file so the framework's `.server.ts`
 * convention gives a compile-time guarantee they can never end up in a client bundle,
 * rather than relying on every future importer happening to be server-scoped.
 */
let browserClient: PocketBase | null = null

export function getBrowserClient() {
  browserClient ??= new PocketBase(import.meta.env.VITE_POCKETBASE_URL ?? 'http://127.0.0.1:8090')
  if (!browserClient) {
    let url = import.meta.env.VITE_POCKETBASE_URL ?? 'http://127.0.0.1:8090'
    // Normalize localhost:8090 to 127.0.0.1:8090 to avoid IPv6 [::1] connection issues in Linux/browsers
    if (url.includes('localhost:8090')) {
      url = url.replace('localhost:8090', '127.0.0.1:8090')
    }
    browserClient = new PocketBase(url)
    browserClient.autoCancellation(false)
  }
  return browserClient
}
