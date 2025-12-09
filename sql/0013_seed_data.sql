-- Seed sample data for Tangub Shop Easy
BEGIN;

-- Minimal users (no auth link for seed)
INSERT INTO public.users (email, full_name, role, phone, city, barangay, id_number)
VALUES
  ('alice@example.com','Alice Customer','user','09171234567','Tangub City','Aquino','0000-0000-0001'),
  ('bob@example.com','Bob Vendor','vendor','09181234567','Tangub City','Hoyohoy','0000-0000-0002'),
  ('admin@example.com','Admin User','admin','09191234567','Tangub City','San Vicente Alto','0000-0000-0003')
ON CONFLICT DO NOTHING;

-- Link vendor to Bob (find bob id)
WITH bob AS (
  SELECT id FROM public.users WHERE email='bob@example.com' LIMIT 1
)
INSERT INTO public.vendors (owner_user_id, name, description, address, phone, barangay)
SELECT bob.id, 'Bob''s Store', 'General goods and snacks', 'Main St.', '09181234567', 'Hoyohoy'
FROM bob
ON CONFLICT DO NOTHING;

-- Products for Bob's Store
WITH v AS (
  SELECT id FROM public.vendors WHERE name = 'Bob''s Store' LIMIT 1
)
INSERT INTO public.products (vendor_id, name, description, price, stock, image_url)
SELECT v.id,
       p.name,
       p.description,
       CAST(p.price_text AS numeric),
       CAST(p.stock_text AS integer),
       p.image_url
FROM v, (
  VALUES
    ('Instant Noodles','Quick meal','12.00','100','https://picsum.photos/seed/noodles/200/200'),
    ('Bottled Water','Clean drinking water','20.00','200','https://picsum.photos/seed/water/200/200'),
    ('Bread Loaf','Freshly baked','45.00','50','https://picsum.photos/seed/bread/200/200')
) AS p(name, description, price_text, stock_text, image_url)
ON CONFLICT DO NOTHING;

-- Create an order for Alice at Bob's Store
WITH alice AS (
  SELECT id FROM public.users WHERE email='alice@example.com' LIMIT 1
), v AS (
  SELECT id FROM public.vendors WHERE name = 'Bob''s Store' LIMIT 1
)
INSERT INTO public.orders (user_id, vendor_id, status, total_amount)
SELECT alice.id, v.id, 'preparing', 77.00 FROM alice, v
RETURNING id;

-- Add order items (attach to the latest order)
WITH o AS (
  SELECT id FROM public.orders ORDER BY id DESC LIMIT 1
), prod AS (
  SELECT id, name, price FROM public.products WHERE name IN ('Instant Noodles','Bottled Water')
)
INSERT INTO public.order_items (order_id, product_id, quantity, unit_price)
SELECT o.id, p.id, q.qty, p.price
FROM o, (
  SELECT 'Instant Noodles' AS name, 2 AS qty
  UNION ALL
  SELECT 'Bottled Water' AS name, 1 AS qty
) q
JOIN prod p ON p.name = q.name;

-- Recalculate total (if not using triggers)
UPDATE public.orders o
SET total_amount = (
  SELECT COALESCE(SUM(oi.subtotal),0) FROM public.order_items oi WHERE oi.order_id = o.id
)
WHERE o.id = (SELECT id FROM public.orders ORDER BY id DESC LIMIT 1);

-- Seed messages
WITH o AS (
  SELECT id FROM public.orders ORDER BY id DESC LIMIT 1
)
INSERT INTO public.messages (order_id, sender_role, content)
SELECT o.id, 'vendor', 'Your order is being prepared.' FROM o;

COMMIT;
