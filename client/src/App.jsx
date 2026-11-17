import { Link, Route, Routes } from 'react-router-dom'
import Header from './components/Header.jsx'
import CartDrawer from './components/CartDrawer.jsx'
import Shop from './pages/Shop.jsx'
import ProductPage from './pages/ProductPage.jsx'
import Checkout from './pages/Checkout.jsx'
import Orders from './pages/Orders.jsx'
import AuthPage from './pages/AuthPage.jsx'

function NotFound() {
  return (
    <div className="shell section narrow empty-state">
      <h1>Page not found</h1>
      <p className="lede">That page doesn't exist.</p>
      <Link to="/" className="btn">
        Back to shop
      </Link>
    </div>
  )
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="shell footer-inner">
        <div>
          <p className="brand-name">Nimbus Supply</p>
          <p className="muted small">
            A demo storefront built with React, Express and SQLite.
          </p>
        </div>
        <nav className="footer-nav" aria-label="Footer">
          <Link to="/">Shop</Link>
          <Link to="/orders">Orders</Link>
          <a href="https://sqlite.org" target="_blank" rel="noreferrer">
            SQLite
          </a>
        </nav>
      </div>
    </footer>
  )
}

export default function App() {
  return (
    <div className="app">
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<Shop />} />
          <Route path="/product/:id" element={<ProductPage />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/register" element={<AuthPage mode="register" />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <CartDrawer />
      <Footer />
    </div>
  )
}
