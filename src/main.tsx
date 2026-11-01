// Fonts: self-hosted latin subsets in public/fonts, declared with @font-face in index.css (design system v1.0).
import './index.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
