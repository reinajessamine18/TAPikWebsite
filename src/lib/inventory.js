import { useCallback, useEffect, useState } from 'react'
import { api } from '../services/api'

export const itemKey = (type, id) => `${type}:${id}`

// 'out' at 0, 'low' at or below the threshold, otherwise 'ok'.
export function stockLevel(row) {
  if (!row) return 'ok'
  if (row.stock <= 0) return 'out'
  if (row.stock <= row.threshold) return 'low'
  return 'ok'
}

async function fetchInventory() {
  const result = await api.getInventory()
  if (!result.ok || !Array.isArray(result.data)) {
    throw new Error(result.error || 'Apps Script did not return the inventory.')
  }
  return Object.fromEntries(result.data.map((row) => [itemKey(row.type, row.id), row]))
}

// Loads stock levels from the order database and refreshes them on an interval.
// inventory stays null until loaded, or when no database is connected; callers treat null as "everything available".
export function useInventory(refreshMs = 60000) {
  const [inventory, setInventory] = useState(null)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    if (!api.isConfigured()) return
    try {
      setInventory(await fetchInventory())
      setError('')
    } catch (loadError) {
      setError(loadError.message)
    }
  }, [])

  useEffect(() => {
    if (!api.isConfigured()) return undefined
    let active = true
    const load = async () => {
      try {
        const next = await fetchInventory()
        if (active) {
          setInventory(next)
          setError('')
        }
      } catch (loadError) {
        if (active) setError(loadError.message)
      }
    }
    load()
    const intervalId = window.setInterval(load, refreshMs)
    return () => {
      active = false
      window.clearInterval(intervalId)
    }
  }, [refreshMs])

  return { inventory, error, refresh }
}
