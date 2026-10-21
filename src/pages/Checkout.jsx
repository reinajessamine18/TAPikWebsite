import { useState } from 'react'
import { calculateShippingFee, METRO_MANILA_CITIES, SHAPES, CHAINS } from '../lib/pricing'
import { getBarangays } from '../data/metroManila'
import { saveOrders, loadOrders, upsertOrders, loadDeliveryDetails, saveDeliveryDetails, newId } from '../lib/storage'
import { itemKey, useInventory } from '../lib/inventory'
import { displayOrderStatus, PAYABLE_STATUSES } from '../lib/orderStatus'
import PaymentPanel from '../components/PaymentPanel'

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
  const [submitError, setSubmitError] = useState('')
  const { inventory } = useInventory()

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

  // Shapes and chains the cart needs more of than are in stock.
  const shortItems = (() => {
    if (!inventory) return []
    const needed = {}
    cart.forEach((item) => {
      ;[itemKey('shape', item.shape), itemKey('chain', item.chain)].forEach((key) => {
        needed[key] = (needed[key] || 0) + item.qty
      })
    })
    return Object.keys(needed)
      .filter((key) => inventory[key] && inventory[key].stock < needed[key])
      .map((key) => {
        const [type, id] = key.split(':')
        const option = (type === 'shape' ? SHAPES : CHAINS).find((entry) => entry.id === id)
        return `${option?.label || id} ${type}`
      })
  })()

  // The order is only recorded in this browser here. It reaches the order database together
  // with the proof of payment, so there is a single wait, at the payment step.
  const submit = (e) => {
    e.preventDefault()
    if (!form.name || !form.phone || !form.street || !hasCity || !form.barangay) {
      alert('Please fill in the required delivery details, including your city and barangay.')
      setIsEditingDetails(true)
      return
    }
    if (shortItems.length) {
      setSubmitError(`Sorry, we don't have enough stock for: ${shortItems.join(', ')}. Please adjust your cart.`)
      return
    }
    const order = {
      id: newId('TAP'),
      date: new Date().toISOString(),
      customer: { ...form },
      customerId: account.id,
      items: cart,
      subtotal,
      shipping,
      total,
      status: 'Awaiting payment',
      paymentMethod: 'QR (demo)',
      paymentStatus: 'Pending',
    }
    setSubmitError('')
    saveOrders([order, ...loadOrders()])
    setCart([])
    setSuccess(order)
  }

  if (success) {
    const needsPayment = PAYABLE_STATUSES.includes(displayOrderStatus(success.status))
    return (
      <div className="min-h-screen text-white">
        <div className="fixed inset-0 z-[99999] flex items-start justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm sm:items-center">
          <div role="dialog" aria-modal="true" aria-labelledby="order-placed-title" className="tapik-surface my-auto w-full max-w-2xl rounded-3xl border border-white/25 p-6 text-center sm:p-8">
            <div className="mb-2 text-3xl text-green-300">Order placed</div>
            <h2 id="order-placed-title" className="text-2xl font-bold">
              {needsPayment ? 'One more step: pay for your order' : 'Payment submitted'}
            </h2>
            <p className="mt-2 text-blue-100">
              Thank you, {success.customer.name}.{' '}
              {needsPayment
                ? 'Scan the QR code, then upload your proof of payment to send your order to us. You can also do this later from Your orders.'
                : 'We will verify your payment, then start preparing your order. Your receipt will be available in Your orders once the payment is confirmed.'}
            </p>
            {needsPayment && (
              <div className="mt-5">
                <PaymentPanel
                  order={success}
                  account={account}
                  onUpdated={(updated) => { upsertOrders([updated]); setSuccess(updated) }}
                />
              </div>
            )}
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button type="button" onClick={() => setPage('home')} className="rounded-full bg-yellow-400 px-5 py-2 font-bold text-blue-900">Home</button>
              <button type="button" onClick={() => setPage('customize')} className="rounded-full border border-yellow-400 px-5 py-2 font-bold text-yellow-400">Continue customizing</button>
            </div>
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
          <button type="submit" className="w-full bg-yellow-400 text-blue-900 font-bold py-3 rounded-full">Place order</button>
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
            <div className="flex justify-between gap-3">
              <span>Shipping</span>
              <span className="text-right">{hasCity ? `PHP ${shipping}` : 'Select a city to see the shipping fee'}</span>
            </div>
            <div className="flex justify-between font-bold text-lg pt-2 border-t border-white/20"><span>Total</span><span>PHP {total}</span></div>
          </div>
        </div>
      </div>
    </div>
  )
}
