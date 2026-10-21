import { useCallback, useState } from 'react'
import { displayOrderStatus } from './orderStatus'

const statusMap = (orders) => new Map(orders.map((order) => [order.id, displayOrderStatus(order.status)]))
const signature = (map) => [...map].map(([id, status]) => `${id}:${status}`).join('|')

// Watches a list of orders and returns a toast for each order whose status changed since the last render.
// Orders that are new to the list do not produce a toast.
export function useStatusToasts(orders) {
  const [known, setKnown] = useState(() => statusMap(orders))
  const [toasts, setToasts] = useState([])

  // Compared while rendering (React's pattern for reacting to changed props), so no effect is needed.
  const current = statusMap(orders)
  if (signature(current) !== signature(known)) {
    const changes = [...current]
      .filter(([id, status]) => known.has(id) && known.get(id) !== status)
      .map(([id, status]) => ({ key: `${id}-${status}`, id, status }))
    setKnown(current)
    if (changes.length) {
      setToasts((list) => [...list.filter((toast) => !changes.some((change) => change.key === toast.key)), ...changes])
    }
  }

  const dismiss = useCallback((key) => setToasts((list) => list.filter((toast) => toast.key !== key)), [])
  return { toasts, dismiss }
}
