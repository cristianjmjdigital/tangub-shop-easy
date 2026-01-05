import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { isArchivedAccount } from "@/context/AuthContext";
import { ShieldCheck, ArrowLeft, Store } from "lucide-react";
import { Eye, EyeOff } from "lucide-react";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = form.email.trim().toLowerCase();
    const password = form.password.trim();
    setError("");
    setResetMessage(null);
    if (!email || !password) {
      setError("Missing credentials");
      return;
    }
    setLoading(true);
    try {
      const { data, error: signErr } = await supabase.auth.signInWithPassword({ email, password });
      let user = data.user;

      // Supabase can return a 400 with pending session data if email confirmation is required.
      if (signErr) {
        const msg = signErr.message.toLowerCase();
        if (msg.includes('confirm')) {
          const { data: sess } = await supabase.auth.getSession();
          user = sess.session?.user || user;
          if (!user) throw signErr;
        } else if (msg.includes('invalid login credentials')) {
          throw new Error('Invalid email or password.');
        } else {
          throw signErr;
        }
      }
      if (!user) throw new Error("Login failed");

      const archived = await isArchivedAccount(user.id, user.email);
      if (archived) {
        await supabase.auth.signOut();
        throw new Error("This account was archived and can no longer access");
      }

      const { data: roleData, error: roleErr } = await supabase.rpc('get_profile_role', { auth_uid: user.id });
      if (roleErr) throw roleErr;
      if (roleData !== 'admin') {
        await supabase.auth.signOut();
        throw new Error("Account is not an admin");
      }

      localStorage.setItem("role", "admin");
      navigate("/admin");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login error";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!form.email.trim()) {
      setError('Enter your email to receive a reset link.');
      return;
    }
    setError('');
    setResetMessage(null);
    setLoading(true);
    try {
      await supabase.auth.resetPasswordForEmail(form.email.trim(), { redirectTo: `${window.location.origin}/login/admin` });
      setResetMessage('Reset link sent. Check your email.');
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-primary/20 to-background px-4 py-10 text-foreground">
      <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-8 items-center">
        <div className="hidden lg:block space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm">
            <ShieldCheck className="h-4 w-4 text-primary" /> Admin Portal
          </div>
          <div className="flex items-center gap-3 text-primary">
            <div className="h-12 w-12 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shadow-lg">
              <Store className="h-6 w-6" />
            </div>
            <div>
              <div className="text-lg font-semibold">Tangub City Shopeasy</div>
              <div className="text-sm text-muted-foreground">Admin Login</div>
            </div>
          </div>
          <h1 className="text-3xl font-bold leading-tight text-primary">Secure access for administrators</h1>
          <p className="text-sm text-muted-foreground max-w-md">Manage vendors, users, orders, and reports. Use your admin credentials to continue.</p>
          <div className="flex gap-3 text-xs text-muted-foreground">
            <span className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary">Role-gated access</span>
            <span className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary">Audit-ready</span>
          </div>
        </div>

        <Card className="w-full max-w-md mx-auto shadow-2xl border-primary/10 bg-white/95 text-foreground">
          <CardHeader>
            <div className="flex items-center justify-center gap-2 mb-2">
              <img src="/logo.jpg" alt="Tangub City Shopeasy" className="h-10 w-auto" onError={(e)=>{ e.currentTarget.style.display='none'; }} />
            </div>
            <CardTitle className="text-center text-xl">Tangub City Shopeasy Admin</CardTitle>
            <p className="text-center text-sm text-muted-foreground">Only authorized administrators can continue.</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="admin-email">Email</Label>
                <Input id="admin-email" type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} autoComplete="username" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-pass">Password</Label>
                <div className="relative">
                  <Input
                    id="admin-pass"
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={e=>setForm({...form,password:e.target.value})}
                    autoComplete="current-password"
                    className="pr-12"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-3 text-muted-foreground text-xs flex items-center gap-1"
                    onClick={() => setShowPassword(v => !v)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    <span>{showPassword ? 'Hide' : 'Show'}</span>
                  </button>
                </div>
              </div>
              {error && <div className="text-xs text-destructive">{error}</div>}
              {resetMessage && <div className="text-[11px] text-emerald-700">{resetMessage}</div>}
              <div className="flex justify-end text-xs text-muted-foreground">
                <button type="button" onClick={handlePasswordReset} className="text-primary hover:underline">Forgot password?</button>
              </div>
              <div className="space-y-2">
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing in..." : "Login"}
                </Button>
                <Button type="button" variant="outline" className="w-full" asChild>
                  <Link to="/login/user" className="inline-flex items-center justify-center gap-2"><ArrowLeft className="h-4 w-4" /> Back to Customer Login</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
