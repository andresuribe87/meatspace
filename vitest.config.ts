import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-plugin'
import { defineConfig } from 'vitest/config'

const migrations = await readD1Migrations('./migrations')

export default defineConfig({
  test: {
    projects: [
      {
        // Runs inside workerd with the real bindings from wrangler.jsonc (DO, D1, rate limiters).
        plugins: [
          cloudflareTest({
            wrangler: { configPath: './wrangler.jsonc' },
            miniflare: { bindings: { TEST_MIGRATIONS: migrations } },
          }),
        ],
        test: { name: 'worker', include: ['test/worker/**/*.test.ts'], setupFiles: ['test/worker/setup.ts'] },
      },
      {
        // Pure logic + install.sh executed under real POSIX shells.
        test: { name: 'unit', include: ['test/unit/**/*.test.ts'], environment: 'node' },
      },
    ],
  },
})
