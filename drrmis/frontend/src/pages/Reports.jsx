import { useState, useEffect, useCallback } from 'react'
import { Printer, RefreshCw } from 'lucide-react'
import { apiGet } from '../utils/api'
import { ROLE_PERMISSIONS } from '../data/users'
import DropdownSelect from '../components/DropdownSelect'

const HAZARDS = [{ id: 'flood', label: 'Flood' }, { id: 'landslide', label: 'Landslide' }]
const BASES = [
  { id: 'planning', label: 'Hazard-prone areas (planning)' },
  { id: 'live', label: 'Current alert (live)' },
]

const n = v => Number(v || 0).toLocaleString()

// Affected barangays: puroks at risk added up per barangay (works for flood and landslide).
function affectedBarangays(d) {
  const m = new Map()
  for (const p of d.by_purok || []) {
    if (!p.at_risk) continue
    const r = m.get(p.barangay_name) || { name: p.barangay_name, puroks: 0, households: 0, residents: 0 }
    r.puroks += 1; r.households += Number(p.households || 0); r.residents += Number(p.residents || 0)
    m.set(p.barangay_name, r)
  }
  return [...m.values()].sort((a, b) => (b.households - a.households) || String(a.name).localeCompare(String(b.name), undefined, { numeric: true }))
}
const fmtDate = iso => new Date(iso).toLocaleString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'long', timeStyle: 'short' })

// A reference number made from the date and time the report was generated,
// e.g. PDRA-FLOOD-20261028-0820 (not an official serial number).
function referenceNo(d) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(d.generated_at)).map(x => [x.type, x.value]))
  return `PDRA-${d.filters.hazard.toUpperCase()}-${p.year}${p.month}${p.day}-${p.hour}${p.minute}`
}

const csvCell = v => { const s = String(v ?? ''); return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }

function situationText(d) {
  const { hazard, basis } = d.filters
  if (hazard === 'landslide') return 'Landslide uses the official CDRA classification of each purok. There is no live landslide reading.'
  if (basis === 'planning') return 'Planning view: every purok inside the flood area drawn from the CDRA flood map, as if heavy rain hit now. It does not depend on today’s weather.'
  if (d.situation.simulate_rain) return 'A drill (Simulate heavy rain) is running, so every barangay counts as having heavy rain.'
  if (d.situation.flagged_barangays > 0) return `Heavy rain with a high river was detected in ${d.situation.flagged_barangays} barangay(s) right now. Only their flood-area puroks are counted.`
  return 'No heavy rain with a high river is detected right now, so no household is flagged. Use the planning view to see the flood-prone households.'
}

const basisLabel = d => d.filters.hazard === 'landslide' ? 'CDRA classification' : (d.filters.basis === 'planning' ? 'Hazard-prone areas (planning view)' : 'Current alert (live view)')

