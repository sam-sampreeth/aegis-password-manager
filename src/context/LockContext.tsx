import { createContext, useContext, useEffect, useState, ReactNode } from "react";

interface LockContextType {
    isLocked: boolean;
    lockVault: () => void;
    unlockVault: (password: string) => boolean;
}

const LockContext = createContext<LockContextType | undefined>(undefined);

export function LockProvider({ children }: { children: ReactNode }) {
    const [isLocked, setIsLocked] = useState(false);
    const [lastActivity, setLastActivity] = useState(Date.now());

    // 5 Minutes Idle Timeout
    const TIMEOUT_MS = 5 * 60 * 1000;

    const lockVault = () => {
        setIsLocked(true);
    };

    const unlockVault = (password: string) => {
        // In a real app, verify against the actual master password hash.
        // For this demo, we'll accept any non-empty password or a specific one.
        if (password) {
            setIsLocked(false);
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
                lockVault();
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [isLocked, lastActivity, TIMEOUT_MS]);

    return (
        <LockContext.Provider value={{ isLocked, lockVault, unlockVault }}>
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
