import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, EyeOff, MailCheck } from 'lucide-react'
import { apiPost } from '../../utils/api'
import AuthCard, { FieldLabel, FieldError, SubmitButton, SuccessPanel } from '../../components/AuthCard'

// Forgot password — self-service with a 6-digit code sent to the account's
// email (no need to wait for CDRRMO):
//   1. username or email  →  2. code from email  →  3. new password  →  done
// If the user can't open their email, "Ask CDRRMO instead" leads to the old
// request-a-reset form.

const RESEND_SECONDS = 60

export default function ForgotPassword() {
  const [step, setStep] = useState('identify') // identify | code | password | done
  const [identifier, setIdentifier] = useState('')
  const [code, setCode] = useState('')
  const [pw, setPw] = useState({ next: '', confirm: '' })
  const [showPw, setShowPw] = useState(false)
  const [fieldError, setFieldError] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const codeRef = useRef(null)
  const idRef = useRef(null)

  // Resend countdown
  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  useEffect(() => { if (step === 'code') codeRef.current?.focus() }, [step])

  const resetErrors = () => { setFieldError(''); setError('') }

  const sendCode = async (e) => {
    e?.preventDefault()
    if (!identifier.trim()) { setFieldError('Enter your username or email.'); idRef.current?.focus(); return }
    resetErrors()
    setLoading(true)
    try {
      await apiPost('/auth/forgot-password', { identifier: identifier.trim() })
      setCode('')
      setStep('code')
      setCooldown(RESEND_SECONDS)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const verifyCode = async (e) => {
    e.preventDefault()
    if (!/^\d{6}$/.test(code)) { setFieldError('Enter the 6-digit code from your email.'); codeRef.current?.focus(); return }
    resetErrors()
    setLoading(true)
    try {
      await apiPost('/auth/verify-otp', { identifier: identifier.trim(), otp: code })
      setStep('password')
    } catch (err) {
      setFieldError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const savePassword = async (e) => {
    e.preventDefault()
    if (pw.next.length < 8) { setFieldError('Use at least 8 characters.'); return }
    if (pw.next !== pw.confirm) { setFieldError('The passwords don’t match.'); return }
    resetErrors()
    setLoading(true)
    try {
      await apiPost('/auth/reset-password', { identifier: identifier.trim(), otp: code, newPassword: pw.next })
      setStep('done')
    } catch (err) {
      setError(err.message)
      // The code expired or ran out of tries while typing the new password:
      // go back to the code step, where a new code can be requested.
      if (/expired|too many|request a new/i.test(err.message || '')) { setStep('code'); setCode('') }
    } finally {
      setLoading(false)
    }
  }

  const strong = pw.next.length >= 8 && /[A-Za-z]/.test(pw.next) && /\d/.test(pw.next)

  return (
    <AuthCard maxWidth="max-w-md">
      {/* Step dots */}
      {step !== 'done' && (
        <div className="flex items-center gap-1.5 mb-3" aria-hidden="true">
          {['identify', 'code', 'password'].map((s, i) => (
            <span key={s} className={`h-1.5 rounded-full transition-all duration-300 ${s === step ? 'w-6 bg-primary-600' : i < ['identify', 'code', 'password'].indexOf(step) ? 'w-3 bg-primary-300' : 'w-3 bg-gray-200'}`} />
          ))}
        </div>
      )}

      {error && (
        <div role="alert" className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 animate-slide-down-in">{error}</div>
      )}

      {step === 'identify' && (
        <div key="identify" className="animate-fade-in">
          <h1 className="text-lg font-semibold text-gray-900">Forgot your password?</h1>
          <p className="text-sm text-gray-500 mt-0.5 mb-4">Enter your username or email. We’ll email you a 6-digit code to reset it.</p>
          <form onSubmit={sendCode} className="space-y-3" noValidate>
            <div>
              <FieldLabel htmlFor="fp-id" required>Username or Email</FieldLabel>
              <input id="fp-id" ref={idRef}
                className={`input py-2 text-sm ${fieldError ? 'border-red-400 focus:ring-red-200' : ''}`}
                value={identifier}
                onChange={e => { setIdentifier(e.target.value); resetErrors() }}
                placeholder="e.g. brgy.sanjuan or juan@gmail.com"
                autoComplete="username" autoCapitalize="none" spellCheck={false} autoFocus
                aria-invalid={!!fieldError} aria-describedby="fp-id-err" />
              <FieldError id="fp-id-err">{fieldError}</FieldError>
            </div>
            <SubmitButton loading={loading} loadingText="Sending code…">Send Code</SubmitButton>
          </form>
          <p className="text-xs text-gray-500 text-center mt-4">
            Can’t open your email?{' '}
            <Link to="/request-password-reset" className="font-medium text-primary-600 hover:text-primary-700">Ask CDRRMO to reset it</Link>
          </p>
        </div>
      )}

      {step === 'code' && (
        <div key="code" className="animate-fade-in">
          <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center mb-3">
            <MailCheck size={20} className="text-primary-600" aria-hidden="true" />
          </div>
          <h1 className="text-lg font-semibold text-gray-900">Check your email</h1>
          <p className="text-sm text-gray-500 mt-0.5 mb-4">
            If <span className="font-medium text-gray-700">{identifier}</span> has a PDRA account, we sent a 6-digit code to its email. It expires in 10 minutes. Check your Spam folder too.
          </p>
          <form onSubmit={verifyCode} className="space-y-3" noValidate>
            <div>
              <FieldLabel htmlFor="fp-code" required>6-digit code</FieldLabel>
              <input id="fp-code" ref={codeRef}
                className={`input py-2.5 text-center text-xl font-semibold tracking-[0.5em] tabular-nums ${fieldError ? 'border-red-400 focus:ring-red-200' : ''}`}
                value={code}
                onChange={e => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); resetErrors() }}
                inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="••••••"
                aria-invalid={!!fieldError} aria-describedby="fp-code-err" />
              <FieldError id="fp-code-err">{fieldError}</FieldError>
            </div>
            <SubmitButton loading={loading} loadingText="Checking…">Verify Code</SubmitButton>
          </form>
          <div className="flex items-center justify-between text-xs mt-4">
            <button type="button" onClick={() => { setStep('identify'); resetErrors() }} className="text-gray-500 hover:text-gray-700">Use a different account</button>
            <button type="button" onClick={() => sendCode()} disabled={cooldown > 0 || loading}
              className="font-medium text-primary-600 hover:text-primary-700 disabled:text-gray-400 disabled:cursor-not-allowed tabular-nums">
              {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
            </button>
          </div>
        </div>
      )}

      {step === 'password' && (
        <div key="password" className="animate-fade-in">
          <h1 className="text-lg font-semibold text-gray-900">Set a new password</h1>
          <p className="text-sm text-gray-500 mt-0.5 mb-4">Use at least 8 characters, with letters and numbers.</p>
          <form onSubmit={savePassword} className="space-y-3" noValidate>
            <div>
              <FieldLabel htmlFor="fp-new" required hint={pw.next ? (strong ? 'Good' : 'Too weak') : ''}>New Password</FieldLabel>
              <div className="relative">
                <input id="fp-new" type={showPw ? 'text' : 'password'}
                  className={`input py-2 pr-10 text-sm ${fieldError ? 'border-red-400 focus:ring-red-200' : ''}`}
                  value={pw.next} onChange={e => { setPw({ ...pw, next: e.target.value }); resetErrors() }}
                  autoComplete="new-password" autoFocus />
                <button type="button" onClick={() => setShowPw(s => !s)} aria-label={showPw ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <div className="h-1 mt-1.5 rounded-full bg-gray-100 overflow-hidden" aria-hidden="true">
                <div className={`h-full transition-all duration-300 ${strong ? 'w-full bg-green-500' : pw.next.length >= 4 ? 'w-1/2 bg-amber-400' : pw.next ? 'w-1/4 bg-red-400' : 'w-0'}`} />
              </div>
            </div>
            <div>
              <FieldLabel htmlFor="fp-confirm" required>Confirm Password</FieldLabel>
              <input id="fp-confirm" type={showPw ? 'text' : 'password'}
                className={`input py-2 text-sm ${fieldError ? 'border-red-400 focus:ring-red-200' : ''}`}
                value={pw.confirm} onChange={e => { setPw({ ...pw, confirm: e.target.value }); resetErrors() }}
                autoComplete="new-password" aria-describedby="fp-pw-err" />
              <FieldError id="fp-pw-err">{fieldError}</FieldError>
            </div>
            <SubmitButton loading={loading} loadingText="Saving…">Reset Password</SubmitButton>
          </form>
        </div>
      )}

      {step === 'done' && (
        <SuccessPanel title="Password reset">
          Your password was changed. You can now sign in with your new password.
        </SuccessPanel>
      )}
    </AuthCard>
  )
}