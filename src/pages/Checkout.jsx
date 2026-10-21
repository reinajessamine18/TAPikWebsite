import { useState } from 'react'
import { calculateShippingFee, SHAPES, CHAINS } from '../lib/pricing'
import { REGION, isAddressComplete, normalizeDetails } from '../lib/address'
import AddressFields from '../components/AddressFields'
import { saveOrders, loadOrders, upsertOrders, loadDeliveryDetails, saveDeliveryDetails, newId } from '../lib/storage'
import { itemKey, useInventory } from '../lib/inventory'
import { displayOrderStatus, PAYABLE_STATUSES } from '../lib/orderStatus'
import PaymentPanel from '../components/PaymentPanel'

export default function Checkout({ cart, setCart, setPage, account }) {
  const [form, setForm] = useState(() => ({
    name: account?.name || '', email: account?.email || '', phone: '', province: REGION, city: '', barangay: '', street: '', landmark: '',
    ...normalizeDetails(loadDeliveryDetails(account?.id)),
    instructions: '',
  }))
  const [savedDetails, setSavedDetails] = useState(() => {
    const details = normalizeDetails(loadDeliveryDetails(account?.id))
    return details && { ...details, instructions: '' }
  })
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

  const update = (key, value) => {
    const next = { ...form, [key]: value }
    if (key === 'city') next.barangay = ''
    setForm(next)
    saveDeliveryDetails(account.id, { ...next, instructions: '' })
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

  // The order has not been sent anywhere yet, so going back just drops it from this browser and refills the cart.
  const goBack = () => {
    saveOrders(loadOrders().filter((order) => order.id !== success.id))
    setCart(success.items)
    setSuccess(null)
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
              {needsPayment ? (
                <button type="button" onClick={goBack} className="rounded-full border border-yellow-300 px-5 py-2 font-bold text-yellow-300">Back</button>
              ) : (
                <button type="button" onClick={() => setPage('orders')} className="rounded-full border border-yellow-300 px-5 py-2 font-bold text-yellow-300">View orders</button>
              )}
            </div>
            {needsPayment && <p className="mt-3 text-xs text-blue-100">Back lets you change your cart or delivery details. Your order is not sent to us until you submit your payment.</p>}
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
            <AddressFields form={form} onChange={update} />
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
