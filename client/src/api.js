const BASE = '/api'

async function request(path, { signal, ...options } = {}) {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    signal,
    ...options,
  })

  const data = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(data?.error || `Request failed (${res.status})`)
  }
  return data
}

export const api = {
  products({ category, q, sort } = {}, options = {}) {
    const params = new URLSearchParams()
    if (category) params.set('category', category)
    if (q) params.set('q', q)
    if (sort) params.set('sort', sort)
    const query = params.toString()
    return request(`/products${query ? `?${query}` : ''}`, options)
  },

  product(id, options = {}) {
    return request(`/products/${id}`, options)
  },

  categories(options = {}) {
    return request('/categories', options)
  },

  checkout(payload) {
    return request('/orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  orders(email, options = {}) {
    return request(`/orders?email=${encodeURIComponent(email)}`, options)
  },

  me(options = {}) {
    return request('/auth/me', options)
  },

  login(email, password) {
    return request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  },

  register(payload) {
    return request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  logout() {
    return request('/auth/logout', { method: 'POST' })
  },
}
