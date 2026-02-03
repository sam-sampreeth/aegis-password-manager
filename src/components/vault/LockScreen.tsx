import { useState } from "react";
import { useLock } from "@/context/LockContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShieldAlert, ArrowRight, Lock } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export function LockScreen() {
    const { unlockVault } = useLock();
    const [password, setPassword] = useState("");
    const [error, setError] = useState(false);

    const handleUnlock = (e: React.FormEvent) => {
        e.preventDefault();
        if (unlockVault(password)) {
            toast.success("Vault Unlocked");
        } else {
            setError(true);
            toast.error("Incorrect Password");
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-zinc-950 flex flex-col items-center justify-center p-4">
            <div className="absolute inset-0 z-0 bg-grid-white/[0.02] pointer-events-none" />
            <div className="absolute inset-0 z-0 bg-gradient-to-br from-blue-900/10 via-zinc-950/50 to-zinc-950 pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md bg-zinc-900/50 border border-white/10 rounded-2xl p-8 backdrop-blur-xl shadow-2xl relative z-10"
            >
                <div className="flex flex-col items-center text-center mb-8">
                    <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-4 ring-1 ring-blue-500/20">
                        <Lock className="w-8 h-8 text-blue-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Vault Locked</h1>
                    <p className="text-neutral-400">
                        Your vault is locked due to inactivity. Enter your master password to continue.
                    </p>
                </div>

                <form onSubmit={handleUnlock} className="space-y-4">
                    <div className="space-y-2">
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
                    </div>
                    <Button
                        type="submit"
                        className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-lg font-medium shadow-lg shadow-blue-500/20"
                    >
                        Unlock Vault
                        <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                </form>

                <div className="mt-6 flex items-center justify-center gap-2 text-sm text-neutral-500">
                    <ShieldAlert className="w-4 h-4" />
                    <span>Protected by Aegis</span>
                </div>
            </motion.div>
        </div>
    );
}
