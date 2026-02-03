import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export function BottomCTA() {
    return (
        <section className="py-24 relative overflow-hidden">
            {/* Background with slight gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-black to-blue-950/20" />

            <div className="container mx-auto px-4 relative z-10 text-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                    className="max-w-4xl mx-auto"
                >
                    <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 tracking-tight">
                        Ready to secure your <span className="text-blue-500">digital future?</span>
                    </h2>
                    <p className="text-xl text-neutral-400 mb-10 max-w-2xl mx-auto">
                        Join thousands of users who have taken back control of their data. No credit card required.
                    </p>

                    <Link to="/auth" state={{ mode: "signup" }}>
                        <Button size="lg" className="group rounded-full text-lg px-8 py-7 bg-white text-black hover:bg-neutral-200 hover:text-black shadow-[0_0_30px_rgba(255,255,255,0.2)] transition-all hover:scale-105 hover:shadow-[0_0_40px_rgba(255,255,255,0.4)] cursor-target">
                            Get Started Now
                            <ArrowRight className="ml-2 w-5 h-5 transition-transform group-hover:translate-x-1" />
                        </Button>
                    </Link>
                </motion.div>
            </div>

            {/* Decorational Elements */}
            <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />
        </section>
    );
}
