import express from 'express';
import { DatabaseSync } from 'node:sqlite';
import { randomUUID, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DB_PATH = process.env.DB_PATH ?? path.join(ROOT, 'ecommerce.db');
const PORT = Number(process.env.PORT ?? 3001);

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA foreign_keys = ON');

// Keep older databases usable after the auth feature was added.
db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id          TEXT PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers (id) ON DELETE CASCADE,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at  TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_sessions_customer ON sessions (customer_id);
`);

const app = express();
app.use(express.json());

/* ------------------------------ helpers ------------------------------ */

const PRODUCT_COLUMNS = `
  p.id, p.sku, p.name, p.description, p.price_cents, p.currency, p.stock,
  c.name AS category_name, c.slug AS category_slug,
  COALESCE(ROUND(AVG(r.rating), 2), 0) AS avg_rating,
  COUNT(r.id) AS review_count
`;

const PRODUCT_JOINS = `
  FROM products p
  LEFT JOIN categories c ON c.id = p.category_id
  LEFT JOIN reviews r ON r.product_id = p.id
`;

const SORTS = {
  featured: 'p.id',
  price_asc: 'p.price_cents ASC',
  price_desc: 'p.price_cents DESC',
  rating: 'avg_rating DESC, review_count DESC',
  name: 'p.name COLLATE NOCASE ASC',
};

function mapProduct(row) {
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    description: row.description,
    priceCents: row.price_cents,
    currency: row.currency,
    stock: row.stock,
    category: row.category_name,
    categorySlug: row.category_slug,
    avgRating: row.avg_rating,
    reviewCount: row.review_count,
  };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* -------------------------------- auth ------------------------------- */

const SESSION_COOKIE = 'sid';
const SESSION_TTL_DAYS = 30;

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

function verifyPassword(password, stored) {
  const [scheme, salt, expectedHex] = String(stored ?? '').split('$');
  if (scheme !== 'scrypt' || !salt || !expectedHex) return false;

  const expected = Buffer.from(expectedHex, 'hex');
  const candidate = scryptSync(password, salt, expected.length);
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

function parseCookies(req) {
  return Object.fromEntries(
    String(req.headers.cookie ?? '')
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf('=');
        return index === -1
          ? [part, '']
          : [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
      }),
  );
}

function createSession(customerId) {
  const token = randomBytes(32).toString('hex');
  db.prepare(
    `INSERT INTO sessions (id, customer_id, expires_at)
     VALUES (?, ?, datetime('now', '+${SESSION_TTL_DAYS} days'))`,
  ).run(token, customerId);
  return token;
}

function currentCustomer(req) {
  const token = parseCookies(req)[SESSION_COOKIE];
  if (!token) return null;

  const row = db.prepare(`
    SELECT c.id, c.email, c.full_name
      FROM sessions s
      JOIN customers c ON c.id = s.customer_id
     WHERE s.id = ? AND s.expires_at > datetime('now')
  `).get(token);

  return row ? { id: row.id, email: row.email, fullName: row.full_name } : null;
}

function setSessionCookie(res, token) {
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${SESSION_TTL_DAYS * 86400}`,
  );
}

