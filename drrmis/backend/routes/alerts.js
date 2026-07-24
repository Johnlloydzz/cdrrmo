const router = require('express').Router()
const { all, run, get } = require('../db/database')
const { authenticate } = require('../middleware/auth')

router.use(authenticate)

router.get('/', async (req, res) => {
  try { res.json(await all('SELECT * FROM alerts ORDER BY sent_at DESC LIMIT 50')) }
  catch (err) { res.status(500).json({ error: err.message }) }
})

router.post('/', async (req, res) => {
  try {
    const { level, type, message, recipients } = req.body
    if (!level || !type || !message) return res.status(400).json({ error: 'level, type, and message are required' })
    const r = await run(
      'INSERT INTO alerts (level, type, message, recipients, sent_by) VALUES (?, ?, ?, ?, ?)',
      [level, type, message, recipients, req.user?.username || 'system']
    )
    res.status(201).json(await get('SELECT * FROM alerts WHERE id = ?', [r.lastID]))
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
