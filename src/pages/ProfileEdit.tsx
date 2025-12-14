import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';

const BARANGAYS = [
  'Aquino','Balat-ok','Bintana','Bourbon','Caniangan','Capalaran','Catagan','Cawit','Dimalco','Dimalooc','Guiling','Hoyohoy','Imelda','Kauswagan','Lorenzo Tan','Maquilao','Mantic-an','Matam','Minsuban','Osorio','Panalsalan','Sagayaran','San Apolinario','San Antonio','San Vicente Bajo','San Vicente Alto','Santo Niño','Silanga','Sumirap','Tinacla-an','Villar'
];

const normalizePhoneInput = (raw: string) => raw.replace(/\D/g, '').slice(0, 11);

const splitFullName = (full: string) => {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  const first = parts.shift() || '';
  const last = parts.pop() || '';
  const middle = parts.join(' ');
  return { first, middle, last };
};

export default function ProfileEdit() {
  const { profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [form, setForm] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    phone: '',
    barangay: 'Aquino'
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      const p: any = profile;
      const derived = splitFullName(p.full_name || '');
      setForm({
        first_name: (p.first_name as string) || derived.first || '',
        middle_name: (p.middle_name as string) || derived.middle || '',
        last_name: (p.last_name as string) || derived.last || '',
        phone: p.phone || '',
        barangay: p.barangay || 'Aquino'
      });
    }
  }, [profile]);

  if (!profile) {
    return <div className="p-6 text-center text-sm text-muted-foreground">No profile loaded.</div>;
  }

  const validate = () => {
    if (!form.first_name.trim()) return 'First name required';
    if (!form.last_name.trim()) return 'Last name required';
    if (form.phone && !/^09\d{9}$/.test(form.phone)) return 'Phone must be 11 digits starting with 09';
    return null;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = validate();
    if (v) {
      toast({ title: 'Invalid input', description: v, variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const firstName = form.first_name.trim();
      const middleName = form.middle_name.trim();
      const lastName = form.last_name.trim();
      const fullName = [firstName, middleName, lastName].filter(Boolean).join(' ').trim();

      const { error } = await supabase
        .from('users')
        .update({
          full_name: fullName,
          first_name: firstName,
          middle_name: middleName,
          last_name: lastName,
          phone: form.phone ? form.phone.trim() : null,
          barangay: form.barangay
        })
        .eq('id', profile.id);
      if (error) throw error;
      await refreshProfile();
      toast({ title: 'Profile updated' });
      navigate('/profile');
    } catch (err: any) {
      toast({ title: 'Update failed', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Edit Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name</Label>
                <Input id="first_name" value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name</Label>
                <Input id="last_name" value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="middle_name">Middle Name (optional)</Label>
              <Input id="middle_name" value={form.middle_name} onChange={e => setForm(f => ({ ...f, middle_name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone (optional)</Label>
              <Input
                id="phone"
                inputMode="numeric"
                pattern="09\d{9}"
                maxLength={11}
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: normalizePhoneInput(e.target.value) }))}
                placeholder="09xxxxxxxxx"
              />
              {form.phone && !/^09\d{9}$/.test(form.phone) && (
                <p className="text-xs text-red-600">Use a Philippine mobile number (11 digits starting with 09).</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Barangay</Label>
              <Select value={form.barangay} onValueChange={v => setForm(f => ({ ...f, barangay: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select barangay" />
                </SelectTrigger>
                <SelectContent>
                  {BARANGAYS.map(b => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => navigate('/profile')}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
