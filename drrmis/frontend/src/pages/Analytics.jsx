import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts'

const responseTime = [
  { month: 'Feb', minutes: 38 }, { month: 'Mar', minutes: 35 },
  { month: 'Apr', minutes: 28 }, { month: 'May', minutes: 24 },
  { month: 'Jun', minutes: 20 }, { month: 'Jul', minutes: 18 },
]

const incidentTrend = [
  { month: 'Jan', count: 6 }, { month: 'Feb', count: 8 },
  { month: 'Mar', count: 10 }, { month: 'Apr', count: 11 },
  { month: 'May', count: 17 }, { month: 'Jun', count: 25 },
  { month: 'Jul', count: 15 },
]

const topBarangays = [
  { name: 'Kioskos',    incidents: 28 },
  { name: 'Kalambogan', incidents: 22 },
  { name: 'Barangay 3', incidents: 18 },
  { name: 'Magsaysay',  incidents: 14 },
  { name: 'Brgy. 1',    incidents: 11 },
]

const reliefTrend = [
  { month: 'Apr', families: 120 }, { month: 'May', families: 200 },
  { month: 'Jun', families: 340 }, { month: 'Jul', families: 280 },
]

const riskBreakdown = [
  { name: 'High Risk',   value: 12 },
  { name: 'Medium Risk', value: 9 },
  { name: 'Low Risk',    value: 7 },
]
const RISK_COLORS = ['#ef4444','#f59e0b','#22c55e']

const StatCard = ({ label, value, sub, color }) => (
  <div className="card p-5">
    <p className={`text-3xl font-bold ${color}`}>{value}</p>
    <p className="text-sm font-medium text-gray-700 mt-1">{label}</p>
    {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
  </div>
)

export default function Analytics() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Most Flooded Barangay"     value="Kioskos"    sub="28 flood incidents"     color="text-blue-600" />
        <StatCard label="Most Incidents"             value="Kioskos"    sub="28 total incidents"     color="text-red-600" />
        <StatCard label="Avg. Response Time"         value="18 min"     sub="Jul 2026"               color="text-green-600" />
        <StatCard label="Most Vulnerable Families"   value="342"        sub="Currently evacuated"    color="text-orange-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-semibold text-gray-700 mb-4">Incident Trend (Monthly)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={incidentTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="font-semibold text-gray-700 mb-4">Avg. Response Time (Minutes)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={responseTime}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="minutes" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="font-semibold text-gray-700 mb-4">Top Barangays by Incidents</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={topBarangays} layout="vertical" barSize={16}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="incidents" fill="#3b82f6" radius={[0,4,4,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="font-semibold text-gray-700 mb-4">Barangay Risk Distribution</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={riskBreakdown} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                {riskBreakdown.map((_, i) => <Cell key={i} fill={RISK_COLORS[i]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <h3 className="font-semibold text-gray-700 mb-4">Relief Distribution Trend (Families)</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={reliefTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="families" fill="#f59e0b" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
