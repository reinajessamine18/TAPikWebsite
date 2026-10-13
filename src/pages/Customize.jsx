import React, { useState } from 'react'
import KeychainPreview from '../components/KeychainPreview'
import { SHAPES, CHAINS, PRINTS, NFC_PRICE, PACKAGING_PRICE, ASSEMBLY_PRICE, computePrice } from '../lib/pricing'
import { newId } from '../lib/storage'

export default function Customize({ onAddToCart }) {
  const [image, setImage] = useState(null)
  const [shape, setShape] = useState('round')
  const [chain, setChain] = useState('gold')
  const [print, setPrint] = useState('single')
  const [nfc, setNfc] = useState(true)
  const [nfcLink, setNfcLink] = useState('')
  const [qty, setQty] = useState(1)

  const price = computePrice({ shape, chain, print, nfc })

  const handleUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setImage(ev.target.result)
    reader.readAsDataURL(file)
  }

  const handleAdd = () => {
    const item = {
      id: newId('item'),
      shape,
      chain,
      print,
      nfc,
      nfcLink,
      image,
      price,
      qty,
      weightGrams: 50,
    }
    onAddToCart(item)
  }

  return (
    <div className="min-h-screen bg-blue-50 text-blue-900">
      <div className="max-w-6xl mx-auto px-4 py-10 grid md:grid-cols-2 gap-10">
        <div className="flex flex-col items-center">
          <div className="bg-white rounded-3xl shadow-lg p-6 w-full flex flex-col items-center">
            <h2 className="text-xl font-bold mb-4">Live preview</h2>
            <KeychainPreview shape={shape} chain={chain} image={image} nfc={nfc} />
            <p className="mt-4 text-sm text-blue-600 text-center">
              {image ? 'Your uploaded design appears inside the acrylic shape.' : 'Upload an image to preview your anik-anik.'}
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-3xl shadow p-6">
            <h2 className="text-2xl font-bold mb-1">Customize your TAPik</h2>
            <p className="text-blue-600 mb-4">Build your acrylic NFC keychain component by component.</p>

            <div className="mb-5">
              <label className="block font-semibold mb-2">Design (upload image)</label>
              <div className="flex items-center gap-3">
                <input type="file" accept="image/*" onChange={handleUpload} className="block w-full text-sm" />
                {image && (
                  <button onClick={() => setImage(null)} className="text-sm text-red-500 hover:underline">Remove</button>
                )}
              </div>
            </div>

            <div className="mb-5">
              <label className="block font-semibold mb-2">Acrylic shape</label>
              <div className="grid grid-cols-2 gap-2">
                {SHAPES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setShape(s.id)}
                    className={`border rounded-xl p-2 text-sm font-medium ${shape === s.id ? 'border-blue-700 bg-blue-100' : 'border-blue-200'}`}
                  >
                    {s.label} <span className="text-blue-500">PHP {s.price}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-5">
              <label className="block font-semibold mb-2">Chain / clasp</label>
              <div className="space-y-2">
                {CHAINS.map((c) => (
                  <label key={c.id} className="flex items-center justify-between border border-blue-200 rounded-xl p-2 cursor-pointer">
                    <span>
                      <input type="radio" name="chain" checked={chain === c.id} onChange={() => setChain(c.id)} className="mr-2" />
                      {c.label}
                    </span>
                    <span className="text-blue-600">PHP {c.price}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="mb-5">
              <label className="block font-semibold mb-2">Printing</label>
              <div className="grid grid-cols-2 gap-2">
                {PRINTS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPrint(p.id)}
                    className={`border rounded-xl p-2 text-sm font-medium ${print === p.id ? 'border-blue-700 bg-blue-100' : 'border-blue-200'}`}
                  >
                    {p.label} <span className="text-blue-500">PHP {p.price}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-5">
              <label className="flex items-center gap-2 font-semibold">
                <input type="checkbox" checked={nfc} onChange={(e) => setNfc(e.target.checked)} />
                Add NFC sticker (PHP {NFC_PRICE})
              </label>
              {nfc && (
                <input
                  type="url"
                  placeholder="https://your link, profile, or URL"
                  value={nfcLink}
                  onChange={(e) => setNfcLink(e.target.value)}
                  className="mt-2 w-full border border-blue-200 rounded-xl p-2 text-sm"
                />
              )}
            </div>

            <div className="mb-5 flex items-center gap-3">
              <label className="font-semibold">Quantity</label>
              <input
                type="number"
                min={1}
                value={qty}
                onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
                className="border border-blue-200 rounded-xl p-2 w-20 text-center"
              />
            </div>

            <div className="border-t border-blue-100 pt-4">
              <div className="space-y-1 text-sm text-blue-700">
                <div className="flex justify-between"><span>Acrylic ({shape})</span><span>PHP {SHAPES.find(s=>s.id===shape).price}</span></div>
                <div className="flex justify-between"><span>Chain / clasp</span><span>PHP {CHAINS.find(c=>c.id===chain).price}</span></div>
                <div className="flex justify-between"><span>Print ({print})</span><span>PHP {PRINTS.find(p=>p.id===print).price}</span></div>
                {nfc && <div className="flex justify-between"><span>NFC sticker</span><span>PHP {NFC_PRICE}</span></div>}
                <div className="flex justify-between"><span>Packaging</span><span>PHP {PACKAGING_PRICE}</span></div>
                <div className="flex justify-between"><span>Assembly + NFC setup</span><span>PHP {ASSEMBLY_PRICE}</span></div>
              </div>
              <div className="flex justify-between items-center mt-3 pt-3 border-t border-blue-200">
                <span className="font-bold text-lg">Price per unit</span>
                <span className="font-black text-2xl text-blue-900">PHP {price}</span>
              </div>
              <div className="flex justify-between text-sm text-blue-600">
                <span>Total for {qty}</span>
                <span>PHP {price * qty}</span>
              </div>
            </div>

            <button
              onClick={handleAdd}
              className="mt-5 w-full bg-blue-800 text-yellow-400 font-bold py-3 rounded-full hover:bg-blue-900"
            >
              Add to cart
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
