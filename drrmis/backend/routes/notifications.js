// /api/notifications — the signed-in user's OWN notifications only.
const router = require('express').Router()
const { all, get, run } = require('../db/database')
const { authenticate } = require('../middleware/auth')

router.use(authenticate)

// Notifications older than 30 days are cleaned up so the table never grows
// without limit — at most once an hour, not on every 30-second poll.
let lastCleanup = 0
function cleanupOldNotifications() {
  if (Date.now() - lastCleanup < 60 * 60 * 1000) return
  lastCleanup = Date.now()
  run("DELETE FROM notifications WHERE created_at < datetime('now', '+8 hours', '-30 days')").catch(() => {})
}

// GET /api/notifications — newest 50.
router.get('/', async (req, res) => {
  try {
    cleanupOldNotifications()
    const rows = await all(
      'SELECT id, type, title, body, link, is_read, created_at FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 50',
      [req.user.id]
    )
    res.json(rows.map(r => ({ ...r, read: !!r.is_read })))
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// PUT /api/notifications/read-all
router.put('/read-all', async (req, res) => {
  try {
    await run('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [req.user.id])
    res.json({ ok: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// PUT /api/notifications/:id/read
router.put('/:id/read', async (req, res) => {
  try {
    await run('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [req.params.id, req.user.id])
    res.json({ ok: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// DELETE /api/notifications — clear all of mine
router.delete('/', async (req, res) => {
  try {
    await run('DELETE FROM notifications WHERE user_id = ?', [req.user.id])
    res.json({ ok: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// DELETE /api/notifications/:id — dismiss one of mine
router.delete('/:id', async (req, res) => {
  try {
    const n = await get('SELECT id FROM notifications WHERE id = ? AND user_id = ?', [req.params.id, req.user.id])
    if (!n) return res.status(404).json({ error: 'Not found' })
    await run('DELETE FROM notifications WHERE id = ?', [req.params.id])
    res.json({ ok: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router