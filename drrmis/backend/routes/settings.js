const router = require('express').Router()
const { all, run } = require('../db/database')
const { authenticate, authorize } = require('../middleware/auth')

router.use(authenticate)

router.get('/', async (req, res) => {
  try {
    const rows = await all('SELECT * FROM system_settings')
    const settings = {}
    rows.forEach(r => { settings[r.key] = r.value })
    res.json(settings)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.put('/', authorize('Super Administrator'), async (req, res) => {
  try {
    const entries = Object.entries(req.body)
    for (const [key, value] of entries) {
      await run(
        `INSERT INTO system_settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
         ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at`,
        [key, value]
      )
    }
    res.json({ message: 'Settings updated' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
