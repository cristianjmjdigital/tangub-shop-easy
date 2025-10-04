import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";

const BARANGAYS = [
  "Aquino",
  "Balat-ok",
  "Bintana",
  "Bourbon",
  "Caniangan",
  "Capalaran",
  "Catagan",
  "Cawit",
  "Dimalco",
  "Dimalooc",
  "Guiling",
  "Hoyohoy",
  "Imelda",
  "Kauswagan",
  "Lorenzo Tan",
  "Maquilao",
  "Mantic-an",
  "Matam",
  "Minsuban",
  "Osorio",
  "Panalsalan",
  "Sagayaran",
  "San Apolinario",
  "San Antonio",
  "San Vicente Bajo",
  "San Vicente Alto",
  "Santo Niño",
  "Silanga",
  "Sumirap",
  "Tinacla-an",
  "Villar"
];

export default function UserSignup() {
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
    phone: "",
    city: "Tangub City",
    barangay: "Aquino",
    role: "customer" // customer | vendor
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any | null>(null);
  const validate = () => {
    if (!form.name.trim()) return "Name required";
    if (!form.email.trim()) return "Email required";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) return "Invalid email";
    if (form.password.length < 6) return "Password must be at least 6 characters";
    if (form.password !== form.confirm) return "Passwords do not match";
    return null;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = validate();
    if (v) { setError(v); return; }
    setError(null);
    setSubmitting(true);
    try {
      // Basic defensive check for missing env config to surface clearer error
      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }
      const emailTrim = form.email.trim().toLowerCase();
      let signUpData, signUpError;
  setDebugInfo(null);
  let ambiguousDbError = false;
      for (let attempt = 0; attempt < 2; attempt++) {
        const { data, error } = await supabase.auth.signUp({
          email: emailTrim,
          password: form.password,
          options: { data: { full_name: form.name.trim() } }
        });
        signUpData = data; signUpError = error;
        if (!error) break;
        const msg = (error.message || '').toLowerCase();
        // Retry only on ambiguous DB error (possible transient) once
        if (attempt === 0 && /database error saving new user/.test(msg)) {
          ambiguousDbError = true;
          await new Promise(r => setTimeout(r, 600));
          continue;
        }
        break;
      }
      if (signUpError) {
        const msg = signUpError.message || '';
        if (import.meta.env.DEV) {
          console.group('[Signup] signUpError');
          console.debug('message:', signUpError.message);
          // @ts-ignore
          console.debug('status:', signUpError.status, 'name:', signUpError.name, 'code:', (signUpError as any).code);
          console.debug('full object:', signUpError);
          console.groupEnd();
          setDebugInfo({ phase: 'signUp', message: signUpError.message, status: (signUpError as any).status, code: (signUpError as any).code, full: signUpError });
        }
        // Duplicate detection
        if (/duplicate key|already registered|already exists|user already registered|email.*exists|violates unique constraint/i.test(msg)) {
          setError('Email already registered. Please log in instead.');
          setSubmitting(false);
          return;
        }
        // Password policy
        if (/password/i.test(msg) && /length/i.test(msg)) {
          setError('Password does not meet requirements. Use at least 6 characters.');
          setSubmitting(false);
          return;
        }
        // Ambiguous database error: show raw so we can learn real root cause (improves debugging)
        if (/database error saving new user/i.test(msg)) {
          // Probe: see if session actually exists (sometimes auth succeeds but returns error due to downstream profile issue)
          const { data: sessionCheck } = await supabase.auth.getSession();
          if (sessionCheck?.session?.user?.email?.toLowerCase() === emailTrim) {
            // Treat as success; proceed without re-signup
            signUpData = { user: sessionCheck.session.user } as any;
          } else {
            // Attempt a sign-in (maybe account created but signUp error thrown late)
            const { data: probeSignIn, error: probeErr } = await supabase.auth.signInWithPassword({ email: emailTrim, password: form.password });
            if (probeSignIn?.user) {
              signUpData = { user: probeSignIn.user } as any;
            } else if (probeErr && /invalid login credentials/i.test(probeErr.message || '')) {
              // Truly wasn't created; offer an automatic second attempt (already performed once in loop if ambiguousDbError true)
              if (!ambiguousDbError) {
                // Safety: shouldn't happen; just show message
                setError('Signup failed (database). Please retry. Raw: ' + msg);
                setSubmitting(false);
                return;
              }
              if (import.meta.env.DEV) setDebugInfo((d:any) => ({ ...d, probe: 'invalid credentials', probeErr }));
              const isInternal = signUpError.status === 500 || (signUpError as any).code === 'unexpected_failure';
              setError(isInternal
                ? 'Internal auth service error (500). Please wait a minute and retry. If this recurs, an admin must inspect Supabase Auth logs.'
                : 'Signup failed due to a transient backend issue. Press Sign Up again. Raw: ' + msg);
              setSubmitting(false);
              return;
            } else {
              if (import.meta.env.DEV) setDebugInfo((d:any) => ({ ...d, probe: 'other probe state', probeErr }));
              // Unknown probe state; surface raw but instruct retry
              setError('Backend issue creating account. Retry once. Raw: ' + msg);
              setSubmitting(false);
              return;
            }
          }
        } else {
          // Generic fallback (use original for clarity)
          setError('Signup failed: ' + msg);
          setSubmitting(false);
          return;
        }
      }
      const authUser = signUpData.user;
      if (!authUser?.id) throw new Error("No user id returned from sign up");

      // Simplified: skip waiting for session (open RLS / email confirm disabled for school project)

      // Direct upsert of profile (idempotent) — avoids trigger timing/RLS race.
      const desiredRole = form.role === 'vendor' ? 'vendor' : 'user';
      let upsertSuccess = false;
      let lastUpsertErr: any = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        const profilePayload: any = {
          auth_user_id: authUser.id,
          email: authUser.email,
          full_name: form.name.trim(),
          role: desiredRole
        };
        // Only include barangay/phone if user entered (avoid errors if columns missing)
        if (form.barangay) profilePayload.barangay = form.barangay;
        if (form.phone) profilePayload.phone = form.phone;

        const { error: upsertErr } = await supabase
          .from('users')
          .upsert([profilePayload], { onConflict: 'auth_user_id' });
        if (!upsertErr) { upsertSuccess = true; break; }
        lastUpsertErr = upsertErr;
        if (upsertErr.message.toLowerCase().includes('row-level security') || upsertErr.message.toLowerCase().includes('foreign key')) {
          await new Promise(r => setTimeout(r, 400 * (attempt + 1)));
          continue;
        }
        break;
      }
      if (!upsertSuccess) {
        // As a fallback, see if profile row exists already (race or previous attempt)
        const { data: existingRow } = await supabase
          .from('users')
          .select('id')
          .eq('auth_user_id', authUser.id)
          .maybeSingle();
        if (!existingRow) {
          throw new Error(`Profile save failed: ${lastUpsertErr?.message || 'unknown error'}`);
        }
      }

      // Verify persistence (best-effort)
      const { data: verifyRow } = await supabase
        .from('users')
        .select('id, role, barangay, phone')
        .eq('auth_user_id', authUser.id)
        .maybeSingle();
      if (!verifyRow) console.warn('[signup] verify row missing after upsert');

      await refreshProfile();
      toast({ title: 'Account created', description: 'Redirecting to home...', duration: 2500 });
      setTimeout(() => navigate('/home'), 1400);
    } catch (err: any) {
      console.error(err);
      // Normalize some Postgres / network noise for end-user clarity
      const raw = err.message || 'Signup failed';
      if (/Database error saving new user/i.test(raw)) {
        if (/invalid input syntax for type/i.test(raw)) {
          setError('Invalid input. Please review your entries.');
        } else {
          setError('Signup failed due to backend constraint. Try a different email or log in if you registered before.');
        }
      } else if (/network/i.test(raw)) {
        setError('Network issue creating account. Check your connection and try again.');
      } else {
        setError(raw);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-xl">Create Account</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirm Password</Label>
                <Input id="confirm" type="password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone (optional)</Label>
              <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="09xx-xxx-xxxx" />
            </div>
            <div className="space-y-2">
              <Label>Account Type</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">Customer</SelectItem>
                  <SelectItem value="vendor">Vendor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" value={form.city} readOnly className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>Barangay</Label>
                <Select value={form.barangay} onValueChange={(v) => setForm({ ...form, barangay: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select barangay" />
                  </SelectTrigger>
                  <SelectContent>
                    {BARANGAYS.map((b) => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            {/* Dev debugging panel (only shown in dev mode) */}
            {import.meta.env.DEV && debugInfo && (
              <pre className="text-xs bg-muted p-2 rounded overflow-x-auto max-h-40">
{JSON.stringify(debugInfo, null, 2)}
              </pre>
            )}
            <Button className="w-full" type="submit" disabled={submitting}>{submitting ? 'Creating account...' : 'Sign Up'}</Button>
            <Button variant="outline" className="w-full" asChild>
              <Link to="/login/user">Back to Login</Link>
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
