import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";

export default function VendorLogin() {
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
      await refreshProfile();
      // After refresh, check role from profile table
      const { data: profileRow } = await supabase
        .from('users')
        .select('id, role, auth_user_id')
        .eq('auth_user_id', data.user?.id)
        .maybeSingle();
      const role = profileRow?.role;
      if (role !== 'vendor') {
        setError('This account is not a vendor. Use the user login or set up a vendor profile.');
        // Sign out to avoid lingering session as wrong role
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
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-center text-xl">Vendor Login</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <Input placeholder="Business Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button className="w-full" type="submit" disabled={loading}>{loading ? 'Signing in...' : 'Login as Vendor'}</Button>
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
