const router = require('express').Router()
const { all, get, run } = require('../db/database')
const { authenticate, authorize } = require('../middleware/auth')

// GET /api/account-requests/barangays — public, no auth. Only what the
// Request Account form needs (id + name) so a Barangay Official without a
// login yet can still pick their barangay.
router.get('/barangays', async (req, res) => {
  try {
    const rows = await all('SELECT id, name FROM barangays ORDER BY name')
    res.json(rows)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// POST /api/account-requests — public, no auth. A Barangay Official with no
// account submits this; it shows up for CDRRMO Personnel to review.
router.post('/', async (req, res) => {
  try {
    const { name, email, contact, barangay_id, position, message } = req.body
    if (!name || !email || !barangay_id) {
      return res.status(400).json({ error: 'Name, email, and barangay are required.' })
    }
    const barangay = await get('SELECT id FROM barangays WHERE id = ?', [barangay_id])
    if (!barangay) return res.status(400).json({ error: 'Selected barangay was not found.' })

    const r = await run(
      'INSERT INTO account_requests (name, email, contact, barangay_id, position, message) VALUES (?, ?, ?, ?, ?, ?)',
      [name, email, contact || null, barangay_id, position || null, message || null]
    )
    const created = await get('SELECT * FROM account_requests WHERE id = ?', [r.lastID])
    res.status(201).json(created)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// Everything below is for CDRRMO Personnel reviewing requests.
router.use(authenticate)

// GET /api/account-requests — list, newest first, optional ?status= filter
router.get('/', authorize('CDRRMO Personnel'), async (req, res) => {
  try {
    const { status } = req.query
    let sql = `SELECT ar.*, b.name as barangay_name FROM account_requests ar
               JOIN barangays b ON ar.barangay_id = b.id WHERE 1=1`
    const params = []
    if (status && status !== 'All') { sql += ' AND ar.status = ?'; params.push(status) }
    sql += ' ORDER BY ar.created_at DESC'
    res.json(await all(sql, params))
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// PUT /api/account-requests/:id/approve — marks it approved; CDRRMO still
// creates the actual account by hand in User Management (Add User), using
// this request's name/email/barangay as reference.
router.put('/:id/approve', authorize('CDRRMO Personnel'), async (req, res) => {
  try {
    const existing = await get('SELECT * FROM account_requests WHERE id = ?', [req.params.id])
    if (!existing) return res.status(404).json({ error: 'Request not found' })
    await run(
      `UPDATE account_requests SET status='Approved', reviewed_by=?, updated_at=datetime('now', '+8 hours') WHERE id=?`,
      [req.user.id, req.params.id]
    )
    res.json(await get('SELECT * FROM account_requests WHERE id = ?', [req.params.id]))
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// PUT /api/account-requests/:id/reject
router.put('/:id/reject', authorize('CDRRMO Personnel'), async (req, res) => {
  try {
    const existing = await get('SELECT * FROM account_requests WHERE id = ?', [req.params.id])
    if (!existing) return res.status(404).json({ error: 'Request not found' })
    await run(
      `UPDATE account_requests SET status='Rejected', reviewed_by=?, updated_at=datetime('now', '+8 hours') WHERE id=?`,
      [req.user.id, req.params.id]
    )
    res.json(await get('SELECT * FROM account_requests WHERE id = ?', [req.params.id]))
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// DELETE /api/account-requests/:id — clear a reviewed request off the list
router.delete('/:id', authorize('CDRRMO Personnel'), async (req, res) => {
  try {
    await run('DELETE FROM account_requests WHERE id = ?', [req.params.id])
    res.json({ message: 'Deleted' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router