require('dotenv').config()
const express = require('express')
const cors = require('cors')
const morgan = require('morgan')

const authRoutes           = require('./routes/auth')
const barangayRoutes       = require('./routes/barangays')
const purokRoutes          = require('./routes/puroks')
const householdRoutes      = require('./routes/households')
const residentRoutes       = require('./routes/residents')
const userRoutes           = require('./routes/users')
const riskAssessmentRoutes = require('./routes/riskAssessment')

const { initDb } = require('./db/database')

const app = express()
const PORT = process.env.PORT || 5000

// ── Middleware ──────────────────────────────────────────────────────────────
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      'https://cdrrmo-aa070.web.app',
      'https://cdrrmo-aa070.firebaseapp.com',
      'https://cdrrmo-gingoog.web.app',
      'https://cdrrmo-gingoog.firebaseapp.com',
    ]
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error(`Origin not allowed by CORS: ${origin}`))
    }
  },
  credentials: true,
}

app.use(cors(corsOptions))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'))

// ── API Routes ──────────────────────────────────────────────────────────────
// Matches the 5 PDRA modules (Chapter 1, Section 1.5):
// Household & Population Management, Web-Based Hazard Mapping (barangays/puroks
// carry the geofencing-relevant boundary/threshold data), Risk Assessment
// Dashboard, and User Management.
app.use('/api/auth',            authRoutes)
app.use('/api/barangays',       barangayRoutes)
app.use('/api/puroks',          purokRoutes)
app.use('/api/households',      householdRoutes)
app.use('/api/residents',       residentRoutes)
app.use('/api/users',           userRoutes)
app.use('/api/risk-assessment', riskAssessmentRoutes)

// ── Health check ────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }))

// ── 404 handler ─────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Route not found' }))

// ── Error handler ───────────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err.stack)
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' })
})

// ── Start ────────────────────────────────────────────────────────────────────
initDb().then(() => {
  app.listen(PORT, () => console.log(`PDRA API running on http://localhost:${PORT}`))
}).catch(err => {
  console.error('Failed to initialize database:', err)
  process.exit(1)
})

module.exports = app