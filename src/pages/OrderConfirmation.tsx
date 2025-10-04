import { useLocation, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Separator } from '@/components/ui/separator';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, ShoppingBag } from 'lucide-react';

interface LocationState {
  orderIds?: string[];
  summary?: { id: string; total: number }[];
}

export default function OrderConfirmation() {
  const location = useLocation();
  const state = (location.state || {}) as LocationState;
  const orderIds = state.orderIds || [];
  const summary = state.summary || [];
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!orderIds.length) return;
      setLoading(true);
      const { data, error } = await supabase
        .from('order_items')
        .select('order_id,quantity,unit_price,product:products(name)')
        .in('order_id', orderIds);
      if (!error && data) setItems(data as any);
      setLoading(false);
    };
    load();
  }, [orderIds]);

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto px-4 py-10 max-w-2xl">
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-col items-center text-center gap-2">
            <CheckCircle2 className="h-12 w-12 text-green-600" />
            <CardTitle className="text-xl">Order Placed Successfully</CardTitle>
            <p className="text-sm text-muted-foreground">Thank you! Your order{orderIds.length > 1 && 's'} have been received.</p>
          </CardHeader>
          <CardContent className="space-y-5">
            {orderIds.length === 0 && (
              <div className="text-sm text-muted-foreground">No order information passed. You may have refreshed this page.</div>
            )}
            {summary.length > 0 && (
              <div className="space-y-3">
                {summary.map(o => (
                  <div key={o.id} className="flex items-center justify-between border rounded-md p-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">#{o.id}</Badge>
                      <span>Order</span>
                    </div>
                    <span className="font-semibold">₱{o.total.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
            {loading && <div className="text-xs text-muted-foreground">Loading items...</div>}
            {!loading && items.length > 0 && (
              <div className="space-y-4">
                {orderIds.map(oid => {
                  const group = items.filter(it => it.order_id === oid);
                  if (!group.length) return null;
                  return (
                    <div key={oid} className="border rounded-md p-3">
                      <div className="text-xs font-medium mb-2">Items in Order #{oid}</div>
                      <div className="space-y-2 text-xs">
                        {group.map((it, idx) => (
                          <div key={idx} className="flex justify-between">
                            <span className="truncate mr-2">{it.product?.name || 'Item'} × {it.quantity}</span>
                            <span>₱{(it.unit_price * it.quantity).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                      <Separator className="my-2" />
                      <div className="flex justify-between text-xs font-semibold">
                        <span>Subtotal</span>
                        <span>₱{group.reduce((s,it)=>s + it.unit_price*it.quantity,0).toLocaleString()}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button asChild className="flex-1"><Link to="/orders"><ShoppingBag className="h-4 w-4 mr-1" /> View My Orders</Link></Button>
              <Button variant="outline" asChild className="flex-1"><Link to="/products">Continue Shopping</Link></Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
