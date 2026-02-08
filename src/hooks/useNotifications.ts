import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useVaultItems } from '@/hooks/useVault';

export interface Notification {
    id: string;
    type: 'critical' | 'warning' | 'info' | 'success';
    title: string;
    description: string | null;
    is_read: boolean;
    created_at: string;
    action_link: string | null;
    action_label: string | null;
}

export function useNotifications() {
    const { user } = useAuth();
    const { items } = useVaultItems();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchNotifications = async () => {
        if (!user) return;

        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching notifications:', error);
            return;
        }

        setNotifications(data || []);
        setLoading(false);
    };

    const generateInsights = async () => {
        if (!user || !items.length) return;

        const newInsights: any[] = [];

        // 1. Check for Weak Passwords
        const weakItems = items.filter(i => (i.strength || 0) < 50);
        if (weakItems.length > 0) {
            newInsights.push({
                user_id: user.id,
                type: 'warning',
                title: 'Weak Passwords Detected',
                description: `You have ${weakItems.length} passwords with a low strength score. Consider updating them.`,
                action_link: '/vault?filter=weak',
                action_label: 'Review Weak Items',
                // Unique key to prevent duplicate inserts for the same issue type often
                // In a real app we might use a dedicated 'insight_id' or similar. 
                // For now, we'll rely on the title being effectively unique for this type of check
            });
        }

        // 2. Check for Reused Passwords
        // Simple check: map passwords (if we could decrypt them here easily, but we might not want to verify *every* password 
        // on every load due to decryption cost). 
        // INSTAD: We'll stick to metadata checks or warnings that don't require heavy decryption for now, 
        // OR assume we can check duplication based on something else? 
        // Actually, without decrypting, we can't check reuse. 
        // Let's skip Reuse Check for this lighter-weight hook to avoid massive decrypt loop.

        // 3. Check MFA (using Auth API)
        const { data: mfaData } = await supabase.auth.mfa.listFactors();
        const mfaEnabled = mfaData?.totp.some(f => f.status === 'verified');

        if (!mfaEnabled) {
            newInsights.push({
                user_id: user.id,
                type: 'critical',
                title: 'Enable 2FA',
                description: 'Protect your account with Two-Factor Authentication.',
                action_link: '/vault/settings',
                action_label: 'Setup 2FA',
            });
        }

        // Insert insights if they don't exist
        for (const insight of newInsights) {
            // Check if active notification of this title already exists
            const exists = notifications.find(n => n.title === insight.title && !n.is_read);
            if (!exists) {
                // Upsert based on title/user_id could be cleaner, but for now simple insert if not found
                // We'll check DB to be sure we don't spam
                const { data: existingDb } = await supabase.from('notifications')
                    .select('id')
                    .eq('title', insight.title)
                    .eq('is_read', false)
                    .maybeSingle();

                if (!existingDb) {
                    await supabase.from('notifications').insert(insight);
                }
            }
        }

        // Re-fetch after generation
        fetchNotifications();
    };

    const markAsRead = async (id: string) => {
        // Optimistic update
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));

        // Actual update
        // We might want to actually DELETE them if "Dismiss" is the action, 
        // or just mark read. The prompt said "Dismiss (delete/hide)".
        // Let's delete for "Dismiss" and update for "Read" if we had that distinction.
        // For simplicity: Dismiss = Delete from view (Mark Read or Delete Row)
        // Let's go with DELETE for "Dismiss" to clear the list.

        const { error } = await supabase.from('notifications').delete().eq('id', id);
        if (error) {
            // Revert if error
            console.error("Failed to dismiss", error);
            fetchNotifications(); // Sync back
        } else {
            setNotifications(prev => prev.filter(n => n.id !== id));
        }
    };

    const markAllRead = async () => {
        if (!user) return;
        setNotifications([]); // Clear UI immediately
        const { error } = await supabase.from('notifications').delete().eq('user_id', user.id);
        if (error) {
            console.error("Failed to clear all", error);
            fetchNotifications();
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, [user]);

    // Run insights on load (debounced or once)
    useEffect(() => {
        if (!loading && user) {
            generateInsights();
        }
    }, [loading, user, items.length]);

    return {
        notifications,
        loading,
        dismissNotification: markAsRead,
        clearAll: markAllRead
    };
}
