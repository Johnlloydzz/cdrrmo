import { useState } from 'react'
import { Search, Plus, Eye, Pencil, Trash2 } from 'lucide-react'

const initial = [
  { id: 1, hid: 'HH-0001', barangay: 'Kioskos',    purok: 'Purok 1', head: 'Santos, Juan',     contact: '09171234567', houseType: 'Concrete', roofType: 'GI Sheet', risk: 'High',   lat: '8.8180', lng: '125.1050' },
  { id: 2, hid: 'HH-0002', barangay: 'Kioskos',    purok: 'Purok 2', head: 'Reyes, Maria',     contact: '09182345678', houseType: 'Wooden',   roofType: 'GI Sheet', risk: 'High',   lat: '8.8175', lng: '125.1048' },
  { id: 3, hid: 'HH-0003', barangay: 'Magsaysay',  purok: 'Purok 1', head: 'Dela Cruz, Pedro', contact: '09193456789', houseType: 'Concrete', roofType: 'Concrete', risk: 'Medium', lat: '8.8260', lng: '125.1152' },
  { id: 4, hid: 'HH-0004', barangay: 'Kalambogan', purok: 'Purok 3', head: 'Lim, Roberto',     contact: '09204567890', houseType: 'Mixed',    roofType: 'GI Sheet', risk: 'High',   lat: '8.8300', lng: '125.1200' },
]
const RISK = { High: 'badge-red', Medium: 'badge-orange', Low: 'badge-green' }

export default function HouseholdManagement() {
  const [households, setHouseholds] = useState(initial)
  const [search, setSearch] = useState('')

  const filtered = households.filter(h =>
    h.head.toLowerCase().includes(search.toLowerCase()) ||
    h.barangay.toLowerCase().includes(search.toLowerCase()) ||
    h.hid.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div className="card p-4 flex flex-wrap gap-3 items-center justify-between">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Search household, head, barangay…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button className="btn-primary flex items-center gap-2 text-sm"><Plus size={15} /> Register Household</button>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>{['HH ID','Barangay','Purok','Head of Family','Contact','House Type','Roof Type','Risk','Coordinates','Actions'].map(h => <th key={h} className="table-head">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(h => (
                <tr key={h.id} className="hover:bg-gray-50">
                  <td className="table-cell font-mono text-primary-700">{h.hid}</td>
                  <td className="table-cell">{h.barangay}</td>
                  <td className="table-cell">{h.purok}</td>
                  <td className="table-cell font-medium">{h.head}</td>
                  <td className="table-cell">{h.contact}</td>
                  <td className="table-cell">{h.houseType}</td>
                  <td className="table-cell">{h.roofType}</td>
                  <td className="table-cell"><span className={RISK[h.risk]}>{h.risk}</span></td>
                  <td className="table-cell text-xs text-gray-500">{h.lat}, {h.lng}</td>
                  <td className="table-cell">
                    <div className="flex gap-2">
                      <button className="p-1.5 rounded hover:bg-blue-50 text-blue-600"><Eye size={15} /></button>
                      <button className="p-1.5 rounded hover:bg-amber-50 text-amber-600"><Pencil size={15} /></button>
                      <button className="p-1.5 rounded hover:bg-red-50 text-red-600" onClick={() => { if(window.confirm('Delete?')) setHouseholds(p => p.filter(x => x.id !== h.id)) }}><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t text-xs text-gray-500">{filtered.length} of {households.length} households</div>
      </div>
    </div>
  )
}