const Seg = ({ options, value, onChange }) => (
  <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden bg-white">
    {options.map(o => (
      <button key={o.id} type="button" onClick={() => onChange(o.id)}
        className={`px-3 py-1.5 text-sm font-medium ${value === o.id ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>{o.label}</button>
    ))}
  </div>
)

const Section = ({ no, title, children }) => (
  <section className="rp-section">
    <h3 className="rp-h">{no}. {title}</h3>
    {children}
  </section>
)

export default function Reports({ currentUser }) {
  const canExport = !!ROLE_PERMISSIONS[currentUser?.role]?.canExport
  const [hazard, setHazard] = useState('flood')
  const [basis, setBasis] = useState('planning')
  const [barangayId, setBarangayId] = useState('')
  const [purokId, setPurokId] = useState('')
  const [barangays, setBarangays] = useState([])
  const [puroks, setPuroks] = useState([])
  const [data, setData] = useState(null)
  const [office, setOffice] = useState(null) // address / contact / email from Settings
  const [loading, setLoading] = useState(true)
  // Signatories typed by the office (kept in this browser; blank = default)
  const [sig, setSig] = useState(() => {
    try { return { ...{ prepName: '', prepTitle: '', notedName: '', notedTitle: 'Head of Office, City DRRMO' }, ...JSON.parse(localStorage.getItem('pdra_report_sig') || '{}') } }
    catch { return { prepName: '', prepTitle: '', notedName: '', notedTitle: 'Head of Office, City DRRMO' } }
  })
  const setSigField = (k, v) => setSig(prev => {
    const next = { ...prev, [k]: v }
    try { localStorage.setItem('pdra_report_sig', JSON.stringify(next)) } catch { /* ignore */ }
    return next
  })
  const [error, setError] = useState('')

  useEffect(() => { apiGet('/barangays').then(r => setBarangays(Array.isArray(r) ? r : [])).catch(() => {}) }, [])
  useEffect(() => { apiGet('/settings/system-info').then(setOffice).catch(() => {}) }, [])
  useEffect(() => {
    setPurokId('')
    if (!barangayId) { setPuroks([]); return }
    apiGet(`/risk-assessment/puroks?barangay_id=${barangayId}`).then(r => setPuroks(Array.isArray(r) ? r : [])).catch(() => setPuroks([]))
  }, [barangayId])

  const load = useCallback(() => {
    setLoading(true); setError('')
    const q = new URLSearchParams({ hazard, basis })
    if (barangayId) q.set('barangay_id', barangayId)
    if (purokId) q.set('purok_id', purokId)
    return apiGet(`/reports/households-at-risk?${q}`)
      .then(setData).catch(e => setError(e.message || 'Could not load the report')).finally(() => setLoading(false))
  }, [hazard, basis, barangayId, purokId])
  useEffect(() => { load() }, [load])

  const s = data?.summary, dm = s?.demographics
  const officeLine = office ? [office.address, office.contact && `Tel./Mobile: ${office.contact}`, office.email && `Email: ${office.email}`].filter(Boolean).join('  |  ') : ''
  const hazardName = data?.filters.hazard === 'flood' ? 'Flood' : 'Landslide'
  const coverage = data ? `${data.filters.barangay_name || 'All barangays'}${data.filters.purok_name ? ` / ${data.filters.purok_name}` : ''}` : ''

  return (
    <div className="space-y-4">
      <style>{`
        /* The report is a paper-style document: what you see here is what prints. */
        .rp-sheet { background: #fff; color: #111827; font-family: Arial, Helvetica, sans-serif; max-width: 210mm; margin: 0 auto;
          padding: 14mm 14mm 12mm; border: 1px solid #d1d5db; box-shadow: 0 1px 6px rgba(0,0,0,.08); font-size: 12px; line-height: 1.45; }
        .rp-letterhead { display: flex; align-items: center; gap: 14px; padding-bottom: 8px; border-bottom: 3px double #111827; }
        .rp-letterhead img { width: 72px; height: 72px; object-fit: contain; flex-shrink: 0; }
        .rp-lh-text { flex: 1; text-align: center; }
        .rp-lh-text p { margin: 0; }
        .rp-title { text-align: center; margin: 14px 0 2px; font-size: 16px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; }
        .rp-subtitle { text-align: center; margin: 0 0 12px; color: #374151; }
        .rp-section { margin-top: 14px; }
        .rp-h { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .03em; margin: 0 0 5px; padding-bottom: 2px; border-bottom: 1px solid #9ca3af; }
        .rp-table { width: 100%; border-collapse: collapse; font-size: 12px; }
        .rp-table th, .rp-table td { border: 1px solid #9ca3af; padding: 4px 7px; text-align: left; vertical-align: top; }
        .rp-table th { background: #e5e7eb; font-weight: 700; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .rp-table .num { text-align: right; white-space: nowrap; }
        .rp-table .ctr { text-align: center; }
        .rp-table tr.total td { font-weight: 700; background: #f3f4f6; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .rp-info th { width: 32%; font-weight: 700; background: #f3f4f6; }
        .rp-risk { font-weight: 700; color: #b91c1c; }
        .rp-note { margin: 0; padding: 5px 8px; border: 1px solid #9ca3af; background: #f9fafb; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .rp-sign { display: flex; justify-content: space-between; gap: 30px; margin-top: 34px; }
        .rp-sign > div { flex: 1; text-align: center; }
        .rp-sign .line { border-top: 1px solid #111827; margin-top: 30px; padding-top: 3px; font-weight: 700; text-transform: uppercase; min-height: 16px; }
        .rp-sign .cap { font-size: 11px; color: #374151; }
        .rp-edit { display: block; width: 100%; box-sizing: border-box; background: #fffbe6; border: 1px dashed #d4a72c; border-radius: 3px; text-align: center; font-family: inherit; color: inherit; outline: none; padding: 2px 4px; }
        .rp-edit:focus { border-color: #2563eb; background: #eff6ff; }
        .rp-edit.nm { font-weight: 700; text-transform: uppercase; font-size: 12px; margin-top: 26px; border-top: 1px solid #111827; }
        .rp-edit.tt { font-size: 11px; color: #374151; margin-top: 2px; }
        .rp-sign .rp-edit.nm { padding-top: 3px; }
        .rp-foot { margin-top: 16px; padding-top: 5px; border-top: 1px solid #9ca3af; font-size: 10px; color: #4b5563; text-align: center; }
        /* margin 0 keeps the browser from printing its own date/title/URL header and footer; spacing is done by the wrapper table */
        /* Phones and small tablets: the sheet fills the screen, the letterhead and
           signatures stack, and wide tables scroll sideways instead of overflowing. */
        @media screen and (max-width: 720px) {
          .rp-sheet { padding: 14px 12px; font-size: 11px; box-shadow: none; border-radius: 0; }
          .rp-letterhead { flex-direction: column; gap: 6px; text-align: center; }
          .rp-letterhead img { width: 56px; height: 56px; }
          .rp-title { font-size: 13px; letter-spacing: .02em; }
          .rp-table { display: block; max-width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; font-size: 11px; }
          .rp-table th, .rp-table td { padding: 4px 6px; }
          .rp-info { display: table; overflow: visible; }
          .rp-info th { width: 38%; }
          .rp-sign { flex-direction: column; gap: 6px; }
          .rp-foot { font-size: 9px; }
        }
        @page { size: A4; margin: 0; }
        .rp-wrap { width: 100%; border-collapse: collapse; }
        .rp-wrap > thead, .rp-wrap > tfoot { display: none; }
        .rp-wrap > tbody > tr > td { padding: 0; }
        @media print {
          html, body { background: #fff !important; }
          body * { visibility: hidden; }
          #pdra-report, #pdra-report * { visibility: visible; }
          #pdra-report { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
          .rp-sheet { border: 0; box-shadow: none; padding: 0 14mm; max-width: none; margin: 0; box-sizing: border-box; }
          .rp-wrap > thead { display: table-header-group; }
          .rp-wrap > tfoot { display: table-footer-group; }
          .rp-sp-top { height: 14mm; }
          .rp-sp-bot { height: 14mm; }
          .rp-edit { background: transparent !important; border: 0 !important; padding: 0 !important; }
          .rp-edit.nm { border-top: 1px solid #111827 !important; padding-top: 3px !important; }
          .rp-edit::placeholder { color: transparent; }
          .rp-table tr { break-inside: avoid; }
          .rp-table thead { display: table-header-group; }
          .rp-section.keep, .rp-sign { break-inside: avoid; }
        }
      `}</style>

      {/* Filters and actions (not printed) */}
      <div className="no-print bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <Seg options={HAZARDS} value={hazard} onChange={setHazard} />
          {hazard === 'flood' && <Seg options={BASES} value={basis} onChange={setBasis} />}
          <div className="ml-auto flex items-center gap-2">
            <button type="button" className="btn-secondary flex items-center gap-1.5" onClick={load} disabled={loading}>
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
            {canExport && (
              <>
                <button type="button" className="btn-primary flex items-center gap-1.5" disabled={!data} onClick={() => window.print()}>
                  <Printer size={15} /> Print / Save as PDF
                </button>
              </>
            )}
          </div>
        </div>
        {currentUser?.role !== 'Barangay Official' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl">
            <DropdownSelect searchable value={barangayId} placeholder="All barangays"
              options={barangays.map(b => ({ value: b.id, label: b.name }))}
              onChange={v => setBarangayId(v === '' ? '' : String(v))} />
            <DropdownSelect value={purokId} placeholder={barangayId ? 'All puroks' : 'Pick a barangay first'}
              options={puroks.map(p => ({ value: p.purok_id, label: p.purok_name }))}
              onChange={v => setPurokId(v === '' ? '' : String(v))} />
          </div>
        )}
      </div>

      {error && <div className="no-print rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm p-3">{error}</div>}
      {!data && loading && <p className="text-sm text-gray-500">Loading report…</p>}

      {data && (
        <div id="pdra-report" className={`rp-sheet ${loading ? 'opacity-60' : ''}`}>
          <table className="rp-wrap"><thead><tr><td><div className="rp-sp-top" /></td></tr></thead>
          <tbody><tr><td>
          {/* Letterhead */}
          <div className="rp-letterhead">
            <img src="/cdrrmo-logo.png" alt="" />
            <div className="rp-lh-text">
              <p style={{ fontSize: 11 }}>Republic of the Philippines</p>
              <p style={{ fontSize: 11 }}>Province of Misamis Oriental</p>
              <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>City of Gingoog</p>
              <p style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase' }}>City Disaster Risk Reduction and Management Office</p>
              {officeLine && <p style={{ fontSize: 10, color: '#374151', marginTop: 2 }}>{officeLine}</p>}
            </div>
            <div style={{ width: 72, flexShrink: 0 }} aria-hidden="true" />
          </div>

          <p className="rp-title">Households at Risk (Potentially Affected)</p>
          <p className="rp-subtitle">Pre-Disaster Report · {hazardName} · {data.filters.barangay_name || 'All barangays'}{data.filters.purok_name ? ` · ${data.filters.purok_name}` : ''}</p>

          <table className="rp-table rp-info">
            <tbody>
              <tr><th>Reference No.</th><td>{referenceNo(data)}</td></tr>
              <tr><th>Date and time generated</th><td>{fmtDate(data.generated_at)}</td></tr>
              <tr><th>Hazard</th><td>{hazardName}</td></tr>
              <tr><th>Basis</th><td>{basisLabel(data)}</td></tr>
              <tr><th>Coverage</th><td>{coverage}</td></tr>
              <tr><th>Prepared by</th><td>{sig.prepName.trim() || data.generated_by} ({sig.prepTitle.trim() || data.role})</td></tr>
            </tbody>
          </table>

          <Section no="I" title="Situation">
            <p className="rp-note">{situationText(data)}</p>
          </Section>

          <Section no="II" title="Summary">
            <table className="rp-table">
              <thead><tr><th>Item</th><th className="num">At risk</th><th className="num">Total in coverage</th></tr></thead>
              <tbody>
                <tr><td>Barangays</td><td className="num rp-risk">{n(s.barangays_at_risk)}</td><td className="num">{n(s.barangays_in_scope)}</td></tr>
                <tr><td>Puroks</td><td className="num rp-risk">{n(s.puroks_at_risk)}</td><td className="num">{n(s.puroks_total)}</td></tr>
                <tr><td>Households</td><td className="num rp-risk">{n(s.households_at_risk)}</td><td className="num">{n(s.households_total)}</td></tr>
                <tr><td>Residents</td><td className="num rp-risk">{n(s.residents_at_risk)}</td><td className="num">{n(s.residents_total)}</td></tr>
              </tbody>
            </table>
          </Section>

          <Section no="III" title="Residents at risk, by age group and sex">
            <table className="rp-table">
              <thead><tr><th style={{ width: '28%' }}>Classification</th><th>Group</th><th className="num">Residents</th></tr></thead>
              <tbody>
                {[['Child (1-12)', dm.child], ['Teen (13-17)', dm.teen], ['Adult (18-59)', dm.adult], ['Senior (60+)', dm.senior], ['Age not recorded', dm.unknown_age]].map(([l, v], i) => (
                  <tr key={l}>{i === 0 && <td rowSpan={5}>Age group</td>}<td>{l}</td><td className="num">{n(v)}</td></tr>
                ))}
                {[['Male', dm.male], ['Female', dm.female]].map(([l, v], i) => (
                  <tr key={l}>{i === 0 && <td rowSpan={2}>Sex</td>}<td>{l}</td><td className="num">{n(v)}</td></tr>
                ))}
                <tr className="total"><td colSpan={2}>Total residents at risk</td><td className="num">{n(s.residents_at_risk)}</td></tr>
              </tbody>
            </table>
          </Section>

          <Section no="IV" title="Affected barangays">
            {(() => {
              const rows = affectedBarangays(data)
              const tot = rows.reduce((t, r) => ({ puroks: t.puroks + r.puroks, households: t.households + r.households, residents: t.residents + r.residents }), { puroks: 0, households: 0, residents: 0 })
              return (
                <>
                  <p className="rp-note" style={{ marginBottom: 6 }}>
                    {n(s.barangays_at_risk)} of {n(s.barangays_in_scope)} barangay{s.barangays_in_scope === 1 ? '' : 's'} in this report {s.barangays_at_risk === 1 ? 'has' : 'have'} puroks at risk
                    {data.filters.hazard === 'landslide' ? ' of landslide' : ' of flooding'}.
                  </p>
                  <table className="rp-table">
                    <thead><tr><th className="ctr" style={{ width: 34 }}>No.</th><th>Barangay</th><th className="num">Puroks at risk</th><th className="num">Households at risk</th><th className="num">Residents at risk</th></tr></thead>
                    <tbody>
                      {rows.length === 0 && <tr><td colSpan={5}>No barangay has a purok at risk for this selection.</td></tr>}
                      {rows.map((r, i) => (
                        <tr key={r.name}><td className="ctr">{i + 1}</td><td>{r.name}</td><td className="num">{n(r.puroks)}</td><td className="num">{n(r.households)}</td><td className="num">{n(r.residents)}</td></tr>
                      ))}
                      {rows.length > 0 && <tr className="total"><td colSpan={2}>Total</td><td className="num">{n(tot.puroks)}</td><td className="num">{n(tot.households)}</td><td className="num">{n(tot.residents)}</td></tr>}
                    </tbody>
                  </table>
                </>
              )
            })()}
          </Section>

          <Section no="V" title="Summary by purok">
            <table className="rp-table">
              <thead><tr><th className="ctr" style={{ width: 34 }}>No.</th><th>Barangay</th><th>Purok</th><th className="num">Households</th><th className="num">Residents</th><th>Status</th></tr></thead>
              <tbody>
                {data.by_purok.length === 0 && <tr><td colSpan={6}>No puroks found for this selection.</td></tr>}
                {data.by_purok.map((p, i) => (
                  <tr key={i}>
                    <td className="ctr">{i + 1}</td><td>{p.barangay_name}</td><td>{p.purok_name}</td>
                    <td className="num">{n(p.households)}</td><td className="num">{n(p.residents)}</td>
                    <td>{p.at_risk ? <span className="rp-risk">At risk</span> : 'Not at risk'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          <Section no="VI" title={`List of households at risk (${n(data.households.length)})`}>
            <table className="rp-table">
              <thead><tr><th className="ctr" style={{ width: 34 }}>No.</th><th>HH No.</th><th>Barangay</th><th>Purok</th><th>Head of Family</th><th className="num">Members</th><th>Contact</th></tr></thead>
              <tbody>
                {data.households.length === 0 && <tr><td colSpan={7}>No household is inside a hazard area for this selection.</td></tr>}
                {data.households.map((h, i) => (
                  <tr key={i}>
                    <td className="ctr">{i + 1}</td><td style={{ whiteSpace: 'nowrap' }}>{h.hh_label}</td><td>{h.barangay_name}</td>
                    <td>{h.purok_name}</td><td>{h.head_family}</td>
                    <td className="num">{n(h.members)}</td><td>{h.contact || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          {/* Signatures */}
          <div className="rp-sign">
            <div>
              <p style={{ textAlign: 'left', margin: 0 }}>Prepared by:</p>
              <input className="rp-edit nm" aria-label="Prepared by name" placeholder={data.generated_by} value={sig.prepName || data.generated_by} onChange={e => setSigField('prepName', e.target.value)} />
              <input className="rp-edit tt" aria-label="Prepared by position" placeholder={data.role} value={sig.prepTitle || data.role} onChange={e => setSigField('prepTitle', e.target.value)} />
              <div className="cap">Date: ____________________</div>
            </div>
            <div>
              <p style={{ textAlign: 'left', margin: 0 }}>Noted by:</p>
              <input className="rp-edit nm" aria-label="Noted by name" placeholder="Name of Head of Office" value={sig.notedName} onChange={e => setSigField('notedName', e.target.value)} />
              <input className="rp-edit tt" aria-label="Noted by position" placeholder="Head of Office, City DRRMO" value={sig.notedTitle} onChange={e => setSigField('notedTitle', e.target.value)} />
              <div className="cap">Date: ____________________</div>
            </div>
          </div>

          <p className="rp-foot">
            Ref. {referenceNo(data)} · Generated by PDRA (Pre-Disaster Risk Assessment System) · This report contains personal information and is for official CDRRMO use only. Handle it in accordance with the Data Privacy Act of 2012 (RA 10173).
          </p>
          </td></tr></tbody>
          <tfoot><tr><td><div className="rp-sp-bot" /></td></tr></tfoot></table>
        </div>
      )}
    </div>
  )
}