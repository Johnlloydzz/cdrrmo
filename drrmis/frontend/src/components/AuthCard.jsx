import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Check, Shield } from 'lucide-react'

// Shared frame for the public auth pages (Request an Account, Request a
// Password Reset): blue background, PDRA badge, white card, Back to Login.
export default function AuthCard({ maxWidth = 'max-w-lg', stagger = true, children }) {
  // The card's contents rise in one by one when the page opens; after that
  // ("settled") anything new — an error, the success panel — uses its own
  // quick animation instead of waiting in the stagger.
  const settled = useSettled()
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 flex items-center justify-center px-4 py-8">
      <div className={`w-full ${maxWidth}`}>
        <div className="text-center mb-4">
          <div style={{ '--d': '0ms' }} className="land-pop inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white shadow-lg">
            <Shield size={18} className="text-primary-700" aria-hidden="true" />
          </div>
          <p style={{ '--d': '80ms' }} className="land-in text-sm font-bold text-white mt-2 leading-tight">PDRA</p>
          <p style={{ '--d': '130ms' }} className="land-in text-blue-200 text-xs">Gingoog City CDRRMO</p>
        </div>

        <div style={{ '--d': '180ms' }} className="land-in bg-white rounded-2xl shadow-2xl p-5 sm:p-7">
          <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 mb-3">
            <ArrowLeft size={14} aria-hidden="true" /> Back to Login
          </Link>
          <div className={stagger ? `stagger-in${settled ? ' settled' : ''}` : undefined} style={{ '--base': '300ms' }}>
            {children}
          </div>
        </div>

        <p style={{ '--d': '450ms' }} className="land-in text-center text-blue-200/80 text-xs mt-5">
          © {new Date().getFullYear()} Gingoog City CDRRMO. All rights reserved.
        </p>
      </div>
    </div>
  )
}

// True ~1.3s after mount — once the entrance stagger has finished.
export function useSettled(ms = 1300) {
  const [settled, setSettled] = useState(false)
  useEffect(() => { const t = setTimeout(() => setSettled(true), ms); return () => clearTimeout(t) }, [ms])
  return settled
}

// Field label with a red * for required fields.
export function FieldLabel({ htmlFor, required, children, hint }) {
  return (
    <label htmlFor={htmlFor} className="flex items-baseline justify-between text-sm font-medium text-gray-700 mb-1">
      <span>{children}{required && <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>}</span>
      {hint && <span className="text-xs font-normal text-gray-400">{hint}</span>}
    </label>
  )
}

// Small red message under a field.
export function FieldError({ id, children }) {
  if (!children) return null
  return <p id={id} role="alert" className="text-xs text-red-600 mt-1 animate-slide-down-in">{children}</p>
}

// Primary submit button with a spinner while busy.
export function SubmitButton({ loading, children, loadingText }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="btn-primary w-full py-2.5 text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-80 disabled:cursor-wait"
    >
      {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true" />}
      {loading ? loadingText : children}
    </button>
  )
}

// "Request sent" confirmation with what happens next.
export function SuccessPanel({ title, children, steps = [] }) {
  return (
    <div className="text-center py-2 animate-fade-in" role="status">
      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3 animate-modal-in">
        <Check size={24} className="text-green-600" aria-hidden="true" />
      </div>
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      <p className="text-sm text-gray-500 mt-1">{children}</p>
      {steps.length > 0 && (
        <ol className="text-left text-sm text-gray-600 bg-gray-50 border border-gray-100 rounded-xl p-4 mt-4 space-y-2">
          {steps.map((s, i) => (
            <li key={i} className="flex gap-2.5">
              <span className="w-5 h-5 rounded-full bg-primary-100 text-primary-700 text-xs font-semibold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
      )}
      <Link to="/login" className="btn-primary inline-block text-sm py-2 px-5 mt-5">Back to Login</Link>
    </div>
  )
}