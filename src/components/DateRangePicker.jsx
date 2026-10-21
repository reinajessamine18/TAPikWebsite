import { useEffect, useRef, useState } from 'react'

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const pad = (value) => String(value).padStart(2, '0')
const toKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
const fromKey = (key) => {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, month - 1, day)
}
const formatDay = (key) => fromKey(key).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

function describe(from, to) {
  if (!from && !to) return 'Any date'
  if (from && to) return from === to ? formatDay(from) : `${formatDay(from)} – ${formatDay(to)}`
  return from ? `From ${formatDay(from)}` : `Up to ${formatDay(to)}`
}

// One calendar for the date filter: click a day for just that day, then click a second day to make a range.
export default function DateRangePicker({ from, to, onChange }) {
  const [open, setOpen] = useState(false)
  const [anchor, setAnchor] = useState(null)
  const [month, setMonth] = useState(() => {
    const start = from ? fromKey(from) : new Date()
    return new Date(start.getFullYear(), start.getMonth(), 1)
  })
  const rootRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const close = (event) => {
      if (event.type === 'keydown' ? event.key === 'Escape' : !rootRef.current?.contains(event.target)) {
        setOpen(false)
        setAnchor(null)
      }
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', close)
    }
  }, [open])

  const pick = (key) => {
    if (anchor) {
      // Second click: close the range, in either direction.
      onChange(key < anchor ? { from: key, to: anchor } : { from: anchor, to: key })
      setAnchor(null)
    } else {
      // First click: just this day, until a second day extends it.
      onChange({ from: key, to: key })
      setAnchor(key)
    }
  }

  const preset = (start, end) => {
    onChange({ from: toKey(start), to: toKey(end) })
    setAnchor(null)
    setMonth(new Date(start.getFullYear(), start.getMonth(), 1))
  }

  const today = new Date()
  const firstWeekday = month.getDay()
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const cells = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => toKey(new Date(month.getFullYear(), month.getMonth(), index + 1))),
  ]
  const shiftMonth = (delta) => setMonth(new Date(month.getFullYear(), month.getMonth() + delta, 1))

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Filter by date"
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-white/20 bg-slate-900 px-3 py-2 text-left text-sm text-white"
      >
        <span className="truncate">{describe(from, to)}</span>
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><rect x="3" y="4" width="14" height="13" rx="2" /><path d="M3 8h14M7 2v4M13 2v4" /></svg>
      </button>

      {open && (
        <div role="dialog" aria-label="Choose dates" className="absolute left-0 top-full z-[70] mt-2 w-72 rounded-xl border border-white/25 bg-slate-900 p-3 text-white shadow-xl">
          <div className="mb-2 flex items-center justify-between">
            <button type="button" onClick={() => shiftMonth(-1)} aria-label="Previous month" className="rounded-md px-2 py-1 text-lg hover:bg-white/10">‹</button>
            <p className="text-sm font-bold">{month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</p>
            <button type="button" onClick={() => shiftMonth(1)} aria-label="Next month" className="rounded-md px-2 py-1 text-lg hover:bg-white/10">›</button>
          </div>

          <div className="grid grid-cols-7 text-center text-xs text-blue-200">
            {WEEKDAYS.map((day) => <span key={day} className="py-1">{day}</span>)}
          </div>
          <div className="grid grid-cols-7 gap-y-1 text-center text-sm">
            {cells.map((key, index) => {
              if (!key) return <span key={`blank-${index}`} />
              const isEdge = key === from || key === to
              const inRange = from && to && key > from && key < to
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => pick(key)}
                  aria-pressed={isEdge}
                  className={`py-1.5 ${isEdge ? 'rounded-md bg-yellow-300 font-bold text-slate-950' : inRange ? 'bg-yellow-300/25' : 'rounded-md hover:bg-white/10'} ${key === toKey(today) && !isEdge ? 'font-bold text-yellow-200 underline' : ''}`}
                >
                  {Number(key.slice(8))}
                </button>
              )
            })}
          </div>

          <p className="mt-2 text-xs text-blue-200">
            {anchor ? 'Now click a second day to make a range, or pick Done to keep just this day.' : 'Click a day for that day only. Click another day after it to make a range.'}
          </p>

          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <button type="button" onClick={() => preset(today, today)} className="rounded-md border border-white/25 px-2 py-1 hover:bg-white/10">Today</button>
            <button type="button" onClick={() => preset(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6), today)} className="rounded-md border border-white/25 px-2 py-1 hover:bg-white/10">Last 7 days</button>
            <button type="button" onClick={() => preset(new Date(today.getFullYear(), today.getMonth(), 1), today)} className="rounded-md border border-white/25 px-2 py-1 hover:bg-white/10">This month</button>
          </div>

          <div className="mt-3 flex justify-between">
            <button type="button" onClick={() => { onChange({ from: '', to: '' }); setAnchor(null) }} className="rounded-md px-2 py-1 text-xs text-rose-200 underline">Clear dates</button>
            <button type="button" onClick={() => { setAnchor(null); setOpen(false) }} className="rounded-md bg-yellow-300 px-3 py-1 text-xs font-bold text-slate-950">Done</button>
          </div>
        </div>
      )}
    </div>
  )
}
