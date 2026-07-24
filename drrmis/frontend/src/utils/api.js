const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

function getToken() {
  return localStorage.getItem('drrmis_token')
}

async function request(endpoint, options = {}) {
  const token = getToken()
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }

  const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers })

  let data
  try {
    data = await res.json()
  } catch {
    data = null
  }

  if (!res.ok) {
    throw new Error(data?.error || `Request failed (${res.status})`)
  }

  return data
}

export const apiGet    = (endpoint) => request(endpoint, { method: 'GET' })
export const apiPost   = (endpoint, body) => request(endpoint, { method: 'POST', body: JSON.stringify(body) })
export const apiPut    = (endpoint, body) => request(endpoint, { method: 'PUT', body: JSON.stringify(body) })
export const apiDelete = (endpoint) => request(endpoint, { method: 'DELETE' })