import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Features from "@/components/Features";
import { SecuritySection } from "@/components/SecuritySection";
import FAQ from "@/components/FAQ";
import { BottomCTA } from "@/components/BottomCTA";
import { HeroHighlight, Highlight } from "@/components/aceternity/HeroHighlight";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, ArrowRight } from "lucide-react";
import DecryptedText from "@/components/reactbits/DecryptedText";

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-black overflow-x-hidden selection:bg-blue-500/30">
            <Navbar />

            {/* Hero Section */}
            <div id="hero">
                <HeroHighlight>
                    <div className="px-4">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, ease: "easeOut" }}
                            className="flex justify-center mb-8"
                        >
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-300 text-sm font-medium">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                                </span>
                                The Future of Password Management
                            </div>
                        </motion.div>

                        <motion.h1
                            initial={{
                                opacity: 0,
                                y: 20,
                            }}
                            animate={{
                                opacity: 1,
                                y: [20, -5, 0],
                            }}
                            transition={{
                                duration: 0.5,
                                ease: [0.4, 0.0, 0.2, 1],
                                delay: 0.2
                            }}
                            className="text-4xl md:text-5xl lg:text-7xl font-bold text-white max-w-5xl leading-relaxed lg:leading-[1.15] text-center mx-auto tracking-tight mb-8"
                        >
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-neutral-200 to-neutral-400">
                                Secure your digital life with
                            </span>{" "}
                            <div className="pt-2 inline-block">
                                <Highlight className="text-white">
                                    military-grade encryption.
                                </Highlight>
                            </div>
                        </motion.h1>

                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.8, duration: 0.5 }}
                            className="text-center text-neutral-400 mt-4 max-w-lg mx-auto text-xl font-light"
                        >
                            Aegis is the open-source, client-side encrypted password manager that <DecryptedText
                                text="puts you in control."
                                animateOn="view"
                                revealDirection="start"
                                speed={50}
                                maxIterations={10}
                                className="text-blue-400 font-medium"
                                parentClassName="inline-block"
                                characters="ABC123!@#"
                            />
                        </motion.p>

                        <motion.div
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 1.0, duration: 0.5 }}
                            className="flex flex-col items-center mt-12"
                        >
                            <div className="flex gap-6 mb-12">
                                <Link to="/auth?mode=signup">
                                    <Button size="lg" className="group/cta rounded-full text-lg px-8 py-7 bg-blue-600 hover:bg-blue-700 shadow-[0_0_30px_rgba(37,99,235,0.4)] transition-all hover:scale-105 hover:shadow-[0_0_40px_rgba(37,99,235,0.6)] cursor-target cursor-none">
                                        Start for Free
                                        <ArrowRight className="ml-2 w-5 h-5 transition-transform group-hover/cta:translate-x-1" />
                                    </Button>
                                </Link>
                                <Link to="/#features">
                                    <Button size="lg" variant="outline" className="rounded-full text-lg px-8 py-7 border-neutral-700 hover:bg-neutral-800 text-neutral-300 transition-all hover:scale-105 cursor-target cursor-none">
                                        Learn More
                                    </Button>
                                </Link>
                            </div>

                            {/* Quick Points */}
                            <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 text-sm text-neutral-400">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-blue-500" />
                                    <span>256-bit AES Encryption</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-blue-500" />
                                    <span>Zero-Knowledge Architecture</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-blue-500" />
                                    <span>Open Source</span>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </HeroHighlight>
            </div>

            {/* Features Section */}
            <Features />

            {/* Security Section */}
            <SecuritySection />

            {/* FAQ Section */}
            <FAQ />

            {/* Bottom CTA */}
            <BottomCTA />

            <Footer />
        </div>
    );
}
