import { useEffect } from 'react'

// A centered dialog over a dimmed page. Closes on Esc or a click outside the box.
export default function Modal({ title, onClose, children, wide = false }) {
  useEffect(() => {
    const onKey = (event) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[99990] flex items-start justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm sm:items-center"
      onClick={(event) => { if (event.target === event.currentTarget) onClose() }}
    >
      <div role="dialog" aria-modal="true" aria-label={title} className={`tapik-surface my-auto w-full ${wide ? "max-w-3xl" : "max-w-md"} rounded-2xl border border-white/25 p-6 text-white`}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="text-xl font-bold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-2xl leading-none text-blue-100 hover:text-white">×</button>
        </div>
        {children}
      </div>
    </div>
  )
}
