import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, Copy, Check, ArrowRight, KeyRound, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

// Types
type Step = "CREDENTIALS" | "PROFILE" | "MASTER_PASSWORD" | "BACKUP_CODES";

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

    // Generators
    const generateBackupCodes = () => {
        const codes = [];
        const chars = "abcdefghjkmnpqrstuvwxyz23456789"; // No ambiguous chars (i, l, 1, o, 0)
        for (let i = 0; i < 5; i++) {
            let code = "";
            for (let j = 0; j < 10; j++) {
                if (j === 5) code += "-";
                code += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            codes.push(code);
        }
        setBackupCodes(codes);
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

    const passwordStrength = getPasswordStrength(formData.password);
    const isPasswordStrong = Object.values(passwordStrength).every(Boolean);

    // Input Change Handler to clear error
    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
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
            // Finish
            toast.success("Account Created Successfully!");
            navigate("/vault");
        }
    };

    const copyToClipboard = () => {
        const text = `Aegis Backup Codes:\n${backupCodes.join("\n")}`;
        navigator.clipboard.writeText(text);
        setCopiedCodes(true);
        toast.success("Codes copied to clipboard");
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
        }
    };

    return (
        <div className="w-full max-w-sm mx-auto">
            <div className="mb-8 flex items-center justify-center gap-2">
                {[1, 2, 3, 4].map((i) => {
                    const stepIdx = ["CREDENTIALS", "PROFILE", "MASTER_PASSWORD", "BACKUP_CODES"].indexOf(step) + 1;
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
