import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { AuthProvider } from './context/AuthContext.tsx'
import { ClipboardProvider } from './context/ClipboardContext.tsx'
import App from './App.tsx'

// Console Security Warning
console.log(
  "%cHold Up!",
  "color: #ef4444; font-size: 50px; font-weight: bold; text-shadow: 2px 2px 0px rgba(0,0,0,0.2); font-family: sans-serif;"
);
console.log(
  "%cIf someone told you to paste something here, it's a 100% scam.",
  "font-size: 18px; color: #ffffff; font-family: sans-serif;"
);
console.log(
  "%cPasting anything here could give attackers access to your Aegis vault and your passwords.",
  "font-size: 18px; color: #ffffff; font-family: sans-serif;"
);
console.log(
  "%cUnless you understand exactly what you are doing, close this window and stay safe.",
  "font-size: 18px; color: #ffffff; font-family: sans-serif;"
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <ClipboardProvider>
        <App />
      </ClipboardProvider>
    </AuthProvider>
  </StrictMode>,
)
