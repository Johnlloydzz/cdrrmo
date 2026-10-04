import { useState } from 'react'
import { X } from 'lucide-react'

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

  if (consent) return null

  const choose = (value) => {
    try { localStorage.setItem(CONSENT_KEY, value) } catch { /* storage blocked */ }
    setConsent(value)
    setShowPolicy(false)
    onChange?.(value)
  }

  return (
    <>
      {/* Full-width bar along the bottom of the screen */}
      <div className="fixed inset-x-0 bottom-0 z-50 bg-white border-t border-gray-200 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] animate-fade-in" role="region" aria-label="Cookie notice">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
          <p className="flex-1 text-sm text-gray-600">
            We use essential storage only to keep you signed in. No analytics. See{' '}
            <button type="button" onClick={() => setShowPolicy(true)} className="text-primary-600 font-medium underline underline-offset-2 hover:text-primary-700">
              Cookie Policy
            </button>.
          </p>
          <div className="flex gap-2 flex-shrink-0">
            <button type="button" onClick={() => choose('essential')} className="btn-secondary text-sm px-5 py-2">Decline</button>
            <button type="button" onClick={() => choose('all')} className="btn-primary text-sm px-5 py-2">Accept</button>
          </div>
        </div>
      </div>

      {/* Cookie Policy */}
      {showPolicy && (
        <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowPolicy(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6" role="dialog" aria-label="Cookie Policy" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-lg font-semibold text-gray-800">Cookie Policy</h2>
              <button type="button" onClick={() => setShowPolicy(false)} aria-label="Close" className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="mt-3 space-y-3 text-sm text-gray-600 leading-relaxed">
              <p>PDRA stores a small amount of data in your browser. It is never shared with anyone and is used only by this system.</p>
              <div>
                <p className="font-semibold text-gray-700">Essential (always on)</p>
                <p>Your sign-in session, so the system knows you're logged in. Without it you can't use PDRA.</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Preferences (only if you accept)</p>
                <p>Your last username and your "Remember me" choice, so signing in is quicker next time. If you decline, these are not saved and Remember me is turned off.</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Not used</p>
                <p>No advertising, analytics or tracking cookies.</p>
              </div>
              <p className="text-xs text-gray-400">Personal data in PDRA is handled in accordance with the Data Privacy Act of 2012 (RA 10173).</p>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button type="button" onClick={() => choose('essential')} className="btn-secondary text-sm px-5 py-2">Decline</button>
              <button type="button" onClick={() => choose('all')} className="btn-primary text-sm px-5 py-2">Accept</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}