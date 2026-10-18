import { useState } from 'react'
import { loadOrders } from '../lib/storage'
import { displayOrderStatus, orderStatusColor } from '../lib/orderStatus'
import { downloadReceipt } from '../services/api'

export default function Orders({ account }) {
  const [receiptError, setReceiptError] = useState('')
  const [orders] = useState(() => loadOrders()
    .filter((order) => order.customerId === account.id)
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)))

  const handleReceiptDownload = async (orderId) => {
    try {
      setReceiptError('')
      await downloadReceipt(orderId)
    } catch (error) {
      setReceiptError(`Receipt download failed: ${error.message}`)
    }
  }

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
          <div key={o.id} className="tapik-surface rounded-2xl border border-white/25 p-5">
            <div className="flex flex-wrap justify-between gap-2 mb-2">
              <div>
                <div className="font-bold">{o.id}</div>
                <div className="text-sm text-blue-100">{new Date(o.date).toLocaleString()}</div>
              </div>
              <div className="text-right">
                <div className="font-bold text-lg">PHP {o.total}</div>
                <span className={`tapik-status-badge ${orderStatusColor(o.status)}`}>{displayOrderStatus(o.status)}</span>
              </div>
            </div>
            <div className="text-sm space-y-1">
              <div><strong>Customer:</strong> {o.customer.name} - {o.customer.phone}</div>
              <div><strong>Deliver to:</strong> {[
                o.customer.street,
                o.customer.barangay,
                o.customer.city,
                o.customer.province,
              ].filter(Boolean).join(', ') || o.customer.address || 'Address not available'}</div>
              {o.receiptURL && (
                <div className="flex flex-wrap items-center gap-3">
                  {o.receiptNumber && <span><strong>Receipt No.:</strong> {o.receiptNumber}</span>}
                  <button type="button" onClick={() => handleReceiptDownload(o.id)} className="font-bold text-yellow-300 underline">Download receipt PDF</button>
                </div>
              )}
              {['Shipped', 'Delivered'].includes(displayOrderStatus(o.status)) && o.trackingNumber && (
                <div><strong>Tracking ID:</strong> {o.trackingNumber}</div>
              )}
            </div>
          </div>
        ))}
        {receiptError && <p role="alert" className="rounded-lg border border-rose-300/40 bg-rose-950/40 p-3 text-sm text-rose-100">{receiptError}</p>}
      </div>
    </div>
  )
}
