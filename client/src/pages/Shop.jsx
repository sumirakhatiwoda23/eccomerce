import { useEffect, useState } from 'react'
import { api } from '../api.js'
import ProductCard from '../components/ProductCard.jsx'

const SORT_OPTIONS = [
  { value: 'featured', label: 'Featured' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'rating', label: 'Top rated' },
  { value: 'name', label: 'Name A–Z' },
]

export default function Shop() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [category, setCategory] = useState('')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('featured')
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    api.categories().then(setCategories).catch(() => {})
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    const timer = setTimeout(
      () => {
        setStatus('loading')
        api
          .products(
            {
              category: category || undefined,
              q: query.trim() || undefined,
              sort,
            },
            { signal: controller.signal },
          )
          .then((data) => {
            setProducts(data)
            setStatus('ready')
          })
          .catch((err) => {
            if (err.name === 'AbortError') return
            setError(err.message)
            setStatus('error')
          })
      },
      query ? 250 : 0,
    )

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [category, query, sort])

  return (
    <>
      <section className="hero">
        <div className="shell hero-inner">
          <div className="hero-copy">
            <p className="eyebrow">Small-batch everyday goods</p>
            <h1>Things you'll actually use, made to last.</h1>
            <p className="lede">
              A small catalog of desk, audio, kitchen and reading essentials — served
              straight from a SQLite database.
            </p>
            <div className="hero-stats">
              <div>
                <strong>12</strong>
                <span>products</span>
              </div>
              <div>
                <strong>5</strong>
                <span>categories</span>
              </div>
              <div>
                <strong>Free</strong>
                <span>shipping over $100</span>
              </div>
            </div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <span>🖱️</span>
            <span>🎧</span>
            <span>☕</span>
            <span>📚</span>
          </div>
        </div>
      </section>

      <section className="shell section" id="catalog">
        <div className="section-head">
          <div>
            <p className="eyebrow">Catalog</p>
            <h2>Shop everything</h2>
          </div>

          <div className="sort">
            <label htmlFor="sort">Sort</label>
            <select id="sort" value={sort} onChange={(event) => setSort(event.target.value)}>
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="toolbar">
          <div className="chips">
            <button
              type="button"
              className={`chip${category === '' ? ' is-active' : ''}`}
              onClick={() => setCategory('')}
            >
              All
            </button>
            {categories.map((item) => (
              <button
                key={item.slug}
                type="button"
                className={`chip${category === item.slug ? ' is-active' : ''}`}
                onClick={() => setCategory(item.slug)}
              >
                {item.name}
                <span className="chip-count">{item.productCount}</span>
              </button>
            ))}
          </div>

          <div className="search">
            <span aria-hidden="true">🔍</span>
            <input
              type="search"
              placeholder="Search products…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Search products"
            />
          </div>
        </div>

        {status === 'error' ? (
          <div className="notice notice-error">Couldn't load products: {error}</div>
        ) : status === 'loading' ? (
          <div className="grid" aria-hidden="true">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="card skeleton" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="notice">
            No products match your filters.{' '}
            <button
              type="button"
              className="link-button"
              onClick={() => {
                setCategory('')
                setQuery('')
              }}
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </>
  )
}
