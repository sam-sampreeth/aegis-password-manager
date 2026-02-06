
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Database } from '../types/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type UserSettings = Database['public']['Tables']['user_settings']['Row'];

export function useProfile() {
    const { user } = useAuth();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!user) return;

        const fetchProfile = async () => {
            try {
                setLoading(true);
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();

                if (error) throw error;
                setProfile(data);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [user]);

    const updateProfile = async (updates: Database['public']['Tables']['profiles']['Update']) => {
        if (!user) return;
        const { error } = await supabase
            .from('profiles')
            // @ts-ignore
            .update(updates)
            .eq('id', user.id);
        if (error) throw error;
        setProfile((prev) => (prev ? { ...prev, ...updates } : null));
    };

    return { profile, loading, error, updateProfile };
}

export function useUserSettings() {
    const { user } = useAuth();
    const [settings, setSettings] = useState<UserSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!user) return;

        const fetchSettings = async () => {
            try {
                setLoading(true);
                const { data, error } = await supabase
                    .from('user_settings')
                    .select('*')
                    .eq('user_id', user.id)
                    .single();

                if (error) {
                    // Code PGRST116 means no row found
                    if (error.code === 'PGRST116') {
                        // Create default settings
                        // @ts-ignore
                        const { data: newData, error: insertError } = await supabase
                            .from('user_settings')
                            .insert({
                                user_id: user.id,
                                auto_lock_minutes: 15,
                                lock_on_tab_close: true,
                                lock_on_sleep: true,
                                clipboard_clear_seconds: 30,
                                notify_breach_alerts: true,
                                notify_password_reminders: true
                            })
                            .select()
                            .single();

                        if (insertError) throw insertError;
                        setSettings(newData);
                        return;
                    }
                    throw error;
                }
                setSettings(data);
            } catch (err: any) {
                console.error("Error fetching settings:", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchSettings();
    }, [user]);

    const updateSettings = async (updates: Database['public']['Tables']['user_settings']['Update']) => {
        if (!user) return;
        const { error } = await supabase
            .from('user_settings')
            // @ts-ignore
            .update(updates)
            .eq('user_id', user.id);

        if (error) {
            console.error("Error updating settings:", error);
            throw error;
        }
        setSettings((prev) => (prev ? { ...prev, ...updates } : null));
    };

    return { settings, loading, error, updateSettings };
}
