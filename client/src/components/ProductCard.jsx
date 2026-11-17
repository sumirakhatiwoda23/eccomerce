import { Link } from 'react-router-dom'
import { formatMoney, productEmoji } from '../lib/format.js'
import { useCart } from '../context/CartContext.jsx'

function Stars({ rating, count }) {
  const rounded = Math.round(rating)
  return (
    <div className="rating" title={`${rating} out of 5`}>
      <span aria-hidden="true">
        {'★'.repeat(rounded)}
        <span className="rating-empty">{'★'.repeat(5 - rounded)}</span>
      </span>
      <span className="rating-text">
        {count > 0 ? `${rating.toFixed(1)} (${count})` : 'No reviews yet'}
      </span>
    </div>
  )
}

export default function ProductCard({ product }) {
  const { add } = useCart()
  const soldOut = product.stock === 0

  return (
    <article className={`card${soldOut ? ' is-sold-out' : ''}`}>
      <Link to={`/product/${product.id}`} className="card-media" aria-label={product.name}>
        <span className="card-emoji" aria-hidden="true">
          {productEmoji(product)}
        </span>
        {soldOut && <span className="badge badge-soldout">Sold out</span>}
      </Link>

      <div className="card-body">
        <p className="eyebrow">{product.category}</p>
        <h3 className="card-title">
          <Link to={`/product/${product.id}`}>{product.name}</Link>
        </h3>
        <p className="card-description">{product.description}</p>

        <Stars rating={product.avgRating} count={product.reviewCount} />

        <div className="card-footer">
          <span className="price">{formatMoney(product.priceCents)}</span>
          <button
            type="button"
            className="btn btn-small"
            disabled={soldOut}
            onClick={() => add(product, 1)}
          >
            {soldOut ? 'Sold out' : 'Add to cart'}
          </button>
        </div>
      </div>
    </article>
  )
}
