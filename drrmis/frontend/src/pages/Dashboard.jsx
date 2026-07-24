import { useNavigate } from 'react-router-dom'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell,
  AreaChart, Area
} from 'recharts'
import {
  Users, Home, Building2, AlertTriangle, Tent, Package,
  UserCheck, Truck, ShieldAlert, CheckCircle, MapPin,
  Bell, FileText, Map, Plus, Activity, Settings,
  Baby, PersonStanding, HeartHandshake, Accessibility,
  Flame, Waves, Mountain, Wind, Zap, Construction,
  HousePlus, Ambulance, UserPlus,
  ClipboardList, Navigation, Thermometer,
  Droplets, Eye, CloudLightning, Send,
  RefreshCw, Clock, ChevronRight
} from 'lucide-react'

// ── Mock Data ──────────────────────────────────────────────────────────────

const summaryCards = [
  { label: 'Total Registered Users',  value: '142',     icon: UserCheck,    color: 'bg-violet-500',  ring: 'ring-violet-200' },
  { label: 'Total Barangays',         value: '28',      icon: Building2,     color: 'bg-indigo-500',  ring: 'ring-indigo-200' },
  { label: 'Total Puroks',            value: '186',     icon: MapPin,        color: 'bg-blue-500',    ring: 'ring-blue-200' },
  { label: 'Total Population',        value: '94,831',  icon: Users,         color: 'bg-sky-500',     ring: 'ring-sky-200' },
  { label: 'Total Households',        value: '18,246',  icon: Home,          color: 'bg-teal-500',    ring: 'ring-teal-200' },
  { label: 'Total Active Hazards',    value: '7',       icon: ShieldAlert,   color: 'bg-red-500',     ring: 'ring-red-200' },
  { label: 'Total Active Incidents',  value: '12',      icon: AlertTriangle, color: 'bg-orange-500',  ring: 'ring-orange-200' },
  { label: 'Total Evacuation Centers',value: '9',       icon: Tent,          color: 'bg-amber-500',   ring: 'ring-amber-200' },
]

