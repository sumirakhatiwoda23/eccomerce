import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext.jsx'
import { formatMoney, productEmoji } from '../lib/format.js'

export default function CartDrawer() {
  const { items, isOpen, close, setQuantity, remove, subtotalCents } = useCart()

  if (!isOpen) return null

  const shipping = subtotalCents >= 10000 ? 0 : 500
  const tax = Math.round(subtotalCents * 0.08)

  return (
    <div className="drawer-root">
      <button type="button" className="drawer-backdrop" aria-label="Close cart" onClick={close} />

      <aside className="drawer" role="dialog" aria-modal="true" aria-label="Shopping cart">
        <div className="drawer-header">
          <h2>Your cart</h2>
          <button type="button" className="icon-button" onClick={close} aria-label="Close cart">
            ✕
          </button>
        </div>

        {items.length === 0 ? (
          <div className="drawer-empty">
            <p>Your cart is empty.</p>
            <button type="button" className="btn" onClick={close}>
              Keep shopping
            </button>
          </div>
        ) : (
          <>
            <ul className="cart-list">
              {items.map((item) => (
                <li key={item.productId} className="cart-item">
                  <span className="cart-thumb" aria-hidden="true">
                    {productEmoji(item)}
                  </span>
                  <div className="cart-item-main">
                    <p className="cart-item-name">{item.name}</p>
                    <p className="muted">{formatMoney(item.priceCents)} each</p>
                  </div>
                  <div className="qty">
                    <button
                      type="button"
                      onClick={() => setQuantity(item.productId, item.quantity - 1)}
                      aria-label={`Decrease ${item.name}`}
                    >
                      −
                    </button>
                    <span>{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => setQuantity(item.productId, item.quantity + 1)}
                      disabled={item.quantity >= item.stock}
                      aria-label={`Increase ${item.name}`}
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    className="link-button"
                    onClick={() => remove(item.productId)}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>

            <div className="drawer-summary">
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
                <span>{formatMoney(subtotalCents + shipping + tax)}</span>
              </div>
              <p className="muted small">
                Free shipping on orders over {formatMoney(10000)}.
              </p>
              <Link to="/checkout" className="btn btn-block" onClick={close}>
                Checkout
              </Link>
            </div>
          </>
        )}
      </aside>
    </div>
  )
}
