import { useState } from "react";
import { Globe, Plus } from "lucide-react";
import { VaultItem } from "@/hooks/useVault";

export const VaultItemIcon = ({ item, className = "w-10 h-10" }: {
    item: {
        category: string;
        urls?: string[];
        name?: string;
    } | VaultItem | null;
    className?: string
}) => {
    const [imageError, setImageError] = useState(false);

    if (!item) {
        return (
            <div className={`${className} rounded-full bg-zinc-800 flex items-center justify-center text-neutral-500 shrink-0 ring-1 ring-white/10`}>
                <Plus className="w-1/2 h-1/2" />
            </div>
        );
    }

    const getFaviconUrl = (urls: string[]) => {
        if (!urls || urls.length === 0) return null;
        try {
            let urlStr = urls[0];
            if (!urlStr) return null;

            // Handle incomplete URLs gracefully
            if (!urlStr.startsWith("http")) {
                urlStr = "https://" + urlStr;
            }

            const url = new URL(urlStr);
            const domain = url.hostname;

            // Ensure we have a valid domain before making requests
            if (!domain || domain.length < 3 || !domain.includes('.')) {
                return null;
            }

            return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
        } catch (e) {
            // Silently fail for invalid URLs during typing
            return null;
        }
    };

    const faviconUrl = getFaviconUrl(item.urls || []);

    if (faviconUrl && !imageError) {
        return (
            <div className={`${className} rounded-full bg-zinc-800 flex items-center justify-center shrink-0 ring-1 ring-white/10 overflow-hidden`}>
                <img
                    src={faviconUrl}
                    alt={item.name}
                    className="w-full h-full object-cover"
                    onError={() => setImageError(true)}
                />
            </div>
        );
    }

    return (
        <div className={`${className} rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold shrink-0 ring-1 ring-blue-500/30`}>
            <Globe className="w-1/2 h-1/2" />
        </div>
    );
};
