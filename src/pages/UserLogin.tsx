import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";

export default function UserLogin() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { refreshProfile, profile, signOut } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [portalLock, setPortalLock] = useState<string | null>(null);
  const portalHint = (portalLock || error)?.toLowerCase().includes('vendor')
    ? { title: 'Vendor account detected', ctaLabel: 'Go to Vendor Login', href: '/login/vendor' }
    : null;
  const vendorBlocked = Boolean(portalLock);

  // Hydrate portal lock from URL (persists across forced redirect after signOut)
  useEffect(() => {
    const lock = searchParams.get('portalLock');
    if (lock === 'vendor') {
      const msg = 'This is a vendor account. Please use the Vendor Login.';
      setPortalLock(msg);
      setError(msg);
    }
  }, [searchParams]);

  // Prevent cross-portal use: if a vendor session hits user login, show message and sign out.
  useEffect(() => {
    const role = (profile?.role || '').toLowerCase();
    if (role === "vendor") {
      const msg = "You are logged in as a vendor. Please use the Vendor Login portal.";
      setPortalLock(msg);
      setError(msg);
      // Sign out and stay on the same page with portal lock flag
      signOut().finally(() => {
        setSearchParams({ portalLock: 'vendor' });
        navigate('/login/user?portalLock=vendor', { replace: true });
      });
    }
  }, [profile?.role, signOut, navigate, setSearchParams]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      let sessionUserId = data?.user?.id || null;
      if (signInError) {
        const msg = signInError.message.toLowerCase();
        // If confirmation related, try to fetch session anyway (open project scenario)
        if (msg.includes('confirm') || msg.includes('not confirmed')) {
          const { data: sess } = await supabase.auth.getSession();
          if (!sess.session) throw signInError; // still no session -> real error
          sessionUserId = sess.session.user.id;
        } else {
          throw signInError;
        }
      }

      // Check role to prevent vendors from entering the customer portal
      const authId = sessionUserId;
      if (!authId) throw new Error('No authenticated user returned');
      const { data: profileRow, error: profileErr } = await supabase
        .from('users')
        .select('id, role, vendor_status')
        .eq('auth_user_id', authId)
        .maybeSingle();
      if (profileErr) throw profileErr;

      const role = (profileRow?.role || '').toLowerCase();
      if (role === 'vendor') {
        const msg = 'This is a vendor account. Please use the Vendor Login.';
        setPortalLock(msg);
        setError(msg);
        await supabase.auth.signOut();
        setLoading(false);
        setSearchParams({ portalLock: 'vendor' });
        navigate('/login/user?portalLock=vendor', { replace: true });
        return;
      }

      await refreshProfile();
      navigate('/home');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-sky-50 flex flex-col items-center justify-center px-4 py-10">
      <Card className="w-full max-w-sm border border-emerald-100 shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-xl text-emerald-900">Customer Login</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={onSubmit} className="space-y-4">
            {(portalLock || error) && (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                <div className="font-semibold">{portalHint?.title || 'Notice'}</div>
                <div className="text-xs leading-relaxed">{portalLock || error}</div>
                {portalHint && (
                  <Link to={portalHint.href} className="mt-1 inline-block text-[11px] font-medium text-amber-900 underline">
                    {portalHint.ctaLabel}
                  </Link>
                )}
              </div>
            )}
            <Input className="h-11" placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Input className="h-11" placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <Button className="w-full h-11 bg-emerald-600 hover:bg-emerald-700" type="submit" disabled={loading || vendorBlocked}>
              {loading ? 'Signing in...' : vendorBlocked ? 'Login disabled for vendor account' : 'Login'}
            </Button>
            <div className="text-center text-sm text-muted-foreground">Don't have an account? <Link to="/signup/user" className="text-primary font-medium">Sign up</Link></div>
            <Button variant="outline" className="w-full" asChild>
              <Link to="/">Back</Link>
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
