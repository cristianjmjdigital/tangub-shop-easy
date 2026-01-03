import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';

export default function VendorSetup() {
  const { profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    business_name: '',
    description: '',
    address: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id) { setError('Not authenticated'); return; }
    if (!form.business_name.trim()) { setError('Shop name required'); return; }
    if (!form.address.trim()) { setError('Complete address required'); return; }
    setError(null);
    setLoading(true);
    try {
      // Insert vendor row with correct columns (owner_user_id, store_name, description, address)
      const payload: any = {
        owner_user_id: profile.id,
        store_name: form.business_name.trim(),
        address: form.address.trim(),
      };
      if (form.description.trim()) payload.description = form.description.trim();
      // Prevent duplicate vendor row for same user
      const { data: existingVendor } = await supabase
        .from('vendors')
        .select('id')
        .eq('owner_user_id', profile.id)
        .maybeSingle();
      if (existingVendor) {
        setError('Vendor already exists for this account. Redirecting...');
        await refreshProfile();
        setTimeout(() => navigate('/vendor'), 800);
        return;
      }

      const { error: vendorError } = await supabase
        .from('vendors')
        .insert(payload);
      if (vendorError) throw vendorError;

      // Update user role to vendor (idempotent)
      const { error: roleError } = await supabase
        .from('users')
        .update({ role: 'vendor' })
        .eq('id', profile.id);
      if (roleError) throw roleError;

      await refreshProfile();
      const { data: createdVendor } = await supabase
        .from('vendors')
        .select('id')
        .eq('owner_user_id', profile.id)
        .maybeSingle();
      if (createdVendor?.id) navigate('/vendor');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to set up vendor');
    } finally {
      setLoading(false);
    }
  };

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <p className="text-sm text-muted-foreground">Loading profile...</p>
      </div>
    );
  }
  // Only redirect if user is vendor AND vendor row actually exists (avoid loop if row missing)
  useEffect(() => {
    const check = async () => {
      if (profile?.role === 'vendor' && profile.id) {
        const { data } = await supabase
          .from('vendors')
          .select('id')
          .eq('owner_user_id', profile.id)
          .maybeSingle();
        if (data?.id) navigate('/vendor', { replace: true });
      }
    };
    check();
  }, [profile?.role, profile?.id, navigate]);
  // Keep form visible even if role already updated but vendor row missing

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-xl text-center">Become a Vendor</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="business_name">Add Shop Name</Label>
              <Input id="business_name" required placeholder="Add Shop Name" value={form.business_name} onChange={(e) => setForm(f => ({ ...f, business_name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea id="description" value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Complete Address</Label>
              <Textarea
                id="address"
                required
                placeholder="House/Unit No., Street, Barangay, City"
                value={form.address}
                onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))}
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Creating vendor...' : 'Create Vendor Account'}</Button>
            <Button type="button" variant="outline" className="w-full" onClick={() => navigate('/profile')}>Cancel</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
