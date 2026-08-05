const router = require('express').Router()
const { all, get, run } = require('../db/database')
const { authenticate } = require('../middleware/auth')

router.use(authenticate)

router.get('/', async (req, res) => {
  try {
    const { household_id, search } = req.query
    let sql = `SELECT r.*, h.household_id as hh_code, b.name as barangay_name
               FROM residents r
               LEFT JOIN households h ON r.household_id = h.id
               LEFT JOIN barangays b ON h.barangay_id = b.id
               WHERE 1=1`
    const params = []
    if (household_id) { sql += ' AND r.household_id = ?'; params.push(household_id) }
    if (search) { sql += ' AND r.name LIKE ?'; params.push(`%${search}%`) }
    res.json(await all(sql, params))
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.get('/analytics', async (req, res) => {
  try {
    const total     = await get('SELECT COUNT(*) as c FROM residents')
    const male      = await get("SELECT COUNT(*) as c FROM residents WHERE gender = 'Male'")
    const female    = await get("SELECT COUNT(*) as c FROM residents WHERE gender = 'Female'")
    const senior    = await get('SELECT COUNT(*) as c FROM residents WHERE is_senior = 1')
    const pwd       = await get('SELECT COUNT(*) as c FROM residents WHERE is_pwd = 1')
    const pregnant  = await get('SELECT COUNT(*) as c FROM residents WHERE is_pregnant = 1')
    const children  = await get('SELECT COUNT(*) as c FROM residents WHERE age < 18')
    res.json({ total: total.c, male: male.c, female: female.c, senior: senior.c, pwd: pwd.c, pregnant: pregnant.c, children: children.c })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.get('/:id', async (req, res) => {
  try {
    const row = await get('SELECT * FROM residents WHERE id = ?', [req.params.id])
    if (!row) return res.status(404).json({ error: 'Not found' })
    res.json(row)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.post('/', async (req, res) => {
  try {
    const count = await get('SELECT COUNT(*) as c FROM residents')
    const rid = `RES-${String((count.c || 0) + 1).padStart(4, '0')}`
    const { household_id, name, birthdate, age, gender, civil_status, occupation, education, religion, contact, blood_type, medical_condition, is_pwd, is_senior, is_pregnant, is_solo_parent, is_vaccinated, emergency_contact, ec_relationship } = req.body
    const r = await run(
      `INSERT INTO residents (resident_id, household_id, name, birthdate, age, gender, civil_status, occupation, education, religion, contact, blood_type, medical_condition, is_pwd, is_senior, is_pregnant, is_solo_parent, is_vaccinated, emergency_contact, ec_relationship)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [rid, household_id, name, birthdate, age, gender, civil_status, occupation, education, religion, contact, blood_type, medical_condition, is_pwd ? 1 : 0, is_senior ? 1 : 0, is_pregnant ? 1 : 0, is_solo_parent ? 1 : 0, is_vaccinated ? 1 : 0, emergency_contact, ec_relationship]
    )
    res.status(201).json(await get('SELECT * FROM residents WHERE id = ?', [r.lastID]))
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.put('/:id', async (req, res) => {
  try {
    const { name, age, gender, civil_status, occupation, contact, blood_type, medical_condition, is_pwd, is_senior, is_pregnant } = req.body
    await run(
      'UPDATE residents SET name=?, age=?, gender=?, civil_status=?, occupation=?, contact=?, blood_type=?, medical_condition=?, is_pwd=?, is_senior=?, is_pregnant=? WHERE id=?',
      [name, age, gender, civil_status, occupation, contact, blood_type, medical_condition, is_pwd ? 1 : 0, is_senior ? 1 : 0, is_pregnant ? 1 : 0, req.params.id]
    )
    res.json(await get('SELECT * FROM residents WHERE id = ?', [req.params.id]))
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.delete('/:id', async (req, res) => {
  try {
    await run('DELETE FROM residents WHERE id = ?', [req.params.id])
    res.json({ message: 'Deleted' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router