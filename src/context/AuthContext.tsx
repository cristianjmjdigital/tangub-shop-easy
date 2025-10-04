import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface Profile {
  id: string;
  auth_user_id: string | null;
  full_name: string;
  email: string;
  role: string;
  barangay: string | null;
  phone: string | null;
}

interface AuthContextValue {
  session: any;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      if (session?.user) {
        await loadProfile(session.user.id);
      } else {
        setLoading(false);
      }
    };
    init();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        loadProfile(newSession.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => { listener.subscription.unsubscribe(); };
  }, []);

  const loadProfile = async (authUserId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', authUserId)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        setProfile(data as Profile);
      } else {
        // Try creating a minimal profile row if it truly doesn't exist yet
        const { data: inserted, error: insertErr } = await supabase
          .from('users')
          .insert({ auth_user_id: authUserId, full_name: 'New User', email: session?.user?.email, role: 'user' })
          .select('*')
          .single();
        if (!insertErr && inserted) setProfile(inserted as Profile);
      }
    } catch (e) {
      // swallow; profile remains null
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (session?.user) await loadProfile(session.user.id);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ session, profile, loading, refreshProfile, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
