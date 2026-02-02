import { KeyRound, Gauge, Tags, BadgeAlert, GlobeLock, Search } from "lucide-react";
import SpotlightCard from "@/components/reactbits/SpotlightCard";

const features = [
    {
        icon: KeyRound,
        title: "Password Generator",
        description: "Create strong, random passwords customized for each account or website."
    },
    {
        icon: Gauge,
        title: "Strength Meter",
        description: "Get instant feedback on password strength to avoid weak or reused ones."
    },
    {
        icon: Tags,
        title: "Smart Tagging",
        description: "Organize logins with custom tags like Work or Personal for faster access and cleaner sorting."
    },
    {
        icon: BadgeAlert,
        title: "Multi-Factor Authentication",
        description: "Secure your vault with a verification code from your authenticator app or trusted device."
    },
    {
        icon: GlobeLock,
        title: "Zero-Knowledge Encryption",
        description: "Your data is encrypted with AES-256 and decrypted only on your device - never accessible to anyone else."
    },
    {
        icon: Search,
        title: "Smart Search & Filters",
        description: "Find entries instantly using global search or filters by tag, username, or site name."
    },
];

export default function Features() {
    return (
        <section id="features" className="py-24 bg-black">
            <div className="container mx-auto px-4">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
                        Everything you need to stay secure
                    </h2>
                    <p className="text-lg text-neutral-400 max-w-2xl mx-auto">
                        Enterprise-grade security features designed for everyone
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
                    {features.map((feature, index) => (
                        <SpotlightCard
                            key={index}
                            className="p-8 h-full"
                            spotlightColor="rgba(59, 130, 246, 0.25)" // Blue-500 equivalent
                        >
                            <div className="w-12 h-12 bg-neutral-800 rounded-lg flex items-center justify-center mb-6 border border-neutral-700">
                                <feature.icon className="w-6 h-6 text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-3">
                                {feature.title}
                            </h3>
                            <p className="text-neutral-400 leading-relaxed">
                                {feature.description}
                            </p>
                        </SpotlightCard>
                    ))}
                </div>
            </div>
        </section>
    );
}
