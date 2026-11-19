import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { configureAccess } from './access/client.ts'
import { trackInputModality } from './ui/input-modality.ts'
import { cloudflareLink } from './net/BackendChoice.tsx'

configureAccess(import.meta.env, location.href)
trackInputModality()
// Private Firebase invitation tokens are read above and taken out of the address; a Cloudflare
// room or lobby link (F-028) stays for the 2 Players screen, which removes its keys itself.
if (location.hash && !cloudflareLink()) history.replaceState(null, '', `${location.pathname}${location.search}`)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
