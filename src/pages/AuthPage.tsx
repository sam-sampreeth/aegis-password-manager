import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import DecryptedText from "@/components/reactbits/DecryptedText"
import { motion } from "framer-motion"
import { Github } from "lucide-react"
import Tooltip from "@mui/material/Tooltip"
import { Meteors } from "@/components/ui/meteors"

import { useLocation, Link } from "react-router-dom"

export default function AuthPage() {
    const location = useLocation()
    const [isLogin, setIsLogin] = useState(location.state?.mode !== "signup")

    return (
        <div className="flex min-h-screen w-full">
            {/* Left Side - Visuals */}
            <div className="hidden lg:flex w-1/2 bg-zinc-950 relative items-center justify-center overflow-hidden">
                {/* Meteors */}
                <div className="absolute inset-0 h-full w-full">
                    <Meteors number={40} />
                </div>

                {/* Radial Gradient Accent */}
                <div className="absolute left-0 top-0 h-[500px] w-[500px] -translate-x-[30%] -translate-y-[20%] rounded-full bg-blue-500/20 blur-[100px]"></div>

                <div className="px-8 md:px-20 w-full relative z-20">
                    <h1 className="text-4xl md:text-5xl font-bold text-white max-w-lg leading-relaxed lg:leading-snug">
                        Secure your digital life with{" "}
                        <span className="text-blue-500">
                            unbreakable encryption.
                        </span>
                    </h1>
                    <div className="mt-8 text-neutral-400 text-lg">
                        <DecryptedText
                            text="Your passwords, your data, your control."
                            animateOn="view"
                            revealDirection="start"
                            speed={10}
                            maxIterations={15}
                            className="font-mono text-xl"
                        />
                    </div>
                </div>
            </div>

            {/* Right Side - Form */}
            <div className="flex w-full lg:w-1/2 items-center justify-center bg-background p-8">
                <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
                    <div className="flex flex-col space-y-2 text-center">
                        <h1 className="text-2xl font-semibold tracking-tight">
                            {isLogin ? "Welcome back" : "Create an account"}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {isLogin
                                ? "Enter your credentials to access your vault"
                                : "Enter your email below to create your account"}
                        </p>
                    </div>

                    <motion.div
                        key={isLogin ? "login" : "signup"}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-6"
                    >
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input id="email" type="email" placeholder="name@example.com" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <Input id="password" type="password" required />
                            </div>

                            {!isLogin && (
                                <div className="space-y-2">
                                    <Label htmlFor="confirm-password">Confirm Password</Label>
                                    <Input id="confirm-password" type="password" required />
                                </div>
                            )}
                        </div>

                        {isLogin && (
                            <div className="flex items-center justify-between text-sm">
                                <Label className="flex items-center gap-2 font-normal cursor-pointer">
                                    <Input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
                                    Remember me
                                </Label>
                                <a href="#" className="font-medium text-primary hover:underline">
                                    Forgot password?
                                </a>
                            </div>
                        )}

                        <Button className="w-full" size="lg">
                            {isLogin ? "Sign In" : "Create Account"}
                        </Button>
                    </motion.div>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs">
                            <span className="bg-background px-2 text-muted-foreground">
                                Or continue with
                            </span>
                        </div>
                    </div>

                    <Tooltip title="Coming soon" placement="right" arrow>
                        <span tabIndex={0} className="block w-full mt-4">
                            <Button variant="outline" className="w-full" disabled>
                                <Github className="mr-2 h-4 w-4" />
                                GitHub
                            </Button>
                        </span>
                    </Tooltip>

                    {/* Toggle Link */}
                    <div className="text-center text-sm">
                        <span className="text-muted-foreground">
                            {isLogin ? "Don't have an account? " : "Already have an account? "}
                        </span>
                        <button
                            onClick={() => setIsLogin(!isLogin)}
                            className="font-medium text-primary underline-offset-4 hover:underline"
                        >
                            {isLogin ? "Sign up" : "Sign in"}
                        </button>
                    </div>

                    <p className="px-8 text-center text-sm text-muted-foreground">
                        By clicking continue, you agree to our{" "}
                        <Link
                            to="/terms"
                            className="underline underline-offset-4 hover:text-primary"
                        >
                            Terms of Service
                        </Link>{" "}
                        and{" "}
                        <Link
                            to="/terms#privacy"
                            className="underline underline-offset-4 hover:text-primary"
                        >
                            Privacy Policy
                        </Link>
                        .
                    </p>
                </div>
            </div>
        </div>
    )
}
