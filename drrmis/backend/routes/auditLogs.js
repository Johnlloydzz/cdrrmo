const router = require('express').Router()
const { all, run } = require('../db/database')
const { authenticate, authorize } = require('../middleware/auth')

router.use(authenticate)

router.get('/', async (req, res) => {
  try {
    const { search, action } = req.query
    let sql = 'SELECT * FROM audit_logs WHERE 1=1'
    const params = []
    if (search) { sql += ' AND (username LIKE ? OR detail LIKE ?)'; params.push(`%${search}%`, `%${search}%`) }
    if (action && action !== 'All') { sql += ' AND action = ?'; params.push(action) }
    sql += ' ORDER BY created_at DESC LIMIT 200'
    res.json(await all(sql, params))
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.post('/', async (req, res) => {
  try {
    const { action, module, detail } = req.body
    await run(
      'INSERT INTO audit_logs (user_id, username, action, module, detail) VALUES (?, ?, ?, ?, ?)',
      [req.user?.id, req.user?.username, action, module, detail]
    )
    res.status(201).json({ message: 'Logged' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
