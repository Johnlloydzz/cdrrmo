const router = require('express').Router()
const { all, get, run } = require('../db/database')
const { authenticate } = require('../middleware/auth')

router.use(authenticate)

router.get('/', async (req, res) => {
  try {
    const { barangay_id, purok_id, search, at_risk } = req.query
    let sql = `SELECT h.*, b.name as barangay_name, p.name as purok_name, p.flood_risk as purok_flood_risk
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
    // Geofencing: flag households in high flood-risk puroks (based on CDRA-aligned purok classification)
    const withRisk = rows.map(h => ({ ...h, in_flood_risk_zone: h.purok_flood_risk === 'High' }))
    res.json(withRisk)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.get('/:id', async (req, res) => {
  try {
    const row = await get('SELECT * FROM households WHERE id = ?', [req.params.id])
    if (!row) return res.status(404).json({ error: 'Not found' })
    res.json(row)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.post('/', async (req, res) => {
  try {
    const { barangay_id, purok_id, house_number, head_family, latitude, longitude, contact, house_type, roof_type, wall_type, electricity, water_source, internet, risk_level, remarks } = req.body
    const count = await get('SELECT COUNT(*) as c FROM households')
    const hhId = `HH-${String((count.c || 0) + 1).padStart(4, '0')}`
    const r = await run(
      `INSERT INTO households (household_id, barangay_id, purok_id, house_number, head_family, latitude, longitude, contact, house_type, roof_type, wall_type, electricity, water_source, internet, risk_level, remarks)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [hhId, barangay_id, purok_id, house_number, head_family, latitude, longitude, contact, house_type, roof_type, wall_type, electricity ? 1 : 0, water_source, internet ? 1 : 0, risk_level || 'Low', remarks]
    )
    res.status(201).json(await get('SELECT * FROM households WHERE id = ?', [r.lastID]))
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.put('/:id', async (req, res) => {
  try {
    const { head_family, contact, house_type, roof_type, wall_type, electricity, water_source, internet, risk_level, remarks } = req.body
    await run(
      `UPDATE households SET head_family=?, contact=?, house_type=?, roof_type=?, wall_type=?, electricity=?, water_source=?, internet=?, risk_level=?, remarks=?, updated_at=datetime('now') WHERE id=?`,
      [head_family, contact, house_type, roof_type, wall_type, electricity ? 1 : 0, water_source, internet ? 1 : 0, risk_level, remarks, req.params.id]
    )
    res.json(await get('SELECT * FROM households WHERE id = ?', [req.params.id]))
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.delete('/:id', async (req, res) => {
  try {
    await run('DELETE FROM households WHERE id = ?', [req.params.id])
    res.json({ message: 'Deleted' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router