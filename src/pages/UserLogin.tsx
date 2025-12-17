import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";

export default function UserLogin() {
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

      if (profileRow?.role === 'vendor') {
        setError('This is a vendor account. Please use the Vendor Login.');
        await supabase.auth.signOut();
        setLoading(false);
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
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-center text-xl">Customer Login</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <Input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button className="w-full" type="submit" disabled={loading}>{loading ? 'Signing in...' : 'Login'}</Button>
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
