import { useState, useEffect, useRef } from 'react'
import { apiGet, apiPost } from '../../utils/api'
import DropdownSelect from '../../components/DropdownSelect'
import AuthCard, { FieldLabel, FieldError, SubmitButton, SuccessPanel } from '../../components/AuthCard'

// Philippine mobile number: 11 digits starting with 09, and not a dummy
// like 09999999999 / 09000000000 (same digit repeated).
const isPhMobile = (n) => /^09\d{9}$/.test(n) && !/^09(\d)\1{8}$/.test(n)
const isEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)

const emptyForm = { name: '', email: '', contact: '', barangay_id: '', position: '', message: '' }

// Field-by-field checks, so each problem shows under its own field.
function validate(f) {
  const e = {}
  if (!f.name.trim()) e.name = 'Enter your full name.'
  if (!f.email.trim()) e.email = 'Enter your email address.'
  else if (!isEmail(f.email.trim())) e.email = 'Enter a valid email, e.g. juan@gmail.com.'
  if (!f.contact) e.contact = 'Enter your mobile number.'
  else if (!/^0(9|$)/.test(f.contact)) e.contact = 'Must be a Philippine mobile number starting with 09.'
  else if (f.contact.length !== 11) e.contact = `Must be exactly 11 digits (${f.contact.length}/11).`
  else if (!isPhMobile(f.contact)) e.contact = 'Enter a real mobile number.'
  if (!f.barangay_id) e.barangay_id = 'Pick your barangay.'
  return e
}

export default function RequestAccount() {
  const [barangays, setBarangays] = useState([])
  const [loadingBarangays, setLoadingBarangays] = useState(true)
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState(false) // show field errors after the first Submit
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const formRef = useRef(null)

  // Barangay list stays live without reloading the page: refreshed when the
  // tab is focused again and every 15 seconds while it's open, so a barangay
  // freed up by CDRRMO (account deleted / request rejected) shows up again.
  useEffect(() => {
    let alive = true
    const load = () => {
      if (document.visibilityState === 'hidden') return
      apiGet('/account-requests/barangays')
        .then(rows => { if (alive) setBarangays(rows) })
        .catch(() => {})
        .finally(() => { if (alive) setLoadingBarangays(false) })
    }
    load()
    const timer = setInterval(load, 15000)
    window.addEventListener('focus', load)
    document.addEventListener('visibilitychange', load)
    return () => {
      alive = false
      clearInterval(timer)
      window.removeEventListener('focus', load)
      document.removeEventListener('visibilitychange', load)
    }
  }, [])

  // After the first Submit, errors update live as the user fixes each field.
  const set = (key, value) => {
    const next = { ...form, [key]: value }
    setForm(next)
    if (touched) setErrors(validate(next))
    if (error) setError('')
  }

  const submit = async (e) => {
    e.preventDefault()
    const errs = validate(form)
    setErrors(errs)
    setTouched(true)
    if (Object.keys(errs).length) {
      // Take the user straight to the first field that needs fixing.
      const first = ['name', 'email', 'contact', 'barangay_id'].find(k => errs[k])
      formRef.current?.querySelector(`[data-field="${first}"]`)?.focus()
      return
    }
    setError('')
    setLoading(true)
    try {
      await apiPost('/account-requests', { ...form, name: form.name.trim(), email: form.email.trim() })
      setDone(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const inputCls = (key) => `input py-2 text-sm ${errors[key] ? 'border-red-400 focus:ring-red-200' : ''}`

  return (
    <AuthCard maxWidth="max-w-lg">
      {!done ? (
        <>
          <h1 className="text-lg font-semibold text-gray-900">Request an Account</h1>
          <p className="text-sm text-gray-500 mt-0.5 mb-4">
            For Barangay Officials only. Fill this out and CDRRMO will create your account for your barangay.
          </p>

          {error && (
            <div role="alert" className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 animate-slide-down-in">{error}</div>
          )}

          <form ref={formRef} onSubmit={submit} className="space-y-3" noValidate>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <FieldLabel htmlFor="ra-name" required>Full Name</FieldLabel>
                <input id="ra-name" data-field="name" className={inputCls('name')} value={form.name}
                  onChange={e => set('name', e.target.value)} placeholder="Juan Dela Cruz"
                  autoComplete="name" aria-invalid={!!errors.name} aria-describedby="ra-name-err" />
                <FieldError id="ra-name-err">{errors.name}</FieldError>
              </div>
              <div>
                <FieldLabel htmlFor="ra-email" required>Email Address</FieldLabel>
                <input id="ra-email" data-field="email" className={inputCls('email')} type="email" value={form.email}
                  onChange={e => set('email', e.target.value)} placeholder="you@example.com"
                  autoComplete="email" inputMode="email" aria-invalid={!!errors.email} aria-describedby="ra-email-err" />
                <FieldError id="ra-email-err">{errors.email}</FieldError>
              </div>
              <div>
                <FieldLabel htmlFor="ra-contact" required hint={form.contact ? `${form.contact.length}/11` : ''}>Contact Number</FieldLabel>
                <input id="ra-contact" data-field="contact" className={inputCls('contact')} type="tel" inputMode="numeric" maxLength={11}
                  value={form.contact} onChange={e => set('contact', e.target.value.replace(/\D/g, '').slice(0, 11))}
                  placeholder="09XXXXXXXXX" autoComplete="tel" aria-invalid={!!errors.contact} aria-describedby="ra-contact-err" />
                <FieldError id="ra-contact-err">{errors.contact}</FieldError>
              </div>
              <div>
                <FieldLabel required>Barangay</FieldLabel>
                <div data-field="barangay_id" tabIndex={-1} className="rounded-lg focus:outline-none">
                  <DropdownSelect
                    className={inputCls('barangay_id')}
                    value={form.barangay_id}
                    placeholder={loadingBarangays ? 'Loading barangays…' : 'Select your barangay…'}
                    options={barangays.map(b => ({
                      value: b.id, label: b.name,
                      // Barangays that already have an account (or a request
                      // waiting for review) can't be picked.
                      disabled: !!b.has_account || !!b.has_pending,
                      note: b.has_account ? 'Has account' : b.has_pending ? 'Pending' : undefined,
                    }))}
                    onChange={v => set('barangay_id', v)}
                  />
                </div>
                <FieldError>{errors.barangay_id}</FieldError>
              </div>
              <div className="sm:col-span-2">
                <FieldLabel htmlFor="ra-position" hint="Optional">Position</FieldLabel>
                <input id="ra-position" className="input py-2 text-sm" value={form.position}
                  onChange={e => set('position', e.target.value)} placeholder="e.g. Barangay Secretary" autoComplete="organization-title" />
              </div>
              <div className="sm:col-span-2">
                <FieldLabel htmlFor="ra-message" hint="Optional">Message</FieldLabel>
                <textarea id="ra-message" className="input py-2 text-sm resize-y min-h-[60px]" rows={2} value={form.message}
                  onChange={e => set('message', e.target.value)} placeholder="Anything CDRRMO should know…" />
              </div>
            </div>
            <SubmitButton loading={loading} loadingText="Submitting…">Submit Request</SubmitButton>
          </form>
        </>
      ) : (
        <SuccessPanel
          title="Request sent"
          steps={[
            'CDRRMO reviews your request.',
            'Once approved, CDRRMO creates your account for your barangay.',
            `Your username and password are emailed to ${form.email}. Check your Spam folder too.`,
          ]}
        >
          Thanks, {form.name.split(' ')[0] || 'there'}. Here's what happens next:
        </SuccessPanel>
      )}
    </AuthCard>
  )
}