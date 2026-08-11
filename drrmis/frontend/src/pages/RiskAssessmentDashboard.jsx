import { useState, useEffect } from 'react'
import { AlertTriangle, Home, Users, Building2 } from 'lucide-react'
import { apiGet } from '../utils/api'

const RISK_BADGE = { High: 'badge-red', Medium: 'badge-orange', Low: 'badge-green' }

export default function RiskAssessmentDashboard({ currentUser }) {
  const [summary, setSummary] = useState([])
  const [loading, setLoading] = useState(true)
  const [wakingUp, setWakingUp] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setWakingUp(false)
    apiGet('/risk-assessment/summary', { onColdStart: () => setWakingUp(true) })
      .then(setSummary)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  // Barangay Officials only see their own barangay's row
  const visible = currentUser?.role === 'Barangay Official'
    ? summary.filter(s => s.barangay_name === currentUser.barangay)
    : summary

  const totals = visible.reduce((acc, s) => ({
    households: acc.households + (s.total_households || 0),
    atRiskHouseholds: acc.atRiskHouseholds + (s.at_risk_households || 0),
    population: acc.population + (s.total_population || 0),
    atRiskPopulation: acc.atRiskPopulation + (s.at_risk_population || 0),
  }), { households: 0, atRiskHouseholds: 0, population: 0, atRiskPopulation: 0 })

  if (loading) return (
    <div className="card p-10 text-center text-gray-400">
      {wakingUp ? (
        <>
          <div className="w-6 h-6 border-2 border-primary-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="font-medium text-gray-500">Waking up the server…</p>
          <p className="text-xs mt-1">This can take up to a minute after a period of inactivity. Thanks for your patience.</p>
        </>
      ) : 'Loading risk assessment data…'}
    </div>
  )
  if (error) return <div className="card p-10 text-center text-red-600">{error}</div>

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-800">Risk Assessment Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Projected households and population within high flood-risk zones, based on CDRA-aligned purok classification (geofencing).
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card p-4 text-center">
          <Home size={20} className="mx-auto mb-1 text-gray-400" />
          <p className="text-2xl font-bold text-gray-800">{totals.households.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">Total Households</p>
        </div>
        <div className="card p-4 text-center">
          <AlertTriangle size={20} className="mx-auto mb-1 text-red-500" />
          <p className="text-2xl font-bold text-red-600">{totals.atRiskHouseholds.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">Households in High-Risk Zones</p>
        </div>
        <div className="card p-4 text-center">
          <Users size={20} className="mx-auto mb-1 text-gray-400" />
          <p className="text-2xl font-bold text-gray-800">{totals.population.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">Total Population</p>
        </div>
        <div className="card p-4 text-center">
          <AlertTriangle size={20} className="mx-auto mb-1 text-red-500" />
          <p className="text-2xl font-bold text-red-600">{totals.atRiskPopulation.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">Population in High-Risk Zones</p>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="font-semibold text-sm flex items-center gap-2"><Building2 size={15} /> Per-Barangay Breakdown</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>{['Barangay','Risk Level','Total Households','At-Risk Households','Total Population','At-Risk Population'].map(h => <th key={h} className="table-head">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visible.map(s => (
                <tr key={s.barangay_id} className="hover:bg-gray-50">
                  <td className="table-cell font-medium">{s.barangay_name}</td>
                  <td className="table-cell"><span className={RISK_BADGE[s.barangay_risk_level] || 'badge-gray'}>{s.barangay_risk_level}</span></td>
                  <td className="table-cell text-center">{s.total_households}</td>
                  <td className="table-cell text-center">
                    {s.at_risk_households > 0 ? <span className="badge-red">{s.at_risk_households}</span> : <span className="text-gray-400">0</span>}
                  </td>
                  <td className="table-cell text-center">{s.total_population}</td>
                  <td className="table-cell text-center">
                    {s.at_risk_population > 0 ? <span className="badge-red">{s.at_risk_population}</span> : <span className="text-gray-400">0</span>}
                  </td>
                </tr>
              ))}
              {visible.length === 0 && <tr><td colSpan={6} className="table-cell text-center text-gray-400 py-8">No data available.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-gray-400 italic">
        "At-risk" households/population are those located within puroks classified as High flood-risk, per the CDRRMO's existing CDRA (Climate and Disaster Risk Assessment) data.
      </p>
    </div>
  )
}