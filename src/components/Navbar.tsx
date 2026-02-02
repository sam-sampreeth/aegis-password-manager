import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function Navbar() {
    const [hidden, setHidden] = useState(false);
    const { scrollY } = useScroll();

    useMotionValueEvent(scrollY, "change", (latest) => {
        const previous = scrollY.getPrevious() ?? 0;
        if (latest > previous && latest > 150) {
            setHidden(true);
        } else {
            setHidden(false);
        }
    });

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: "smooth" });
        }
    };

    return (
        <motion.nav
            variants={{
                visible: { y: 0 },
                hidden: { y: "-100%" },
            }}
            animate={hidden ? "hidden" : "visible"}
            transition={{ duration: 0.35, ease: "easeInOut" }}
            className={cn(
                "fixed top-4 left-0 right-0 z-50 mx-auto max-w-5xl",
                "bg-neutral-900/50 backdrop-blur-md border border-white/10 rounded-full",
                "shadow-lg"
            )}
        >
            <div className="px-6 h-16 flex items-center justify-between">
                {/* Logo */}
                <Link to="/">
                    <motion.div
                        whileHover={{ scale: 1.05 }}
                        className="flex items-center gap-2 cursor-pointer"
                    >
                        <Shield className="w-6 h-6 text-white" />
                        <span className="font-bold text-lg text-white">Aegis</span>
                    </motion.div>
                </Link>

                {/* Center Navigation Links */}
                <div className="hidden md:flex items-center gap-8">
                    {[
                        { name: "Features", id: "features" },
                        { name: "Security", id: "security" },
                        { name: "FAQ", id: "faq" },
                    ].map((link) => (
                        <button
                            key={link.name}
                            onClick={() => scrollToSection(link.id)}
                            className="text-sm font-medium text-muted-foreground hover:text-white transition-colors relative group"
                        >
                            {link.name}
                            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-white group-hover:w-full transition-all duration-300" />
                        </button>
                    ))}
                </div>

                {/* Right Side Buttons */}
                <div className="flex items-center gap-3">
                    <Link to="/auth?mode=login">
                        <Button
                            variant="ghost"
                            className="text-sm hover:bg-white/10 hover:text-white text-muted-foreground"
                        >
                            Login
                        </Button>
                    </Link>
                    <Link to="/auth?mode=signup">
                        <Button
                            size="sm"
                            className="bg-white text-black hover:bg-white/90 transition-all duration-300 rounded-full px-6"
                        >
                            Get Started
                        </Button>
                    </Link>
                </div>
            </div>
        </motion.nav>
    );
};
