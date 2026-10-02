// Role-based in-app notifications. Each notification is stored once PER
// RECIPIENT (its own read / dismissed state), so CDRRMO Personnel and each
// barangay's officials only ever see the notifications meant for them.
//
// notify() never throws: a failed notification must not break the action
// that triggered it (saving a purok, submitting a request, ...).

const { all, get, run } = require('../db/database')

const CDRRMO = 'CDRRMO Personnel'
const OFFICIAL = 'Barangay Official'

// notify({ role, barangay_ids?, exclude_user_id?, type, title, body, link })
//  - role: who receives it (CDRRMO Personnel / Barangay Official)
//  - barangay_ids: Barangay Officials of these barangays only (omit = all)
//  - type: alert | incident | evacuation | relief | system (icon/color)
async function notify({ role, barangay_ids, exclude_user_id, type = 'system', title, body = null, link = null }) {
  try {
    let sql = "SELECT id FROM users WHERE status = 'Active' AND role = ?"
    const params = [role]
    if (Array.isArray(barangay_ids)) {
      if (barangay_ids.length === 0) return
      sql += ` AND barangay_id IN (${barangay_ids.map(() => '?').join(',')})`
      params.push(...barangay_ids)
    }
    if (exclude_user_id) { sql += ' AND id != ?'; params.push(exclude_user_id) }
    const users = await all(sql, params)
    for (const u of users) {
      await run(
        'INSERT INTO notifications (user_id, type, title, body, link) VALUES (?, ?, ?, ?, ?)',
        [u.id, type, title, body, link]
      )
    }
  } catch (err) {
    console.error('notify failed:', err.message)
  }
}

// Auto-detect flagged barangays: notify only the NEWLY flagged ones, and at
// most once every AUTO_FLOOD_RENOTIFY_HOURS (default 6h) per barangay — the
// list is rebuilt every few minutes and can blink off/on (e.g. after the
// free-tier server wakes up), which would otherwise spam everyone.
async function notifyAutoFlood(prevIds, newIds, reasons = {}) {
  try {
    const prev = new Set((prevIds || []).map(Number))
    const fresh = (newIds || []).map(Number).filter(id => !prev.has(id))
    if (fresh.length === 0) return

    const hours = parseFloat(process.env.AUTO_FLOOD_RENOTIFY_HOURS) || 6
    const row = await get("SELECT value FROM system_settings WHERE key = 'auto_flood_notified'")
    let notified = {}
    try { notified = row ? JSON.parse(row.value) : {} } catch { notified = {} }
    const now = Date.now()
    const due = fresh.filter(id => !notified[id] || now - notified[id] >= hours * 3600 * 1000)
    if (due.length === 0) return

    const brgys = await all(
      `SELECT id, name FROM barangays WHERE id IN (${due.map(() => '?').join(',')})`, due
    )
    const names = brgys.map(b => b.name)
    await notify({
      role: CDRRMO, type: 'alert',
      title: `Possible flooding: ${names.length} barangay${names.length > 1 ? 's' : ''}`,
      body: brgys.map(b => reasons[b.id] ? `${b.name} — ${reasons[b.id]}` : b.name).join('; '),
      link: '/flood-control',
    })
    for (const b of brgys) {
      await notify({
        role: OFFICIAL, barangay_ids: [b.id], type: 'alert',
        title: 'Flood risk alert in your barangay',
        body: `Heavy rainfall was detected in Brgy. ${b.name}${reasons[b.id] ? ` (${reasons[b.id]})` : ''}. Check your households in flood-prone puroks.`,
        link: '/households',
      })
    }

    for (const id of due) notified[id] = now
    await run(
      `INSERT INTO system_settings (key, value, updated_at) VALUES ('auto_flood_notified', ?, datetime('now', '+8 hours'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      [JSON.stringify(notified)]
    )
  } catch (err) {
    console.error('notifyAutoFlood failed:', err.message)
  }
}

module.exports = { notify, notifyAutoFlood, CDRRMO, OFFICIAL }