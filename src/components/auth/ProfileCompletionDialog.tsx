
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Shield, Loader2, KeyRound, User as UserIcon } from "lucide-react";
import {
    generateVaultKey,
    generateSalt,
    deriveMasterKey,
    encryptVaultKey,
    generateRecoveryCodeData
} from "@/lib/crypto";

export function ProfileCompletionDialog() {
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState(1); // 1: Username, 2: Master Password, 3: Success

    const [username, setUsername] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);

    const [loading, setLoading] = useState(false);
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        if (authLoading || !user || user.id === "demo-user") {
            setChecking(false);
            return;
        }

        // Don't show if we are in the middle of a wizard on AuthPage
        const isAuthWizard = location.pathname.includes("/signup") ||
            location.pathname.includes("/forgot-password") ||
            location.pathname.includes("/reset-password");

        if (isAuthWizard) {
            setChecking(false);
            setOpen(false);
            return;
        }

        const checkCompletion = async () => {
            try {
                // Check profile
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('username')
                    .eq('id', user.id)
                    .single() as { data: { username: string } | null };

                // Check settings for vault key
                const { data: settings } = await supabase
                    .from('user_settings')
                    .select('encrypted_vault_key')
                    .eq('user_id', user.id)
                    .single() as { data: { encrypted_vault_key: string } | null };

                if (!profile?.username || !settings?.encrypted_vault_key) {
                    setOpen(true);
                    if (user.user_metadata?.full_name) {
                        setDisplayName(user.user_metadata.full_name);
                    }
                    if (user.user_metadata?.user_name) {
                        setUsername(user.user_metadata.user_name);
                    }
                }
            } catch (error) {
                console.error("Error checking profile completion:", error);
                // If profile doesn't exist at all, we definitely need to complete it
                setOpen(true);
            } finally {
                setChecking(false);
            }
        };

        checkCompletion();
    }, [user, authLoading]);

    const handleComplete = async () => {
        if (!username || !password) {
            toast.error("Please fill in all fields");
            return;
        }

        if (password !== confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }

        if (password.length < 8) {
            toast.error("Master password must be at least 8 characters");
            return;
        }

        setLoading(true);
        try {
            // 1. Generate Security Elements
            const vaultKey = generateVaultKey();
            const salt = generateSalt();
            const masterKey = await deriveMasterKey(password, salt);
            const encryptedVaultKey = await encryptVaultKey(vaultKey, masterKey);
            const { codes, encryptedVaultKeys } = await generateRecoveryCodeData(vaultKey);
            const encryptedRecoveryCodes = JSON.stringify({ codes, encryptedVaultKeys });

            // 2. Update Profile
            const { error: profileError } = await (supabase
                .from('profiles') as any)
                .upsert({
                    id: user!.id,
                    username,
                    display_name: displayName || username,
                    last_login_at: new Date().toISOString(),
                });

            if (profileError) throw profileError;

            // 3. Update Settings
            const { error: settingsError } = await (supabase
                .from('user_settings') as any)
                .upsert({
                    user_id: user!.id,
                    encrypted_vault_key: encryptedVaultKey,
                    vault_key_salt: salt,
                    encrypted_recovery_codes: encryptedRecoveryCodes,
                    updated_at: new Date().toISOString(),
                });

            if (settingsError) throw settingsError;

            setGeneratedCodes(codes);
            toast.success("Profile setup saved!");
            setStep(3);
        } catch (error: any) {
            toast.error(error.message || "Failed to complete profile");
        } finally {
            setLoading(false);
        }
    };

    const handleCodesSaved = () => {
        setStep(4);
        setTimeout(() => {
            setOpen(false);
            navigate("/vault");
        }, 2000);
    };

    if (checking || !open) return null;

    return (
        <Dialog open={open} onOpenChange={() => { }}>
            <DialogContent className="sm:max-w-[450px] bg-zinc-950 border-white/10 text-white" hideClose>
                <DialogHeader>
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-blue-500/10 rounded-full">
                            <Shield className="w-8 h-8 text-blue-500" />
                        </div>
                    </div>
                    <DialogTitle className="text-2xl text-center">Complete Your Profile</DialogTitle>
                    <DialogDescription className="text-center text-neutral-400">
                        {step === 1
                            ? "Choose how you'll be known in Aegis."
                            : step === 2
                                ? "Set your master password to secure your vault."
                                : step === 3
                                    ? "Save these recovery codes in a safe place."
                                    : "Account secured successfully!"}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {step === 1 && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="username" className="text-neutral-300">Username</Label>
                                <div className="relative">
                                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                                    <Input
                                        id="username"
                                        placeholder="johndoe"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                                        className="bg-white/5 border-white/10 pl-10 focus:ring-blue-500"
                                    />
                                </div>
                                <p className="text-[10px] text-neutral-500">Only lowercase letters, numbers, underscores, and dashes.</p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="display_name" className="text-neutral-300">Display Name (Optional)</Label>
                                <Input
                                    id="display_name"
                                    placeholder="John Doe"
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    className="bg-white/5 border-white/10 focus:ring-blue-500"
                                />
                            </div>
                            <Button
                                className="w-full bg-blue-600 hover:bg-blue-700"
                                onClick={() => username ? setStep(2) : toast.error("Username is required")}
                            >
                                Next Step
                            </Button>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4">
                            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                                <p className="text-xs text-blue-200">
                                    <strong>Tip:</strong> Your master password secures your vault. You can reset it later using your recovery codes if needed.
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="master" className="text-neutral-300">Master Password</Label>
                                <div className="relative">
                                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                                    <Input
                                        id="master"
                                        type="password"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="bg-white/5 border-white/10 pl-10 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="confirm" className="text-neutral-300">Confirm Master Password</Label>
                                <div className="relative">
                                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                                    <Input
                                        id="confirm"
                                        type="password"
                                        placeholder="••••••••"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="bg-white/5 border-white/10 pl-10 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <Button variant="ghost" className="flex-1 border border-white/10" onClick={() => setStep(1)} disabled={loading}>
                                    Back
                                </Button>
                                <Button className="flex-[2] bg-blue-600 hover:bg-blue-700" onClick={handleComplete} disabled={loading}>
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                    Secure My Vault
                                </Button>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-4">
                            <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg flex items-start gap-2">
                                <div className="text-orange-500 mt-0.5">⚠️</div>
                                <p className="text-[10px] text-orange-200">
                                    <strong>One-time display:</strong> These codes will not be shown again. Save them to a text file or printed document.
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-2 p-3 bg-zinc-900/50 rounded-lg border border-white/5 max-h-[200px] overflow-y-auto">
                                {generatedCodes.map((code, idx) => (
                                    <div key={idx} className="flex items-center gap-2 p-1.5 rounded bg-zinc-800/50 border border-white/5">
                                        <span className="text-[10px] text-neutral-500 font-mono">{idx + 1}.</span>
                                        <code className="text-xs font-mono text-white select-all">{code}</code>
                                    </div>
                                ))}
                            </div>

                            <div className="flex gap-3">
                                <Button
                                    variant="outline"
                                    className="flex-1 border-white/10 hover:bg-white/5"
                                    onClick={() => {
                                        navigator.clipboard.writeText(generatedCodes.join("\n"));
                                        toast.success("Codes copied to clipboard");
                                    }}
                                >
                                    Copy All
                                </Button>
                                <Button
                                    className="flex-[2] bg-blue-600 hover:bg-blue-700"
                                    onClick={handleCodesSaved}
                                >
                                    I've Saved Them
                                </Button>
                            </div>
                        </div>
                    )}

                    {step === 4 && (
                        <div className="py-8 flex flex-col items-center justify-center space-y-4">
                            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
                                <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <p className="text-lg font-medium">Setting everything up...</p>
                            <p className="text-sm text-neutral-400">Redirecting to your vault</p>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
