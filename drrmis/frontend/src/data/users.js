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
   * Super Administrator (System Administrator)
   * Restricted to the paper's defined Scope: the five core modules plus
   * user management and audit logging, matching the panel-facing navigation.
   */
  'Super Administrator': [
    '/',           // Real-Time Dashboard Module
    '/hazards',    // Hazard Reporting Module
    '/incidents',  // Incident Monitoring Module
    '/map',        // GIS-Based Mapping Module
    '/reports',    // Report Generation Module
    '/users',      // User Management
    '/audit-logs', // Activity Log
    '/settings',   // Profile Settings
  ],

  /**
   * CDRRMO Personnel
   * Restricted to the five core modules defined in the capstone's Scope
   * (1.5): Real-Time Dashboard, Hazard Reporting, Incident Monitoring,
   * GIS-Based Mapping, and Report Generation.
   */
  'CDRRMO Personnel': [
    '/',          // Real-Time Dashboard Module
    '/alerts',    // real-time alerts (supports the Dashboard module)
    '/hazards',   // Hazard Reporting Module
    '/incidents', // Incident Monitoring Module
    '/map',       // GIS-Based Mapping Module
    '/reports',   // Report Generation Module
    '/settings',  // Profile/Settings — account settings, password, logout
  ],

  /**
   * Barangay Administrator
   * Own barangay only: manage puroks, register households/residents,
   * submit hazard reports, update evacuation, view reports
   */
  'Barangay Admin': [
    '/hazards',    // Submit Hazard Report — Hazard Reporting Module
    '/incidents',  // My Reports — status of their submitted reports (pending/verified/resolved)
    '/settings',   // Profile/Settings — account info, logout
  ],

  /**
   * Field Responder
   * Receive incidents, update status, GPS check-in, mark completed
   */
  'Field Responder': [
    '/',          // Real-Time Dashboard Module — quick overview of active incidents
    '/map',       // GIS-Based Mapping Module — hazard locations for response
    '/incidents', // Incident Monitoring Module — status of relevant incidents
    '/settings',  // Profile/Settings — account info, logout
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