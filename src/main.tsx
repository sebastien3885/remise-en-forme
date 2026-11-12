import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './styles/global.css'

const racine = document.getElementById('root')
if (!racine) {
  throw new Error("L'element #root est introuvable dans index.html")
}

createRoot(racine).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
