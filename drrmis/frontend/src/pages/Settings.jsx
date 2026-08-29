import { useState } from 'react'
import { Save, Database, Mail, Map, Bell } from 'lucide-react'

export default function Settings({ currentUser }) {
  const isCdrrmo = currentUser?.role === 'CDRRMO Personnel'
  const [system, setSystem] = useState({ name: 'PDRA - Gingoog City CDRRMO', address: 'Gingoog City, Misamis Oriental', contact: '(088) 861-0000', email: 'cdrrmo@gingoog.gov.ph' })
  const [sms, setSms] = useState({ provider: 'Semaphore', apiKey: '••••••••••••••••', sender: 'CDRRMO' })
  const [emailSet, setEmailSet] = useState({ host: 'smtp.gmail.com', port: '587', user: 'cdrrmo@gingoog.gov.ph', password: '••••••••' })
  const [saved, setSaved] = useState(false)

  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2000) }

  const Section = ({ title, icon: Icon, children }) => (
    <div className="card p-6">
      <h3 className="font-semibold text-gray-800 flex items-center gap-2 mb-5">
        <Icon size={18} className="text-primary-600" />{title}
      </h3>
      {children}
    </div>
  )

  return (
    <div className="max-w-3xl space-y-6">
      {saved && <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 flex items-center gap-2">✓ Settings saved successfully.</div>}

      <Section title="System Information" icon={Database}>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><label className="label">System Name</label><input className="input" value={system.name} disabled={!isCdrrmo} onChange={e => setSystem({...system,name:e.target.value})} /></div>
          <div><label className="label">Address</label><input className="input" value={system.address} disabled={!isCdrrmo} onChange={e => setSystem({...system,address:e.target.value})} /></div>
          <div><label className="label">Contact Number</label><input className="input" value={system.contact} disabled={!isCdrrmo} onChange={e => setSystem({...system,contact:e.target.value})} /></div>
          <div className="col-span-2"><label className="label">Email</label><input className="input" type="email" value={system.email} disabled={!isCdrrmo} onChange={e => setSystem({...system,email:e.target.value})} /></div>
        </div>
      </Section>

      {/* SMS, Email, Map, and Database settings involve system-wide credentials
          and configuration — CDRRMO Personnel only, not Barangay Official. */}
      {isCdrrmo && (
        <>
          <Section title="SMS Settings" icon={Bell}>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">Provider</label><select className="input" value={sms.provider} onChange={e => setSms({...sms,provider:e.target.value})}><option>Semaphore</option><option>Vonage</option><option>Twilio</option></select></div>
              <div><label className="label">Sender Name</label><input className="input" value={sms.sender} onChange={e => setSms({...sms,sender:e.target.value})} /></div>
              <div className="col-span-2"><label className="label">API Key</label><input className="input" type="password" value={sms.apiKey} onChange={e => setSms({...sms,apiKey:e.target.value})} /></div>
            </div>
          </Section>

          <Section title="Email Settings" icon={Mail}>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">SMTP Host</label><input className="input" value={emailSet.host} onChange={e => setEmailSet({...emailSet,host:e.target.value})} /></div>
              <div><label className="label">Port</label><input className="input" value={emailSet.port} onChange={e => setEmailSet({...emailSet,port:e.target.value})} /></div>
              <div><label className="label">Username</label><input className="input" value={emailSet.user} onChange={e => setEmailSet({...emailSet,user:e.target.value})} /></div>
              <div><label className="label">Password</label><input className="input" type="password" value={emailSet.password} onChange={e => setEmailSet({...emailSet,password:e.target.value})} /></div>
            </div>
          </Section>

          <Section title="Map Settings" icon={Map}>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">Default Center Latitude</label><input className="input" defaultValue="8.8231" /></div>
              <div><label className="label">Default Center Longitude</label><input className="input" defaultValue="125.1109" /></div>
              <div><label className="label">Default Zoom Level</label><input className="input" type="number" defaultValue="13" /></div>
              <div><label className="label">Default Base Layer</label><select className="input"><option>Street View</option><option>Satellite</option><option>Terrain</option></select></div>
            </div>
          </Section>

          <Section title="Database" icon={Database}>
            <div className="flex gap-3">
              <button className="btn-secondary text-sm">Backup Database</button>
              <button className="btn-secondary text-sm">Restore Database</button>
            </div>
            <p className="text-xs text-gray-400 mt-3">Last backup: July 12, 2026 — 11:00 PM</p>
          </Section>
        </>
      )}

      {isCdrrmo && (
        <div className="flex justify-end">
          <button className="btn-primary flex items-center gap-2" onClick={handleSave}><Save size={15} /> Save All Settings</button>
        </div>
      )}
    </div>
  )
}