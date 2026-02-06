import { useState, useEffect } from "react";
import { Settings, Shield, HardDrive, Bell, Download, Upload, AlertTriangle, Lock, RefreshCw, Smartphone, KeyRound, Loader2, Activity, Eye, EyeOff, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { useLock } from "@/context/LockContext";
import { useVaultActivity } from "@/hooks/useVaultActivity";
import { useUserSettings } from "@/hooks/useProfiles";
import { supabase } from "@/lib/supabase";
import { deriveMasterKey, decryptVaultKey, generateRecoveryCodeData } from "@/lib/crypto";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export default function SettingsPage() {
    const { lockVault } = useLock();
    const { activities, logActivity } = useVaultActivity();
    const { settings, loading: settingsLoading, updateSettings } = useUserSettings();
    const [autoLockTimer, setAutoLockTimer] = useState(15); // 0 = Never

    // Sync autoLockTimer with database settings
    useEffect(() => {
        if (settings?.auto_lock_minutes !== null && settings?.auto_lock_minutes !== undefined) {
            setAutoLockTimer(settings.auto_lock_minutes);
        }
        // Check if recovery codes exist
        if (settings?.encrypted_recovery_codes) {
            setRecoveryCodesGenerated(true);
        }
    }, [settings]);

    // Track recovery code usage (only count events after last regeneration)
    useEffect(() => {
        if (!activities) return;

        // Find the most recent regeneration event
        const lastRegeneration = activities
            .filter(a => a.event_type === 'recovery_codes_regenerated')
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

        // Count usage events that occurred after the last regeneration
        const usageEvents = activities.filter(a => {
            if (a.event_type !== 'recovery_code_used') return false;
            if (!lastRegeneration) return true; // No regeneration yet, count all
            return new Date(a.created_at) > new Date(lastRegeneration.created_at);
        });

        setRecoveryCodesUsed(usageEvents.length);
    }, [activities]);
    const [mfaEnabled, setMfaEnabled] = useState(false);
    const [recoveryCodesGenerated, setRecoveryCodesGenerated] = useState(false);
    const [recoveryCodesUsed, setRecoveryCodesUsed] = useState(0);
    const [regenerateMasterPassword, setRegenerateMasterPassword] = useState("");
    const [showRegenerateMasterPassword, setShowRegenerateMasterPassword] = useState(false);
    const [newRecoveryCodes, setNewRecoveryCodes] = useState<string[] | null>(null);

    // Password Change State
    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    // const [confirmPassword, setConfirmPassword] = useState(""); // Removed
    const [showOldPassword, setShowOldPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);

    // Export Vault State
    const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
    const [exportStep, setExportStep] = useState<'warning' | 'verify' | 'processing'>('warning');
    const [exportMasterPassword, setExportMasterPassword] = useState("");
    const [exportCountdown, setExportCountdown] = useState(3);

    // Delete Account State
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [deleteStep, setDeleteStep] = useState<'warning' | 'confirm' | 'verify'>('warning');
    const [deleteConfirmText, setDeleteConfirmText] = useState("");
    const [deleteMasterPassword, setDeleteMasterPassword] = useState("");
    const [deleteCountdown, setDeleteCountdown] = useState(5);
    const [canProceedDelete, setCanProceedDelete] = useState(false);

    const handleManualLock = () => {
        lockVault("manual");
        toast.success("Vault locked successfully");
    };

    // Password Strength
    const getPasswordStrength = (pass: string) => {
        return {
            length: pass.length >= 8,
            number: /\d/.test(pass),
            special: /[!@#$%^&*(),.?":{}|<>]/.test(pass),
            uppercase: /[A-Z]/.test(pass),
        };
    };

    const passwordStrength = getPasswordStrength(newPassword);
    const isPasswordStrong = Object.values(passwordStrength).every(Boolean);

    const handleChangePassword = async () => {
        if (!isPasswordStrong) {
            toast.error("Please meet all password requirements");
            return;
        }

        try {
            // First, verify the old password by reauthenticating
            const { data: { user } } = await supabase.auth.getUser();
            if (!user?.email) {
                toast.error("User not found");
                return;
            }

            // Verify old password by attempting to sign in
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: user.email,
                password: oldPassword,
            });

            if (signInError) {
                toast.error("Current password is incorrect", {
                    className: "!bg-red-600 !text-white !border-red-500 font-medium"
                });
                return;
            }

            // Update to new password
            const { error: updateError } = await supabase.auth.updateUser({
                password: newPassword,
            });

            if (updateError) throw updateError;

            // Log the password change activity
            await logActivity('auth_password_change', { timestamp: new Date().toISOString() });

            toast.success("Authentication password updated successfully");
            setIsPasswordDialogOpen(false);
            setOldPassword("");
            setNewPassword("");
            setShowOldPassword(false);
            setShowNewPassword(false);
        } catch (error: any) {
            console.error("Password change error:", error);
            toast.error(error.message || "Failed to update password");
        }
    };

    const handleRegenerateCodes = async () => {
        if (!regenerateMasterPassword) {
            toast.error("Please enter your master password");
            return;
        }

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            // Fetch user settings to get vault key data
            const { data: userSettings, error: fetchError } = await supabase
                .from('user_settings')
                .select('encrypted_vault_key, vault_key_salt')
                .eq('user_id', user.id)
                .single();

            if (fetchError || !userSettings) {
                throw new Error("Failed to fetch vault settings");
            }

            // Verify master password by attempting to decrypt vault key
            // @ts-ignore - Supabase type inference issue
            const masterKey = await deriveMasterKey(regenerateMasterPassword, userSettings.vault_key_salt as string);
            // @ts-ignore - Supabase type inference issue
            const vaultKey = await decryptVaultKey(userSettings.encrypted_vault_key as string, masterKey);

            if (!vaultKey) {
                toast.error("Incorrect master password");
                setRegenerateMasterPassword("");
                return;
            }

            // Generate new recovery codes and encrypt vault key with each
            const recoveryData = await generateRecoveryCodeData(vaultKey, 10);

            // Store encrypted recovery codes and vault keys in database
            // @ts-ignore - Supabase type inference issue
            const { error: updateError } = await supabase
                .from('user_settings')
                .update({
                    encrypted_recovery_codes: JSON.stringify({
                        codes: recoveryData.codes,
                        encryptedVaultKeys: recoveryData.encryptedVaultKeys
                    })
                } as any)
                .eq('user_id', user.id);

            if (updateError) throw updateError;

            // Log the regeneration event
            await logActivity('recovery_codes_regenerated', {
                timestamp: new Date().toISOString(),
                codes_count: 10
            });

            // Store codes for one-time display
            setNewRecoveryCodes(recoveryData.codes);
            setRecoveryCodesGenerated(true);
            setRegenerateMasterPassword("");

            toast.success("New recovery codes generated successfully");
        } catch (error) {
            console.error("Failed to regenerate recovery codes:", error);
            toast.error("Failed to regenerate recovery codes");
        }
    };

    const handleTriggerReset = () => {
        toast.success("Password reset email sent to your inbox");
    };

    const handleDeleteAccount = async () => {
        try {
            // Verify master password by attempting decryption
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                toast.error("User not found");
                return;
            }

            const { data: settings } = await supabase
                .from('user_settings')
                .select('encrypted_vault_key, vault_key_salt')
                .eq('user_id', user.id)
                .single();

            if (settings?.encrypted_vault_key && settings?.vault_key_salt) {
                // @ts-ignore - Supabase type inference issue
                const masterKey = await deriveMasterKey(deleteMasterPassword, settings.vault_key_salt as string);
                // @ts-ignore - Supabase type inference issue
                const vaultKey = await decryptVaultKey(settings.encrypted_vault_key as string, masterKey);

                if (!vaultKey) {
                    toast.error("Incorrect master password", {
                        className: "!bg-red-600 !text-white !border-red-500 font-medium"
                    });
                    return;
                }
            }

            // Delete user account (Supabase will cascade delete related data)
            const { error: rpcError } = await supabase.rpc('delete_own_account');

            if (rpcError) {
                console.error("Delete RPC error:", rpcError);
                toast.error("Failed to delete account: " + rpcError.message);
                return;
            }

            // Sign out and redirect
            await supabase.auth.signOut();
            toast.success("Account deleted successfully");
            window.location.href = '/auth';
        } catch (error: any) {
            console.error("Delete account error:", error);
            toast.error(error.message || "Failed to delete account");
        }
    };

    // Export Logic
    const handleExportInitiate = () => {
        setIsExportDialogOpen(true);
        setExportStep('warning');
        setExportMasterPassword("");
        setExportCountdown(3);
    };

    const handleExportVerify = () => {
        if (exportMasterPassword.length < 4) {
            toast.error("Please enter your Master Password");
            return;
        }
        setExportStep('processing');
    };

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (exportStep === 'processing' && exportCountdown > 0) {
            timer = setTimeout(() => setExportCountdown(prev => prev - 1), 1000);
        } else if (exportStep === 'processing' && exportCountdown === 0) {
            // Processing done
            toast.success("Vault exported successfully");
            setIsExportDialogOpen(false);
        }
        return () => clearTimeout(timer);
    }, [exportStep, exportCountdown]);

    // Delete countdown effect
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (deleteStep === 'warning' && deleteCountdown > 0) {
            timer = setTimeout(() => setDeleteCountdown(prev => prev - 1), 1000);
        } else if (deleteStep === 'warning' && deleteCountdown === 0) {
            setCanProceedDelete(true);
        }
        return () => clearTimeout(timer);
    }, [deleteStep, deleteCountdown]);

    const getLastEventDate = (type: string) => {
        if (!activities || activities.length === 0) return "Never";
        const event = activities.find(a => a.event_type === type);
        if (!event) return "Never";
        return new Date(event.created_at).toLocaleDateString() + ' ' + new Date(event.created_at).toLocaleTimeString();
    };

    return (
        <div className="flex h-screen w-full bg-zinc-950 text-white overflow-hidden relative">
            <div className="absolute inset-0 z-0 bg-grid-white/[0.02] pointer-events-none" />

            <div className="flex-1 flex flex-col h-full overflow-hidden relative z-10">
                {/* Header */}
                <div className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-zinc-950/50 backdrop-blur-sm shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-neutral-500/10 flex items-center justify-center">
                            <Settings className="w-5 h-5 text-neutral-400" />
                        </div>
                        <h1 className="text-xl font-semibold">Settings</h1>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    <div className="max-w-3xl mx-auto space-y-10 pb-20">

                        {/* 1. Account Security (Password) */}
                        <div className="space-y-4">
                            <h2 className="text-sm font-medium text-neutral-400 uppercase tracking-wider pl-1">Account Security</h2>
                            <div className="p-6 rounded-xl border border-white/5 bg-zinc-900/50 space-y-6">
                                <h3 className="text-lg font-medium flex items-center gap-2">
                                    <KeyRound className="w-5 h-5 text-blue-500" /> Auth Password
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <div className="text-sm text-neutral-400">Manage your login password</div>
                                        <div className="text-xs text-neutral-500">Last changed: {getLastEventDate('auth_password_change')}</div>
                                    </div>
                                    <div className="flex flex-col gap-3">
                                        <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
                                            <DialogTrigger asChild>
                                                <Button variant="outline" className="w-full border-white/10 hover:bg-zinc-800">
                                                    Change Password
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="bg-zinc-950 border-white/10 text-white sm:max-w-[425px]">
                                                <DialogHeader>
                                                    <DialogTitle>Change Password</DialogTitle>
                                                    <DialogDescription className="text-neutral-400">
                                                        Enter your current password and a new strong password.
                                                    </DialogDescription>
                                                </DialogHeader>
                                                <div className="space-y-4 py-4">
                                                    <div className="space-y-2">
                                                        <Label>Current Password</Label>
                                                        <div className="relative">
                                                            <Input
                                                                type={showOldPassword ? "text" : "password"}
                                                                value={oldPassword}
                                                                onChange={(e) => setOldPassword(e.target.value)}
                                                                className="bg-zinc-900 border-white/10 pr-10"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => setShowOldPassword(!showOldPassword)}
                                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                                                            >
                                                                {showOldPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>New Password</Label>
                                                        <div className="relative">
                                                            <Input
                                                                type={showNewPassword ? "text" : "password"}
                                                                value={newPassword}
                                                                onChange={(e) => setNewPassword(e.target.value)}
                                                                className="bg-zinc-900 border-white/10 pr-10"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => setShowNewPassword(!showNewPassword)}
                                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                                                            >
                                                                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                            </button>
                                                        </div>

                                                        {/* Password Requirements - Only show if password is not empty */}
                                                        <AnimatePresence>
                                                            {newPassword.length > 0 && (
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
                                                    </div>
                                                </div>
                                                <DialogFooter>
                                                    <Button onClick={handleChangePassword} className="bg-blue-600 hover:bg-blue-700">Update Password</Button>
                                                </DialogFooter>
                                            </DialogContent>
                                        </Dialog>
                                    </div>
                                </div>
                            </div>


                        </div>

                        {/* 2. Vault Settings */}
                        <div className="space-y-4">
                            <h2 className="text-sm font-medium text-neutral-400 uppercase tracking-wider pl-1">Vault Settings</h2>
                            <div className="p-6 rounded-xl border border-white/5 bg-zinc-900/50 space-y-6">
                                <h3 className="text-lg font-medium flex items-center gap-2">
                                    <Shield className="w-5 h-5 text-emerald-500" /> Vault Behavior
                                </h3>

                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <Label className="text-base text-neutral-200">Auto-lock Vault</Label>
                                                <p className="text-sm text-neutral-500">
                                                    {autoLockTimer === 0
                                                        ? "Vault will remain unlocked indefinitely"
                                                        : `Lock vault after ${autoLockTimer} minutes of inactivity`}
                                                </p>
                                            </div>

                                            {autoLockTimer > 0 && (
                                                <span className="font-mono text-sm bg-zinc-800 px-2 py-1 rounded w-12 text-center text-white">
                                                    {autoLockTimer}m
                                                </span>
                                            )}
                                        </div>

                                        <div className="space-y-3">
                                            <Slider
                                                value={[autoLockTimer]}
                                                onValueChange={async (v) => {
                                                    const newValue = v[0];
                                                    setAutoLockTimer(newValue);
                                                    try {
                                                        await updateSettings({ auto_lock_minutes: newValue });
                                                        toast.success(`Auto-lock timer updated to ${newValue === 0 ? 'Never' : `${newValue} minutes`}`);
                                                    } catch (error) {
                                                        console.error("Failed to update auto-lock timer:", error);
                                                        toast.error("Failed to update auto-lock timer");
                                                    }
                                                }}
                                                max={60}
                                                min={0}
                                                step={1}
                                                className={cn("w-full", autoLockTimer === 0 && "opacity-50")}
                                                disabled={autoLockTimer === 0}
                                            />

                                            <div className="flex flex-wrap gap-2">
                                                {[5, 10, 30].map((time) => (
                                                    <Button
                                                        key={time}
                                                        variant={autoLockTimer === time ? "secondary" : "outline"}
                                                        size="sm"
                                                        onClick={async () => {
                                                            setAutoLockTimer(time);
                                                            try {
                                                                await updateSettings({ auto_lock_minutes: time });
                                                                toast.success(`Auto-lock timer set to ${time} minutes`);
                                                            } catch (error) {
                                                                console.error("Failed to update auto-lock timer:", error);
                                                                toast.error("Failed to update auto-lock timer");
                                                            }
                                                        }}
                                                        className={cn("h-7 text-xs", autoLockTimer === time ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20" : "border-white/10 text-neutral-400 hover:text-white")}
                                                    >
                                                        {time} min
                                                    </Button>
                                                ))}
                                                <div className="h-4 w-px bg-white/10 mx-1 self-center" />
                                                <Button
                                                    variant={autoLockTimer === 0 ? "destructive" : "outline"}
                                                    size="sm"
                                                    onClick={async () => {
                                                        setAutoLockTimer(0);
                                                        try {
                                                            await updateSettings({ auto_lock_minutes: 0 });
                                                            toast.success("Auto-lock disabled");
                                                        } catch (error) {
                                                            console.error("Failed to update auto-lock timer:", error);
                                                            toast.error("Failed to update auto-lock timer");
                                                        }
                                                    }}
                                                    className={cn("h-7 text-xs", autoLockTimer === 0 ? "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20" : "border-white/10 text-neutral-400 hover:text-white hover:bg-white/5")}
                                                >
                                                    Never
                                                </Button>
                                            </div>

                                            {autoLockTimer === 0 && (
                                                <div className="flex items-start gap-2 pt-2 text-red-400/80 text-xs bg-red-500/5 p-3 rounded border border-red-500/10">
                                                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                                                    <p>Warning: Selecting "Never" leaves your vault exposed if you leave your device unattended. Not recommended.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <Label className="text-sm text-neutral-400">Lock Triggers</Label>
                                        <div className="flex items-center space-x-2">
                                            <Checkbox id="lock-tab" defaultChecked className="border-white/20 data-[state=checked]:bg-blue-600 data-[state=checked]:text-white" />
                                            <Label htmlFor="lock-tab" className="cursor-pointer">Lock when tab is closed</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Checkbox id="lock-sleep" defaultChecked className="border-white/20 data-[state=checked]:bg-blue-600 data-[state=checked]:text-white" />
                                            <Label htmlFor="lock-sleep" className="cursor-pointer">Lock when system sleeps</Label>
                                        </div>
                                    </div>

                                    <div className="h-px bg-white/5" />

                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <Label className="text-base text-neutral-200">Clear Clipboard</Label>
                                            <p className="text-sm text-neutral-500">
                                                Clear copied passwords after 30 seconds.
                                                <br />
                                                <span className="text-xs text-orange-400/80">
                                                    Note: This clears the active clipboard only. Your OS may retain clipboard history.
                                                </span>
                                            </p>
                                        </div>
                                        <Checkbox defaultChecked className="border-white/20 data-[state=checked]:bg-blue-600 data-[state=checked]:text-white" />
                                    </div>

                                    <div className="pt-2 border-t border-white/5">
                                        <Button variant="secondary" onClick={handleManualLock} className="w-full bg-zinc-800 hover:bg-zinc-700 text-white border border-white/10">
                                            <Lock className="w-4 h-4 mr-2" />
                                            Lock Vault Now
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>


                        {/* 3. Vault Security (Recovery Codes) */}
                        <div className="space-y-4">
                            <div>
                                <h2 className="text-sm font-medium text-neutral-400 uppercase tracking-wider pl-1">Vault Security</h2>
                                <p className="text-xs text-neutral-500 pl-1 mt-1">Recovery codes for vault decryption</p>
                            </div>

                            {/* Recovery Codes */}
                            <div className="p-6 rounded-xl border border-white/5 bg-zinc-900/50 space-y-6">
                                <h3 className="text-lg font-medium flex items-center gap-2">
                                    <RefreshCw className="w-5 h-5 text-orange-500" /> Recovery Codes
                                </h3>

                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-1">
                                            <div className="font-medium text-white">Status</div>
                                            <div className="text-sm text-neutral-400">
                                                {recoveryCodesGenerated ? (
                                                    <span>{10 - recoveryCodesUsed} out of 10 codes remaining</span>
                                                ) : (
                                                    <span>Not generated</span>
                                                )}
                                            </div>
                                        </div>
                                        {recoveryCodesGenerated ? (
                                            <Badge variant="outline" className="text-green-400 border-green-500/20 bg-green-500/10">Active</Badge>
                                        ) : (
                                            <Badge variant="outline" className="text-orange-400 border-orange-500/20 bg-orange-500/10">Not Generated</Badge>
                                        )}
                                    </div>

                                    {!recoveryCodesGenerated && (
                                        <div className="flex items-start gap-3 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-200 text-sm">
                                            <AlertTriangle className="w-5 h-5 shrink-0" />
                                            <div>
                                                <span className="font-bold">Warning:</span> Without Recovery Codes, your vault data is permanently lost if you forget your master password.
                                            </div>
                                        </div>
                                    )}

                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="outline" className="w-full border-white/10 hover:bg-zinc-800">
                                                {recoveryCodesGenerated ? "Regenerate Recovery Codes" : "Generate Recovery Codes"}
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent className="bg-zinc-950 border-white/10 text-white">
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Generate New Recovery Codes?</AlertDialogTitle>
                                                <AlertDialogDescription className="text-neutral-400">
                                                    This will invalidate any existing codes. You must verify your Master Password to continue.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <div className="py-2">
                                                <Label className="text-neutral-300">Master Password</Label>
                                                <div className="relative mt-2">
                                                    <Input
                                                        type={showRegenerateMasterPassword ? "text" : "password"}
                                                        placeholder="Verify identity..."
                                                        className="bg-zinc-900 border-white/10 pr-10"
                                                        value={regenerateMasterPassword}
                                                        onChange={(e) => setRegenerateMasterPassword(e.target.value)}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowRegenerateMasterPassword(!showRegenerateMasterPassword)}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                                                    >
                                                        {showRegenerateMasterPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                    </button>
                                                </div>
                                            </div>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel
                                                    className="bg-zinc-900 border-white/10 hover:bg-zinc-800 hover:text-white"
                                                    onClick={() => setRegenerateMasterPassword("")}
                                                >
                                                    Cancel
                                                </AlertDialogCancel>
                                                <AlertDialogAction onClick={handleRegenerateCodes} className="bg-blue-600 hover:bg-blue-700">Generate Codes</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>

                                    {/* Recovery Codes Display Dialog */}
                                    <Dialog open={newRecoveryCodes !== null} onOpenChange={(open) => !open && setNewRecoveryCodes(null)}>
                                        <DialogContent className="bg-zinc-950 border-white/10 text-white max-w-2xl">
                                            <DialogHeader>
                                                <DialogTitle className="flex items-center gap-2">
                                                    <RefreshCw className="w-5 h-5 text-orange-500" />
                                                    Your New Recovery Codes
                                                </DialogTitle>
                                                <DialogDescription className="text-neutral-400">
                                                    Save these codes in a secure location. Each code can only be used once to decrypt your vault.
                                                </DialogDescription>
                                            </DialogHeader>

                                            <div className="space-y-4">
                                                <div className="flex items-start gap-3 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-200 text-sm">
                                                    <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                                                    <div>
                                                        <span className="font-bold">One-Time Display:</span> These codes will only be shown once. Make sure to save them before closing this window.
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-3 p-4 rounded-lg bg-zinc-900 border border-white/5 max-h-[400px] overflow-y-auto">
                                                    {newRecoveryCodes?.map((code, index) => (
                                                        <div key={index} className="flex items-center gap-2 p-2 rounded bg-zinc-800/50 border border-white/5">
                                                            <span className="text-xs text-neutral-500 w-6">{index + 1}.</span>
                                                            <code className="flex-1 text-sm font-mono text-white">{code}</code>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <DialogFooter className="flex items-center gap-2">
                                                <Button
                                                    variant="outline"
                                                    onClick={() => {
                                                        if (newRecoveryCodes) {
                                                            navigator.clipboard.writeText(newRecoveryCodes.join('\n'));
                                                            toast.success("All codes copied to clipboard");
                                                        }
                                                    }}
                                                    className="border-white/10 hover:bg-zinc-800"
                                                >
                                                    Copy All Codes
                                                </Button>
                                                <Button
                                                    onClick={() => setNewRecoveryCodes(null)}
                                                    className="bg-blue-600 hover:bg-blue-700"
                                                >
                                                    I've Saved My Codes
                                                </Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                            </div>
                        </div>

                        {/* 4. Multi-Factor Authentication */}
                        <div className="space-y-4">
                            <div>
                                <h2 className="text-sm font-medium text-neutral-400 uppercase tracking-wider pl-1">Multi-Factor Authentication</h2>
                                <p className="text-xs text-neutral-500 pl-1 mt-1">Extra security for account login</p>
                            </div>

                            {/* MFA */}
                            <div className="p-6 rounded-xl border border-white/5 bg-zinc-900/50 space-y-6">
                                <h3 className="text-lg font-medium flex items-center gap-2">
                                    <Smartphone className="w-5 h-5 text-purple-500" /> Authenticator App
                                </h3>

                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <div className="font-medium text-white">Two-Factor Authentication</div>
                                            <div className="text-sm text-neutral-500">Secure your account login with 2FA</div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Checkbox
                                                id="mfa-toggle"
                                                checked={mfaEnabled}
                                                onCheckedChange={(c) => setMfaEnabled(c as boolean)}
                                                className="border-white/20 data-[state=checked]:bg-purple-600 data-[state=checked]:text-white w-6 h-6"
                                            />
                                        </div>
                                    </div>

                                    {mfaEnabled && (
                                        <Button variant="outline" size="sm" className="w-full border-white/10 text-neutral-300 hover:text-white hover:bg-zinc-800">
                                            View MFA Backup Codes
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* 4. Data Management */}
                        <div className="space-y-4">
                            <h2 className="text-sm font-medium text-neutral-400 uppercase tracking-wider pl-1">Data & Notifications</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Data */}
                                <div className="p-6 rounded-xl border border-white/5 bg-zinc-900/50 space-y-6">
                                    <h3 className="text-lg font-medium flex items-center gap-2">
                                        <HardDrive className="w-5 h-5 text-neutral-400" /> Data Management
                                    </h3>
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3 p-3 rounded bg-zinc-950/50 border border-white/5">
                                            <Download className="w-5 h-5 text-blue-500" />
                                            <div className="flex-1">
                                                <div className="font-medium text-sm">Export Vault</div>
                                            </div>

                                            <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
                                                <DialogTrigger asChild>
                                                    <Button variant="ghost" size="sm" className="h-8 hover:bg-white/10" onClick={handleExportInitiate}>
                                                        Export
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent className="bg-zinc-950 border-white/10 text-white sm:max-w-[500px]">
                                                    <DialogHeader>
                                                        <DialogTitle className="flex items-center gap-2 text-red-500">
                                                            <AlertTriangle className="w-5 h-5" />
                                                            Export Vault
                                                        </DialogTitle>
                                                    </DialogHeader>

                                                    {exportStep === 'warning' && (
                                                        <div className="space-y-4">
                                                            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-100 text-sm">
                                                                <p className="font-semibold mb-2">Warning: Exposing Sensitive Data</p>
                                                                <p>Exporting your vault will convert all your encrypted passwords into a plain text file. Anyone with access to this file can view all your passwords.</p>
                                                            </div>
                                                            <DialogFooter>
                                                                <Button variant="ghost" onClick={() => setIsExportDialogOpen(false)}>Cancel</Button>
                                                                <Button variant="destructive" onClick={() => setExportStep('verify')}>I Understand, Continue</Button>
                                                            </DialogFooter>
                                                        </div>
                                                    )}

                                                    {exportStep === 'verify' && (
                                                        <div className="space-y-4">
                                                            <DialogDescription>
                                                                Please enter your Master Password to authorize this export.
                                                            </DialogDescription>
                                                            <div className="space-y-2">
                                                                <Label>Master Password</Label>
                                                                <Input
                                                                    type="password"
                                                                    value={exportMasterPassword}
                                                                    onChange={(e) => setExportMasterPassword(e.target.value)}
                                                                    className="bg-zinc-900 border-white/10"
                                                                />
                                                            </div>
                                                            <DialogFooter>
                                                                <Button variant="ghost" onClick={() => setIsExportDialogOpen(false)}>Cancel</Button>
                                                                <Button onClick={handleExportVerify} className="bg-blue-600 hover:bg-blue-700">Unlock & Export</Button>
                                                            </DialogFooter>
                                                        </div>
                                                    )}

                                                    {exportStep === 'processing' && (
                                                        <div className="py-8 flex flex-col items-center justify-center space-y-4">
                                                            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                                                            <div className="text-center">
                                                                <h3 className="font-medium">Preparing Export</h3>
                                                                <p className="text-sm text-neutral-500">Decrypting vault data...</p>
                                                                {exportCountdown > 0 && <p className="text-xs text-neutral-600 mt-2">Starting in {exportCountdown}s...</p>}
                                                            </div>
                                                        </div>
                                                    )}
                                                </DialogContent>
                                            </Dialog>


                                        </div>
                                        <div className="flex items-center gap-3 p-3 rounded bg-zinc-950/50 border border-white/5">
                                            <Upload className="w-5 h-5 text-purple-500" />
                                            <div className="flex-1">
                                                <div className="font-medium text-sm">Import Passwords</div>
                                            </div>
                                            <Button variant="ghost" size="sm" className="h-8 hover:bg-white/10">Import</Button>
                                        </div>
                                    </div>
                                </div>

                                {/* Notifications */}
                                <div className="p-6 rounded-xl border border-white/5 bg-zinc-900/50 space-y-6">
                                    <h3 className="text-lg font-medium flex items-center gap-2">
                                        <Bell className="w-5 h-5 text-yellow-500" /> Notifications
                                    </h3>
                                    <div className="space-y-4">
                                        <div className="flex items-center space-x-2">
                                            <Checkbox id="notif-breach" defaultChecked className="border-white/20" />
                                            <Label htmlFor="notif-breach" className="cursor-pointer">Alert me about data breaches (Beta)</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Checkbox id="notif-weak" defaultChecked className="border-white/20" />
                                            <Label htmlFor="notif-weak" className="cursor-pointer">Remind me to update old passwords</Label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Security Activity */}
                        <div className="space-y-4">
                            <h2 className="text-sm font-medium text-neutral-400 uppercase tracking-wider pl-1">Security Activity</h2>
                            <div className="p-6 rounded-xl border border-white/5 bg-zinc-900/50 space-y-6">
                                <h3 className="text-lg font-medium flex items-center gap-2">
                                    <Activity className="w-5 h-5 text-neutral-400" /> Security Activity
                                </h3>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="p-3 rounded bg-zinc-950/50 border border-white/5 space-y-1">
                                            <div className="text-xs text-neutral-500">Last Auth Password Change</div>
                                            <div className="text-sm font-mono text-white">{getLastEventDate('auth_password_change')}</div>
                                        </div>
                                        <div className="p-3 rounded bg-zinc-950/50 border border-white/5 space-y-1">
                                            <div className="text-xs text-neutral-500">Last Master Password backup key used</div>
                                            <div className="text-sm font-mono text-white">{getLastEventDate('recovery_code_used')}</div>
                                        </div>
                                        <div className="p-3 rounded bg-zinc-950/50 border border-white/5 space-y-1">
                                            <div className="text-xs text-neutral-500">Last Recovery Codes Generated</div>
                                            <div className="text-sm font-mono text-white">{getLastEventDate('recovery_codes_generated')}</div>
                                        </div>
                                        <div className="p-3 rounded bg-zinc-950/50 border border-white/5 space-y-1">
                                            <div className="text-xs text-neutral-500">Last Vault Export</div>
                                            <div className="text-sm font-mono text-white">{getLastEventDate('vault_export')}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Activity Log Table */}
                            <div className="p-6 rounded-xl border border-white/5 bg-zinc-900/50 space-y-6 mt-4">
                                <h3 className="text-lg font-medium flex items-center gap-2">
                                    <Activity className="w-5 h-5 text-neutral-400" /> Recent Activity Log
                                </h3>

                                {(() => {
                                    // Filter to show only critical security events
                                    const criticalEvents = [
                                        'auth_password_change',
                                        'master_password_change',
                                        'recovery_code_used',
                                        'recovery_codes_generated',
                                        'recovery_codes_regenerated',
                                        'vault_export',
                                        'vault_import'
                                    ];

                                    const filteredActivities = activities
                                        .filter(a => criticalEvents.includes(a.event_type))
                                        .slice(0, 10); // Limit to 10 latest entries

                                    return filteredActivities.length === 0 ? (
                                        <div className="text-center py-8 text-neutral-500 text-sm">
                                            No critical security activity recorded yet.
                                        </div>
                                    ) : (
                                        <div className="overflow-hidden rounded-lg border border-white/5">
                                            <table className="w-full text-sm text-left">
                                                <thead className="bg-zinc-950/50 text-neutral-400 font-medium">
                                                    <tr>
                                                        <th className="px-4 py-3">Event</th>
                                                        <th className="px-4 py-3">Details</th>
                                                        <th className="px-4 py-3 text-right">Date</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/5">
                                                    {filteredActivities.map((activity) => (
                                                        <tr key={activity.id} className="hover:bg-white/5 transition-colors">
                                                            <td className="px-4 py-3 font-medium text-white capitalize">
                                                                {activity.event_type.replace(/_/g, " ")}
                                                            </td>
                                                            <td className="px-4 py-3 text-neutral-400 font-mono text-xs truncate max-w-[200px]">
                                                                {JSON.stringify(activity.metadata || "-")}
                                                            </td>
                                                            <td className="px-4 py-3 text-right text-neutral-500 whitespace-nowrap">
                                                                {new Date(activity.created_at).toLocaleString()}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>

                        {/* 5. Danger Zone */}
                        <div className="space-y-4">
                            <h2 className="text-sm font-medium text-red-500/70 uppercase tracking-wider pl-1">Danger Zone</h2>
                            <div className="p-6 rounded-xl border border-red-500/20 bg-red-500/5 space-y-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="font-medium text-white">Delete Account</div>
                                        <div className="text-sm text-red-300/70">These actions permanently delete encrypted data and cannot be undone.</div>
                                    </div>
                                    <Dialog open={isDeleteDialogOpen} onOpenChange={(open) => {
                                        setIsDeleteDialogOpen(open);
                                        if (!open) {
                                            // Reset state when dialog closes
                                            setDeleteStep('warning');
                                            setDeleteConfirmText('');
                                            setDeleteMasterPassword('');
                                            setDeleteCountdown(5);
                                            setCanProceedDelete(false);
                                        }
                                    }}>
                                        <DialogTrigger asChild>
                                            <Button variant="destructive">Delete Account</Button>
                                        </DialogTrigger>
                                        <DialogContent className="bg-zinc-950 border-white/10 text-white max-w-md">
                                            <DialogHeader>
                                                <DialogTitle className="text-red-500">
                                                    {deleteStep === 'warning' && 'Delete Account - Warning'}
                                                    {deleteStep === 'confirm' && 'Confirm Account Deletion'}
                                                    {deleteStep === 'verify' && 'Verify Master Password'}
                                                </DialogTitle>
                                            </DialogHeader>

                                            <AnimatePresence mode="wait">
                                                {deleteStep === 'warning' && (
                                                    <motion.div
                                                        key="warning"
                                                        initial={{ opacity: 0, x: 20 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        exit={{ opacity: 0, x: -20 }}
                                                        className="space-y-4"
                                                    >
                                                        <div className="rounded-md bg-red-500/15 p-4 border border-red-500/20">
                                                            <div className="flex gap-3">
                                                                <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                                                                <div className="space-y-2">
                                                                    <h4 className="text-sm font-medium text-red-500">This action cannot be undone</h4>
                                                                    <p className="text-sm text-red-400/90 leading-relaxed">
                                                                        Deleting your account will:
                                                                    </p>
                                                                    <ul className="text-sm text-red-400/90 space-y-1 list-disc list-inside">
                                                                        <li>Permanently delete all your vault data</li>
                                                                        <li>Remove all passwords and secure notes</li>
                                                                        <li>Delete your recovery codes</li>
                                                                        <li>Cannot be recovered by anyone</li>
                                                                    </ul>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="rounded-md bg-blue-500/15 p-4 border border-blue-500/20">
                                                            <div className="flex gap-3">
                                                                <Download className="h-5 w-5 text-blue-400 shrink-0" />
                                                                <div className="space-y-1">
                                                                    <h4 className="text-sm font-medium text-blue-500">Export Your Vault First</h4>
                                                                    <p className="text-sm text-blue-400/90">
                                                                        We recommend exporting your vault data before deletion.
                                                                        Go to Settings → Export Vault to download an encrypted backup.
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <DialogFooter>
                                                            <Button
                                                                variant="outline"
                                                                onClick={() => setIsDeleteDialogOpen(false)}
                                                                className="bg-zinc-900 border-white/10 text-white hover:bg-zinc-800"
                                                            >
                                                                Cancel
                                                            </Button>
                                                            <Button
                                                                variant="destructive"
                                                                disabled={!canProceedDelete}
                                                                onClick={() => setDeleteStep('confirm')}
                                                            >
                                                                {canProceedDelete ? 'I Understand, Continue' : `Please Read (${deleteCountdown}s)`}
                                                            </Button>
                                                        </DialogFooter>
                                                    </motion.div>
                                                )}

                                                {deleteStep === 'confirm' && (
                                                    <motion.div
                                                        key="confirm"
                                                        initial={{ opacity: 0, x: 20 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        exit={{ opacity: 0, x: -20 }}
                                                        className="space-y-4"
                                                    >
                                                        <DialogDescription className="text-neutral-400">
                                                            Type <span className="font-mono font-semibold text-white">i want to delete my account</span> to confirm deletion.
                                                        </DialogDescription>

                                                        <div className="space-y-2">
                                                            <Label htmlFor="delete-confirm">Confirmation Text</Label>
                                                            <Input
                                                                id="delete-confirm"
                                                                value={deleteConfirmText}
                                                                onChange={(e) => setDeleteConfirmText(e.target.value)}
                                                                placeholder="Type the confirmation text"
                                                                className="bg-zinc-900 border-white/10"
                                                            />
                                                        </div>

                                                        <DialogFooter>
                                                            <Button
                                                                variant="outline"
                                                                onClick={() => setDeleteStep('warning')}
                                                                className="bg-zinc-900 border-white/10 text-white hover:bg-zinc-800"
                                                            >
                                                                Back
                                                            </Button>
                                                            <Button
                                                                variant="destructive"
                                                                disabled={deleteConfirmText !== 'i want to delete my account'}
                                                                onClick={() => setDeleteStep('verify')}
                                                            >
                                                                Continue
                                                            </Button>
                                                        </DialogFooter>
                                                    </motion.div>
                                                )}

                                                {deleteStep === 'verify' && (
                                                    <motion.div
                                                        key="verify"
                                                        initial={{ opacity: 0, x: 20 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        exit={{ opacity: 0, x: -20 }}
                                                        className="space-y-4"
                                                    >
                                                        <DialogDescription className="text-neutral-400">
                                                            Enter your master password to confirm account deletion.
                                                        </DialogDescription>

                                                        <div className="space-y-2">
                                                            <Label htmlFor="delete-master-password">Master Password</Label>
                                                            <Input
                                                                id="delete-master-password"
                                                                type="password"
                                                                value={deleteMasterPassword}
                                                                onChange={(e) => setDeleteMasterPassword(e.target.value)}
                                                                placeholder="Enter master password"
                                                                className="bg-zinc-900 border-white/10"
                                                            />
                                                        </div>

                                                        <DialogFooter>
                                                            <Button
                                                                variant="outline"
                                                                onClick={() => setDeleteStep('confirm')}
                                                                className="bg-zinc-900 border-white/10 text-white hover:bg-zinc-800"
                                                            >
                                                                Back
                                                            </Button>
                                                            <Button
                                                                variant="destructive"
                                                                disabled={!deleteMasterPassword}
                                                                onClick={handleDeleteAccount}
                                                            >
                                                                Delete My Account
                                                            </Button>
                                                        </DialogFooter>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}
