import { useEffect } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useCart } from '../context/CartContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'

export default function Header() {
  const { count, open } = useCart()
  const { user, logout } = useAuth()
  const location = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [location.pathname])

  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Link to="/" className="brand" aria-label="Nimbus Supply home">
          <span className="brand-mark">N</span>
          <span className="brand-name">Nimbus Supply</span>
        </Link>

        <nav className="nav">
          <NavLink to="/" end className="nav-link">
            Shop
          </NavLink>
          <NavLink to="/orders" className="nav-link">
            Orders
          </NavLink>
        </nav>

        <div className="header-actions">
          {user ? (
            <div className="account">
              <span className="account-name" title={user.email}>
                {user.fullName.split(' ')[0]}
              </span>
              <button type="button" className="link-button" onClick={logout}>
                Sign out
              </button>
            </div>
          ) : (
            <NavLink
              to="/login"
              state={{ from: location.pathname }}
              className="nav-link signin-link"
            >
              Sign in
            </NavLink>
          )}

          <button type="button" className="cart-button" onClick={open}>
            <span>Cart</span>
            {count > 0 && <span className="cart-count">{count}</span>}
          </button>
        </div>
      </div>
    </header>
  )
}
