import { useState } from 'react'
import { Eye, EyeOff, Lock, Check, AlertCircle } from 'lucide-react'
import { apiPost } from '../../utils/api'

// Defined OUTSIDE the page component on purpose — if this lived inside
// ChangePassword's function body, React would treat it as a brand-new
// component type on every re-render (which happens on every keystroke,
// since typing updates state), remounting the <input> and dropping focus
// after each character. Declaring it here once avoids that entirely.
function PwField({ name, label, placeholder, value, show, loading, onChange, onToggleShow }) {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="relative">
        <input
          name={name}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          disabled={loading}
          className="input pr-10 transition-colors disabled:bg-gray-50 disabled:text-gray-400"
          placeholder={placeholder}
          autoComplete={name === 'current' ? 'current-password' : 'new-password'}
        />
        <button
          type="button"
          onClick={onToggleShow}
          tabIndex={-1}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  )
}

export default function ChangePassword() {
  const [form, setForm] = useState({ current: '', newPw: '', confirm: '' })
  const [show, setShow] = useState({ current: false, newPw: false, confirm: false })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handle = (e) => { setForm({ ...form, [e.target.name]: e.target.value }); if (error) setError(''); if (success) setSuccess(false) }
  const toggleShow = (field) => setShow({ ...show, [field]: !show[field] })

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess(false)
    if (!form.current) { setError('Enter your current password.'); return }
    if (form.newPw.length < 8) { setError('New password must be at least 8 characters.'); return }
    if (form.newPw !== form.confirm) { setError('New passwords do not match.'); return }
    setLoading(true)
    try {
      await apiPost('/auth/change-password', { currentPassword: form.current, newPassword: form.newPw })
      setSuccess(true)
      setForm({ current: '', newPw: '', confirm: '' })
    } catch (err) {
      setError(err.message || 'Could not update password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center flex-shrink-0">
            <Lock size={20} className="text-primary-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Change Password</h2>
            <p className="text-sm text-gray-500">Update your account password</p>
          </div>
        </div>

        {/* Fixed-height wrapper with a smooth grid-rows transition so the
            form below doesn't jump when a message appears or disappears. */}
        <div className={`grid transition-all duration-300 ease-out ${(success || error) ? 'grid-rows-[1fr] opacity-100 mb-4' : 'grid-rows-[0fr] opacity-0'}`}>
          <div className="overflow-hidden">
            {success && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 flex items-center gap-2">
                <Check size={16} className="flex-shrink-0" />
                Password changed successfully.
              </div>
            )}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
                <AlertCircle size={16} className="flex-shrink-0" />
                {error}
              </div>
            )}
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <PwField
            name="current" label="Current Password" placeholder="Enter current password"
            value={form.current} show={show.current} loading={loading}
            onChange={handle} onToggleShow={() => toggleShow('current')}
          />
          <PwField
            name="newPw" label="New Password" placeholder="Min. 8 characters"
            value={form.newPw} show={show.newPw} loading={loading}
            onChange={handle} onToggleShow={() => toggleShow('newPw')}
          />
          <PwField
            name="confirm" label="Confirm New Password" placeholder="Repeat new password"
            value={form.confirm} show={show.confirm} loading={loading}
            onChange={handle} onToggleShow={() => toggleShow('confirm')}
          />

          <div className="pt-2">
            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 transition-opacity">
              {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin flex-shrink-0" />}
              {loading ? 'Saving…' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}