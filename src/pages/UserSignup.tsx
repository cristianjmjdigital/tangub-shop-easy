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

const VERIFICATION_BUCKET = import.meta.env.VITE_VERIFICATION_BUCKET || 'verification-docs';

const BARANGAYS = [
  "Aquino",
  "Barangay I - City Hall",
  "Barangay II - Marilou Annex",
  "Barangay III- Market Kalubian",
  "Barangay IV - St. Michael",
  "Barangay V - Malubog",
  "Barangay VI - Lower Polao",
  "Barangay VII - Upper Polao",
  "Balatacan",
  "Baluc",
  "Banglay",
  "Bintana",
  "Bocator",
  "Bongabong",
  "Caniangan",
  "Capalaran",
  "Catagan",
  "Hoyohoy",
  "Isidro D. Tan (Dimalooc)",
  "Garang",
  "Guinabot",
  "Guinalaban",
  "Kausawagan",
  "Kimat",
  "Labuyo",
  "Lorenzo Tan",
  "Lumban",
  "Maloro",
  "Manga",
  "Mantic",
  "Maquilao",
  "Matugnao",
  "Migcanaway",
  "Minsubong",
  "Owayan",
  "Paiton",
  "Panalsalan",
  "Pangabuan",
  "Prenza",
  "Salimpuno",
  "San Antonio",
  "San Apolinario",
  "San Vicente",
  "Santa Cruz",
  "Santa Maria (Baga)",
  "Santo Niño",
  "Sicot",
  "Silanga",
  "Silangit",
  "Simasay",
  "Sumirap",
  "Taguite",
  "Tituron",
  "Tugas",
  "Villaba",
];

