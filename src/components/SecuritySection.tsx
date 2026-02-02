import { Lock, EyeOff, FileKey, Github, Terminal } from "lucide-react";
import { motion } from "framer-motion";
import GlareHover from "@/components/reactbits/GlareHover";

export function SecuritySection() {
    return (
        <section id="security" className="py-24 bg-black relative overflow-hidden">
            {/* Background Gradients - Subtle Noise */}
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.1),rgba(255,255,255,0))]"></div>
            <div className="absolute inset-0 opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>

            <div className="container mx-auto px-4 relative z-10">
                <div className="text-center mb-16">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5 }}
                        className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-neutral-400 mb-4 pb-2"
                    >
                        Encryption without Compromise
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="text-neutral-400 text-lg max-w-2xl mx-auto"
                    >
                        Aegis is built with a zero-trust architecture. Your data is encrypted on your device before it ever reaches our servers.
                    </motion.p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
                    {/* Main Large Card - Digital Vault */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5 }}
                        className="md:col-span-2 row-span-2"
                    >
                        <GlareHover
                            glareColor="#3b82f6"
                            background="rgba(23, 23, 23, 0.5)" // neutral-900/50
                            className="h-full group relative overflow-hidden rounded-3xl border border-white/5"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-900/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />

                            <div className="relative z-10 h-full flex flex-col justify-between p-8">
                                <div>
                                    <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-6 shadow-[0_0_15px_rgba(59,130,246,0.1)]">
                                        <Lock className="w-6 h-6 text-blue-400" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-white mb-2">AES-256 Encryption</h3>
                                    <p className="text-neutral-400 text-lg">
                                        The industry standard. We use AES-256 bit encryption to ensure your passwords essentially take a trillion years to crack.
                                    </p>
                                </div>

                                {/* Digital Vault Visual */}
                                <div className="mt-12 relative h-48 rounded-2xl bg-black/40 border border-white/5 overflow-hidden flex items-center justify-center group-hover:border-blue-500/20 transition-colors">
                                    <div className="absolute inset-0 grid grid-cols-8 grid-rows-4 gap-1 opacity-20 transform -skew-x-12 scale-150">
                                        {[...Array(32)].map((_, i) => (
                                            <div key={i} className="bg-blue-500/20 rounded-sm w-full h-full animate-pulse" style={{ animationDelay: `${Math.random() * 2}s` }} />
                                        ))}
                                    </div>
                                    <div className="relative z-10 p-6 rounded-full border border-blue-500/30 bg-black/50 backdrop-blur-md shadow-[0_0_30px_rgba(59,130,246,0.2)] group-hover:shadow-[0_0_50px_rgba(59,130,246,0.4)] transition-shadow duration-500">
                                        <Lock className="w-10 h-10 text-white" />
                                    </div>
                                </div>
                            </div>
                        </GlareHover>
                    </motion.div>

                    {/* Side Card 1 - Zero Knowledge */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                    >
                        <GlareHover
                            glareColor="#3b82f6"
                            background="rgba(23, 23, 23, 0.5)"
                            className="h-full group relative overflow-hidden rounded-3xl border border-white/5"
                        >
                            <div className="p-6 h-full flex flex-col">
                                <div className="absolute top-0 right-0 p-24 bg-blue-500/5 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />

                                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4 transition-transform duration-300 relative">
                                    <EyeOff className="w-5 h-5 text-blue-400 group-hover:opacity-0 absolute transition-opacity duration-300" />
                                    <Lock className="w-5 h-5 text-blue-400 opacity-0 group-hover:opacity-100 absolute transition-opacity duration-300" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">Zero Knowledge</h3>
                                <p className="text-neutral-500 text-sm group-hover:text-neutral-400 transition-colors">
                                    We don't know your master password. We can't see your data. Even if we wanted to.
                                </p>
                            </div>
                        </GlareHover>
                    </motion.div>

                    {/* Side Card 2 - Local First */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                    >
                        <GlareHover
                            glareColor="#3b82f6"
                            background="rgba(23, 23, 23, 0.5)"
                            className="h-full group relative overflow-hidden rounded-3xl border border-white/5"
                        >
                            <div className="p-6 h-full flex flex-col">
                                <div className="absolute top-0 right-0 p-24 bg-blue-500/5 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />

                                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4 group-hover:shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-shadow">
                                    <FileKey className="w-5 h-5 text-blue-400" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">Local-First</h3>
                                <p className="text-neutral-500 text-sm group-hover:text-neutral-400 transition-colors">
                                    Encryption happens on your device. Only encrypted blobs are sent to our cloud.
                                </p>
                            </div>
                        </GlareHover>
                    </motion.div>

                    {/* Bottom Card - Open Source */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.4 }}
                        className="md:col-span-3"
                    >
                        <GlareHover
                            glareColor="#3b82f6"
                            background="rgba(23, 23, 23, 0.5)"
                            className="h-full group relative overflow-hidden rounded-3xl border border-white/5"
                        >
                            <div className="absolute top-0 right-0 p-32 bg-blue-500/5 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
                            <div className="absolute bottom-0 left-0 p-32 bg-purple-500/5 rounded-full blur-3xl -translate-x-1/2 translate-y-1/2" />

                            <div className="absolute right-10 top-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none transform rotate-12 group-hover:scale-110 transition-transform duration-700">
                                <Github className="w-64 h-64 text-white" />
                            </div>

                            <div className="p-12 relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                                <div className="flex-1 text-center md:text-left">
                                    <div className="flex items-center justify-center md:justify-start gap-3 mb-4">
                                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                                            <Github className="w-5 h-5 text-blue-400" />
                                        </div>
                                        <h3 className="text-2xl font-bold text-white">Open Source</h3>
                                    </div>
                                    <p className="text-neutral-400 text-lg max-w-2xl">
                                        Trust through transparency. Our codebase is open for anyone to audit on GitHub.
                                        We believe security tools should have nothing to hide.
                                    </p>
                                </div>

                                <a
                                    href="https://github.com"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-shrink-0 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-black font-medium hover:bg-neutral-200 transition-colors"
                                >
                                    <Github className="w-5 h-5" />
                                    View on GitHub
                                </a>
                            </div>
                        </GlareHover>
                    </motion.div>

                </div>
            </div>
        </section>
    );
}
