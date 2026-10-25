import { useEffect } from 'react'
import { orderStatusColor } from '../lib/orderStatus'

const SHOW_MS = 10000

function Toast({ toast, onDismiss, onView }) {
  useEffect(() => {
    const timer = window.setTimeout(() => onDismiss(toast.key), SHOW_MS)
    return () => window.clearTimeout(timer)
  }, [toast.key, onDismiss])

  return (
    <div role="status" className="tapik-surface rounded-xl border border-white/30 p-4 shadow-xl">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="mt-1 break-all text-sm font-semibold">{toast.id}</p>
          <p className="mt-1 text-sm">
            is now <span className={`tapik-status-badge ${orderStatusColor(toast.status)}`}>{toast.status}</span>
          </p>
        </div>
        <button type="button" onClick={() => onDismiss(toast.key)} aria-label="Dismiss" className="text-xl leading-none text-blue-100 hover:text-white">×</button>
      </div>
      <button type="button" onClick={() => { onView(); onDismiss(toast.key) }} className="mt-3 text-sm font-bold text-yellow-300 underline underline-offset-2">View my orders</button>
    </div>
  )
}

// Pop-up notices in the corner when one of the customer's orders changes status.
export default function StatusToasts({ toasts, onDismiss, onView }) {
  if (!toasts.length) return null
  return (
    <div aria-live="polite" className="fixed bottom-4 right-4 z-[99995] flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2">
      {toasts.map((toast) => <Toast key={toast.key} toast={toast} onDismiss={onDismiss} onView={onView} />)}
    </div>
  )
}
