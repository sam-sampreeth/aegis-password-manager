import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { AuthProvider } from './context/AuthContext.tsx'
import { ClipboardProvider } from './context/ClipboardContext.tsx'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <ClipboardProvider>
        <App />
      </ClipboardProvider>
    </AuthProvider>
  </StrictMode>,
)
