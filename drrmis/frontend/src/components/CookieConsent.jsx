import { useState, useEffect, useRef } from 'react'
import { X, Cookie, ShieldCheck, UserCheck, Ban } from 'lucide-react'

// Cookie & storage notice for the login page (Data Privacy Act of 2012,
// RA 10173: tell users what is stored on their device, and let them choose).
//
// PDRA stores only:
//  - Essential: the sign-in session token (needed to use the system).
//  - Preferences: the last username and the Remember me choice.
// No ads, analytics or tracking cookies are used.
//
// "Accept" allows preferences; "Decline" keeps essential storage only (the
// login page then won't remember the username or keep you signed in).

export const CONSENT_KEY = 'pdra_cookie_consent' // 'all' | 'essential'

export function getConsent() {
  try { return localStorage.getItem(CONSENT_KEY) } catch { return null }
}
export const preferencesAllowed = () => getConsent() !== 'essential'

export default function CookieConsent({ onChange }) {
  const [consent, setConsent] = useState(getConsent)
  const [showPolicy, setShowPolicy] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const acceptRef = useRef(null)

  // Policy window: Esc closes it, and focus moves into it.
  useEffect(() => {
    if (!showPolicy) return
    acceptRef.current?.focus()
    const onKey = (e) => { if (e.key === 'Escape') setShowPolicy(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [showPolicy])

  if (consent) return null

  const choose = (value) => {
    try { localStorage.setItem(CONSENT_KEY, value) } catch { /* storage blocked */ }
    onChange?.(value)
    setShowPolicy(false)
    // Let the bar slide away before removing it.
    setLeaving(true)
    setTimeout(() => setConsent(value), 250)
  }

  return (
    <>
      {/* Floating bar along the bottom — slides up shortly after the page opens */}
      <div
        role="region"
        aria-label="Cookie notice"
        className={`fixed inset-x-0 bottom-0 z-50 p-3 sm:p-5 pointer-events-none transition-all duration-300 ${leaving ? 'opacity-0 translate-y-6' : 'animate-cookie-up'}`}
      >
        <div className="pointer-events-auto mx-auto max-w-4xl bg-white border border-gray-200 rounded-2xl shadow-2xl shadow-blue-950/10 px-4 py-4 sm:px-6 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
            <span className="w-9 h-9 rounded-full bg-primary-50 flex items-center justify-center flex-shrink-0" aria-hidden="true">
              <Cookie size={17} className="text-primary-600" />
            </span>
            <p className="text-sm text-gray-600 leading-relaxed">
              We use essential storage only to keep you signed in. No analytics.{' '}
              <span className="whitespace-nowrap">
                See{' '}
                <button type="button" onClick={() => setShowPolicy(true)} className="text-primary-600 font-medium underline underline-offset-2 decoration-primary-300 hover:decoration-primary-600 transition-colors rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
                  Cookie Policy
                </button>.
              </span>
            </p>
          </div>
          <div className="grid grid-cols-2 sm:flex gap-2 flex-shrink-0">
            <button type="button" onClick={() => choose('essential')} className="btn-secondary text-sm px-5 py-2 active:scale-[0.98] transition-all">Decline</button>
            <button type="button" onClick={() => choose('all')} className="btn-primary text-sm px-5 py-2 shadow-sm shadow-primary-600/20 active:scale-[0.98] transition-all">Accept</button>
          </div>
        </div>
      </div>

      {/* Cookie Policy window */}
      {showPolicy && (
        <div className="fixed inset-0 z-[60] bg-gray-900/40 backdrop-blur-[2px] flex items-end sm:items-center justify-center p-3 sm:p-4 animate-fade-in" onClick={() => setShowPolicy(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto animate-modal-in" role="dialog" aria-modal="true" aria-labelledby="cookie-policy-title" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-4 px-6 pt-5 pb-3 border-b border-gray-100">
              <h2 id="cookie-policy-title" className="text-lg font-semibold text-gray-800">Cookie Policy</h2>
              <button type="button" onClick={() => setShowPolicy(false)} aria-label="Close" className="p-1.5 -mr-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"><X size={18} /></button>
            </div>
            <div className="px-6 py-4 space-y-4 text-sm text-gray-600 leading-relaxed">
              <p>PDRA keeps a small amount of data in your browser. It is used only by this system and is never shared.</p>
              <dl className="space-y-3">
                <div className="rounded-xl border border-gray-100 p-3">
                  <dt className="font-semibold text-gray-800 flex items-center gap-2"><ShieldCheck size={15} className="text-green-600" aria-hidden="true" /> Essential (always on)</dt>
                  <dd className="mt-1">Your sign-in session, so the system knows you're logged in. You can't use PDRA without it.</dd>
                </div>
                <div className="rounded-xl border border-gray-100 p-3">
                  <dt className="font-semibold text-gray-800 flex items-center gap-2"><UserCheck size={15} className="text-primary-600" aria-hidden="true" /> Preferences (only if you accept)</dt>
                  <dd className="mt-1">Your last username and your Remember me choice, so signing in is quicker. If you decline, these aren't saved and Remember me is turned off.</dd>
                </div>
                <div className="rounded-xl border border-gray-100 p-3">
                  <dt className="font-semibold text-gray-800 flex items-center gap-2"><Ban size={15} className="text-gray-400" aria-hidden="true" /> Not used</dt>
                  <dd className="mt-1">No advertising, analytics or tracking cookies.</dd>
                </div>
              </dl>
              <p className="text-xs text-gray-400">Personal data in PDRA is handled in accordance with the Data Privacy Act of 2012 (RA 10173).</p>
            </div>
            <div className="flex justify-end gap-2 px-6 pb-5">
              <button type="button" onClick={() => choose('essential')} className="btn-secondary text-sm px-5 py-2">Decline</button>
              <button ref={acceptRef} type="button" onClick={() => choose('all')} className="btn-primary text-sm px-5 py-2">Accept</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}