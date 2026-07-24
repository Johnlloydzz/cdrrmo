import { useState } from 'react'
import { Search, Plus, Pencil } from 'lucide-react'

const initial = [
  { id: 1, eid: 'EVAC-001', family: 'Santos, Juan',    barangay: 'Kioskos',    center: 'Central Gym',       checkIn: '2026-07-13 06:00', checkOut: '',               reason: 'Flood', status: 'Ongoing', members: 4 },
  { id: 2, eid: 'EVAC-002', family: 'Reyes, Maria',    barangay: 'Kioskos',    center: 'Central Gym',       checkIn: '2026-07-13 07:30', checkOut: '',               reason: 'Flood', status: 'Ongoing', members: 3 },
  { id: 3, eid: 'EVAC-003', family: 'Dela Cruz, Pedro',barangay: 'Magsaysay',  center: 'Magsaysay Court',   checkIn: '2026-07-12 14:00', checkOut: '2026-07-12 20:00', reason: 'Landslide', status: 'Checked Out', members: 5 },
]

export default function EvacuationManagement() {
  const [records] = useState(initial)
  const [search, setSearch] = useState('')

  const filtered = records.filter(r =>
    r.family.toLowerCase().includes(search.toLowerCase()) ||
    r.barangay.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Records', value: records.length, c: 'text-gray-800' },
          { label: 'Ongoing', value: records.filter(r => r.status === 'Ongoing').length, c: 'text-orange-600' },
          { label: 'Checked Out', value: records.filter(r => r.status === 'Checked Out').length, c: 'text-green-600' },
          { label: 'Families Evacuated', value: records.reduce((a, r) => a + r.members, 0), c: 'text-blue-600' },
        ].map(s => (
          <div key={s.label} className="card p-4 text-center"><p className={`text-2xl font-bold ${s.c}`}>{s.value}</p><p className="text-xs text-gray-500 mt-1">{s.label}</p></div>
        ))}
      </div>

      <div className="card p-4 flex flex-wrap gap-3 items-center justify-between">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Search family or barangay…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button className="btn-primary flex items-center gap-2 text-sm"><Plus size={15} /> Log Evacuation</button>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>{['Evac ID','Family','Barangay','Center','Members','Reason','Check In','Check Out','Status','Actions'].map(h => <th key={h} className="table-head">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="table-cell font-mono text-primary-700">{r.eid}</td>
                  <td className="table-cell font-medium">{r.family}</td>
                  <td className="table-cell">{r.barangay}</td>
                  <td className="table-cell">{r.center}</td>
                  <td className="table-cell text-center">{r.members}</td>
                  <td className="table-cell">{r.reason}</td>
                  <td className="table-cell text-xs">{r.checkIn}</td>
                  <td className="table-cell text-xs">{r.checkOut || '—'}</td>
                  <td className="table-cell"><span className={r.status === 'Ongoing' ? 'badge-orange' : 'badge-green'}>{r.status}</span></td>
                  <td className="table-cell"><button className="p-1.5 rounded hover:bg-amber-50 text-amber-600"><Pencil size={15} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
