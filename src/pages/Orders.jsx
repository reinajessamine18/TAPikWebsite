import { useState } from 'react'
import { upsertOrders } from '../lib/storage'
import { displayOrderStatus, orderStatusColor, PAYABLE_STATUSES } from '../lib/orderStatus'
import { downloadReceipt } from '../services/api'
import PaymentPanel from '../components/PaymentPanel'
import ReceiptViewer from '../components/ReceiptViewer'
import CustomerOrderDetails from '../components/CustomerOrderDetails'
import { buildReceiptHtml, receiptNumberOf } from '../lib/receipt'
import { openPrintableReport } from '../lib/reports'

export default function Orders({ account, ordersState }) {
  const [receiptError, setReceiptError] = useState('')
  const { orders, reload, refresh, error: syncError, lastSynced } = ordersState
  const [payingId, setPayingId] = useState(null)
  const [viewingId, setViewingId] = useState(null)
  const [detailsId, setDetailsId] = useState(null)
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    await refresh()
    setRefreshing(false)
  }

  const handleReceiptDownload = async (orderId) => {
    try {
      setReceiptError('')
      await downloadReceipt(orderId)
    } catch (error) {
      setReceiptError(`Receipt download failed: ${error.message}`)
    }
  }

  const handleReceiptPrint = (order) => {
    setReceiptError('')
    if (!openPrintableReport(buildReceiptHtml(order))) {
      setReceiptError('Your browser blocked the print window. Allow pop-ups for this site and try again.')
    }
  }

  const handlePaymentUpdated = (updated) => {
    upsertOrders([updated])
    reload()
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
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-bold">Your orders</h2>
          <div className="flex items-center gap-3 text-xs text-blue-100">
            {lastSynced && <span>Updated {lastSynced.toLocaleTimeString()}</span>}
            <button type="button" onClick={handleRefresh} disabled={refreshing} className="rounded-full border border-white/40 px-4 py-1.5 text-sm font-bold text-white hover:bg-white/10 disabled:opacity-50">
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
        {syncError && <p role="alert" className="rounded-lg border border-rose-300/40 bg-rose-950/40 p-3 text-sm text-rose-100">We could not refresh your orders ({syncError}). You are seeing the last information saved on this device.</p>}
        {orders.map((o) => {
          const status = displayOrderStatus(o.status)
          const needsPayment = PAYABLE_STATUSES.includes(status)
          return (
            <div
              key={o.id}
              className="tapik-surface cursor-pointer rounded-2xl border border-white/25 p-5 transition hover:border-white/60"
              onClick={(event) => { if (!event.target.closest('button, a, input, select, textarea, label, form')) setDetailsId(o.id) }}
            >
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
                  <div role="alert" className="rounded-lg border border-rose-300/60 bg-rose-50 p-3 text-rose-950">
                    <strong>Payment was not accepted.</strong>
                    <p className="mt-1">{o.paymentRejectReason || 'Please check your proof of payment.'}</p>
                    <p className="mt-2">Please upload a new proof below.</p>
                  </div>
                )}
                {o.paymentStatus === 'Paid' && (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span><strong>Receipt No.:</strong> {receiptNumberOf(o)}</span>
                    <button type="button" onClick={() => setViewingId(o.id)} className="rounded-full bg-yellow-400 px-3 py-1 text-xs font-bold text-slate-950">View receipt</button>
                    <button type="button" onClick={() => handleReceiptPrint(o)} className="rounded-full border border-white/40 px-3 py-1 text-xs font-bold hover:bg-white/10">Print</button>
                    {o.receiptURL && <button type="button" onClick={() => handleReceiptDownload(o.id)} className="rounded-full border border-white/40 px-3 py-1 text-xs font-bold hover:bg-white/10">Download PDF</button>}
                  </div>
                )}
                {['Shipped', 'Delivered'].includes(status) && o.trackingNumber && (
                  <div><strong>Tracking ID:</strong> {o.trackingNumber}</div>
                )}
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => setDetailsId(o.id)} className="rounded-full border border-white/40 px-4 py-2 text-sm font-bold hover:bg-white/10">View details</button>
                {needsPayment && payingId !== o.id && (
                  <button type="button" onClick={() => setPayingId(o.id)} className="rounded-full bg-yellow-400 px-5 py-2 font-bold text-blue-900">
                    {status === 'Payment rejected' ? 'Upload new proof of payment' : 'Pay now'}
                  </button>
                )}
              </div>
              {needsPayment && payingId === o.id && (
                <div className="mt-4">
                  <PaymentPanel order={o} account={account} onUpdated={handlePaymentUpdated} />
                </div>
              )}
            </div>
          )
        })}
        {orders.find((order) => order.id === detailsId) && (
          <CustomerOrderDetails
            order={orders.find((order) => order.id === detailsId)}
            onClose={() => setDetailsId(null)}
            onPay={(order) => { setDetailsId(null); setPayingId(order.id) }}
            onViewReceipt={(order) => setViewingId(order.id)}
            onPrintReceipt={handleReceiptPrint}
            onDownloadReceipt={handleReceiptDownload}
          />
        )}
        {orders.find((order) => order.id === viewingId) && (
          <ReceiptViewer order={orders.find((order) => order.id === viewingId)} onClose={() => setViewingId(null)} />
        )}
        {receiptError && <p role="alert" className="rounded-lg border border-rose-300/40 bg-rose-950/40 p-3 text-sm text-rose-100">{receiptError}</p>}
      </div>
    </div>
  )
}
