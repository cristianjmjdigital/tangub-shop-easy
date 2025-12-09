-- Checkout finalize: move cart items to order and clear cart
-- Assumes BIGINT ids across users/vendors/products/carts/orders

BEGIN;

-- Helper: create order from cart and clear items
DROP FUNCTION IF EXISTS public.finalize_checkout_bigint(bigint, bigint);
CREATE FUNCTION public.finalize_checkout_bigint(p_user_id BIGINT, p_vendor_id BIGINT)
RETURNS BIGINT AS $body$
DECLARE
  v_cart_id BIGINT;
  v_order_id BIGINT;
BEGIN
  SELECT id INTO v_cart_id FROM public.carts WHERE user_id = p_user_id AND (vendor_id IS NULL OR vendor_id = p_vendor_id) LIMIT 1;
  IF v_cart_id IS NULL THEN
    RAISE EXCEPTION 'No cart found for user % (vendor %)', p_user_id, p_vendor_id;
  END IF;

  -- Create order
  INSERT INTO public.orders (user_id, vendor_id, status, total_amount, created_at, updated_at)
  VALUES (p_user_id, p_vendor_id, 'pending', 0, now(), now())
  RETURNING id INTO v_order_id;

  -- Copy cart items into order_items with price snapshot
  INSERT INTO public.order_items (order_id, product_id, quantity, unit_price)
  SELECT v_order_id, ci.product_id, ci.quantity, p.price
  FROM public.cart_items ci
  JOIN public.products p ON p.id = ci.product_id
  WHERE ci.cart_id = v_cart_id;

  -- Update order total
  UPDATE public.orders o
  SET total_amount = (
    SELECT COALESCE(SUM(oi.subtotal),0) FROM public.order_items oi WHERE oi.order_id = o.id
  ), updated_at = now()
  WHERE o.id = v_order_id;

  -- Clear cart items
  DELETE FROM public.cart_items WHERE cart_id = v_cart_id;

  -- Optionally remove the cart row (keep for one-cart-per-user semantics)
  -- DELETE FROM public.carts WHERE id = v_cart_id;

  RETURN v_order_id;
END;
$body$ LANGUAGE plpgsql;

COMMIT;

-- RLS: allow calling via RPC by authenticated users
-- You will need to expose this as an RPC in Supabase if using PostgREST (create a view or mark function as stable)
