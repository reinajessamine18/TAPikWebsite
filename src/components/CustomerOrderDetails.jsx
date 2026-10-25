import Modal from './Modal'
import CustomerArtwork from './CustomerArtwork'
import { displayOrderStatus, orderStatusColor, paymentLabel, PAYABLE_STATUSES } from '../lib/orderStatus'
import { receiptNumberOf } from '../lib/receipt'
import { SHAPES, CHAINS } from '../lib/pricing'

const money = (amount) =>
  (Number(amount) || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const labelOf = (list, id) => list.find((option) => option.id === id)?.label || id || ''

function Section({ title, children }) {
  return (
    <section className="rounded-xl border border-white/15 bg-white/5 p-4">
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-blue-200">{title}</h3>
      {children}
    </section>
  )
}

// Everything about one of the customer's orders: the design photos, delivery, payment, receipt and tracking.
export default function CustomerOrderDetails({ order, onClose, onPay, onViewReceipt, onPrintReceipt, onDownloadReceipt }) {
  const customer = order.customer || {}
  const status = displayOrderStatus(order.status)
  const needsPayment = PAYABLE_STATUSES.includes(status)
  const address = [customer.street, customer.landmark && `(${customer.landmark})`, customer.barangay, customer.city, customer.province]
    .filter(Boolean).join(', ') || customer.address || 'Address not available'
  const items = order.items || []

  return (
    <Modal title="Order details" onClose={onClose} wide>
      <div className="space-y-4 text-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="break-all font-bold">{order.id}</p>
            <p className="text-blue-100">{order.date ? new Date(order.date).toLocaleString() : ''}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`tapik-status-badge ${orderStatusColor(order.status)}`}>{status}</span>
            <span className="text-blue-100">Payment: <strong className="text-white">{paymentLabel(order)}</strong></span>
          </div>
        </div>

        {status === 'Payment submitted' && (
          <p className="rounded-lg border border-white/20 bg-white/5 p-3 text-blue-100">Your proof of payment was received. We are verifying it and will start preparing your order once it is confirmed.</p>
        )}
        {status === 'Payment rejected' && (
          <div role="alert" className="rounded-lg border border-rose-300/60 bg-rose-50 p-3 text-rose-950">
            <strong>Payment was not accepted.</strong>
            <p className="mt-1">{order.paymentRejectReason || 'Please check your proof of payment.'}</p>
          </div>
        )}

        <Section title={`Your design${items.length === 1 ? '' : 's'} (${items.length})`}>
          <div className="space-y-3">
            {items.map((item, index) => {
              const quantity = Number(item.qty) || 1
              const unit = Number(item.price) || 0
              return (
                <div key={item.id || index} className="flex min-w-0 gap-3 rounded-lg border border-white/15 p-3">
                  {item.image
                    ? <CustomerArtwork image={item.image} className="h-32 w-32" />
                    : <div className="flex h-32 w-32 shrink-0 items-center justify-center rounded bg-white/10 px-2 text-center text-xs text-blue-200">No design photo</div>}
                  <div className="min-w-0">
                    <p className="font-bold">{labelOf(SHAPES, item.shape) || 'Custom'} shape · {labelOf(CHAINS, item.chain) || 'Standard'} chain</p>
                    <p className="mt-1 text-blue-100">Quantity {quantity} · PHP {money(unit)} each</p>
                    <p className="mt-1 font-semibold">PHP {money(quantity * unit)}</p>
                    {item.nfcLink && (
                      <p className="mt-2 break-all text-xs text-blue-100">
                        NFC link: <a href={item.nfcLink} target="_blank" rel="noreferrer" className="text-yellow-300 underline">{item.nfcLink}</a>
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </Section>

        <div className="grid gap-4 sm:grid-cols-2">
          <Section title="Delivery">
            <p className="font-semibold">{customer.name}{customer.phone ? ` · ${customer.phone}` : ''}</p>
            <p className="mt-1 text-blue-100">{address}</p>
            {customer.instructions && <p className="mt-2 text-blue-100">Note: {customer.instructions}</p>}
            {['Shipped', 'Delivered'].includes(status) && order.trackingNumber && (
              <p className="mt-2 text-blue-100">{order.courier || 'J&T Express'} tracking: <strong className="text-white">{order.trackingNumber}</strong></p>
            )}
          </Section>

          <Section title="Payment summary">
            <dl className="space-y-1">
              <div className="flex justify-between"><dt className="text-blue-100">Subtotal</dt><dd>PHP {money(order.subtotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-blue-100">Shipping</dt><dd>PHP {money(order.shipping)}</dd></div>
              <div className="flex justify-between border-t border-white/15 pt-1 font-bold"><dt>Total</dt><dd>PHP {money(order.total)}</dd></div>
            </dl>
          </Section>
        </div>

        {order.paymentStatus === 'Paid' && (
          <Section title="Receipt">
            <p className="text-blue-100">Receipt No. <strong className="text-white">{receiptNumberOf(order)}</strong></p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => onViewReceipt(order)} className="rounded-full bg-yellow-400 px-4 py-1.5 text-xs font-bold text-slate-950">View receipt</button>
              <button type="button" onClick={() => onPrintReceipt(order)} className="rounded-full border border-white/40 px-4 py-1.5 text-xs font-bold hover:bg-white/10">Print</button>
              {order.receiptURL && <button type="button" onClick={() => onDownloadReceipt(order.id)} className="rounded-full border border-white/40 px-4 py-1.5 text-xs font-bold hover:bg-white/10">Download PDF</button>}
            </div>
          </Section>
        )}

        <div className="flex flex-wrap justify-end gap-3">
          {needsPayment && (
            <button type="button" onClick={() => onPay(order)} className="rounded-xl bg-yellow-400 px-5 py-2 font-bold text-slate-950 hover:bg-yellow-300">
              {status === 'Payment rejected' ? 'Upload new proof of payment' : 'Pay now'}
            </button>
          )}
          <button type="button" onClick={onClose} className="rounded-xl border border-white/30 px-5 py-2 font-semibold hover:bg-white/10">Close</button>
        </div>
      </div>
    </Modal>
  )
}
