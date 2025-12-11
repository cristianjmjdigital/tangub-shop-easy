-- RLS update/insert/delete permissions so authenticated users can manage their own data
-- Run in Supabase SQL editor after restoring schema

-- Vendors: owner can insert/update/delete
DO $$ BEGIN
  DROP POLICY IF EXISTS vendors_insert_owner ON public.vendors;
  CREATE POLICY vendors_insert_owner ON public.vendors
    FOR INSERT TO authenticated
    WITH CHECK (owner_user_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid()::uuid));

  DROP POLICY IF EXISTS vendors_update_owner ON public.vendors;
  CREATE POLICY vendors_update_owner ON public.vendors
    FOR UPDATE TO authenticated
    USING (owner_user_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid()::uuid))
    WITH CHECK (owner_user_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid()::uuid));

  DROP POLICY IF EXISTS vendors_delete_owner ON public.vendors;
  CREATE POLICY vendors_delete_owner ON public.vendors
    FOR DELETE TO authenticated
    USING (owner_user_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid()::uuid));
END $$;

-- Products: vendor owner can insert/update/delete
DO $$ BEGIN
  DROP POLICY IF EXISTS products_insert_vendor_owner ON public.products;
  CREATE POLICY products_insert_vendor_owner ON public.products
    FOR INSERT TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.vendors v
        WHERE v.id = products.vendor_id
          AND v.owner_user_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid()::uuid)
      )
    );

  DROP POLICY IF EXISTS products_update_vendor_owner ON public.products;
  CREATE POLICY products_update_vendor_owner ON public.products
    FOR UPDATE TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.vendors v
        WHERE v.id = products.vendor_id
          AND v.owner_user_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid()::uuid)
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.vendors v
        WHERE v.id = products.vendor_id
          AND v.owner_user_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid()::uuid)
      )
    );

  DROP POLICY IF EXISTS products_delete_vendor_owner ON public.products;
  CREATE POLICY products_delete_vendor_owner ON public.products
    FOR DELETE TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.vendors v
        WHERE v.id = products.vendor_id
          AND v.owner_user_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid()::uuid)
      )
    );
END $$;

-- Orders: buyer or vendor owner can update/delete
DO $$ BEGIN
  DROP POLICY IF EXISTS orders_update_owner_or_vendor ON public.orders;
  CREATE POLICY orders_update_owner_or_vendor ON public.orders
    FOR UPDATE TO authenticated
    USING (
      auth.uid()::uuid = (SELECT auth_user_id FROM public.users WHERE public.users.id = orders.user_id)
      OR EXISTS (
        SELECT 1 FROM public.vendors v
        WHERE v.id = orders.vendor_id
          AND v.owner_user_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid()::uuid)
      )
    )
    WITH CHECK (
      auth.uid()::uuid = (SELECT auth_user_id FROM public.users WHERE public.users.id = orders.user_id)
      OR EXISTS (
        SELECT 1 FROM public.vendors v
        WHERE v.id = orders.vendor_id
          AND v.owner_user_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid()::uuid)
      )
    );

  DROP POLICY IF EXISTS orders_delete_owner_or_vendor ON public.orders;
  CREATE POLICY orders_delete_owner_or_vendor ON public.orders
    FOR DELETE TO authenticated
    USING (
      auth.uid()::uuid = (SELECT auth_user_id FROM public.users WHERE public.users.id = orders.user_id)
      OR EXISTS (
        SELECT 1 FROM public.vendors v
        WHERE v.id = orders.vendor_id
          AND v.owner_user_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid()::uuid)
      )
    );
END $$;

-- Order items: buyer or vendor owner can update/delete
DO $$ BEGIN
  DROP POLICY IF EXISTS order_items_update_via_order ON public.order_items;
  CREATE POLICY order_items_update_via_order ON public.order_items
    FOR UPDATE TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND (
          auth.uid()::uuid = (SELECT auth_user_id FROM public.users WHERE public.users.id = o.user_id)
          OR EXISTS (
            SELECT 1 FROM public.vendors v
            WHERE v.id = o.vendor_id AND v.owner_user_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid()::uuid)
          )
        )
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND (
          auth.uid()::uuid = (SELECT auth_user_id FROM public.users WHERE public.users.id = o.user_id)
          OR EXISTS (
            SELECT 1 FROM public.vendors v
            WHERE v.id = o.vendor_id AND v.owner_user_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid()::uuid)
          )
        )
      )
    );

  DROP POLICY IF EXISTS order_items_delete_via_order ON public.order_items;
  CREATE POLICY order_items_delete_via_order ON public.order_items
    FOR DELETE TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND (
          auth.uid()::uuid = (SELECT auth_user_id FROM public.users WHERE public.users.id = o.user_id)
          OR EXISTS (
            SELECT 1 FROM public.vendors v
            WHERE v.id = o.vendor_id AND v.owner_user_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid()::uuid)
          )
        )
      )
    );
