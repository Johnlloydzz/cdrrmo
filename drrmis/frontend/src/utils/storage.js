// "Remember me" storage strategy — mirrors how Facebook and most sites do
// it: checked = localStorage (survives closing the browser entirely,
// persists until the token expires or the user logs out). Unchecked =
// sessionStorage (cleared the moment the browser/tab is closed — behaves
// like a plain, non-persistent session). We never store the password
// itself anywhere, only the session token and basic user info.

function hasWindow() {
  return typeof window !== 'undefined' && window.localStorage && window.sessionStorage
}

export function getStoredUser() {
  if (!hasWindow()) return null
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