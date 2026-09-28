import { useMemo, useState, useEffect, useRef, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown } from 'lucide-react'

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

// App-styled dropdown whose list ALWAYS opens downward (a native <select>
// lets the browser flip it upward near the bottom of the screen). The list
// is portaled to <body> with fixed positioning, so the modal's scroll area
// never clips it; it follows the button while the modal scrolls.
function DropdownSelect({ value, placeholder, options, onChange }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState(null)
  const btnRef = useRef(null)
  const listRef = useRef(null)

  const place = () => {
    const r = btnRef.current?.getBoundingClientRect()
    if (r) setPos({ top: r.bottom + 4, left: r.left, width: r.width, maxHeight: Math.max(160, Math.min(240, window.innerHeight - r.bottom - 12)) })
  }

  useLayoutEffect(() => {
    if (!open) return
    place()
    // Scroll the current value into view inside the list.
    const sel = listRef.current?.querySelector('[data-selected="true"]')
    if (sel) sel.scrollIntoView({ block: 'center' })
  }, [open])

  useEffect(() => {
    if (!open) return
    const onDown = (e) => {
      if (btnRef.current?.contains(e.target) || listRef.current?.contains(e.target)) return
      setOpen(false)
    }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    const onScroll = (e) => { if (!listRef.current?.contains(e.target)) place() }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', place)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', place)
    }
  }, [open])

  const current = options.find(o => o.value === value)

  return (
    <>
      <button
        type="button"
        ref={btnRef}
        className="input flex items-center justify-between text-left"
        onClick={() => setOpen(o => !o)}
      >
        <span className={current ? '' : 'text-gray-500'}>{current ? current.label : placeholder}</span>
        <ChevronDown size={16} className="text-gray-500 shrink-0" />
      </button>
      {open && pos && createPortal(
        <ul
          ref={listRef}
          className="fixed z-[10000] bg-white border border-gray-200 rounded-lg shadow-lg overflow-y-auto py-1"
          style={{ top: pos.top, left: pos.left, width: pos.width, maxHeight: pos.maxHeight }}
        >
          <li
            className="px-3 py-1.5 text-sm text-gray-500 cursor-pointer hover:bg-gray-100"
            onClick={() => { onChange(''); setOpen(false) }}
          >
            {placeholder}
          </li>
          {options.map(o => (
            <li
              key={o.value}
              data-selected={o.value === value}
              className={`px-3 py-1.5 text-sm cursor-pointer ${o.value === value ? 'bg-primary-600 text-white' : 'hover:bg-gray-100'}`}
              onClick={() => { onChange(o.value); setOpen(false) }}
            >
              {o.label}
            </li>
          ))}
        </ul>,
        document.body
      )}
    </>
  )
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