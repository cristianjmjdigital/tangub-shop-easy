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
          .select('*, product:products(id,name,price,stock,vendor_id)')
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

  const addItem = useCallback(async (productId: string, quantity = 1, productName?: string) => {
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
      const existing = items.find(i => i.product_id === productId);
      if (existing) {
        const { data, error: updErr } = await supabase
          .from('cart_items')
          .update({ quantity: existing.quantity + quantity })
          .eq('id', existing.id)
          .select('*, product:products(id,name,price,stock,vendor_id)')
          .single();
        if (updErr) throw updErr;
        setItems(prev => prev.map(i => i.id === existing.id ? (data as any) : i));
      } else {
        const { data, error: insErr } = await supabase
          .from('cart_items')
          .insert({ cart_id: current.id, product_id: productId, quantity })
          .select('*, product:products(id,name,price,stock,vendor_id)')
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
        .select('*, product:products(id,name,price,stock,vendor_id)')
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

  // Checkout: create one order per vendor grouping, then order_items, decrement stock, finally clear cart
  const checkout = useCallback(async () => {
    if (!authUser) {
      toast({ title: 'Please login', description: 'Login required to checkout', variant: 'destructive' });
      return { orders: [] };
    }
    if (!items.length) {
      toast({ title: 'Cart empty', description: 'Add items before checkout', variant: 'destructive' });
      return { orders: [] };
    }
    // Optimistic snapshot (outside try for rollback access)
    const snapshotItems = [...items];
    const snapshotCart = cart;
    try {
      setLoading(true);
      // Optimistic clear (UX responsiveness)
      setItems([]);
      // Group items by vendor_id
      const groups: Record<string, CartItemRow[]> = {};
      for (const it of items) {
        const vId = it.product?.vendor_id || 'unknown';
        if (!groups[vId]) groups[vId] = [];
        groups[vId].push(it);
      }
      const createdOrders: any[] = [];
      const userRowId = profile?.id || authUser.id;
      for (const [vendorId, groupItems] of Object.entries(groups)) {
        if (vendorId === 'unknown') continue; // skip items without vendor
        const total = groupItems.reduce((sum, it) => sum + (it.product?.price ?? 0) * it.quantity, 0);
        // Create order
        // Omit status to let DB enum default handle initial value
        const { data: order, error: orderErr } = await supabase
          .from('orders')
          .insert({ user_id: userRowId, vendor_id: vendorId, total })
          .select('*')
          .single();
        if (orderErr) throw orderErr;
        // Create order_items
        // subtotal is likely a generated column (unit_price * quantity); omit from insert
        const orderItemsPayload = groupItems.map(it => ({
          order_id: order.id,
          product_id: it.product_id,
          quantity: it.quantity,
          unit_price: it.product?.price || 0,
        }));
        const { error: oiErr } = await supabase.from('order_items').insert(orderItemsPayload);
        if (oiErr) throw oiErr;
        // Insert system message for vendor conversation (best effort; ignore failure)
        try {
          // Need vendor owner to receive; fetch vendor if unknown
          const { data: vRow } = await supabase.from('vendors').select('id,owner_user_id,store_name').eq('id', vendorId).maybeSingle();
          if (vRow?.owner_user_id) {
            await supabase.from('messages').insert({
              vendor_id: vRow.id,
              sender_user_id: userRowId,
              receiver_user_id: vRow.owner_user_id,
              content: `New order #${order.id} placed. Total ₱${total.toFixed(2)}`
            });
          }
        } catch (msgErr) {
          console.warn('system message insert failed', msgErr);
        }
        // Decrement stock (best-effort, not transactional)
        for (const it of groupItems) {
          if (typeof it.product?.stock === 'number') {
            try {
              const { error: rpcErr } = await supabase.rpc('decrement_product_stock', { p_id: it.product_id, p_qty: it.quantity });
              if (rpcErr) throw rpcErr;
            } catch (_) {
              // Fallback manual update (non-atomic, race-prone)
              await supabase.from('products').update({ stock: (it.product!.stock as number) - it.quantity }).eq('id', it.product_id);
            }
          }
        }
        createdOrders.push(order);
      }
      // Clear cart items after all orders
      await clearCart();
      toast({ title: 'Order placed', description: `${createdOrders.length} order(s) created.` });
      return { orders: createdOrders };
    } catch (e: any) {
      console.error('checkout error', e);
      // Rollback if failure
      if (items.length === 0 && snapshotItems.length) {
        setItems(snapshotItems);
        if (!cart && snapshotCart) setCart(snapshotCart);
      }
      toast({ title: 'Checkout failed', description: e.message || 'Unable to complete order', variant: 'destructive' });
      return { orders: [] };
    } finally {
      setLoading(false);
    }
  }, [authUser, items, clearCart, toast, cart, profile?.id]);

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
