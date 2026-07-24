import { useState } from 'react'
import { Search, Plus, Eye, Pencil } from 'lucide-react'

const initial = [
  { id: 1, rid: 'RES-001', name: 'Santos, Juan',       age: 42, gender: 'Male',   civil: 'Married',  occupation: 'Farmer',    barangay: 'Kioskos',  blood: 'O+',  pwd: false, senior: false, pregnant: false },
  { id: 2, rid: 'RES-002', name: 'Santos, Maria',      age: 38, gender: 'Female', civil: 'Married',  occupation: 'Housewife', barangay: 'Kioskos',  blood: 'A+',  pwd: false, senior: false, pregnant: true  },
  { id: 3, rid: 'RES-003', name: 'Santos, Jose Jr.',   age: 16, gender: 'Male',   civil: 'Single',   occupation: 'Student',   barangay: 'Kioskos',  blood: 'O+',  pwd: false, senior: false, pregnant: false },
  { id: 4, rid: 'RES-004', name: 'Reyes, Carlos',      age: 68, gender: 'Male',   civil: 'Widower',  occupation: 'Retired',   barangay: 'Magsaysay',blood: 'B-',  pwd: true,  senior: true,  pregnant: false },
  { id: 5, rid: 'RES-005', name: 'Dela Cruz, Ana',     age: 24, gender: 'Female', civil: 'Single',   occupation: 'Teacher',   barangay: 'Magsaysay',blood: 'AB+', pwd: false, senior: false, pregnant: false },
]

const Tag = ({ show, label }) => show ? <span className="badge-blue text-xs">{label}</span> : null

export default function ResidentManagement() {
  const [residents] = useState(initial)
  const [search, setSearch] = useState('')

  const filtered = residents.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.barangay.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Residents', value: residents.length, color: 'text-gray-800' },
          { label: 'Senior Citizens', value: residents.filter(r => r.senior).length, color: 'text-amber-600' },
          { label: 'PWD', value: residents.filter(r => r.pwd).length, color: 'text-blue-600' },
          { label: 'Pregnant', value: residents.filter(r => r.pregnant).length, color: 'text-pink-600' },
        ].map(s => (
          <div key={s.label} className="card p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="card p-4 flex flex-wrap gap-3 items-center justify-between">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Search resident or barangay…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button className="btn-primary flex items-center gap-2 text-sm"><Plus size={15} /> Register Resident</button>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>{['Res. ID','Name','Age','Gender','Civil Status','Occupation','Barangay','Blood Type','Tags','Actions'].map(h => <th key={h} className="table-head">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="table-cell font-mono text-primary-700">{r.rid}</td>
                  <td className="table-cell font-medium">{r.name}</td>
                  <td className="table-cell">{r.age}</td>
                  <td className="table-cell">{r.gender}</td>
                  <td className="table-cell">{r.civil}</td>
                  <td className="table-cell">{r.occupation}</td>
                  <td className="table-cell">{r.barangay}</td>
                  <td className="table-cell">{r.blood}</td>
                  <td className="table-cell">
                    <div className="flex gap-1 flex-wrap">
                      <Tag show={r.pwd} label="PWD" />
                      <Tag show={r.senior} label="Senior" />
                      <Tag show={r.pregnant} label="Pregnant" />
                    </div>
                  </td>
                  <td className="table-cell">
                    <div className="flex gap-2">
                      <button className="p-1.5 rounded hover:bg-blue-50 text-blue-600"><Eye size={15} /></button>
                      <button className="p-1.5 rounded hover:bg-amber-50 text-amber-600"><Pencil size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t text-xs text-gray-500">{filtered.length} of {residents.length} residents</div>
      </div>
    </div>
  )
}
