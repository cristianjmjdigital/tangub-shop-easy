-- Ensure RPC exists for bigint-based schema
-- Creates a callable helper to safely decrement stock for BIGINT product ids

create or replace function public.decrement_product_stock(p_id bigint, p_qty int)
returns void
language plpgsql
security definer
as $$
begin
  update public.products
     set stock = stock - p_qty
   where id = p_id
     and stock >= p_qty;
end;
$$;
