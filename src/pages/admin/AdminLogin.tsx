import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.email || !form.password) return setError("Missing credentials");
    setLoading(true);
    try {
      const { data, error: signErr } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
      if (signErr) throw signErr;
      const user = data.user;
      if (!user) throw new Error("Login failed");

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary/10 to-background px-4 py-10">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-center text-xl">Admin Login</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-email">Email</Label>
              <Input id="admin-email" type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-pass">Password</Label>
              <Input id="admin-pass" type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} />
            </div>
            {error && <div className="text-xs text-destructive">{error}</div>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Login"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
