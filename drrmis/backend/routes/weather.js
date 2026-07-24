const router = require('express').Router()
const { all, run, get } = require('../db/database')
const { authenticate } = require('../middleware/auth')

router.use(authenticate)

router.get('/current', async (req, res) => {
  try {
    const row = await get('SELECT * FROM weather_logs ORDER BY logged_at DESC LIMIT 1')
    res.json(row || {
      temperature: 28, humidity: 88, rainfall: 42,
      wind_speed: 25, wind_dir: 'NE', pressure: 1008,
      condition: 'Heavy Rain', logged_at: new Date().toISOString()
    })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.get('/history', async (req, res) => {
  try {
    const rows = await all('SELECT * FROM weather_logs ORDER BY logged_at DESC LIMIT 48')
    res.json(rows)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.post('/log', async (req, res) => {
  try {
    const { temperature, humidity, rainfall, wind_speed, wind_dir, pressure, condition } = req.body
    const r = await run(
      'INSERT INTO weather_logs (temperature, humidity, rainfall, wind_speed, wind_dir, pressure, condition) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [temperature, humidity, rainfall, wind_speed, wind_dir, pressure, condition]
    )
    res.status(201).json(await get('SELECT * FROM weather_logs WHERE id = ?', [r.lastID]))
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
