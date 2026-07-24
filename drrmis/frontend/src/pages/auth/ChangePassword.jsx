import { useState } from 'react'
import { Eye, EyeOff, Lock } from 'lucide-react'

export default function ChangePassword() {
  const [form, setForm] = useState({ current: '', newPw: '', confirm: '' })
  const [show, setShow] = useState({ current: false, newPw: false, confirm: false })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value })
  const toggleShow = (field) => setShow({ ...show, [field]: !show[field] })

  const submit = (e) => {
    e.preventDefault()
    setError('')
    if (!form.current) { setError('Enter your current password.'); return }
    if (form.newPw.length < 8) { setError('New password must be at least 8 characters.'); return }
    if (form.newPw !== form.confirm) { setError('New passwords do not match.'); return }
    setLoading(true)
    setTimeout(() => { setLoading(false); setSuccess(true); setForm({ current: '', newPw: '', confirm: '' }) }, 800)
  }

  const PwField = ({ name, label, placeholder }) => (
    <div>
      <label className="label">{label}</label>
      <div className="relative">
        <input
          name={name}
          type={show[name] ? 'text' : 'password'}
          value={form[name]}
          onChange={handle}
          className="input pr-10"
          placeholder={placeholder}
        />
        <button type="button" onClick={() => toggleShow(name)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
          {show[name] ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  )

  return (
    <div className="max-w-lg mx-auto">
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
            <Lock size={20} className="text-primary-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Change Password</h2>
            <p className="text-sm text-gray-500">Update your account password</p>
          </div>
        </div>

        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Password changed successfully.
          </div>
        )}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <PwField name="current" label="Current Password" placeholder="Enter current password" />
          <PwField name="newPw" label="New Password" placeholder="Min. 8 characters" />
          <PwField name="confirm" label="Confirm New Password" placeholder="Repeat new password" />

          <div className="pt-2">
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Saving…' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
