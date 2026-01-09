import { useEffect, useState, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { ShoppingBag, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { StatusTimeline } from '@/components/ui/status-timeline';
import { useNotifications } from '@/hooks/use-notifications';
import { usePushSubscription } from '@/hooks/use-push-subscription';

interface OrderRow { id: string; vendor_id: string; total: number; status: string; created_at: string; delivery_method?: string }
interface OrderItemRow { id: string; order_id: string; product_id: string; quantity: number; unit_price: number; subtotal: number; product?: { name: string; price: number } }
interface VendorRow { id: string; store_name: string }

export default function Orders() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const { isSupported: pushSupported, permission: pushPermission, requestPermission, notify } = useNotifications();
  const { isSupported: pushCapable, ensureSubscription, syncIfGranted, status: pushStatus, lastError: pushError } = usePushSubscription(profile?.id);
  const [notifDismissed, setNotifDismissed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [items, setItems] = useState<OrderItemRow[]>([]);
  const [vendors, setVendors] = useState<Record<string, VendorRow>>({});
  const [error, setError] = useState<string | null>(null);

  const canCancel = (status?: string) => {
    const norm = (status || '').toLowerCase();
    return norm === 'pending' || norm === 'new' || norm === 'created';
  };

  const cancelOrder = async (orderId: string) => {
    if (!profile?.id) return;
    const current = orders.find(o => o.id === orderId);
    if (!current || !canCancel(current.status)) {
      toast({ title: 'Cannot cancel', description: 'Only pending orders can be cancelled.', variant: 'destructive' });
      return;
    }
    const confirmed = window.confirm('Cancel this order? This cannot be undone.');
    if (!confirmed) return;
    setCancellingId(orderId);
    try {
      const { data, error: updErr } = await supabase
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('user_id', profile.id)
        .eq('id', orderId)
        .in('status', ['pending', 'new', 'created'])
        .select('id,status')
        .maybeSingle();

      if (updErr) throw updErr;
      if (!data) throw new Error('Order was not updated. It may have already been processed.');

      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'cancelled' } : o));
      toast({ title: 'Order cancelled', description: `Order #${orderId} has been cancelled.` });
    } catch (e: any) {
      toast({ title: 'Cancel failed', description: e.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setCancellingId(null);
    }
  };

  const load = async () => {
  if (!profile?.id) return;
    setLoading(true); setError(null);
    try {
      const { data: orderRows, error: oErr } = await supabase
        .from('orders')
        .select('*')
  .eq('user_id', profile.id)
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
            .select('id,store_name')
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

  useEffect(() => { load(); }, [profile?.id]);

  useEffect(() => { syncIfGranted(); }, [syncIfGranted]);

  // Realtime updates for order status changes belonging to this user
  useEffect(() => {
    if (!profile?.id) return;
    const statusRef = new Map<string, string>();
    orders.forEach(o => statusRef.set(o.id, o.status));
    const channel = supabase
      .channel('orders-user-' + profile.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `user_id=eq.${profile.id}` }, (payload: any) => {
        setOrders(prev => {
          const next = [...prev];
          const idx = next.findIndex(o => o.id === payload.new.id);
          const prevStatus = statusRef.get(payload.new.id);
          const newStatus = payload.new.status;
          if (idx >= 0) next[idx] = payload.new as any; else next.unshift(payload.new as any);

          // Notify on meaningful status transitions
          if (payload.eventType === 'UPDATE' && prevStatus && prevStatus !== newStatus) {
            const normalized = (newStatus || '').toLowerCase();
            let message: string | null = null;
            if (normalized === 'preparing' || normalized === 'confirmed') message = 'Your order has been confirmed.';
            if (normalized === 'for_delivery' || normalized === 'ready' || normalized === 'completed' || normalized === 'delivered') message = 'Your order is ready / completed.';
            if (message) {
              const body = `Order #${payload.new.id}: ${message}`;
              const pushed = notify('Order status updated', { body });
              if (!pushed) {
                toast({ title: 'Order status updated', description: body });
              }
            }
          }
          statusRef.set(payload.new.id, newStatus);
          return next;
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile?.id, toast]);

  const grouped = useMemo(() => orders.map(o => ({
    order: o,
    vendor: vendors[o.vendor_id],
    items: items.filter(it => it.order_id === o.id),
  })), [orders, vendors, items]);

  const totalsFor = (g: { order: OrderRow; items: OrderItemRow[] }) => {
    const subtotal = g.items.reduce((acc, it) => acc + (it.subtotal || 0), 0);
    const storedTotal = typeof g.order.total === 'number' ? g.order.total : g.order.total_amount;
    // Ensure we show grand total (items + any delivery fee) and never just the fee
    const grandTotal = storedTotal && storedTotal > subtotal ? storedTotal : subtotal;
    return { subtotal, grandTotal };
  };

  const statusBadge = (status: string) => {
    const base = 'text-xs capitalize';
    switch (status) {
      case 'new':
      case 'created':
        return <Badge variant="secondary" className={base}>New</Badge>;
      case 'pending':
        return <Badge variant="outline" className={base}>Pending</Badge>;
      case 'preparing':
        return <Badge className={base + ' bg-amber-500 hover:bg-amber-500'}>Preparing</Badge>;
      case 'completed':
      case 'ready':
        return <Badge className={base + ' bg-green-600 hover:bg-green-600'}>Completed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive" className={base}>Cancelled</Badge>;
      default:
        return <Badge variant="outline" className={base}>{status}</Badge>;
    }
  };

  if (!profile) {
    return <div className='p-6 text-sm text-muted-foreground'>Login to view your orders.</div>;
  }

  return (
    <div className='min-h-screen bg-gradient-subtle'>
      <div className='container mx-auto px-4 py-6'>
        <div className='flex items-center justify-between mb-6'>
          <h1 className='text-2xl font-bold flex items-center gap-2'><ShoppingBag className='h-6 w-6' /> My Orders</h1>
          <div className='flex items-center gap-2'>
            <Button variant='outline' size='sm' asChild>
              <Link to='/ratings'>Ratings & Reviews</Link>
            </Button>
            <Button variant='outline' size='sm' onClick={load} disabled={loading}><RefreshCw className='h-4 w-4 mr-1 animate-spin' style={{ animationPlayState: loading ? 'running':'paused' }} /> Refresh</Button>
          </div>
        </div>
          <div className='mb-4 border rounded-md p-3 bg-muted/40 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
            <div className='text-sm text-muted-foreground'>Enable browser notifications to get instant updates when your order status changes.</div>
            <div className='flex gap-2'>
              <Button size='sm' variant='default' onClick={async () => {
                const res = await ensureSubscription({ prompt: true });
                if (!res.ok) {
                  const fallback = await requestPermission();
                  if (fallback) {
                    await ensureSubscription({ prompt: false });
                    toast({ title: 'Notifications on', description: 'You will receive order status updates.' });
                  } else {
                    toast({ title: 'Notifications blocked', description: 'Enable notifications in your browser settings to get updates.', variant: 'destructive' });
                  }
                } else {
                  toast({ title: 'Notifications on', description: 'You will receive order status updates.' });
                }
              }}>Enable</Button>
              <Button size='sm' variant='outline' onClick={() => setNotifDismissed(true)}>Dismiss</Button>
            </div>
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
                  <div className='flex items-center gap-2'>
                    {canCancel(g.order.status) && (
                      <Button
                        variant='destructive'
                        size='sm'
                        onClick={() => cancelOrder(g.order.id)}
                        disabled={cancellingId === g.order.id || loading}
                      >
                        {cancellingId === g.order.id ? 'Cancelling...' : 'Cancel order'}
                      </Button>
                    )}
                    {statusBadge(g.order.status)}
                  </div>
                </div>
                <div className='text-xs text-muted-foreground'>Vendor: {g.vendor?.store_name || g.order.vendor_id}</div>
                <div className='text-xs text-muted-foreground'>Placed {formatDistanceToNow(new Date(g.order.created_at), { addSuffix: true })}</div>
              </CardHeader>
              <CardContent className='p-4 pt-0 space-y-3'>
                <div className='py-2'>
                  <StatusTimeline status={g.order.status} mode={g.order.delivery_method === 'pickup' ? 'pickup' : 'delivery'} />
                </div>
                {g.items.map(it => (
                  <div key={it.id} className='flex items-center justify-between text-sm border rounded-md p-3'>
                    <div>
                      <div className='font-medium'>{it.product?.name || it.product_id}</div>
                      <div className='text-xs text-muted-foreground'>Qty {it.quantity} × ₱{(it.unit_price).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}</div>
                    </div>
                    <div className='font-semibold'>₱{it.subtotal.toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}</div>
                  </div>
                ))}
                <Separator />
                <div className='flex items-center justify-between text-sm'>
                  <span>Total</span>
                  {(() => {
                    const { grandTotal } = totalsFor(g);
                    return <span className='font-bold text-primary'>₱{grandTotal.toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}</span>;
                  })()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
