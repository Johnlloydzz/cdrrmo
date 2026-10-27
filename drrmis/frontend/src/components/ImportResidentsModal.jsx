import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Upload, Download, FileSpreadsheet, CheckCircle2, AlertTriangle, X } from 'lucide-react'
import { apiGet, apiPost } from '../utils/api'

// Import Residents (Barangay Official). The spreadsheet is saved as CSV, read
// here in the browser, checked by the server (nothing is saved yet), and only
// saved when the official confirms. Same rules as the Register Resident form.

const MAX_ROWS = 500

// Column names that mean the same thing (spaces, case and symbols ignored).
const HEADER_ALIASES = {
  last_name: ['lastname', 'surname', 'familyname'],
  first_name: ['firstname', 'givenname'],
  middle_name: ['middlename', 'middleinitial', 'middle'],
  sex: ['sex', 'gender'],
  birthdate: ['birthdate', 'birthday', 'dateofbirth', 'dob', 'bday'],
  contact_number: ['contactnumber', 'contact', 'mobile', 'mobilenumber', 'phone', 'phonenumber', 'cellphone'],
  purok: ['purok', 'purokname'],
  relation_to_head: ['relationtohead', 'relation', 'relationship'],
}
const REQUIRED = { last_name: 'Last Name', first_name: 'First Name', birthdate: 'Birthdate', purok: 'Purok' }
const keyOf = (h) => String(h || '').toLowerCase().replace(/[^a-z]/g, '')

// Small CSV reader: handles quotes, "" inside quotes, comma / semicolon / tab,
// a leading BOM (Excel adds one) and blank lines.
function parseCsv(text) {
  const src = text.replace(/^﻿/, '')
  const first = src.split(/\r?\n/, 1)[0] || ''
  const counts = { ',': 0, ';': 0, '\t': 0 }
  let q = false
  for (const ch of first) { if (ch === '"') q = !q; else if (!q && ch in counts) counts[ch]++ }
  const delim = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0]
  const rows = []
  let row = [], cell = '', inQ = false
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (inQ) {
      if (ch === '"') { if (src[i + 1] === '"') { cell += '"'; i++ } else inQ = false }
      else cell += ch
    } else if (ch === '"') inQ = true
    else if (ch === delim) { row.push(cell); cell = '' }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++
      row.push(cell); cell = ''
      if (row.some(c => c.trim() !== '')) rows.push(row)
      row = []
    } else cell += ch
  }
  row.push(cell)
  if (row.some(c => c.trim() !== '')) rows.push(row)
  return rows
}

function toRecords(table) {
  const [head, ...body] = table
  const map = {}
  head.forEach((h, idx) => {
    const k = keyOf(h)
    for (const [field, names] of Object.entries(HEADER_ALIASES)) if (names.includes(k) && !(field in map)) map[field] = idx
  })
  const missing = Object.keys(REQUIRED).filter(f => !(f in map)).map(f => REQUIRED[f])
  const records = body.map((cells, i) => {
    const rec = { row: i + 2 } // row 1 is the header, as in the spreadsheet
    for (const f of Object.keys(HEADER_ALIASES)) rec[f] = f in map ? (cells[map[f]] ?? '').trim() : ''
    return rec
  })
  return { missing, records }
}

const csvCell = (v) => /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v

