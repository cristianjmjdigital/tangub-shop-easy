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
  selectedItemIds?: string[];
}

interface StockAdjustment {
  productId: string;
  size?: string | null;
  quantity: number;
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

  // Adjust product stock. Negative delta reserves/deducts stock, positive delta returns stock. Supports size-level stock when available.
  const adjustProductStock = useCallback(async (productId: string, delta: number, size?: string | null) => {
    if (!delta) return;

    const { data: productRow, error: fetchErr } = await supabase
      .from('products')
      .select('stock,size_stock')
      .eq('id', productId)
      .single();
    if (fetchErr) throw fetchErr;

    const currentStock = Number(productRow?.stock ?? 0);
    const sizeStockMap: Record<string, number> = (productRow?.size_stock && typeof productRow.size_stock === 'object') ? (productRow.size_stock as Record<string, number>) : {};
    const hasSizeStock = Object.keys(sizeStockMap).length > 0;

    if (hasSizeStock) {
      if (!size) throw new Error('Size selection required to adjust stock.');
      const currentSizeStockRaw = Number(sizeStockMap[size] ?? 0);
      const currentSizeStock = Number.isFinite(currentSizeStockRaw) ? currentSizeStockRaw : 0;
      const nextSizeStockRaw = currentSizeStock + delta;
      const nextSizeStock = Number.isFinite(nextSizeStockRaw) ? nextSizeStockRaw : 0;
      if (nextSizeStock < 0) throw new Error('Not enough stock for this size.');

      const updatedMap = { ...sizeStockMap, [size]: Math.max(0, nextSizeStock) };
      const nextTotal = Object.values(updatedMap).reduce((sum, v) => sum + (Number.isFinite(v) ? Number(v) : 0), 0);

      const { error: updErr } = await supabase
        .from('products')
        .update({ size_stock: updatedMap, stock: nextTotal })
        .eq('id', productId);
      if (updErr) throw updErr;
      return;
    }

    const nextStock = currentStock + delta;
    if (nextStock < 0) throw new Error('Not enough stock for this product.');

    const { error: updErr } = await supabase
      .from('products')
      .update({ stock: Math.max(0, nextStock) })
      .eq('id', productId);
    if (updErr) throw updErr;
  }, []);

  const releaseStockAdjustments = useCallback(async (applied: StockAdjustment[]) => {
    if (!applied.length) return;
    const reversed = [...applied].reverse();
    for (const adj of reversed) {
      try {
        await adjustProductStock(adj.productId, adj.quantity, adj.size);
      } catch (e) {
        console.error('rollback stock failed', e);
      }
    }
  }, [adjustProductStock]);

  const reserveStockForItems = useCallback(async (cartItems: CartItemRow[]) => {
    const applied: StockAdjustment[] = [];
    try {
      for (const it of cartItems) {
        await adjustProductStock(it.product_id, -it.quantity, it.size);
        applied.push({ productId: it.product_id, size: it.size, quantity: it.quantity });
      }
      return applied;
    } catch (err) {
      await releaseStockAdjustments(applied);
      throw err;
    }
  }, [adjustProductStock, releaseStockAdjustments]);

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
          .select('*, product:products(id,name,price,stock,main_image_url,vendor_id,size_options,size_stock, vendor:vendors(id,store_name,barangay,base_delivery_fee))')
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

      const { data: productRow, error: productErr } = await supabase
        .from('products')
        .select('id,name,stock,size_options,size_stock')
        .eq('id', productId)
        .single();
      if (productErr || !productRow) throw productErr || new Error('Product not found');

      const sizeOptions: string[] = Array.isArray(productRow.size_options) ? (productRow.size_options as string[]) : [];
      const sizeStockMap: Record<string, number> = (productRow as any).size_stock && typeof (productRow as any).size_stock === 'object' ? (productRow as any).size_stock as Record<string, number> : {};
      const hasSizeStock = Object.keys(sizeStockMap).length > 0;
      const selectedSizeStock = size ? Number(sizeStockMap[size] ?? 0) : null;
      const availableStock = (hasSizeStock && size) ? selectedSizeStock : Number(productRow.stock ?? 0);
      if (sizeOptions.length && !size) {
        throw new Error('Select a size to add this item.');
      }
      if (size && sizeOptions.length && !sizeOptions.includes(size)) {
        throw new Error('Selected size is not available for this product.');
      }
      if (!Number.isFinite(availableStock) || availableStock <= 0) {
        throw new Error('Product is out of stock.');
      }

