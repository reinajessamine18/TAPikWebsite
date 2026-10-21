import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { loadOrders, mergeRemoteOrders } from './storage'
import { api } from '../services/api'

const POLL_MS = 15000

const mine = (orders, accountId) =>
  orders
    .filter((order) => order.customerId === accountId)
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))

// A customer's orders, newest first. They are saved in this browser, and refreshed from the order database
// every 15 seconds and whenever the customer returns to the tab, so payment decisions and fulfillment updates
// show up. Pass null when nobody (or an admin) is signed in. Call reload() after changing a stored order yourself.
export function useCustomerOrders(accountId) {
  const [version, setVersion] = useState(0)
  const [error, setError] = useState('')
  const [lastSynced, setLastSynced] = useState(null)
  const active = useRef(true)

  const orders = useMemo(
    () => (accountId ? mine(loadOrders(), accountId) : []),
    // version changes whenever the stored orders were updated
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [accountId, version]
  )

  const reload = useCallback(() => setVersion((current) => current + 1), [])

  const refresh = useCallback(async () => {
    if (!accountId || !api.isConfigured()) return
    try {
      const result = await api.getCustomerOrders({ customerId: accountId })
      if (!result.ok || !Array.isArray(result.data)) {
        throw new Error(result.error || 'The order database did not return your orders.')
      }
      mergeRemoteOrders(result.data)
      if (!active.current) return
      setVersion((current) => current + 1)
      setError('')
      setLastSynced(new Date())
    } catch (syncError) {
      if (active.current) setError(syncError.message)
    }
  }, [accountId])

  useEffect(() => {
    active.current = true
    if (!accountId || !api.isConfigured()) return undefined

    const refreshIfVisible = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    refreshIfVisible()
    const intervalId = window.setInterval(refreshIfVisible, POLL_MS)
    window.addEventListener('focus', refreshIfVisible)
    document.addEventListener('visibilitychange', refreshIfVisible)
    return () => {
      active.current = false
      window.clearInterval(intervalId)
      window.removeEventListener('focus', refreshIfVisible)
      document.removeEventListener('visibilitychange', refreshIfVisible)
    }
  }, [accountId, refresh])

  return { orders, reload, refresh, error, lastSynced }
}
