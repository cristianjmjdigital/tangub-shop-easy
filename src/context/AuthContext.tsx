import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface Profile {
  id: string;
  auth_user_id: string | null;
  full_name: string;
  email: string;
  role: string;
  vendor_status?: string | null;
  barangay: string | null;
  phone: string | null;
}

interface AuthContextValue {
  session: any;
  profile: Profile | null;
  loading: boolean; // session hydration
  profileLoading: boolean; // profile fetch/upsert
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { session: initialSession } } = await supabase.auth.getSession();
      setSession(initialSession);
      setLoading(false);
      if (initialSession?.user) {
        loadProfile(initialSession.user.id, initialSession);
      }
    };
    init();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setLoading(false);
      if (newSession?.user) {
        loadProfile(newSession.user.id, newSession);
      } else {
        setProfile(null);
        setProfileLoading(false);
      }
    });

    return () => { listener.subscription.unsubscribe(); };
  }, []);

  const loadProfile = async (authUserId: string, currentSession = session) => {
    setProfileLoading(true);
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
          .insert({ auth_user_id: authUserId, full_name: 'New User', email: currentSession?.user?.email, role: 'user' })
          .select('*')
          .single();
        if (!insertErr && inserted) setProfile(inserted as Profile);
      }
    } catch (e) {
      // swallow; profile remains null
    } finally {
      setProfileLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (session?.user) await loadProfile(session.user.id);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null); // ensure local consumers react immediately
  };

  return (
    <AuthContext.Provider value={{ session, profile, loading, profileLoading, refreshProfile, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
