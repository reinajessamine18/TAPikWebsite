import React, { useEffect, useState } from 'react'
import { loadOrders, saveOrders } from '../lib/storage'

export default function Admin() {
  const [orders, setOrders] = useState([])
  useEffect(() => { setOrders(loadOrders()) }, [])

  const updateAdminStatus = (id, status) => {
    const next = orders.map((o) => (o.id === id ? { ...o, status } : o))
    setOrders(next)
    saveOrders(next)
  }

  return (
    <div className="min-h-screen bg-blue-50 text-blue-900">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <h2 className="text-2xl font-bold mb-2">Admin (demo)</h2>
        <p className="text-blue-600 mb-6">Manage orders and simulated shipment statuses. Connect to Google Sheets / Apps Script later.</p>
        {orders.length === 0 ? (
          <p className="text-blue-600">No orders yet.</p>
        ) : (
          <div className="space-y-3">
            {orders.map((o) => (
              <div key={o.id} className="bg-white rounded-2xl shadow p-4 flex flex-wrap justify-between items-center gap-3">
                <div>
                  <div className="font-bold">{o.id}</div>
                  <div className="text-sm text-blue-600">{o.customer.name} - PHP {o.total} - {o.trackingNumber}</div>
                </div>
                <select
                  value={o.status}
                  onChange={(e) => updateAdminStatus(o.id, e.target.value)}
                  className="border border-blue-200 rounded-xl p-2"
                >
                  {['Processing', 'Packed', 'Shipped', 'Delivered'].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
