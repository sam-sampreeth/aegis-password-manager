import { Outlet } from "react-router-dom"

export default function AppLayout() {
    return (
        <div className="min-h-screen bg-background text-foreground font-sans antialiased text-white">
            <main>
                <Outlet />
            </main>
        </div>
    )
}
