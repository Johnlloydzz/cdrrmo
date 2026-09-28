import { useMemo, useState, useEffect, useRef } from 'react'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function daysInMonth(month, year) {
  if (!month) return 31
  return new Date(year || 2000, month, 0).getDate()
}

function parse(value) {
  const [y, m, d] = (value || '').split('-').map(v => parseInt(v) || '')
  return { y: y || '', m: m || '', d: d || '' }
}

// A custom Month / Day / Year birthdate picker. Value/onChange work in plain
// YYYY-MM-DD strings. Partial picks (e.g. Month only) are kept in local state,
// so each dropdown keeps its selection until all three are chosen; the parent
// only receives a full date (or '' while incomplete).
export default function BirthdateInput({ value, onChange }) {
  const [parts, setParts] = useState(() => parse(value))
  const lastEmitted = useRef(value || '')

  // Sync from the parent only when the value changed from the outside
  // (opening Edit, or the form being reset), not from our own emit.
  useEffect(() => {
    if ((value || '') !== lastEmitted.current) {
      lastEmitted.current = value || ''
      setParts(parse(value))
    }
  }, [value])

  const { y, m, d } = parts

  const currentYear = new Date().getFullYear()
  const years = useMemo(() => {
    const arr = []
    for (let yr = currentYear; yr >= currentYear - 120; yr--) arr.push(yr)
    return arr
  }, [currentYear])

  const days = useMemo(() => {
    const count = daysInMonth(m, y)
    return Array.from({ length: count }, (_, i) => i + 1)
  }, [m, y])

  const update = (newY, newM, newD) => {
    // Clamp the day if the month/year change makes it invalid (e.g. Feb 30).
    const safeD = newD && newM ? Math.min(newD, daysInMonth(newM, newY)) : newD
    setParts({ y: newY, m: newM, d: safeD })

    const out = newY && newM && safeD
      ? `${newY}-${String(newM).padStart(2, '0')}-${String(safeD).padStart(2, '0')}`
      : ''
    lastEmitted.current = out
    onChange(out)
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      <select className="input" value={m || ''} onChange={e => update(y, parseInt(e.target.value) || '', d)}>
        <option value="">Month</option>
        {MONTHS.map((name, i) => <option key={name} value={i + 1}>{name}</option>)}
      </select>
      <select className="input" value={d || ''} onChange={e => update(y, m, parseInt(e.target.value) || '')}>
        <option value="">Day</option>
        {days.map(day => <option key={day} value={day}>{day}</option>)}
      </select>
      <select className="input" value={y || ''} onChange={e => update(parseInt(e.target.value) || '', m, d)}>
        <option value="">Year</option>
        {years.map(yr => <option key={yr} value={yr}>{yr}</option>)}
      </select>
    </div>
  )
}