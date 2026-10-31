import { cloudflare } from '@cloudflare/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// MS_STATE_DIR isolates local DO/D1 state per dev server (e.g. parallel e2e runs).
const stateDir = process.env.MS_STATE_DIR

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), cloudflare({ persistState: stateDir ? { path: stateDir } : true })],
})
