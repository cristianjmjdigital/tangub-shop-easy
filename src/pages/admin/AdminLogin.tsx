import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password) return setError("Missing credentials");
    // Mock admin login (hard-coded) - later replace with Supabase auth/role claim
    if (form.email === "admin@tangub.local" && form.password === "admin123") {
      localStorage.setItem("role", "admin");
      navigate("/admin");
    } else {
      setError("Invalid admin credentials");
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
            <Button type="submit" className="w-full">Login</Button>
          </form>
          <div className="mt-6 text-[10px] text-muted-foreground text-center">Prototype only – will integrate Supabase auth later.</div>
        </CardContent>
      </Card>
    </div>
  );
}