      // Upsert or increment existing item
      const existing = items.find(i => i.product_id === productId && (i.size || null) === (size || null));
      const desiredQty = (existing?.quantity || 0) + quantity;
      if (desiredQty > (Number.isFinite(availableStock) ? Number(availableStock) : 0)) {
        throw new Error(`Only ${availableStock ?? 0} in stock for this selection.`);
      }
      if (existing) {
        const { data, error: updErr } = await supabase
          .from('cart_items')
          .update({ quantity: existing.quantity + quantity })
          .eq('id', existing.id)
          .select('*, product:products(id,name,price,stock,main_image_url,vendor_id,size_options,size_stock, vendor:vendors(id,store_name,barangay,base_delivery_fee))')
          .single();
        if (updErr) throw updErr;
        setItems(prev => prev.map(i => i.id === existing.id ? (data as any) : i));
      } else {
        const { data, error: insErr } = await supabase
          .from('cart_items')
          .insert({ cart_id: current.id, product_id: productId, quantity, size: size || null })
          .select('*, product:products(id,name,price,stock,main_image_url,vendor_id,size_options,size_stock, vendor:vendors(id,store_name,barangay,base_delivery_fee))')
          .single();
        if (insErr) throw insErr;
        setItems(prev => [...prev, data as any]);
      }
      toast({ title: 'Added to cart', description: productName ? `${productName || productRow.name} x${quantity}` : undefined });
    } catch (e: any) {
      console.error('addItem error', e);
      toast({ title: 'Error', description: e.message ?? 'Failed to add item', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [authUser, profile?.id, cart, items, vendorId, toast]);

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
  }, [toast, items]);

  const updateQuantity = useCallback(async (itemId: string, quantity: number) => {
    if (quantity < 1) return removeItem(itemId);
    try {
      const target = items.find(i => i.id === itemId);
      if (!target) throw new Error('Cart item not found');

      // Get the freshest stock for the product
      const { data: productRow, error: productErr } = await supabase
        .from('products')
        .select('stock,size_stock')
        .eq('id', target.product_id)
        .single();
      if (productErr) throw productErr;

      const sizeStockMap: Record<string, number> = productRow?.size_stock && typeof productRow.size_stock === 'object' ? productRow.size_stock as Record<string, number> : {};
      const hasSizeStock = Object.keys(sizeStockMap).length > 0;
      const availableStock = hasSizeStock && target.size ? Number(sizeStockMap[target.size] ?? 0) : Number(productRow?.stock ?? 0);
      if (quantity > (Number.isFinite(availableStock) ? Number(availableStock) : 0)) {
        toast({ title: 'Limited stock', description: `Only ${availableStock} left for this item.` });
        return;
      }

      setLoading(true);
      const { data, error: updErr } = await supabase
        .from('cart_items')
        .update({ quantity })
        .eq('id', itemId)
        .select('*, product:products(id,name,price,stock,main_image_url,vendor_id,size_options,size_stock, vendor:vendors(id,store_name,barangay,base_delivery_fee))')
        .single();
      if (updErr) throw updErr;
      setItems(prev => prev.map(i => i.id === itemId ? (data as any) : i));
    } catch (e: any) {
      console.error('updateQuantity error', e);
      toast({ title: 'Error', description: e.message ?? 'Failed to update quantity', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast, removeItem, items]);

  const clearCart = useCallback(async (_options: { restock?: boolean } = {}) => {
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

    const selectedIds = Array.isArray(options.selectedItemIds)
      ? options.selectedItemIds.filter((id): id is string => Boolean(id))
      : [];
    const targetItems = selectedIds.length ? items.filter(i => selectedIds.includes(i.id)) : items;
    if (!targetItems.length) {
      toast({ title: 'No items selected', description: 'Choose at least one item to checkout.', variant: 'destructive' });
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
        targetItems
          .map(it => it.product?.vendor_id)
          .filter((v): v is string | number => Boolean(v))
      )
    );
    const selectionCoversAll = targetItems.length === items.length;
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
    let reservedAdjustments: StockAdjustment[] = [];
    const adjustmentKey = (productId: string, size?: string | null) => `${productId}::${size ?? ''}`;
    const fulfilledKeys = new Set<string>();
    try {
      setLoading(true);

      // Ensure cart exists
      let currentCart = cart;
      if (!currentCart) {
        await loadCart();
        currentCart = cart;
      }

      // Reserve/deduct stock right before creating orders to reflect actual purchases
      reservedAdjustments = await reserveStockForItems(targetItems);

      // Preferred: server-side finalize (also clears cart_items) when single-vendor cart
      const primaryVendorId = currentCart?.vendor_id ?? vendorIds[0] ?? null;
      if (vendorIds.length <= 1 && selectionCoversAll) {
        const { data: orderId, error: rpcErr } = await supabase.rpc('finalize_checkout_bigint', {
          p_user_id: userRowId,
          p_vendor_id: primaryVendorId,
        });

        if (!rpcErr && orderId) {
          let orderRecord: any = { id: orderId };
          targetItems.forEach(it => fulfilledKeys.add(adjustmentKey(it.product_id, it.size || null)));

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
          const existingTotal = Number(existing?.total ?? 0);
          const existingTotalAmount = Number(existing?.total_amount ?? 0);
          const totalsMismatch = !existing || existingTotal !== updatedTotal || existingTotalAmount !== baseTotal;
          const needsDeliveryMethodUpdate = Boolean(options.deliveryMethod && existing?.delivery_method !== options.deliveryMethod);
          const shouldUpdate = totalsMismatch || needsDeliveryMethodUpdate;
          const basePayload: Record<string, any> = {
            total: updatedTotal,
            total_amount: baseTotal,
          };
          if (options.deliveryMethod) {
            basePayload.delivery_method = options.deliveryMethod;
          }

          if (shouldUpdate) {
            try {
              const { data: updated } = await supabase
                .from('orders')
                .update(basePayload)
                .eq('id', orderId)
                .select('*')
                .maybeSingle();
              orderRecord = updated || { ...existing, id: orderId, total: updatedTotal, total_amount: baseTotal, delivery_method: options.deliveryMethod ?? existing?.delivery_method };
            } catch (_) {
              const fallbackPayload = { total: updatedTotal, total_amount: baseTotal };
              const { data: updated } = await supabase
                .from('orders')
                .update(fallbackPayload)
                .eq('id', orderId)
                .select('*')
                .maybeSingle();
              orderRecord = updated || { ...existing, id: orderId, total: updatedTotal, total_amount: baseTotal, delivery_method: existing?.delivery_method };
            }
          } else {
            orderRecord = existing || { id: orderId, total: updatedTotal, total_amount: baseTotal, delivery_method: options.deliveryMethod };
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
      for (const it of targetItems) {
        const vId = it.product?.vendor_id || 'unknown';
        if (!groups[vId]) groups[vId] = [];
        groups[vId].push(it);
      }

      const createdOrders: any[] = [];
      const processedCartItemIds: string[] = [];

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

        createdOrders.push(order);
        processedCartItemIds.push(...groupItems.map(it => it.id));
        groupItems.forEach(it => fulfilledKeys.add(adjustmentKey(it.product_id, it.size || null)));
      }

      if (processedCartItemIds.length) {
        await supabase
          .from('cart_items')
          .delete()
          .in('id', processedCartItemIds);
        setItems(prev => prev.filter(i => !processedCartItemIds.includes(i.id)));
      }

      toast({ title: 'Order placed', description: `${createdOrders.length} order(s) created.` });
      return { orders: createdOrders };
    } catch (e: any) {
      console.error('checkout error', e);
      if (reservedAdjustments.length) {
        const pending = reservedAdjustments.filter(adj => !fulfilledKeys.has(adjustmentKey(adj.productId, adj.size || null)));
        if (pending.length) {
          await releaseStockAdjustments(pending);
        }
      }
      if (items.length === 0 && snapshotItems.length) {
        setItems(snapshotItems);
        if (!cart && snapshotCart) setCart(snapshotCart);
      }
      toast({ title: 'Checkout failed', description: e.message || 'Unable to complete order', variant: 'destructive' });
      return { orders: [] };
    } finally {
      setLoading(false);
    }
  }, [authUser, items, toast, cart, profile?.id, loadCart, reserveStockForItems, releaseStockAdjustments]);

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
