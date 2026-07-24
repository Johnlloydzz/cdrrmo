import { useState } from 'react'
import { Truck, Wrench, Users } from 'lucide-react'

const vehicles = [
  { id: 1, name: 'Fire Truck 01',  type: 'Fire Truck',  plate: 'BFP-001', status: 'Available', location: 'Main Station' },
  { id: 2, name: 'Ambulance 01',   type: 'Ambulance',   plate: 'AMB-001', status: 'Deployed',  location: 'Kioskos' },
  { id: 3, name: 'Rescue Boat 01', type: 'Rescue Boat', plate: 'N/A',     status: 'Available', location: 'CDRRMO Base' },
  { id: 4, name: 'Pickup Truck 01',type: 'Pickup',      plate: 'GC-1234', status: 'Available', location: 'CDRRMO Base' },
]

const equipment = [
  { id: 1, name: 'Generator Set 5kva', qty: 4, available: 2, condition: 'Good' },
  { id: 2, name: 'Chainsaw',           qty: 6, available: 5, condition: 'Good' },
  { id: 3, name: 'Life Vest',          qty: 50, available: 38, condition: 'Good' },
  { id: 4, name: 'First Aid Kit',      qty: 20, available: 15, condition: 'Good' },
  { id: 5, name: 'Radio (Handheld)',   qty: 12, available: 10, condition: 'Fair' },
]

const personnel = [
  { id: 1, name: 'Carlos Mendoza', role: 'Rescue Specialist', skills: 'Swift Water, First Aid', contact: '09171234567', available: true },
  { id: 2, name: 'Mark Responder', role: 'Field Responder',   skills: 'Search & Rescue',        contact: '09182345678', available: true },
  { id: 3, name: 'Liza Cruz',      role: 'Medic',             skills: 'EMT, First Responder',   contact: '09193456789', available: false },
]

const STATUS = { Available: 'badge-green', Deployed: 'badge-orange', Maintenance: 'badge-yellow', Unavailable: 'badge-red' }

export default function ResourceManagement() {
  const [tab, setTab] = useState('vehicles')

  return (
    <div className="space-y-4">
      <div className="card p-0 overflow-hidden">
        <div className="border-b border-gray-200 flex">
          {[['vehicles','Vehicles',Truck],['equipment','Equipment',Wrench],['personnel','Personnel',Users]].map(([id,label,Icon]) => (
            <button key={id} onClick={() => setTab(id)} className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors ${tab === id ? 'border-b-2 border-primary-600 text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}>
              <Icon size={15} />{label}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          {tab === 'vehicles' && (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>{['Vehicle Name','Type','Plate','Status','Location'].map(h => <th key={h} className="table-head">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {vehicles.map(v => (
                  <tr key={v.id} className="hover:bg-gray-50">
                    <td className="table-cell font-medium">{v.name}</td>
                    <td className="table-cell">{v.type}</td>
                    <td className="table-cell font-mono">{v.plate}</td>
                    <td className="table-cell"><span className={STATUS[v.status]}>{v.status}</span></td>
                    <td className="table-cell">{v.location}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === 'equipment' && (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>{['Equipment','Total Qty','Available','Condition'].map(h => <th key={h} className="table-head">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {equipment.map(e => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="table-cell font-medium">{e.name}</td>
                    <td className="table-cell text-center">{e.qty}</td>
                    <td className="table-cell text-center font-semibold text-green-700">{e.available}</td>
                    <td className="table-cell"><span className={e.condition === 'Good' ? 'badge-green' : 'badge-yellow'}>{e.condition}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === 'personnel' && (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>{['Name','Role','Skills','Contact','Availability'].map(h => <th key={h} className="table-head">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {personnel.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="table-cell font-medium">{p.name}</td>
                    <td className="table-cell">{p.role}</td>
                    <td className="table-cell text-sm text-gray-600">{p.skills}</td>
                    <td className="table-cell">{p.contact}</td>
                    <td className="table-cell"><span className={p.available ? 'badge-green' : 'badge-red'}>{p.available ? 'Available' : 'Deployed'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
