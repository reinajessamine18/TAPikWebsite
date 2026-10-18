import { useState } from 'react'
import { loadOrders } from '../lib/storage'

export default function Orders({ account }) {
  const [orders] = useState(() => loadOrders().filter((order) => order.customerId === account.id))

  if (!orders.length) {
    return (
      <div className="min-h-screen text-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">No orders yet</h2>
          <p className="text-blue-100">Place an order from your cart.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen text-white">
      <div className="max-w-5xl mx-auto px-4 py-10 space-y-4">
        <h2 className="text-2xl font-bold mb-4">Your orders</h2>
        {orders.map((o) => (
          <div key={o.id} className="bg-white/10 rounded-2xl shadow p-5 backdrop-blur border border-white/20">
            <div className="flex flex-wrap justify-between gap-2 mb-2">
              <div>
                <div className="font-bold">{o.id}</div>
                <div className="text-sm text-blue-100">{new Date(o.date).toLocaleString()}</div>
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
          </div>
        ))}
      </div>
    </div>
  )
}
