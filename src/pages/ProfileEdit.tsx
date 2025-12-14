import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';

const BARANGAYS = [
  'Aquino','Balat-ok','Bintana','Bourbon','Caniangan','Capalaran','Catagan','Cawit','Dimalco','Dimalooc','Guiling','Hoyohoy','Imelda','Kauswagan','Lorenzo Tan','Maquilao','Mantic-an','Matam','Minsuban','Osorio','Panalsalan','Sagayaran','San Apolinario','San Antonio','San Vicente Bajo','San Vicente Alto','Santo Niño','Silanga','Sumirap','Tinacla-an','Villar'
];

export default function ProfileEdit(){
  const { profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    barangay: 'Aquino'
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        barangay: profile.barangay || 'Aquino'
      });
    }
  }, [profile]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          full_name: form.full_name.trim(),
          phone: form.phone.trim() || null,
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
          phone: profile.phone || '',

  if (!profile) {
    return <div className='p-6 text-center text-sm text-muted-foreground'>No profile loaded.</div>;
  }

  return (
    <div className='max-w-lg mx-auto p-4'>
      <Card>
        <CardHeader>
          <CardTitle>Edit Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className='space-y-4'>
            phone: form.phone.trim() ? form.phone : null,
              <Label htmlFor='full_name'>Full Name</Label>
              <Input id='full_name' value={form.full_name} onChange={e=>setForm(f=>({...f, full_name:e.target.value}))} />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='phone'>Phone</Label>
              <Input id='phone' value={form.phone} onChange={e=>setForm(f=>({...f, phone:e.target.value}))} placeholder='09xx-xxx-xxxx' />
            </div>
            <div className='space-y-2'>
              <Label>Barangay</Label>
              <Select value={form.barangay} onValueChange={v=>setForm(f=>({...f, barangay:v}))}>
                <SelectTrigger>
                  <SelectValue placeholder='Select barangay' />
                </SelectTrigger>
                              <Input
                                id='phone'
                                inputMode='numeric'
                                pattern='09\d{9}'
                                maxLength={11}
                                value={form.phone}
                                onChange={e=>{
                                  const digits = e.target.value.replace(/\D/g,'').slice(0,11);
                                  setForm(f=>({...f, phone: digits}));
                                }}
                                placeholder='09xxxxxxxxx'
                              />
                <SelectContent>
                  {BARANGAYS.map(b=> <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className='flex justify-end gap-2'>
              <Button type='button' variant='outline' onClick={()=>navigate('/profile')}>Cancel</Button>
              <Button type='submit' disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
