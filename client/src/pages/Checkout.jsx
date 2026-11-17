import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api.js'
import { useCart } from '../context/CartContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { formatMoney, productEmoji } from '../lib/format.js'

const STORAGE_KEY = 'nimbus.customer.v1'

function loadCustomer() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? {}
  } catch {
    return {}
  }
}

const EMPTY_FORM = {
  fullName: '',
  email: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'US',
}

export default function Checkout() {
  const { items, subtotalCents, clear } = useCart()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState(() => ({ ...EMPTY_FORM, ...loadCustomer() }))
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [order, setOrder] = useState(null)

  useEffect(() => {
    if (user) {
      setForm((prev) => ({ ...prev, fullName: user.fullName, email: user.email }))
    }
  }, [user])

  const shipping = subtotalCents >= 10000 ? 0 : 500
  const tax = Math.round(subtotalCents * 0.08)
  const total = subtotalCents + shipping + tax

  const update = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const submit = async (event) => {
    event.preventDefault()
    setStatus('submitting')
    setError('')

    try {
      const created = await api.checkout({
        email: form.email,
        fullName: form.fullName,
        address: {
          line1: form.line1,
          line2: form.line2,
          city: form.city,
          state: form.state,
          postalCode: form.postalCode,
          country: form.country,
        },
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      })

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          fullName: form.fullName,
          email: form.email,
          line1: form.line1,
          line2: form.line2,
          city: form.city,
          state: form.state,
          postalCode: form.postalCode,
          country: form.country,
        }),
      )

      setOrder(created)
      setStatus('done')
      clear()
    } catch (err) {
      setError(err.message)
      setStatus('idle')
    }
  }

  if (status === 'done' && order) {
    return (
      <div className="shell section narrow">
        <div className="confirmation">
          <span className="confirmation-mark" aria-hidden="true">
            ✓
          </span>
          <p className="eyebrow">Order #{order.orderId}</p>
          <h1>Thanks — your order is confirmed.</h1>
          <p className="lede">
            A simulated payment of {formatMoney(order.totalCents)} was captured. You can
            look up this order any time from the Orders page.
          </p>
          <div className="confirmation-lines">
            {order.items.map((item) => (
              <div key={item.productId} className="summary-row">
                <span>
                  {item.quantity} × {item.name}
                </span>
                <span>{formatMoney(item.lineTotalCents)}</span>
              </div>
            ))}
            <div className="summary-row summary-total">
              <span>Total</span>
              <span>{formatMoney(order.totalCents)}</span>
            </div>
          </div>
          <div className="confirmation-actions">
            <Link to="/orders" className="btn">
              View my orders
            </Link>
            <Link to="/" className="btn btn-ghost">
              Continue shopping
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="shell section narrow">
        <div className="empty-state">
          <h1>Your cart is empty</h1>
          <p className="lede">Add something to the cart before checking out.</p>
          <button type="button" className="btn" onClick={() => navigate('/')}>
            Browse the catalog
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="shell section">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link to="/">Shop</Link>
        <span aria-hidden="true">/</span>
        <span>Checkout</span>
      </nav>

      <h1 className="page-title">Checkout</h1>

      <div className="checkout-layout">
        <form className="form-card" onSubmit={submit}>
          <h2>Contact</h2>
          {user ? (
            <div className="account-note">
              <div>
                <strong>{user.fullName}</strong>
                <p className="muted small">{user.email}</p>
              </div>
              <span className="badge badge-ok">Signed in</span>
            </div>
          ) : (
            <>
              <div className="field-grid">
                <label className="field">
                  <span>Full name</span>
                  <input
                    name="fullName"
                    value={form.fullName}
                    onChange={update}
                    required
                    minLength={2}
                    autoComplete="name"
                  />
                </label>
                <label className="field">
                  <span>Email</span>
                  <input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={update}
                    required
                    autoComplete="email"
                    placeholder="you@example.com"
                  />
                </label>
              </div>
              <p className="muted small checkout-signin">
                Have an account?{' '}
                <Link to="/login" state={{ from: '/checkout' }}>
                  Sign in
                </Link>{' '}
                to check out faster.
              </p>
            </>
          )}

          <h2>Shipping address</h2>
          <div className="field-grid">
            <label className="field field-wide">
              <span>Street address</span>
              <input
                name="line1"
                value={form.line1}
                onChange={update}
                required
                autoComplete="address-line1"
              />
            </label>
            <label className="field field-wide">
              <span>Apartment, suite, etc. (optional)</span>
              <input
                name="line2"
                value={form.line2}
                onChange={update}
                autoComplete="address-line2"
              />
            </label>
            <label className="field">
              <span>City</span>
              <input
                name="city"
                value={form.city}
                onChange={update}
                required
                autoComplete="address-level2"
              />
            </label>
            <label className="field">
              <span>State / region</span>
              <input
                name="state"
                value={form.state}
                onChange={update}
                autoComplete="address-level1"
              />
            </label>
            <label className="field">
              <span>Postal code</span>
              <input
                name="postalCode"
                value={form.postalCode}
                onChange={update}
                autoComplete="postal-code"
              />
            </label>
            <label className="field">
              <span>Country</span>
              <input
                name="country"
                value={form.country}
                onChange={update}
                required
                minLength={2}
                maxLength={2}
                autoComplete="country"
              />
            </label>
          </div>

          {error && <div className="notice notice-error">{error}</div>}

          <button type="submit" className="btn btn-large btn-block" disabled={status === 'submitting'}>
            {status === 'submitting' ? 'Placing order…' : `Pay ${formatMoney(total)}`}
          </button>
          <p className="muted small">
            Demo checkout — no real payment is processed.
          </p>
        </form>

        <aside className="summary-card">
          <h2>Order summary</h2>
          <ul className="cart-list compact">
            {items.map((item) => (
              <li key={item.productId} className="cart-item">
                <span className="cart-thumb" aria-hidden="true">
                  {productEmoji(item)}
                </span>
                <div className="cart-item-main">
                  <p className="cart-item-name">{item.name}</p>
                  <p className="muted small">Qty {item.quantity}</p>
                </div>
                <span>{formatMoney(item.priceCents * item.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="summary-row">
            <span>Subtotal</span>
            <span>{formatMoney(subtotalCents)}</span>
          </div>
          <div className="summary-row">
            <span>Shipping</span>
            <span>{shipping === 0 ? 'Free' : formatMoney(shipping)}</span>
          </div>
          <div className="summary-row">
            <span>Tax (8%)</span>
            <span>{formatMoney(tax)}</span>
          </div>
          <div className="summary-row summary-total">
            <span>Total</span>
            <span>{formatMoney(total)}</span>
          </div>
        </aside>
      </div>
    </div>
  )
}
