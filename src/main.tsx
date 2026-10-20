import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { db } from './lib/db'

// Dev only: lets local screen tests seed the on-device database
if (import.meta.env.DEV) (window as unknown as { __db: typeof db }).__db = db

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
