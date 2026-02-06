import { useState, useRef, useEffect } from "react";
import { useLock } from "@/context/LockContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShieldAlert, Lock, LockOpen, QrCode } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export function LockScreen() {
    const { unlockVault, lockReason } = useLock();
    const [password, setPassword] = useState("");
    const [authMethod, setAuthMethod] = useState<"password" | "backup">("password");
    const [backupCode, setBackupCode] = useState("");
    const [error, setError] = useState(false);

    // Backup Code Refs
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        if (authMethod === "backup") {
            setTimeout(() => {
                inputRefs.current[0]?.focus();
            }, 100);
        }
    }, [authMethod]);

    const getLockMessage = () => {
        if (authMethod === "backup") {
            return {
                title: "Backup Unlock",
                description: "Enter a backup code to access your vault."
            };
        }

        switch (lockReason) {
            case "manual":
                return {
                    title: "Vault Locked",
                    description: "Enter your Master Password to unlock your vault."
                };
            case "system":
                return {
                    title: "System Locked",
                    description: "Your vault was locked for security. Please authenticate."
                };
            case "inactivity":
                return {
                    title: "Vault Locked",
                    description: "Your vault is locked due to inactivity. Enter your master password to continue."
                };
            default:
                return {
                    title: "Vault Locked",
                    description: "Enter your Master Password to unlock your vault."
                };
        }
    };

    const { title, description } = getLockMessage();

    const handleUnlock = async (e: React.FormEvent) => {
        e.preventDefault();
        const secret = authMethod === "password" ? password : (backupCode.slice(0, 5) + '-' + backupCode.slice(5));
        const isRecoveryCode = authMethod === "backup";


        const success = await unlockVault(secret, isRecoveryCode);

        if (success) {
            toast.success("Vault Unlocked");
        } else {
            setError(true);
            toast.error(authMethod === "password" ? "Incorrect Password" : "Invalid Backup Code");
            if (authMethod === "backup") {
                setBackupCode("");
                inputRefs.current[0]?.focus();
            } else {
                setPassword("");
            }
        }
    };

    // Backup Code Input Logic (10 digits: xxxxx-xxxxx)
    const handleBackupChange = (index: number, value: string) => {
        if (value.length > 1) {
            // Handle paste - remove dashes and take first 10 chars
            const pastedData = value.replace(/-/g, '').slice(0, 10).toLowerCase();
            setBackupCode(pastedData);
            inputRefs.current[Math.min(9, pastedData.length - 1)]?.focus();
            return;
        }

        const newCode = backupCode.split("");
        while (newCode.length < 10) newCode.push("");
        newCode[index] = value.toLowerCase();
        const finalCode = newCode.join("").slice(0, 10);
        setBackupCode(finalCode);

        if (value && index < 9) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleBackupKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Backspace" && !backupCode[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handleBackupPaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData("text/plain").replace(/[^a-zA-Z0-9]/g, "").slice(0, 10).toLowerCase();
        if (pastedData) {
            setBackupCode(pastedData);
            inputRefs.current[Math.min(9, pastedData.length - 1)]?.focus();
        }
    };

    return (
        <div className="absolute inset-0 z-50 bg-zinc-950 flex flex-col items-center justify-center p-4">
            <div className="absolute inset-0 z-0 bg-grid-white/[0.02] pointer-events-none" />
            <div className="absolute inset-0 z-0 bg-gradient-to-br from-blue-900/10 via-zinc-950/50 to-zinc-950 pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md bg-zinc-900/50 border border-white/10 rounded-2xl p-8 backdrop-blur-xl shadow-2xl relative z-10"
            >
                <div className="flex flex-col items-center text-center mb-8">
                    <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-4 ring-1 ring-blue-500/20">
                        {authMethod === "password" ? (
                            <Lock className="w-8 h-8 text-blue-400" />
                        ) : (
                            <QrCode className="w-8 h-8 text-blue-400" />
                        )}
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">{title}</h1>
                    <p className="text-neutral-400">
                        {description}
                    </p>
                </div>

                <form onSubmit={handleUnlock} className="space-y-6">
                    <div className="space-y-2">
                        {authMethod === "password" ? (
                            <div className="relative">
                                <Input
                                    type="password"
                                    placeholder="Master Password"
                                    value={password}
                                    onChange={(e) => {
                                        setPassword(e.target.value);
                                        setError(false);
                                    }}
                                    className={`bg-zinc-950/50 border-white/10 text-center text-lg h-12 transition-all focus:border-blue-500/50 ${error ? "border-red-500/50 focus:border-red-500/50" : ""}`}
                                    autoFocus
                                />
                            </div>
                        ) : (
                            <div className="flex items-center justify-center gap-1.5" onPaste={handleBackupPaste}>
                                {/* First Group (5 chars) */}
                                <div className="flex gap-1">
                                    {[0, 1, 2, 3, 4].map((index) => (
                                        <Input
                                            key={index}
                                            ref={(el) => { inputRefs.current[index] = el }}
                                            type="text"
                                            maxLength={1}
                                            className={`w-9 h-11 text-center text-lg font-mono lowercase bg-zinc-950/50 border-white/10 focus:border-blue-500/50 ${error ? "border-red-500/50" : ""}`}
                                            value={backupCode[index] || ""}
                                            onChange={(e) => handleBackupChange(index, e.target.value)}
                                            onKeyDown={(e) => handleBackupKeyDown(index, e)}
                                        />
                                    ))}
                                </div>
                                <span className="text-neutral-500 font-bold text-lg">-</span>
                                {/* Second Group (5 chars) */}
                                <div className="flex gap-1">
                                    {[5, 6, 7, 8, 9].map((index) => (
                                        <Input
                                            key={index}
                                            ref={(el) => { inputRefs.current[index] = el }}
                                            type="text"
                                            maxLength={1}
                                            className={`w-9 h-11 text-center text-lg font-mono lowercase bg-zinc-950/50 border-white/10 focus:border-blue-500/50 ${error ? "border-red-500/50" : ""}`}
                                            value={backupCode[index] || ""}
                                            onChange={(e) => handleBackupChange(index, e.target.value)}
                                            onKeyDown={(e) => handleBackupKeyDown(index, e)}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <Button
                        type="submit"
                        className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-lg font-medium shadow-lg shadow-blue-500/20"
                    >
                        {authMethod === "password" ? (
                            <>
                                Unlock Vault
                                <LockOpen className="w-5 h-5 ml-2" />
                            </>
                        ) : (
                            "Verify Code"
                        )}
                    </Button>

                    <div className="text-center">
                        <button
                            type="button"
                            onClick={() => {
                                setAuthMethod(authMethod === "password" ? "backup" : "password");
                                setError(false);
                            }}
                            className="text-sm text-neutral-500 hover:text-white transition-colors"
                        >
                            {authMethod === "password" ? (
                                <>Use Backup Code instead</>
                            ) : (
                                <>Use Master Password instead</>
                            )}
                        </button>
                    </div>
                </form>

                <div className="mt-6 flex items-center justify-center gap-2 text-sm text-neutral-500">
                    <ShieldAlert className="w-4 h-4" />
                    <span>Protected by Aegis</span>
                </div>
            </motion.div>
        </div>
    );
}
