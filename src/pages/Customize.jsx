import React, { useRef, useState } from 'react'
import KeychainPreview from '../components/KeychainPreview'
import DesignAdjust from '../components/DesignAdjust'
import { ACRYLIC_SHAPES } from '../components/keychainParts'
import { DEFAULT_CROP, bakeCrop, clampCrop, loadImage } from '../lib/designCrop'
import {
  SHAPES,
  CHAINS,
  NFC_PRICE,
  PACKAGING_PRICE,
  ASSEMBLY_PRICE,
  PRINT_PRICE,
  computePrice,
} from '../lib/pricing'
import { newId } from '../lib/storage'
import { itemKey, useInventory } from '../lib/inventory'

import uploadDesign from '../assets/uploadDesign.png'
import nfcLink from '../assets/nfcLink.png'
import addButton from '../assets/addbutton.png'
import minusButton from '../assets/minusbutton.png'

export default function Customize({ onAddToCart }) {
  const [image, setImage] = useState(null)
  const [imageAspect, setImageAspect] = useState(null)
  const [crop, setCrop] = useState(DEFAULT_CROP)
  const [adding, setAdding] = useState(false)
  const [shapeChoice, setShape] = useState('round')
  const [chainChoice, setChain] = useState('gold')
  const [nfcLinkValue, setNfcLinkValue] = useState('')
  const [qtyChoice, setQty] = useState(1)

  const [showNfcPopup, setShowNfcPopup] = useState(false)
  const [nfcDraft, setNfcDraft] = useState('')
  const [nfcError, setNfcError] = useState('')

  const fileInputRef = useRef(null)
  const [imageError, setImageError] = useState('')

  // Shapes and chains with no stock left cannot be chosen. Without an order database everything is available.
  const { inventory } = useInventory()
  const stockOf = (type, id) => inventory?.[itemKey(type, id)]?.stock ?? Infinity
  const availableShapes = SHAPES.filter((s) => stockOf('shape', s.id) > 0)
  const availableChains = CHAINS.filter((c) => stockOf('chain', c.id) > 0)
  const shape = availableShapes.find((s) => s.id === shapeChoice)?.id ?? availableShapes[0]?.id ?? shapeChoice
  const chain = availableChains.find((c) => c.id === chainChoice)?.id ?? availableChains[0]?.id ?? chainChoice
  const soldOut = availableShapes.length === 0 || availableChains.length === 0
  const maxQty = Math.max(1, Math.min(stockOf('shape', shape), stockOf('chain', chain)))
  const qty = Math.min(qtyChoice, maxQty)

  const price = computePrice({ shape, chain })

  // The design window is as wide as it is tall divided by the shape's ratio (the tall shapes are narrower).
  const windowAspect = 1 / (ACRYLIC_SHAPES[shape] || ACRYLIC_SHAPES.round).ratio
  const changeZoom = (zoom) => setCrop((current) => clampCrop({ ...current, zoom }, windowAspect, imageAspect || 1))

  const selectedShape =
    SHAPES.find((s) => s.id === shape) || SHAPES[0]

  const selectedChain = CHAINS.find((c) => c.id === chain)

  const cycleShape = (dir) => {
    if (!availableShapes.length) return
    const idx = availableShapes.findIndex((s) => s.id === shape)
    const next = (idx + dir + availableShapes.length) % availableShapes.length
    setShape(availableShapes[next].id)
  }

  const cycleChain = (dir) => {
    if (!availableChains.length) return
    const idx = availableChains.findIndex((c) => c.id === chain)
    const next = (idx + dir + availableChains.length) % availableChains.length
    setChain(availableChains[next].id)
  }

  const handleOpenFilePicker = () => {
    setImageError('')
    fileInputRef.current?.click()
  }

  const handleImageUpload = (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    event.target.value = ''

    if (!file.type.startsWith('image/')) {
      setImageError('Please select a valid image file.')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setImageError('Your image must be smaller than 10 MB.')
      return
    }

    const reader = new FileReader()

    reader.onload = () => {
      // Read the picture's shape first: zooming and moving it depends on its width and height.
      loadImage(reader.result)
        .then((loaded) => {
          setImage(reader.result)
          setImageAspect(loaded.naturalWidth / loaded.naturalHeight)
          setCrop(DEFAULT_CROP)
          setImageError('')
        })
        .catch(() => setImageError('The image could not be opened. Please try another file.'))
    }

    reader.onerror = () => {
      setImageError(
        'The image could not be opened. Please try another file.'
      )
    }

    reader.readAsDataURL(file)
  }

  const handleRemoveImage = () => {
    setImage(null)
    setImageAspect(null)
    setCrop(DEFAULT_CROP)
    setImageError('')
  }

  const handleOpenNfcPopup = () => {
    setNfcDraft(nfcLinkValue)
    setNfcError('')
    setShowNfcPopup(true)
  }

  const handleCloseNfcPopup = () => {
    setShowNfcPopup(false)
    setNfcError('')
  }

  const handleSaveNfcLink = () => {
    const link = nfcDraft.trim()

    if (!link) {
      setNfcError('Please enter the link for your NFC keychain.')
      return
    }

    try {
      const parsedUrl = new URL(link)

      if (
        !['http:', 'https:'].includes(parsedUrl.protocol) ||
        !parsedUrl.hostname
      ) {
        setNfcError(
          'Please enter a valid link starting with https:// or http://.'
        )
        return
      }

      setNfcLinkValue(link)
      setNfcError('')
      setShowNfcPopup(false)
    } catch {
      setNfcError('Please enter a valid website or profile link.')
    }
  }

  const handleRemoveNfcLink = () => {
    setNfcLinkValue('')
    setNfcDraft('')
    setNfcError('')
    setShowNfcPopup(false)
  }

  const missingRequirements = [
    !image && 'upload your design',
    !nfcLinkValue && 'add your NFC link',
  ].filter(Boolean)

  const canAdd = missingRequirements.length === 0 && !soldOut

  const handleAdd = async () => {
    if (!canAdd || adding) return
    setAdding(true)

    try {
      // Save only what shows inside the acrylic, so the cart, the order and the admin all see the cut design.
      const visibleDesign = await bakeCrop(image, crop, windowAspect)
      onAddToCart({
        id: newId('item'),
        shape,
        chain,
        nfc: true,
        nfcLink: nfcLinkValue,
        image: visibleDesign,
        price,
        qty,
        weightGrams: 50,
      })
    } catch {
      setImageError('Your design could not be prepared. Please upload it again.')
    } finally {
      setAdding(false)
    }
  }

  const actionTextClass =
    'text-sm text-white underline transition-colors hover:text-yellow-400'

  const buttonImageClass =
    'block h-auto w-32 max-w-full cursor-pointer object-contain transition duration-200 hover:scale-105 sm:w-40'

  return (
    <div className="min-h-screen text-white">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <h2 className="mb-6 text-3xl font-black text-yellow-400">
          Customize your TAPik keychain
        </h2>

        <div className="grid gap-10 md:grid-cols-2">
          {/* LEFT: PREVIEW (WITH ARROWS), UPLOAD AND NFC */}
          <div className="tapik-customize-preview">
            {/* KEYCHAIN PREVIEW: arrows sit beside the clasp and the acrylic */}
            <div className="tapik-keychain-display">
              <KeychainPreview
                shape={shape}
                chain={chain}
                image={image}
                crop={crop}
                imageAspect={imageAspect}
                onCropChange={setCrop}
                onPrevChain={() => cycleChain(-1)}
                onNextChain={() => cycleChain(1)}
                onPrevShape={() => cycleShape(-1)}
                onNextShape={() => cycleShape(1)}
              />

              {/* Screen-reader announcement of the current choices */}
              <span className="sr-only" aria-live="polite">
                {selectedChain?.label}, {selectedShape.label}
              </span>

            </div>

            {image && imageAspect && (
              <DesignAdjust zoom={clampCrop(crop, windowAspect, imageAspect).zoom} onZoom={changeZoom} onReset={() => setCrop(DEFAULT_CROP)} />
            )}

            {/* UPLOAD AND NFC BUTTONS */}
            <div className="grid grid-cols-2 gap-4">
              {/* UPLOAD DESIGN */}
              <div className="flex min-w-0 flex-col items-center text-center">
                <button
                  type="button"
                  onClick={handleOpenFilePicker}
                  className="border-0 bg-transparent p-0 shadow-none outline-none"
                  aria-label={
                    image
                      ? 'Replace uploaded design'
                      : 'Upload design from your computer'
                  }
                >
                  <img
                    src={uploadDesign}
                    alt="Upload your design"
                    className={`${buttonImageClass} ${
                      image ? 'grayscale opacity-60' : ''
                    }`}
                  />
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />

                {imageError && (
                  <p className="mt-2 break-words text-sm text-red-400">
                    {imageError}
                  </p>
                )}

                {image && (
                  <div className="mt-3 flex flex-col items-center gap-2">
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className={actionTextClass}
                    >
                      Remove image
                    </button>
                  </div>
                )}
              </div>

              {/* NFC LINK */}
              <div className="flex min-w-0 flex-col items-center text-center">
                <button
                  type="button"
                  onClick={handleOpenNfcPopup}
                  className="border-0 bg-transparent p-0 shadow-none outline-none"
                  aria-label={
                    nfcLinkValue
                      ? 'Edit saved NFC link'
                      : 'Add NFC link'
                  }
                >
                  <img
                    src={nfcLink}
                    alt="Add NFC Link"
                    className={`${buttonImageClass} ${
                      nfcLinkValue ? 'grayscale opacity-60' : ''
                    }`}
                  />
                </button>

                {nfcLinkValue && (
                <div className="mt-3 flex flex-col items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRemoveNfcLink}
                    className={actionTextClass}
                  >
                    Remove link
                  </button>
                </div>
              )}
              </div>
            </div>
          </div>

          {/* RIGHT: QUANTITY AND PRICE SUMMARY */}
          <div>
            <div className="tapik-customize-summary">
              <div className="tapik-customize-quantity">
                <span className="tapik-customize-label">
                  Quantity
                </span>

                <div className="tapik-customize-quantity-control">
                  <button
                    type="button"
                    onClick={() => setQty(Math.max(1, qty - 1))}
                    disabled={qty <= 1}
                    aria-label="Decrease quantity"
                    className="tapik-customize-qty-button"
                  >
                    <img src={minusButton} alt="" />
                  </button>

                  <span className="tapik-customize-qty-value">
                    {qty}
                  </span>

                  <button
                    type="button"
                    onClick={() => setQty(Math.min(maxQty, qty + 1))}
                    disabled={qty >= maxQty}
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
                  <span>Lobster clasp ({selectedChain?.label})</span>
                  <span>PHP {selectedChain?.price ?? 0}</span>
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
                <span>
                  Total ({qty} {qty === 1 ? 'item' : 'items'})
                </span>

                <strong>PHP {(price * qty).toFixed(2)}</strong>
              </div>

              {soldOut && (
                <p className="tapik-customize-requirements" role="alert">
                  Sorry, this keychain is currently out of stock.
                </p>
              )}

              {!soldOut && Number.isFinite(maxQty) && maxQty <= 10 && (
                <p className="tapik-customize-requirements">
                  Only {maxQty} left in stock for this combination.
                </p>
              )}

              {!canAdd && !soldOut && (
                <p className="tapik-customize-requirements" role="status">
                  To add this to your cart, please{' '}
                  {missingRequirements.join(' and ')}.
                </p>
              )}

              <button
                type="button"
                onClick={handleAdd}
                disabled={!canAdd || adding}
                className="tapik-customize-add-button"
              >
                {adding ? 'Preparing your design…' : 'Add to cart'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* NFC LINK POPUP */}
      {showNfcPopup && (
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              handleCloseNfcPopup()
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="nfc-popup-title"
            className="tapik-customize-summary relative z-[100000] w-full max-w-md"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-start gap-3">
              <img
                src={nfcLink}
                alt=""
                className="h-12 w-12 shrink-0 object-contain"
              />

              <div className="min-w-0 flex-1">
                <h3
                  id="nfc-popup-title"
                  className="text-xl font-bold text-white"
                >
                  {nfcLinkValue ? 'Edit NFC Link' : 'Add NFC Link'}
                </h3>

                <p className="mt-1 text-sm text-blue-100">
                  Enter the website, profile, or other link your NFC
                  keychain should open.
                </p>
              </div>

              <button
                type="button"
                onClick={handleCloseNfcPopup}
                aria-label="Close NFC popup"
                className="text-2xl leading-none text-blue-100 hover:text-white"
              >
                ×
              </button>
            </div>

            <label
              htmlFor="nfc-link-popup-input"
              className="mb-2 block text-sm font-medium text-white"
            >
              Your NFC link
            </label>

            <input
              id="nfc-link-popup-input"
              type="url"
              autoFocus
              value={nfcDraft}
              onChange={(event) => {
                setNfcDraft(event.target.value)
                setNfcError('')
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  handleSaveNfcLink()
                }
              }}
              placeholder="https://your-link.com"
              className="w-full rounded-xl border border-white/20 bg-white/5 p-3 text-sm text-white outline-none placeholder:text-blue-200/60 focus:border-yellow-400"
            />

            {nfcError && (
              <p className="mt-2 text-sm text-red-400">
                {nfcError}
              </p>
            )}

            <p className="mt-3 text-xs leading-relaxed text-blue-200/70">
              Make sure your link is accessible to the people who tap
              your keychain. You can change it before adding the item
              to your cart.
            </p>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={handleCloseNfcPopup}
                className="flex-1 rounded-xl border border-white/20 px-4 py-3 font-semibold text-white transition hover:bg-white/10"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSaveNfcLink}
                className="flex-1 rounded-xl bg-yellow-400 px-4 py-3 font-bold text-black transition hover:bg-yellow-300"
              >
                Save Link
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

