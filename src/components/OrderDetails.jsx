import CustomerArtwork from './CustomerArtwork'
import { driveImageUrl } from '../lib/drive'
import { displayOrderStatus, orderStatusColor, paymentLabel } from '../lib/orderStatus'

const money = (amount) =>
  `PHP ${(Number(amount) || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

function Section({ title, children }) {
  return (
    <section className="rounded-xl border border-white/15 bg-white/5 p-4">
      <h4 className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-blue-200">{title}</h4>
      {children}
    </section>
  )
}

// Everything about one order, opened from the Orders table so the table itself can stay compact.
export default function OrderDetails({ order, onClose, onReviewPayment, onDownloadReceipt }) {
  const customer = order.customer || {}
  const status = displayOrderStatus(order.status)
  const address = [customer.street, customer.barangay, customer.city, customer.province].filter(Boolean).join(', ')
  const canDownloadReceipt = order.paymentStatus === 'Paid' && order.receiptURL

  return (
    <div
      className="fixed inset-0 z-[99990] flex items-start justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm sm:items-center"
      onClick={(event) => { if (event.target === event.currentTarget) onClose() }}
    >
      <div role="dialog" aria-modal="true" aria-label={`Order ${order.id}`} className="tapik-surface my-auto w-full max-w-3xl rounded-2xl border border-white/25 p-5 text-white">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="break-all text-lg font-black">{order.id}</h3>
            <p className="text-sm text-blue-200">{order.date ? new Date(order.date).toLocaleString() : '—'}</p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className={`tapik-status-badge rounded-md px-2 py-1 text-xs ${orderStatusColor(order.status)}`}>{status}</span>
            <button type="button" onClick={onClose} aria-label="Close" className="text-2xl leading-none text-blue-100 hover:text-white">×</button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Section title="Customer">
            <p className="font-bold">{customer.name || 'Customer'}</p>
            {customer.email && <p className="break-all text-sm text-blue-100">{customer.email}</p>}
            {customer.phone && <p className="text-sm text-blue-100">{customer.phone}</p>}
          </Section>

          <Section title="Delivery">
            <p className="text-sm">{address || customer.address || 'No address'}</p>
            {customer.landmark && <p className="mt-1 text-sm text-blue-100">Landmark: {customer.landmark}</p>}
            {customer.instructions && <p className="mt-1 text-sm text-blue-100">Note: {customer.instructions}</p>}
            <p className="mt-2 text-xs text-blue-200">
              {order.courier || 'J&T Express'} · {order.isSimulated ? 'Simulated' : 'Live'} · Tracking: {order.trackingNumber || 'Not assigned'}
            </p>
          </Section>
        </div>

        <div className="mt-3">
          <Section title={`Items (${(order.items || []).length})`}>
            <div className="space-y-2">
              {(order.items || []).map((item, index) => (
                <div key={item.id || index} className="flex min-w-0 gap-3 rounded-lg border border-white/15 p-2">
                  {item.image
                    ? <CustomerArtwork image={item.image} />
                    : <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded bg-white/10 px-2 text-center text-xs text-blue-200">No uploaded photo</div>}
                  <div className="min-w-0">
                    <p className="break-words font-semibold">{item.shape || item.name || 'Custom keychain'} · {item.chain || 'finish not specified'}</p>
                    <p className="text-xs text-blue-100">Qty {item.qty} · {money(item.price)} each</p>
                    {item.image && (
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        <a href={driveImageUrl(item.image, 'original')} target="_blank" rel="noreferrer" className="rounded-md border border-white/25 px-2 py-1 hover:bg-white/10">View original</a>
                        <a href={driveImageUrl(item.image, 'download')} target="_blank" rel="noreferrer" className="rounded-md border border-white/25 px-2 py-1 hover:bg-white/10">Download</a>
                      </div>
                    )}
                    {item.nfcLink && <a href={item.nfcLink} target="_blank" rel="noreferrer" className="mt-2 block max-w-full truncate text-xs text-yellow-200 underline">{item.nfcLink}</a>}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Section title="Payment">
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between"><dt className="text-blue-200">Subtotal</dt><dd>{money(order.subtotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-blue-200">Shipping</dt><dd>{money(order.shipping)}</dd></div>
              <div className="flex justify-between border-t border-white/15 pt-1 font-bold"><dt>Total</dt><dd>{money(order.total)}</dd></div>
              <div className="flex justify-between pt-1"><dt className="text-blue-200">Payment</dt><dd className="font-bold">{paymentLabel(order)}</dd></div>
            </dl>
            {status === 'Payment submitted' && (
              <button type="button" onClick={() => onReviewPayment(order)} className="mt-3 w-full rounded-lg bg-yellow-300 px-3 py-2 text-sm font-bold text-slate-950">
                Review proof of payment
              </button>
            )}
            {status === 'Payment rejected' && order.paymentRejectReason && (
              <p className="mt-2 text-xs text-blue-200">Rejected: {order.paymentRejectReason}</p>
            )}
            {order.duplicateProof && <p className="mt-2 text-xs font-bold text-rose-200">⚠ Same proof used on another order</p>}
          </Section>

          <Section title="Receipt">
            {canDownloadReceipt ? (
              <>
                <p className="text-sm text-blue-100">{order.receiptNumber}</p>
                <button type="button" onClick={() => onDownloadReceipt(order)} className="mt-3 w-full rounded-lg border border-white/30 px-3 py-2 text-sm font-bold hover:bg-white/10">
                  Download / print receipt (PDF)
                </button>
              </>
            ) : (
              <p className="text-sm text-blue-200">The receipt is available once the payment is confirmed.</p>
            )}
          </Section>
        </div>
      </div>
    </div>
  )
}
