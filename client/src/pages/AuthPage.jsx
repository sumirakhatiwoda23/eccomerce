import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function AuthPage({ mode }) {
  const isLogin = mode === 'login'
  const { login, register } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from || '/'

  const [form, setForm] = useState({ fullName: '', email: '', password: '' })
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')

  const update = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const submit = async (event) => {
    event.preventDefault()
    setStatus('submitting')
    setError('')

    try {
      if (isLogin) {
        await login(form.email, form.password)
      } else {
        await register({
          fullName: form.fullName,
          email: form.email,
          password: form.password,
        })
      }
      navigate(from, { replace: true })
    } catch (err) {
      setError(err.message)
      setStatus('idle')
    }
  }

  return (
    <div className="shell section auth-wrap">
      <div className="auth-card">
        <p className="eyebrow">{isLogin ? 'Welcome back' : 'New account'}</p>
        <h1>{isLogin ? 'Sign in' : 'Create an account'}</h1>
        <p className="muted">
          {isLogin
            ? 'Sign in to check out faster and keep your orders in one place.'
            : 'Save your details and track every order from your account.'}
        </p>

        <form onSubmit={submit}>
          {!isLogin && (
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
          )}

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

          <label className="field">
            <span>Password</span>
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={update}
              required
              minLength={isLogin ? undefined : 8}
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              placeholder={isLogin ? 'Your password' : 'At least 8 characters'}
            />
          </label>

          {error && <div className="notice notice-error">{error}</div>}

          <button
            type="submit"
            className="btn btn-large btn-block"
            disabled={status === 'submitting'}
          >
            {status === 'submitting'
              ? isLogin
                ? 'Signing in…'
                : 'Creating account…'
              : isLogin
                ? 'Sign in'
                : 'Create account'}
          </button>
        </form>

        <p className="auth-switch">
          {isLogin ? (
            <>
              No account yet?{' '}
              <Link to="/register" state={{ from }}>
                Create one
              </Link>
            </>
          ) : (
            <>
              Already registered?{' '}
              <Link to="/login" state={{ from }}>
                Sign in
              </Link>
            </>
          )}
        </p>

        {isLogin && (
          <div className="demo-hint">
            <strong>Demo account</strong>
            <span>ada@example.com · password123</span>
          </div>
        )}
      </div>
    </div>
  )
}
