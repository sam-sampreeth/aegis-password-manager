import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type LockReason = "manual" | "inactivity" | "system" | null;

interface LockContextType {
    isLocked: boolean;
    isSecuring: boolean;
    lockReason: LockReason;
    lockVault: (reason?: LockReason) => void;
    unlockVault: (password: string) => boolean;
}

const LockContext = createContext<LockContextType | undefined>(undefined);

export function LockProvider({ children }: { children: ReactNode }) {
    const [isLocked, setIsLocked] = useState(true);
    const [isSecuring, setIsSecuring] = useState(false);
    const [lockReason, setLockReason] = useState<LockReason>(null);
    const [lastActivity, setLastActivity] = useState(Date.now());

    // 30 Seconds Idle Timeout (For Testing) - reverting to 5 min for production usage if requested, testing 30s now.
    // User requested "rn it just shows the vault is locked due to inactivity" implying they saw this.
    // Let's keep it reasonable, say 1 minute for quicker testing or 5 mins. 
    // I'll stick to a reasonable default or what the file had (5 mins) but use the reasoning.
    const TIMEOUT_MS = 5 * 60 * 1000;

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

    const unlockVault = (password: string) => {
        // In a real app, verify against the actual master password hash.
        if (password) {
            setIsLocked(false);
            setLockReason(null);
            setLastActivity(Date.now());
            return true;
        }
        return false;
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

    // Idle Check Interval
    useEffect(() => {
        const interval = setInterval(() => {
            if (!isLocked && Date.now() - lastActivity > TIMEOUT_MS) {
                // Auto-lock doesn't need the delay/animation usually, or maybe it does?
                // Let's force it immediately or call lockVault. 
                // Using lockVault("inactivity") triggers the animation which is nice.
                if (!isSecuring) {
                    lockVault("inactivity");
                }
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [isLocked, lastActivity, TIMEOUT_MS, isSecuring]);

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
