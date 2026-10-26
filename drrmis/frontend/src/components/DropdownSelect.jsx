import { useState, useEffect, useRef, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown } from 'lucide-react'

// App-styled dropdown whose list ALWAYS opens downward (a native <select>
// lets the browser flip it upward near the bottom of the screen). The list
// is portaled to <body> with fixed positioning, so the modal's scroll area
// never clips it; it follows the button while the modal scrolls.
export default function DropdownSelect({ value, placeholder, options, onChange, className = 'input', searchable = false, disabled = false }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState(null)
  const btnRef = useRef(null)
  const listRef = useRef(null)
  const searchRef = useRef(null)
  const [query, setQuery] = useState('')

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

  // Searchable lists: put the cursor in the search box as soon as the list
  // shows, and clear the search again when the list closes.
  useEffect(() => {
    if (!open) { setQuery(''); return }
    if (searchable && pos) searchRef.current?.focus()
  }, [open, searchable, pos !== null])

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

  const same = (a, b) => a !== '' && a != null && String(a) === String(b)
  const current = options.find(o => same(o.value, value))
  const q = query.trim().toLowerCase()
  const shown = searchable && q
    ? options.filter(o => `${o.label} ${o.note || ''}`.toLowerCase().includes(q))
    : options

  return (
    <>
      <button
        type="button"
        ref={btnRef}
        className={`${className} flex items-center justify-between text-left ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
        disabled={disabled}
        onClick={() => { if (!disabled) setOpen(o => !o) }}
      >
        <span className={`truncate ${current ? '' : 'text-gray-500'}`}>{current ? current.label : placeholder}</span>
        <ChevronDown size={16} className="text-gray-500 shrink-0" />
      </button>
      {open && pos && createPortal(
        <ul
          ref={listRef}
          className="fixed z-[10000] bg-white border border-gray-200 rounded-lg shadow-lg overflow-y-auto py-1"
          style={{ top: pos.top, left: pos.left, width: pos.width, maxHeight: pos.maxHeight }}
        >
          {searchable && (
            <li className="sticky top-0 z-10 bg-white px-2 pb-1.5 pt-1 border-b border-gray-100">
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => {
                  if (e.key !== 'Enter') return
                  e.preventDefault()
                  const first = shown.find(o => !o.disabled)
                  if (first && q) { onChange(first.value); setOpen(false) }
                }}
                placeholder="Search…"
                autoComplete="off"
                className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm outline-none focus:border-primary-500"
              />
            </li>
          )}
          {!q && (
            <li
              className="px-3 py-1.5 text-sm text-gray-500 cursor-pointer hover:bg-gray-100"
              onClick={() => { onChange(''); setOpen(false) }}
            >
              {placeholder}
            </li>
          )}
          {searchable && q && shown.length === 0 && (
            <li className="px-3 py-2 text-sm text-gray-500">No match found</li>
          )}
          {shown.map(o => (
            <li
              key={o.value}
              data-selected={same(o.value, value)}
              aria-disabled={o.disabled || undefined}
              className={`px-3 py-1.5 text-sm flex items-center justify-between gap-2 ${
                o.disabled ? 'text-gray-400 cursor-not-allowed'
                : same(o.value, value) ? 'bg-primary-600 text-white cursor-pointer' : 'hover:bg-gray-100 cursor-pointer'}`}
              onClick={() => { if (o.disabled) return; onChange(o.value); setOpen(false) }}
            >
              <span className="truncate">{o.label}</span>
              {o.note && <span className="text-xs text-gray-400 shrink-0">{o.note}</span>}
            </li>
          ))}
        </ul>,
        document.body
      )}
    </>
  )
}