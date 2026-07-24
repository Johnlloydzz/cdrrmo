export function getStoredUser() {
  if (typeof window === 'undefined' || !window.localStorage) return null

  try {
    const saved = window.localStorage.getItem('drrmis_user')
    if (!saved) return null

    const parsed = JSON.parse(saved)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    window.localStorage.removeItem('drrmis_user')
    return null
  }
}

export function setStoredUser(user) {
  if (typeof window === 'undefined' || !window.localStorage) return
  window.localStorage.setItem('drrmis_user', JSON.stringify(user))
}

export function clearStoredUser() {
  if (typeof window === 'undefined' || !window.localStorage) return
  window.localStorage.removeItem('drrmis_user')
}
