import { useEffect, useState } from 'react'
import { loadOrders, mergeRemoteOrders, upsertOrders } from '../lib/storage'
import { displayOrderStatus, orderStatusColor, PAYABLE_STATUSES } from '../lib/orderStatus'
import { api, downloadReceipt } from '../services/api'
import PaymentPanel from '../components/PaymentPanel'

const mine = (orders, accountId) =>
  orders
    .filter((order) => order.customerId === accountId)
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))

export default function Orders({ account }) {
  const [receiptError, setReceiptError] = useState('')
  const [orders, setOrders] = useState(() => mine(loadOrders(), account.id))
  const [payingId, setPayingId] = useState(null)

  // Pull the latest statuses (payment decisions, shipping) from the order database.
  useEffect(() => {
    if (!api.isConfigured()) return undefined
    let active = true
    const sync = async () => {
      try {
        const result = await api.getCustomerOrders({ customerId: account.id })
        if (!active || !result.ok || !Array.isArray(result.data)) return
        mergeRemoteOrders(result.data)
        setOrders(mine(loadOrders(), account.id))
      } catch {
        // Keep showing the orders saved in this browser when the sync fails.
      }
    }
    sync()
    const intervalId = window.setInterval(sync, 30000)
    return () => {
      active = false
      window.clearInterval(intervalId)
    }
  }, [account.id])

  const handleReceiptDownload = async (orderId) => {
    try {
      setReceiptError('')
      await downloadReceipt(orderId)
    } catch (error) {
      setReceiptError(`Receipt download failed: ${error.message}`)
    }
  }

  const handlePaymentUpdated = (updated) => {
    upsertOrders([updated])
    setOrders(mine(loadOrders(), account.id))
    setPayingId(null)
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
        {orders.map((o) => {
          const status = displayOrderStatus(o.status)
          const needsPayment = PAYABLE_STATUSES.includes(status)
          return (
            <div key={o.id} className="tapik-surface rounded-2xl border border-white/25 p-5">
              <div className="flex flex-wrap justify-between gap-2 mb-2">
                <div>
                  <div className="font-bold">{o.id}</div>
                  <div className="text-sm text-blue-100">{new Date(o.date).toLocaleString()}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-lg">PHP {o.total}</div>
                  <span className={`tapik-status-badge ${orderStatusColor(o.status)}`}>{status}</span>
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
                {status === 'Payment submitted' && (
                  <div className="text-blue-100">Your proof of payment was received. We are verifying it and will start preparing your order once it is confirmed.</div>
                )}
                {status === 'Payment rejected' && (
                  <div role="alert" className="rounded-lg border border-rose-300/40 bg-rose-950/40 p-3 text-rose-100">
                    <strong>Payment was not accepted.</strong> {o.paymentRejectReason || 'Please check your proof of payment.'} Please upload a new proof below.
                  </div>
                )}
                {o.paymentStatus === 'Paid' && o.receiptURL && (
                  <div className="flex flex-wrap items-center gap-3">
                    {o.receiptNumber && <span><strong>Receipt No.:</strong> {o.receiptNumber}</span>}
                    <button type="button" onClick={() => handleReceiptDownload(o.id)} className="font-bold text-yellow-300 underline">Download receipt PDF</button>
                  </div>
                )}
                {['Shipped', 'Delivered'].includes(status) && o.trackingNumber && (
                  <div><strong>Tracking ID:</strong> {o.trackingNumber}</div>
                )}
              </div>
              {needsPayment && (
                <div className="mt-4">
                  {payingId === o.id ? (
                    <PaymentPanel order={o} account={account} onUpdated={handlePaymentUpdated} />
                  ) : (
                    <button type="button" onClick={() => setPayingId(o.id)} className="rounded-full bg-yellow-400 px-5 py-2 font-bold text-blue-900">
                      {status === 'Payment rejected' ? 'Upload new proof of payment' : 'Pay now'}
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
        {receiptError && <p role="alert" className="rounded-lg border border-rose-300/40 bg-rose-950/40 p-3 text-sm text-rose-100">{receiptError}</p>}
      </div>
    </div>
  )
}
