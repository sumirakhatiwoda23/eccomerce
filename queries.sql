-- ============================================================
--  Handy queries to explore the ecommerce database
-- ============================================================

-- 1. Full catalog with category and rating
SELECT name, category, printf('%.2f %s', price_cents / 100.0, currency) AS price,
       stock, avg_rating, review_count
  FROM v_product_catalog
 ORDER BY category, name;

-- 2. Low-stock products (fewer than 50 units)
SELECT sku, name, stock
  FROM products
 WHERE is_active = 1 AND stock < 50
 ORDER BY stock;

-- 3. Revenue by product (excluding cancelled orders)
SELECT p.name,
       SUM(oi.quantity)                        AS units_sold,
       printf('%.2f', SUM(oi.line_total_cents) / 100.0) AS revenue
  FROM order_items oi
  JOIN products p ON p.id = oi.product_id
  JOIN orders   o ON o.id = oi.order_id
 WHERE o.status NOT IN ('cancelled', 'refunded')
 GROUP BY p.id
 ORDER BY SUM(oi.line_total_cents) DESC;

-- 4. Customer lifetime value
SELECT c.email,
       COUNT(DISTINCT o.id)                       AS orders,
       printf('%.2f', SUM(o.total_cents) / 100.0) AS lifetime_value
  FROM customers c
  JOIN orders o ON o.customer_id = c.id
 WHERE o.status NOT IN ('cancelled', 'refunded')
 GROUP BY c.id
 ORDER BY SUM(o.total_cents) DESC;

-- 5. Orders with their payment state
SELECT o.id, o.status AS order_status, p.provider,
       p.status AS payment_status, p.amount_cents, p.transaction_ref
  FROM orders o
  LEFT JOIN payments p ON p.order_id = o.id
 ORDER BY o.id;

-- 6. Top-rated products with at least one review
SELECT name, avg_rating, review_count
  FROM v_product_catalog
 WHERE review_count > 0
 ORDER BY avg_rating DESC, review_count DESC
 LIMIT 5;

-- 7. Monthly sales trend
SELECT strftime('%Y-%m', o.created_at)             AS month,
       COUNT(DISTINCT o.id)                        AS orders,
       printf('%.2f', SUM(o.total_cents) / 100.0)  AS revenue
  FROM orders o
 WHERE o.status NOT IN ('cancelled', 'refunded')
 GROUP BY month
 ORDER BY month;

-- 8. Place a new order (stock and subtotal update automatically)
--    Requires: PRAGMA foreign_keys = ON;
-- INSERT INTO orders (customer_id, shipping_address_id, status, shipping_cents, tax_cents)
--      VALUES (1, 1, 'pending', 500, 200);
-- INSERT INTO order_items (order_id, product_id, quantity, unit_price_cents)
--      VALUES (last_insert_rowid(), 1, 2, 2499);
