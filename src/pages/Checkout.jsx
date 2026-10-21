import { useState } from 'react'
import { calculateShippingFee, METRO_MANILA_CITIES } from '../lib/pricing'
import { getBarangays } from '../data/metroManila'
import { saveOrders, loadOrders, loadDeliveryDetails, saveDeliveryDetails, newId } from '../lib/storage'
import { api, downloadReceipt } from '../services/api'

const REGION = 'Metro Manila'

// Delivery is limited to Metro Manila. Older saved details may hold a free-text
// city or another province, so drop anything that is not a valid selection.
function normalizeDetails(details) {
  if (!details) return details
  const city = METRO_MANILA_CITIES.includes(details.city) ? details.city : ''
  const barangay = getBarangays(city).includes(details.barangay) ? details.barangay : ''
  return { ...details, province: REGION, city, barangay }
}

const isAddressComplete = (details) => Boolean(details?.city && details?.barangay)

export default function Checkout({ cart, setCart, setPage, account }) {
  const [form, setForm] = useState(() => ({
    name: account?.name || '', email: account?.email || '', phone: '', province: REGION, city: '', barangay: '', street: '', landmark: '', instructions: '',
    ...normalizeDetails(loadDeliveryDetails(account?.id)),
  }))
  const [savedDetails, setSavedDetails] = useState(() => normalizeDetails(loadDeliveryDetails(account?.id)))
  const [isEditingDetails, setIsEditingDetails] = useState(() => {
    const details = normalizeDetails(loadDeliveryDetails(account?.id))
    return !details || !isAddressComplete(details)
  })
  const [success, setSuccess] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [receiptError, setReceiptError] = useState('')

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0)
  const weight = cart.reduce((s, i) => s + (i.weightGrams || 50) * i.qty, 0)
  const fee = cart.length ? calculateShippingFee(weight, form.city) : null
  const hasCity = fee !== null
  const shipping = fee ?? 0
  const total = subtotal + shipping
  const barangayOptions = getBarangays(form.city)

  const update = (key, value) => {
    const next = { ...form, [key]: value }
    if (key === 'city') next.barangay = ''
    setForm(next)
    saveDeliveryDetails(account.id, next)
    setSavedDetails(next)
  }

  const handleReceiptDownload = async () => {
    try {
      setReceiptError('')
      await downloadReceipt(success.id)
    } catch (error) {
      setReceiptError(`Receipt download failed: ${error.message}`)
    }
  }

  const submit = async (e) => {
    e.preventDefault()
    if (submitting) return
    if (!form.name || !form.phone || !form.street || !hasCity || !form.barangay) {
      alert('Please fill in the required delivery details, including your city and barangay.')
      setIsEditingDetails(true)
      return
    }
    const orderId = newId('TAP')
    const order = {
      id: orderId,
      date: new Date().toISOString(),
      customer: { ...form },
      customerId: account.id,
      items: cart,
      subtotal,
      shipping,
      total,
      status: 'Pending',
    }
    setSubmitting(true)
    setSubmitError('')
    if (api.isConfigured()) {
      try {
        const result = await api.createOrder(order)
        if (!result.ok || !result.orderId || !result.receiptURL || !result.receiptNumber) {
          throw new Error(result.error || 'Apps Script did not confirm that the order and downloadable receipt were saved.')
        }
        order.id = result.orderId
        order.trackingNumber = result.trackingNumber
        order.courier = 'J&T Express'
        order.isSimulated = true
        order.receiptNumber = result.receiptNumber
        order.receiptURL = result.receiptURL
        order.savedToAppsScript = true
      } catch (error) {
        setSubmitError(`The order could not be saved to the order database. Your cart is unchanged. ${error.message}`)
        setSubmitting(false)
        return
      }
    }
    const orders = [order, ...loadOrders()]
    saveOrders(orders)
    setCart([])
    setSuccess(order)
    setSubmitting(false)
  }

  if (success) {
    return (
      <div className="min-h-screen text-white flex items-center justify-center px-4">
        <div className="tapik-surface rounded-3xl border border-white/25 p-8 max-w-lg text-center">
          <div className="text-3xl mb-3 text-green-300">Receipt ready</div>
          <h2 className="text-2xl font-bold">Your order is being prepared</h2>
          <p className="text-blue-100 mt-2">Thank you, {success.customer.name}. We have received your order.</p>
          <div className="tapik-surface mt-4 rounded-xl border border-white/25 p-4 text-left text-sm space-y-1">
            <div><strong>Order ID:</strong> {success.id}</div>
            <div><strong>Total:</strong> PHP {success.total}</div>
            <div><strong>Status:</strong> {success.status}</div>
            {success.receiptNumber && <div><strong>Receipt No.:</strong> {success.receiptNumber}</div>}
          </div>
          {success.receiptURL ? (
            <button type="button" onClick={handleReceiptDownload} className="mt-5 inline-block rounded-full bg-white px-5 py-2 font-bold text-blue-900">
              Download PDF receipt
            </button>
          ) : (
            <p className="mt-4 text-sm text-blue-100">Connect the order database to generate and store a downloadable receipt.</p>
          )}
          {receiptError && <p role="alert" className="mt-3 text-sm text-rose-100">{receiptError}</p>}
          <div className="mt-5 flex gap-3 justify-center">
            <button onClick={() => setPage('orders')} className="bg-yellow-400 text-blue-900 font-bold px-5 py-2 rounded-full">View orders</button>
            <button onClick={() => setPage('home')} className="border border-yellow-400 text-yellow-400 font-bold px-5 py-2 rounded-full">Home</button>
          </div>
        </div>
      </div>
    )
  }

  if (!cart.length) {
    return (
      <div className="min-h-screen text-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">No items to checkout</h2>
          <button onClick={() => setPage('customize')} className="bg-yellow-400 text-blue-900 font-bold px-6 py-3 rounded-full">Customize</button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen text-white">
      <div className="max-w-5xl mx-auto px-4 py-10 grid md:grid-cols-2 gap-6">
        <form onSubmit={submit} className="tapik-surface rounded-2xl border border-white/25 p-6 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl font-bold">Delivery details</h2>
            {savedDetails && (
              <button
                type="button"
                onClick={() => setIsEditingDetails((editing) => !editing)}
                className="rounded-lg border border-white/40 px-4 py-2 font-bold transition hover:bg-white/10"
              >
                {isEditingDetails ? 'Done' : 'Edit'}
              </button>
            )}
          </div>
          {submitError && <p role="alert" className="rounded-lg border border-rose-300/40 bg-rose-950/40 p-3 text-sm text-rose-100">{submitError}</p>}
          {savedDetails && !isEditingDetails ? (
            <div className="grid gap-3 rounded-xl border border-white/25 bg-white/10 p-4 sm:grid-cols-2">
              <p><strong>Name</strong><br />{savedDetails.name || 'Not entered'}</p>
              <p><strong>Email</strong><br />{savedDetails.email || 'Not entered'}</p>
              <p><strong>Phone</strong><br />{savedDetails.phone || 'Not entered'}</p>
              <p><strong>Address</strong><br />{[savedDetails.street, savedDetails.barangay, savedDetails.city, savedDetails.province].filter(Boolean).join(', ') || 'Not entered'}</p>
              {savedDetails.landmark && <p><strong>Landmark</strong><br />{savedDetails.landmark}</p>}
              {savedDetails.instructions && <p><strong>Delivery instructions</strong><br />{savedDetails.instructions}</p>}
            </div>
          ) : (
            <>
              <input required placeholder="Full name *" value={form.name} onChange={(e) => update('name', e.target.value)} className="w-full border border-white/20 bg-white/5 rounded-xl p-2 text-white placeholder-blue-200" />
              <input placeholder="Email" value={form.email} onChange={(e) => update('email', e.target.value)} className="w-full border border-white/20 bg-white/5 rounded-xl p-2 text-white placeholder-blue-200" />
              <input required placeholder="Phone number *" value={form.phone} onChange={(e) => update('phone', e.target.value)} className="w-full border border-white/20 bg-white/5 rounded-xl p-2 text-white placeholder-blue-200" />
              <input readOnly aria-label="Region" value={REGION} className="w-full border border-white/20 bg-white/10 rounded-xl p-2 text-white opacity-80" />
              <select required aria-label="City / Municipality" value={form.city} onChange={(e) => update('city', e.target.value)} className="w-full border border-white/20 bg-white/5 rounded-xl p-2 text-white">
                <option value="" className="text-blue-900">City / Municipality *</option>
                {METRO_MANILA_CITIES.map((city) => <option key={city} value={city} className="text-blue-900">{city}</option>)}
              </select>
              <select required aria-label="Barangay" value={form.barangay} disabled={!form.city} onChange={(e) => update('barangay', e.target.value)} className="w-full border border-white/20 bg-white/5 rounded-xl p-2 text-white disabled:opacity-60">
                <option value="" className="text-blue-900">{form.city ? 'Barangay *' : 'Select a city first'}</option>
                {barangayOptions.map((barangay) => <option key={barangay} value={barangay} className="text-blue-900">{barangay}</option>)}
              </select>
              <input required placeholder="Street / house / building *" value={form.street} onChange={(e) => update('street', e.target.value)} className="w-full border border-white/20 bg-white/5 rounded-xl p-2 text-white placeholder-blue-200" />
              <input placeholder="Landmark (optional)" value={form.landmark} onChange={(e) => update('landmark', e.target.value)} className="w-full border border-white/20 bg-white/5 rounded-xl p-2 text-white placeholder-blue-200" />
              <textarea placeholder="Delivery instructions" value={form.instructions} onChange={(e) => update('instructions', e.target.value)} className="w-full border border-white/20 bg-white/5 rounded-xl p-2 text-white placeholder-blue-200" rows={3} />
            </>
          )}

          <p className="text-xs text-blue-200">
            The shipping fee is calculated from your delivery address and shown in the order summary.
          </p>
          <button type="submit" disabled={submitting} className="w-full bg-yellow-400 text-blue-900 font-bold py-3 rounded-full disabled:opacity-60">{submitting ? 'Saving order...' : 'Place order'}</button>
        </form>

        <div className="tapik-surface rounded-2xl border border-white/25 p-6 h-fit">
          <h3 className="font-bold text-lg mb-3">Order summary</h3>
          {cart.map((i) => (
            <div key={i.id} className="flex justify-between text-sm mb-1">
              <span>{i.shape} x{i.qty}</span>
              <span>PHP {i.price * i.qty}</span>
            </div>
          ))}
          <div className="border-t border-white/20 pt-2 mt-2 space-y-1 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>PHP {subtotal}</span></div>
            <div className="flex justify-between">
              <span>Shipping</span>
              <span>{hasCity ? `PHP ${shipping}` : 'Select a city to see the shipping fee'}</span>
            </div>
            <div className="flex justify-between font-bold text-lg pt-2 border-t border-white/20"><span>Total</span><span>PHP {total}</span></div>
          </div>
        </div>
      </div>
    </div>
  )
}
