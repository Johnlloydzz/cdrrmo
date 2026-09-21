import { useMemo } from 'react'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function daysInMonth(month, year) {
  if (!month) return 31
  return new Date(year || 2000, month, 0).getDate()
}

// A custom Month / Day / Year birthdate picker — replaces the native
// <input type="date"> browser widget (which looks inconsistent across
// browsers/OSes) with a fully app-styled control. Value/onChange still
// work in plain YYYY-MM-DD strings, so it's a drop-in swap wherever
// birthdate is stored as text.
export default function BirthdateInput({ value, onChange }) {
  const [y, m, d] = (value || '').split('-').map(v => parseInt(v) || '')

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

  const emit = (newY, newM, newD) => {
    if (!newY || !newM || !newD) { onChange(''); return }
    const maxDay = daysInMonth(newM, newY)
    const safeD = Math.min(newD, maxDay)
    onChange(`${newY}-${String(newM).padStart(2, '0')}-${String(safeD).padStart(2, '0')}`)
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      <select className="input" value={m || ''} onChange={e => emit(y, parseInt(e.target.value) || '', d)}>
        <option value="">Month</option>
        {MONTHS.map((name, i) => <option key={name} value={i + 1}>{name}</option>)}
      </select>
      <select className="input" value={d || ''} onChange={e => emit(y, m, parseInt(e.target.value) || '')}>
        <option value="">Day</option>
        {days.map(day => <option key={day} value={day}>{day}</option>)}
      </select>
      <select className="input" value={y || ''} onChange={e => emit(parseInt(e.target.value) || '', m, d)}>
        <option value="">Year</option>
        {years.map(yr => <option key={yr} value={yr}>{yr}</option>)}
      </select>
    </div>
  )
}