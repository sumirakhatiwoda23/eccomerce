-- ============================================================
--  Simple ecommerce database (SQLite 3.35+)
--  Tables: categories, products, customers, addresses,
--          orders, order_items, payments, reviews
-- ============================================================

PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

-- ---------- Catalog -----------------------------------------

CREATE TABLE IF NOT EXISTS categories (
    id         INTEGER PRIMARY KEY,
    name       TEXT NOT NULL UNIQUE,
    slug       TEXT NOT NULL UNIQUE,
    parent_id  INTEGER REFERENCES categories (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS products (
    id           INTEGER PRIMARY KEY,
    sku          TEXT NOT NULL UNIQUE,
    name         TEXT NOT NULL,
    description  TEXT,
    category_id  INTEGER REFERENCES categories (id) ON DELETE SET NULL,
    price_cents  INTEGER NOT NULL CHECK (price_cents >= 0),
    currency     TEXT NOT NULL DEFAULT 'USD' CHECK (length(currency) = 3),
    stock        INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    is_active    INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products (category_id);
CREATE INDEX IF NOT EXISTS idx_products_active   ON products (is_active);

-- ---------- Customers ---------------------------------------

CREATE TABLE IF NOT EXISTS customers (
    id            INTEGER PRIMARY KEY,
    email         TEXT NOT NULL UNIQUE,
    full_name     TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS addresses (
    id          INTEGER PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers (id) ON DELETE CASCADE,
    line1       TEXT NOT NULL,
    line2       TEXT,
    city        TEXT NOT NULL,
    state       TEXT,
    postal_code TEXT,
    country     TEXT NOT NULL DEFAULT 'US',
    is_default  INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0, 1))
);

CREATE INDEX IF NOT EXISTS idx_addresses_customer ON addresses (customer_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_addresses_one_default
    ON addresses (customer_id) WHERE is_default = 1;

-- ---------- Sessions ----------------------------------------

CREATE TABLE IF NOT EXISTS sessions (
    id          TEXT PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers (id) ON DELETE CASCADE,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_customer ON sessions (customer_id);

-- ---------- Orders ------------------------------------------

CREATE TABLE IF NOT EXISTS orders (
    id                  INTEGER PRIMARY KEY,
    customer_id         INTEGER NOT NULL REFERENCES customers (id) ON DELETE RESTRICT,
    shipping_address_id INTEGER REFERENCES addresses (id) ON DELETE SET NULL,
    status              TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'paid', 'shipped',
                                          'completed', 'cancelled', 'refunded')),
    subtotal_cents      INTEGER NOT NULL DEFAULT 0 CHECK (subtotal_cents >= 0),
    shipping_cents      INTEGER NOT NULL DEFAULT 0 CHECK (shipping_cents >= 0),
    tax_cents           INTEGER NOT NULL DEFAULT 0 CHECK (tax_cents >= 0),
    total_cents         INTEGER GENERATED ALWAYS AS
                        (subtotal_cents + shipping_cents + tax_cents) STORED,
    created_at          TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders (customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status   ON orders (status);

CREATE TABLE IF NOT EXISTS order_items (
    id               INTEGER PRIMARY KEY,
    order_id         INTEGER NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
    product_id       INTEGER NOT NULL REFERENCES products (id) ON DELETE RESTRICT,
    quantity         INTEGER NOT NULL CHECK (quantity > 0),
    unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents >= 0),
    line_total_cents INTEGER GENERATED ALWAYS AS
                     (quantity * unit_price_cents) STORED,
    UNIQUE (order_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_order_items_order   ON order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items (product_id);

CREATE TABLE IF NOT EXISTS payments (
    id              INTEGER PRIMARY KEY,
    order_id        INTEGER NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
    provider        TEXT NOT NULL DEFAULT 'stripe',
    status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'authorized', 'captured',
                                      'failed', 'refunded')),
    amount_cents    INTEGER NOT NULL CHECK (amount_cents >= 0),
    transaction_ref TEXT UNIQUE,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_payments_order ON payments (order_id);

CREATE TABLE IF NOT EXISTS reviews (
    id          INTEGER PRIMARY KEY,
    product_id  INTEGER NOT NULL REFERENCES products (id) ON DELETE CASCADE,
    customer_id INTEGER NOT NULL REFERENCES customers (id) ON DELETE CASCADE,
    rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    title       TEXT,
    body        TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (product_id, customer_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews (product_id);

-- ---------- Triggers ----------------------------------------

-- Keep products.stock in sync with order items.
CREATE TRIGGER IF NOT EXISTS trg_order_items_ai
AFTER INSERT ON order_items
BEGIN
    UPDATE products
       SET stock = stock - NEW.quantity
     WHERE id = NEW.product_id;

    UPDATE orders
       SET subtotal_cents = subtotal_cents + NEW.quantity * NEW.unit_price_cents,
           updated_at     = datetime('now')
     WHERE id = NEW.order_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_order_items_ad
AFTER DELETE ON order_items
BEGIN
    UPDATE products
       SET stock = stock + OLD.quantity
     WHERE id = OLD.product_id;

    UPDATE orders
       SET subtotal_cents = subtotal_cents - OLD.quantity * OLD.unit_price_cents,
           updated_at     = datetime('now')
     WHERE id = OLD.order_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_order_items_au
AFTER UPDATE OF quantity, unit_price_cents, product_id ON order_items
BEGIN
    UPDATE products SET stock = stock + OLD.quantity WHERE id = OLD.product_id;
    UPDATE products SET stock = stock - NEW.quantity WHERE id = NEW.product_id;

    UPDATE orders
       SET subtotal_cents = subtotal_cents
                          - OLD.quantity * OLD.unit_price_cents
                          + NEW.quantity * NEW.unit_price_cents,
           updated_at     = datetime('now')
     WHERE id = NEW.order_id;
END;

-- ---------- Views -------------------------------------------

CREATE VIEW IF NOT EXISTS v_product_catalog AS
SELECT p.id,
       p.sku,
       p.name,
       c.name              AS category,
       p.price_cents,
       p.currency,
       p.stock,
       p.is_active,
       COALESCE(ROUND(AVG(r.rating), 2), 0) AS avg_rating,
       COUNT(r.id)                          AS review_count
  FROM products p
  LEFT JOIN categories c ON c.id = p.category_id
  LEFT JOIN reviews   r ON r.product_id = p.id
 GROUP BY p.id;

CREATE VIEW IF NOT EXISTS v_order_summary AS
SELECT o.id                                     AS order_id,
       o.status,
       cu.id                                    AS customer_id,
       cu.email,
       cu.full_name,
       COUNT(oi.id)                             AS line_items,
       COALESCE(SUM(oi.quantity), 0)            AS units,
       o.subtotal_cents,
       o.shipping_cents,
       o.tax_cents,
       o.total_cents,
       o.created_at
  FROM orders o
  JOIN customers   cu ON cu.id = o.customer_id
  LEFT JOIN order_items oi ON oi.order_id = o.id
 GROUP BY o.id;