export default function UserSignup() {
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();
  const { toast } = useToast();
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    middle_name: "",
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
  const [govIdFile, setGovIdFile] = useState<File | null>(null);
  const [govIdPreview, setGovIdPreview] = useState<string | null>(null);
  const [businessPermitFile, setBusinessPermitFile] = useState<File | null>(null);
  const [businessPermitPreview, setBusinessPermitPreview] = useState<string | null>(null);
  const isVendor = form.role === 'vendor';
  const normalizePhoneInput = (raw: string) => raw.replace(/\D/g, '').slice(0, 11);
  // Debug panel removed after stabilization

  const uploadDoc = async (file: File | null, keyPrefix: string, userId: string) => {
    if (!file) return null;
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${userId}/${keyPrefix}-${Date.now()}.${ext}`;
    const { error: uploadErr } = await supabase.storage.from(VERIFICATION_BUCKET).upload(path, file, { upsert: true, contentType: file.type });
    if (uploadErr) throw uploadErr;
    const { data } = supabase.storage.from(VERIFICATION_BUCKET).getPublicUrl(path);
    return data.publicUrl || null;
  };

  const validate = () => {
    if (!form.first_name.trim()) return "First name required";
    if (!form.last_name.trim()) return "Last name required";
    if (!form.email.trim()) return "Email required";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) return "Invalid email";
    if (form.password.length < 6) return "Password must be at least 6 characters";
    if (form.password !== form.confirm) return "Passwords do not match";
    if (form.phone && !/^09\d{9}$/.test(form.phone)) return "Phone must be 11 digits starting with 09";
    if (isVendor && !businessPermitFile) return "Business Permit image is required for vendors";
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
        const firstName = form.first_name.trim();
        const lastName = form.last_name.trim();
        const middleName = form.middle_name.trim();
        const fullName = [firstName, middleName, lastName].filter(Boolean).join(' ').trim();
      let signUpData, signUpError;
  // (removed debug panel logic)
  let ambiguousDbError = false;
      const emailRedirectTo = `https://tangubshopeasy.netlify.app/login/user`;
      for (let attempt = 0; attempt < 2; attempt++) {
        const { data, error } = await supabase.auth.signUp({
          email: emailTrim,
          password: form.password,
          options: { data: { full_name: fullName, first_name: firstName, last_name: lastName, middle_name: middleName }, emailRedirectTo }
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
        // (debug logging removed)
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
              // (debug info removed)
              const isInternal = signUpError.status === 500 || (signUpError as any).code === 'unexpected_failure';
              setError(isInternal
                ? 'Internal auth service error (500). Please wait a minute and retry. If this recurs, an admin must inspect Supabase Auth logs.'
                : 'Signup failed due to a transient backend issue. Press Sign Up again. Raw: ' + msg);
              setSubmitting(false);
              return;
            } else {
              // (debug info removed)
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

      // If email confirmation is required (session absent), stop here and prompt user to verify
      if (!signUpData.session) {
        toast({ title: 'Confirm your email', description: 'We sent a confirmation link. Please verify to activate your account.' });
        setSubmitting(false);
        setTimeout(() => navigate('/login/user'), 1200);
        return;
      }

      // Simplified: skip waiting for session (open RLS / email confirm disabled for school project)

      // Upload verification documents (vendor: required permit; gov ID optional)
      let govIdUrl: string | null = null;
      let permitUrl: string | null = null;
      try {
        govIdUrl = await uploadDoc(govIdFile, 'gov-id', authUser.id);
        permitUrl = await uploadDoc(businessPermitFile, 'business-permit', authUser.id);
      } catch (uploadErr: any) {
        throw new Error(uploadErr?.message || 'Failed to upload verification documents');
      }

      // Direct upsert of profile (idempotent) — avoids trigger timing/RLS race.
      const desiredRole = form.role === 'vendor' ? 'vendor' : 'user';
      const vendorStatus = desiredRole === 'vendor' ? 'pending' : 'approved';
      let upsertSuccess = false;
      let lastUpsertErr: any = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        const profilePayload: any = {
          auth_user_id: authUser.id,
          email: authUser.email,
          full_name: fullName,
          role: desiredRole,
          vendor_status: vendorStatus,
          city: form.city || 'Tangub City',
          gov_id_url: govIdUrl,
          business_permit_url: permitUrl,
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
        .select('id, role, vendor_status, barangay, phone')
        .eq('auth_user_id', authUser.id)
        .maybeSingle();
      if (!verifyRow) console.warn('[signup] verify row missing after upsert');

      await refreshProfile();

      // Vendors require admin approval before they can access the dashboard
      if (desiredRole === 'vendor' && vendorStatus === 'pending') {
        toast({ title: 'Awaiting admin approval', description: 'Thanks for signing up. An admin must approve your vendor account before you can log in.' });
        await supabase.auth.signOut();
        setSubmitting(false);
        setTimeout(() => navigate('/login/vendor'), 1200);
        return;
      }

      const targetPath = desiredRole === 'vendor' ? '/vendor' : '/home';
      const targetLabel = desiredRole === 'vendor' ? 'vendor dashboard' : 'home';
      toast({ title: 'Account created', description: `Redirecting to ${targetLabel}...`, duration: 2500 });
      setTimeout(() => navigate(targetPath), 1400);
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

  const handleGovIdChange = (fileList: FileList | null) => {
    const file = fileList?.[0] || null;
    setGovIdFile(file);
    if (govIdPreview) {
      URL.revokeObjectURL(govIdPreview);
    }
    setGovIdPreview(file ? URL.createObjectURL(file) : null);
  };

  const handlePermitChange = (fileList: FileList | null) => {
    const file = fileList?.[0] || null;
    if (file && !file.type.startsWith('image/')) {
      setError('Business Permit must be an image file.');
      return;
    }
    setError(null);
    setBusinessPermitFile(file);
    if (businessPermitPreview) {
      URL.revokeObjectURL(businessPermitPreview);
    }
    setBusinessPermitPreview(file ? URL.createObjectURL(file) : null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-xl">Create Account</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name</Label>
                <Input id="first_name" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name</Label>
                <Input id="last_name" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="middle_name">Middle Name (optional)</Label>
              <Input id="middle_name" value={form.middle_name} onChange={(e) => setForm({ ...form, middle_name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gov-id">Government ID (optional)</Label>
              <Input id="gov-id" type="file" accept="image/*" onChange={(e) => handleGovIdChange(e.target.files)} />
              <p className="text-xs text-muted-foreground">File is only previewed here and not uploaded.</p>
              {govIdPreview && (
                <div className="border rounded-md p-2 bg-muted/30">
                  <img src={govIdPreview} alt="Government ID preview" className="w-full rounded" />
                </div>
              )}
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
              <Input
                id="phone"
                inputMode="numeric"
                pattern="09\d{9}"
                maxLength={11}
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: normalizePhoneInput(e.target.value) })}
                placeholder="09xxxxxxxxx"
              />
              {form.phone && !/^09\d{9}$/.test(form.phone) && (
                <p className="text-xs text-red-600">Use a Philippine mobile number (11 digits starting with 09).</p>
              )}
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
            <div className="space-y-2">
              {isVendor && (
                <div className="space-y-2">
                  <Label htmlFor="business-permit">Business Permit (required for vendors)</Label>
                  <Input
                    id="business-permit"
                    type="file"
                    accept="image/*"
                    onChange={(e) => handlePermitChange(e.target.files)}
                    required={isVendor}
                  />
                  <p className="text-xs text-muted-foreground">Image uploads only. Vendors must provide a valid permit to activate.</p>
                  {businessPermitPreview && (
                    <div className="border rounded-md p-2 bg-muted/30">
                      <img src={businessPermitPreview} alt="Business permit preview" className="w-full rounded" />
                    </div>
                  )}
                </div>
              )}
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
            {/* Debug panel removed */}
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
