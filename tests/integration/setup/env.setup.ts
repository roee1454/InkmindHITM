import { inject } from 'vitest'

// Runs in every test worker before any test module is imported, so server code that reads these
// (getSuperuserClient) talks to the throwaway PocketBase — and dotenv, which never overrides
// variables that are already set, can't point it back at the developer's database.
const pocketbase = inject('pocketbase')
process.env.POCKETBASE_URL = pocketbase.url
process.env.PB_SUPERUSER_EMAIL = pocketbase.email
process.env.PB_SUPERUSER_PASSWORD = pocketbase.password
process.env.PB_TEST_INSTANCE = '1'
