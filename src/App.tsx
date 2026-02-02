import { BrowserRouter, Routes, Route } from "react-router-dom"
import AppLayout from "./layouts/AppLayout"
import LandingPage from "./pages/LandingPage"
import AuthPage from "./pages/AuthPage"
import VaultPage from "./pages/VaultPage"

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/vault" element={<VaultPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
