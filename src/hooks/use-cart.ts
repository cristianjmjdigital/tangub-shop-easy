import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';

// Types
export interface CartItemRow {
  id: string;
  cart_id: string;
  product_id: string;
  quantity: number;
  size?: string | null;
  created_at?: string;
  updated_at?: string;
  product?: any; // minimal typing; refine later
}

export interface CartRow {
  id: string;
  user_id: string;
  vendor_id: string | null;
  created_at?: string;
  updated_at?: string;
}

interface UseCartOptions {
  vendorId?: string | null; // optional vendor scope (one vendor per cart design)
  autoCreate?: boolean;
}

interface CheckoutOptions {
  deliveryFee?: number;
  deliveryFeeByVendor?: Record<string, number>;
  deliveryMethod?: 'delivery' | 'pickup';
}

export function useCart(options: UseCartOptions = {}) {
  const { vendorId = null, autoCreate = true } = options;
  const { session, profile } = useAuth();
  const authUser = session?.user;
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [cart, setCart] = useState<CartRow | null>(null);
  const [items, setItems] = useState<CartItemRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadCart = useCallback(async () => {
  if (!authUser) return;
    setLoading(true); setError(null);
    try {
      // For simplicity: single active cart per user (ignore vendor segmentation first)
      const userKey = profile?.id || authUser.id; // carts.user_id likely references users.id (profile)
      const { data: carts, error: cartErr } = await supabase
        .from('carts')
        .select('*')
        .eq('user_id', userKey)
        .limit(1);
      if (cartErr) throw cartErr;
      let current = carts?.[0] || null;

      if (!current && autoCreate) {
        const { data: inserted, error: insertErr } = await supabase
          .from('carts')
          .insert({ user_id: userKey, vendor_id: vendorId ?? null })
          .select('*')
          .single();
        if (insertErr) throw insertErr;
        current = inserted as CartRow;
      }

      setCart(current);

      if (current) {
        const { data: itemRows, error: itemsErr } = await supabase
          .from('cart_items')
          .select('*, product:products(id,name,price,stock,vendor_id,size_options, vendor:vendors(id,store_name,barangay,base_delivery_fee))')
          .eq('cart_id', current.id);
        if (itemsErr) throw itemsErr;
        setItems(itemRows as any);
      } else {
        setItems([]);
      }
    } catch (e: any) {
      console.error('loadCart error', e);
      setError(e.message || 'Failed to load cart');
    } finally {
      setLoading(false);
    }
  }, [authUser, profile?.id, vendorId, autoCreate]);

  useEffect(() => { loadCart(); }, [loadCart]);

  const addItem = useCallback(async (productId: string, quantity = 1, productName?: string, size?: string | null) => {
    if (!authUser) {
      toast({ title: 'Please login', description: 'You must be logged in to add items to cart', variant: 'destructive' });
      return;
    }
    // If profile row not yet materialized, proceed with auth user id to avoid blocking UX.
    try {
      setLoading(true);
      let current = cart;
      if (!current) {
        const userKey = profile?.id || authUser.id;
        const { data: inserted, error: insertErr } = await supabase
          .from('carts')
          .insert({ user_id: userKey, vendor_id: vendorId ?? null })
          .select('*')
          .single();
        if (insertErr) throw insertErr;
        current = inserted as CartRow;
        setCart(current);
      }

      // Upsert or increment existing item
      const existing = items.find(i => i.product_id === productId && (i.size || null) === (size || null));
      if (existing) {
        const { data, error: updErr } = await supabase
          .from('cart_items')
          .update({ quantity: existing.quantity + quantity })
          .eq('id', existing.id)
          .select('*, product:products(id,name,price,stock,vendor_id,size_options, vendor:vendors(id,store_name,barangay,base_delivery_fee))')
          .single();
        if (updErr) throw updErr;
        setItems(prev => prev.map(i => i.id === existing.id ? (data as any) : i));
      } else {
        const { data, error: insErr } = await supabase
          .from('cart_items')
          .insert({ cart_id: current.id, product_id: productId, quantity, size: size || null })
          .select('*, product:products(id,name,price,stock,vendor_id,size_options, vendor:vendors(id,store_name,barangay,base_delivery_fee))')
          .single();
        if (insErr) throw insErr;
        setItems(prev => [...prev, data as any]);
      }
      toast({ title: 'Added to cart', description: productName ? `${productName} x${quantity}` : undefined });
    } catch (e: any) {
      console.error('addItem error', e);
      toast({ title: 'Error', description: e.message ?? 'Failed to add item', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [authUser, profile?.id, cart, items, vendorId, toast]);

  const updateQuantity = useCallback(async (itemId: string, quantity: number) => {
    if (quantity < 1) return removeItem(itemId);
    try {
      setLoading(true);
      const { data, error: updErr } = await supabase
        .from('cart_items')
        .update({ quantity })
        .eq('id', itemId)
        .select('*, product:products(id,name,price,stock,vendor_id, vendor:vendors(id,store_name,barangay,base_delivery_fee))')
        .single();
      if (updErr) throw updErr;
      setItems(prev => prev.map(i => i.id === itemId ? (data as any) : i));
    } catch (e: any) {
      console.error('updateQuantity error', e);
      toast({ title: 'Error', description: e.message ?? 'Failed to update quantity', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const removeItem = useCallback(async (itemId: string) => {
    try {
      setLoading(true);
      const { error: delErr } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', itemId);
      if (delErr) throw delErr;
      setItems(prev => prev.filter(i => i.id !== itemId));
      toast({ title: 'Item removed' });
    } catch (e: any) {
      console.error('removeItem error', e);
      toast({ title: 'Error', description: e.message ?? 'Failed to remove item', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const clearCart = useCallback(async () => {
    if (!cart) return;
    try {
      setLoading(true);
      const { error: delErr } = await supabase
        .from('cart_items')
        .delete()
        .eq('cart_id', cart.id);
      if (delErr) throw delErr;
      setItems([]);
    } catch (e: any) {
      console.error('clearCart error', e);
      toast({ title: 'Error', description: e.message ?? 'Failed to clear cart', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [cart, toast]);

  const subtotal = useMemo(() => items.reduce((sum, i) => sum + (i.product?.price ?? 0) * i.quantity, 0), [items]);

  // Checkout: try RPC to finalize server-side (creates order, copies items, clears cart), fallback to client flow
  const checkout = useCallback(async (options: CheckoutOptions = {}) => {
    if (!authUser) {
      toast({ title: 'Please login', description: 'Login required to checkout', variant: 'destructive' });
      return { orders: [] };
    }
    if (!items.length) {
      toast({ title: 'Cart empty', description: 'Add items before checkout', variant: 'destructive' });
      return { orders: [] };
    }

    const snapshotItems = [...items];
    const snapshotCart = cart;
    const userRowId = profile?.id || authUser.id;
    const normalizedDeliveryFee = Number.isFinite(Number(options.deliveryFee))
      ? Math.max(0, Number(options.deliveryFee))
      : 0;
    const vendorIds = Array.from(
      new Set(
        items
          .map(it => it.product?.vendor_id)
          .filter((v): v is string | number => Boolean(v))
      )
    );
    const deliveryFeeByVendor = options.deliveryFeeByVendor || null;
    const deliveryFeePerOrder = vendorIds.length > 0
      ? normalizedDeliveryFee / vendorIds.length
      : normalizedDeliveryFee;
    const feeForVendor = (vendorId: string | number | null) => {
      const key = vendorId === null ? null : String(vendorId);
      if (key && deliveryFeeByVendor && Object.prototype.hasOwnProperty.call(deliveryFeeByVendor, key)) {
        return Math.max(0, Number(deliveryFeeByVendor[key] ?? 0));
      }
      return deliveryFeePerOrder;
    };
    try {
      setLoading(true);

      // Ensure cart exists
      let currentCart = cart;
      if (!currentCart) {
        await loadCart();
        currentCart = cart;
      }

      // Preferred: server-side finalize (also clears cart_items) when single-vendor cart
      const primaryVendorId = currentCart?.vendor_id ?? vendorIds[0] ?? null;
      if (vendorIds.length <= 1) {
        const { data: orderId, error: rpcErr } = await supabase.rpc('finalize_checkout_bigint', {
          p_user_id: userRowId,
          p_vendor_id: primaryVendorId,
        });

        if (!rpcErr && orderId) {
          let orderRecord: any = { id: orderId };

          // Add delivery fee to the stored total so vendor/customer views stay consistent
          const { data: existing } = await supabase
            .from('orders')
            .select('id,total,total_amount')
            .eq('id', orderId)
            .maybeSingle();
          let baseTotal = Number(existing?.total_amount ?? existing?.total ?? 0);
          if (!Number.isFinite(baseTotal) || baseTotal === 0) {
            // Fallback: derive subtotal from order_items when RPC/table didn't populate total_amount
            const { data: itemAgg } = await supabase
              .from('order_items')
              .select('quantity,unit_price')
              .eq('order_id', orderId);
            if (itemAgg && itemAgg.length > 0) {
              baseTotal = itemAgg.reduce((sum: number, it: any) => sum + Number(it.unit_price || 0) * Number(it.quantity || 0), 0);
            }
          }
          const fee = feeForVendor(primaryVendorId);
          const updatedTotal = baseTotal + fee;

          if (fee > 0) {
            try {
              const { data: updated } = await supabase
                .from('orders')
                .update({ total: updatedTotal, total_amount: baseTotal, delivery_method: options.deliveryMethod })
                .eq('id', orderId)
                .select('*')
                .maybeSingle();
              orderRecord = updated || { ...existing, id: orderId, total: updatedTotal, total_amount: baseTotal };
            } catch (_) {
              // fallback without delivery_method column
              const { data: updated } = await supabase
                .from('orders')
                .update({ total: updatedTotal, total_amount: baseTotal })
                .eq('id', orderId)
                .select('*')
                .maybeSingle();
              orderRecord = updated || { ...existing, id: orderId, total: updatedTotal, total_amount: baseTotal };
            }
          } else {
            // Still persist delivery_method if provided
            if (options.deliveryMethod) {
              try { await supabase.from('orders').update({ delivery_method: options.deliveryMethod }).eq('id', orderId); } catch (_) {}
            }
            orderRecord = existing || { id: orderId, total: baseTotal, total_amount: baseTotal };
          }

          // Best effort refetch cart to update UI
          setItems([]);
          await loadCart();
          toast({ title: 'Order placed', description: 'Checkout completed.' });
          return { orders: [{ ...orderRecord, total: orderRecord.total ?? updatedTotal ?? baseTotal, total_amount: orderRecord.total_amount ?? baseTotal, delivery_method: options.deliveryMethod }] };
        }
      }

      // Fallback to client-side flow per vendor grouping
      const groups: Record<string, CartItemRow[]> = {};
      for (const it of items) {
        const vId = it.product?.vendor_id || 'unknown';
        if (!groups[vId]) groups[vId] = [];
        groups[vId].push(it);
      }

      const createdOrders: any[] = [];
      setItems([]);

      for (const [vendorId, groupItems] of Object.entries(groups)) {
        if (vendorId === 'unknown') continue;
        const itemsTotal = groupItems.reduce((sum, it) => sum + (it.product?.price ?? 0) * it.quantity, 0);
        const vendorFee = feeForVendor(vendorId);
        const total = itemsTotal + vendorFee;
        let order: any;
        try {
          const { data: inserted, error: orderErr } = await supabase
            .from('orders')
            .insert({ user_id: userRowId, vendor_id: vendorId, total, total_amount: itemsTotal, delivery_method: options.deliveryMethod })
            .select('*')
            .single();
          if (orderErr) throw orderErr;
          order = inserted;
        } catch (e) {
          // Retry without delivery_method if column missing
          const { data: inserted, error: orderErr } = await supabase
            .from('orders')
            .insert({ user_id: userRowId, vendor_id: vendorId, total, total_amount: itemsTotal })
            .select('*')
            .single();
          if (orderErr) throw orderErr;
          order = inserted;
        }

        const orderItemsPayload = groupItems.map(it => ({
          order_id: order.id,
          product_id: it.product_id,
          quantity: it.quantity,
          unit_price: it.product?.price || 0,
          size: it.size || null,
        }));
        const { error: oiErr } = await supabase.from('order_items').insert(orderItemsPayload);
        if (oiErr) throw oiErr;

        // Decrement stock (best-effort)
        for (const it of groupItems) {
          if (typeof it.product?.stock === 'number') {
            try {
              const { error: rpcDecErr } = await supabase.rpc('decrement_product_stock', { p_id: it.product_id, p_qty: it.quantity });
              if (rpcDecErr) throw rpcDecErr;
            } catch (_) {
              await supabase.from('products').update({ stock: (it.product!.stock as number) - it.quantity }).eq('id', it.product_id);
            }
          }
        }
        createdOrders.push(order);
      }

      await clearCart();
      toast({ title: 'Order placed', description: `${createdOrders.length} order(s) created.` });
      return { orders: createdOrders };
    } catch (e: any) {
      console.error('checkout error', e);
      if (items.length === 0 && snapshotItems.length) {
        setItems(snapshotItems);
        if (!cart && snapshotCart) setCart(snapshotCart);
      }
      toast({ title: 'Checkout failed', description: e.message || 'Unable to complete order', variant: 'destructive' });
      return { orders: [] };
    } finally {
      setLoading(false);
    }
  }, [authUser, items, clearCart, toast, cart, profile?.id, loadCart]);

  return {
    loading,
    error,
    cart,
    items,
    subtotal,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    reload: loadCart,
    checkout,
  };
}
