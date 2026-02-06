import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import DecryptedText from "@/components/reactbits/DecryptedText"
import { motion } from "framer-motion"
import { Github, Eye, EyeOff } from "lucide-react"
import { Meteors } from "@/components/ui/meteors"
import { useLocation, Link, useNavigate } from "react-router-dom"
import { SignUpWizard } from "@/components/auth/SignUpWizard"
import { ForgotPasswordWizard } from "@/components/auth/ForgotPasswordWizard"
import { toast } from "sonner"

export default function AuthPage() {
    const location = useLocation();
    const navigate = useNavigate();

    // Determine mode from URL
    const isSignup = location.pathname.includes("/signup");
    const isForgot = location.pathname.includes("/forgot-password");
    const isLogin = !isSignup && !isForgot;

    // Check if user is already logged in
    useEffect(() => {
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                toast.info("You're already logged in", {
                    className: "!bg-blue-600 !text-white !border-blue-500 font-medium"
                });
                navigate("/vault");
            }
        };
        checkAuth();
    }, [navigate]);

    // If starting with OAuth (simulated), we skip credentials and go to profile
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [shake, setShake] = useState(false);

    const handleGithubLogin = async () => {
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'github',
            });
            if (error) throw error;
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const handleLogin = async () => {
        try {
            setLoading(true);
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;

            toast.success("Welcome back!");
            navigate("/vault");
        } catch (error: any) {
            setShake(true);
            setTimeout(() => setShake(false), 500);
            toast.error(error.message || "Failed to sign in", {
                className: "!bg-red-600 !text-white !border-red-500 font-medium"
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen w-full">
            {/* ... checks out ... */}
            {/* Left Side omitted for brevity, logic remains same */}
            <div className="hidden lg:flex w-1/2 bg-zinc-950 relative items-center justify-center overflow-hidden">
                <div className="absolute inset-0 h-full w-full">
                    <Meteors number={40} />
                </div>
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
                <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[450px]">
                    {!isForgot && (
                        <div className="flex flex-col space-y-2 text-center">
                            <h1 className="text-2xl font-semibold tracking-tight">
                                {isLogin ? "Welcome back" : "Create an account"}
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                {isLogin
                                    ? "Enter your credentials to access your vault"
                                    : "Follow the steps to secure your new vault"}
                            </p>
                        </div>
                    )}

                    {isSignup ? (
                        <SignUpWizard
                            initialStep={"CREDENTIALS"}
                            onBackToLogin={() => {
                                navigate("/auth");
                            }}
                        />
                    ) : isForgot ? (
                        <ForgotPasswordWizard onBackToLogin={() => navigate("/auth")} />
                    ) : (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6"
                        >
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="name@example.com"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="password">Password</Label>
                                    <div className="relative">
                                        <Input
                                            id="password"
                                            type={showPassword ? "text" : "password"}
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="pr-10"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 focus:outline-none"
                                        >
                                            {showPassword ? (
                                                <EyeOff className="h-4 w-4" />
                                            ) : (
                                                <Eye className="h-4 w-4" />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between text-sm">
                                <Label className="flex items-center gap-2 font-normal cursor-pointer">
                                    <Input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
                                    Remember me
                                </Label>
                                <Link
                                    to="/auth/forgot-password"
                                    className="font-medium text-primary hover:underline"
                                >
                                    Forgot password?
                                </Link>
                            </div>

                            <motion.div
                                animate={shake ? { x: [-10, 10, -10, 10, 0] } : {}}
                                transition={{ duration: 0.4 }}
                            >
                                <Button className="w-full" size="lg" onClick={handleLogin} disabled={loading}>
                                    {loading ? "Signing in..." : "Sign In"}
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

                            <Button variant="outline" className="w-full" onClick={handleGithubLogin}>
                                <Github className="mr-2 h-4 w-4" />
                                GitHub
                            </Button>

                            <div className="text-center text-sm">
                                <span className="text-muted-foreground">
                                    Don't have an account?{" "}
                                </span>
                                <Link
                                    to="/auth/signup"
                                    className="font-medium text-primary underline-offset-4 hover:underline"
                                >
                                    Sign up
                                </Link>
                            </div>
                        </motion.div>
                    )}


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
