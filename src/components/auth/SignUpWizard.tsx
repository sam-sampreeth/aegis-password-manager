import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, Copy, Check, ArrowRight, KeyRound, Eye, EyeOff, ArrowLeft, Mail, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { generateVaultKey, generateSalt, deriveMasterKey, encryptVaultKey, generateRecoveryCodeData } from "@/lib/crypto";
import { useClipboard } from "@/context/ClipboardContext";

// Types
type Step = "CREDENTIALS" | "PROFILE" | "MASTER_PASSWORD" | "BACKUP_CODES" | "EMAIL_VERIFICATION";

interface SignUpWizardProps {
    initialStep?: Step;
    onBackToLogin: () => void;
}

export function SignUpWizard({ initialStep = "CREDENTIALS", onBackToLogin }: SignUpWizardProps) {
    const [step, setStep] = useState<Step>(initialStep);
    const navigate = useNavigate();

    // Form Stats
    const [formData, setFormData] = useState({
        email: "",
        password: "",
        name: "",
        username: "",
        masterPassword: "",
    });
    const [signupOtp, setSignupOtp] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const [skipTimer, setSkipTimer] = useState(15);
    const [canSkip, setCanSkip] = useState(false);

    // Validations & UI State
    const [errors, setErrors] = useState<Record<string, boolean>>({});
    const [shake, setShake] = useState(0);
    const [showPassword, setShowPassword] = useState(false);

    // Master Password Warning Cooldown
    const [cooldown, setCooldown] = useState(10);
    const [canProceedMP, setCanProceedMP] = useState(false);

    // Backup Codes
    const [backupCodes, setBackupCodes] = useState<string[]>([]);
    const [copiedCodes, setCopiedCodes] = useState(false);

    // Username Validation
    const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
    const [checkingUsername, setCheckingUsername] = useState(false);

    // Generators
    const generateBackupCodes = async () => {
        // Generate vault key and recovery codes
        const vaultKey = generateVaultKey();
        const recoveryData = await generateRecoveryCodeData(vaultKey, 10);
        setBackupCodes(recoveryData.codes);
        // Store vault key AND recovery data temporarily for registration
        sessionStorage.setItem('tempVaultKey', vaultKey);
        sessionStorage.setItem('tempRecoveryData', JSON.stringify(recoveryData));
    };

    // Effects
    useEffect(() => {
        if (step === "MASTER_PASSWORD") {
            setCanProceedMP(false);
            setCooldown(10);
            const timer = setInterval(() => {
                setCooldown((prev) => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        setCanProceedMP(true);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
        if (step === "BACKUP_CODES") {
            generateBackupCodes();
        }
        if (step === "EMAIL_VERIFICATION") {
            setCanSkip(false);
            setSkipTimer(15);
            const timer = setInterval(() => {
                setSkipTimer((prev) => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        setCanSkip(true);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [step]);

    // Check username availability with debounce
    useEffect(() => {
        const checkUsernameAvailability = async () => {
            const username = formData.username.toLowerCase().trim();

            // Reset if empty
            if (!username) {
                setUsernameAvailable(null);
                setCheckingUsername(false);
                return;
            }

            // Only check if basic format is valid
            if (username.length >= 3 && username.length <= 16 && /^[a-z0-9-]+$/.test(username) && !/^\d/.test(username)) {
                try {
                    const { data, error } = await supabase
                        .from('profiles')
                        .select('username')
                        .eq('username', username)
                        .maybeSingle();

                    if (error) throw error;
                    setUsernameAvailable(data === null);
                } catch (error) {
                    console.error('Error checking username:', error);
                    setUsernameAvailable(null);
                } finally {
                    setCheckingUsername(false);
                }
            } else {
                setUsernameAvailable(null);
                setCheckingUsername(false);
            }
        };

        // Show loader immediately when username changes
        if (formData.username.length >= 3) {
            setCheckingUsername(true);
        }

        const timer = setTimeout(checkUsernameAvailability, 2000);
        return () => clearTimeout(timer);
    }, [formData.username]);

    // Password Strength
    const getPasswordStrength = (pass: string) => {
        return {
            length: pass.length >= 8,
            number: /\d/.test(pass),
            special: /[!@#$%^&*(),.?":{}|<>]/.test(pass),
            uppercase: /[A-Z]/.test(pass),
        };
    };

    const passwordStrength = getPasswordStrength(formData.password);
    const isPasswordStrong = Object.values(passwordStrength).every(Boolean);

    // Username Validation
    const getUsernameValidation = (username: string) => {
        return {
            length: username.length >= 3 && username.length <= 16,
            format: /^[a-z0-9-]+$/.test(username) && !/\s/.test(username), // lowercase, numbers, hyphens only, no spaces
            noNumberStart: username.length > 0 && !/^\d/.test(username),
            available: usernameAvailable === true,
        };
    };

    const usernameValidation = getUsernameValidation(formData.username);
    const isUsernameValid = usernameValidation.length && usernameValidation.format && usernameValidation.noNumberStart && usernameValidation.available;

    // Input Change Handler to clear error
    const handleChange = (field: string, value: string) => {
        // Auto-lowercase username
        const finalValue = field === 'username' ? value.toLowerCase() : value;
        setFormData(prev => ({ ...prev, [field]: finalValue }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: false }));
        }
    };

    // Handlers
    const handleNext = () => {
        const newErrors: Record<string, boolean> = {};
        const missingFields: string[] = [];

        if (step === "CREDENTIALS") {
            if (!formData.email) { newErrors.email = true; missingFields.push("Email"); }
            if (!formData.password) { newErrors.password = true; missingFields.push("Password"); }

            if (Object.keys(newErrors).length > 0) {
                setErrors(newErrors);
                setShake(prev => prev + 1);
                toast.error(`${missingFields.join(" and ")} is required.`);
                return;
            }

            if (!isPasswordStrong) {
                setShake(prev => prev + 1);
                toast.error("Please meet all password requirements.");
                return;
            }
            setStep("PROFILE");
        } else if (step === "PROFILE") {
            if (!formData.name) { newErrors.name = true; missingFields.push("Name"); }
            if (!formData.username) { newErrors.username = true; missingFields.push("Username"); }

            if (Object.keys(newErrors).length > 0) {
                setErrors(newErrors);
                setShake(prev => prev + 1);
                toast.error(`${missingFields.join(" and ")} is required.`);
                return;
            }

            if (!isUsernameValid) {
                setShake(prev => prev + 1);
                toast.error("Please meet all username requirements.");
                return;
            }
            setStep("MASTER_PASSWORD");
        } else if (step === "MASTER_PASSWORD") {
            if (!formData.masterPassword) {
                newErrors.masterPassword = true;
                setErrors(newErrors);
                setShake(prev => prev + 1);
                toast.error("Master Password is required.");
                return;
            }
            setStep("BACKUP_CODES");
        } else if (step === "BACKUP_CODES") {
            if (!copiedCodes) {
                setShake(prev => prev + 1);
                toast.error("Please copy your backup codes first.");
                return;
            }
            // Finish & Register
            handleRegistration();
        }
    };

    const handleRegistration = async () => {
        try {
            // 1. Sign Up User
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    emailRedirectTo: window.location.origin + "/auth",
                    data: {
                        display_name: formData.name,
                        username: formData.username,
                    }
                }
            });

            if (authError) throw authError;

            if (!authData.user) throw new Error("User creation failed");

            setUserId(authData.user.id);

            // Move to email verification step
            toast.success("Verification code sent to your email");
            setStep("EMAIL_VERIFICATION");

        } catch (error: any) {
            console.error("Registration error:", error);
            toast.error(error.message || "Registration failed");
        }
    };

    const verifySignupOtp = async (code: string) => {
        if (code.length < 8) {
            toast.error("Please enter a valid 8-digit code");
            return;
        }

        setIsLoading(true);
        try {
            const { data, error } = await supabase.auth.verifyOtp({
                email: formData.email,
                token: code,
                type: 'signup',
            });

            if (error) throw error;
            if (!data.user) throw new Error("Verification failed");

            toast.success("Email verified successfully");
            await completeRegistration(data.user.id);
        } catch (error: any) {
            toast.error(error.message || "Invalid or expired code");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSkipVerification = async () => {
        if (!userId) {
            toast.error("User ID not found. Please try signing up again.");
            return;
        }

        toast.info("Skipping verification. You can verify your email later in Settings.");
        await completeRegistration(userId);
    };

    const completeRegistration = async (userId: string) => {
        try {
            setIsLoading(true);
            // 2. Generate and encrypt vault key
            let vaultKey = sessionStorage.getItem('tempVaultKey');
            if (!vaultKey) {
                console.warn("Vault key not found, regenerating");
                vaultKey = generateVaultKey();
            }

            const salt = generateSalt();
            const masterKey = await deriveMasterKey(formData.masterPassword, salt);
            const encryptedVaultKey = await encryptVaultKey(vaultKey, masterKey);

            // 3. Get recovery codes from session storage (generated earlier)
            const storedRecoveryData = sessionStorage.getItem('tempRecoveryData');
            let recoveryCodesJson: string;

            if (storedRecoveryData) {
                // Use the recovery data that was shown to the user
                recoveryCodesJson = storedRecoveryData;
            } else {
                // Fallback: generate new codes (shouldn't happen in normal flow)
                console.warn("Recovery data not found in session, regenerating");
                const recoveryData = await generateRecoveryCodeData(vaultKey, 10);
                recoveryCodesJson = JSON.stringify(recoveryData);
            }

            // 4. Store encrypted data in user_settings
            const { error: settingsError } = await supabase
                .from('user_settings')
                .upsert({
                    user_id: userId,
                    encrypted_vault_key: encryptedVaultKey,
                    vault_key_salt: salt,
                    encrypted_recovery_codes: recoveryCodesJson,
                    clipboard_clear_seconds: 0, // Disabled by default
                } as any);

            if (settingsError) throw settingsError;

            // 5. Update profile
            const { error: profileError } = await supabase
                .from('profiles')
                .upsert({
                    id: userId,
                    display_name: formData.name,
                    username: formData.username,
                } as any);

            if (profileError) {
                console.error("Profile update error:", profileError);
            }

            // 6. Store vault key in session for immediate use
            sessionStorage.setItem('vaultKey', vaultKey);
            sessionStorage.removeItem('tempVaultKey');
            sessionStorage.removeItem('tempRecoveryData');

            // 7. Log recovery codes generation
            await (supabase.from('vault_activity') as any).insert({
                user_id: userId,
                event_type: 'recovery_codes_generated',
                metadata: { timestamp: new Date().toISOString() }
            });

            toast.success("Account Created Successfully!");
            navigate("/vault");

        } catch (error: any) {
            console.error("Completion error:", error);
            toast.error("Account verified but profile setup failed. Please try logging in.");
            navigate("/auth");
        } finally {
            setIsLoading(false);
        }
    };

    const { copyToClipboard: secureCopy } = useClipboard();

    const copyToClipboard = () => {
        const text = `Aegis Backup Codes:\n${backupCodes.join("\n")}`;
        secureCopy(text, "Backup Codes");
        setCopiedCodes(true);
    };

    const renderStep = () => {
        switch (step) {
            case "CREDENTIALS":
                return (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-4"
                    >
                        <div className="space-y-2">
                            <Label htmlFor="email" className={errors.email ? "text-red-500" : ""}>Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="name@example.com"
                                value={formData.email}
                                onChange={(e) => handleChange("email", e.target.value)}
                                className={cn(errors.email && "border-red-500 focus-visible:ring-red-500")}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password" className={errors.password ? "text-red-500" : ""}>Password</Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    value={formData.password}
                                    onChange={(e) => handleChange("password", e.target.value)}
                                    className={cn("pr-10", errors.password && "border-red-500 focus-visible:ring-red-500")}
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

                        {/* Password Requirements - Only show if password is not empty */}
                        <AnimatePresence>
                            {formData.password.length > 0 && (
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

                        <motion.div
                            key={shake}
                            animate={{ x: shake ? [-10, 10, -10, 10, 0] : 0 }}
                            transition={{ duration: 0.4 }}
                        >
                            <Button className="w-full" onClick={handleNext}>
                                Next <ArrowRight className="ml-2 w-4 h-4" />
                            </Button>
                        </motion.div>
                        <div className="text-center text-sm">
                            <span className="text-muted-foreground">
                                Already have an account?{" "}
                            </span>
                            <button
                                onClick={onBackToLogin}
                                className="font-medium text-primary underline-offset-4 hover:underline"
                            >
                                Sign in
                            </button>
                        </div>
                    </motion.div>
                );
            case "PROFILE":
                return (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-4"
                    >
                        <div className="space-y-2">
                            <Label htmlFor="name" className={errors.name ? "text-red-500" : ""}>Full Name</Label>
                            <Input
                                id="name"
                                placeholder="John Doe"
                                value={formData.name}
                                onChange={(e) => handleChange("name", e.target.value)}
                                className={cn(errors.name && "border-red-500 focus-visible:ring-red-500")}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="username" className={errors.username ? "text-red-500" : ""}>Username</Label>
                            <Input
                                id="username"
                                placeholder="johndoe123"
                                value={formData.username}
                                onChange={(e) => handleChange("username", e.target.value)}
                                className={cn(errors.username && "border-red-500 focus-visible:ring-red-500")}
                            />
                        </div>

                        {/* Username Requirements - Only show if username is not empty */}
                        <AnimatePresence>
                            {formData.username.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="space-y-2 bg-zinc-900/50 p-3 rounded-md border border-white/5 overflow-hidden"
                                >
                                    <p className="text-xs font-medium text-muted-foreground mb-2">Username Requirements:</p>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div className={`flex items-center gap-1.5 ${usernameValidation.length ? "text-green-500" : "text-neutral-500"}`}>
                                            {usernameValidation.length ? <Check className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border border-current" />}
                                            3-16 characters
                                        </div>
                                        <div className={`flex items-center gap-1.5 ${usernameValidation.format ? "text-green-500" : "text-neutral-500"}`}>
                                            {usernameValidation.format ? <Check className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border border-current" />}
                                            Lowercase, hyphens only
                                        </div>
                                        <div className={`flex items-center gap-1.5 ${usernameValidation.noNumberStart ? "text-green-500" : "text-neutral-500"}`}>
                                            {usernameValidation.noNumberStart ? <Check className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border border-current" />}
                                            No number at start
                                        </div>
                                        <div className={`flex items-center gap-1.5 ${checkingUsername ? "text-blue-400" : usernameValidation.available ? "text-green-500" : usernameAvailable === false ? "text-red-500" : "text-neutral-500"}`}>
                                            {checkingUsername ? (
                                                <div className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                                            ) : usernameValidation.available ? (
                                                <Check className="w-3 h-3" />
                                            ) : (
                                                <div className="w-3 h-3 rounded-full border border-current" />
                                            )}
                                            {checkingUsername ? "Checking..." : "Available"}
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                        <motion.div
                            key={shake}
                            animate={{ x: shake ? [-10, 10, -10, 10, 0] : 0 }}
                            transition={{ duration: 0.4 }}
                        >
                            <Button className="w-full" onClick={handleNext}>
                                Next <ArrowRight className="ml-2 w-4 h-4" />
                            </Button>
                        </motion.div>
                    </motion.div>
                );
            case "MASTER_PASSWORD":
                return (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-6"
                    >
                        <div className="rounded-md bg-red-500/15 p-4 border border-red-500/20">
                            <div className="flex gap-3">
                                <ShieldAlert className="h-5 w-5 text-red-400 shrink-0" />
                                <div className="space-y-1">
                                    <h4 className="text-sm font-medium text-red-500">Crucial Security Step</h4>
                                    <p className="text-sm text-red-400/90 leading-relaxed">
                                        Your Master Password encrypts your entire vault.
                                        <strong> It cannot be recovered by us or anyone else.</strong>
                                        If you lose it, you lose access to your data forever.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="master-password" className={errors.masterPassword ? "text-red-500" : ""}>Create Master Password</Label>
                            <Input
                                id="master-password"
                                type="password"
                                className={cn("border-blue-500/30 focus:border-blue-500", errors.masterPassword && "border-red-500 focus-visible:ring-red-500")}
                                value={formData.masterPassword}
                                onChange={(e) => handleChange("masterPassword", e.target.value)}
                            />
                        </div>

                        <motion.div
                            key={shake}
                            animate={{ x: shake ? [-10, 10, -10, 10, 0] : 0 }}
                            transition={{ duration: 0.4 }}
                        >
                            <Button
                                className="w-full"
                                onClick={handleNext}
                                disabled={!canProceedMP}
                                variant={canProceedMP ? "default" : "secondary"}
                            >
                                {canProceedMP ? (
                                    <>I Understand, Continue <ArrowRight className="ml-2 w-4 h-4" /></>
                                ) : (
                                    <>Please Read Warning ({cooldown}s)</>
                                )}
                            </Button>
                        </motion.div>
                    </motion.div>
                );
            case "BACKUP_CODES":
                return (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-6"
                    >
                        <div className="text-center space-y-2">
                            <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <KeyRound className="w-6 h-6 text-blue-500" />
                            </div>
                            <h3 className="text-lg font-medium">Save Your Backup Codes</h3>
                            <p className="text-sm text-muted-foreground">
                                Use these codes to access your account if you lose your Master Password or 2FA device.
                            </p>
                        </div>

                        <div className="bg-zinc-900/50 border border-white/10 rounded-lg p-4 space-y-2 font-mono text-sm text-center">
                            {backupCodes.map((code, idx) => (
                                <div key={idx} className="text-neutral-300 tracking-wider">
                                    {code}
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-3">
                            <Button variant="outline" className="flex-1" onClick={copyToClipboard}>
                                {copiedCodes ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                                {copiedCodes ? "Copied" : "Copy Codes"}
                            </Button>
                            <motion.div
                                className="flex-1"
                                key={shake + "btn"}
                                animate={{ x: shake ? [-10, 10, -10, 10, 0] : 0 }}
                                transition={{ duration: 0.4 }}
                            >
                                <Button className="w-full" onClick={handleNext} disabled={!copiedCodes}>
                                    I've Saved Them
                                </Button>
                            </motion.div>
                        </div>
                    </motion.div>
                );
            case "EMAIL_VERIFICATION":
                return (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-6"
                    >
                        <div className="space-y-2 text-center">
                            <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Mail className="w-6 h-6 text-blue-500" />
                            </div>
                            <h2 className="text-2xl font-semibold tracking-tight">Verify your email</h2>
                            <p className="text-sm text-neutral-400 text-center">
                                We've sent an 8-digit code to <span className="text-white font-medium">{formData.email}</span>
                            </p>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <Label>Verification Code</Label>
                                <div className="flex gap-2 justify-center">
                                    {[0, 1, 2, 3, 4, 5, 6, 7].map((index) => (
                                        <Input
                                            key={index}
                                            id={`otp-${index}`}
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={1}
                                            className="w-10 h-12 text-center text-xl font-mono p-0"
                                            value={signupOtp[index] || ""}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                if (!/^\d*$/.test(val)) return;
                                                const newOtp = signupOtp.split("");
                                                newOtp[index] = val;
                                                const finalOtp = newOtp.join("").slice(0, 8);
                                                setSignupOtp(finalOtp);
                                                if (val && index < 7) {
                                                    (document.getElementById(`otp-${index + 1}`) as HTMLInputElement)?.focus();
                                                }
                                                if (finalOtp.length === 8) verifySignupOtp(finalOtp);
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === "Backspace" && !signupOtp[index] && index > 0) {
                                                    (document.getElementById(`otp-${index - 1}`) as HTMLInputElement)?.focus();
                                                }
                                            }}
                                            autoComplete="one-time-code"
                                            disabled={isLoading}
                                        />
                                    ))}
                                </div>
                            </div>

                            <Button
                                className="w-full"
                                disabled={isLoading || signupOtp.length < 8}
                                onClick={() => verifySignupOtp(signupOtp)}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Verifying...
                                    </>
                                ) : (
                                    <>
                                        Verify Email
                                        <ArrowRight className="w-4 h-4 ml-2" />
                                    </>
                                )}
                            </Button>

                            {canSkip ? (
                                <Button
                                    variant="outline"
                                    className="w-full border-blue-500/50 text-blue-400 hover:bg-blue-500/10 transition-all duration-300 animate-in fade-in slide-in-from-bottom-2"
                                    onClick={handleSkipVerification}
                                    disabled={isLoading}
                                >
                                    Skip for now (Verify Later)
                                </Button>
                            ) : (
                                <p className="text-xs text-center text-neutral-500 transition-all duration-300">
                                    Not receiving the code? Skip in {skipTimer}s
                                </p>
                            )}

                            <Button
                                variant="ghost"
                                className="w-full"
                                onClick={() => setStep("PROFILE")}
                                disabled={isLoading}
                            >
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Back
                            </Button>
                        </div>
                    </motion.div>
                );
        }
    };

    return (
        <div className="w-full max-w-sm mx-auto">
            <div className="mb-8 flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map((i) => {
                    const stepIdx = ["CREDENTIALS", "PROFILE", "MASTER_PASSWORD", "BACKUP_CODES", "EMAIL_VERIFICATION"].indexOf(step) + 1;
                    return (
                        <div
                            key={i}
                            className={`h-1.5 w-8 rounded-full transition-colors duration-300 ${i <= stepIdx ? "bg-blue-500" : "bg-neutral-800"
                                }`}
                        />
                    );
                })}
            </div>

            <AnimatePresence mode="wait">
                {renderStep()}
            </AnimatePresence>
        </div>
    );
}
