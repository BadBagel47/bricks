import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { configureAccess } from './access/client.ts'
import { trackInputModality } from './ui/input-modality.ts'

configureAccess(import.meta.env, location.href)
trackInputModality()
if (location.hash) history.replaceState(null, '', `${location.pathname}${location.search}`)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
