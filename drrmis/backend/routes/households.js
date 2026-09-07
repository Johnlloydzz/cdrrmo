const router = require('express').Router()
const { all, get, run } = require('../db/database')
const { authenticate } = require('../middleware/auth')

router.use(authenticate)

// GET /api/households — includes geofencing flag (in_flood_risk_zone)
router.get('/', async (req, res) => {
  try {
    const { purok_id, search, at_risk } = req.query
    // Barangay Officials only ever see their own barangay's households —
    // enforced server-side, not just hidden in the UI.
    const barangay_id = req.user.role === 'Barangay Official' ? req.user.barangay_id : req.query.barangay_id
    let sql = `SELECT h.*, b.name as barangay_name, p.name as purok_name, p.flood_risk as purok_flood_risk, p.flood_threshold_m
               FROM households h
               LEFT JOIN barangays b ON h.barangay_id = b.id
               LEFT JOIN puroks p ON h.purok_id = p.id
               WHERE 1=1`
    const params = []
    if (barangay_id) { sql += ' AND h.barangay_id = ?'; params.push(barangay_id) }
    if (purok_id)    { sql += ' AND h.purok_id = ?'; params.push(purok_id) }
    if (search)      { sql += ' AND (h.head_family LIKE ? OR h.household_id LIKE ?)'; params.push(`%${search}%`, `%${search}%`) }
    if (at_risk === '1') { sql += " AND p.flood_risk = 'High'" }
    const rows = await all(sql, params)
    // Geofencing: household is "at risk" if its purok is classified High flood-risk
    const withRisk = rows.map(h => ({ ...h, in_flood_risk_zone: h.purok_flood_risk === 'High' }))
    res.json(withRisk)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// POST /api/households
router.post('/', async (req, res) => {
  try {
    const { purok_id, head_family, latitude, longitude, contact } = req.body
    // Barangay Officials can only register households under their own barangay,
    // regardless of what barangay_id is sent in the request body.
    const barangay_id = req.user.role === 'Barangay Official' ? req.user.barangay_id : req.body.barangay_id
    if (!barangay_id || !purok_id || !head_family) {
      return res.status(400).json({ error: 'barangay_id, purok_id, and head_family are required' })
    }
    const count = await get('SELECT COUNT(*) as c FROM households')
    const household_id = `HH-${String((count?.c || 0) + 1).padStart(5, '0')}`
    const result = await run(
      `INSERT INTO households (household_id, barangay_id, purok_id, head_family, latitude, longitude, contact) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [household_id, barangay_id, purok_id, head_family, latitude || null, longitude || null, contact || null]
    )
    const newRow = await get('SELECT * FROM households WHERE id = ?', [result.lastID])
    res.status(201).json(newRow)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// PUT /api/households/:id
router.put('/:id', async (req, res) => {
  try {
    if (req.user.role === 'Barangay Official') {
      const existing = await get('SELECT barangay_id FROM households WHERE id = ?', [req.params.id])
      if (!existing || existing.barangay_id !== req.user.barangay_id) {
        return res.status(403).json({ error: 'You can only edit households in your own barangay.' })
      }
    }
    const { head_family, latitude, longitude, contact, purok_id } = req.body
    await run(
      `UPDATE households SET head_family=?, latitude=?, longitude=?, contact=?, purok_id=?, updated_at=datetime('now', '+8 hours') WHERE id=?`,
      [head_family, latitude, longitude, contact, purok_id, req.params.id]
    )
    const updated = await get('SELECT * FROM households WHERE id = ?', [req.params.id])
    res.json(updated)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// DELETE /api/households/:id
router.delete('/:id', async (req, res) => {
  try {
    if (req.user.role === 'Barangay Official') {
      const existing = await get('SELECT barangay_id FROM households WHERE id = ?', [req.params.id])
      if (!existing || existing.barangay_id !== req.user.barangay_id) {
        return res.status(403).json({ error: 'You can only delete households in your own barangay.' })
      }
    }
    const result = await run('DELETE FROM households WHERE id = ?', [req.params.id])
    if (result.changes === 0) return res.status(404).json({ error: 'Not found' })
    res.json({ message: 'Deleted' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router