import { Link } from "react-router-dom"

export default function LandingPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center space-y-8">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tighter bg-gradient-to-b from-white to-neutral-400 bg-clip-text text-transparent">
                Aegis Password Manager
            </h1>
            <p className="text-xl text-muted-foreground max-w-[600px]">
                Secure, modern, and beautiful password management for everyone.
            </p>
            <div className="flex gap-4">
                <Link
                    to="/auth"
                    className="px-8 py-3 rounded-full bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
                >
                    Get Started
                </Link>
            </div>
        </div>
    )
}