const incidentStats = [
  { label: 'Total Incidents Today', value: '4',   color: 'text-red-600',    bg: 'bg-red-50',    border: 'border-red-200' },
  { label: 'Weekly Incidents',      value: '18',  color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
  { label: 'Monthly Incidents',     value: '63',  color: 'text-amber-600',  bg: 'bg-amber-50',  border: 'border-amber-200' },
  { label: 'Yearly Incidents',      value: '284', color: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-200' },
]

const hazardDistribution = [
  { label: 'Flood',        value: 45, icon: Waves,        color: 'text-blue-600',  bg: 'bg-blue-100' },
  { label: 'Landslide',    value: 20, icon: Mountain,     color: 'text-amber-600', bg: 'bg-amber-100' },
  { label: 'Fire',         value: 15, icon: Flame,        color: 'text-red-600',   bg: 'bg-red-100' },
  { label: 'Earthquake',   value: 8,  icon: Zap,          color: 'text-purple-600',bg: 'bg-purple-100' },
  { label: 'Storm Surge',  value: 7,  icon: Wind,         color: 'text-cyan-600',  bg: 'bg-cyan-100' },
  { label: 'Road Collapse',value: 5,  icon: Construction, color: 'text-stone-600', bg: 'bg-stone-100' },
]

const populationStats = [
  { label: 'Total Residents',   value: '94,831', icon: Users,           color: 'text-blue-600',  bg: 'bg-blue-100' },
  { label: 'Children (0-17)',   value: '28,449', icon: Baby,            color: 'text-pink-600',  bg: 'bg-pink-100' },
  { label: 'Adults (18-59)',    value: '54,201', icon: PersonStanding,  color: 'text-green-600', bg: 'bg-green-100' },
  { label: 'Senior Citizens',   value: '12,181', icon: HeartHandshake,  color: 'text-purple-600',bg: 'bg-purple-100' },
  { label: 'PWD',               value: '2,340',  icon: Accessibility,   color: 'text-orange-600',bg: 'bg-orange-100' },
  { label: 'Pregnant Women',    value: '876',    icon: Activity,        color: 'text-rose-600',  bg: 'bg-rose-100' },
]

const disasterStats = [
  { label: 'Families Affected',  value: '1,204', color: 'text-red-600',    bg: 'bg-red-50',    border: 'border-red-200' },
  { label: 'Population Affected',value: '5,820', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
  { label: 'Houses Damaged',     value: '312',   color: 'text-amber-600',  bg: 'bg-amber-50',  border: 'border-amber-200' },
  { label: 'Casualties',         value: '3',     color: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-300' },
  { label: 'Missing Persons',    value: '7',     color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
  { label: 'Injured Persons',    value: '48',    color: 'text-rose-600',   bg: 'bg-rose-50',   border: 'border-rose-200' },
]

// ── Chart Data ──────────────────────────────────────────────────────────────

const monthlyHazardReports = [
  { month: 'Jan', Flood: 8, Landslide: 3, Fire: 4, RoadDamage: 2 },
  { month: 'Feb', Flood: 12, Landslide: 5, Fire: 3, RoadDamage: 1 },
  { month: 'Mar', Flood: 10, Landslide: 4, Fire: 5, RoadDamage: 3 },
  { month: 'Apr', Flood: 15, Landslide: 6, Fire: 4, RoadDamage: 2 },
  { month: 'May', Flood: 20, Landslide: 8, Fire: 6, RoadDamage: 4 },
  { month: 'Jun', Flood: 25, Landslide: 10, Fire: 5, RoadDamage: 5 },
  { month: 'Jul', Flood: 22, Landslide: 9, Fire: 4, RoadDamage: 3 },
]

const incidentStatusData = [
  { name: 'Pending', value: 5 },
  { name: 'Verified', value: 12 },
  { name: 'Ongoing', value: 8 },
  { name: 'Resolved', value: 45 },
]

const hazardTypeDistribution = [
  { name: 'Flood', value: 45 },
  { name: 'Landslide', value: 20 },
  { name: 'Fire', value: 15 },
  { name: 'Road Damage', value: 10 },
  { name: 'Other', value: 10 },
]

const populationByBarangay = [
  { barangay: 'Kioskos', population: 3245 },
  { barangay: 'Magsaysay', population: 4120 },
  { barangay: 'Kalipay', population: 2890 },
  { barangay: 'Tuburan', population: 3560 },
  { barangay: 'Mabuhay', population: 3010 },
  { barangay: 'San Isidro', population: 2540 },
]

const recentAdminActivities = [
  { type: 'User Registration', text: 'New user registered: Maria Santos (Barangay Admin)', time: '10 min ago' },
  { type: 'Hazard Report', text: 'New flood hazard reported in Brgy. Kioskos', time: '30 min ago' },
  { type: 'System Update', text: 'System configuration updated: New barangay added', time: '1 hr ago' },
  { type: 'Incident Update', text: 'Incident INC-2025-001 status updated to Resolved', time: '2 hrs ago' },
]

const systemNotifications = [
  { type: 'New User Registration', text: 'John Doe - Brgy. Kioskos', priority: 'info' },
  { type: 'Pending Account Approval', text: '3 accounts awaiting approval', priority: 'warning' },
  { type: 'Database Backup Reminder', text: 'Last backup was 3 days ago', priority: 'critical' },
]

const PIE_COLORS = ['#3b82f6','#f59e0b','#ef4444','#8b5cf6','#06b6d4']

const monthlyIncidents = [
  { month: 'Jan', Flood: 3,  Landslide: 1, Fire: 2, Earthquake: 0 },
  { month: 'Feb', Flood: 5,  Landslide: 2, Fire: 1, Earthquake: 1 },
  { month: 'Mar', Flood: 4,  Landslide: 3, Fire: 3, Earthquake: 0 },
  { month: 'Apr', Flood: 8,  Landslide: 1, Fire: 2, Earthquake: 1 },
  { month: 'May', Flood: 12, Landslide: 4, Fire: 1, Earthquake: 0 },
  { month: 'Jun', Flood: 15, Landslide: 6, Fire: 4, Earthquake: 2 },
  { month: 'Jul', Flood: 10, Landslide: 3, Fire: 2, Earthquake: 1 },
]

const hazardPie = [
  { name: 'Flood',         value: 45 },
  { name: 'Landslide',     value: 20 },
  { name: 'Fire',          value: 15 },
  { name: 'Earthquake',    value: 8  },
  { name: 'Storm Surge',   value: 7  },
  { name: 'Road Collapse', value: 5  },
]

const barangayIncidents = [
  { barangay: 'Brgy. Kioskos',    count: 8 },
  { barangay: 'Brgy. Magsaysay',  count: 6 },
  { barangay: 'Brgy. Kalipay',    count: 5 },
  { barangay: 'Brgy. Tuburan',    count: 4 },
  { barangay: 'Brgy. Mabuhay',    count: 7 },
  { barangay: 'Brgy. San Isidro', count: 3 },
  { barangay: 'Brgy. Buenavista', count: 5 },
  { barangay: 'Brgy. Centro',     count: 2 },
]

const floodVsLandslide = [
  { month: 'Jan', Flood: 3,  Landslide: 1 },
  { month: 'Feb', Flood: 5,  Landslide: 2 },
  { month: 'Mar', Flood: 4,  Landslide: 3 },
  { month: 'Apr', Flood: 8,  Landslide: 1 },
  { month: 'May', Flood: 12, Landslide: 4 },
  { month: 'Jun', Flood: 15, Landslide: 6 },
  { month: 'Jul', Flood: 10, Landslide: 3 },
]

const reliefData = [
  { month: 'Feb', Rice: 200, Sardines: 150, Water: 300 },
  { month: 'Mar', Rice: 320, Sardines: 210, Water: 400 },
  { month: 'Apr', Rice: 480, Sardines: 300, Water: 520 },
  { month: 'May', Rice: 360, Sardines: 260, Water: 410 },
  { month: 'Jun', Rice: 540, Sardines: 380, Water: 600 },
  { month: 'Jul', Rice: 420, Sardines: 310, Water: 480 },
]

const evacuationOccupancy = [
  { center: 'Centro Gym',       capacity: 300, occupied: 240 },
  { center: 'Brgy. Hall 3',     capacity: 150, occupied: 80  },
  { center: 'Magsaysay Sch.',   capacity: 200, occupied: 190 },
  { center: 'Kioskos Gym',      capacity: 250, occupied: 120 },
  { center: 'Kalipay Hall',     capacity: 100, occupied: 65  },
]

const populationGrowth = [
  { year: '2020', population: 88200 },
  { year: '2021', population: 89750 },
  { year: '2022', population: 91300 },
  { year: '2023', population: 92800 },
  { year: '2024', population: 93900 },
  { year: '2025', population: 94831 },
]

// ── Recent Activities ───────────────────────────────────────────────────────

const recentActivities = [
  { type: 'Hazard',     badge: 'bg-red-100 text-red-700', text: 'New flood hazard reported in Brgy. Kioskos',           time: '5 min ago'  },
  { type: 'User',       badge: 'bg-blue-100 text-blue-700', text: 'New barangay admin registered: Brgy. San Isidro',      time: '22 min ago' },
  { type: 'Household',  badge: 'bg-gray-100 text-gray-700', text: 'Household records updated — Brgy. Magsaysay (14 new)', time: '45 min ago' },
  { type: 'Evacuation', badge: 'bg-orange-100 text-orange-700', text: '24 families evacuated to Centro Gymnasium',            time: '1 hr ago'   },
  { type: 'Relief',     badge: 'bg-green-100 text-green-700', text: 'Rice and canned goods distributed — Brgy. Kalipay',   time: '2 hrs ago'  },
  { type: 'Resource',   badge: 'bg-amber-100 text-amber-700', text: '2 rescue boats deployed to Tuburan district',          time: '3 hrs ago'  },
]

// ── Alert Banners ───────────────────────────────────────────────────────────

const alertBanners = [
  { label: 'RED',    text: 'Severe flooding in lower barangays. Mandatory evacuation in effect.', bg: 'bg-red-600' },
  { label: 'ORANGE', text: 'Heavy rainfall warning. Monitor river levels closely.',               bg: 'bg-orange-500' },
]

// ── GIS Layer Items ─────────────────────────────────────────────────────────

const gisLayers = [
  { label: 'Flood Areas',         dot: 'bg-blue-500' },
  { label: 'Landslide Areas',     dot: 'bg-amber-500' },
  { label: 'Fire Incidents',      dot: 'bg-red-500' },
  { label: 'Active Responders',   dot: 'bg-green-500' },
  { label: 'Evacuation Centers',  dot: 'bg-purple-500' },
  { label: 'Barangay Boundaries', dot: 'bg-gray-400' },
]

// ── Sub-Components ─────────────────────────────────────────────────────────

function SummaryCard({ label, value, icon: Icon, color, ring }) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-3 ring-1 ${ring}`}>
      <div className={`w-11 h-11 rounded-xl ${color} flex items-center justify-center flex-shrink-0`}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <p className="text-xl font-bold text-gray-800 leading-tight">{value}</p>
        <p className="text-xs text-gray-500 mt-0.5 leading-tight">{label}</p>
      </div>
    </div>
  )
}

function StatCard({ label, value, color, bg, border }) {
  return (
    <div className={`${bg} border ${border} rounded-xl p-4 text-center`}>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-gray-600 mt-1 leading-tight">{label}</p>
    </div>
  )
}

function HazardItem({ label, value, icon: Icon, color, bg }) {
  const total = hazardDistribution.reduce((s, h) => s + h.value, 0)
  const pct = Math.round((value / total) * 100)
  return (
    <div className="flex items-center gap-3">
      <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
        <Icon size={14} className={color} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm text-gray-700 font-medium">{label}</span>
          <span className="text-xs font-semibold text-gray-500">{pct}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-1.5">
          <div
            className="h-1.5 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  )
}

function PopulationItem({ label, value, icon: Icon, color, bg }) {
  return (
    <div className={`${bg} rounded-xl p-3 flex items-center gap-3`}>
      <div className="w-8 h-8 rounded-lg bg-white/60 flex items-center justify-center flex-shrink-0">
        <Icon size={15} className={color} />
      </div>
      <div>
        <p className={`text-lg font-bold ${color} leading-tight`}>{value}</p>
        <p className="text-xs text-gray-600 leading-tight">{label}</p>
      </div>
    </div>
  )
}

// ── Personnel Dashboard Data ────────────────────────────────────────────────

const personnelCards = [
  { label: 'Active Hazard Reports',   value: '7',  icon: ShieldAlert,   color: 'bg-red-500',     ring: 'ring-red-200' },
  { label: 'Ongoing Incidents',       value: '12', icon: AlertTriangle, color: 'bg-orange-500',  ring: 'ring-orange-200' },
  { label: 'Verified Incidents',      value: '8',  icon: CheckCircle,   color: 'bg-green-500',   ring: 'ring-green-200' },
  { label: 'Population Affected',     value: '5,820', icon: Users,         color: 'bg-blue-500',    ring: 'ring-blue-200' },
  { label: 'Families Affected',       value: '1,204', icon: Home,          color: 'bg-indigo-500',  ring: 'ring-indigo-200' },
  { label: 'Evacuation Centers in Use', value: '9',  icon: Tent,          color: 'bg-teal-500',    ring: 'ring-teal-200' },
  { label: 'Active Field Responders', value: '22', icon: UserCheck,     color: 'bg-violet-500',  ring: 'ring-violet-200' },
  { label: 'Available Rescue Resources', value: '14', icon: Package,        color: 'bg-amber-500',  ring: 'ring-amber-200' },
]

const incidentQueue = [
  { id: 'INC-2025-001', barangay: 'Brgy. Kioskos',    purok: 'Purok 3', type: 'Flood',     reporter: 'Ana Reyes',    status: 'Unverified', priority: 'High',   time: '08:12 AM', assignedResponder: '—' },
  { id: 'INC-2025-002', barangay: 'Brgy. Magsaysay',  purok: 'Purok 1', type: 'Landslide', reporter: 'Ben Santos',   status: 'Verified',   priority: 'High',   time: '08:45 AM', assignedResponder: 'Alpha Team' },
  { id: 'INC-2025-003', barangay: 'Brgy. Kalipay',    purok: 'Purok 5', type: 'Fire',      reporter: 'Carl Diaz',    status: 'Responding', priority: 'Critical',time: '09:03 AM', assignedResponder: 'Bravo Team' },
  { id: 'INC-2025-004', barangay: 'Brgy. Tuburan',    purok: 'Purok 2', type: 'Flood',     reporter: 'Diana Cruz',   status: 'Unverified', priority: 'Medium', time: '09:30 AM', assignedResponder: '—' },
  { id: 'INC-2025-005', barangay: 'Brgy. Mabuhay',    purok: 'Purok 4', type: 'Road Collapse',reporter:'Edgar Tan', status: 'Verified',   priority: 'Medium', time: '09:55 AM', assignedResponder: 'Delta Team' },
  { id: 'INC-2025-006', barangay: 'Brgy. San Isidro', purok: 'Purok 6', type: 'Storm Surge',reporter:'Faye Lim',    status: 'Resolved',   priority: 'Low',    time: '10:20 AM', assignedResponder: 'Charlie Team' },
]

const personnelChartsData = {
  incidentsByType: [
    { name: 'Flood', value: 45 },
    { name: 'Landslide', value: 20 },
    { name: 'Fire', value: 15 },
    { name: 'Road Collapse', value: 10 },
    { name: 'Storm Surge', value: 10 },
  ],
  monthlyTrend: [
    { month: 'Jan', incidents: 12 },
    { month: 'Feb', incidents: 18 },
    { month: 'Mar', incidents: 22 },
    { month: 'Apr', incidents: 28 },
    { month: 'May', incidents: 35 },
    { month: 'Jun', incidents: 42 },
    { month: 'Jul', incidents: 38 },
  ],
  mostAffectedBarangays: [
    { barangay: 'Kioskos', count: 45 },
    { barangay: 'Magsaysay', count: 38 },
    { barangay: 'Kalipay', count: 32 },
    { barangay: 'Tuburan', count: 28 },
    { barangay: 'Mabuhay', count: 25 },
  ],
  responseStatus: [
    { name: 'Unverified', value: 5 },
    { name: 'Verified', value: 12 },
    { name: 'Responding', value: 8 },
    { name: 'Resolved', value: 45 },
  ],
}

const personnelRecentActivities = [
  { type: 'New Hazard Report', text: 'Flood reported in Brgy. Kioskos, Purok 3', time: '5 min ago' },
  { type: 'Incident Verification', text: 'Verified landslide in Brgy. Magsaysay', time: '18 min ago' },
  { type: 'Response Team Deployment', text: 'Bravo Team deployed to Brgy. Kalipay fire', time: '32 min ago' },
  { type: 'Evacuation Update', text: '50 more families evacuated to Centro Gym', time: '1 hr ago' },
]

const responseTeams = [
  { team: 'Alpha Team',  status: 'En Route',   eta: '10 min',  update: 'Heading to Brgy. Kioskos flood area',   gps: '8.8203° N, 125.1150° E' },
  { team: 'Bravo Team',  status: 'On Scene',   eta: 'Arrived', update: 'Conducting rescue ops at Kalipay Fire', gps: '8.8190° N, 125.1165° E' },
  { team: 'Charlie Team',status: 'Standby',    eta: '—',       update: 'Awaiting deployment orders',            gps: 'CDRRMO Base' },
  { team: 'Delta Team',  status: 'En Route',   eta: '22 min',  update: 'Mobilizing to Magsaysay landslide',     gps: '8.8215° N, 125.1140° E' },
]

const reliefSummary = [
  { label: 'Remaining Rice',  value: '1,240 kg', pct: 62, color: 'bg-green-500' },
  { label: 'Remaining Water', value: '3,800 L',  pct: 76, color: 'bg-blue-500'  },
  { label: 'Medicine',        value: '580 pcs',  pct: 45, color: 'bg-red-500'   },
  { label: 'Blankets',        value: '420 pcs',  pct: 84, color: 'bg-indigo-500'},
  { label: 'Hygiene Kits',    value: '310 sets', pct: 31, color: 'bg-amber-500' },
]

const personnelAlerts = [
  { label: 'RED',    text: 'Severe flooding in lower barangays. Mandatory evacuation in effect.', bg: 'bg-red-600' },
  { label: 'ORANGE', text: 'Heavy rainfall warning. Monitor river levels closely.',               bg: 'bg-orange-500' },
]

// ── Barangay Admin Dashboard Data ───────────────────────────────────────────────

const barangayAdminCards = [
  { label: 'Total Population',        value: '3,245', icon: Users,         color: 'bg-blue-500',    ring: 'ring-blue-200' },
  { label: 'Total Households',        value: '689',   icon: Home,          color: 'bg-indigo-500',  ring: 'ring-indigo-200' },
  { label: 'Total Puroks',            value: '7',     icon: MapPin,        color: 'bg-teal-500',    ring: 'ring-teal-200' },
  { label: 'Active Hazard Reports',   value: '3',     icon: ShieldAlert,   color: 'bg-red-500',     ring: 'ring-red-200' },
  { label: 'Families in High-Risk Areas', value: '123', icon: AlertTriangle, color: 'bg-orange-500',  ring: 'ring-orange-200' },
  { label: 'Evacuated Families',      value: '45',    icon: HousePlus,     color: 'bg-amber-500',   ring: 'ring-amber-200' },
  { label: 'Active Incidents',        value: '2',     icon: AlertTriangle, color: 'bg-pink-500',    ring: 'ring-pink-200' },
  { label: 'Registered Residents',    value: '3,200', icon: UserCheck,     color: 'bg-green-500',   ring: 'ring-green-200' },
]

const barangayPopulationSummary = [
  { label: 'Children',         value: '975', icon: Baby,            color: 'text-pink-600',  bg: 'bg-pink-100' },
  { label: 'Adults',           value: '1,852', icon: PersonStanding, color: 'text-green-600', bg: 'bg-green-100' },
  { label: 'Senior Citizens',  value: '418', icon: HeartHandshake,  color: 'text-purple-600', bg: 'bg-purple-100' },
  { label: 'Persons with Disabilities (PWD)', value: '78', icon: Accessibility, color: 'text-orange-600', bg: 'bg-orange-100' },
  { label: 'Pregnant Women',   value: '22',  icon: Activity,        color: 'text-rose-600',   bg: 'bg-rose-100' },
  { label: 'Solo Parents',     value: '56',  icon: UserPlus,        color: 'text-indigo-600', bg: 'bg-indigo-100' },
]

const barangayRecentHazardReports = [
  { hazardType: 'Flood', location: 'Purok 3', dateReported: '1 hour ago', status: 'Reported' },
  { hazardType: 'Landslide', location: 'Purok 5', dateReported: '3 hours ago', status: 'Verified' },
  { hazardType: 'Road Damage', location: 'Purok 2', dateReported: 'Yesterday', status: 'Ongoing' },
]

const barangayRecentHouseholdUpdates = [
  { type: 'Newly Registered Families', title: 'Santos Family', time: '2 hours ago' },
  { type: 'Updated Resident Information', title: 'Juan Dela Cruz', time: '4 hours ago' },
  { type: 'New Household Records', title: 'Reyes Family', time: 'Yesterday' },
]

const barangayAnnouncements = [
  { type: 'Weather Advisory', title: 'Heavy Rain Expected', message: 'Moderate to heavy rain expected in the next 24 hours.' },
  { type: 'CDRRMO Alerts', title: 'Flood Warning', message: 'Low-lying areas should prepare for possible evacuation.' },
  { type: 'Evacuation Notices', title: 'Evacuation Center Open', message: 'Brgy. Hall Gym is open for evacuees.' },
]

const barangayChartsData = {
  populationByPurok: [
    { purok: 'Purok 1', population: 450 },
    { purok: 'Purok 2', population: 520 },
    { purok: 'Purok 3', population: 480 },
    { purok: 'Purok 4', population: 420 },
    { purok: 'Purok 5', population: 380 },
    { purok: 'Purok 6', population: 350 },
    { purok: 'Purok 7', population: 445 },
  ],
  hazardDistribution: [
    { name: 'Flood', value: 45 },
    { name: 'Landslide', value: 25 },
    { name: 'Fire', value: 15 },
    { name: 'Road Damage', value: 15 },
  ],
  householdDistribution: [
    { purok: 'Purok 1', households: 98 },
    { purok: 'Purok 2', households: 112 },
    { purok: 'Purok 3', households: 105 },
    { purok: 'Purok 4', households: 92 },
    { purok: 'Purok 5', households: 85 },
    { purok: 'Purok 6', households: 78 },
    { purok: 'Purok 7', households: 97 },
  ],
  incidentTrend: [
    { month: 'Jan', incidents: 5 },
    { month: 'Feb', incidents: 8 },
    { month: 'Mar', incidents: 6 },
    { month: 'Apr', incidents: 10 },
    { month: 'May', incidents: 12 },
    { month: 'Jun', incidents: 15 },
    { month: 'Jul', incidents: 13 },
  ],
}

// Field Responder Dashboard Data
const fieldResponderCards = [
  { label: 'Assigned Incidents', value: '3', icon: AlertTriangle, color: 'bg-orange-500', ring: 'ring-orange-200' },
  { label: 'Pending Assignments', value: '1', icon: Clock, color: 'bg-yellow-500', ring: 'ring-yellow-200' },
  { label: 'Completed Responses', value: '12', icon: CheckCircle, color: 'bg-green-500', ring: 'ring-green-200' },
  { label: 'Active Response Status', value: 'On Scene', icon: Activity, color: 'bg-red-500', ring: 'ring-red-200' },
]

const assignedIncidents = [
  { id: 'INC-2025-002', barangay: 'Brgy. Magsaysay', purok: 'Purok 1', type: 'Landslide', priority: 'High', status: 'Assigned', dateAssigned: '10:30 AM' },
  { id: 'INC-2025-003', barangay: 'Brgy. Kalipay', purok: 'Purok 5', type: 'Fire', priority: 'Critical', status: 'En Route', dateAssigned: '09:03 AM' },
  { id: 'INC-2025-001', barangay: 'Brgy. Kioskos', purok: 'Purok 3', type: 'Flood', priority: 'High', status: 'On Scene', dateAssigned: '08:12 AM' },
]

const incidentDetails = {
  id: 'INC-2025-001',
  hazardDescription: 'Flash flooding due to heavy rain affecting 30 households in Purok 3.',
  reporter: 'Ana Reyes',
  photos: 3,
  dateTime: '2025-07-13 08:12 AM',
  affectedArea: 'Purok 3, Brgy. Kioskos',
  responseStatus: 'On Scene',
}

const recentUpdates = [
  { type: 'Newly Assigned Incidents', title: 'INC-2025-002 - Landslide', time: '10 min ago' },
  { type: 'Status Updates', title: 'INC-2025-001 - On Scene', time: '45 min ago' },
  { type: 'Emergency Announcements', title: 'Evacuation Center open', time: '1 hr ago' },
]

const weatherInfo = {
  current: '28°C, Cloudy',
  rainfall: '42 mm',
  floodWarning: 'High',
  landslideWarning: 'Moderate',
}

// ── Barangay Admin Sub-Components ───────────────────────────────────────────────

function BarangayDashboard({ navigate }) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Barangay Admin Dashboard</h2>
          <p className="text-sm text-gray-500 mt-0.5">Manage your barangay's disaster preparedness and response</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-green-100 text-green-700 px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Data Updated
          </span>
        </div>
      </div>

      {/* Summary Cards */}
      <section>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Summary Cards</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {barangayAdminCards.map((c) => <SummaryCard key={c.label} {...c} />)}
        </div>
      </section>



      {/* Population Summary */}
      <section>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Population Summary</h3>
        <div className="card">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {barangayPopulationSummary.map((p) => (
              <div key={p.label} className={`${p.bg} rounded-xl p-3 flex items-center gap-2`}>
                <p.icon size={16} className={p.color} />
                <div>
                  <p className={`text-sm font-bold ${p.color} leading-tight`}>{p.value}</p>
                  <p className="text-[10px] text-gray-500 leading-tight">{p.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recent Hazard Reports + Recent Household Updates */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Hazard Reports */}
        <section>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Recent Hazard Reports</h3>
          <div className="card">
            <div className="divide-y divide-gray-100">
              {barangayRecentHazardReports.map((r, i) => (
                <div key={i} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-red-50">
                      {r.hazardType === 'Flood' && <Waves size={14} className="text-red-600" />}
                      {r.hazardType === 'Landslide' && <Mountain size={14} className="text-amber-600" />}
                      {r.hazardType === 'Road Damage' && <Construction size={14} className="text-stone-600" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{r.hazardType} - {r.location}</p>
                      <p className="text-xs text-gray-500">{r.dateReported}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      r.status === 'Reported' ? 'bg-yellow-100 text-yellow-700' :
                      r.status === 'Verified' ? 'bg-blue-100 text-blue-700' :
                      'bg-orange-100 text-orange-700'
                    }`}>{r.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Recent Household Updates */}
        <section>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Recent Household Updates</h3>
          <div className="card">
            <div className="divide-y divide-gray-100">
              {barangayRecentHouseholdUpdates.map((u, i) => (
                <div key={i} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-50">
                      {u.type === 'Newly Registered Families' && <Home size={14} className="text-blue-600" />}
                      {u.type === 'Updated Resident Information' && <Users size={14} className="text-green-600" />}
                      {u.type === 'New Household Records' && <FileText size={14} className="text-indigo-600" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{u.title}</p>
                      <p className="text-xs text-gray-500">{u.type}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">{u.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* Charts */}
      <section>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Charts</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Population by Purok */}
          <div className="card">
            <h4 className="font-semibold text-gray-700 text-sm mb-4">Population by Purok</h4>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barangayChartsData.populationByPurok} layout="vertical" barSize={14}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="purok" type="category" tick={{ fontSize: 11 }} width={80} />
                <Tooltip />
                <Bar dataKey="population" fill="#6366f1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Hazard Distribution */}
          <div className="card">
            <h4 className="font-semibold text-gray-700 text-sm mb-4">Hazard Distribution</h4>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={barangayChartsData.hazardDistribution}
                  cx="50%" cy="50%"
                  outerRadius={75}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {barangayChartsData.hazardDistribution.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Household Distribution */}
          <div className="card">
            <h4 className="font-semibold text-gray-700 text-sm mb-4">Household Distribution</h4>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barangayChartsData.householdDistribution} barSize={14}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="purok" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="households" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Incident Trend */}
          <div className="card">
            <h4 className="font-semibold text-gray-700 text-sm mb-4">Incident Trend</h4>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={barangayChartsData.incidentTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="incidents" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Barangay Announcements */}
      <section>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Barangay Announcements</h3>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {barangayAnnouncements.map((a, i) => (
            <div key={i} className={`card border-l-4 ${
              a.type === 'Weather Advisory' ? 'border-l-blue-500' :
              a.type === 'CDRRMO Alerts' ? 'border-l-red-500' :
              'border-l-purple-500'
            }`}>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{a.type}</p>
              <h4 className="font-semibold text-gray-800 text-sm mb-2">{a.title}</h4>
              <p className="text-xs text-gray-600">{a.message}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Quick Actions */}
      <section>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: 'Register Household', icon: Home, color: 'bg-blue-500 hover:bg-blue-600', path: '/households' },
            { label: 'Register Resident', icon: UserPlus, color: 'bg-indigo-500 hover:bg-indigo-600', path: '/residents' },
            { label: 'Report Hazard', icon: ShieldAlert, color: 'bg-red-500 hover:bg-red-600', path: '/hazards' },
          ].map((action) => (
            <button
              key={action.label}
              onClick={() => navigate(action.path)}
              className={`${action.color} text-white rounded-xl p-4 flex flex-col items-center gap-2 transition-colors shadow-sm`}
            >
              <action.icon size={22} />
              <span className="text-xs font-medium text-center leading-tight">{action.label}</span>
            </button>
          ))}
        </div>
      </section>

    </div>
  )
}

// ── Field Responder Sub-Components ───────────────────────────────────────────────

function FieldResponderDashboard({ navigate }) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Field Responder Dashboard</h2>
          <p className="text-sm text-gray-500 mt-0.5">Disaster response operations and incident management</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-green-100 text-green-700 px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Status: On Scene
          </span>
        </div>
      </div>

      {/* Summary Cards */}
      <section>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Summary Cards</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {fieldResponderCards.map((c) => <SummaryCard key={c.label} {...c} />)}
        </div>
      </section>

      {/* Assigned Incidents List + GIS Navigation Map */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Assigned Incidents List */}
        <section className="xl:col-span-2">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Assigned Incidents</h3>
          <div className="card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="table-head">Incident No.</th>
                    <th className="table-head">Hazard Type</th>
                    <th className="table-head">Barangay</th>
                    <th className="table-head hidden md:table-cell">Purok</th>
                    <th className="table-head">Priority</th>
                    <th className="table-head">Status</th>
                    <th className="table-head hidden lg:table-cell">Date Assigned</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {assignedIncidents.map((inc) => (
                    <tr key={inc.id} className="hover:bg-gray-50 transition-colors cursor-pointer">
                      <td className="table-cell font-mono text-xs text-blue-600 font-semibold whitespace-nowrap">{inc.id}</td>
                      <td className="table-cell whitespace-nowrap">
                        <span className="inline-flex items-center gap-1">
                          {inc.type === 'Flood' && <Waves size={12} className="text-blue-500" />}
                          {inc.type === 'Landslide' && <Mountain size={12} className="text-amber-500" />}
                          {inc.type === 'Fire' && <Flame size={12} className="text-red-500" />}
                          {inc.type}
                        </span>
                      </td>
                      <td className="table-cell whitespace-nowrap">{inc.barangay}</td>
                      <td className="table-cell hidden md:table-cell text-gray-500">{inc.purok}</td>
                      <td className="table-cell"><PriorityBadge priority={inc.priority} /></td>
                      <td className="table-cell">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          inc.status === 'Assigned' ? 'bg-gray-100 text-gray-700' :
                          inc.status === 'En Route' ? 'bg-yellow-100 text-yellow-700' :
                          inc.status === 'On Scene' ? 'bg-orange-100 text-orange-700' :
                          inc.status === 'Responding' ? 'bg-blue-100 text-blue-700' :
                          'bg-green-100 text-green-700'
                        }`}>{inc.status}</span>
                      </td>
                      <td className="table-cell hidden lg:table-cell text-gray-400 text-xs">{inc.dateAssigned}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* GIS Navigation Map */}
        <section>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">GIS Navigation Map</h3>
          <div className="card p-0 overflow-hidden">
            <div className="relative bg-gradient-to-br from-blue-50 via-teal-50 to-green-50 min-h-[280px] lg:min-h-[320px] flex items-center justify-center">
              <div className="absolute inset-0 opacity-10">
                <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <pattern id="grid-nav" width="40" height="40" patternUnits="userSpaceOnUse">
                      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#94a3b8" strokeWidth="0.5" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid-nav)" />
                </svg>
              </div>
              <div className="absolute top-[25%] left-[30%] flex flex-col items-center">
                <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-white shadow-md animate-pulse" title="Incident Location" />
                <span className="text-[9px] text-red-700 font-semibold mt-0.5 bg-white/70 px-1 rounded">Incident</span>
              </div>
              <div className="absolute top-[60%] left-[70%] flex flex-col items-center">
                <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-md animate-pulse" title="Current GPS Location" />
                <span className="text-[9px] text-blue-700 font-semibold mt-0.5 bg-white/70 px-1 rounded">You</span>
              </div>
              <div className="absolute top-[35%] left-[50%] flex flex-col items-center">
                <div className="w-4 h-4 rounded-full bg-purple-500 border-2 border-white shadow-md" title="Nearby Evacuation Centers" />
                <span className="text-[9px] text-purple-700 font-semibold mt-0.5 bg-white/70 px-1 rounded">Evac. Center</span>
              </div>
              <div className="text-center relative z-10">
                <Navigation size={36} className="text-teal-400 mx-auto mb-2 opacity-40" />
                <p className="text-xs text-gray-400">Navigation Map</p>
                <button
                  onClick={() => navigate('/map')}
                  className="mt-3 btn-primary text-xs py-1.5 px-4"
                >
                  Open Navigation
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Incident Details + Weather Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Incident Details */}
        <section>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Incident Details</h3>
          <div className="card">
            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Incident Number</p>
              <p className="font-mono text-sm font-bold text-blue-600">{incidentDetails.id}</p>
            </div>
            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Hazard Description</p>
              <p className="text-sm text-gray-800">{incidentDetails.hazardDescription}</p>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Reporter</p>
                <p className="text-sm text-gray-800">{incidentDetails.reporter}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Photos</p>
                <p className="text-sm text-gray-800">{incidentDetails.photos} uploaded</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Date & Time</p>
                <p className="text-sm text-gray-800">{incidentDetails.dateTime}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Affected Area</p>
                <p className="text-sm text-gray-800">{incidentDetails.affectedArea}</p>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Response Status</p>
              <div className="flex flex-wrap gap-2">
                {['Assigned', 'En Route', 'On Scene', 'Responding', 'Resolved'].map((status) => (
                  <span
                    key={status}
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                      incidentDetails.responseStatus === status ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {status}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Weather Information */}
        <section>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Weather Information</h3>
          <div className="card">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Current', value: weatherInfo.current, icon: Thermometer, color: 'text-orange-500', bg: 'bg-orange-50' },
                { label: 'Rainfall', value: weatherInfo.rainfall, icon: Droplets, color: 'text-blue-500', bg: 'bg-blue-50' },
              ].map((w) => (
                <div key={w.label} className={`${w.bg} border border-gray-100 rounded-xl p-3 flex items-center gap-2`}>
                  <w.icon size={16} className={w.color} />
                  <div>
                    <p className={`text-sm font-bold ${w.color} leading-tight`}>{w.value}</p>
                    <p className="text-[10px] text-gray-500 leading-tight">{w.label}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <div>
                  <p className="text-xs font-semibold text-red-700">Flood Warning</p>
                  <p className="text-[10px] text-red-600">{weatherInfo.floodWarning}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <div>
                  <p className="text-xs font-semibold text-amber-700">Landslide Warning</p>
                  <p className="text-[10px] text-amber-600">{weatherInfo.landslideWarning}</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Recent Updates */}
      <section>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Recent Updates</h3>
        <div className="card">
          <div className="divide-y divide-gray-100">
            {recentUpdates.map((u, i) => (
              <div key={i} className="flex items-center justify-between py-3 gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="bg-blue-50 text-blue-700 text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0">{u.type}</span>
                  <span className="text-sm text-gray-700 truncate">{u.title}</span>
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0">{u.time}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Accept Assignment', icon: CheckCircle, color: 'bg-green-600 hover:bg-green-700', path: '/incidents' },
            { label: 'Update Incident Status', icon: RefreshCw, color: 'bg-blue-500 hover:bg-blue-600', path: '/incidents' },
            { label: 'Upload Photos', icon: FileText, color: 'bg-indigo-500 hover:bg-indigo-600', path: '/incidents' },
            { label: 'Upload Videos', icon: FileText, color: 'bg-purple-500 hover:bg-purple-600', path: '/incidents' },
            { label: 'Request Backup', icon: Users, color: 'bg-orange-500 hover:bg-orange-600', path: '/resources' },
            { label: 'Mark Incident as Resolved', icon: CheckCircle, color: 'bg-teal-500 hover:bg-teal-600', path: '/incidents' },
          ].map((action) => (
            <button
              key={action.label}
              onClick={() => navigate(action.path)}
              className={`${action.color} text-white rounded-xl p-4 flex flex-col items-center gap-2 transition-colors shadow-sm`}
            >
              <action.icon size={22} />
              <span className="text-xs font-medium text-center leading-tight">{action.label}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}

// ── Personnel Sub-Components ───────────────────────────────────────────────

function PriorityBadge({ priority }) {
  const map = {
    Critical: 'bg-red-100 text-red-700 border border-red-300',
    High:     'bg-orange-100 text-orange-700 border border-orange-300',
    Medium:   'bg-yellow-100 text-yellow-700 border border-yellow-300',
    Low:      'bg-gray-100 text-gray-600 border border-gray-300',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${map[priority] || map.Low}`}>
      {priority}
    </span>
  )
}

