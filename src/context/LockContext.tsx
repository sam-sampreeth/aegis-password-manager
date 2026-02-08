import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "../lib/supabase";
import { deriveMasterKey, decryptVaultKey, verifyRecoveryCodeAndGetVaultKey } from "../lib/crypto";
import { useAuth } from "./AuthContext";
import { useUserSettings } from "../hooks/useProfiles";

export type LockReason = "manual" | "inactivity" | "system" | null;

interface LockContextType {
    isLocked: boolean;
    isSecuring: boolean;
    lockReason: LockReason;
    lockVault: (reason?: LockReason) => void;
    unlockVault: (password: string, isRecoveryCode?: boolean) => Promise<boolean>;
}

const LockContext = createContext<LockContextType | undefined>(undefined);

export function LockProvider({ children }: { children: ReactNode }) {
    const [isLocked, setIsLocked] = useState(true);
    const [isSecuring, setIsSecuring] = useState(false);
    const [lockReason, setLockReason] = useState<LockReason>(null);
    const [lastActivity, setLastActivity] = useState(Date.now());
    const { user } = useAuth(); // Get user from AuthContext which handles demo state

    const { settings } = useUserSettings();

    // Auto-lock timer calculation
    const TIMEOUT_MS = (settings?.auto_lock_minutes || 5) * 60 * 1000;
    const isAutoLockEnabled = settings?.auto_lock_minutes !== 0;

    // Track last check for sleep detection
    const [lastCheck, setLastCheck] = useState(Date.now());

    const lockVault = (reason: LockReason = "manual") => {
        setIsSecuring(true);
        // Add a small delay to show the "Securing Vault..." animation
        // This ensures the user sees the transition before the lock screen appears
        setTimeout(() => {
            setIsLocked(true);
            setLockReason(reason);
            setIsSecuring(false);
        }, 1500);
    };

    const unlockVault = async (password: string, isRecoveryCode: boolean = false): Promise<boolean> => {
        try {
            // Demo Mode Override
            // We check if the user ID matches the demo user ID set in AuthContext
            if (user?.id === "demo-user") {
                if (!isRecoveryCode && password === "demo123") {
                    setIsLocked(false);
                    setLockReason(null);
                    setLastActivity(Date.now());
                    return true;
                }
                return false;
            }

            if (!user) return false;

            // Fetch user's encrypted vault key and salt
            const { data: settings, error: fetchError } = await (supabase
                .from('user_settings')
                .select('encrypted_vault_key, vault_key_salt, encrypted_recovery_codes')
                .eq('user_id', user.id)
                .single() as any);

            if (fetchError || !settings) {
                console.error('Failed to fetch settings:', fetchError);
                return false;
            }

            let vaultKey: string | null = null;

            if (isRecoveryCode) {
                // Verify recovery code and get vault key
                // @ts-ignore - Supabase type inference issue
                if (!(settings as any).encrypted_recovery_codes) {
                    return false;
                }
                vaultKey = await verifyRecoveryCodeAndGetVaultKey(
                    password,
                    (settings as any).encrypted_recovery_codes
                );

                if (vaultKey) {
                    // Log recovery code usage
                    await (supabase.from('vault_activity') as any).insert({
                        user_id: user.id,
                        event_type: 'recovery_code_used',
                        metadata: { timestamp: new Date().toISOString() }
                    });
                }
            } else {
                // Verify master password by attempting decryption
                if (!settings.encrypted_vault_key || !settings.vault_key_salt) {
                    return false;
                }

                const masterKey = await deriveMasterKey(password, settings.vault_key_salt);
                vaultKey = await decryptVaultKey(settings.encrypted_vault_key, masterKey);
            }

            if (vaultKey) {
                // Success! Store vault key in session
                sessionStorage.setItem('vaultKey', vaultKey);
                setIsLocked(false);
                setLockReason(null);
                setLastActivity(Date.now());
                return true;
            }

            return false; // Wrong password/code
        } catch (error) {
            console.error('Unlock error:', error);
            return false;
        }
    };

    // Activity Listener
    useEffect(() => {
        const handleActivity = () => {
            if (!isLocked) {
                setLastActivity(Date.now());
            }
        };

        window.addEventListener("mousemove", handleActivity);
        window.addEventListener("keydown", handleActivity);
        window.addEventListener("click", handleActivity);
        window.addEventListener("scroll", handleActivity);

        return () => {
            window.removeEventListener("mousemove", handleActivity);
            window.removeEventListener("keydown", handleActivity);
            window.removeEventListener("click", handleActivity);
            window.removeEventListener("scroll", handleActivity);
        };
    }, [isLocked]);

    // Idle Check & Sleep Detection Interval
    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();

            // 1. Idle Check
            if (!isLocked && isAutoLockEnabled && now - lastActivity > TIMEOUT_MS) {
                if (!isSecuring) {
                    lockVault("inactivity");
                }
            }

            // 2. Sleep Detection (Large gap in execution)
            if (!isLocked && settings?.lock_on_sleep && now - lastCheck > 10000) {
                // Gap > 10s indicates system might have slept or tab was suspended
                lockVault("system");
            }

            setLastCheck(now);
        }, 1000);

        return () => clearInterval(interval);
    }, [isLocked, lastActivity, TIMEOUT_MS, isSecuring, isAutoLockEnabled, settings?.lock_on_sleep, lastCheck]);

    // Tab Close / Visibility Change Triggers
    useEffect(() => {
        const handleUnload = () => {
            if (!isLocked && settings?.lock_on_tab_close) {
                // Clear key and lock
                sessionStorage.removeItem('vaultKey');
                // We can't easily wait for state update here, but the browser is closing anyway.
                // However, for REFRESHES, this is important.
            }
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === "hidden") {
                // Optional: We could lock immediately on hide if requested, 
                // but usually "Lock on Sleep" covers the main use case.
            }
        };

        window.addEventListener("beforeunload", handleUnload);
        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            window.removeEventListener("beforeunload", handleUnload);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [isLocked, settings?.lock_on_tab_close]);

    return (
        <LockContext.Provider value={{ isLocked, isSecuring, lockReason, lockVault, unlockVault }}>
            {children}
        </LockContext.Provider>
    );
}

export function useLock() {
    const context = useContext(LockContext);
    if (context === undefined) {
        throw new Error("useLock must be used within a LockProvider");
    }
    return context;
}
