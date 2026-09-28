import { useMemo, useState, useEffect, useRef } from 'react'
import DropdownSelect from './DropdownSelect'

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
  const yearOptions = useMemo(() => {
    const arr = []
    for (let yr = currentYear; yr >= currentYear - 120; yr--) arr.push({ value: yr, label: String(yr) })
    return arr
  }, [currentYear])

  const monthOptions = useMemo(() => MONTHS.map((name, i) => ({ value: i + 1, label: name })), [])

  const dayOptions = useMemo(() => {
    const count = daysInMonth(m, y)
    return Array.from({ length: count }, (_, i) => ({ value: i + 1, label: String(i + 1) }))
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
      <DropdownSelect value={m} placeholder="Month" options={monthOptions} onChange={v => update(y, v, d)} />
      <DropdownSelect value={d} placeholder="Day" options={dayOptions} onChange={v => update(y, m, v)} />
      <DropdownSelect value={y} placeholder="Year" options={yearOptions} onChange={v => update(v, m, d)} />
    </div>
  )
}