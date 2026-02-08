
import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
    session: Session | null;
    user: User | null;
    loading: boolean;
    isDemo: boolean;
    loginDemo: () => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [isDemo, setIsDemo] = useState(false);

    const syncProfile = useCallback(async (userId: string) => {
        if (userId === "demo-user") return;

        try {
            // Get MFA Status
            const { data: factors } = await supabase.auth.mfa.listFactors();
            const totpFactor = factors?.totp.find(f => f.status === 'verified');
            const isMfaEnabled = !!totpFactor;

            const updates = {
                last_login_at: new Date().toISOString(),
                mfa_enabled: isMfaEnabled,
                mfa_type: isMfaEnabled ? 'totp' : 'email' // Default to email if no TOTP, but only if we want to track that. User said default email if null.
            };

            await (supabase.from('profiles') as any).update(updates).eq('id', userId);
        } catch (error) {
            console.error("Failed to sync profile:", error);
        }
    }, []);

    useEffect(() => {
        // Check active session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
            if (session?.user) {
                syncProfile(session.user.id);
            }
        });

        // Listen for changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
            if (event === 'SIGNED_IN' && session?.user) {
                syncProfile(session.user.id);
            }
        });

        return () => subscription.unsubscribe();
    }, [syncProfile]);

    const loginDemo = useCallback(async () => {
        setIsDemo(true);
        setUser({
            id: "demo-user",
            email: "demo@example.com",
            aud: "authenticated",
            role: "authenticated",
            created_at: new Date().toISOString(),
            app_metadata: { provider: "email" },
            user_metadata: { full_name: "Demo User" },
        } as User);
        setSession({
            user: { id: "demo-user", email: "demo@example.com" } as User,
            access_token: "demo-token",
            refresh_token: "demo-refresh",
            expires_in: 3600,
            token_type: "bearer"
        });
    }, []);

    const signOut = useCallback(async () => {
        if (isDemo) {
            setIsDemo(false);
            setUser(null);
            setSession(null);
        } else {
            await supabase.auth.signOut();
        }
    }, [isDemo]);

    return (
        <AuthContext.Provider value={{ session, user, loading, isDemo, loginDemo, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
