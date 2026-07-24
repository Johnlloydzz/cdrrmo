import { useState } from 'react'
import { Bell, Plus, Send } from 'lucide-react'

const LEVEL_STYLE = {
  Red:    { bg: 'bg-red-600',    badge: 'badge-red',    text: 'Red Alert' },
  Orange: { bg: 'bg-orange-500', badge: 'badge-orange', text: 'Orange Alert' },
  Yellow: { bg: 'bg-yellow-400', badge: 'badge-yellow', text: 'Yellow Alert' },
  Green:  { bg: 'bg-green-500',  badge: 'badge-green',  text: 'Green Alert' },
}

const initial = [
  { id: 1, level: 'Red',    type: 'Flood Warning',    message: 'Mandatory evacuation for low-lying areas in Kioskos, Barangay 1-3.',          sentAt: '2026-07-13 07:30', recipients: 'All Barangays' },
  { id: 2, level: 'Orange', type: 'Heavy Rainfall',   message: 'Continuous heavy rainfall expected. Monitor drainage and river levels.',        sentAt: '2026-07-13 06:00', recipients: 'CDRRMO, Barangay Admins' },
  { id: 3, level: 'Yellow', type: 'Typhoon Watch',    message: 'Tropical depression approaching. Prepare emergency kits and evacuation plans.', sentAt: '2026-07-12 20:00', recipients: 'All Barangays' },
  { id: 4, level: 'Green',  type: 'All Clear',        message: 'Landslide threat in Magsaysay has been cleared. Normal operations resumed.',    sentAt: '2026-07-12 15:00', recipients: 'Magsaysay' },
]

export default function Alerts() {
  const [alerts, setAlerts] = useState(initial)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ level: 'Yellow', type: '', message: '', recipients: 'All Barangays' })

  const handleSend = () => {
    if (!form.type || !form.message) return
    setAlerts(p => [{ ...form, id: Date.now(), sentAt: new Date().toLocaleString() }, ...p])
    setShowModal(false)
  }

  return (
    <div className="space-y-4">
      {/* Active level indicators */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Object.entries(LEVEL_STYLE).map(([level, style]) => (
          <div key={level} className={`${style.bg} rounded-xl p-4 text-white text-center`}>
            <Bell size={22} className="mx-auto mb-1 opacity-90" />
            <p className="font-bold text-sm">{style.text}</p>
            <p className="text-xs opacity-75">{alerts.filter(a => a.level === level).length} alert(s)</p>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <button className="btn-primary flex items-center gap-2 text-sm" onClick={() => setShowModal(true)}><Plus size={15} /> Send Alert</button>
      </div>

      <div className="space-y-3">
        {alerts.map(a => {
          const s = LEVEL_STYLE[a.level]
          return (
            <div key={a.id} className="card p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <div className={`w-3 h-3 rounded-full mt-1.5 flex-shrink-0 ${s.bg}`} />
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={s.badge}>{a.level}</span>
                      <span className="font-semibold text-gray-800">{a.type}</span>
                    </div>
                    <p className="text-sm text-gray-600">{a.message}</p>
                    <div className="flex gap-4 mt-2 text-xs text-gray-400">
                      <span>Recipients: {a.recipients}</span>
                      <span>{a.sentAt}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-5 flex items-center gap-2"><Send size={18} /> Send Alert</h3>
            <div className="space-y-4">
              <div>
                <label className="label">Alert Level</label>
                <select className="input" value={form.level} onChange={e => setForm({...form,level:e.target.value})}>
                  {['Green','Yellow','Orange','Red'].map(l => <option key={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Alert Type</label>
                <input className="input" value={form.type} onChange={e => setForm({...form,type:e.target.value})} placeholder="e.g. Flood Warning" />
              </div>
              <div>
                <label className="label">Message</label>
                <textarea className="input" rows={4} value={form.message} onChange={e => setForm({...form,message:e.target.value})} placeholder="Write the alert message…" />
              </div>
              <div>
                <label className="label">Recipients</label>
                <select className="input" value={form.recipients} onChange={e => setForm({...form,recipients:e.target.value})}>
                  {['All Barangays','CDRRMO, Barangay Admins','Field Responders','Specific Barangay'].map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-primary flex items-center gap-2" onClick={handleSend}><Send size={15} /> Send Alert</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
