module.exports = [
  // ── Users & Roles ──────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT    NOT NULL,
    username      TEXT    NOT NULL UNIQUE,
    email         TEXT    NOT NULL UNIQUE,
    password_hash TEXT    NOT NULL,
    role          TEXT    NOT NULL DEFAULT 'Viewer',
    barangay      TEXT    DEFAULT 'All',
    status        TEXT    NOT NULL DEFAULT 'Active',
    last_login    TEXT,
    created_at    TEXT    DEFAULT (datetime('now')),
    updated_at    TEXT    DEFAULT (datetime('now'))
  )`,

  // ── Barangays ─────────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS barangays (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL UNIQUE,
    captain     TEXT,
    secretary   TEXT,
    population  INTEGER DEFAULT 0,
    families    INTEGER DEFAULT 0,
    houses      INTEGER DEFAULT 0,
    risk_level  TEXT    DEFAULT 'Low',
    status      TEXT    DEFAULT 'Active',
    logo_url    TEXT,
    created_at  TEXT    DEFAULT (datetime('now')),
    updated_at  TEXT    DEFAULT (datetime('now'))
  )`,

  // ── Puroks ────────────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS puroks (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    barangay_id    INTEGER NOT NULL REFERENCES barangays(id) ON DELETE CASCADE,
    name           TEXT    NOT NULL,
    population     INTEGER DEFAULT 0,
    families       INTEGER DEFAULT 0,
    houses         INTEGER DEFAULT 0,
    flood_risk     TEXT    DEFAULT 'Low',
    landslide_risk TEXT    DEFAULT 'Low',
    area           TEXT,
    latitude       REAL,
    longitude      REAL,
    status         TEXT    DEFAULT 'Active',
    created_at     TEXT    DEFAULT (datetime('now'))
  )`,

  // ── Households ────────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS households (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    household_id TEXT    NOT NULL UNIQUE,
    barangay_id  INTEGER REFERENCES barangays(id),
    purok_id     INTEGER REFERENCES puroks(id),
    house_number TEXT,
    head_family  TEXT    NOT NULL,
    latitude     REAL,
    longitude    REAL,
    contact      TEXT,
    house_type   TEXT,
    roof_type    TEXT,
    wall_type    TEXT,
    electricity  INTEGER DEFAULT 0,
    water_source TEXT,
    internet     INTEGER DEFAULT 0,
    risk_level   TEXT    DEFAULT 'Low',
    remarks      TEXT,
    created_at   TEXT    DEFAULT (datetime('now')),
    updated_at   TEXT    DEFAULT (datetime('now'))
  )`,

  // ── Residents ─────────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS residents (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    resident_id      TEXT    NOT NULL UNIQUE,
    household_id     INTEGER REFERENCES households(id),
    name             TEXT    NOT NULL,
    birthdate        TEXT,
    age              INTEGER,
    gender           TEXT,
    civil_status     TEXT,
    occupation       TEXT,
    education        TEXT,
    religion         TEXT,
    contact          TEXT,
    blood_type       TEXT,
    medical_condition TEXT,
    is_pwd           INTEGER DEFAULT 0,
    is_senior        INTEGER DEFAULT 0,
    is_pregnant      INTEGER DEFAULT 0,
    is_solo_parent   INTEGER DEFAULT 0,
    is_vaccinated    INTEGER DEFAULT 0,
    emergency_contact TEXT,
    ec_relationship  TEXT,
    created_at       TEXT    DEFAULT (datetime('now'))
  )`,

  // ── Hazard Types ──────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS hazard_types (
    id   INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  )`,

  // ── Hazards ───────────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS hazards (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    hazard_code     TEXT    NOT NULL UNIQUE,
    type_id         INTEGER REFERENCES hazard_types(id),
    severity        TEXT    DEFAULT 'Moderate',
    barangay_id     INTEGER REFERENCES barangays(id),
    purok_id        INTEGER REFERENCES puroks(id),
    latitude        REAL,
    longitude       REAL,
    description     TEXT,
    reporter        TEXT,
    reported_date   TEXT,
    status          TEXT    DEFAULT 'Active',
    created_at      TEXT    DEFAULT (datetime('now')),
    updated_at      TEXT    DEFAULT (datetime('now'))
  )`,

  // ── Incidents ─────────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS incidents (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    incident_no    TEXT    NOT NULL UNIQUE,
    hazard_id      INTEGER REFERENCES hazards(id),
    barangay_id    INTEGER REFERENCES barangays(id),
    purok_id       INTEGER REFERENCES puroks(id),
    incident_date  TEXT,
    incident_time  TEXT,
    reporter       TEXT,
    assigned_team  TEXT,
    priority       TEXT    DEFAULT 'Medium',
    status         TEXT    DEFAULT 'Reported',
    remarks        TEXT,
    resolved_at    TEXT,
    created_at     TEXT    DEFAULT (datetime('now')),
    updated_at     TEXT    DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS incident_updates (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    incident_id INTEGER NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    updated_by  TEXT,
    status      TEXT,
    notes       TEXT,
    created_at  TEXT DEFAULT (datetime('now'))
  )`,

  // ── Evacuation Centers ────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS evacuation_centers (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    name         TEXT    NOT NULL,
    barangay_id  INTEGER REFERENCES barangays(id),
    capacity     INTEGER DEFAULT 0,
    occupants    INTEGER DEFAULT 0,
    contact      TEXT,
    has_medical  INTEGER DEFAULT 0,
    has_generator INTEGER DEFAULT 0,
    has_kitchen  INTEGER DEFAULT 0,
    has_water    INTEGER DEFAULT 0,
    has_electricity INTEGER DEFAULT 0,
    status       TEXT    DEFAULT 'Standby',
    created_at   TEXT    DEFAULT (datetime('now')),
    updated_at   TEXT    DEFAULT (datetime('now'))
  )`,

  // ── Evacuation Records ────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS evacuation_records (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    evac_code    TEXT    NOT NULL UNIQUE,
    household_id INTEGER REFERENCES households(id),
    center_id    INTEGER REFERENCES evacuation_centers(id),
    barangay_id  INTEGER REFERENCES barangays(id),
    members      INTEGER DEFAULT 1,
    reason       TEXT,
    check_in     TEXT,
    check_out    TEXT,
    status       TEXT    DEFAULT 'Ongoing',
    medical_notes TEXT,
    created_at   TEXT    DEFAULT (datetime('now')),
    updated_at   TEXT    DEFAULT (datetime('now'))
  )`,

  // ── Relief Inventory ──────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS relief_inventory (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    item_name    TEXT    NOT NULL,
    category     TEXT    DEFAULT 'Food',
    quantity     INTEGER DEFAULT 0,
    unit         TEXT,
    threshold    INTEGER DEFAULT 0,
    updated_at   TEXT    DEFAULT (datetime('now'))
  )`,

  // ── Relief Distributions ──────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS relief_distributions (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    household_id INTEGER REFERENCES households(id),
    center_id    INTEGER REFERENCES evacuation_centers(id),
    barangay_id  INTEGER REFERENCES barangays(id),
    items        TEXT,
    quantity     TEXT,
    dist_date    TEXT,
    receiver     TEXT,
    status       TEXT    DEFAULT 'Pending',
    created_at   TEXT    DEFAULT (datetime('now'))
  )`,

  // ── Resources ─────────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS resources (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    type        TEXT,
    category    TEXT DEFAULT 'Vehicle',
    identifier  TEXT,
    quantity    INTEGER DEFAULT 1,
    available   INTEGER DEFAULT 1,
    condition   TEXT    DEFAULT 'Good',
    location    TEXT,
    status      TEXT    DEFAULT 'Available',
    created_at  TEXT    DEFAULT (datetime('now')),
    updated_at  TEXT    DEFAULT (datetime('now'))
  )`,

  // ── Personnel ─────────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS personnel (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    role        TEXT,
    skills      TEXT,
    contact     TEXT,
    available   INTEGER DEFAULT 1,
    created_at  TEXT    DEFAULT (datetime('now'))
  )`,

  // ── Alerts ────────────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS alerts (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    level       TEXT NOT NULL,
    type        TEXT NOT NULL,
    message     TEXT NOT NULL,
    recipients  TEXT,
    sent_by     TEXT,
    sent_at     TEXT DEFAULT (datetime('now'))
  )`,

  // ── Weather Logs ──────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS weather_logs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    temperature REAL,
    humidity    REAL,
    rainfall    REAL,
    wind_speed  REAL,
    wind_dir    TEXT,
    pressure    REAL,
    condition   TEXT,
    logged_at   TEXT DEFAULT (datetime('now'))
  )`,

  // ── Audit Logs ────────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS audit_logs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER REFERENCES users(id),
    username    TEXT,
    action      TEXT NOT NULL,
    module      TEXT,
    detail      TEXT,
    ip_address  TEXT,
    created_at  TEXT DEFAULT (datetime('now'))
  )`,

  // ── System Settings ───────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS system_settings (
    key         TEXT PRIMARY KEY,
    value       TEXT,
    updated_at  TEXT DEFAULT (datetime('now'))
  )`,

  // ── Seed hazard types ─────────────────────────────────────────────────────
  `INSERT OR IGNORE INTO hazard_types (name) VALUES
    ('Flood'),('Landslide'),('Earthquake'),('Fire'),('Storm Surge'),
    ('Typhoon'),('Road Collapse'),('Bridge Collapse'),('Flash Flood'),
    ('Tornado'),('Others')`,

  // ── Seed default settings ─────────────────────────────────────────────────
  `INSERT OR IGNORE INTO system_settings (key, value) VALUES
    ('system_name', 'DRRMIS - Gingoog City CDRRMO'),
    ('address', 'Gingoog City, Misamis Oriental'),
    ('default_lat', '8.8231'),
    ('default_lng', '125.1109'),
    ('default_zoom', '13')`,
]