function clearSessionCookie(res) {
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`,
  );
}

app.post('/api/auth/register', (req, res) => {
  const { email, fullName, password } = req.body ?? {};

  if (typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
    return res.status(400).json({ error: 'A valid email address is required' });
  }
  if (typeof fullName !== 'string' || fullName.trim().length < 2) {
    return res.status(400).json({ error: 'Please provide your full name' });
  }
  if (typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  const normalized = email.trim().toLowerCase();

  try {
    const customerId = Number(db.prepare(
      'INSERT INTO customers (email, full_name, password_hash) VALUES (?, ?, ?)',
    ).run(normalized, fullName.trim(), hashPassword(password)).lastInsertRowid);

    db.prepare("DELETE FROM sessions WHERE expires_at <= datetime('now')").run();
    setSessionCookie(res, createSession(customerId));

    res.status(201).json({
      customer: { id: customerId, email: normalized, fullName: fullName.trim() },
    });
  } catch (err) {
    if (/UNIQUE constraint failed/.test(err.message)) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }
    throw err;
  }
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body ?? {};

  if (typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const row = db.prepare(
    'SELECT id, email, full_name, password_hash FROM customers WHERE lower(email) = lower(?)',
  ).get(email.trim());

  if (!row || !verifyPassword(password, row.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  db.prepare("DELETE FROM sessions WHERE expires_at <= datetime('now')").run();
  setSessionCookie(res, createSession(row.id));

  res.json({ customer: { id: row.id, email: row.email, fullName: row.full_name } });
});

app.post('/api/auth/logout', (req, res) => {
  const token = parseCookies(req)[SESSION_COOKIE];
  if (token) db.prepare('DELETE FROM sessions WHERE id = ?').run(token);
  clearSessionCookie(res);
  res.status(204).end();
});

app.get('/api/auth/me', (req, res) => {
  res.json({ customer: currentCustomer(req) });
});


/* ------------------------------- catalog ----------------------------- */

app.get('/api/health', (req, res) => {
  res.json({ ok: true, db: path.basename(DB_PATH) });
});

app.get('/api/categories', (req, res) => {
  const rows = db.prepare(`
    SELECT c.id, c.name, c.slug, COUNT(p.id) AS product_count
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id AND p.is_active = 1
     GROUP BY c.id
     ORDER BY c.name COLLATE NOCASE
  `).all();

  res.json(rows.map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    productCount: r.product_count,
  })));
});

app.get('/api/products', (req, res) => {
  const { category, q, sort = 'featured' } = req.query;
  const where = ['p.is_active = 1'];
  const params = [];

  if (category) {
    where.push('c.slug = ?');
    params.push(String(category));
  }
  if (q && String(q).trim()) {
    where.push('(p.name LIKE ? OR p.description LIKE ?)');
    const term = `%${String(q).trim()}%`;
    params.push(term, term);
  }

  const orderBy = SORTS[sort] ?? SORTS.featured;
  const rows = db.prepare(`
    SELECT ${PRODUCT_COLUMNS}
    ${PRODUCT_JOINS}
    WHERE ${where.join(' AND ')}
    GROUP BY p.id
    ORDER BY ${orderBy}
  `).all(...params);

  res.json(rows.map(mapProduct));
});

app.get('/api/products/:id', (req, res) => {
  const row = db.prepare(`
    SELECT ${PRODUCT_COLUMNS}
    ${PRODUCT_JOINS}
    WHERE p.id = ?
    GROUP BY p.id
  `).get(req.params.id);

  if (!row) return res.status(404).json({ error: 'Product not found' });

  const reviews = db.prepare(`
    SELECT r.rating, r.title, r.body, r.created_at, cu.full_name
      FROM reviews r
      JOIN customers cu ON cu.id = r.customer_id
     WHERE r.product_id = ?
     ORDER BY r.created_at DESC, r.id DESC
  `).all(req.params.id);

  res.json({
    ...mapProduct(row),
    reviews: reviews.map((r) => ({
      rating: r.rating,
      title: r.title,
      body: r.body,
      createdAt: r.created_at,
      author: r.full_name,
    })),
  });
});

/* ------------------------------ checkout ----------------------------- */

const getProduct = db.prepare(
  'SELECT id, name, price_cents, stock, is_active FROM products WHERE id = ?'
);
const findCustomer = db.prepare(
  'SELECT id FROM customers WHERE lower(email) = lower(?)'
);

app.post('/api/orders', (req, res) => {
  const { items, address } = req.body ?? {};
  const account = currentCustomer(req);
  const email = account ? account.email : req.body?.email;
  const fullName = account ? account.fullName : req.body?.fullName;

  if (!account) {
    if (typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
      return res.status(400).json({ error: 'A valid email address is required' });
    }
    if (typeof fullName !== 'string' || fullName.trim().length < 2) {
      return res.status(400).json({ error: 'Please provide your full name' });
    }
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Your cart is empty' });
  }
  if (!address || typeof address.line1 !== 'string' || address.line1.trim() === '' ||
      typeof address.city !== 'string' || address.city.trim() === '' ||
      typeof address.country !== 'string' || address.country.trim() === '') {
    return res.status(400).json({ error: 'Street, city and country are required' });
  }

  // Merge duplicate lines and validate quantities.
  const wanted = new Map();
  for (const item of items) {
    const id = Number(item?.productId);
    const qty = Number(item?.quantity);
    if (!Number.isInteger(id) || !Number.isInteger(qty) || qty < 1 || qty > 99) {
      return res.status(400).json({ error: 'Invalid cart item' });
    }
    wanted.set(id, (wanted.get(id) ?? 0) + qty);
  }

  // Price from the database, never from the client.
  const lines = [];
  for (const [productId, quantity] of wanted) {
    const product = getProduct.get(productId);
    if (!product || !product.is_active) {
      return res.status(400).json({ error: `Product ${productId} is unavailable` });
    }
    if (product.stock < quantity) {
      return res.status(409).json({
        error: `Only ${product.stock} × "${product.name}" left in stock`,
      });
    }
    lines.push({ product, quantity });
  }

  const subtotal = lines.reduce((sum, l) => sum + l.quantity * l.product.price_cents, 0);
  const shipping = subtotal >= 10000 ? 0 : 500;
  const tax = Math.round(subtotal * 0.08);
  const total = subtotal + shipping + tax;

  let customerId;
  let orderId;

  db.exec('BEGIN IMMEDIATE');
  try {
    if (account) {
      customerId = account.id;
    } else {
      const existing = findCustomer.get(email.trim());
      customerId = existing
        ? existing.id
        : Number(db.prepare(
            'INSERT INTO customers (email, full_name, password_hash) VALUES (?, ?, ?)'
          ).run(email.trim().toLowerCase(), fullName.trim(), 'guest').lastInsertRowid);
    }

    const hasDefault = db.prepare(
      'SELECT 1 FROM addresses WHERE customer_id = ? AND is_default = 1'
    ).get(customerId);

    const addressId = Number(db.prepare(`
      INSERT INTO addresses (customer_id, line1, line2, city, state, postal_code, country, is_default)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      customerId,
      address.line1.trim(),
      address.line2?.trim() || null,
      address.city.trim(),
      address.state?.trim() || null,
      address.postalCode?.trim() || null,
      address.country.trim().toUpperCase(),
      hasDefault ? 0 : 1
    ).lastInsertRowid);

    orderId = Number(db.prepare(`
      INSERT INTO orders (customer_id, shipping_address_id, status, shipping_cents, tax_cents)
      VALUES (?, ?, 'paid', ?, ?)
    `).run(customerId, addressId, shipping, tax).lastInsertRowid);

    const insertItem = db.prepare(`
      INSERT INTO order_items (order_id, product_id, quantity, unit_price_cents)
      VALUES (?, ?, ?, ?)
    `);
    for (const line of lines) {
      insertItem.run(orderId, line.product.id, line.quantity, line.product.price_cents);
    }

    db.prepare(`
      INSERT INTO payments (order_id, provider, status, amount_cents, transaction_ref)
      VALUES (?, 'stripe', 'captured', ?, ?)
    `).run(orderId, total, `sim_${randomUUID().slice(0, 12)}`);

    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    if (/CHECK constraint failed/.test(err.message)) {
      return res.status(409).json({ error: 'An item ran out of stock while checking out. Please try again.' });
    }
    throw err;
  }

  const order = db.prepare(`
    SELECT id, status, subtotal_cents, shipping_cents, tax_cents, total_cents, created_at
      FROM orders WHERE id = ?
  `).get(orderId);

  res.status(201).json({
    orderId: order.id,
    status: order.status,
    subtotalCents: order.subtotal_cents,
    shippingCents: order.shipping_cents,
    taxCents: order.tax_cents,
    totalCents: order.total_cents,
    createdAt: order.created_at,
    items: lines.map((l) => ({
      productId: l.product.id,
      name: l.product.name,
      quantity: l.quantity,
      unitPriceCents: l.product.price_cents,
      lineTotalCents: l.quantity * l.product.price_cents,
    })),
  });
});

