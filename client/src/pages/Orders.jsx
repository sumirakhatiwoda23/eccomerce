import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api.js'
import { useAuth } from '../context/AuthContext.jsx'
import { STATUS_LABELS, formatDate, formatMoney } from '../lib/format.js'

const STORAGE_KEY = 'nimbus.customer.v1'

function lastEmail() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY))?.email ?? ''
  } catch {
    return ''
  }
}

export default function Orders() {
  const { user } = useAuth()
  const [email, setEmail] = useState(lastEmail)
  const [orders, setOrders] = useState(null)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')

  const load = useCallback(async (address) => {
    setStatus('loading')
    setError('')
    try {
      const data = await api.orders(address)
      setOrders(data)
      setStatus('ready')
    } catch (err) {
      setError(err.message)
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    if (user) {
      setEmail(user.email)
      load(user.email)
    } else {
      setOrders(null)
      setStatus('idle')
    }
  }, [user, load])

  const submit = (event) => {
    event.preventDefault()
    load(email)
  }

  return (
    <div className="shell section narrow">
      <p className="eyebrow">Order history</p>
      <h1 className="page-title">{user ? `Your orders, ${user.fullName.split(' ')[0]}` : 'Find your orders'}</h1>

      {user ? (
        <div className="account-note">
          <div>
            <strong>{user.email}</strong>
            <p className="muted small">Signed in · orders update automatically</p>
          </div>
          <button
            type="button"
            className="btn btn-small btn-ghost"
            onClick={() => load(user.email)}
            disabled={status === 'loading'}
          >
            Refresh
          </button>
        </div>
      ) : (
        <>
          <p className="lede">
            Sign in to see your orders automatically, or look them up with the email you
            used at checkout.
          </p>

          <form className="inline-form" onSubmit={submit}>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
              aria-label="Email address"
            />
            <button type="submit" className="btn" disabled={status === 'loading'}>
              {status === 'loading' ? 'Looking up…' : 'Find orders'}
            </button>
          </form>

          <p className="muted small">
            <Link to="/login" state={{ from: '/orders' }}>
              Sign in
            </Link>{' '}
            to skip this step next time.
          </p>
        </>
      )}

      {error && <div className="notice notice-error">{error}</div>}

      {status === 'ready' && orders.length === 0 && (
        <div className="notice">
          No orders found{user ? ' for your account yet' : <> for <strong>{email}</strong></>}.
        </div>
      )}

      {status === 'ready' && orders.length > 0 && (
        <ul className="order-list">
          {orders.map((order) => (
            <li key={order.orderId} className="order-card">
              <div className="order-head">
                <div>
                  <h2>Order #{order.orderId}</h2>
                  <p className="muted small">{formatDate(order.createdAt)}</p>
                </div>
                <span className={`badge status-${order.status}`}>
                  {STATUS_LABELS[order.status] ?? order.status}
                </span>
              </div>

              <ul className="order-items">
                {order.items.map((item) => (
                  <li key={item.productId} className="summary-row">
                    <span>
                      {item.quantity} × {item.name}
                      <span className="muted small"> ({item.sku})</span>
                    </span>
                    <span>{formatMoney(item.lineTotalCents)}</span>
                  </li>
                ))}
              </ul>

              <div className="order-total">
                <div className="summary-row">
                  <span>Subtotal</span>
                  <span>{formatMoney(order.subtotalCents)}</span>
                </div>
                <div className="summary-row">
                  <span>Shipping</span>
                  <span>{order.shippingCents === 0 ? 'Free' : formatMoney(order.shippingCents)}</span>
                </div>
                <div className="summary-row">
                  <span>Tax</span>
                  <span>{formatMoney(order.taxCents)}</span>
                </div>
                <div className="summary-row summary-total">
                  <span>Total</span>
                  <span>{formatMoney(order.totalCents)}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
