import { ShieldCheck, Activity, Cloud, Link as LinkIcon, Wand2, Search } from "lucide-react";
import SpotlightCard from "@/components/reactbits/SpotlightCard";

const features = [
    {
        icon: ShieldCheck,
        title: "Integrated Authenticator",
        description: "Store and generate 2FA tokens (TOTP) directly within your vault entries. No separate app required."
    },
    {
        icon: Activity,
        title: "Security Action Center",
        description: "Get a comprehensive health report of your vault. Instantly identify weak, reused, or compromised passwords."
    },
    {
        icon: Cloud,
        title: "Cloud Sync & OAuth",
        description: "Sync your encrypted vault across all devices. Sign in securely using your GitHub or Google accounts."
    },
    {
        icon: LinkIcon,
        title: "Multiple URLs per Entry",
        description: "Manage complex accounts by adding multiple domains and login pages to a single password entry."
    },
    {
        icon: Wand2,
        title: "Advanced Generator",
        description: "Create uncrackable, random passwords with custom lengths and character requirements in one click."
    },
    {
        icon: Search,
        title: "Power Search & Filters",
        description: "Navigate thousands of entries instantly with smart tagging and multi-dimensional advanced filtering."
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
