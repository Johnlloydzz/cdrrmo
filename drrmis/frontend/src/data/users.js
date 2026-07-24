// Demo user accounts — frontend-only (no backend)
// In production these would come from the database via API.

export const DEMO_USERS = [
  {
    id: 1,
    name: 'System Administrator',
    username: 'sysadmin',
    password: 'Admin@1234',
    role: 'Super Administrator',
    barangay: 'All',
    email: 'admin@gingoog.gov.ph',
    avatar: 'SA',
  },
  {
    id: 2,
    name: 'Carlos Mendoza',
    username: 'cdrrmo01',
    password: 'Cdrrmo@1234',
    role: 'CDRRMO Personnel',
    barangay: 'All',
    email: 'carlos@cdrrmo.gov.ph',
    avatar: 'CM',
  },
  {
    id: 3,
    name: 'Ana Villanueva',
    username: 'brgy.kioskos',
    password: 'Brgy@1234',
    role: 'Barangay Admin',
    barangay: 'Kioskos',
    email: 'ana@kioskos.gov.ph',
    avatar: 'AV',
  },
  {
    id: 4,
    name: 'Mark Responder',
    username: 'responder01',
    password: 'Resp@1234',
    role: 'Field Responder',
    barangay: 'All',
    email: 'mark@cdrrmo.gov.ph',
    avatar: 'MR',
  },
]

// ─── Role-based page access ───────────────────────────────────────────────────
// Matches exactly the capabilities listed in the system document.

export const ROLE_ACCESS = {
  /**
   * Super Administrator — full system access
   * Manage all barangays, users, hazards, GIS, reports, dashboard, generate reports, configure system
   */
  'Super Administrator': '*',

  /**
   * CDRRMO Personnel
   * Verify reports, monitor hazards, assign responders,
   * manage evacuation, manage relief, view analytics
   */
  'CDRRMO Personnel': [
    '/',                   // dashboard — monitor
    '/alerts',             // real-time alerts
    '/weather',            // weather monitoring
    '/map',                // GIS (view only)
    '/barangays',          // needed to verify / assign by barangay
    '/hazards',            // monitor hazards
    '/incidents',          // verify reports, assign responders
    '/evacuation-centers', // manage evacuation
    '/evacuation',         // manage evacuation
    '/relief',             // manage relief
    '/resources',          // assign responders / vehicles
    '/analytics',          // view analytics
    '/reports',            // view reports
  ],

  /**
   * Barangay Administrator
   * Own barangay only: manage puroks, register households/residents,
   * submit hazard reports, update evacuation, view reports
   */
  'Barangay Admin': [
    '/',            // dashboard
    '/alerts',      // receive alerts
    '/weather',     // weather
    '/puroks',      // manage puroks
    '/households',  // register households
    '/residents',   // register residents
    '/hazards',     // submit hazard reports
    '/incidents',   // view own barangay incidents
    '/evacuation',  // update evacuation
    '/reports',     // view reports
  ],

  /**
   * Field Responder
   * Receive incidents, update status, GPS check-in, mark completed
   */
  'Field Responder': [
    '/',          // dashboard
    '/alerts',    // receive emergency alerts
    '/map',       // GPS / map for navigation
    '/incidents', // receive + update incident status
  ],
}

// ─── Per-role action permissions (used inside pages) ─────────────────────────
export const ROLE_PERMISSIONS = {
  'Super Administrator': {
    canCreate: true, canEdit: true, canDelete: true,
    canApprove: true, canExport: true, canManageUsers: true, canConfigSystem: true,
  },
  'CDRRMO Personnel': {
    canCreate: true, canEdit: true, canDelete: false,
    canApprove: true, canExport: true, canManageUsers: false, canConfigSystem: false,
  },
  'Barangay Admin': {
    canCreate: true, canEdit: true, canDelete: false,
    canApprove: false, canExport: false, canManageUsers: false, canConfigSystem: false,
  },
  'Field Responder': {
    canCreate: false, canEdit: true, canDelete: false,
    canApprove: false, canExport: false, canManageUsers: false, canConfigSystem: false,
  },
}

export const ROLE_COLORS = {
  'Super Administrator': { bg: 'bg-red-500',    badge: 'bg-red-100 text-red-700 border-red-200' },
  'CDRRMO Personnel':   { bg: 'bg-blue-500',   badge: 'bg-blue-100 text-blue-700 border-blue-200' },
  'Barangay Admin':     { bg: 'bg-green-500',  badge: 'bg-green-100 text-green-700 border-green-200' },
  'Field Responder':    { bg: 'bg-orange-500', badge: 'bg-orange-100 text-orange-700 border-orange-200' },
}
