import React from 'react'
import KeychainPreview from '../components/KeychainPreview'
import { estimateShipping } from '../lib/pricing'
import addButton from '../assets/addbutton.png'
import minusButton from '../assets/minusbutton.png'

export default function Cart({ cart, setCart, setPage }) {
  const updateQty = (id, delta) => {
    setCart(cart.map((i) => (i.id === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i)))
  }
  const remove = (id) => setCart(cart.filter((i) => i.id !== id))
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0)
  const weight = cart.reduce((s, i) => s + (i.weightGrams || 50) * i.qty, 0)
  const shipping = cart.length ? estimateShipping(weight) : 0
  const total = subtotal + shipping

  if (!cart.length) {
    return (
      <div className="min-h-screen text-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Your cart is empty</h2>
          <p className="text-blue-100 mb-4">Start designing your anik-anik keychain.</p>
          <button onClick={() => setPage('customize')} className="bg-yellow-400 text-blue-900 font-bold px-6 py-3 rounded-full">
            Customize now
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen text-white">
      <div className="max-w-5xl mx-auto px-4 py-10 grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          <h2 className="text-2xl font-bold">Your cart</h2>
          {cart.map((i) => (
            <div key={i.id} className="bg-white/10 rounded-2xl shadow p-4 flex gap-4 items-center backdrop-blur border border-white/20">
              <div className="w-28"><KeychainPreview shape={i.shape} chain={i.chain} image={i.image} /></div>
              <div className="flex-1">
                <div className="font-bold">Custom TAPik keychain</div>
                <div className="text-sm text-blue-100">{i.shape} - {i.chain} - NFC keychain</div>
                <div className="mt-2 flex items-center gap-3">
                  <button onClick={() => updateQty(i.id, -1)} className="p-1">
                    <img src={minusButton} alt="Decrease" className="w-7 h-7 object-contain" />
                  </button>
                  <span className="font-bold text-lg">{i.qty}</span>
                  <button onClick={() => updateQty(i.id, 1)} className="p-1">
                    <img src={addButton} alt="Increase" className="w-7 h-7 object-contain" />
                  </button>
                  <button onClick={() => remove(i.id)} className="ml-auto text-red-300 text-sm hover:underline">Remove</button>
                </div>
              </div>
              <div className="font-bold text-lg">PHP {i.price * i.qty}</div>
            </div>
          ))}
        </div>
        <div className="bg-white/10 rounded-2xl shadow p-6 h-fit backdrop-blur border border-white/20">
          <h3 className="font-bold text-lg mb-3">Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>PHP {subtotal}</span></div>
            <div className="flex justify-between"><span>Simulated J&T shipping ({(weight/1000).toFixed(2)} kg)</span><span>PHP {shipping}</span></div>
            <div className="flex justify-between font-bold text-lg pt-2 border-t border-white/20"><span>Total</span><span>PHP {total}</span></div>
          </div>
          <button onClick={() => setPage('checkout')} className="mt-4 w-full bg-yellow-400 text-blue-900 font-bold py-3 rounded-full">
            Proceed to checkout
          </button>
        </div>
      </div>
    </div>
  )
}