END $$;

-- Carts: owner can update/delete
DO $$ BEGIN
  DROP POLICY IF EXISTS carts_update_own ON public.carts;
  CREATE POLICY carts_update_own ON public.carts
    FOR UPDATE TO authenticated
    USING (auth.uid()::uuid = (SELECT auth_user_id FROM public.users u WHERE u.id = carts.user_id))
    WITH CHECK (auth.uid()::uuid = (SELECT auth_user_id FROM public.users u WHERE u.id = carts.user_id));

  DROP POLICY IF EXISTS carts_delete_own ON public.carts;
  CREATE POLICY carts_delete_own ON public.carts
    FOR DELETE TO authenticated
    USING (auth.uid()::uuid = (SELECT auth_user_id FROM public.users u WHERE u.id = carts.user_id));
END $$;

-- Cart items: owner of cart can update/delete
DO $$ BEGIN
  DROP POLICY IF EXISTS cart_items_update_via_cart ON public.cart_items;
  CREATE POLICY cart_items_update_via_cart ON public.cart_items
    FOR UPDATE TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.carts c WHERE c.id = cart_items.cart_id AND
          auth.uid()::uuid = (SELECT auth_user_id FROM public.users u WHERE u.id = c.user_id)
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.carts c WHERE c.id = cart_items.cart_id AND
          auth.uid()::uuid = (SELECT auth_user_id FROM public.users u WHERE u.id = c.user_id)
      )
    );

  DROP POLICY IF EXISTS cart_items_delete_via_cart ON public.cart_items;
  CREATE POLICY cart_items_delete_via_cart ON public.cart_items
    FOR DELETE TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.carts c WHERE c.id = cart_items.cart_id AND
          auth.uid()::uuid = (SELECT auth_user_id FROM public.users u WHERE u.id = c.user_id)
      )
    );
END $$;

-- Messages: participants (buyer or vendor owner) can insert/update/delete
DO $$ BEGIN
  DROP POLICY IF EXISTS messages_insert_participants ON public.messages;
  CREATE POLICY messages_insert_participants ON public.messages
    FOR INSERT TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.orders o WHERE o.id = messages.order_id AND (
          auth.uid()::uuid = (SELECT auth_user_id FROM public.users WHERE public.users.id = o.user_id)
          OR EXISTS (
            SELECT 1 FROM public.vendors v
            WHERE v.id = o.vendor_id AND v.owner_user_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid()::uuid)
          )
        )
      )
    );

  DROP POLICY IF EXISTS messages_update_participants ON public.messages;
  CREATE POLICY messages_update_participants ON public.messages
    FOR UPDATE TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.orders o WHERE o.id = messages.order_id AND (
          auth.uid()::uuid = (SELECT auth_user_id FROM public.users WHERE public.users.id = o.user_id)
          OR EXISTS (
            SELECT 1 FROM public.vendors v
            WHERE v.id = o.vendor_id AND v.owner_user_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid()::uuid)
          )
        )
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.orders o WHERE o.id = messages.order_id AND (
          auth.uid()::uuid = (SELECT auth_user_id FROM public.users WHERE public.users.id = o.user_id)
          OR EXISTS (
            SELECT 1 FROM public.vendors v
            WHERE v.id = o.vendor_id AND v.owner_user_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid()::uuid)
          )
        )
      )
    );

  DROP POLICY IF EXISTS messages_delete_participants ON public.messages;
  CREATE POLICY messages_delete_participants ON public.messages
    FOR DELETE TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.orders o WHERE o.id = messages.order_id AND (
          auth.uid()::uuid = (SELECT auth_user_id FROM public.users WHERE public.users.id = o.user_id)
          OR EXISTS (
            SELECT 1 FROM public.vendors v
            WHERE v.id = o.vendor_id AND v.owner_user_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid()::uuid)
          )
        )
      )
    );
END $$;