function StatusBadge({ status }) {
  const map = {
    Unverified: 'bg-red-100 text-red-700',
    Verified:   'bg-blue-100 text-blue-700',
    Responding: 'bg-amber-100 text-amber-700',
    Resolved:   'bg-green-100 text-green-700',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${map[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  )
}

function TeamStatusDot({ status }) {
  const map = {
    'En Route': 'bg-amber-400',
    'On Scene': 'bg-green-500 animate-pulse',
    'Standby':  'bg-gray-400',
  }
  return <span className={`w-2 h-2 rounded-full flex-shrink-0 ${map[status] || 'bg-gray-300'}`} />
}

function PersonnelDashboard({ navigate }) {
  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold text-gray-800">CDRRMO Personnel Dashboard</h2>
          <p className="text-sm text-gray-500 mt-0.5">Disaster Response Operations — Real-Time Management</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-green-100 text-green-700 px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Operations Active
          </span>
          <span className="text-xs text-gray-400">Last sync: just now</span>
        </div>
      </div>

      {/* Weather & Disaster Alerts */}
      <section>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Weather & Disaster Alerts</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Current Weather */}
          <div className="card">
            <h4 className="font-semibold text-gray-700 text-sm mb-4">Current Weather</h4>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Temperature', value: '28°C', icon: Thermometer, color: 'text-orange-500', bg: 'bg-orange-50' },
                { label: 'Rainfall', value: '42 mm', icon: Droplets, color: 'text-blue-500', bg: 'bg-blue-50' },
                { label: 'Wind Speed', value: '35 kph', icon: Wind, color: 'text-teal-500', bg: 'bg-teal-50' },
                { label: 'Humidity', value: '88%', icon: Activity, color: 'text-indigo-600', bg: 'bg-indigo-50' },
              ].map((w) => (
                <div key={w.label} className={`${w.bg} border border-gray-100 rounded-xl p-3 flex items-center gap-2`}>
                  <w.icon size={16} className={`${w.color} flex-shrink-0`} />
                  <div>
                    <p className={`text-sm font-bold ${w.color} leading-tight`}>{w.value}</p>
                    <p className="text-[10px] text-gray-500 leading-tight">{w.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Disaster Alerts */}
          <div className="card">
            <h4 className="font-semibold text-gray-700 text-sm mb-4">Disaster Alerts</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-sm font-medium text-red-700">Flood Warning: High</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-sm font-medium text-amber-700">Landslide Warning: Moderate</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="w-2 h-2 rounded-full bg-orange-500" />
                <span className="text-sm font-medium text-orange-700">Typhoon Alert: Active</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Dashboard Cards */}
      <section>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Summary Cards</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {personnelCards.map((c) => <SummaryCard key={c.label} {...c} />)}
        </div>
      </section>

      {/* Live GIS Hazard Map */}
      <section>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Live GIS Hazard Map</h3>
        <div className="card p-0 overflow-hidden">
          <div className="flex flex-col lg:flex-row">
            {/* Map placeholder */}
            <div className="relative flex-1 bg-gradient-to-br from-blue-50 via-teal-50 to-green-50 min-h-[280px] lg:min-h-[320px] flex items-center justify-center">
              {/* Decorative map-like background */}
              <div className="absolute inset-0 opacity-10">
                <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <pattern id="grid-personnel" width="40" height="40" patternUnits="userSpaceOnUse">
                      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#94a3b8" strokeWidth="0.5" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid-personnel)" />
                </svg>
              </div>
              {/* Simulated pins */}
              <div className="absolute top-[20%] left-[25%] flex flex-col items-center">
                <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-md animate-pulse" title="Flood Zone" />
                <span className="text-[9px] text-blue-700 font-semibold mt-0.5 bg-white/70 px-1 rounded">Flood</span>
              </div>
              <div className="absolute top-[40%] left-[45%] flex flex-col items-center">
                <div className="w-4 h-4 rounded-full bg-amber-500 border-2 border-white shadow-md" title="Landslide Zone" />
                <span className="text-[9px] text-amber-700 font-semibold mt-0.5 bg-white/70 px-1 rounded">Landslide</span>
              </div>
              <div className="absolute top-[60%] left-[35%] flex flex-col items-center">
                <div className="w-4 h-4 rounded-full bg-purple-500 border-2 border-white shadow-md" title="Evacuation Center" />
                <span className="text-[9px] text-purple-700 font-semibold mt-0.5 bg-white/70 px-1 rounded">Evac. Center</span>
              </div>
              <div className="absolute top-[30%] left-[55%] flex flex-col items-center">
                <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-white shadow-md animate-pulse" title="Incident Location" />
                <span className="text-[9px] text-red-700 font-semibold mt-0.5 bg-white/70 px-1 rounded">Incident</span>
              </div>
              <div className="absolute top-[50%] left-[65%] flex flex-col items-center">
                <div className="w-4 h-4 rounded-full bg-green-500 border-2 border-white shadow-md" title="Field Responder" />
                <span className="text-[9px] text-green-700 font-semibold mt-0.5 bg-white/70 px-1 rounded">Responder</span>
              </div>
              <div className="text-center relative z-10">
                <Map size={36} className="text-teal-400 mx-auto mb-2 opacity-40" />
                <p className="text-xs text-gray-400">Live GIS Hazard Map</p>
                <button
                  onClick={() => navigate('/map')}
                  className="mt-3 btn-primary text-xs py-1.5 px-4"
                >
                  View Full GIS Map
                </button>
              </div>
            </div>
            {/* Layer legend */}
            <div className="lg:w-52 p-4 border-t lg:border-t-0 lg:border-l border-gray-100">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">Map Layers</p>
              <div className="space-y-2.5">
                {[
                  { label: 'Active Hazard Locations', dot: 'bg-red-500' },
                  { label: 'Flood Zones', dot: 'bg-blue-500' },
                  { label: 'Landslide Zones', dot: 'bg-amber-500' },
                  { label: 'Incident Locations', dot: 'bg-red-600' },
                  { label: 'Field Responders', dot: 'bg-green-500' },
                  { label: 'Evacuation Centers', dot: 'bg-purple-500' },
                ].map((layer) => (
                  <label key={layer.label} className="flex items-center gap-2 cursor-pointer group">
                    <input type="checkbox" defaultChecked className="rounded text-blue-500 w-3.5 h-3.5" />
                    <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${layer.dot}`} />
                    <span className="text-xs text-gray-600 group-hover:text-gray-800">{layer.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Incident Monitoring Table + Response Monitoring */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Incident Monitoring Table — takes 2 columns */}
        <section className="xl:col-span-2">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Incident Monitoring Table</h3>
          <div className="card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="table-head">Inc. No.</th>
                    <th className="table-head">Barangay</th>
                    <th className="table-head hidden md:table-cell">Purok</th>
                    <th className="table-head">Type</th>
                    <th className="table-head">Priority</th>
                    <th className="table-head">Status</th>
                    <th className="table-head hidden lg:table-cell">Assigned Responder</th>
                    <th className="table-head hidden lg:table-cell">Date & Time</th>
                    <th className="table-head" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {incidentQueue.map((inc) => (
                    <tr key={inc.id} className="hover:bg-gray-50 transition-colors">
                      <td className="table-cell font-mono text-xs text-blue-600 font-semibold whitespace-nowrap">{inc.id}</td>
                      <td className="table-cell whitespace-nowrap">{inc.barangay}</td>
                      <td className="table-cell hidden md:table-cell text-gray-500">{inc.purok}</td>
                      <td className="table-cell whitespace-nowrap">
                        <span className="inline-flex items-center gap-1">
                          {inc.type === 'Flood'     && <Waves size={12} className="text-blue-500" />}
                          {inc.type === 'Landslide' && <Mountain size={12} className="text-amber-500" />}
                          {inc.type === 'Fire'      && <Flame size={12} className="text-red-500" />}
                          {inc.type === 'Storm Surge'&& <Wind size={12} className="text-cyan-500" />}
                          {inc.type === 'Road Collapse'&&<Construction size={12} className="text-stone-500" />}
                          {inc.type}
                        </span>
                      </td>
                      <td className="table-cell"><PriorityBadge priority={inc.priority} /></td>
                      <td className="table-cell"><StatusBadge status={inc.status} /></td>
                      <td className="table-cell hidden lg:table-cell text-sm text-gray-700">{inc.assignedResponder}</td>
                      <td className="table-cell hidden lg:table-cell text-gray-400 text-xs">{inc.time}</td>
                      <td className="table-cell">
                        <button
                          onClick={() => navigate('/incidents')}
                          className="p-1 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
                          title="View incident"
                        >
                          <ChevronRight size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-400">{incidentQueue.filter(i => i.status === 'Unverified').length} unverified incidents</span>
              <button onClick={() => navigate('/incidents')} className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                <ClipboardList size={12} /> View all incidents
              </button>
            </div>
          </div>
        </section>

        {/* Response Monitoring — takes 1 column */}
        <section>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Response Monitoring</h3>
          <div className="card p-0 overflow-hidden">
            <div className="divide-y divide-gray-100">
              {responseTeams.map((team) => (
                <div key={team.team} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <TeamStatusDot status={team.status} />
                      <span className="text-sm font-semibold text-gray-800">{team.team}</span>
                    </div>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                      team.status === 'On Scene'  ? 'bg-green-100 text-green-700' :
                      team.status === 'En Route'  ? 'bg-amber-100 text-amber-700' :
                                                    'bg-gray-100 text-gray-500'
                    }`}>{team.status}</span>
                  </div>
                  <div className="space-y-1 text-xs text-gray-500">
                    <div className="flex items-center gap-1.5">
                      <Clock size={11} className="text-gray-400" />
                      <span>ETA: <span className="font-medium text-gray-700">{team.eta}</span></span>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <RefreshCw size={11} className="text-gray-400 mt-0.5 flex-shrink-0" />
                      <span className="leading-tight">{team.update}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* Charts */}
      <section>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Charts</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Incidents by Hazard Type */}
          <div className="card">
            <h4 className="font-semibold text-gray-700 text-sm mb-4">Incidents by Hazard Type</h4>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={personnelChartsData.incidentsByType}
                  cx="50%" cy="50%"
                  outerRadius={75}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {personnelChartsData.incidentsByType.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {/* Monthly Incident Trend */}
          <div className="card">
            <h4 className="font-semibold text-gray-700 text-sm mb-4">Monthly Incident Trend</h4>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={personnelChartsData.monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="incidents" stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          {/* Most Affected Barangays */}
          <div className="card">
            <h4 className="font-semibold text-gray-700 text-sm mb-4">Most Affected Barangays</h4>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={personnelChartsData.mostAffectedBarangays} layout="vertical" barSize={14}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="barangay" type="category" tick={{ fontSize: 11 }} width={80} />
                <Tooltip />
                <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Response Status Overview */}
          <div className="card">
            <h4 className="font-semibold text-gray-700 text-sm mb-4">Response Status Overview</h4>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={personnelChartsData.responseStatus}
                  cx="50%" cy="50%"
                  outerRadius={75}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {personnelChartsData.responseStatus.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Recent Activities */}
      <section>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Recent Activities</h3>
        <div className="card">
          <div className="divide-y divide-gray-100">
            {personnelRecentActivities.map((a, i) => (
              <div key={i} className="flex items-center justify-between py-3 gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="bg-blue-50 text-blue-700 text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0">{a.type}</span>
                  <span className="text-sm text-gray-700 truncate">{a.text}</span>
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0">{a.time}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {[
            { label: 'Verify Hazard Report', icon: CheckCircle, color: 'bg-green-600 hover:bg-green-700', path: '/incidents' },
            { label: 'Assign Field Responder', icon: UserPlus, color: 'bg-blue-500 hover:bg-blue-600', path: '/resources' },
            { label: 'Send Emergency Alert', icon: Send, color: 'bg-red-500 hover:bg-red-600', path: '/alerts' },
            { label: 'View Full GIS Map', icon: Map, color: 'bg-teal-500 hover:bg-teal-600', path: '/map' },
          ].map((action) => (
            <button
              key={action.label}
              onClick={() => navigate(action.path)}
              className={`${action.color} text-white rounded-xl p-4 flex flex-col items-center gap-2 transition-colors shadow-sm`}
            >
              <action.icon size={22} />
              <span className="text-xs font-medium text-center leading-tight">{action.label}</span>
            </button>
          ))}
        </div>
      </section>

    </div>
  )
}

// ── Main Dashboard ─────────────────────────────────────────────────────────

export default function Dashboard({ currentUser }) {
  const navigate = useNavigate()
  const role = currentUser?.role || ''

  // Route to the correct role dashboard
  if (role === 'CDRRMO Personnel') {
    return <PersonnelDashboard navigate={navigate} />
  }
  if (role === 'Barangay Admin') {
    return <BarangayDashboard navigate={navigate} />
  }
  if (role === 'Field Responder') {
    return <FieldResponderDashboard navigate={navigate} />
  }

  // Default: Super Administrator
  return (
    <div className="space-y-6">

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold text-gray-800">System Admin Dashboard</h2>
          <p className="text-sm text-gray-500 mt-0.5">Gingoog City Hazard Tracking System — Full Management Access</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-green-100 text-green-700 px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            System Online
          </span>
          <span className="text-xs text-gray-400">Last updated: just now</span>
        </div>
      </div>

      {/* ── System Notifications ── */}
      <section>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">System Notifications</h3>
        <div className="space-y-2">
          {systemNotifications.map((n, i) => (
            <div
              key={i}
              className={`card flex items-center justify-between border-l-4 ${
                n.priority === 'critical' ? 'border-l-red-500' :
                n.priority === 'warning' ? 'border-l-amber-500' :
                'border-l-blue-500'
              }`}
            >
              <div className="flex items-center gap-3">
                <Bell
                  size={18}
                  className={
                    n.priority === 'critical' ? 'text-red-500' :
                    n.priority === 'warning' ? 'text-amber-500' :
                    'text-blue-500'
                  }
                />
                <div>
                  <p className="text-sm font-semibold text-gray-800">{n.type}</p>
                  <p className="text-xs text-gray-600">{n.text}</p>
                </div>
              </div>
              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                n.priority === 'critical' ? 'bg-red-100 text-red-700' :
                n.priority === 'warning' ? 'bg-amber-100 text-amber-700' :
                'bg-blue-100 text-blue-700'
              }`}>
                {n.priority.toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Summary Cards ── */}
      <section>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Dashboard Summary</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
          {summaryCards.map((c) => <SummaryCard key={c.label} {...c} />)}
        </div>
      </section>

      {/* ── Interactive GIS Map ── */}
      <section>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Interactive GIS Map</h3>
        <div className="card p-0 overflow-hidden">
          <div className="flex flex-col lg:flex-row">
            {/* Map placeholder */}
            <div className="relative flex-1 bg-gradient-to-br from-blue-50 via-teal-50 to-green-50 min-h-[280px] lg:min-h-[320px] flex items-center justify-center">
              {/* Decorative map-like background */}
              <div className="absolute inset-0 opacity-10">
                <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#94a3b8" strokeWidth="0.5" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" />
                </svg>
              </div>
              {/* Simulated pins */}
              <div className="absolute top-[25%] left-[30%] flex flex-col items-center">
                <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-md animate-pulse" title="Flood-Prone Area" />
                <span className="text-[9px] text-blue-700 font-semibold mt-0.5 bg-white/70 px-1 rounded">Flood</span>
              </div>
              <div className="absolute top-[45%] left-[50%] flex flex-col items-center">
                <div className="w-4 h-4 rounded-full bg-amber-500 border-2 border-white shadow-md" title="Landslide-Prone Area" />
                <span className="text-[9px] text-amber-700 font-semibold mt-0.5 bg-white/70 px-1 rounded">Landslide</span>
              </div>
              <div className="absolute top-[60%] left-[40%] flex flex-col items-center">
                <div className="w-4 h-4 rounded-full bg-purple-500 border-2 border-white shadow-md" title="Evacuation Center" />
                <span className="text-[9px] text-purple-700 font-semibold mt-0.5 bg-white/70 px-1 rounded">Evac. Center</span>
              </div>
              <div className="absolute top-[30%] left-[60%] flex flex-col items-center">
                <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-white shadow-md animate-pulse" title="Active Incident" />
                <span className="text-[9px] text-red-700 font-semibold mt-0.5 bg-white/70 px-1 rounded">Incident</span>
              </div>
              <div className="text-center relative z-10">
                <Map size={36} className="text-teal-400 mx-auto mb-2 opacity-40" />
                <p className="text-xs text-gray-400">Gingoog City — Interactive GIS Map</p>
                <button
                  onClick={() => navigate('/map')}
                  className="mt-3 btn-primary text-xs py-1.5 px-4"
                >
                  Open Full GIS Map
                </button>
              </div>
            </div>
            {/* Layer legend */}
            <div className="lg:w-52 p-4 border-t lg:border-t-0 lg:border-l border-gray-100">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">Map Layers</p>
              <div className="space-y-2.5">
                {[
                  { label: 'Barangay Boundaries', dot: 'bg-gray-400' },
                  { label: 'Active Hazard Locations', dot: 'bg-red-500' },
                  { label: 'Flood-Prone Areas', dot: 'bg-blue-500' },
                  { label: 'Landslide-Prone Areas', dot: 'bg-amber-500' },
                  { label: 'Evacuation Centers', dot: 'bg-purple-500' },
                  { label: 'Active Incidents', dot: 'bg-red-600' },
                ].map((layer) => (
                  <label key={layer.label} className="flex items-center gap-2 cursor-pointer group">
                    <input type="checkbox" defaultChecked className="rounded text-blue-500 w-3.5 h-3.5" />
                    <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${layer.dot}`} />
                    <span className="text-xs text-gray-600 group-hover:text-gray-800">{layer.label}</span>
                  </label>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-[10px] text-gray-400">28 barangays monitored</p>
                <p className="text-[10px] text-gray-400 mt-0.5">Data refreshed every 5 min</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Charts ── */}
      <section>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Charts</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Monthly Hazard Reports */}
          <div className="card">
            <h4 className="font-semibold text-gray-700 text-sm mb-4">Monthly Hazard Reports</h4>
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={monthlyHazardReports} barSize={10}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Flood" fill="#3b82f6" radius={[3,3,0,0]} />
                <Bar dataKey="Landslide" fill="#f59e0b" radius={[3,3,0,0]} />
                <Bar dataKey="Fire" fill="#ef4444" radius={[3,3,0,0]} />
                <Bar dataKey="RoadDamage" fill="#78716c" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Incident Status */}
          <div className="card">
            <h4 className="font-semibold text-gray-700 text-sm mb-4">Incident Status</h4>
            <ResponsiveContainer width="100%" height={230}>
              <PieChart>
                <Pie
                  data={incidentStatusData}
                  cx="50%" cy="50%"
                  outerRadius={85}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {incidentStatusData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">

          {/* Hazard Type Distribution */}
          <div className="card">
            <h4 className="font-semibold text-gray-700 text-sm mb-4">Hazard Type Distribution</h4>
            <ResponsiveContainer width="100%" height={230}>
              <PieChart>
                <Pie
                  data={hazardTypeDistribution}
                  cx="50%" cy="50%"
                  outerRadius={85}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {hazardTypeDistribution.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Population by Barangay */}
          <div className="card">
            <h4 className="font-semibold text-gray-700 text-sm mb-4">Population by Barangay</h4>
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={populationByBarangay} layout="vertical" barSize={14}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="barangay" type="category" tick={{ fontSize: 11 }} width={90} />
                <Tooltip />
                <Bar dataKey="population" fill="#6366f1" radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* ── Recent Activities ── */}
      <section>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Recent Activities</h3>
        <div className="card">
          <div className="divide-y divide-gray-100">
            {recentAdminActivities.map((a, i) => (
              <div key={i} className="flex items-center justify-between py-3 gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="bg-gray-100 text-gray-700 text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0">{a.type}</span>
                  <span className="text-sm text-gray-700 truncate">{a.text}</span>
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0">{a.time}</span>
              </div>
            ))}
          </div>
          <div className="pt-3 border-t border-gray-100 mt-1">
            <button
              onClick={() => navigate('/audit-logs')}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              <FileText size={12} />
              View full audit log
            </button>
          </div>
        </div>
      </section>

      {/* ── Quick Actions ── */}
      <section>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Add User',       icon: UserPlus,     color: 'bg-blue-500    hover:bg-blue-600', path: '/users' },
            { label: 'Add Barangay',   icon: Building2,    color: 'bg-violet-500  hover:bg-violet-600', path: '/barangays' },
            { label: 'Manage GIS Boundaries', icon: Map,    color: 'bg-teal-500    hover:bg-teal-600', path: '/map' },
            { label: 'Generate Reports', icon: FileText,    color: 'bg-green-600   hover:bg-green-700', path: '/reports' },
            { label: 'View Audit Logs', icon: Activity,    color: 'bg-indigo-500  hover:bg-indigo-600', path: '/audit-logs' },
            { label: 'System Settings', icon: Settings,    color: 'bg-gray-600    hover:bg-gray-700', path: '/settings' },
          ].map((action) => (
            <button
              key={action.label}
              onClick={() => navigate(action.path)}
              className={`${action.color} text-white rounded-xl p-4 flex flex-col items-center gap-2 transition-colors shadow-sm`}
            >
              <action.icon size={22} />
              <span className="text-xs font-medium text-center leading-tight">{action.label}</span>
            </button>
          ))}
        </div>
      </section>

    </div>
  )
}
