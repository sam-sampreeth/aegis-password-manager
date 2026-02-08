import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import DecryptedText from "@/components/reactbits/DecryptedText"
import { motion } from "framer-motion"
import { Github, Eye, EyeOff, Shield, Loader2, ArrowLeft, Sparkles } from "lucide-react"
import { Meteors } from "@/components/ui/meteors"
import { useLocation, Link, useNavigate } from "react-router-dom"
import { SignUpWizard } from "@/components/auth/SignUpWizard"
import { ForgotPasswordWizard } from "@/components/auth/ForgotPasswordWizard"
import { toast } from "sonner"

export default function AuthPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const { loginDemo } = useAuth(); // Get loginDemo from context

    // Determine mode from URL
    const isSignup = location.pathname.includes("/signup");
    const isForgot = location.pathname.includes("/forgot-password");
    const isReset = location.pathname.includes("/reset-password");
    const isLogin = !isSignup && !isForgot && !isReset;

    // Check for demo param
    useEffect(() => {
        const searchParams = new URLSearchParams(location.search);
        if (searchParams.get("demo") === "true") {
            setEmail("demo@example.com");
            setPassword("demo123");
        }
    }, [location.search]);

    // Check if user is already logged in
    useEffect(() => {
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                // Only redirect if they have a completed profile
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('username')
                    .eq('id', session.user.id)
                    .single() as any;

                const { data: settings } = await supabase
                    .from('user_settings')
                    .select('encrypted_vault_key')
                    .eq('user_id', session.user.id)
                    .single() as any;

                if (profile?.username && settings?.encrypted_vault_key) {
                    toast.info("You're already logged in", {
                        className: "!bg-blue-600 !text-white !border-blue-500 font-medium"
                    });
                    navigate("/vault");
                }
                // Otherwise, Stay on /auth so ProfileCompletionDialog can show
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
    const [rememberMe, setRememberMe] = useState(true);

    // MFA State
    const [showMfa, setShowMfa] = useState(false);
    const [mfaCode, setMfaCode] = useState("");
    const [mfaLoading, setMfaLoading] = useState(false);
    const [mfaError, setMfaError] = useState("");

    const handleGithubLogin = async () => {
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'github',
                options: {
                    redirectTo: window.location.origin + "/auth"
                }
            });
            if (error) throw error;
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const handleGoogleLogin = async () => {
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin + "/auth"
                }
            });
            if (error) throw error;
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const handleLogin = async () => {
        try {
            setLoading(true);

            // TODO: storage persistence configuration

            // Demo Login Check
            if (email === "demo@example.com" && password === "demo123") {
                await loginDemo();
                toast.success("Welcome to Demo Mode!");
                navigate("/vault");
                return;
            }

            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;

            // Check for MFA enrollment
            const { data, error: mfaError } = await supabase.auth.mfa.listFactors();
            if (mfaError) throw mfaError;

            const totpFactor = data.totp.find(f => f.status === 'verified');

            if (totpFactor) {
                // MFA Enabled - Show Verification Screen
                setShowMfa(true);
            } else {
                // No MFA - Proceed to Vault
                // Re-check profile completion before navigating
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('username')
                        .eq('id', user.id)
                        .single() as any;

                    const { data: settings } = await supabase
                        .from('user_settings')
                        .select('encrypted_vault_key')
                        .eq('user_id', user.id)
                        .single() as any;

                    if (profile?.username && settings?.encrypted_vault_key) {
                        toast.success("Welcome back!");
                        navigate("/vault");
                    }
                    // Else, ProfileCompletionDialog will handle them
                }
            }
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

    const handleMfaVerify = async () => {
        setMfaLoading(true);
        setMfaError("");
        try {
            const { data: factors } = await supabase.auth.mfa.listFactors();
            const totpFactor = factors?.totp.find(f => f.status === 'verified');

            if (!totpFactor) {
                // Should not happen if we got here, but safety check
                navigate("/vault");
                return;
            }

            const { error } = await supabase.auth.mfa.challengeAndVerify({
                factorId: totpFactor.id,
                code: mfaCode,
            });

            if (error) throw error;

            toast.success("Identity Verified");

            // Re-check profile completion
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('username')
                    .eq('id', user.id)
                    .single() as any;

                const { data: settings } = await supabase
                    .from('user_settings')
                    .select('encrypted_vault_key')
                    .eq('user_id', user.id)
                    .single() as any;

                if (profile?.username && settings?.encrypted_vault_key) {
                    navigate("/vault");
                }
                // Else stay on /auth
            }

        } catch (error: any) {
            setMfaError(error.message || "Invalid code");
            setShake(true);
            setTimeout(() => setShake(false), 500);
        } finally {
            setMfaLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen w-full relative">
            <Button
                variant="ghost"
                className="fixed left-8 top-8 text-muted-foreground hover:text-white group z-50 bg-background/20 backdrop-blur-sm lg:bg-transparent"
                onClick={() => navigate("/")}
            >
                <ArrowLeft className="w-4 h-4 mr-2 transition-transform group-hover:-translate-x-1" />
                Back to Home
            </Button>

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
                    {!isForgot && !showMfa && (
                        <div className="flex flex-col space-y-2 text-center">
                            <h1 className="text-2xl font-semibold tracking-tight">
                                {isLogin ? "Welcome back" : isReset ? "Reset Password" : "Create an account"}
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                {isLogin
                                    ? "Enter your credentials to access your vault"
                                    : isReset
                                        ? "Create a new strong password for your account"
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
                    ) : isForgot || isReset ? (
                        <ForgotPasswordWizard
                            onBackToLogin={() => navigate("/auth")}
                            initialStep={isReset ? "NEW_PASSWORD" : "EMAIL_INPUT"}
                        />
                    ) : showMfa ? (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="space-y-6"
                        >
                            <div className="flex flex-col space-y-2 text-center">
                                <div className="flex items-center justify-center p-4 bg-primary/10 rounded-full w-16 h-16 mx-auto mb-2">
                                    <Shield className="w-8 h-8 text-primary" />
                                </div>
                                <h1 className="text-2xl font-semibold tracking-tight">Security Check</h1>
                                <p className="text-sm text-muted-foreground">
                                    Enter the 2FA code from your authenticator app.
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <div className="relative flex justify-center gap-2">
                                        <Input
                                            value={mfaCode}
                                            onChange={(e) => {
                                                setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                                                if (mfaError) setMfaError("");
                                            }}
                                            className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-default"
                                            maxLength={6}
                                            autoFocus
                                            autoComplete="one-time-code"
                                            inputMode="numeric"
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter" && mfaCode.length === 6) {
                                                    handleMfaVerify();
                                                }
                                            }}
                                        />
                                        {Array.from({ length: 6 }).map((_, i) => (
                                            <div
                                                key={i}
                                                className={`w-12 h-14 rounded-lg border flex items-center justify-center text-2xl font-mono transition-all ${mfaCode[i]
                                                    ? "border-primary bg-primary/10 text-primary"
                                                    : i === mfaCode.length
                                                        ? "border-primary/50 bg-background shadow-[0_0_0_1px_rgba(168,85,247,0.4)]"
                                                        : "border-border bg-background text-muted-foreground"
                                                    }`}
                                            >
                                                {mfaCode[i] || ""}
                                            </div>
                                        ))}
                                    </div>
                                    {mfaError && <p className="text-xs text-red-500 text-center font-medium">{mfaError}</p>}
                                </div>

                                <motion.div
                                    animate={shake ? { x: [-10, 10, -10, 10, 0] } : {}}
                                    transition={{ duration: 0.4 }}
                                >
                                    <Button
                                        className="w-full"
                                        size="lg"
                                        onClick={handleMfaVerify}
                                        disabled={mfaLoading || mfaCode.length !== 6}
                                    >
                                        {mfaLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                        Verify Identity
                                    </Button>
                                </motion.div>

                                <Button
                                    variant="ghost"
                                    className="w-full"
                                    onClick={() => {
                                        setShowMfa(false);
                                        setMfaCode("");
                                        setMfaError("");
                                    }}
                                >
                                    Back to Login
                                </Button>
                            </div>
                        </motion.div>
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
                                    <Input
                                        type="checkbox"
                                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                        checked={rememberMe}
                                        onChange={(e) => setRememberMe(e.target.checked)}
                                    />
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

                            <div className="grid grid-cols-2 gap-4">
                                <Button variant="outline" className="w-full" onClick={handleGithubLogin}>
                                    <Github className="mr-2 h-4 w-4" />
                                    GitHub
                                </Button>
                                <Button variant="outline" className="w-full" onClick={handleGoogleLogin}>
                                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="currentColor" stroke="none" />
                                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="currentColor" stroke="none" />
                                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="currentColor" stroke="none" />
                                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="currentColor" stroke="none" />
                                    </svg>
                                    Google
                                </Button>
                            </div>

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
            <div className="fixed bottom-4 right-4 z-50">
                <button
                    onClick={() => {
                        setEmail("demo@example.com");
                        setPassword("demo123");
                        toast.info("Demo credentials populated", {
                            duration: 2000
                        });
                    }}
                    className="text-[10px] text-neutral-500 hover:text-blue-400 transition-colors uppercase tracking-widest font-medium flex items-center gap-1"
                >
                    <Sparkles className="w-3 h-3" />
                    Demo Login
                </button>
            </div>
        </div >
    )
}
