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
// only. Without this, a user who logged in WITHOUT "Remember me" would be
// sent to the Login page in the new tab. If this tab has no session but was
// opened by a PDRA tab that does, copy that session over. It's kept in this
// tab's sessionStorage, so it still ends when this tab is closed — the same
// "Remember me unchecked" behavior as the original tab.
let adoptedFromOpener = false
function adoptSessionFromOpener() {
  if (adoptedFromOpener) return
  adoptedFromOpener = true
  try {
    if (window.localStorage.getItem('drrmis_token') || window.sessionStorage.getItem('drrmis_token')) return
    const opener = window.opener
    if (!opener || opener.location.origin !== window.location.origin) return
    const token = opener.sessionStorage.getItem('drrmis_token')
    const user = opener.sessionStorage.getItem('drrmis_user')
    if (token && user) {
      window.sessionStorage.setItem('drrmis_token', token)
      window.sessionStorage.setItem('drrmis_user', user)
    }
  } catch {
    // Opener closed or not accessible — nothing to adopt; normal login applies.
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