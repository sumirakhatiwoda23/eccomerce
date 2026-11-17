import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api.js'
import { useCart } from '../context/CartContext.jsx'
import { formatDate, formatMoney, productEmoji } from '../lib/format.js'

export default function ProductPage() {
  const { id } = useParams()
  const { add } = useCart()
  const [product, setProduct] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    setStatus('loading')
    setQuantity(1)
    api
      .product(id, { signal: controller.signal })
      .then((data) => {
        setProduct(data)
        setStatus('ready')
      })
      .catch((err) => {
        if (err.name === 'AbortError') return
        setError(err.message)
        setStatus('error')
      })
    return () => controller.abort()
  }, [id])

  if (status === 'loading') {
    return (
      <div className="shell section">
        <div className="product-layout">
          <div className="product-media skeleton" />
          <div className="skeleton skeleton-lines" />
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="shell section">
        <div className="notice notice-error">{error}</div>
        <Link to="/" className="btn">
          Back to shop
        </Link>
      </div>
    )
  }

  const soldOut = product.stock === 0
  const maxQuantity = Math.min(product.stock, 10)

  return (
    <div className="shell section">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link to="/">Shop</Link>
        <span aria-hidden="true">/</span>
        <span>{product.category}</span>
      </nav>

      <div className="product-layout">
        <div className="product-media">
          <span className="product-emoji" aria-hidden="true">
            {productEmoji(product)}
          </span>
          {soldOut && <span className="badge badge-soldout">Sold out</span>}
        </div>

        <div className="product-info">
          <p className="eyebrow">{product.category}</p>
          <h1>{product.name}</h1>
          <div className="rating">
            <span aria-hidden="true">
              {'★'.repeat(Math.round(product.avgRating))}
              <span className="rating-empty">
                {'★'.repeat(5 - Math.round(product.avgRating))}
              </span>
            </span>
            <span className="rating-text">
              {product.reviewCount > 0
                ? `${product.avgRating.toFixed(1)} · ${product.reviewCount} review${
                    product.reviewCount === 1 ? '' : 's'
                  }`
                : 'No reviews yet'}
            </span>
          </div>

          <p className="product-description">{product.description}</p>
          <p className="product-price">{formatMoney(product.priceCents)}</p>

          <p className="stock-line">
            {soldOut ? (
              <span className="badge badge-soldout">Out of stock</span>
            ) : product.stock < 15 ? (
              <span className="badge badge-low">Only {product.stock} left</span>
            ) : (
              <span className="badge badge-ok">In stock · {product.stock} available</span>
            )}
          </p>

          <div className="buy-row">
            <div className="qty qty-large">
              <button
                type="button"
                onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                disabled={soldOut || quantity <= 1}
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span>{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((value) => Math.min(maxQuantity, value + 1))}
                disabled={soldOut || quantity >= maxQuantity}
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
            <button
              type="button"
              className="btn btn-large"
              disabled={soldOut}
              onClick={() => add(product, quantity)}
            >
              Add to cart
            </button>
          </div>

          <ul className="meta-list">
            <li>SKU {product.sku}</li>
            <li>Free shipping on orders over $100</li>
            <li>30-day returns</li>
          </ul>
        </div>
      </div>

      <section className="reviews">
        <h2>Reviews</h2>
        {product.reviews.length === 0 ? (
          <p className="muted">No reviews yet.</p>
        ) : (
          <ul className="review-list">
            {product.reviews.map((review, index) => (
              <li key={index} className="review">
                <div className="review-head">
                  <strong>{review.author}</strong>
                  <span className="rating-text" aria-label={`${review.rating} out of 5`}>
                    {'★'.repeat(review.rating)}
                    <span className="rating-empty">{'★'.repeat(5 - review.rating)}</span>
                  </span>
                </div>
                {review.title && <p className="review-title">{review.title}</p>}
                <p>{review.body}</p>
                <time className="muted small">{formatDate(review.createdAt)}</time>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
