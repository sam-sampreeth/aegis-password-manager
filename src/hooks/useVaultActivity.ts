
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Database } from '../types/database.types';

type VaultActivity = Database['public']['Tables']['vault_activity']['Row'];

export function useVaultActivity() {
    const { user } = useAuth();
    const [activities, setActivities] = useState<VaultActivity[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const logActivity = async (eventType: string, metadata?: any) => {
        if (!user) return;
        try {
            // Optimistic update (optional, but good for UI)
            // But for now, let's just insert
            const { error } = await supabase
                .from('vault_activity')
                .insert({
                    user_id: user.id,
                    event_type: eventType,
                    metadata: metadata,
                });

            if (error) throw error;
            // Refetch to update list
            fetchActivity();
        } catch (err: any) {
            setError(err.message);
            console.error('Failed to log activity:', err);
        }
    };

    const fetchActivity = async (limit = 20) => {
        if (!user) return;
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('vault_activity')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;
            setActivities(data as VaultActivity[]);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    // Initial fetch
    useEffect(() => {
        if (user) {
            fetchActivity();
        }
    }, [user]);

    return { activities, logActivity, fetchActivity, loading, error };
}
