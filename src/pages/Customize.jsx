import React, { useState } from 'react'
import KeychainPreview from '../components/KeychainPreview'
import { SHAPES, CHAINS, NFC_PRICE, PACKAGING_PRICE, ASSEMBLY_PRICE, PRINT_PRICE, computePrice } from '../lib/pricing'
import { newId } from '../lib/storage'
import leftArrow from '../assets/leftArrow.png'
import rightArrow from '../assets/rightArrow.png'
import uploadDesign from '../assets/uploadDesign.png'
import nfcLink from '../assets/nfcLink.png'

export default function Customize({ onAddToCart }) {
  const [image, setImage] = useState(null)
  const [shape, setShape] = useState('rectangle')
  const [chain, setChain] = useState('gold')
  const [nfcLinkValue, setNfcLinkValue] = useState('')
  const [qty, setQty] = useState(1)

  const price = computePrice({ shape, chain })
  const selectedShape = SHAPES.find((s) => s.id === shape) || SHAPES[0]

  const handleUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setImage(ev.target.result)
    reader.readAsDataURL(file)
  }

  const cycleShape = (dir) => {
    const idx = SHAPES.findIndex((s) => s.id === shape)
    const next = (idx + dir + SHAPES.length) % SHAPES.length
    setShape(SHAPES[next].id)
  }

  const handleAdd = () => {
    const item = {
      id: newId('item'),
      shape,
      chain,
      nfc: true,
      nfcLink: nfcLinkValue,
      image,
      price,
      qty,
      weightGrams: 50,
    }
    onAddToCart(item)
  }

  return (
    <div className="min-h-screen text-white">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <h2 className="text-3xl font-black mb-6 text-yellow-400">Customize your TAPik keychain</h2>
        <div className="grid md:grid-cols-2 gap-10">
          <div className="flex items-center justify-center gap-4">
            <button onClick={() => cycleShape(-1)} className="p-2 rounded-full bg-white/10 hover:bg-white/20">
              <img src={leftArrow} alt="Previous shape" className="w-12 h-12 object-contain" />
            </button>
            <div className="bg-white/10 rounded-3xl p-6 flex flex-col items-center backdrop-blur border border-white/20">
              <KeychainPreview shape={shape} chain={chain} image={image} />
              <p className="mt-3 text-sm text-blue-100 text-center">
                {image ? 'Your design appears inside the acrylic keychain.' : 'Upload an image to preview.'}
              </p>
              <div className="mt-2 text-yellow-400 font-bold">{selectedShape.label}</div>
            </div>
            <button onClick={() => cycleShape(1)} className="p-2 rounded-full bg-white/10 hover:bg-white/20">
              <img src={rightArrow} alt="Next shape" className="w-12 h-12 object-contain" />
            </button>
          </div>

          <div className="space-y-5">
            <div className="bg-white/10 rounded-2xl p-5 backdrop-blur border border-white/20">
              <div className="flex items-center gap-3 mb-3">
                <img src={uploadDesign} alt="Upload design" className="w-12 h-12 object-contain" />
                <div>
                  <h3 className="font-bold text-lg">Design</h3>
                  <p className="text-sm text-blue-100">Upload artwork or photo (double-sided print included)</p>
                </div>
              </div>
              <input type="file" accept="image/*" onChange={handleUpload} className="block w-full text-sm text-white" />
              {image && (
                <button onClick={() => setImage(null)} className="mt-2 text-sm text-red-300 hover:underline">Remove image</button>
              )}
            </div>

            <div className="bg-white/10 rounded-2xl p-5 backdrop-blur border border-white/20">
              <h3 className="font-bold text-lg mb-3">Acrylic shape</h3>
              <div className="grid grid-cols-2 gap-2">
                {SHAPES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setShape(s.id)}
                    className={`border rounded-xl p-2 text-sm font-medium ${shape === s.id ? 'border-yellow-400 bg-yellow-400/10' : 'border-white/20'}`}
                  >
                    {s.label} <span className="text-blue-200">PHP {s.price}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white/10 rounded-2xl p-5 backdrop-blur border border-white/20">
              <h3 className="font-bold text-lg mb-3">Chain / clasp</h3>
              <div className="grid grid-cols-1 gap-2">
                {CHAINS.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setChain(c.id)}
                    className={`border rounded-xl p-2 text-sm font-medium ${chain === c.id ? 'border-yellow-400 bg-yellow-400/10' : 'border-white/20'}`}
                  >
                    {c.label} <span className="text-blue-200">PHP {c.price}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white/10 rounded-2xl p-5 backdrop-blur border border-white/20">
              <div className="flex items-center gap-3 mb-3">
                <img src={nfcLink} alt="NFC link" className="w-12 h-12 object-contain" />
                <div>
                  <h3 className="font-bold text-lg">NFC (embedded)</h3>
                  <p className="text-sm text-blue-100">NFC sticker is included. Enter your tap link (PHP {NFC_PRICE}).</p>
                </div>
              </div>
              <input
                type="url"
                placeholder="https://your link, profile, or URL"
                value={nfcLinkValue}
                onChange={(e) => setNfcLinkValue(e.target.value)}
                className="w-full border border-white/20 bg-white/5 rounded-xl p-2 text-sm text-white placeholder-blue-200"
              />
            </div>

            <div className="bg-white/10 rounded-2xl p-5 backdrop-blur border border-white/20">
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold">Quantity</span>
                <input
                  type="number"
                  min={1}
                  value={qty}
                  onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
                  className="border border-white/20 bg-white/5 rounded-xl p-2 w-20 text-center text-white"
                />
              </div>
              <div className="space-y-1 text-sm text-blue-100">
                <div className="flex justify-between"><span>Acrylic ({shape})</span><span>PHP {selectedShape.price}</span></div>
                <div className="flex justify-between"><span>Chain / clasp</span><span>PHP {CHAINS.find(c=>c.id===chain).price}</span></div>
                <div className="flex justify-between"><span>NFC sticker (embedded)</span><span>PHP {NFC_PRICE}</span></div>
                <div className="flex justify-between"><span>Double-sided print (included)</span><span>PHP {PRINT_PRICE}</span></div>
                <div className="flex justify-between"><span>Packaging</span><span>PHP {PACKAGING_PRICE}</span></div>
                <div className="flex justify-between"><span>Assembly + NFC setup</span><span>PHP {ASSEMBLY_PRICE}</span></div>
              </div>
              <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/20">
                <span className="font-bold text-lg">Price per unit</span>
                <span className="font-black text-2xl text-yellow-400">PHP {price}</span>
              </div>
              <div className="flex justify-between text-sm text-blue-200">
                <span>Total for {qty}</span>
                <span>PHP {price * qty}</span>
              </div>
              <button
                onClick={handleAdd}
                className="mt-4 w-full bg-yellow-400 text-blue-900 font-bold py-3 rounded-full hover:bg-yellow-300"
              >
                Add to cart
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
