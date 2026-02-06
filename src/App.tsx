import { BrowserRouter, Routes, Route } from "react-router-dom"
import AppLayout from "./layouts/AppLayout"
import LandingPage from "./pages/LandingPage"
import AuthPage from "./pages/AuthPage"
import VaultPage from "./pages/VaultPage"
import TermsPage from "./pages/TermsPage"
import ProfilePage from "./pages/ProfilePage"
import ActionCenterPage from "./pages/ActionCenterPage"
import GeneratorPage from "./pages/GeneratorPage"
import TrashPage from "./pages/TrashPage"
import SettingsPage from "./pages/SettingsPage"
import NotificationsPage from "./pages/NotificationsPage"
import { DashboardLayout } from "./layouts/DashboardLayout"
import { Toaster } from "@/components/ui/sonner"

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Marketing Pages */}
        <Route element={<AppLayout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/terms" element={<TermsPage />} />
        </Route>

        {/* Auth (Standalone) */}
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/auth/signup" element={<AuthPage />} />
        <Route path="/auth/forgot-password" element={<AuthPage />} />

        {/* Dashboard (Protected) */}
        <Route element={<DashboardLayout />}>
          <Route path="/vault" element={<VaultPage />} />
          <Route path="/vault/action-center" element={<ActionCenterPage />} />
          <Route path="/vault/notifications" element={<NotificationsPage />} />
          <Route path="/vault/generator" element={<GeneratorPage />} />
          <Route path="/vault/trash" element={<TrashPage />} />
          <Route path="/vault/settings" element={<SettingsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
      </Routes>
      <Toaster />
    </BrowserRouter>
  )
}

export default App
