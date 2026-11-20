# Nimbus Supply — React + SQLite ecommerce demo

A small storefront (React + Vite) on top of a Node/Express API that talks
directly to the SQLite database in this folder. Browse the catalog, add items
to a cart, create an account, check out (simulated payment), and review your
orders.

## Demo accounts

All seeded customers use the password **`password123`**:

| Email               | Name          |
| ------------------- | ------------- |
| `ada@example.com`   | Ada Lovelace  |
| `grace@example.com` | Grace Hopper  |
| `alan@example.com`  | Alan Turing   |
| `linus@example.com` | Linus Torvalds |

Or register a new account from `/register`.


## Quick start

Requires Node 22.13+ (uses the built-in `node:sqlite` module without a flag; tested on Node 26).

```bash
npm install                     # root tooling (concurrently)
npm install --prefix server     # Express API
npm install --prefix client     # React app
npm run dev                     # API :3001 + Vite :5173
```

Open http://localhost:5173.

The Vite dev server proxies `/api` to the API, so there is no CORS setup.

### Production build

```bash
npm run build    # client -> client/dist
npm start        # Express serves the API and the built app on :3001
```

## Deploy on Render

This repo includes `render.yaml` for a free Node web service that serves the
API and the built client from a single origin.

- **Build:** `npm ci --prefix server && npm ci --include=dev --prefix client && npm --prefix client run build && node build_db.js`
- **Start:** `npm start`
- **Health check:** `/api/health`
- **Node version:** pinned to `24.22.3` via `.node-version` / `NODE_VERSION`

Render's free plan has an ephemeral filesystem, so accounts, sessions and orders
created at runtime are lost when the service restarts or spins down. The catalog
is re-seeded automatically from `schema.sql` + `seed.sql` on startup. For durable
data, move the service to a paid instance and mount a persistent disk at
`/var/data`, then set `DB_PATH=/var/data/ecommerce.db`.


### Demo data

```bash
npm run db:reset  # re-run schema.sql + seed.sql (fresh ecommerce.db)
```

## Project layout

```
.
├── schema.sql / seed.sql / queries.sql   # database
├── build_db.py                           # rebuild ecommerce.db
├── ecommerce.db                          # SQLite database
├── server/
│   └── index.js                          # Express API + static hosting
└── client/
    ├── src/
    │   ├── pages/        Shop, ProductPage, Checkout, Orders, AuthPage
    │   ├── components/   Header, ProductCard, CartDrawer
    │   ├── context/      AuthContext (session), CartContext (localStorage)
    │   ├── lib/format.js money / emoji / date helpers
    │   ├── api.js        fetch wrapper
    │   └── styles.css
    └── vite.config.js
```

## API

| Method | Path                 | Description                                        |
| ------ | -------------------- | -------------------------------------------------- |
| GET    | `/api/health`        | Liveness check                                     |
| GET    | `/api/categories`    | Categories with product counts                     |
| GET    | `/api/products`      | Catalog; filters `?category=slug&q=text&sort=…`    |
| GET    | `/api/products/:id`  | Product detail + reviews                           |
| POST   | `/api/auth/register` | Create an account and start a session              |
| POST   | `/api/auth/login`    | Sign in; sets the `sid` session cookie             |
| POST   | `/api/auth/logout`   | Destroy the session                                |
| GET    | `/api/auth/me`       | Current customer, or `null`                        |
| POST   | `/api/orders`        | Checkout: validates stock, creates order + payment |
| GET    | `/api/orders`        | Order history (session user, or `?email=`)         |

Sort values: `featured`, `price_asc`, `price_desc`, `rating`, `name`.

### Auth

Passwords are hashed with Node's `scrypt` (per-user salt) and stored in the
`customers.password_hash` column as `scrypt$<salt>$<hash>`. Sessions are random
32-byte tokens in the `sessions` table, sent as an `HttpOnly`, `SameSite=Lax`
cookie named `sid` (30-day expiry). There is no client-side token storage.

`POST /api/auth/register` expects:

```json
{ "email": "you@example.com", "fullName": "Your Name", "password": "at-least-8-chars" }
```

### Checkout request

```json
{
  "email": "you@example.com",
  "fullName": "Your Name",
  "address": {
    "line1": "1 Main St",
    "city": "Springfield",
    "state": "IL",
    "postalCode": "62701",
    "country": "US"
  },
  "items": [{ "productId": 1, "quantity": 2 }]
}
```

Prices, shipping ($5 under $100, free above) and 8% tax are calculated
server-side. Stock is checked again inside the transaction, so two simultaneous
checkouts cannot oversell an item. When you are signed in, `email` and
`fullName` are taken from the session, and guest checkout still works.

## Database

Tables: `categories`, `products`, `customers`, `addresses`, `sessions`,
`orders`, `order_items`, `payments`, `reviews`.

- Money is stored as integer cents.
- `orders.total_cents` and `order_items.line_total_cents` are generated columns.
- Triggers on `order_items` adjust `products.stock` and recalculate order
  subtotals; `CHECK (stock >= 0)` blocks overselling.
- Views `v_product_catalog` and `v_order_summary` are handy for reporting.
- Seed data: 5 categories, 12 products, 4 customers, 5 orders, reviews.

See `queries.sql` for analytical examples and `schema.sql` for full definitions.

## Notes

- Checkout is a demo: no payment provider is called.
- Accounts are real (hashed passwords, server-side sessions), but there is no
  password reset flow, email verification, or rate limiting.
- The cart lives in `localStorage` (`nimbus.cart.v1`), so it survives reloads.
- Sessions expire after 30 days and are validated against the database on every
  request.
- `DB_PATH` and `PORT` environment variables override the defaults.
