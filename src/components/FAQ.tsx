import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

const faqs = [
    {
        question: "Where are my passwords stored?",
        answer: "Your passwords are encrypted on your device and stored as encrypted vault blobs in a secure database. No plaintext data is ever stored."
    },
    {
        question: "Can the server read my passwords?",
        answer: "No. Encryption and decryption happen only in your browser using the Web Crypto API. The server only sees encrypted data."
    },
    {
        question: "What is Supabase used for?",
        answer: "Supabase handles authentication, secure storage of encrypted vaults, and access control using Row Level Security."
    },
    {
        question: "How is my data protected if the database is compromised?",
        answer: "All vault data is encrypted client-side using AES-GCM. Even with full database access, attackers cannot read your passwords."
    },
    {
        question: "What role does my Master Password play?",
        answer: "Your Master Password derives the encryption key using PBKDF2 or Argon2. It is never sent to or stored on the server."
    },
    {
        question: "Where is the app hosted?",
        answer: "The frontend is served from Cloudflare Pages on your own subdomain for fast, global, and secure access."
    }
];

const AccordionItem = ({
    question,
    answer,
    isOpen,
    onClick,
    index
}: {
    question: string;
    answer: string;
    isOpen: boolean;
    onClick: () => void;
    index: number;
}) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            viewport={{ once: true }}
            className={cn(
                "border rounded-2xl overflow-hidden transition-all duration-300",
                isOpen
                    ? "border-blue-500/50 bg-blue-500/5 shadow-[0_0_30px_rgba(59,130,246,0.1)]"
                    : "border-neutral-800 bg-neutral-900/50 hover:border-neutral-700 hover:bg-neutral-900"
            )}
        >
            <button
                onClick={onClick}
                className="w-full flex items-center justify-between p-6 text-left"
            >
                <span className={cn(
                    "text-lg font-medium transition-colors duration-200",
                    isOpen ? "text-blue-300" : "text-neutral-200"
                )}>
                    {question}
                </span>
                <span className={cn(
                    "p-2 rounded-full transition-colors duration-200",
                    isOpen ? "bg-blue-500/20 text-blue-400" : "bg-neutral-800 text-neutral-400"
                )}>
                    {isOpen ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </span>
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                    >
                        <div className="px-6 pb-6 text-neutral-400 leading-relaxed">
                            {answer}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default function FAQ() {
    const [openIndex, setOpenIndex] = useState<number | null>(0);

    return (
        <section id="faq" className="py-24 bg-black relative overflow-hidden">
            {/* Background Gradients */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-blue-900/10 rounded-full blur-[128px]" />
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-900/10 rounded-full blur-[128px]" />
            </div>

            <div className="container mx-auto px-4 relative z-10">
                <div className="text-center mb-16">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-3xl md:text-5xl font-bold text-white mb-6"
                    >
                        Frequently Asked Questions
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-lg text-neutral-400 max-w-2xl mx-auto"
                    >
                        Got questions? We've got answers. If you need more help, feel free to join our community.
                    </motion.p>
                </div>

                <div className="max-w-3xl mx-auto flex flex-col gap-4">
                    {faqs.map((faq, index) => (
                        <AccordionItem
                            key={index}
                            index={index}
                            question={faq.question}
                            answer={faq.answer}
                            isOpen={openIndex === index}
                            onClick={() => setOpenIndex(openIndex === index ? null : index)}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
}
