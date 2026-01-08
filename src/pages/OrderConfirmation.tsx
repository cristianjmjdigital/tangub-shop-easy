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
  summary?: { id: string; total: number; total_amount?: number }[];
}

export default function OrderConfirmation() {
  const location = useLocation();
  const state = (location.state || {}) as LocationState;
  const orderIds = state.orderIds || [];
  const summary = state.summary || [];
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [orderMeta, setOrderMeta] = useState<Record<string, { total: number; subtotal: number }>>({});

  useEffect(() => {
    const load = async () => {
      if (!orderIds.length) return;
      setLoading(true);
      const [{ data, error }, { data: ordersData }] = await Promise.all([
        supabase
          .from('order_items')
          .select('order_id,quantity,unit_price,product:products(name)')
          .in('order_id', orderIds),
        supabase
          .from('orders')
          .select('id,total,total_amount')
          .in('id', orderIds),
      ]);
      if (!error && data) setItems(data as any);
      if (ordersData) {
        const meta: Record<string, { total: number; subtotal: number }> = {};
        ordersData.forEach((o: any) => {
          const subtotalVal = Number(o.total_amount ?? 0);
          meta[String(o.id)] = {
            total: Number(o.total ?? o.total_amount ?? 0),
            subtotal: subtotalVal,
          };
        });
        // Fallback: if DB totals are missing delivery fee, prefer totals passed via navigation state
        summary.forEach(s => {
          const key = String(s.id);
          const summaryTotal = Number((s as any).total ?? 0);
          const summarySubtotal = Number((s as any).total_amount ?? 0);
          if (!meta[key]) {
            meta[key] = { total: summaryTotal, subtotal: summarySubtotal }; // may be 0; better than missing
            return;
          }
          if (summaryTotal && (!meta[key].total || meta[key].total === meta[key].subtotal)) {
            meta[key].total = summaryTotal;
          }
          if (summarySubtotal && !meta[key].subtotal) {
            meta[key].subtotal = summarySubtotal;
          }
        });
        setOrderMeta(meta);
      }
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
                {summary.map(o => {
                  const fallbackTotal = Number((o as any).total ?? (o as any).total_amount ?? 0);
                  const meta = orderMeta[String(o.id)];
                  const totalNumber = meta?.total ?? fallbackTotal;
                  return (
                    <div key={o.id} className="flex items-center justify-between border rounded-md p-3 text-sm">
                      <div className="flex items-center gap-2">
                        <span>Order</span>
                        <Badge variant="outline">#{o.id}</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {loading && <div className="text-xs text-muted-foreground">Loading items...</div>}
            {!loading && items.length > 0 && (
              <div className="space-y-4">
                {orderIds.map(oid => {
                  const group = items.filter(it => it.order_id === oid);
                  if (!group.length) return null;
                  const groupSubtotal = group.reduce((s,it)=>s + it.unit_price*it.quantity,0);
                  const meta = orderMeta[String(oid)] || { total: groupSubtotal, subtotal: groupSubtotal };
                  const subtotal = meta.subtotal || groupSubtotal;
                  const deliveryFeeRaw = (meta.total || 0) - subtotal;
                  // If DB total is missing fee, try summary totals; otherwise fallback to computed subtotal
                  const deliveryFee = deliveryFeeRaw > 0
                    ? deliveryFeeRaw
                    : Math.max(0, (meta.total || groupSubtotal) - subtotal);
                  return (
                    <div key={oid} className="border rounded-md p-3">
                      <div className="text-xs font-medium mb-2">Items in Order #{oid}</div>
                      <div className="space-y-2 text-xs">
                        {group.map((it, idx) => (
                          <div key={idx} className="flex justify-between">
                            <span className="truncate mr-2">{it.product?.name || 'Item'} × {it.quantity}</span>
                            <span>₱{(it.unit_price * it.quantity).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}</span>
                          </div>
                        ))}
                      </div>
                      <Separator className="my-2" />
                      <div className="space-y-1 text-xs font-semibold">
                        <div className="flex justify-between">
                          <span>Subtotal</span>
                          <span>₱{groupSubtotal.toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}</span>
                        </div>
                        {deliveryFee === 0 ? (
                          <div className="flex justify-between">
                          <span>Delivery Method</span>
                          <span>Pick-up</span>
                          </div>
                        ) : (
                          <>
                          <div className="flex justify-between">
                            <span>Delivery Method</span>
                            <span>Delivery</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Delivery Fee</span>
                            <span>₱{deliveryFee.toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}</span>
                          </div>
                          </>
                        )}
                        <Separator className="my-2" />
                        <div className="flex justify-between text-[13px]">
                          <span>Grand Total</span>
                          <span>₱{(groupSubtotal + deliveryFee).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}</span>
                        </div>
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
