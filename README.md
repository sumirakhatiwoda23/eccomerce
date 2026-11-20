# Nimbus Supply — React + SQLite ecommerce storefront

[![Live demo](https://img.shields.io/badge/live_demo-nimbus--supply.onrender.com-2ea44f?logo=render&logoColor=white)](https://nimbus-supply.onrender.com)
[![Node.js](https://img.shields.io/badge/Node.js-24-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)](https://expressjs.com)
[![SQLite](https://img.shields.io/badge/SQLite-node%3Asqlite-003B57?logo=sqlite&logoColor=white)](https://nodejs.org/api/sqlite.html)



**Live demo:** https://nimbus-supply.onrender.com


## Demo accounts

All seeded customers use the password **`password123`**:

| Email               | Name          |
| ------------------- | ------------- |
| `ada@example.com`   | Ada Lovelace  |
| `grace@example.com` | Grace Hopper  |
| `alan@example.com`  | Alan Turing   |
| `linus@example.com` | Linus Torvalds |

Or register a new account from `/register`.

## Features

- Product catalog with category filters, text search, and sorting
- Product pages with ratings and customer reviews
- Persistent cart (survives reloads via `localStorage`)
- Account registration and login with server-side sessions
- Guest or signed-in checkout with server-calculated pricing, shipping, and tax
- Order history per customer
- Automatic database creation and seeding on first run
- Single-service deployment: Express serves both the API and the built client

## Tech stack

| Layer     | Choice                                              |
| --------- | --------------------------------------------------- |
| Frontend  | React 19, React Router 7, Vite 8                    |
| Backend   | Node.js 24, Express 5                               |
| Database  | SQLite via the built-in `node:sqlite` module        |
| Auth      | `scrypt` password hashing, DB-backed session cookie |
| Hosting   | Render (single web service, free plan)              |

## Quick start

Requires Node 22.13+ (uses the built-in `node:sqlite` module without a flag;
tested on Node 26). The repo pins Node `24.22.3` via `.node-version`.

```bash
npm install                     # root tooling (concurrently)
npm install --prefix server     # Express API
npm install --prefix client     # React app
npm run dev                     # API :3001 + Vite :5173
```

Open http://localhost:5173. The Vite dev server proxies `/api` to the API, so
there is no CORS setup.

### Demo data

```bash
npm run db:init    # create + seed ecommerce.db if it is missing
npm run db:reset   # rebuild ecommerce.db from schema.sql + seed.sql
```

### Production build

```bash
npm run build    # client -> client/dist, then initialize the database
npm start        # Express serves the API and the built app on :3001
```

## Deploy on Render

This repo includes [`render.yaml`](render.yaml) for a free Node web service that
serves the API and the built client from a single origin.

| Setting      | Value                                                                                                         |
| ------------ | ------------------------------------------------------------------------------------------------------------- |
| Build        | `npm ci --prefix server && npm ci --include=dev --prefix client && npm --prefix client run build && node build_db.js` |
| Start        | `npm start`                                                                                                   |
| Health check | `/api/health`                                                                                                 |
| Node version | `24.22.3` (via `.node-version` / `NODE_VERSION`)                                                              |

`--include=dev` is required on the client install because `NODE_ENV=production`
otherwise skips Vite during the build.

Render's free plan has an ephemeral filesystem, so accounts, sessions, and orders
created at runtime are lost when the service restarts or spins down. The catalog
is re-seeded automatically from `schema.sql` + `seed.sql` on startup. For durable
data, move the service to a paid instance, mount a persistent disk at `/var/data`,
and set `DB_PATH=/var/data/ecommerce.db`.

## Project layout

```
.
├── render.yaml                           # Render blueprint
├── schema.sql / seed.sql / queries.sql   # database
├── build_db.js                           # create/seed ecommerce.db
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

`ecommerce.db` is generated at runtime and is not committed.

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

Prices, shipping ($5 under $100, free above), and 8% tax are calculated
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
