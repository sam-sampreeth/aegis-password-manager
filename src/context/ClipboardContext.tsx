import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

// import { useUserSettings } from '@/hooks/useProfiles';

interface ClipboardContextType {
    copyToClipboard: (text: string, label?: string) => Promise<void>;
    clipboardState: 'idle' | 'copied' | 'cleared';
}

const ClipboardContext = createContext<ClipboardContextType | undefined>(undefined);



export function ClipboardProvider({ children }: { children: React.ReactNode }) {
    const [clipboardState, setClipboardState] = useState<'idle' | 'copied' | 'cleared'>('idle');
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastCopiedText = useRef<string | null>(null);
    // const { settings } = useUserSettings(); // Disabled for now

    const SECURED_TEXT = "Clipboard secured by Aegis";

    // Reverted to static 30s timer as db sync is being debugged
    const CLEAR_TIMEOUT = 30000;
    const isEnabled = false; // Disabled by user request

    // Clean up timer on unmount
    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    const copyToClipboard = async (text: string, label: string = "Text") => {
        try {
            // Write to clipboard
            await navigator.clipboard.writeText(text);
            lastCopiedText.current = text;
            setClipboardState('copied');

            if (isEnabled) {
                toast.success(`${label} copied`, {
                    description: "Clipboard will be cleared in 30 seconds."
                });
            } else {
                toast.success(`${label} copied`);
            }

            // Clear existing timer
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }

            // Only set timer if enabled
            if (isEnabled) {
                timeoutRef.current = setTimeout(async () => {
                    try {
                        // Try to read current content to avoid overwriting user's new copy
                        // Note: `readText` might require permission/focus. 
                        const currentContent = await navigator.clipboard.readText().catch(() => null);

                        if (currentContent === text) {
                            // Still matches our secret, clear it
                            await navigator.clipboard.writeText(SECURED_TEXT);
                            setClipboardState('cleared');
                            lastCopiedText.current = null;
                            toast.info("Clipboard cleared", {
                                description: "Sensitive data removed from clipboard."
                            });
                        } else if (currentContent === SECURED_TEXT) {
                            setClipboardState('cleared');
                        } else {
                            setClipboardState('idle');
                        }

                    } catch (error) {
                        console.warn("Clipboard read failed during clear check", error);
                    }
                }, CLEAR_TIMEOUT);
            }

        } catch (error) {
            console.error("Failed to copy", error);
            toast.error("Failed to copy to clipboard");
        }
    };

    return (
        <ClipboardContext.Provider value={{ copyToClipboard, clipboardState }}>
            {children}
        </ClipboardContext.Provider>
    );
}

export function useClipboard() {
    const context = useContext(ClipboardContext);
    if (context === undefined) {
        throw new Error('useClipboard must be used within a ClipboardProvider');
    }
    return context;
}
