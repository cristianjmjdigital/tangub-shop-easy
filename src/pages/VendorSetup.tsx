import { useState } from 'react';
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
    if (!profile?.auth_user_id) { setError('Not authenticated'); return; }
    if (!form.business_name.trim()) { setError('Business name required'); return; }
    setError(null);
    setLoading(true);
    try {
      // Insert vendor row
      const { data: vendorInsert, error: vendorError } = await supabase
        .from('vendors')
        .insert({
          owner_auth_user_id: profile.auth_user_id,
          name: form.business_name.trim(),
          description: form.description.trim() || null,
          address: form.address.trim() || null
        })
        .select('id')
        .single();
      if (vendorError) throw vendorError;

      // Update user role to vendor
      const { error: roleError } = await supabase
        .from('users')
        .update({ role: 'vendor' })
        .eq('auth_user_id', profile.auth_user_id);
      if (roleError) throw roleError;

      await refreshProfile();
      navigate('/vendor');
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

  if (profile.role === 'vendor') {
    navigate('/vendor');
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-xl text-center">Become a Vendor</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="business_name">Business Name</Label>
              <Input id="business_name" value={form.business_name} onChange={(e) => setForm(f => ({ ...f, business_name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea id="description" value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address (optional)</Label>
              <Textarea id="address" value={form.address} onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))} />
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
