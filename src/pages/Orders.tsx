import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { ShoppingBag, RefreshCw } from 'lucide-react';

interface OrderRow { id: string; vendor_id: string; total: number; status: string; created_at: string }
interface OrderItemRow { id: string; order_id: string; product_id: string; quantity: number; unit_price: number; subtotal: number; product?: { name: string; price: number } }
interface VendorRow { id: string; name: string }

export default function Orders() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [items, setItems] = useState<OrderItemRow[]>([]);
  const [vendors, setVendors] = useState<Record<string, VendorRow>>({});
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!profile?.auth_user_id) return;
    setLoading(true); setError(null);
    try {
      const { data: orderRows, error: oErr } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', profile.auth_user_id)
        .order('created_at', { ascending: false });
      if (oErr) throw oErr;
      setOrders(orderRows as OrderRow[]);
      if (orderRows?.length) {
        const orderIds = orderRows.map(o => o.id);
        const { data: itemRows, error: iErr } = await supabase
          .from('order_items')
          .select('*, product:products(name,price)')
          .in('order_id', orderIds);
        if (iErr) throw iErr;
        setItems(itemRows as any);
        const vendorIds = Array.from(new Set(orderRows.map(o => o.vendor_id)));
        if (vendorIds.length) {
          const { data: vRows } = await supabase
            .from('vendors')
            .select('id,name')
            .in('id', vendorIds);
          const map: Record<string, VendorRow> = {};
            (vRows || []).forEach(v => { map[v.id] = v as VendorRow; });
          setVendors(map);
        }
      } else {
        setItems([]);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [profile?.auth_user_id]);

  const grouped = useMemo(() => orders.map(o => ({
    order: o,
    vendor: vendors[o.vendor_id],
    items: items.filter(it => it.order_id === o.id),
  })), [orders, vendors, items]);

  if (!profile) {
    return <div className='p-6 text-sm text-muted-foreground'>Login to view your orders.</div>;
  }

  return (
    <div className='min-h-screen bg-gradient-subtle'>
      <div className='container mx-auto px-4 py-6'>
        <div className='flex items-center justify-between mb-6'>
          <h1 className='text-2xl font-bold flex items-center gap-2'><ShoppingBag className='h-6 w-6' /> My Orders</h1>
          <Button variant='outline' size='sm' onClick={load} disabled={loading}><RefreshCw className='h-4 w-4 mr-1 animate-spin' style={{ animationPlayState: loading ? 'running':'paused' }} /> Refresh</Button>
        </div>
        {error && <div className='p-3 border border-destructive/40 rounded text-destructive bg-destructive/5 text-sm mb-4'>{error}</div>}
        {loading && <div className='text-sm text-muted-foreground py-8'>Loading orders...</div>}
        {!loading && grouped.length === 0 && <div className='text-sm text-muted-foreground py-12 text-center'>No orders yet.</div>}
        <div className='space-y-5'>
          {grouped.map(g => (
            <Card key={g.order.id} className='overflow-hidden'>
              <CardHeader className='p-4 flex flex-col gap-1'>
                <div className='flex items-center justify-between'>
                  <CardTitle className='text-base'>Order #{g.order.id}</CardTitle>
                  <Badge variant={g.order.status === 'pending' ? 'secondary' : 'default'} className='text-xs capitalize'>{g.order.status}</Badge>
                </div>
                <div className='text-xs text-muted-foreground'>Vendor: {g.vendor?.name || g.order.vendor_id}</div>
                <div className='text-xs text-muted-foreground'>Placed: {new Date(g.order.created_at).toLocaleString()}</div>
              </CardHeader>
              <CardContent className='p-4 pt-0 space-y-3'>
                {g.items.map(it => (
                  <div key={it.id} className='flex items-center justify-between text-sm border rounded-md p-3'>
                    <div>
                      <div className='font-medium'>{it.product?.name || it.product_id}</div>
                      <div className='text-xs text-muted-foreground'>Qty {it.quantity} × ₱{(it.unit_price).toLocaleString()}</div>
                    </div>
                    <div className='font-semibold'>₱{it.subtotal.toLocaleString()}</div>
                  </div>
                ))}
                <Separator />
                <div className='flex items-center justify-between text-sm'>
                  <span>Total</span>
                  <span className='font-bold text-primary'>₱{g.order.total.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
