const router = require('express').Router()
const { all, get, run } = require('../db/database')
const { authenticate } = require('../middleware/auth')

router.use(authenticate)

// GET /api/puroks
router.get('/', async (req, res) => {
  try {
    // Barangay Officials only ever see their own barangay's puroks —
    // enforced server-side, not just hidden in the UI.
    const barangay_id = req.user.role === 'Barangay Official' ? req.user.barangay_id : req.query.barangay_id
    let sql = `SELECT p.*, b.name as barangay_name FROM puroks p LEFT JOIN barangays b ON p.barangay_id = b.id WHERE 1=1`
    const params = []
    if (barangay_id) { sql += ' AND p.barangay_id = ?'; params.push(barangay_id) }
    sql += ' ORDER BY b.name, p.name'
    res.json(await all(sql, params))
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// POST /api/puroks
router.post('/', async (req, res) => {
  try {
    // CDRRMO Personnel can add a purok for any barangay (they select which
    // one in the form). A Barangay Official can only add puroks for their
    // own barangay — enforced here regardless of what's sent in the body.
    let barangay_id
    if (req.user.role === 'CDRRMO Personnel') {
      barangay_id = req.body.barangay_id
    } else if (req.user.role === 'Barangay Official') {
      barangay_id = req.user.barangay_id
    } else {
      return res.status(403).json({ error: 'You do not have permission to add puroks.' })
    }
    const { name, flood_risk, flood_threshold_m, landslide_risk } = req.body
    if (!barangay_id || !name) return res.status(400).json({ error: 'barangay_id and name are required' })
    const result = await run(
      `INSERT INTO puroks (barangay_id, name, flood_risk, flood_threshold_m, landslide_risk) VALUES (?, ?, ?, ?, ?)`,
      [barangay_id, name, flood_risk || 'Low', flood_threshold_m || 1.0, landslide_risk || 'Low']
    )
    const newRow = await get('SELECT * FROM puroks WHERE id = ?', [result.lastID])
    res.status(201).json(newRow)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// PUT /api/puroks/:id
router.put('/:id', async (req, res) => {
  try {
    const existing = await get('SELECT barangay_id FROM puroks WHERE id = ?', [req.params.id])
    if (!existing) return res.status(404).json({ error: 'Not found' })
    if (req.user.role === 'Barangay Official' && existing.barangay_id !== req.user.barangay_id) {
      return res.status(403).json({ error: 'You can only edit puroks in your own barangay.' })
    }
    if (req.user.role !== 'CDRRMO Personnel' && req.user.role !== 'Barangay Official') {
      return res.status(403).json({ error: 'You do not have permission to edit puroks.' })
    }
    const { name, flood_risk, flood_threshold_m, landslide_risk } = req.body
    await run(
      `UPDATE puroks SET name=?, flood_risk=?, flood_threshold_m=?, landslide_risk=? WHERE id=?`,
      [name, flood_risk, flood_threshold_m, landslide_risk, req.params.id]
    )
    const updated = await get('SELECT * FROM puroks WHERE id = ?', [req.params.id])
    res.json(updated)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// DELETE /api/puroks/:id
router.delete('/:id', async (req, res) => {
  try {
    const existing = await get('SELECT barangay_id FROM puroks WHERE id = ?', [req.params.id])
    if (!existing) return res.status(404).json({ error: 'Not found' })
    if (req.user.role === 'Barangay Official' && existing.barangay_id !== req.user.barangay_id) {
      return res.status(403).json({ error: 'You can only delete puroks in your own barangay.' })
    }
    if (req.user.role !== 'CDRRMO Personnel' && req.user.role !== 'Barangay Official') {
      return res.status(403).json({ error: 'You do not have permission to delete puroks.' })
    }
    const result = await run('DELETE FROM puroks WHERE id = ?', [req.params.id])
    if (result.changes === 0) return res.status(404).json({ error: 'Not found' })
    res.json({ message: 'Deleted' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router