import React, { useState } from 'react'
import { estimateShipping, SHIPPING_BRACKETS } from '../lib/pricing'
import { saveOrders, loadOrders, newId } from '../lib/storage'

const PROVINCES = ['Metro Manila', 'Cavite', 'Laguna', 'Bulacan', 'Rizal', 'Pampanga', 'Batangas', 'Quezon']

export default function Checkout({ cart, setCart, setPage }) {
  const [form, setForm] = useState({
    name: '', email: '', phone: '', province: 'Metro Manila', city: '', barangay: '', street: '', landmark: '', instructions: '',
  })
  const [success, setSuccess] = useState(null)

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0)
  const weight = cart.reduce((s, i) => s + (i.weightGrams || 50) * i.qty, 0)
  const shipping = cart.length ? estimateShipping(weight) : 0
  const total = subtotal + shipping

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const submit = (e) => {
    e.preventDefault()
    if (!form.name || !form.phone || !form.street || !form.city) {
      alert('Please fill in the required delivery details.')
      return
    }
    const orderId = newId('TAP')
    const trackingNumber = `JT-${Math.floor(100000000 + Math.random() * 900000000)}`
    const order = {
      id: orderId,
      date: new Date().toISOString(),
      customer: { ...form },
      items: cart,
      subtotal,
      shipping,
      total,
      status: 'Processing',
      trackingNumber,
      simulated: true,
    }
    const orders = [order, ...loadOrders()]
    saveOrders(orders)
    setCart([])
    setSuccess(order)
  }

  if (success) {
    return (
      <div className="min-h-screen text-white flex items-center justify-center px-4">
        <div className="bg-white/10 rounded-3xl shadow-xl p-8 max-w-lg text-center backdrop-blur border border-white/20">
          <div className="text-3xl mb-3 text-green-300">OK</div>
          <h2 className="text-2xl font-bold">Order placed!</h2>
          <p className="text-blue-100 mt-2">Thank you, {success.customer.name}. Your order has been saved.</p>
          <div className="mt-4 text-left bg-white/5 rounded-xl p-4 text-sm space-y-1">
            <div><strong>Order ID:</strong> {success.id}</div>
            <div><strong>Total:</strong> PHP {success.total}</div>
            <div><strong>Simulated J&T tracking:</strong> {success.trackingNumber}</div>
            <div><strong>Status:</strong> {success.status}</div>
          </div>
          <p className="mt-3 text-xs text-blue-200">Tracking numbers are simulated for this group project.</p>
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
        <form onSubmit={submit} className="bg-white/10 rounded-2xl shadow p-6 space-y-3 backdrop-blur border border-white/20">
          <h2 className="text-2xl font-bold mb-2">Delivery details</h2>
          <input required placeholder="Full name *" value={form.name} onChange={(e) => update('name', e.target.value)} className="w-full border border-white/20 bg-white/5 rounded-xl p-2 text-white placeholder-blue-200" />
          <input placeholder="Email" value={form.email} onChange={(e) => update('email', e.target.value)} className="w-full border border-white/20 bg-white/5 rounded-xl p-2 text-white placeholder-blue-200" />
          <input required placeholder="Phone number *" value={form.phone} onChange={(e) => update('phone', e.target.value)} className="w-full border border-white/20 bg-white/5 rounded-xl p-2 text-white placeholder-blue-200" />
          <select value={form.province} onChange={(e) => update('province', e.target.value)} className="w-full border border-white/20 bg-white/5 rounded-xl p-2 text-white">
            {PROVINCES.map((p) => <option key={p} className="text-blue-900">{p}</option>)}
          </select>
          <input required placeholder="City / Municipality *" value={form.city} onChange={(e) => update('city', e.target.value)} className="w-full border border-white/20 bg-white/5 rounded-xl p-2 text-white placeholder-blue-200" />
          <input placeholder="Barangay" value={form.barangay} onChange={(e) => update('barangay', e.target.value)} className="w-full border border-white/20 bg-white/5 rounded-xl p-2 text-white placeholder-blue-200" />
          <input required placeholder="Street / house / building *" value={form.street} onChange={(e) => update('street', e.target.value)} className="w-full border border-white/20 bg-white/5 rounded-xl p-2 text-white placeholder-blue-200" />
          <input placeholder="Landmark (optional)" value={form.landmark} onChange={(e) => update('landmark', e.target.value)} className="w-full border border-white/20 bg-white/5 rounded-xl p-2 text-white placeholder-blue-200" />
          <textarea placeholder="Delivery instructions" value={form.instructions} onChange={(e) => update('instructions', e.target.value)} className="w-full border border-white/20 bg-white/5 rounded-xl p-2 text-white placeholder-blue-200" rows={3} />

          <p className="text-xs text-blue-200">
            Shipping fee is estimated using simulated J&T brackets: {SHIPPING_BRACKETS.map((b) => `<=${b.maxKg}kg PHP ${b.fee}`).join(', ')}.
          </p>
          <button type="submit" className="w-full bg-yellow-400 text-blue-900 font-bold py-3 rounded-full">Place order</button>
        </form>

        <div className="bg-white/10 rounded-2xl shadow p-6 h-fit backdrop-blur border border-white/20">
          <h3 className="font-bold text-lg mb-3">Order summary</h3>
          {cart.map((i) => (
            <div key={i.id} className="flex justify-between text-sm mb-1">
              <span>{i.shape} x{i.qty}</span>
              <span>PHP {i.price * i.qty}</span>
            </div>
          ))}
          <div className="border-t border-white/20 pt-2 mt-2 space-y-1 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>PHP {subtotal}</span></div>
            <div className="flex justify-between"><span>Shipping</span><span>PHP {shipping}</span></div>
            <div className="flex justify-between font-bold text-lg pt-2 border-t border-white/20"><span>Total</span><span>PHP {total}</span></div>
          </div>
        </div>
      </div>
    </div>
  )
}
