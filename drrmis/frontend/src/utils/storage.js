// "Remember me" storage strategy — mirrors how Facebook and most sites do
// it: checked = localStorage (survives closing the browser entirely,
// persists until the token expires or the user logs out). Unchecked =
// sessionStorage (cleared the moment the browser/tab is closed — behaves
// like a plain, non-persistent session). We never store the password
// itself anywhere, only the session token and basic user info.

function hasWindow() {
  return typeof window !== 'undefined' && window.localStorage && window.sessionStorage
}

// A tab opened FROM the system (e.g. "Open Big-Screen Display Mode") starts
// with an empty sessionStorage, because sessionStorage belongs to one tab
// only — so a user who logged in WITHOUT "Remember me" would be sent to the
// Login page in the new tab.
//
// Fix: right before opening the tab, the button calls prepareSessionHandoff(),
// which puts a copy of this tab's session in localStorage (shared by all tabs
// of the system) for 15 seconds only. The new tab picks it up on load, keeps
// it in ITS OWN sessionStorage (so it still ends when that tab is closed —
// same "Remember me unchecked" behavior), and deletes the handoff at once.
// As a fallback it can also read the session from window.opener.
const HANDOFF_KEY = 'drrmis_session_handoff'
const HANDOFF_TTL_MS = 15000

export function prepareSessionHandoff() {
  if (!hasWindow()) return
  try {
    const token = window.sessionStorage.getItem('drrmis_token')
    const user = window.sessionStorage.getItem('drrmis_user')
    // Only needed for sessionStorage logins — "Remember me" logins are
    // already in localStorage and visible to every tab.
    if (token && user) {
      window.localStorage.setItem(HANDOFF_KEY, JSON.stringify({ token, user, expires: Date.now() + HANDOFF_TTL_MS }))
    }
  } catch { /* storage unavailable — the new tab will just ask to log in */ }
}

let adoptChecked = false
function adoptSessionFromOpener() {
  if (adoptChecked) return
  adoptChecked = true
  try {
    const raw = window.localStorage.getItem(HANDOFF_KEY)
    if (raw) window.localStorage.removeItem(HANDOFF_KEY) // one-time use, always cleaned up
    if (window.localStorage.getItem('drrmis_token') || window.sessionStorage.getItem('drrmis_token')) return

    // 1) Handoff left by the button that opened this tab
    if (raw) {
      const h = JSON.parse(raw)
      if (h && h.token && h.user && h.expires > Date.now()) {
        window.sessionStorage.setItem('drrmis_token', h.token)
        window.sessionStorage.setItem('drrmis_user', h.user)
        return
      }
    }
    // 2) Fallback: read directly from the tab that opened this one
    const opener = window.opener
    if (!opener || opener.location.origin !== window.location.origin) return
    const token = opener.sessionStorage.getItem('drrmis_token')
    const user = opener.sessionStorage.getItem('drrmis_user')
    if (token && user) {
      window.sessionStorage.setItem('drrmis_token', token)
      window.sessionStorage.setItem('drrmis_user', user)
    }
  } catch {
    // Nothing usable to adopt — normal login applies.
  }
}

export function getStoredUser() {
  if (!hasWindow()) return null
  adoptSessionFromOpener()
  try {
    const saved = window.localStorage.getItem('drrmis_user') || window.sessionStorage.getItem('drrmis_user')
    if (!saved) return null
    const parsed = JSON.parse(saved)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    window.localStorage.removeItem('drrmis_user')
    window.sessionStorage.removeItem('drrmis_user')
    return null
  }
}

export function setStoredUser(user, remember = true) {
  if (!hasWindow()) return
  const json = JSON.stringify(user)
  if (remember) {
    window.localStorage.setItem('drrmis_user', json)
    window.sessionStorage.removeItem('drrmis_user')
  } else {
    window.sessionStorage.setItem('drrmis_user', json)
    window.localStorage.removeItem('drrmis_user')
  }
}

export function clearStoredUser() {
  if (!hasWindow()) return
  window.localStorage.removeItem('drrmis_user')
  window.sessionStorage.removeItem('drrmis_user')
}

export function getStoredToken() {
  if (!hasWindow()) return null
  adoptSessionFromOpener()
  return window.localStorage.getItem('drrmis_token') || window.sessionStorage.getItem('drrmis_token')
}

export function setStoredToken(token, remember = true) {
  if (!hasWindow()) return
  if (remember) {
    window.localStorage.setItem('drrmis_token', token)
    window.sessionStorage.removeItem('drrmis_token')
  } else {
    window.sessionStorage.setItem('drrmis_token', token)
    window.localStorage.removeItem('drrmis_token')
  }
}

export function clearStoredToken() {
  if (!hasWindow()) return
  window.localStorage.removeItem('drrmis_token')
  window.sessionStorage.removeItem('drrmis_token')
}