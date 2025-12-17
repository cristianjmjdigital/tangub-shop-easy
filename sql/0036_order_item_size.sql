-- Add size column to order_items to keep cart item variant
-- and update finalize_checkout_bigint to copy size from cart_items

BEGIN;

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS size text;

-- Replace checkout helper to copy size column
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

  INSERT INTO public.orders (user_id, vendor_id, status, total_amount, created_at, updated_at)
  VALUES (p_user_id, p_vendor_id, 'pending', 0, now(), now())
  RETURNING id INTO v_order_id;

  INSERT INTO public.order_items (order_id, product_id, quantity, unit_price, size)
  SELECT v_order_id, ci.product_id, ci.quantity, p.price, ci.size
  FROM public.cart_items ci
  JOIN public.products p ON p.id = ci.product_id
  WHERE ci.cart_id = v_cart_id;

  UPDATE public.orders o
  SET total_amount = (
    SELECT COALESCE(SUM(oi.subtotal),0) FROM public.order_items oi WHERE oi.order_id = o.id
  ), updated_at = now()
  WHERE o.id = v_order_id;

  DELETE FROM public.cart_items WHERE cart_id = v_cart_id;

  RETURN v_order_id;
END;
$body$ LANGUAGE plpgsql;

COMMIT;
