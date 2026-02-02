import { Shield, Github, Mail, ExternalLink, ArrowUp } from "lucide-react";
import { Link } from "react-router-dom";

export default function Footer() {
    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <footer className="pt-24 pb-12 bg-black border-t border-white/10 relative overflow-hidden">
            {/* Background decorative blob */}
            <div className="absolute bottom-0 left-0 w-full h-[500px] bg-blue-900/10 blur-[120px] pointer-events-none" />

            <div className="container mx-auto px-4 relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-20">
                    {/* Brand Column */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-2">
                            <Shield className="w-6 h-6 text-blue-500" />
                            <span className="text-xl font-bold text-white">Aegis</span>
                        </div>
                        <p className="text-neutral-400 text-sm leading-relaxed max-w-xs">
                            A privacy-first password manager built for those who value security without compromise. Open source and client-side encryption.
                        </p>
                        <div className="flex gap-4">
                            <a href="https://github.com/sampreeth/aegis-password-manager" target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-white transition-colors">
                                <Github className="w-5 h-5" />
                            </a>
                            <a href="mailto:hello@sampreeth.in" className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-white transition-colors">
                                <Mail className="w-5 h-5" />
                            </a>
                        </div>
                    </div>

                    {/* Product Column */}
                    <div>
                        <h4 className="text-white font-semibold mb-6">Product</h4>
                        <ul className="space-y-4">
                            <li>
                                <Link to="/#features" className="text-neutral-400 hover:text-blue-400 text-sm transition-colors">Features</Link>
                            </li>
                            <li>
                                <Link to="/#security" className="text-neutral-400 hover:text-blue-400 text-sm transition-colors">Security</Link>
                            </li>
                            <li>
                                <Link to="/auth?mode=signup" className="text-neutral-400 hover:text-blue-400 text-sm transition-colors">Get Started</Link>
                            </li>
                        </ul>
                    </div>

                    {/* Resources Column */}
                    <div>
                        <h4 className="text-white font-semibold mb-6">Resources</h4>
                        <ul className="space-y-4">
                            <li>
                                <a href="https://github.com/sampreeth/aegis-password-manager" target="_blank" rel="noopener noreferrer" className="text-neutral-400 hover:text-blue-400 text-sm transition-colors">Source Code</a>
                            </li>
                            <li>
                                <a href="#" className="text-neutral-400 hover:text-blue-400 text-sm transition-colors">Documentation</a>
                            </li>
                            <li>
                                <a href="#" className="text-neutral-400 hover:text-blue-400 text-sm transition-colors">Privacy Policy</a>
                            </li>
                        </ul>
                    </div>

                    {/* Connect Column */}
                    <div>
                        <h4 className="text-white font-semibold mb-6">Connect</h4>
                        <ul className="space-y-4">
                            <li>
                                <a href="https://sampreeth.in/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-neutral-400 hover:text-blue-400 text-sm transition-colors group">
                                    Portfolio
                                    <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </a>
                            </li>
                            <li>
                                <a href="https://utils.sampreeth.in/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-neutral-400 hover:text-blue-400 text-sm transition-colors group">
                                    More Utilities
                                    <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </a>
                            </li>
                            <li>
                                <a href="mailto:hello@sampreeth.in" className="text-neutral-400 hover:text-blue-400 text-sm transition-colors">
                                    Contact
                                </a>
                            </li>
                        </ul>


                    </div>
                </div>

                <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-neutral-500 text-xs">
                        &copy; {new Date().getFullYear()} Aegis Password Manager. Open Source.
                    </p>

                    <div className="flex items-center gap-6">
                        <div className="text-xs text-white group cursor-default">
                            Built with <span className="group-hover:underline decoration-neutral-500 underline-offset-2 transition-all">late night commits</span> and <span className="group-hover:underline decoration-neutral-500 underline-offset-2 transition-all">questionable sleep</span>
                        </div>
                        <button onClick={scrollToTop} className="flex items-center gap-2 text-xs text-neutral-400 hover:text-white transition-colors">
                            Return to top
                            <ArrowUp className="w-3 h-3" />
                        </button>
                    </div>
                </div>
            </div>
        </footer>
    );
}
