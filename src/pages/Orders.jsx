import React, { useEffect, useState } from 'react'
import { loadOrders, saveOrders } from '../lib/storage'

const STATUSES = ['Processing', 'Packed', 'Shipped', 'Delivered']

export default function Orders() {
  const [orders, setOrders] = useState([])
  useEffect(() => { setOrders(loadOrders()) }, [])

  const updateStatus = (id, status) => {
    const next = orders.map((o) => (o.id === id ? { ...o, status } : o))
    setOrders(next)
    saveOrders(next)
  }

  if (!orders.length) {
    return (
      <div className="min-h-screen bg-blue-50 text-blue-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">No orders yet</h2>
          <p className="text-blue-600">Place an order from your cart.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-blue-50 text-blue-900">
      <div className="max-w-5xl mx-auto px-4 py-10 space-y-4">
        <h2 className="text-2xl font-bold mb-4">Your orders</h2>
        {orders.map((o) => (
          <div key={o.id} className="bg-white rounded-2xl shadow p-5">
            <div className="flex flex-wrap justify-between gap-2 mb-2">
              <div>
                <div className="font-bold">{o.id}</div>
                <div className="text-sm text-blue-600">{new Date(o.date).toLocaleString()}</div>
              </div>
              <div className="text-right">
                <div className="font-bold text-lg">PHP {o.total}</div>
                <span className="inline-block bg-yellow-100 text-blue-900 text-xs font-bold rounded-full px-2 py-1">{o.status}</span>
              </div>
            </div>
            <div className="text-sm space-y-1">
              <div><strong>Customer:</strong> {o.customer.name} - {o.customer.phone}</div>
              <div><strong>Deliver to:</strong> {o.customer.street}, {o.customer.barangay}, {o.customer.city}, {o.customer.province}</div>
              <div><strong>Simulated J&T tracking:</strong> {o.trackingNumber} {o.simulated && '(demo)'}</div>
            </div>
            <div className="mt-3 flex gap-2 flex-wrap">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => updateStatus(o.id, s)}
                  className={`text-xs px-3 py-1 rounded-full border ${o.status === s ? 'bg-blue-800 text-yellow-400 border-blue-800' : 'border-blue-200 text-blue-700'}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
