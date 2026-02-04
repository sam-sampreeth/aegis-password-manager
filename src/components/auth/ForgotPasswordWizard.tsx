import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ArrowRight, ShieldAlert, Mail, CheckCircle2, Loader2, Eye, EyeOff, Check } from "lucide-react";
import ReCAPTCHA from "react-google-recaptcha";
import { toast } from "sonner";

type WizardStep = "EMAIL_INPUT" | "OTP_VERIFICATION" | "NEW_PASSWORD" | "SUCCESS";

interface ForgotPasswordWizardProps {
    onBackToLogin: () => void;
}

export function ForgotPasswordWizard({ onBackToLogin }: ForgotPasswordWizardProps) {
    const [step, setStep] = useState<WizardStep>("EMAIL_INPUT");
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [captchaToken, setCaptchaToken] = useState<string | null>(null);

    // Focus management for OTP
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        if (step === "OTP_VERIFICATION") {
            // Focus first input on mount
            setTimeout(() => {
                inputRefs.current[0]?.focus();
            }, 100);
        }
    }, [step]);

    // Password Strength
    const getPasswordStrength = (pass: string) => {
        return {
            length: pass.length >= 8,
            number: /\d/.test(pass),
            special: /[!@#$%^&*(),.?":{}|<>]/.test(pass),
            uppercase: /[A-Z]/.test(pass),
        };
    };

    const passwordStrength = getPasswordStrength(password);
    const isPasswordStrong = Object.values(passwordStrength).every(Boolean);

    const handleOtpChange = (index: number, value: string) => {
        if (value.length > 1) {
            // Handle paste via change event if it slips through
            const pastedData = value.slice(0, 6);
            setOtp(pastedData);
            inputRefs.current[Math.min(5, pastedData.length - 1)]?.focus();

            if (pastedData.length === 6) {
                verifyOtp(pastedData);
            }
            return;
        }

        if (!/^\d*$/.test(value)) return;

        const newOtp = otp.split("");
        // Ensure array is size 6
        while (newOtp.length < 6) newOtp.push("");

        newOtp[index] = value;
        const finalOtp = newOtp.join("").slice(0, 6);
        setOtp(finalOtp);

        // Move to next input if value is entered
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Backspace" && !otp[index] && index > 0) {
            // Move to previous if current is empty
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handleOtpPaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData("text/plain").slice(0, 6).replace(/\D/g, "");
        if (pastedData) {
            setOtp(pastedData);
            inputRefs.current[Math.min(5, pastedData.length - 1)]?.focus();

            if (pastedData.length === 6) {
                verifyOtp(pastedData);
            }
        }
    };

    const handleEmailSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !captchaToken) return;

        setIsLoading(true);
        // Simulate network request
        await new Promise(resolve => setTimeout(resolve, 1500));

        toast.success("Recovery code sent to your email");
        setStep("OTP_VERIFICATION");
        setIsLoading(false);
    };

    const verifyOtp = async (code: string) => {
        if (code.length < 6) {
            toast.error("Please enter a valid 6-digit code");
            return;
        }

        setIsLoading(true);
        // Simulate verification
        await new Promise(resolve => setTimeout(resolve, 1500));

        toast.success("Identity verified");
        setStep("NEW_PASSWORD");
        setIsLoading(false);
    };

    const handleOtpSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        verifyOtp(otp);
    };

    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!isPasswordStrong) {
            toast.error("Please meet all password requirements.");
            return;
        }

        setIsLoading(true);
        // Simulate password reset
        await new Promise(resolve => setTimeout(resolve, 1500));

        toast.success("Password reset successfully");
        setStep("SUCCESS");
        setIsLoading(false);
    };

    return (
        // Added p-1 to prevent ring clipping
        <div className="w-full max-w-md mx-auto relative overflow-hidden p-1">
            <AnimatePresence mode="wait">
                {step === "EMAIL_INPUT" && (
                    <motion.div
                        key="email"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-6"
                    >
                        <div className="space-y-2 text-center">
                            <h2 className="text-2xl font-semibold tracking-tight">Recover Account</h2>
                            <p className="text-sm text-neutral-400">
                                Enter your email to verify your identity
                            </p>
                        </div>

                        {/* Critical Warning */}
                        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 flex gap-3">
                            <ShieldAlert className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                            <div className="space-y-1">
                                <h4 className="text-sm font-medium text-yellow-500">Important Warning</h4>
                                <p className="text-xs text-yellow-500/80 leading-relaxed">
                                    You are resetting your <strong>Account Password</strong>. This will <strong>NOT</strong> reset your Master Password.
                                    If you have lost your Master Password, your vault data is permanently inaccessible unless you have your Backup Codes.
                                </p>
                            </div>
                        </div>

                        <form onSubmit={handleEmailSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email Address</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3 h-4 w-4 text-neutral-500" />
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="name@example.com"
                                        className="pl-9"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        autoFocus
                                        required
                                        disabled={isLoading}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-center">
                                <ReCAPTCHA
                                    sitekey="6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI"
                                    onChange={setCaptchaToken}
                                    theme="dark"
                                />
                            </div>

                            <div className="flex gap-3">
                                <Button type="button" variant="ghost" onClick={onBackToLogin} className="w-1/3" disabled={isLoading}>
                                    Cancel
                                </Button>
                                <Button type="submit" className="flex-1" disabled={isLoading || !captchaToken}>
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Sending...
                                        </>
                                    ) : (
                                        <>
                                            Send Code
                                            <ArrowRight className="w-4 h-4 ml-2" />
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </motion.div>
                )}

                {step === "OTP_VERIFICATION" && (
                    <motion.div
                        key="otp"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-6"
                    >
                        <div className="space-y-2 text-center">
                            <h2 className="text-2xl font-semibold tracking-tight">Check your Inbox</h2>
                            <p className="text-sm text-neutral-400">
                                We sent a 6-digit code to <span className="text-white">{email}</span>
                            </p>
                        </div>

                        <form onSubmit={handleOtpSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="otp-0">Verification Code</Label>
                                <div className="flex gap-2 justify-center" onPaste={handleOtpPaste}>
                                    {[0, 1, 2, 3, 4, 5].map((index) => (
                                        <Input
                                            key={index}
                                            id={`otp-${index}`}
                                            ref={(el) => { inputRefs.current[index] = el }}
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={1}
                                            className="w-12 h-14 text-center text-xl font-mono p-0"
                                            value={otp[index] || ""}
                                            onChange={(e) => handleOtpChange(index, e.target.value)}
                                            onKeyDown={(e) => handleOtpKeyDown(index, e)}
                                            autoComplete="off"
                                            disabled={isLoading}
                                        />
                                    ))}
                                </div>
                                <p className="text-xs text-center text-neutral-500 mt-2">
                                    Didn't receive it? <button type="button" className="text-primary hover:underline" disabled={isLoading}>Resend</button>
                                </p>
                            </div>

                            <div className="flex gap-3">
                                <Button type="button" variant="ghost" onClick={() => setStep("EMAIL_INPUT")} className="w-1/3" disabled={isLoading}>
                                    <ArrowLeft className="w-4 h-4 mr-2" />
                                    Back
                                </Button>
                                <Button type="submit" className="flex-1" disabled={isLoading}>
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Verifying...
                                        </>
                                    ) : (
                                        <>
                                            Verify
                                            <ArrowRight className="w-4 h-4 ml-2" />
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </motion.div>
                )}

                {step === "NEW_PASSWORD" && (
                    <motion.div
                        key="password"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-6"
                    >
                        <div className="space-y-2 text-center">
                            <h2 className="text-2xl font-semibold tracking-tight">Reset Password</h2>
                            <p className="text-sm text-neutral-400">
                                Create a new strong password for your account
                            </p>
                        </div>

                        <form onSubmit={handlePasswordSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="new-password">New Password</Label>
                                <div className="relative">
                                    <Input
                                        id="new-password"
                                        type={showPassword ? "text" : "password"}
                                        className="pr-10"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        autoFocus
                                        required
                                        disabled={isLoading}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            {/* Password Requirements */}
                            <AnimatePresence>
                                {password.length > 0 && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="space-y-2 bg-zinc-900/50 p-3 rounded-md border border-white/5 overflow-hidden"
                                    >
                                        <p className="text-xs font-medium text-muted-foreground mb-2">Password Requirements:</p>
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div className={`flex items-center gap-1.5 ${passwordStrength.length ? "text-green-500" : "text-neutral-500"}`}>
                                                {passwordStrength.length ? <Check className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border border-current" />}
                                                8+ characters
                                            </div>
                                            <div className={`flex items-center gap-1.5 ${passwordStrength.number ? "text-green-500" : "text-neutral-500"}`}>
                                                {passwordStrength.number ? <Check className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border border-current" />}
                                                At least 1 number
                                            </div>
                                            <div className={`flex items-center gap-1.5 ${passwordStrength.uppercase ? "text-green-500" : "text-neutral-500"}`}>
                                                {passwordStrength.uppercase ? <Check className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border border-current" />}
                                                Uppercase letter
                                            </div>
                                            <div className={`flex items-center gap-1.5 ${passwordStrength.special ? "text-green-500" : "text-neutral-500"}`}>
                                                {passwordStrength.special ? <Check className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border border-current" />}
                                                Special char
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Resetting Password...
                                    </>
                                ) : (
                                    "Reset Password"
                                )}
                            </Button>
                        </form>
                    </motion.div>
                )}

                {step === "SUCCESS" && (
                    <motion.div
                        key="success"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center space-y-6 py-8"
                    >
                        <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
                            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-2xl font-semibold tracking-tight">Password Reset Complete</h2>
                            <p className="text-sm text-neutral-400">
                                You can now log in with your new password.
                            </p>
                        </div>
                        <Button className="w-full" onClick={onBackToLogin}>
                            Back to Login
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
