// Demo user accounts — frontend-only (no backend)
// In production these would come from the database via API.
// PDRA (Pre-Disaster Risk Assessment) — restricted to two user roles
// per Section 1.5 (Scope): CDRRMO Personnel and Barangay Officials.

export const DEMO_USERS = [
  {
    id: 1,
    name: 'Carlos Mendoza',
    username: 'cdrrmo01',
    password: 'Cdrrmo@1234',
    role: 'CDRRMO Personnel',
    barangay: 'All',
    email: 'carlos@cdrrmo.gov.ph',
    avatar: 'CM',
  },
  {
    id: 2,
    name: 'Ana Villanueva',
    username: 'brgy.sanjuan',
    password: 'Brgy@1234',
    role: 'Barangay Official',
    barangay: 'San Juan',
    email: 'ana@sanjuan.gov.ph',
    avatar: 'AV',
  },
]

// ─── Role-based page access ───────────────────────────────────────────────────
// Matches exactly the 5 modules in Section 1.5 (Scope): Household and
// Population Management, Web-Based Hazard Mapping, Geofencing,
// Risk Assessment Dashboard, and User Management (CDRRMO only).

export const ROLE_ACCESS = {
  /**
   * CDRRMO Personnel
   * Full access to all 5 PDRA modules — views risk assessment data,
   * hazard maps, household records (read/verify), and manages user accounts.
   */
  'CDRRMO Personnel': [
    '/',                // Risk Assessment Dashboard Module (landing page)
    '/map',             // Web-Based Hazard Mapping Module (+ Geofencing overlay)
    '/barangays',       // Barangay reference data
    '/households',      // Household and Population Management (view/verify)
    '/residents',        // Household members
    '/puroks',          // Purok-level organization
    '/users',           // User Management — CDRRMO Personnel & Barangay Officials
    '/settings',        // Profile/Settings
  ],

  /**
   * Barangay Official
   * Maintains household-level records for their own barangay — this is
   * their core function per Section 1.1 and 1.4 (Significance).
   */
  'Barangay Official': [
    '/',             // Risk Assessment Dashboard (landing page, own barangay view)
    '/barangays',    // Barangay reference data (own barangay)
    '/households',   // Household and Population Management — their core task
    '/residents',    // Household members (birthdates for age-bracket tracking)
    '/puroks',       // Purok-level organization within their barangay
    '/settings',     // Profile/Settings
  ],
}

// ─── Per-role action permissions (used inside pages) ─────────────────────────
export const ROLE_PERMISSIONS = {
  'CDRRMO Personnel': {
    canCreate: false, canEdit: false, canDelete: false,
    canApprove: true, canExport: true, canManageUsers: true, canConfigSystem: false,
  },
  'Barangay Official': {
    canCreate: true, canEdit: true, canDelete: false,
    canApprove: false, canExport: false, canManageUsers: false, canConfigSystem: false,
  },
}

export const ROLE_COLORS = {
  'CDRRMO Personnel': { bg: 'bg-blue-500',  badge: 'bg-blue-100 text-blue-700 border-blue-200' },
  'Barangay Official': { bg: 'bg-green-500', badge: 'bg-green-100 text-green-700 border-green-200' },
}