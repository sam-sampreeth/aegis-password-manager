import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function TermsPage() {
    const { pathname } = useLocation();

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [pathname]);

    return (
        <div className="min-h-screen bg-black text-white selection:bg-blue-500/30">
            <Navbar />

            <div className="container mx-auto px-6 py-32 max-w-4xl">
                <div className="space-y-16">
                    {/* Header */}
                    <div className="text-center space-y-4">
                        <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-neutral-500 pb-2">
                            Legal & Privacy
                        </h1>
                        <p className="text-neutral-400 text-lg">
                            Transparency is at the core of Aegis.
                        </p>
                    </div>

                    {/* Terms of Service */}
                    <section id="terms" className="space-y-6 scroll-mt-24">
                        <h2 className="text-2xl font-semibold text-white border-b border-white/10 pb-2">
                            Terms of Service
                        </h2>
                        <div className="space-y-4 text-neutral-400 leading-relaxed">
                            <p>
                                Welcome to Aegis Password Manager. By using our website and services, you agree to comply with and be bound by the following terms and conditions.
                            </p>
                            <h3 className="text-white font-medium pt-2">1. Acceptance of Terms</h3>
                            <p>
                                By accessing or using Aegis ("the Service"), you agree to be bound by these Terms of Service. If you disagree with any part of the terms, you may not access the Service.
                            </p>
                            <h3 className="text-white font-medium pt-2">2. Use of License</h3>
                            <p>
                                Aegis is open-source software. You are free to use, modify, and distribute the code under the terms of the MIT License provided in the repository.
                            </p>
                            <h3 className="text-white font-medium pt-2">3. Disclaimer</h3>
                            <p>
                                The materials on Aegis's website are provided on an 'as is' basis. Aegis makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
                            </p>
                        </div>
                    </section>

                    {/* Privacy Policy */}
                    <section id="privacy" className="space-y-6 scroll-mt-24">
                        <h2 className="text-2xl font-semibold text-white border-b border-white/10 pb-2">
                            Privacy Policy
                        </h2>
                        <div className="space-y-4 text-neutral-400 leading-relaxed">
                            <p>
                                Your privacy is critically important to us. Aegis is built on the principle of "Zero-Knowledge" architecture.
                            </p>
                            <h3 className="text-white font-medium pt-2">1. Data Collection</h3>
                            <p>
                                We do not collect, store, or process your personal data on our servers. All encryption happens locally on your device (client-side) before any data is stored. We simply store the encrypted blobs that only you can decrypt.
                            </p>
                            <h3 className="text-white font-medium pt-2">2. Local Storage</h3>
                            <p>
                                Aegis uses your browser's local storage and encryption capabilities to secure your vault.
                            </p>
                            <h3 className="text-white font-medium pt-2">3. Third-Party Services</h3>
                            <p>
                                We may use anonymous analytics to understand site usage patterns, but no personally identifiable information (PII) or vault data is ever shared with third parties.
                            </p>
                        </div>
                    </section>
                </div>
            </div>

            <Footer />
        </div>
    );
}
