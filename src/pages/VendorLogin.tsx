import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth, isArchivedAccount } from "@/context/AuthContext";
import { useToast } from "@/components/ui/use-toast";

export default function VendorLogin() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { refreshProfile, profile, signOut } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [portalLock, setPortalLock] = useState<string | null>(null);
  const portalHint = (portalLock || error)?.toLowerCase().includes('customer') || (portalLock || error)?.toLowerCase().includes('admin')
    ? { title: 'Customer session detected', ctaLabel: 'Go to Customer Login', href: '/login/user' }
    : null;
  const customerBlocked = Boolean(portalLock);

  // Hydrate portal lock from URL (persists across forced redirect after signOut)
  useEffect(() => {
    const lock = searchParams.get('portalLock');
    if (lock === 'customer') {
      const msg = 'You are logged in as a customer. Please use the Customer Login portal.';
      setPortalLock(msg);
      setError(msg);
    }
  }, [searchParams]);

  // Prevent cross-portal use: if a customer session hits vendor login, show message and sign out.
  useEffect(() => {
    const role = (profile?.role || '').toLowerCase();
    if (role && role !== "vendor") {
      const msg = "You are logged in as a customer/admin. Please use the Customer Login portal.";
      setPortalLock(msg);
      setError(msg);
      signOut().finally(() => {
        setSearchParams({ portalLock: 'customer' });
        navigate('/login/vendor?portalLock=customer', { replace: true });
      });
    }
  }, [profile?.role, signOut, navigate, setSearchParams]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
      const archived = await isArchivedAccount(data.user?.id, data.user?.email || email);
      if (archived) {
        const msg = 'This account was archived and can no longer access.';
        setError(msg);
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }
      await refreshProfile();
      // After refresh, check role from profile table
      const { data: profileRow } = await supabase
        .from('users')
        .select('id, role, auth_user_id, vendor_status')
        .eq('auth_user_id', data.user?.id)
        .maybeSingle();
      const role = profileRow?.role;
      if ((role || '').toLowerCase() !== 'vendor') {
        const msg = 'This account is not a vendor. Use the Customer Login or set up a vendor profile.';
        setPortalLock(msg);
        setError(msg);
        // Sign out to avoid lingering session as wrong role
        await supabase.auth.signOut();
        setLoading(false);
        setSearchParams({ portalLock: 'customer' });
        navigate('/login/vendor?portalLock=customer', { replace: true });
        return;
      }
      const vendorStatus = profileRow?.vendor_status || 'pending';
      if (vendorStatus !== 'approved') {
        const msg = vendorStatus === 'rejected'
          ? 'Your vendor account was rejected. Contact support for details.'
          : 'Your vendor account is pending admin approval.';
        setError(msg);
        toast({ title: vendorStatus === 'rejected' ? 'Vendor access blocked' : 'Vendor pending approval', description: msg, variant: vendorStatus === 'rejected' ? 'destructive' : 'default' });
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }
      // Prefetch vendor + recent products for a snappier dashboard
      const vendorFetch = supabase
        .from('vendors')
        .select('id')
        .eq('owner_user_id', data.user?.id)
        .maybeSingle();
      const productsFetch = supabase
        .from('products')
        .select('id')
        .limit(1); // lightweight warmup
      // Fire in parallel but don't block navigation too long
      Promise.allSettled([vendorFetch, productsFetch]).finally(() => {});
      navigate('/vendor');
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
          <CardTitle className="text-xl text-emerald-900">Vendor Login</CardTitle>
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
            <Input className="h-11" placeholder="Business Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Input className="h-11" placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <Button className="w-full h-11 bg-emerald-600 hover:bg-emerald-700" type="submit" disabled={loading || customerBlocked}>
              {loading ? 'Signing in...' : customerBlocked ? 'Login disabled for customer session' : 'Login as Vendor'}
            </Button>
            <div className="text-center text-xs text-muted-foreground">Need an account? <Link to="/signup/user" className="text-primary font-medium">Sign up</Link></div>
            <Button variant="outline" className="w-full" asChild>
              <Link to="/">Back</Link>
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
