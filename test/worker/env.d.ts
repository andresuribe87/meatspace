import type { D1Migration } from '@cloudflare/vitest-plugin'

declare global {
  namespace Cloudflare {
    interface Env {
      /** Injected by vitest.config.ts from ./migrations. */
      TEST_MIGRATIONS: D1Migration[]
    }
  }
}
