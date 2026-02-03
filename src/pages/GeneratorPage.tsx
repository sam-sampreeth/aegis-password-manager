import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { RefreshCw, Copy, Check, Settings2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

import { generatePassword, evaluateStrength } from "@/lib/passwordUtils";

export default function GeneratorPage() {
    const [password, setPassword] = useState("");
    const [length, setLength] = useState(16);
    const [options, setOptions] = useState({
        upper: true,
        number: true,
        symbol: true,
        excludeAmbiguous: false,
    });
    const [copied, setCopied] = useState(false);

    // Regenerate on change
    useEffect(() => {
        setPassword(generatePassword(length, options));
    }, [length, options]);

    const handleCopy = () => {
        navigator.clipboard.writeText(password);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const strength = evaluateStrength(password);
    const strengthLabels = ["Very Weak", "Weak", "Fair", "Good", "Strong", "Excellent"];
    const strengthColors = ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-blue-400", "bg-emerald-500", "bg-emerald-400"];

    return (
        <div className="flex h-screen w-full bg-zinc-950 text-white overflow-hidden relative">
            <div className="absolute inset-0 z-0 bg-grid-white/[0.02] pointer-events-none" />

            <div className="flex-1 flex flex-col h-full overflow-hidden relative z-10">
                {/* Header */}
                <div className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-zinc-950/50 backdrop-blur-sm shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-blue-500" />
                        </div>
                        <h1 className="text-xl font-semibold">Password Generator</h1>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="w-full max-w-2xl space-y-8"
                    >
                        {/* Display Area */}
                        <div className="relative group">
                            <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <div className="relative p-8 rounded-2xl bg-zinc-900 border border-white/10 flex flex-col items-center text-center gap-2 shadow-2xl">
                                <motion.div
                                    key={password} // Animate on change
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-4xl md:text-5xl font-mono font-bold tracking-wider break-all text-transparent bg-clip-text bg-gradient-to-r from-white to-neutral-400 selection:bg-blue-500/30"
                                >
                                    {password}
                                </motion.div>
                                <div className="flex items-center gap-2 mt-4">
                                    <div className={cn("h-2 w-2 rounded-full", strengthColors[strength])} />
                                    <span className={cn("text-sm font-medium", strengthColors[strength].replace("bg-", "text-"))}>
                                        {strengthLabels[strength]}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="p-6 rounded-xl border border-white/5 bg-zinc-900/50 space-y-8">
                            {/* Length Slider */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <Label className="text-neutral-400 flex items-center gap-2"><Settings2 className="w-4 h-4" /> Password Length</Label>
                                    <span className="text-xl font-bold font-mono text-blue-400 bg-blue-500/10 px-3 py-1 rounded-md">{length}</span>
                                </div>
                                <Slider
                                    value={[length]}
                                    onValueChange={(v) => setLength(v[0])}
                                    max={64}
                                    min={8}
                                    step={1}
                                    className="cursor-pointer"
                                />
                            </div>

                            <div className="h-px bg-white/5" />

                            {/* Options */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex items-center space-x-2 p-3 rounded-lg border border-white/5 bg-zinc-950/50 hover:bg-zinc-900 transition-colors">
                                    <Checkbox id="upper" checked={options.upper} onCheckedChange={(c) => setOptions(p => ({ ...p, upper: !!c }))} />
                                    <Label htmlFor="upper" className="cursor-pointer flex-1">Uppercase (A-Z)</Label>
                                </div>
                                <div className="flex items-center space-x-2 p-3 rounded-lg border border-white/5 bg-zinc-900/50 hover:bg-zinc-900 transition-colors">
                                    <Checkbox id="number" checked={options.number} onCheckedChange={(c) => setOptions(p => ({ ...p, number: !!c }))} />
                                    <Label htmlFor="number" className="cursor-pointer flex-1">Numbers (0-9)</Label>
                                </div>
                                <div className="flex items-center space-x-2 p-3 rounded-lg border border-white/5 bg-zinc-900/50 hover:bg-zinc-900 transition-colors">
                                    <Checkbox id="symbol" checked={options.symbol} onCheckedChange={(c) => setOptions(p => ({ ...p, symbol: !!c }))} />
                                    <Label htmlFor="symbol" className="cursor-pointer flex-1">Symbols (!@#)</Label>
                                </div>
                                <div className="flex items-center space-x-2 p-3 rounded-lg border border-white/5 bg-zinc-950/50 hover:bg-zinc-900 transition-colors">
                                    <Checkbox id="ambiguous" checked={options.excludeAmbiguous} onCheckedChange={(c) => setOptions(p => ({ ...p, excludeAmbiguous: !!c }))} />
                                    <Label htmlFor="ambiguous" className="cursor-pointer flex-1 text-sm">Avoid Ambiguous (1, l, I, 0, O)</Label>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-4 pt-4">
                                <Button
                                    size="lg"
                                    className="flex-1 bg-white text-black hover:bg-neutral-200 h-12 text-base font-semibold"
                                    onClick={() => setPassword(generatePassword(length, options))}
                                >
                                    <RefreshCw className="w-4 h-4 mr-2" /> Regenerate
                                </Button>
                                <Button
                                    size="lg"
                                    variant="outline"
                                    className={cn(
                                        "flex-1 border-white/10 hover:bg-zinc-800 h-12 text-base font-semibold transition-all",
                                        copied && "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20"
                                    )}
                                    onClick={handleCopy}
                                >
                                    {copied ? <Check className="w-5 h-5 mr-2" /> : <Copy className="w-5 h-5 mr-2" />}
                                    {copied ? "Copied!" : "Copy Password"}
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    )
}
