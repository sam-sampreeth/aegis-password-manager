import { useMemo } from "react";
import { motion } from "framer-motion";
import { ShieldAlert, RefreshCcw, Clock, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { VaultItemIcon } from "@/components/vault/VaultItemIcon";
import { useVaultItems } from "@/hooks/useVault";

export default function ActionCenterPage() {
    const navigate = useNavigate();
    const { items } = useVaultItems();
    // Analytics Logic
    const stats = useMemo(() => {
        const weak = items.filter(i => i.strength < 3);
        const reused = items.filter((item, index, self) =>
            self.findIndex(t => t.password === item.password) !== index
        );
        const old = items.filter(i => {
            const lastUpdate = new Date(i.updatedAt);
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
            return lastUpdate < sixMonthsAgo;
        });

        // Strength Distribution
        const strengthDist = [0, 0, 0, 0, 0];
        items.forEach(i => strengthDist[Math.min(i.strength, 4)]++); // Safe index access

        return { weak, reused, old, strengthDist };
    }, [items]);

    const maxCount = Math.max(...stats.strengthDist);

    return (
        <div className="flex h-screen w-full bg-zinc-950 text-white overflow-hidden relative">
            <div className="absolute inset-0 z-0 bg-grid-white/[0.02] pointer-events-none" />

            <div className="flex-1 flex flex-col h-full overflow-hidden relative z-10">
                {/* Header */}
                <div className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-zinc-950/50 backdrop-blur-sm shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                            <ShieldAlert className="w-5 h-5 text-orange-500" />
                        </div>
                        <h1 className="text-xl font-semibold">Action Center</h1>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
                    <div className="max-w-6xl mx-auto space-y-8">

                        {/* Hero Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                                className="p-6 rounded-xl border border-white/5 bg-zinc-900/50 hover:bg-zinc-900/80 transition-colors group relative overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-2 rounded-lg bg-red-500/10 text-red-500"><ShieldAlert className="w-5 h-5" /></div>
                                    <span className="text-4xl font-bold">{stats.weak.length}</span>
                                </div>
                                <h3 className="font-medium text-lg">Weak Passwords</h3>
                                <p className="text-sm text-neutral-400 mt-1">Credentials vulnerable to attacks</p>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                                className="p-6 rounded-xl border border-white/5 bg-zinc-900/50 hover:bg-zinc-900/80 transition-colors group relative overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500"><RefreshCcw className="w-5 h-5" /></div>
                                    <span className="text-4xl font-bold">{stats.reused.length}</span>
                                </div>
                                <h3 className="font-medium text-lg">Reused Passwords</h3>
                                <p className="text-sm text-neutral-400 mt-1">Used across multiple accounts</p>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                                className="p-6 rounded-xl border border-white/5 bg-zinc-900/50 hover:bg-zinc-900/80 transition-colors group relative overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-2 rounded-lg bg-yellow-500/10 text-yellow-500"><Clock className="w-5 h-5" /></div>
                                    <span className="text-4xl font-bold">{stats.old.length}</span>
                                </div>
                                <h3 className="font-medium text-lg">Old Passwords</h3>
                                <p className="text-sm text-neutral-400 mt-1">Unchanged for &gt; 6 months</p>
                            </motion.div>
                        </div>

                        {/* Analysis Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                            {/* Strength Chart */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }}
                                className="p-6 rounded-xl border border-white/5 bg-zinc-900/30"
                            >
                                <h3 className="text-lg font-medium mb-6 flex items-center gap-2">
                                    Vault Health Analysis
                                </h3>
                                <div className="flex items-end justify-between h-48 gap-4 px-2">
                                    {stats.strengthDist.map((count, i) => {
                                        const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
                                        const colors = ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-blue-500", "bg-emerald-500"];
                                        const labels = ["Very Weak", "Weak", "Fair", "Good", "Strong"];

                                        return (
                                            <div key={i} className="flex flex-col items-center gap-2 flex-1 group">
                                                <div className="w-full bg-zinc-800/50 rounded-t-lg h-full relative overflow-hidden flex items-end">
                                                    <motion.div
                                                        initial={{ height: 0 }}
                                                        animate={{ height: `${percentage}%` }}
                                                        transition={{ duration: 1, delay: 0.5 + (i * 0.1), ease: "easeOut" }}
                                                        className={cn("w-full opacity-80 group-hover:opacity-100 transition-opacity", colors[i])}
                                                    />
                                                </div>
                                                <span className="text-xs text-neutral-500 font-medium">{labels[i]}</span>
                                                <span className="text-xs text-white font-bold absolute -mt-6 z-10">{count}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </motion.div>

                            {/* Action List */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 }}
                                className="p-6 rounded-xl border border-white/5 bg-zinc-900/30 flex flex-col"
                            >
                                <h3 className="text-lg font-medium mb-4 flex items-center justify-between">
                                    <span>Immediate Actions</span>
                                    <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded-full">{stats.weak.length} Issues</span>
                                </h3>

                                <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent max-h-[200px]">
                                    {stats.weak.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-neutral-500 gap-2">
                                            <CheckCircle2 className="w-8 h-8 text-emerald-500/50" />
                                            <p>All clear! No weak passwords found.</p>
                                        </div>
                                    ) : (
                                        stats.weak.map(item => (
                                            <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-zinc-950 border border-white/5 hover:border-red-500/30 group transition-all">
                                                <div className="flex items-center gap-3">
                                                    <VaultItemIcon item={item} className="w-8 h-8 text-xs" />
                                                    <div>
                                                        <div className="font-medium text-sm">{item.name}</div>
                                                        <div className="text-xs text-neutral-500">{item.username}</div>
                                                    </div>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10 gap-2 h-8"
                                                    onClick={() => navigate(`/vault?openId=${item.id}`)}
                                                >
                                                    Fix <ArrowRight className="w-3 h-3" />
                                                </Button>
                                            </div>
                                        )))}
                                </div>
                            </motion.div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}
