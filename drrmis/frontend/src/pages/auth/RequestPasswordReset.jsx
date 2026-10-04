import { useState, useRef } from 'react'
import { apiPost } from '../../utils/api'
import AuthCard, { FieldLabel, FieldError, SubmitButton, SuccessPanel } from '../../components/AuthCard'

export default function RequestPasswordReset() {
  const [identifier, setIdentifier] = useState('')
  const [message, setMessage] = useState('')
  const [fieldError, setFieldError] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const idRef = useRef(null)

  const submit = async (e) => {
    e.preventDefault()
    if (!identifier.trim()) {
      setFieldError('Enter your username or email.')
      idRef.current?.focus()
      return
    }
    setFieldError('')
    setError('')
    setLoading(true)
    try {
      await apiPost('/password-reset-requests', { identifier: identifier.trim(), message })
      setDone(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthCard maxWidth="max-w-md">
      {!done ? (
        <>
          <h1 className="text-lg font-semibold text-gray-900">Request a Password Reset</h1>
          <p className="text-sm text-gray-500 mt-0.5 mb-4">
            CDRRMO will reset your password directly and reach out to you with the new one.
          </p>

          {error && (
            <div role="alert" className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 animate-slide-down-in">{error}</div>
          )}

          <form onSubmit={submit} className="space-y-3" noValidate>
            <div>
              <FieldLabel htmlFor="rp-id" required>Username or Email</FieldLabel>
              <input id="rp-id" ref={idRef}
                className={`input py-2 text-sm ${fieldError ? 'border-red-400 focus:ring-red-200' : ''}`}
                value={identifier}
                onChange={e => { setIdentifier(e.target.value); if (fieldError) setFieldError(''); if (error) setError('') }}
                placeholder="e.g. brgy.sanjuan or juan@gmail.com"
                autoComplete="username" autoCapitalize="none" spellCheck={false}
                aria-invalid={!!fieldError} aria-describedby="rp-id-err" />
              <FieldError id="rp-id-err">{fieldError}</FieldError>
            </div>
            <div>
              <FieldLabel htmlFor="rp-msg" hint="Optional">Message</FieldLabel>
              <textarea id="rp-msg" className="input py-2 text-sm resize-y min-h-[72px]" rows={3} value={message}
                onChange={e => setMessage(e.target.value)} placeholder="How CDRRMO can reach you (phone number, etc.)" />
            </div>
            <SubmitButton loading={loading} loadingText="Sending…">Send Request</SubmitButton>
          </form>
        </>
      ) : (
        <SuccessPanel
          title="Request sent"
          steps={[
            'CDRRMO is notified of your request.',
            'They reset your password.',
            'They contact you with your new password — change it after you sign in.',
          ]}
        >
          If that account exists, here's what happens next:
        </SuccessPanel>
      )}
    </AuthCard>
  )
}