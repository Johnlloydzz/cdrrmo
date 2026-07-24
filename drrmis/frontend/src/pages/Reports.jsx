import { FileText, Download, Printer } from 'lucide-react'

const reportTypes = [
  { group: 'Population', items: ['Population Report','Barangay Report','Purok Report','Household Report'] },
  { group: 'Disaster',   items: ['Hazard Report','Incident Report','Flood Report','Landslide Report'] },
  { group: 'Response',   items: ['Evacuation Report','Relief Report','Inventory Report','Resource Report'] },
  { group: 'Personnel',  items: ['Personnel Report','Monthly Report','Annual Report'] },
]

export default function Reports() {
  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h3 className="font-semibold text-gray-700 mb-1">Generate Reports</h3>
        <p className="text-sm text-gray-500 mb-6">Select a report type, set the date range, and export.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="label">Date From</label>
            <input type="date" className="input" defaultValue="2026-07-01" />
          </div>
          <div>
            <label className="label">Date To</label>
            <input type="date" className="input" defaultValue="2026-07-13" />
          </div>
          <div>
            <label className="label">Barangay</label>
            <select className="input"><option value="">All Barangays</option><option>Kioskos</option><option>Magsaysay</option><option>Kalambogan</option></select>
          </div>
          <div>
            <label className="label">Format</label>
            <select className="input"><option>PDF</option><option>Excel</option><option>CSV</option></select>
          </div>
        </div>

        <div className="space-y-4">
          {reportTypes.map(group => (
            <div key={group.group}>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">{group.group}</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {group.items.map(item => (
                  <button key={item} className="flex items-center gap-2 p-3 rounded-lg border border-gray-200 hover:border-primary-400 hover:bg-primary-50 transition-colors text-left text-sm text-gray-700 group">
                    <FileText size={15} className="text-gray-400 group-hover:text-primary-500 flex-shrink-0" />
                    {item}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100">
          <button className="btn-primary flex items-center gap-2"><Download size={15} /> Export Report</button>
          <button className="btn-secondary flex items-center gap-2"><Printer size={15} /> Print</button>
        </div>
      </div>
    </div>
  )
}
