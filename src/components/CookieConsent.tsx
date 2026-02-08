import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cookie, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { storage } from "@/lib/storage";

export default function CookieConsent() {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const consent = storage.local.get("cookieConsent");
        if (!consent) {
            setIsVisible(true);
        }
    }, []);

    const handleAccept = () => {
        storage.local.set("cookieConsent", true);
        setIsVisible(false);
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="fixed bottom-6 left-6 right-6 md:left-auto md:right-8 md:max-w-md z-[100]"
                >
                    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/80 p-6 shadow-2xl backdrop-blur-xl">
                        {/* Background Gradient Decorative Element */}
                        <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-blue-500/10 blur-3xl" />

                        <div className="flex flex-col gap-4 relative z-10">
                            <div className="flex items-start justify-between">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                                    <Cookie className="h-5 w-5" />
                                </div>
                                <button
                                    onClick={() => setIsVisible(false)}
                                    className="rounded-full p-1 text-neutral-500 hover:bg-white/5 hover:text-neutral-300 transition-colors"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            <div className="space-y-2">
                                <h3 className="text-lg font-semibold text-white">We value your privacy</h3>
                                <p className="text-sm text-neutral-400 leading-relaxed">
                                    Aegis uses essential cookies to ensure secure vault access and improve your experience.
                                    By clicking "Accept", you agree to our use of these security-focused cookies.
                                </p>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <Button
                                    onClick={handleAccept}
                                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white border-0 h-10 gap-2 font-medium"
                                >
                                    <Check className="h-4 w-4" />
                                    Accept All
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => setIsVisible(false)}
                                    className="flex-1 border-white/10 bg-white/5 hover:bg-white/10 text-white h-10 font-medium"
                                >
                                    Manage
                                </Button>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
