// PDRA (Pre-Disaster Risk Assessment) — Database Schema
// Gingoog City CDRRMO
// 5 tables only, matching Chapter 1 Section 1.5 (Scope):
// Household and Population Management, Web-Based Hazard Mapping,
// Geofencing, Risk Assessment Dashboard, User Management

const tables = [
  // ── Users (2 roles: CDRRMO Personnel, Barangay Official) ──────────────────
  `CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT    NOT NULL,
    username      TEXT    NOT NULL UNIQUE,
    email         TEXT    NOT NULL UNIQUE,
    password_hash TEXT    NOT NULL,
    role          TEXT    NOT NULL DEFAULT 'Barangay Official',
    barangay_id   INTEGER REFERENCES barangays(id),
    status        TEXT    NOT NULL DEFAULT 'Active',
    last_login    TEXT,
    created_at    TEXT    DEFAULT (datetime('now', '+8 hours')),
    updated_at    TEXT    DEFAULT (datetime('now', '+8 hours'))
  )`,

  // ── Barangays ─────────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS barangays (
    id                     INTEGER PRIMARY KEY AUTOINCREMENT,
    name                   TEXT    NOT NULL UNIQUE,
    risk_level             TEXT    DEFAULT 'Low',
    flood_susceptibility     TEXT  DEFAULT 'Low',    -- High / Low  (CDRA)
    landslide_susceptibility TEXT  DEFAULT 'Low',    -- High / Moderate / Low  (CDRA)
    population             INTEGER DEFAULT 0,
    boundary_geojson       TEXT,
    created_at             TEXT    DEFAULT (datetime('now', '+8 hours')),
    updated_at             TEXT    DEFAULT (datetime('now', '+8 hours'))
  )`,

  // ── Puroks (Geofencing: flood_risk + flood_threshold_m from CDRA data) ────
  `CREATE TABLE IF NOT EXISTS puroks (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    barangay_id       INTEGER NOT NULL REFERENCES barangays(id) ON DELETE CASCADE,
    name              TEXT    NOT NULL,
    flood_risk        TEXT    DEFAULT 'Low',
    flood_threshold_m REAL    DEFAULT 1.0,
    landslide_risk    TEXT    DEFAULT 'Low',
    created_at        TEXT    DEFAULT (datetime('now', '+8 hours'))
  )`,

  // ── Households (Household and Population Management Module) ──────────────
  `CREATE TABLE IF NOT EXISTS households (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    household_id  TEXT    NOT NULL UNIQUE,
    barangay_id   INTEGER NOT NULL REFERENCES barangays(id),
    purok_id      INTEGER NOT NULL REFERENCES puroks(id),
    head_family   TEXT    NOT NULL,
    latitude      REAL,
    longitude     REAL,
    contact       TEXT,
    created_at    TEXT    DEFAULT (datetime('now', '+8 hours')),
    updated_at    TEXT    DEFAULT (datetime('now', '+8 hours'))
  )`,

  // ── Residents (household members, with birthdate for age-bracket tracking) ─
  `CREATE TABLE IF NOT EXISTS residents (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    resident_id       TEXT    NOT NULL UNIQUE,
    household_id      INTEGER NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    name              TEXT    NOT NULL,
    birthdate         TEXT    NOT NULL,
    age_bracket       TEXT,
    relation_to_head  TEXT,
    created_at        TEXT    DEFAULT (datetime('now', '+8 hours'))
  )`,

  // ── System Settings (key-value store) — currently used for the manually
  // reported flood water level that drives the real-time geofencing
  // simulation on the Risk Assessment Dashboard ──────────────────────────────
  `CREATE TABLE IF NOT EXISTS system_settings (
    key        TEXT PRIMARY KEY,
    value      TEXT,
    updated_at TEXT DEFAULT (datetime('now', '+8 hours'))
  )`,

  // ── Password Resets (one-time codes emailed for Forgot Password) ──────────
  `CREATE TABLE IF NOT EXISTS password_resets (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    otp        TEXT    NOT NULL,
    expires_at TEXT    NOT NULL,
    used       INTEGER DEFAULT 0,
    created_at TEXT    DEFAULT (datetime('now', '+8 hours'))
  )`,

  // ── Account Requests (User Management Module) — a Barangay Official with
  // no account yet submits this from the public "Request Account" page.
  // CDRRMO Personnel review it in User Management and, on approval, manually
  // create the actual account (username/password) using this info as
  // reference — this table never stores login credentials itself.
  `CREATE TABLE IF NOT EXISTS account_requests (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    email       TEXT    NOT NULL,
    contact     TEXT,
    barangay_id INTEGER NOT NULL REFERENCES barangays(id),
    position    TEXT,
    message     TEXT,
    status      TEXT    NOT NULL DEFAULT 'Pending',   -- Pending / Approved / Rejected
    reviewed_by INTEGER REFERENCES users(id),
    created_at  TEXT    DEFAULT (datetime('now', '+8 hours')),
    updated_at  TEXT    DEFAULT (datetime('now', '+8 hours'))
  )`,
]

module.exports = tables