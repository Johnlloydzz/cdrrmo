import { getStoredToken, clearStoredToken, clearStoredUser } from './storage'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

// Render's free tier spins the backend down after ~15 min of inactivity.
// The very first request after that can take 30-50+ seconds to "wake it up".
// We give that first attempt a generous timeout, and automatically retry once
// (by which time the server is awake and the retry resolves quickly) before
// surfacing an error to the UI.
const COLD_START_TIMEOUT_MS = 60000
const RETRY_TIMEOUT_MS = 15000

function handleSessionExpired() {
  clearStoredToken()
  clearStoredUser()
  if (window.location.pathname !== '/login') {
    window.location.href = '/login?expired=1'
  }
}

function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer))
}

async function request(endpoint, options = {}, { onColdStart } = {}) {
  const token = getStoredToken()
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }

  let res
  try {
    res = await fetchWithTimeout(`${API_URL}${endpoint}`, { ...options, headers }, COLD_START_TIMEOUT_MS)
  } catch (err) {
    // First attempt timed out or the network dropped (common right after the
    // laptop wakes from sleep, or the backend was asleep) — tell the caller
    // we're retrying so it can show a "waking up the server…" message.
    if (onColdStart) onColdStart()
    try {
      res = await fetchWithTimeout(`${API_URL}${endpoint}`, { ...options, headers }, RETRY_TIMEOUT_MS)
    } catch {
      throw new Error('Could not reach the server. Please check your internet connection and try again.')
    }
  }

  // A 401 means "your session is no longer valid" — but that only makes
  // sense if there WAS a session (a token) to begin with. The login
  // endpoint itself also returns 401 for a wrong username/password, and in
  // that case there's no token yet, so it isn't a session expiring — it's
  // just an incorrect-credentials response, and the caller (Login.jsx)
  // should see the real "Invalid credentials." message from the server
  // instead of a misleading "Session expired."
  if (res.status === 401 && token) {
    handleSessionExpired()
    throw new Error('Session expired. Please log in again.')
  }

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

export const apiGet    = (endpoint, opts)       => request(endpoint, { method: 'GET' }, opts)
export const apiPost   = (endpoint, body, opts) => request(endpoint, { method: 'POST', body: JSON.stringify(body) }, opts)
export const apiPut    = (endpoint, body, opts) => request(endpoint, { method: 'PUT', body: JSON.stringify(body) }, opts)
export const apiDelete = (endpoint, opts)       => request(endpoint, { method: 'DELETE' }, opts)