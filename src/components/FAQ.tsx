import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const faqs = [
    {
        question: "How is my data encrypted?",
        answer: "Aegis uses industry-standard AES-256-GCM encryption. All encryption and decryption happen locally on your device. Your Master Password is used to derive a vault key that never leaves your browser, ensuring a true zero-knowledge architecture."
    },
    {
        question: "What if I forget my Master Password?",
        answer: "Because we have no access to your keys, we cannot reset your Master Password. However, during setup, we provide you with 10 unique recovery codes. Each code can independently decrypt your vault key, serving as a vital failsafe."
    },
    {
        question: "Does Aegis support 2FA codes?",
        answer: "Yes! Aegis has a built-in TOTP authenticator. You can store your 2FA seeds alongside your passwords and generate secure 6-digit codes directly within the app, eliminating the need for a separate authenticator app."
    },
    {
        question: "How does cloud synchronization work?",
        answer: "Your vault is synced via our secure cloud infrastructure. Before any data is uploaded, it is encrypted with your private key. The server only sees encrypted blobs, allowing you to sync across devices without compromising your privacy."
    },
    {
        question: "Can I manage multiple URLs per account?",
        answer: "Absolutely. Many services share credentials across different domains. Aegis allows you to associate multiple URLs with a single entry, making your vault more flexible and organized."
    },
    {
        question: "Can I export my data?",
        answer: "Yes. You have full ownership of your data. You can export your entire vault as a secure, encrypted JSON file at any time for manual backups or for migrating to another service."
    },
    {
        question: "Can I permanently delete my account?",
        answer: "Yes. You can delete your account and all associated encrypted data directly from the settings. This action requires Master Password verification and is irreversible, ensuring total data sovereignty."
    }
];

const AccordionItem = ({
    item,
    isOpen,
    onClick,
}: {
    item: typeof faqs[0];
    isOpen: boolean;
    onClick: () => void;
}) => {
    return (
        <div className={cn(
            "border border-white/5 rounded-2xl overflow-hidden transition-all duration-300 mb-4",
            isOpen ? "bg-white/[0.03] border-white/10 shadow-2xl" : "bg-transparent hover:bg-white/[0.01]"
        )}>
            <button
                onClick={onClick}
                className="w-full flex items-center justify-between p-6 text-left group"
            >
                <span className={cn(
                    "text-lg md:text-xl font-medium transition-colors duration-200",
                    isOpen ? "text-white" : "text-neutral-400 group-hover:text-neutral-200"
                )}>
                    {item.question}
                </span>
                <div className={cn(
                    "p-2 rounded-full transition-all duration-500",
                    isOpen ? "bg-blue-500 text-white rotate-180" : "bg-neutral-800 text-neutral-400"
                )}>
                    {isOpen ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </div>
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.4, ease: [0.04, 0.62, 0.23, 0.98] }}
                    >
                        <div className="px-6 pb-6 pt-0 text-neutral-400 text-lg leading-relaxed max-w-3xl font-light">
                            {item.answer}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default function FAQ() {
    const [openIndex, setOpenIndex] = useState<number | null>(0);

    return (
        <section id="faq" className="py-24 bg-black relative w-full flex items-center justify-center flex-col overflow-hidden">
            {/* Ambient Background Effects */}
            <div className="absolute inset-0 h-full w-full bg-black bg-grid-white/[0.02] [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)] pointer-events-none"></div>

            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-blue-500/10 blur-[120px] rounded-full opacity-30 pointer-events-none"></div>

            <div className="container mx-auto px-4 relative z-10">
                <div className="text-center mb-20">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-6 tracking-wider uppercase"
                    >
                        <ShieldCheck className="w-3 h-3" />
                        Common Questions
                    </motion.div>

                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-4xl md:text-7xl font-bold text-white mb-8 tracking-tight"
                    >
                        Got questions? <br />
                        <span className="text-neutral-500 italic">We've got answers.</span>
                    </motion.h2>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-xl text-neutral-400 max-w-2xl mx-auto font-light leading-relaxed"
                    >
                        Find everything you need to know about Aegis security, features, and how we protect your digital lifecycle.
                    </motion.p>
                </div>

                <div className="max-w-4xl mx-auto">
                    <div className="space-y-4">
                        {faqs.map((item, index) => (
                            <AccordionItem
                                key={index}
                                item={item}
                                isOpen={openIndex === index}
                                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                            />
                        ))}
                    </div>

                    <motion.div
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.5 }}
                        className="mt-16 text-center"
                    >
                        
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
