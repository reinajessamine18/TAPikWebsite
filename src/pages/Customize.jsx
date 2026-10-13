import React, { useState } from 'react'
import KeychainPreview from '../components/KeychainPreview'
import { SHAPES, CHAINS, NFC_PRICE, PACKAGING_PRICE, ASSEMBLY_PRICE, PRINT_PRICE, computePrice } from '../lib/pricing'
import { newId } from '../lib/storage'
import leftArrow from '../assets/leftArrow.png'
import rightArrow from '../assets/rightArrow.png'
import uploadDesign from '../assets/uploadDesign.png'
import nfcLink from '../assets/nfcLink.png'
import addButton from '../assets/addbutton.png'
import minusButton from '../assets/minusbutton.png'

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

  const cycleChain = (dir) => {
    const idx = CHAINS.findIndex((c) => c.id === chain)
    const next = (idx + dir + CHAINS.length) % CHAINS.length
    setChain(CHAINS[next].id)
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
        <div className="tapik-customize-preview">
          {/* TOP: CLASP / CHAIN VARIATIONS */}
          <div className="tapik-variation-controls">
            <span className="tapik-variation-label">
              CLASP / CHAIN
            </span>

            <div className="tapik-variation-arrows">
              <button
                type="button"
                onClick={() => cycleChain(-1)}
                className="tapik-variation-arrow"
                aria-label="Previous clasp"
              >
                <img src={leftArrow} alt="" />
              </button>

              <span className="tapik-variation-current">
                {CHAINS.find((c) => c.id === chain)?.label}
              </span>

              <button
                type="button"
                onClick={() => cycleChain(1)}
                className="tapik-variation-arrow"
                aria-label="Next clasp"
              >
                <img src={rightArrow} alt="" />
              </button>
            </div>
          </div>

          {/* CENTER: KEYCHAIN PREVIEW */}
          <div className="tapik-keychain-display">
            <KeychainPreview
              shape={shape}
              chain={chain}
              image={image}
            />

            <p className="tapik-preview-hint">
              {image
                ? 'Your design appears inside the acrylic keychain.'
                : 'Upload an image to preview your design.'}
            </p>
          </div>

          {/* BOTTOM: ACRYLIC SHAPE VARIATIONS */}
          <div className="tapik-variation-controls">
            <span className="tapik-variation-label">
              ACRYLIC SHAPE
            </span>

            <div className="tapik-variation-arrows">
              <button
                type="button"
                onClick={() => cycleShape(-1)}
                className="tapik-variation-arrow"
                aria-label="Previous acrylic shape"
              >
                <img src={leftArrow} alt="" />
              </button>

              <span className="tapik-variation-current">
                {selectedShape.label}
              </span>

              <button
                type="button"
                onClick={() => cycleShape(1)}
                className="tapik-variation-arrow"
                aria-label="Next acrylic shape"
              >
                <img src={rightArrow} alt="" />
              </button>
            </div>
          </div>
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

<div className="tapik-customize-summary">
  <div className="tapik-customize-quantity">
    <span className="tapik-customize-label">Quantity</span>

    <div className="tapik-customize-quantity-control">
      <button
        type="button"
        onClick={() => setQty((current) => Math.max(1, current - 1))}
        disabled={qty <= 1}
        aria-label="Decrease quantity"
        className="tapik-customize-qty-button"
      >
        <img src={minusButton} alt="" />
      </button>

      <span className="tapik-customize-qty-value">{qty}</span>

      <button
        type="button"
        onClick={() => setQty((current) => current + 1)}
        aria-label="Increase quantity"
        className="tapik-customize-qty-button"
      >
        <img src={addButton} alt="" />
      </button>
    </div>
  </div>

  <div className="tapik-customize-breakdown">
    <div>
      <span>Acrylic ({selectedShape.label})</span>
      <span>PHP {selectedShape.price}</span>
    </div>

    <div>
      <span>Chain / clasp</span>
      <span>PHP {CHAINS.find((c) => c.id === chain)?.price ?? 0}</span>
    </div>

    <div>
      <span>NFC sticker (embedded)</span>
      <span>PHP {NFC_PRICE}</span>
    </div>

    <div>
      <span>Double-sided print</span>
      <span>PHP {PRINT_PRICE}</span>
    </div>

    <div>
      <span>Packaging</span>
      <span>PHP {PACKAGING_PRICE}</span>
    </div>

    <div>
      <span>Assembly + NFC setup</span>
      <span>PHP {ASSEMBLY_PRICE}</span>
    </div>
  </div>

  <div className="tapik-customize-unit-price">
    <span>Price per unit</span>
    <strong>PHP {price.toFixed(2)}</strong>
  </div>

  <div className="tapik-customize-total">
    <span>Total ({qty} {qty === 1 ? 'item' : 'items'})</span>
    <strong>PHP {(price * qty).toFixed(2)}</strong>
  </div>

  <button
    type="button"
    onClick={handleAdd}
    className="tapik-customize-add-button"
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
