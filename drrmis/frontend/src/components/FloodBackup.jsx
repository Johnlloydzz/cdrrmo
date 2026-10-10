// Rain auto-detect BACKUP — runs silently in the browser of a signed-in
// CDRRMO Personnel (e.g. the CDRRMO office computer).
//
// The server normally checks the rain every 5 minutes by itself. But
// Open-Meteo's free daily limit is counted per IP address, and a free Render
// server shares its IP with other apps, so the server can get blocked
// ("Daily API request limit exceeded"). When the server reports that, this
// component fetches the same rain data from THIS computer's own internet
// connection and sends it to the server, which applies exactly the same
// rules. When the server works, this does nothing (one tiny request every
// 5 minutes to ask).

import { useEffect } from 'react'
import { apiGet, apiPost } from '../utils/api'

const CENTER = [8.8231, 125.1109] // Gingoog City — same point the server uses for the river
const EVERY_MS = 5 * 60 * 1000

// Same as the server's sumLastHours(): total of the last `hours` hourly
// readings up to and including the current hour.
function sumLastHours(times, values, currentTime, hours) {
  if (!Array.isArray(times) || !Array.isArray(values)) return 0
  let idx = -1
  for (let i = times.length - 1; i >= 0; i--) { if (times[i] <= currentTime) { idx = i; break } }
  if (idx < 0) return 0
  let total = 0
  for (let i = Math.max(0, idx - hours + 1); i <= idx; i++) total += values[i] ?? 0
  return total
}

// River discharge is daily data — fetched at most once an hour.
let dischargeCache = { at: 0, ratio: null }
async function getDischargeRatio() {
  if (Date.now() - dischargeCache.at < 60 * 60 * 1000) return dischargeCache.ratio
  const r = await fetch(`https://flood-api.open-meteo.com/v1/flood?latitude=${CENTER[0]}&longitude=${CENTER[1]}&daily=river_discharge&forecast_days=3&past_days=30`).then(x => x.json())
  if (r?.error) throw new Error(r.reason || 'flood API error')
  const daily = r?.daily?.river_discharge
  let ratio = null
  if (daily && daily.length >= 4) {
    const past = daily.slice(0, daily.length - 3)
    const baseline = past.reduce((s, v) => s + (v ?? 0), 0) / past.length
    const today = daily[past.length]
    if (baseline && today != null) ratio = today / baseline
  }
  dischargeCache = { at: Date.now(), ratio }
  return ratio
}

async function runBackupOnce() {
  const plan = await apiGet('/settings/flood-check-plan')
  if (!plan?.need_browser || !plan.points?.length) return
  const lats = plan.points.map(p => p.lat).join(',')
  const lngs = plan.points.map(p => p.lng).join(',')
  const [ratio, resp] = await Promise.all([
    getDischargeRatio().catch(() => null),
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lngs}&current=precipitation&hourly=precipitation&past_days=7&forecast_days=1&timezone=Asia%2FManila`).then(x => x.json()),
  ])
  if (resp?.error) return // this computer is limited too — try again next round
  const results = Array.isArray(resp) ? resp : [resp]
  const points = {}
  plan.points.forEach((p, i) => {
    const r = results[i]
    if (!r) return
    const now = r.current?.time || ''
    const times = r.hourly?.time, values = r.hourly?.precipitation
    points[p.key] = {
      currentRain: r.current?.precipitation ?? null,
      sum24: sumLastHours(times, values, now, 24),
      sum72: sumLastHours(times, values, now, 72),
      sum168: sumLastHours(times, values, now, 168),
    }
  })
  if (Object.keys(points).length) await apiPost('/settings/flood-check-browser', { points, discharge_ratio: ratio })
}

export default function FloodBackup({ currentUser }) {
  const active = currentUser?.role === 'CDRRMO Personnel'
  useEffect(() => {
    if (!active) return
    let running = false
    const tick = () => {
      if (running) return
      running = true
      runBackupOnce().catch(() => {}).finally(() => { running = false })
    }
    const first = setTimeout(tick, 15000) // after the page has loaded
    const interval = setInterval(tick, EVERY_MS)
    return () => { clearTimeout(first); clearInterval(interval) }
  }, [active])
  return null
}