app.get('/api/orders', (req, res) => {
  const account = currentCustomer(req);
  let email;

  if (account) {
    email = account.email;
  } else {
    email = String(req.query.email ?? '').trim();
    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ error: 'A valid email address is required' });
    }
  }

  const orders = db.prepare(`
    SELECT o.id, o.status, o.subtotal_cents, o.shipping_cents, o.tax_cents,
           o.total_cents, o.created_at
      FROM orders o
      JOIN customers c ON c.id = o.customer_id
     WHERE lower(c.email) = lower(?)
     ORDER BY o.id DESC
     LIMIT 50
  `).all(email);

  const itemsFor = db.prepare(`
    SELECT oi.quantity, oi.unit_price_cents, oi.line_total_cents,
           p.id AS product_id, p.name, p.sku
      FROM order_items oi
      JOIN products p ON p.id = oi.product_id
     WHERE oi.order_id = ?
     ORDER BY oi.id
  `);

  res.json(orders.map((o) => ({
    orderId: o.id,
    status: o.status,
    subtotalCents: o.subtotal_cents,
    shippingCents: o.shipping_cents,
    taxCents: o.tax_cents,
    totalCents: o.total_cents,
    createdAt: o.created_at,
    items: itemsFor.all(o.id).map((i) => ({
      productId: i.product_id,
      name: i.name,
      sku: i.sku,
      quantity: i.quantity,
      unitPriceCents: i.unit_price_cents,
      lineTotalCents: i.line_total_cents,
    })),
  })));
});

/* --------------------------- static client --------------------------- */

const distDir = path.join(ROOT, 'client', 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong' });
});

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT} (db: ${DB_PATH})`);
});