export default function ImportResidentsModal({ onClose, onImported }) {
  const [puroks, setPuroks] = useState([])
  const [fileName, setFileName] = useState('')
  const [records, setRecords] = useState([])
  const [preview, setPreview] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(null)
  const fileRef = useRef(null)

  useEffect(() => { apiGet('/puroks').then(setPuroks).catch(() => {}) }, [])

  const downloadTemplate = () => {
    const sample = puroks[0]?.name || 'Purok 1'
    const lines = [
      ['Last Name', 'First Name', 'Middle Name', 'Sex', 'Birthdate', 'Contact Number', 'Purok', 'Relation to Head'],
      ['Dela Cruz', 'Juan', 'Santos', 'Male', '1985-03-02', '09171234567', sample, 'Head'],
      ['Dela Cruz', 'Maria', '', 'Female', '1988-11-20', '', sample, 'Spouse'],
    ].map(r => r.map(csvCell).join(','))
    const blob = new Blob(['﻿' + lines.join('\r\n') + '\r\n'], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'PDRA_Residents_Template.csv'
    document.body.appendChild(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }

  const reset = () => { setFileName(''); setRecords([]); setPreview(null); setError(''); setDone(null); if (fileRef.current) fileRef.current.value = '' }

  const onFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError(''); setPreview(null); setDone(null); setRecords([]); setFileName(file.name)
    if (!/\.csv$/i.test(file.name) && !/csv|text\/plain/.test(file.type)) {
      setError('Please choose a .csv file. In Excel: File → Save As → CSV (Comma delimited).'); return
    }
    try {
      const table = parseCsv(await file.text())
      if (table.length < 2) { setError('The file has no residents. Row 1 must be the column names, with the residents below it.'); return }
      const { missing, records: recs } = toRecords(table)
      if (missing.length) { setError(`The file is missing these columns: ${missing.join(', ')}. Download the template to see the right columns.`); return }
      if (recs.length > MAX_ROWS) { setError(`The file has ${recs.length} residents. Import at most ${MAX_ROWS} at a time — split the file and import it in parts.`); return }
      setRecords(recs)
      setBusy(true)
      setPreview(await apiPost('/residents/import', { rows: recs, commit: false }))
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  const confirmImport = async () => {
    setBusy(true); setError('')
    try {
      const r = await apiPost('/residents/import', { rows: records, commit: true })
      setDone(r); setPreview(null); onImported?.()
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  const problemRows = preview ? preview.rows.filter(r => r.errors.length) : []

  return createPortal(
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="w-9 h-9 rounded-full bg-primary-50 flex items-center justify-center flex-shrink-0">
            <FileSpreadsheet size={17} className="text-primary-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800 flex-1">Import Residents</h3>
          <button type="button" className="text-gray-400 hover:text-gray-600" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>

        <div className="overflow-y-auto px-6 py-5 space-y-4 bg-gray-50/50">
          {done ? (
            <div className="bg-white border border-green-200 rounded-xl p-5 text-center">
              <CheckCircle2 size={34} className="text-green-600 mx-auto mb-2" />
              <p className="text-base font-semibold text-gray-800">{done.imported} resident{done.imported === 1 ? '' : 's'} imported</p>
              {done.skipped > 0 && <p className="text-sm text-amber-700 mt-1">{done.skipped} row{done.skipped === 1 ? ' was' : 's were'} skipped because of problems.</p>}
              <p className="text-xs text-gray-500 mt-2">They are now in the Residents list. You can assign each one to a household later.</p>
            </div>
          ) : (
            <>
              <div className="bg-white border border-gray-200 rounded-xl p-4 text-sm text-gray-600 space-y-2">
                <p className="font-semibold text-gray-700">How it works</p>
                <ol className="list-decimal pl-5 space-y-1">
                  <li>Download the template and fill it in Excel (one resident per row).</li>
                  <li>Save it as <b>CSV</b> (File → Save As → CSV).</li>
                  <li>Choose the file below. The system checks every row first. Nothing is saved yet.</li>
                  <li>Review the result, then click Import.</li>
                </ol>
                <p className="text-xs text-gray-500">
                  Birthdate: <b>1985-03-02</b> or <b>02-03-1985</b>. Sex: Male or Female. Contact: 09XXXXXXXXX (optional).
                  Purok must match your puroks{puroks.length ? <>: <b>{puroks.map(p => p.name).join(', ')}</b></> : ''}.
                  Relation to Head: Head, Spouse, Child, Parent, Sibling or Other (optional). Up to {MAX_ROWS} residents at a time.
                </p>
                <button type="button" className="btn-secondary text-xs px-3 py-1.5 inline-flex items-center gap-1.5" onClick={downloadTemplate}>
                  <Download size={13} /> Download template
                </button>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <label className="btn-primary text-sm inline-flex items-center gap-2 cursor-pointer">
                  <Upload size={15} /> Choose CSV file
                  <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={onFile} disabled={busy} />
                </label>
                {fileName && <span className="ml-3 text-sm text-gray-600">{fileName}</span>}
                {busy && <p className="text-sm text-gray-500 mt-3">Checking… (the first request can take a moment if the server was asleep)</p>}
              </div>

              {error && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm" role="alert">
                  <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" /><span>{error}</span>
                </div>
              )}

              {preview && (
                <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                  <div className="flex flex-wrap gap-3">
                    <span className="px-3 py-1.5 rounded-lg bg-green-50 text-green-700 text-sm font-semibold">{preview.valid} ready to import</span>
                    <span className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${preview.invalid ? 'bg-amber-50 text-amber-700' : 'bg-gray-50 text-gray-500'}`}>{preview.invalid} with problems</span>
                  </div>
                  {problemRows.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Rows with problems are skipped. Fix them in the file and import them again.</p>
                      <div className="max-h-56 overflow-y-auto border border-gray-100 rounded-lg">
                        <table className="w-full text-xs">
                          <thead className="bg-gray-50 sticky top-0"><tr><th className="text-left px-2 py-1.5 w-14">Row</th><th className="text-left px-2 py-1.5">Name</th><th className="text-left px-2 py-1.5">Problem</th></tr></thead>
                          <tbody>
                            {problemRows.slice(0, 100).map(r => (
                              <tr key={r.row} className="border-t border-gray-100 align-top">
                                <td className="px-2 py-1.5">{r.row}</td>
                                <td className="px-2 py-1.5">{r.name || '—'}</td>
                                <td className="px-2 py-1.5 text-red-600">{r.errors.join(' ')}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {problemRows.length > 100 && <p className="text-xs text-gray-400 mt-1">Showing the first 100 of {problemRows.length} rows with problems.</p>}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 flex-shrink-0">
          {done ? (
            <>
              <button type="button" className="btn-secondary text-sm" onClick={reset}>Import another file</button>
              <button type="button" className="btn-primary text-sm" onClick={onClose}>Done</button>
            </>
          ) : (
            <>
              <button type="button" className="btn-secondary text-sm" onClick={onClose}>Cancel</button>
              <button type="button" className="btn-primary text-sm disabled:opacity-50" disabled={busy || !preview || preview.valid === 0} onClick={confirmImport}>
                {preview?.valid ? `Import ${preview.valid} resident${preview.valid === 1 ? '' : 's'}` : 'Import'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}