const router = require('express').Router()
const { all, get, run } = require('../db/database')
const { authenticate } = require('../middleware/auth')

router.use(authenticate)

router.get('/', async (req, res) => {
  try {
    const { status, priority, barangay_id, search } = req.query
    let sql = `SELECT i.*, b.name as barangay_name, ht.name as hazard_type
               FROM incidents i
               LEFT JOIN barangays b ON i.barangay_id = b.id
               LEFT JOIN hazards h ON i.hazard_id = h.id
               LEFT JOIN hazard_types ht ON h.type_id = ht.id
               WHERE 1=1`
    const params = []
    if (status && status !== 'All') { sql += ' AND i.status = ?'; params.push(status) }
    if (priority) { sql += ' AND i.priority = ?'; params.push(priority) }
    if (barangay_id) { sql += ' AND i.barangay_id = ?'; params.push(barangay_id) }
    if (search) { sql += ' AND (i.incident_no LIKE ? OR b.name LIKE ?)'; params.push(`%${search}%`, `%${search}%`) }
    sql += ' ORDER BY i.created_at DESC'
    res.json(await all(sql, params))
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.get('/stats', async (req, res) => {
  try {
    const total    = await get('SELECT COUNT(*) as c FROM incidents')
    const open     = await get("SELECT COUNT(*) as c FROM incidents WHERE status NOT IN ('Resolved','Closed')")
    const resolved = await get("SELECT COUNT(*) as c FROM incidents WHERE status = 'Resolved'")
    const critical = await get("SELECT COUNT(*) as c FROM incidents WHERE priority = 'Critical'")
    res.json({ total: total.c, open: open.c, resolved: resolved.c, critical: critical.c })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.get('/:id', async (req, res) => {
  try {
    const row = await get('SELECT * FROM incidents WHERE id = ?', [req.params.id])
    if (!row) return res.status(404).json({ error: 'Not found' })
    const updates = await all('SELECT * FROM incident_updates WHERE incident_id = ? ORDER BY created_at', [req.params.id])
    res.json({ ...row, updates })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.post('/', async (req, res) => {
  try {
    const count = await get('SELECT COUNT(*) as c FROM incidents')
    const incNo = `INC-${String((count.c || 0) + 1).padStart(3, '0')}`
    const { hazard_id, barangay_id, purok_id, incident_date, incident_time, reporter, assigned_team, priority, status, remarks } = req.body
    const r = await run(
      `INSERT INTO incidents (incident_no, hazard_id, barangay_id, purok_id, incident_date, incident_time, reporter, assigned_team, priority, status, remarks)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [incNo, hazard_id, barangay_id, purok_id, incident_date, incident_time, reporter, assigned_team, priority || 'Medium', status || 'Reported', remarks]
    )
    res.status(201).json(await get('SELECT * FROM incidents WHERE id = ?', [r.lastID]))
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.put('/:id', async (req, res) => {
  try {
    const { assigned_team, priority, status, remarks } = req.body
    const resolved_at = status === 'Resolved' ? "datetime('now')" : 'NULL'
    await run(
      `UPDATE incidents SET assigned_team=?, priority=?, status=?, remarks=?, updated_at=datetime('now') WHERE id=?`,
      [assigned_team, priority, status, remarks, req.params.id]
    )
    // Log update
    await run(
      'INSERT INTO incident_updates (incident_id, updated_by, status, notes) VALUES (?, ?, ?, ?)',
      [req.params.id, req.user?.username || 'system', status, remarks]
    )
    res.json(await get('SELECT * FROM incidents WHERE id = ?', [req.params.id]))
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
