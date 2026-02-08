import { useState, useEffect } from "react";
import { Settings, Shield, HardDrive, Bell, Download, Upload, AlertTriangle, Lock, RefreshCw, Smartphone, KeyRound, Loader2, Activity, Eye, EyeOff, Check, Copy, Plus, X, User } from "lucide-react";
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
import { useVaultItems } from "@/hooks/useVault";
import { supabase } from "@/lib/supabase";
import { deriveMasterKey, decryptVaultKey, generateRecoveryCodeData, exportVault, importVault, generateSalt, encryptVaultKey, encryptData, decryptData } from "@/lib/crypto";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useClipboard } from "@/context/ClipboardContext";
import { useAuth } from "@/context/AuthContext";



export default function SettingsPage() {
    const { lockVault } = useLock();
    const { activities, logActivity } = useVaultActivity();
    const { settings, updateSettings } = useUserSettings();
    const { items: vaultItems, importItems, clearVault } = useVaultItems();
    const { copyToClipboard } = useClipboard();
    const { isDemo, user } = useAuth();
    const [autoLockTimer, setAutoLockTimer] = useState(15); // 0 = Never

    const PresetBadge = ({ encryptedPreset, onRemove }: { encryptedPreset: string, onRemove: () => void }) => {
        const [decrypted, setDecrypted] = useState(encryptedPreset);

        useEffect(() => {
            const load = async () => {
                if (isDemo) {
                    setDecrypted(encryptedPreset);
                    return;
                }
                const vaultKey = sessionStorage.getItem('vaultKey');
                if (vaultKey) {
                    const d = await decryptData(encryptedPreset, vaultKey);
                    if (d) setDecrypted(d);
                }
            };
            load();
        }, [encryptedPreset]);

        return (
            <Badge
                variant="secondary"
                className="px-3 py-1.5 text-sm bg-zinc-950 border border-white/10 hover:border-white/20 transition-colors flex items-center gap-2 group"
            >
                {decrypted}
                <button
                    onClick={onRemove}
                    className="text-neutral-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all focus:opacity-100 focus:outline-none"
                    aria-label={`Remove preset ${decrypted}`}
                >
                    <X className="w-3.5 h-3.5" />
                </button>
            </Badge>
        );
    };

    // Username Presets State
    const [newPreset, setNewPreset] = useState("");

    const handleAddPreset = async () => {
        if (!newPreset.trim()) return;
        const vaultKey = sessionStorage.getItem('vaultKey');
        if (!vaultKey && !isDemo) {
            toast.error("Vault locked. Please unlock to add presets.");
            return;
        }

        if (isDemo && settings?.username_presets?.includes(newPreset)) return; // No-op check

        const currentPresets = settings?.username_presets || [];

        // Check for duplicates (requires decrypting existing or just simple check if we trust unique?
        // Simple check won't work if they are encrypted. We should decrypt all to check duplicate?
        // For now, let's just add it. The UI list will show duplicates if they exist, but user can remove them.
        // Or we can try to decrypt to check.
        // Let's decrypt to check duplicates.
        try {
            let decryptedPresets: string[] = [];
            if (isDemo) {
                decryptedPresets = currentPresets;
            } else {
                decryptedPresets = await Promise.all(currentPresets.map(async p => {
                    const d = await decryptData(p, vaultKey!);
                    return d || p; // Fallback to raw if fail
                }));
            }

            if (decryptedPresets.includes(newPreset)) {
                toast.error("Preset already exists");
                return;
            }

            const encryptedPreset = isDemo ? newPreset : await encryptData(newPreset, vaultKey!);
            const updated = [...currentPresets, encryptedPreset];

            const { error } = await (supabase
                .from('user_settings') as any)
                .update({ username_presets: updated })
                .eq('user_id', user!.id);

            if (error) throw error;

            // Optimistic update (requires re-fetch usually, but let's try to update local state if hook supports it or just wait for re-fetch)
            // useProfiles hook re-fetches on updateSettings call (via updateSettings function)
            // Wait, I called supabase directly above. I should use updateSettings from hook if possible, but I used supabase directly to handle the cast.
            // useProfiles updateSettings handles the optimistic update. I should use that instead.
            // Let's use updateSettings from hook.
            // @ts-ignore
            await updateSettings({ username_presets: updated });


            setNewPreset("");
            toast.success("Preset added");
        } catch (error) {
            console.error("Failed to add preset:", error);
            toast.error("Failed to add preset");
        }
    };

    const handleRemovePreset = async (preset: string) => {
        const currentPresets = settings?.username_presets || [];
        const updated = currentPresets.filter(p => p !== preset);
        try {
            // @ts-ignore
            await updateSettings({ username_presets: updated });
            toast.success("Preset removed");
        } catch (error) {
            console.error("Failed to remove preset:", error);
            toast.error("Failed to remove preset");
        }
    };

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

    // Import Vault State
    const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
    const [importStep, setImportStep] = useState<'warning' | 'mode' | 'file' | 'decrypt' | 'summary' | 'processing'>('warning');
    const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
    const [importFile, setImportFile] = useState<string | null>(null);
    const [importPassword, setImportPassword] = useState("");
    const [decryptedImportItems, setDecryptedImportItems] = useState<any[]>([]);
    const [importStats, setImportStats] = useState({ total: 0, duplicates: 0 });
    const [importConfirmText, setImportConfirmText] = useState("");

    // Change Master Password State
    const [isChangeMasterPasswordOpen, setIsChangeMasterPasswordOpen] = useState(false);
    const [changeMasterPasswordStep, setChangeMasterPasswordStep] = useState<'verify' | 'new' | 'processing' | 'success'>('verify');
    const [currentMasterPassword, setCurrentMasterPassword] = useState("");
    const [newMasterPassword, setNewMasterPassword] = useState("");
    const [confirmNewMasterPassword, setConfirmNewMasterPassword] = useState("");

    const [changeMasterPasswordError, setChangeMasterPasswordError] = useState("");
    const [isChangePasswordLoading, setIsChangePasswordLoading] = useState(false);

    // MFA State
    const [mfaEnabled, setMfaEnabled] = useState(false);
    const [isMfaModalOpen, setIsMfaModalOpen] = useState(false);
    const [mfaStep, setMfaStep] = useState<'intro' | 'scan' | 'verify' | 'success'>('intro');
    const [mfaSecret, setMfaSecret] = useState("");
    const [mfaQr, setMfaQr] = useState("");
    const [mfaFactorId, setMfaFactorId] = useState("");
    const [mfaCode, setMfaCode] = useState("");
    const [mfaError, setMfaError] = useState("");
    const [mfaLoading, setMfaLoading] = useState(false);
    const [isDisableMfaDialogOpen, setIsDisableMfaDialogOpen] = useState(false);
    const [disableMfaPassword, setDisableMfaPassword] = useState("");

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

    useEffect(() => {
        const checkMfaStatus = async () => {
            const { data, error } = await supabase.auth.mfa.listFactors();
            if (error) {
                console.error("Error fetching MFA factors:", error);
                return;
            }
            const totpFactor = data.totp.find(f => f.status === 'verified');
            setMfaEnabled(!!totpFactor);
        };
        checkMfaStatus();
    }, []);

    const handleMfaToggle = (checked: boolean) => {
        if (checked) {
            setMfaStep('intro');
            setIsMfaModalOpen(true);
        } else {
            setIsDisableMfaDialogOpen(true);
        }
    };

    const handleMfaEnroll = async () => {
        if (isDemo) {
            toast.error("Action not allowed in Demo Mode");
            return;
        }
        setMfaLoading(true);
        setMfaError("");
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const { data, error } = await supabase.auth.mfa.enroll({
                factorType: 'totp',
                issuer: 'Aegis',
                friendlyName: user?.email || 'User'
            });

            if (error) throw error;

            setMfaFactorId(data.id);
            setMfaSecret(data.totp.secret);
            setMfaQr(data.totp.qr_code);
            setMfaStep('scan');
        } catch (err: any) {
            console.error("Error enrolling MFA:", err);
            setMfaError(err.message || "Failed to start setup");
        } finally {
            setMfaLoading(false);
        }
    };

    const handleMfaVerify = async () => {
        if (mfaCode.length !== 6) {
            setMfaError("Code must be 6 digits");
            return;
        }

        setMfaLoading(true);
        setMfaError("");
        try {
            const { error } = await supabase.auth.mfa.challengeAndVerify({
                factorId: mfaFactorId,
                code: mfaCode
            });

            if (error) throw error;

            await logActivity('mfa_enabled', {});
            // Sync Profile
            await (supabase.from('profiles') as any).update({
                mfa_enabled: true,
                mfa_type: 'totp'
            }).eq('id', (await supabase.auth.getUser()).data.user!.id);

            setMfaEnabled(true);
            setMfaStep('success');
        } catch (err: any) {
            console.error("Error verifying MFA:", err);
            setMfaError("Invalid code. Please try again.");
        } finally {
            setMfaLoading(false);
        }
    };

    const handleMfaDisable = async () => {
        if (isDemo) {
            toast.error("Action not allowed in Demo Mode");
            return;
        }
        setMfaLoading(true);
        try {
            // Verify AUTH password first (not master password)
            const { data: { user } } = await supabase.auth.getUser();
            if (!user?.email) throw new Error("User not found");

            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: user.email,
                password: disableMfaPassword,
            });

            if (signInError) {
                toast.error("Incorrect login password");
                setMfaLoading(false);
                return;
            }

            const { data: factors } = await supabase.auth.mfa.listFactors();
            const totpFactor = factors?.totp.find(f => f.status === 'verified');

            if (totpFactor) {
                const { error } = await supabase.auth.mfa.unenroll({
                    factorId: totpFactor.id
                });
                if (error) throw error;
            }

            // Sync Profile
            await (supabase.from('profiles') as any).update({
                mfa_enabled: false,
                mfa_type: 'email'
            }).eq('id', (await supabase.auth.getUser()).data.user!.id);

            await logActivity('mfa_disabled', {});
            setMfaEnabled(false);
            setIsDisableMfaDialogOpen(false);
            setDisableMfaPassword("");
            toast.success("Two-Factor Authentication disabled");
        } catch (err: any) {
            console.error("Error disabling MFA:", err);
            toast.error(err.message || "Failed to disable MFA");
        } finally {
            setMfaLoading(false);
        }
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

    const isOauthUser = user?.identities?.every(id => id.provider !== 'email') ?? false;
    const hasAuthPassword = !isOauthUser;

    const handleChangePassword = async () => {
        if (isDemo) {
            toast.error("Action not allowed in Demo Mode");
            return;
        }
        if (!isPasswordStrong) {
            toast.error("Please meet all password requirements");
            return;
        }

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user?.email) {
                toast.error("User not found");
                return;
            }

            // Only verify old password if user actually has one (non-oauth-only)
            if (hasAuthPassword) {
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
        if (isDemo) {
            toast.error("Action not allowed in Demo Mode");
            return;
        }
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
                // @ts-ignore
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



    const handleDeleteAccount = async () => {
        if (isDemo) {
            toast.error("Action not allowed in Demo Mode");
            return;
        }
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

            if ((settings as any)?.encrypted_vault_key && (settings as any)?.vault_key_salt) {
                // @ts-ignore - Supabase type inference issue
                const masterKey = await deriveMasterKey(deleteMasterPassword, (settings as any).vault_key_salt as string);
                // @ts-ignore - Supabase type inference issue
                const vaultKey = await decryptVaultKey((settings as any).encrypted_vault_key as string, masterKey);

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

    const handleExportVerify = async () => {
        if (exportMasterPassword.length < 4) {
            toast.error("Please enter your Master Password");
            return;
        }

        try {
            // 1. Verify password first (reuse existing logic from other sensitive actions)
            // @ts-ignore
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                toast.error("User not found");
                return;
            }

            // We verify by trying to unlock the vault key with it (proof of ownership)
            // Ideally we should reuse a verifyMasterPassword helper, but for now we follow the pattern in this file
            if (settings?.encrypted_vault_key && settings?.vault_key_salt) {
                // @ts-ignore
                const masterKey = await deriveMasterKey(exportMasterPassword, settings.vault_key_salt as string);
                // @ts-ignore
                const vaultKey = await decryptVaultKey(settings.encrypted_vault_key as string, masterKey);

                if (!vaultKey) {
                    toast.error("Incorrect master password");
                    return;
                }
            } else {
                // Fallback or error if no vault key set up?
                // If the user has items they must have a key. 
                // We'll proceed if verification passes.
            }

            setExportStep('processing');

            // 2. Perform Export (Small delay to show processing state)
            setTimeout(async () => {
                try {
                    const jsonString = await exportVault(vaultItems, exportMasterPassword);

                    // 3. Trigger Download
                    const blob = new Blob([jsonString], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    const dateStr = new Date().toISOString().split('T')[0];
                    link.download = `aegis-vault-encrypted-${dateStr}.json`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);

                    // 4. Log Activity
                    await logActivity('vault_export', { timestamp: new Date().toISOString() });

                    // 5. Success
                    // Countdown effect will finish the dialog closing in useEffect
                } catch (err: any) {
                    console.error("Export failed", err);
                    toast.error("Export failed: " + err.message);
                    setExportStep('warning'); // Go back
                }
            }, 1000);

        } catch (error: any) {
            console.error("Export verification failed:", error);
            toast.error("Verification failed");
        }
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

    // Import Handlers
    const handleImportInitiate = () => {
        setIsImportDialogOpen(true);
        setImportStep('warning');
        setImportMode('append');
        setImportFile(null);
        setImportPassword("");
        setDecryptedImportItems([]);
        setImportConfirmText("");
    };

    const handleImportFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const text = await file.text();
            setImportFile(text);
        } catch (error) {
            toast.error("Failed to read file");
        }
    };

    const handleImportDecrypt = async () => {
        if (!importFile || !importPassword) return;

        try {
            const items = await importVault(importFile, importPassword);
            setDecryptedImportItems(items);

            // Calculate stats
            const duplicates = items.filter(newItem =>
                vaultItems.some(existing =>
                    existing.name === newItem.name &&
                    existing.username === newItem.username &&
                    existing.category === newItem.category
                )
            ).length;

            setImportStats({
                total: items.length,
                duplicates
            });

            setImportStep('summary');
        } catch (error: any) {
            toast.error("Decryption failed: " + error.message);
        }
    };

    const handleImportExecute = async () => {
        if (isDemo) {
            toast.error("Action not allowed in Demo Mode");
            return;
        }
        try {
            if (importMode === 'replace') {
                if (importConfirmText !== 'REPLACE MY VAULT') {
                    toast.error("Please type the confirmation phrase exactly");
                    return;
                }

                // Verify master password again for destructive action
                // Reuse delete logic verification style
                // @ts-ignore
                const { data: { user } } = await supabase.auth.getUser();
                if ((settings as any)?.encrypted_vault_key && (settings as any)?.vault_key_salt) {
                    // @ts-ignore
                    const masterKey = await deriveMasterKey(importPassword, (settings as any).vault_key_salt as string);
                    // @ts-ignore
                    const vaultKey = await decryptVaultKey((settings as any).encrypted_vault_key as string, masterKey);

                    if (!vaultKey) {
                        toast.error("Incorrect master password for verification");
                        return;
                    }
                }

                await clearVault();
                await logActivity('vault_import_replaced', { count: decryptedImportItems.length });
            } else {
                // Append mode logic
                const uniqueItems = decryptedImportItems.filter(newItem =>
                    !vaultItems.some(existing =>
                        existing.name === newItem.name &&
                        existing.username === newItem.username &&
                        existing.category === newItem.category
                    )
                );

                if (uniqueItems.length === 0 && decryptedImportItems.length > 0) {
                    toast.info("All items were duplicates and skipped.");
                    setIsImportDialogOpen(false);
                    return;
                }
                // Update state just in case, though we pass valid list below
                setDecryptedImportItems(uniqueItems);

                await logActivity('vault_import_appended', { count: uniqueItems.length });
            }

            setImportStep('processing');

            // Execute batch insert
            const finalItems = importMode === 'replace' ? decryptedImportItems : decryptedImportItems.filter(newItem =>
                !vaultItems.some(existing =>
                    existing.name === newItem.name &&
                    existing.username === newItem.username &&
                    existing.category === newItem.category
                )
            );

            await importItems(finalItems);

            toast.success("Vault imported successfully");
            setIsImportDialogOpen(false);

        } catch (error: any) {
            console.error("Import execution failed:", error);
            toast.error("Import failed: " + error.message);
        }
    };

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
                                    <KeyRound className="w-5 h-5 text-blue-500" /> {hasAuthPassword ? "Auth Password" : "Set Auth Password"}
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <div className="text-sm text-neutral-400">
                                            {hasAuthPassword
                                                ? "Manage your login password"
                                                : "Enable email login by setting a password"}
                                        </div>
                                        <div className="text-xs text-neutral-500">
                                            {hasAuthPassword
                                                ? `Last changed: ${getLastEventDate('auth_password_change')}`
                                                : "No password set yet"}
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-3">
                                        <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
                                            <DialogTrigger asChild>
                                                <Button variant="outline" className="w-full border-white/10 hover:bg-zinc-800">
                                                    {hasAuthPassword ? "Change Password" : "Set Password"}
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="bg-zinc-950 border-white/10 text-white sm:max-w-[425px]">
                                                <DialogHeader>
                                                    <DialogTitle>{hasAuthPassword ? "Change Password" : "Set Authentication Password"}</DialogTitle>
                                                    <DialogDescription className="text-neutral-400">
                                                        {hasAuthPassword
                                                            ? "Enter your current password and a new strong password."
                                                            : "Choose a strong password to enable email/password login."}
                                                    </DialogDescription>
                                                </DialogHeader>
                                                <div className="space-y-4 py-4">
                                                    {hasAuthPassword && (
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
                                                    )}
                                                    <div className="space-y-2">
                                                        <Label>{hasAuthPassword ? "New Password" : "Password"}</Label>
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
                                                    <Button onClick={handleChangePassword} className="bg-blue-600 hover:bg-blue-700">
                                                        {hasAuthPassword ? "Update Password" : "Set Password"}
                                                    </Button>
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
                                            <Checkbox
                                                id="lock-tab"
                                                checked={settings?.lock_on_tab_close ?? true}
                                                onCheckedChange={async (checked) => {
                                                    try {
                                                        await updateSettings({ lock_on_tab_close: !!checked });
                                                        toast.success(`Lock on tab close ${checked ? 'enabled' : 'disabled'}`);
                                                    } catch (error) {
                                                        toast.error("Failed to update setting");
                                                    }
                                                }}
                                                className="border-white/20 data-[state=checked]:bg-blue-600 data-[state=checked]:text-white"
                                            />
                                            <Label htmlFor="lock-tab" className="cursor-pointer">Lock when tab is closed</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Checkbox
                                                id="lock-sleep"
                                                checked={settings?.lock_on_sleep ?? true}
                                                onCheckedChange={async (checked) => {
                                                    try {
                                                        await updateSettings({ lock_on_sleep: !!checked });
                                                        toast.success(`Lock on sleep ${checked ? 'enabled' : 'disabled'}`);
                                                    } catch (error) {
                                                        toast.error("Failed to update setting");
                                                    }
                                                }}
                                                className="border-white/20 data-[state=checked]:bg-blue-600 data-[state=checked]:text-white"
                                            />
                                            <Label htmlFor="lock-sleep" className="cursor-pointer">Lock when system sleeps</Label>
                                        </div>
                                    </div>

                                    <div className="h-px bg-white/5" />

                                    <div className="flex items-center justify-between opacity-50 cursor-not-allowed" title="Coming Soon">
                                        <div className="space-y-0.5">
                                            <Label className="text-base text-neutral-200 cursor-not-allowed">Clear Clipboard (Coming Soon)</Label>
                                            <p className="text-sm text-neutral-500">
                                                Clear copied passwords after 30 seconds.
                                                <br />
                                                <span className="text-xs text-orange-400/80">
                                                    Note: This clears the active clipboard only. Your OS may retain clipboard history.
                                                </span>
                                            </p>
                                        </div>
                                        <Checkbox
                                            checked={true}
                                            disabled
                                            className="border-white/20 data-[state=checked]:bg-zinc-700 data-[state=checked]:text-neutral-400 cursor-not-allowed"
                                        />
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

                                    {/* Action: Change Master Password */}
                                    <div className="flex items-center justify-between p-4 rounded-lg bg-zinc-950/50 border border-white/5">
                                        <div className="space-y-1">
                                            <div className="font-medium text-white">Master Password</div>
                                            <div className="text-sm text-neutral-500">Change the password used to encrypt your vault</div>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                setIsChangeMasterPasswordOpen(true);
                                                setChangeMasterPasswordStep('verify');
                                                setCurrentMasterPassword("");
                                                setNewMasterPassword("");
                                                setConfirmNewMasterPassword("");
                                                setChangeMasterPasswordError("");
                                            }}
                                            className="border-white/10 hover:bg-zinc-800"
                                        >
                                            Change Password
                                        </Button>
                                    </div>

                                    {/* Change Master Password Dialog */}
                                    <Dialog open={isChangeMasterPasswordOpen} onOpenChange={setIsChangeMasterPasswordOpen}>
                                        <DialogContent className="bg-zinc-950 border-white/10 text-white sm:max-w-[500px]">
                                            <DialogHeader>
                                                <DialogTitle>Change Master Password</DialogTitle>
                                                <DialogDescription className="text-neutral-400">
                                                    Update your master password. This will re-encrypt your vault key.
                                                </DialogDescription>
                                            </DialogHeader>

                                            {changeMasterPasswordStep === 'verify' && (
                                                <div className="space-y-4 py-4">
                                                    <div className="space-y-2">
                                                        <Label>Current Master Password</Label>
                                                        <Input
                                                            type="password"
                                                            value={currentMasterPassword}
                                                            onChange={(e) => {
                                                                setCurrentMasterPassword(e.target.value);
                                                                setChangeMasterPasswordError("");
                                                            }}
                                                            className="bg-zinc-900 border-white/10"
                                                            autoFocus
                                                        />
                                                        {changeMasterPasswordError && <p className="text-xs text-red-500">{changeMasterPasswordError}</p>}
                                                    </div>
                                                    <DialogFooter>
                                                        <Button variant="ghost" onClick={() => setIsChangeMasterPasswordOpen(false)}>Cancel</Button>
                                                        <Button
                                                            onClick={async () => {
                                                                if (!settings?.encrypted_vault_key || !settings?.vault_key_salt) {
                                                                    setChangeMasterPasswordError("Vault settings not found.");
                                                                    return;
                                                                }
                                                                setIsChangePasswordLoading(true);
                                                                try {
                                                                    // Verify current password
                                                                    const derivedKey = await deriveMasterKey(currentMasterPassword, settings.vault_key_salt);
                                                                    const vaultKey = await decryptVaultKey(settings.encrypted_vault_key, derivedKey);

                                                                    if (vaultKey) {
                                                                        setChangeMasterPasswordStep('new');
                                                                    } else {
                                                                        setChangeMasterPasswordError("Incorrect master password");
                                                                    }
                                                                } catch (err) {
                                                                    setChangeMasterPasswordError("Verification failed");
                                                                } finally {
                                                                    setIsChangePasswordLoading(false);
                                                                }
                                                            }}
                                                            disabled={!currentMasterPassword || isChangePasswordLoading}
                                                        >
                                                            {isChangePasswordLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify & Continue"}
                                                        </Button>
                                                    </DialogFooter>
                                                </div>
                                            )}

                                            {changeMasterPasswordStep === 'new' && (
                                                <div className="space-y-4 py-4">
                                                    <div className="space-y-2">
                                                        <Label>New Master Password</Label>
                                                        <Input
                                                            type="password"
                                                            value={newMasterPassword}
                                                            onChange={(e) => setNewMasterPassword(e.target.value)}
                                                            className="bg-zinc-900 border-white/10"
                                                            autoFocus
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Confirm New Password</Label>
                                                        <Input
                                                            type="password"
                                                            value={confirmNewMasterPassword}
                                                            onChange={(e) => setConfirmNewMasterPassword(e.target.value)}
                                                            className="bg-zinc-900 border-white/10"
                                                        />
                                                    </div>
                                                    <ul className="text-xs text-neutral-500 space-y-1 list-disc pl-4">
                                                        <li className={newMasterPassword.length >= 8 ? "text-green-500" : ""}>At least 8 characters</li>
                                                        <li className={newMasterPassword && newMasterPassword === confirmNewMasterPassword ? "text-green-500" : ""}>Passwords match</li>
                                                    </ul>
                                                    <DialogFooter>
                                                        <Button variant="ghost" onClick={() => setChangeMasterPasswordStep('verify')}>Back</Button>
                                                        <Button
                                                            onClick={async () => {
                                                                if (newMasterPassword !== confirmNewMasterPassword) {
                                                                    toast.error("New passwords do not match.");
                                                                    return;
                                                                }
                                                                if (newMasterPassword.length < 8) {
                                                                    toast.error("New master password must be at least 8 characters.");
                                                                    return;
                                                                }

                                                                setChangeMasterPasswordStep('processing');
                                                                try {
                                                                    const { data: { user } } = await supabase.auth.getUser();
                                                                    if (!user) throw new Error("User not authenticated.");

                                                                    // 1. Decrypt vault key with OLD password (we know it's valid from step 1)
                                                                    if (!settings?.encrypted_vault_key || !settings?.vault_key_salt) throw new Error("Missing vault settings");
                                                                    const oldKey = await deriveMasterKey(currentMasterPassword, settings.vault_key_salt);
                                                                    const vaultKey = await decryptVaultKey(settings.encrypted_vault_key, oldKey);

                                                                    if (!vaultKey) throw new Error("Critical: Failed to decrypt vault key during rotation");

                                                                    // 2. Generate NEW salt and encrypt vault key with NEW password
                                                                    const newSalt = generateSalt();
                                                                    const newMasterKey = await deriveMasterKey(newMasterPassword, newSalt);
                                                                    const newEncryptedVaultKey = await encryptVaultKey(vaultKey, newMasterKey);

                                                                    // 3. Update Supabase
                                                                    const { error } = await (supabase
                                                                        .from('user_settings') as any)
                                                                        .update({
                                                                            encrypted_vault_key: newEncryptedVaultKey,
                                                                            vault_key_salt: newSalt
                                                                        })
                                                                        .eq('user_id', user!.id);

                                                                    if (error) throw error;

                                                                    // 4. Log Activity
                                                                    await logActivity('master_password_change', { method: 'settings_reset' });

                                                                    setChangeMasterPasswordStep('success');
                                                                    toast.success("Master password updated successfully");

                                                                } catch (err: any) {
                                                                    console.error("Failed to update master password:", err);
                                                                    toast.error("Failed to update password: " + err.message);
                                                                    setChangeMasterPasswordStep('new'); // Go back
                                                                }
                                                            }}
                                                            disabled={!newMasterPassword || newMasterPassword !== confirmNewMasterPassword || newMasterPassword.length < 8}
                                                        >
                                                            Update Password
                                                        </Button>
                                                    </DialogFooter>
                                                </div>
                                            )}

                                            {changeMasterPasswordStep === 'processing' && (
                                                <div className="py-8 flex flex-col items-center justify-center space-y-4">
                                                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                                                    <p className="text-neutral-400">Re-encrypting vault key...</p>
                                                    <div className="text-xs text-neutral-500">Do not close this window</div>
                                                </div>
                                            )}

                                            {changeMasterPasswordStep === 'success' && (
                                                <div className="space-y-4 py-4 text-center">
                                                    <div className="mx-auto w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
                                                        <Check className="w-6 h-6 text-green-500" />
                                                    </div>
                                                    <h3 className="text-lg font-medium text-white">Password Updated</h3>
                                                    <p className="text-sm text-neutral-400">
                                                        Your master password has been changed successfully. Please use your new password for all future logins.
                                                    </p>
                                                    <DialogFooter className="justify-center sm:justify-center">
                                                        <Button onClick={() => setIsChangeMasterPasswordOpen(false)} className="w-full sm:w-auto">
                                                            Close
                                                        </Button>
                                                    </DialogFooter>
                                                </div>
                                            )}
                                        </DialogContent>
                                    </Dialog>

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
                                                            copyToClipboard(newRecoveryCodes.join('\n'), "Recovery Codes");
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
                                            <Button
                                                variant={mfaEnabled ? "destructive" : "default"}
                                                size="sm"
                                                onClick={() => handleMfaToggle(!mfaEnabled)}
                                            >
                                                {mfaEnabled ? "Disable 2FA" : "Enable 2FA"}
                                            </Button>
                                        </div>
                                    </div>


                                </div>
                            </div>
                        </div>

                        {/* 4. Data Management */}
                        <div className="space-y-4">
                            <h2 className="text-sm font-medium text-neutral-400 uppercase tracking-wider pl-1">Data & Notifications</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Data */}
                                <div className="p-6 rounded-xl border border-white/5 bg-zinc-900/50 space-y-6">
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <h3 className="text-lg font-medium flex items-center gap-2">
                                                    <HardDrive className="w-5 h-5 text-neutral-400" /> Data Management
                                                </h3>
                                                <p className="text-sm text-neutral-500">
                                                    Backup your vault or import from file.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 pt-4">
                                            <Button
                                                variant="outline"
                                                className="h-auto py-4 border-white/10 hover:bg-zinc-800 flex flex-col gap-2"
                                                onClick={handleExportInitiate}
                                            >
                                                <Upload className="w-5 h-5 mb-1" />
                                                <span className="font-medium">Export Vault</span>
                                                <span className="text-xs text-neutral-500 font-normal">Encrypted JSON</span>
                                            </Button>

                                            <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
                                                <DialogTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        className="h-auto py-4 border-white/10 hover:bg-zinc-800 flex flex-col gap-2"
                                                        onClick={handleImportInitiate}
                                                    >
                                                        <Download className="w-5 h-5 mb-1" />
                                                        <span className="font-medium">Import Vault</span>
                                                        <span className="text-xs text-neutral-500 font-normal">Restore backup</span>
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent className="bg-zinc-950 border-white/10 text-white sm:max-w-[500px]">
                                                    <DialogHeader>
                                                        <DialogTitle>Import Vault</DialogTitle>
                                                        <DialogDescription className="text-neutral-400">
                                                            Restore your passwords from an encrypted Aegis backup.
                                                        </DialogDescription>
                                                    </DialogHeader>

                                                    {/* Import Wizard Steps */}
                                                    {importStep === 'warning' && (
                                                        <div className="space-y-4 py-4">
                                                            <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-200 text-sm">
                                                                <Shield className="w-5 h-5 shrink-0 mt-0.5" />
                                                                <div>
                                                                    <span className="font-bold">Security Notice:</span> Only import files you created yourself. You will need the exact Master Password used to encrypt the backup file.
                                                                </div>
                                                            </div>
                                                            <DialogFooter>
                                                                <Button variant="ghost" onClick={() => setIsImportDialogOpen(false)}>Cancel</Button>
                                                                <Button onClick={() => setImportStep('mode')}>Continue</Button>
                                                            </DialogFooter>
                                                        </div>
                                                    )}

                                                    {importStep === 'mode' && (
                                                        <div className="space-y-4 py-4">
                                                            <div className="space-y-3">
                                                                <div
                                                                    className={cn(
                                                                        "p-4 rounded-lg border cursor-pointer transition-all",
                                                                        importMode === 'append' ? "bg-blue-500/10 border-blue-500" : "bg-zinc-900 border-white/10 hover:border-white/20"
                                                                    )}
                                                                    onClick={() => setImportMode('append')}
                                                                >
                                                                    <div className="flex items-center gap-2 font-medium mb-1">
                                                                        <div className={cn("w-4 h-4 rounded-full border flex items-center justify-center", importMode === 'append' ? "border-blue-500" : "border-neutral-500")}>
                                                                            {importMode === 'append' && <div className="w-2 h-2 bg-blue-500 rounded-full" />}
                                                                        </div>
                                                                        Append to existing vault
                                                                    </div>
                                                                    <p className="text-sm text-neutral-400 pl-6">
                                                                        Add items to your current vault. Existing duplicates will be skipped.
                                                                    </p>
                                                                </div>

                                                                <div
                                                                    className={cn(
                                                                        "p-4 rounded-lg border cursor-pointer transition-all",
                                                                        importMode === 'replace' ? "bg-red-500/10 border-red-500" : "bg-zinc-900 border-white/10 hover:border-white/20"
                                                                    )}
                                                                    onClick={() => setImportMode('replace')}
                                                                >
                                                                    <div className="flex items-center gap-2 font-medium mb-1 text-red-400">
                                                                        <div className={cn("w-4 h-4 rounded-full border flex items-center justify-center", importMode === 'replace' ? "border-red-500" : "border-neutral-500")}>
                                                                            {importMode === 'replace' && <div className="w-2 h-2 bg-red-500 rounded-full" />}
                                                                        </div>
                                                                        Replace current vault
                                                                    </div>
                                                                    <p className="text-sm text-neutral-400 pl-6">
                                                                        Permanently delete current items and replace with backup data.
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <DialogFooter>
                                                                <Button variant="ghost" onClick={() => setImportStep('warning')}>Back</Button>
                                                                <Button onClick={() => setImportStep('file')}>Continue</Button>
                                                            </DialogFooter>
                                                        </div>
                                                    )}

                                                    {importStep === 'file' && (
                                                        <div className="space-y-4 py-4">
                                                            <div className="space-y-2">
                                                                <Label>Select Backup File</Label>
                                                                <div className="relative">
                                                                    <Input
                                                                        type="file"
                                                                        id="import-file"
                                                                        accept=".json"
                                                                        onChange={handleImportFileSelect}
                                                                        className="hidden"
                                                                    />
                                                                    <Label
                                                                        htmlFor="import-file"
                                                                        className="flex flex-col items-center justify-center w-full p-8 border-2 border-dashed border-white/10 rounded-lg cursor-pointer hover:border-blue-500/50 hover:bg-blue-500/5 transition-all group"
                                                                    >
                                                                        <div className="p-3 bg-zinc-900 rounded-full mb-3 group-hover:bg-blue-500/10 transition-colors">
                                                                            <Upload className="w-6 h-6 text-neutral-400 group-hover:text-blue-400" />
                                                                        </div>
                                                                        <div className="text-sm font-medium text-neutral-300 text-center">
                                                                            {importFile ? (
                                                                                <span className="text-green-400 flex items-center gap-2">
                                                                                    <Check className="w-4 h-4" /> Backup File Loaded
                                                                                </span>
                                                                            ) : (
                                                                                <span>Click to select backup file</span>
                                                                            )}
                                                                        </div>
                                                                        <div className="text-xs text-neutral-500 mt-1">
                                                                            {importFile ? "Ready to decrypt" : "Supported format: .json"}
                                                                        </div>
                                                                    </Label>
                                                                </div>
                                                            </div>
                                                            <DialogFooter>
                                                                <Button variant="ghost" onClick={() => setImportStep('mode')}>Back</Button>
                                                                <Button disabled={!importFile} onClick={() => setImportStep('decrypt')}>Continue</Button>
                                                            </DialogFooter>
                                                        </div>
                                                    )}

                                                    {importStep === 'decrypt' && (
                                                        <div className="space-y-4 py-4">
                                                            <div className="space-y-2">
                                                                <Label>Enter Backup Password</Label>
                                                                <p className="text-xs text-neutral-400">Enter the Master Password that was used to encrypt this file.</p>
                                                                <Input
                                                                    type="password"
                                                                    value={importPassword}
                                                                    onChange={(e) => setImportPassword(e.target.value)}
                                                                    className="bg-zinc-900 border-white/10"
                                                                    autoFocus
                                                                />
                                                            </div>
                                                            <DialogFooter>
                                                                <Button variant="ghost" onClick={() => setImportStep('file')}>Back</Button>
                                                                <Button disabled={!importPassword} onClick={handleImportDecrypt}>Decrypt & Preview</Button>
                                                            </DialogFooter>
                                                        </div>
                                                    )}

                                                    {importStep === 'summary' && (
                                                        <div className="space-y-4 py-4">
                                                            <div className="space-y-3">
                                                                <h4 className="font-medium text-green-400 flex items-center gap-2">
                                                                    <Check className="w-4 h-4" /> Decryption Successful
                                                                </h4>
                                                                <div className="grid grid-cols-2 gap-4 text-center">
                                                                    <div className="p-3 bg-zinc-900 rounded border border-white/10">
                                                                        <div className="text-2xl font-bold">{importStats.total}</div>
                                                                        <div className="text-xs text-neutral-500">Items Found</div>
                                                                    </div>
                                                                    <div className="p-3 bg-zinc-900 rounded border border-white/10">
                                                                        <div className="text-2xl font-bold">{importMode === 'append' ? importStats.duplicates : '-'}</div>
                                                                        <div className="text-xs text-neutral-500">{importMode === 'append' ? 'Skipped (Duplicates)' : 'Will replace all'}</div>
                                                                    </div>
                                                                </div>

                                                                {importMode === 'replace' && (
                                                                    <div className="space-y-2 pt-2">
                                                                        <Label className="text-red-400">Confirm Replacement</Label>
                                                                        <Input
                                                                            value={importConfirmText}
                                                                            onChange={(e) => setImportConfirmText(e.target.value)}
                                                                            placeholder="Type 'REPLACE MY VAULT'"
                                                                            className="bg-red-950/20 border-red-500/30 text-red-200 placeholder:text-red-700"
                                                                        />
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <DialogFooter>
                                                                <Button variant="ghost" onClick={() => setImportStep('file')}>Cancel</Button>
                                                                <Button
                                                                    onClick={handleImportExecute}
                                                                    variant={importMode === 'replace' ? "destructive" : "default"}
                                                                    disabled={importMode === 'replace' && importConfirmText !== 'REPLACE MY VAULT'}
                                                                >
                                                                    {importMode === 'replace' ? 'Replace Vault' : 'Import Items'}
                                                                </Button>
                                                            </DialogFooter>
                                                        </div>
                                                    )}

                                                    {importStep === 'processing' && (
                                                        <div className="py-8 flex flex-col items-center justify-center space-y-4">
                                                            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                                                            <p className="text-neutral-400">Importing your vault data...</p>
                                                        </div>
                                                    )}
                                                </DialogContent>
                                            </Dialog>
                                        </div>

                                        <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
                                            <DialogContent className="bg-zinc-950 border-white/10 text-white sm:max-w-[500px]">
                                                <DialogHeader>
                                                    <DialogTitle>Export Vault</DialogTitle>
                                                    <DialogDescription className="text-neutral-400">
                                                        Download an encrypted backup of your vault.
                                                    </DialogDescription>
                                                </DialogHeader>

                                                {exportStep === 'warning' && (
                                                    <div className="space-y-4 py-4">
                                                        <div className="flex items-start gap-3 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-200 text-sm">
                                                            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                                                            <div>
                                                                <span className="font-bold">Warning:</span> Ideally, you should store this file on an offline storage device (like a USB drive). Anyone with this file and your Master Password can access your data.
                                                            </div>
                                                        </div>
                                                        <DialogFooter>
                                                            <Button variant="ghost" onClick={() => setIsExportDialogOpen(false)}>Cancel</Button>
                                                            <Button onClick={() => setExportStep('verify')}>I Understand, Continue</Button>
                                                        </DialogFooter>
                                                    </div>
                                                )}

                                                {exportStep === 'verify' && (
                                                    <div className="space-y-4 py-4">
                                                        <div className="space-y-2">
                                                            <Label>Verify Master Password</Label>
                                                            <Input
                                                                type="password"
                                                                value={exportMasterPassword}
                                                                onChange={(e) => setExportMasterPassword(e.target.value)}
                                                                className="bg-zinc-900 border-white/10"
                                                                autoFocus
                                                            />
                                                        </div>
                                                        <DialogFooter>
                                                            <Button variant="ghost" onClick={() => setExportStep('warning')}>Back</Button>
                                                            <Button onClick={handleExportVerify}>Verify & Download</Button>
                                                        </DialogFooter>
                                                    </div>
                                                )}

                                                {exportStep === 'processing' && (
                                                    <div className="py-8 flex flex-col items-center justify-center space-y-4">
                                                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                                                        <p className="text-neutral-400">Encrypting vault data...</p>
                                                        <div className="text-xs text-neutral-500">Do not close this window</div>
                                                    </div>
                                                )}
                                            </DialogContent>
                                        </Dialog>
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
                        {/* Username Presets */}
                        <div className="space-y-4">
                            <h2 className="text-sm font-medium text-neutral-400 uppercase tracking-wider pl-1">Username Presets</h2>
                            <div className="p-6 rounded-xl border border-white/5 bg-zinc-900/50 space-y-6">
                                <h3 className="text-lg font-medium flex items-center gap-2">
                                    <User className="w-5 h-5 text-purple-400" /> Managed Presets
                                </h3>

                                <div className="space-y-4">
                                    <div className="text-sm text-neutral-400">
                                        Save frequently used usernames or emails to quickly fill them when adding new items.
                                    </div>

                                    <div className="flex gap-2 max-w-md">
                                        <Input
                                            placeholder="Add new preset (e.g. email@work.com)"
                                            value={newPreset}
                                            onChange={(e) => setNewPreset(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleAddPreset()}
                                            className="bg-zinc-950 border-white/10"
                                        />
                                        <Button onClick={handleAddPreset} size="icon" className="shrink-0 bg-blue-600 hover:bg-blue-700">
                                            <Plus className="w-4 h-4" />
                                        </Button>
                                    </div>

                                    <div className="flex flex-wrap gap-2 pt-2">
                                        {settings?.username_presets?.map((preset) => (
                                            <PresetBadge
                                                key={preset}
                                                encryptedPreset={preset}
                                                onRemove={() => handleRemovePreset(preset)}
                                            />
                                        ))}
                                        {(!settings?.username_presets || settings.username_presets.length === 0) && (
                                            <span className="text-sm text-neutral-600 italic">No presets added yet.</span>
                                        )}
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
                                        'vault_import_appended',
                                        'vault_import_replaced'
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
                                                                        Go to Settings â†’ Export Vault to download an encrypted backup.
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
                {/* MFA Enrollment Dialog */}
                <Dialog open={isMfaModalOpen} onOpenChange={(open) => {
                    setIsMfaModalOpen(open);
                    if (!open && mfaStep !== 'success') {
                        setMfaStep('intro');
                        setMfaError("");
                        setMfaCode("");
                    }
                }}>
                    <DialogContent className="bg-zinc-950 border-white/10 text-white sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Two-Factor Authentication Setup</DialogTitle>
                        </DialogHeader>

                        {mfaStep === 'intro' && (
                            <div className="space-y-4 py-4">
                                <div className="flex items-center justify-center p-4 bg-primary/10 rounded-full w-16 h-16 mx-auto mb-2">
                                    <Shield className="w-8 h-8 text-primary" />
                                </div>
                                <div className="text-center space-y-2">
                                    <h3 className="font-medium text-lg">Secure Your Account</h3>
                                    <p className="text-neutral-400 text-sm">
                                        Two-Factor Authentication adds an extra layer of security to your account.
                                        You'll need an authenticator app (like Google Authenticator or Authy) to generate verification codes.
                                    </p>
                                </div>
                                <DialogFooter className="pt-4">
                                    <Button variant="ghost" onClick={() => setIsMfaModalOpen(false)}>Cancel</Button>
                                    <Button onClick={handleMfaEnroll} disabled={mfaLoading}>
                                        {mfaLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Continue"}
                                    </Button>
                                </DialogFooter>
                            </div>
                        )}

                        {mfaStep === 'scan' && (
                            <div className="space-y-4 py-2">
                                <div className="space-y-2 text-center">
                                    <p className="text-sm text-neutral-400">Scan this QR code with your authenticator app</p>
                                    <div className="flex justify-center items-center p-4 bg-white rounded-lg w-fit mx-auto">
                                        {mfaQr ? (
                                            <div dangerouslySetInnerHTML={{ __html: mfaQr }} />
                                        ) : (
                                            <div className="w-48 h-48 flex items-center justify-center bg-neutral-100 rounded">
                                                <Loader2 className="w-8 h-8 text-zinc-900 animate-spin" />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs text-neutral-500 uppercase tracking-wider">Manual Entry Key</Label>
                                    <div className="flex items-center gap-2">
                                        <code className="flex-1 p-2 bg-zinc-900 rounded border border-white/10 font-mono text-sm text-center select-all">
                                            {mfaSecret}
                                        </code>
                                        <Button
                                            size="icon"
                                            variant="outline"
                                            className="shrink-0 border-white/10"
                                            onClick={() => {
                                                copyToClipboard(mfaSecret, "MFA Secret");
                                            }}
                                        >
                                            <Copy className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>

                                <div className="flex items-start gap-2 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-200 text-xs mt-2">
                                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                                    <span>Do not close this window until setup is complete.</span>
                                </div>

                                <DialogFooter className="pt-2">
                                    <Button variant="ghost" onClick={() => setMfaStep('intro')}>Back</Button>
                                    <Button onClick={() => setMfaStep('verify')}>Continue</Button>
                                </DialogFooter>
                            </div>
                        )}

                        {mfaStep === 'verify' && (
                            <div className="space-y-4 py-4">
                                <div className="text-center space-y-2">
                                    <h3 className="font-medium">Verify Setup</h3>
                                    <p className="text-neutral-400 text-sm">
                                        Enter the 6-digit code from your authenticator app to enable 2FA.
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label>Authentication Code</Label>
                                    <div className="relative flex justify-center gap-2">
                                        <Input
                                            value={mfaCode}
                                            onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                            className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-default"
                                            maxLength={6}
                                            autoFocus
                                            autoComplete="one-time-code"
                                            inputMode="numeric"
                                        />
                                        {Array.from({ length: 6 }).map((_, i) => (
                                            <div
                                                key={i}
                                                className={`w-12 h-14 rounded-lg border flex items-center justify-center text-2xl font-mono transition-all ${mfaCode[i]
                                                    ? "border-primary bg-primary/10 text-primary" // Filled state
                                                    : i === mfaCode.length
                                                        ? "border-primary/50 bg-zinc-900 shadow-[0_0_0_1px_rgba(168,85,247,0.4)]" // Active/Focused state
                                                        : "border-white/10 bg-zinc-900 text-neutral-500" // Empty state
                                                    }`}
                                            >
                                                {mfaCode[i] || ""}
                                            </div>
                                        ))}
                                    </div>
                                    {mfaError && <p className="text-xs text-red-500">{mfaError}</p>}
                                </div>

                                <DialogFooter className="pt-2">
                                    <Button variant="ghost" onClick={() => setMfaStep('scan')}>Back</Button>
                                    <Button
                                        onClick={handleMfaVerify}
                                        disabled={mfaLoading || mfaCode.length !== 6}
                                    >
                                        {mfaLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify & Enable"}
                                    </Button>
                                </DialogFooter>
                            </div>
                        )}

                        {mfaStep === 'success' && (
                            <div className="space-y-4 py-6 text-center">
                                <div className="flex items-center justify-center p-4 bg-green-500/10 rounded-full w-16 h-16 mx-auto mb-2">
                                    <Check className="w-8 h-8 text-green-500" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="font-medium text-lg text-green-500">2FA Enabled Successfully!</h3>
                                    <p className="text-neutral-400 text-sm">
                                        Your account is now secured with Two-Factor Authentication.
                                        You will need to use your authenticator app next time you sign in.
                                    </p>
                                </div>
                                <Button onClick={() => setIsMfaModalOpen(false)} className="w-full mt-4 bg-zinc-800 hover:bg-zinc-700">
                                    Done
                                </Button>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>

                {/* Disable MFA Dialog */}
                <Dialog open={isDisableMfaDialogOpen} onOpenChange={setIsDisableMfaDialogOpen}>
                    <DialogContent className="bg-zinc-900 border-white/10 text-white sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle className="text-red-500 flex items-center gap-2">
                                <Shield className="w-5 h-5" /> Disable Two-Factor Authentication?
                            </DialogTitle>
                            <DialogDescription className="text-neutral-400">
                                This will remove the extra layer of security from your account. Verify your login password to continue.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Login Password</Label>
                                <Input
                                    type="password"
                                    value={disableMfaPassword}
                                    onChange={(e) => setDisableMfaPassword(e.target.value)}
                                    placeholder="Verify identity..."
                                    className="bg-zinc-950 border-white/10"
                                />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button variant="ghost" onClick={() => setIsDisableMfaDialogOpen(false)}>Cancel</Button>
                            <Button
                                variant="destructive"
                                onClick={handleMfaDisable}
                                disabled={mfaLoading || !disableMfaPassword}
                            >
                                {mfaLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Disable 2FA"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

            </div>
        </div >
    );
}
