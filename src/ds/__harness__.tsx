/**
 * Dev-only harness: mounts the design reference outside the app router, for screenshots and the
 * design audit (e2e/design-audit.spec.ts serves it from a Vite dev server). Not imported by the app.
 */
import '../index.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { DesignPage } from '../pages/DesignPage'
import { SkipLink } from './Blocks'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SkipLink />
    <DesignPage />
  </StrictMode>,
)
