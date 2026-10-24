import React, { useRef } from 'react'
import { ACRYLIC_SHAPES, CLASP_ART } from './keychainParts'
import { clampCrop, imageStyle } from '../lib/designCrop'
import leftArrow from '../assets/leftArrow.png'
import rightArrow from '../assets/rightArrow.png'
import ntag from '../assets/ntag.png'

const DEBUG_ANCHOR = false

// Fixed vertical positions of the two arrow pairs, as % of the stage height.
const CLASP_ARROWS_TOP = '20%'
const ACRYLIC_ARROWS_TOP = '52%'

// STAGE SIZE: the stage is an invisible box, so the arrows never move.
// Lower STAGE_H to remove empty space under the keychain.
// If the bottom of the acrylic gets cut off or touches the buttons, raise it.
const STAGE_W = 520
const STAGE_H = 440
// The keychain itself stays 360px wide inside the wider stage
const KEYCHAIN_W_PERCENT = (360 / STAGE_W) * 100

const HOLE = 0.075

// Arrow pinned to the left or right edge of the stage
function StageArrow({ side, top, label, onClick }) {
  const isLeft = side === 'left'
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="tapik-preview-arrow absolute z-30"
      style={{
        top,
        transform: 'translateY(-50%)',
        ...(isLeft ? { left: 0 } : { right: 0 }),
      }}
    >
      <img src={isLeft ? leftArrow : rightArrow} alt="" />
    </button>
  )
}

export default function KeychainPreview({
  shape = 'round',
  chain = 'gold',
  image = null,
  crop = null, // { zoom, cx, cy }: how the design is zoomed and moved. Without it the design just fills the window.
  imageAspect = null, // the design's width / height, needed with crop
  onCropChange, // when given, the design can be dragged (and moved with the arrow keys) inside the acrylic
  onPrevChain,
  onNextChain,
  onPrevShape,
  onNextShape,
}) {
  const clasp = CLASP_ART[chain] || CLASP_ART.gold
  const a = ACRYLIC_SHAPES[shape] || ACRYLIC_SHAPES.round
  const aw = (a.width / clasp.width) * 100

  const frontClip = `inset(${clasp.anchorY - 10}% ${100 - clasp.anchorX}% ${Math.max(
    0,
    100 - clasp.anchorY - 10
  )}% ${clasp.anchorX - 16}%)`

  const clasp3d = { filter: 'drop-shadow(2px 4px 3px rgba(25,67,83,0.35))' }

  // The design window is the white area inside the acrylic. Its width / height follows the acrylic's shape.
  const windowAspect = 1 / a.ratio
  const adjustable = Boolean(image && crop && imageAspect)
  const editable = adjustable && Boolean(onCropChange)
  const current = adjustable ? clampCrop(crop, windowAspect, imageAspect) : null
  const drag = useRef(null)

  const startDrag = (event) => {
    if (!editable) return
    const box = event.currentTarget.getBoundingClientRect()
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { x: event.clientX, y: event.clientY, cx: current.cx, cy: current.cy, w: box.width, h: box.height }
  }
  const moveDrag = (event) => {
    const start = drag.current
    if (!start) return
    onCropChange(clampCrop({
      zoom: current.zoom,
      cx: start.cx + (event.clientX - start.x) / start.w,
      cy: start.cy + (event.clientY - start.y) / start.h,
    }, windowAspect, imageAspect))
  }
  const endDrag = () => { drag.current = null }
  const onKeyDown = (event) => {
    if (!editable) return
    const step = 0.03
    const moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }
    if (moves[event.key]) {
      event.preventDefault()
      onCropChange(clampCrop({ ...current, cx: current.cx + moves[event.key][0], cy: current.cy + moves[event.key][1] }, windowAspect, imageAspect))
    } else if (event.key === '+' || event.key === '=') {
      event.preventDefault()
      onCropChange(clampCrop({ ...current, zoom: current.zoom + 0.1 }, windowAspect, imageAspect))
    } else if (event.key === '-') {
      event.preventDefault()
      onCropChange(clampCrop({ ...current, zoom: current.zoom - 0.1 }, windowAspect, imageAspect))
    }
  }

  return (
    /* STAGE: invisible, fixed-size box. Nothing inside it can move the arrows. */
    <div
      className="relative mx-auto w-full"
      style={{ maxWidth: STAGE_W, aspectRatio: `${STAGE_W} / ${STAGE_H}` }}
    >
      {/* ARROWS: pinned to the stage edges */}
      {onPrevChain && (
        <StageArrow
          side="left"
          top={CLASP_ARROWS_TOP}
          label="Previous clasp"
          onClick={onPrevChain}
        />
      )}
      {onNextChain && (
        <StageArrow
          side="right"
          top={CLASP_ARROWS_TOP}
          label="Next clasp"
          onClick={onNextChain}
        />
      )}
      {onPrevShape && (
        <StageArrow
          side="left"
          top={ACRYLIC_ARROWS_TOP}
          label="Previous acrylic shape"
          onClick={onPrevShape}
        />
      )}
      {onNextShape && (
        <StageArrow
          side="right"
          top={ACRYLIC_ARROWS_TOP}
          label="Next acrylic shape"
          onClick={onNextShape}
        />
      )}

      {/* KEYCHAIN: pinned to the top-center of the stage */}
      <div
        className="absolute top-0"
        style={{
          left: '50%',
          width: `${KEYCHAIN_W_PERCENT}%`,
          transform: 'translateX(-50%)',
        }}
      >
        <div className="relative mx-auto" style={{ width: `${clasp.width}%` }}>
          {/* CLASP, BACK COPY */}
          <img
            key={`back-${chain}`}
            src={clasp.src}
            alt=""
            draggable={false}
            className="relative z-0 block h-auto w-full"
            style={clasp3d}
          />

          {/* ACRYLIC */}
          <div
            className="absolute z-10"
            style={{
              left: `${clasp.anchorX}%`,
              top: `${clasp.anchorY}%`,
              width: `${aw}%`,
              transform: 'translateX(-50%)',
              marginTop: `-${HOLE * aw}%`,
            }}
          >
            <div
              className="flex flex-col items-center"
              style={{
                filter: 'drop-shadow(6px 10px 10px rgba(25, 67, 83, 0.35))',
              }}
            >
              {/* Tab with hole */}
            <div
              className="relative"
              style={{
                width: '22%',
                aspectRatio: '1 / 0.85',
                marginBottom: '-3px',
                borderRadius: '10px 10px 0 0',
                background: 'rgba(255,255,255,0.55)',
                border: '3px solid rgba(255,255,255,0.85)',
                borderBottom: 'none',
              }}
            >
              <span
                className="absolute left-1/2 block rounded-full"
                style={{
                  top: '48%',
                  width: '38%',
                  aspectRatio: '1',
                  transform: 'translate(-50%, -50%)',
                  background: 'rgba(25, 67, 83, 0.35)',
                  boxShadow: 'inset 1px 2px 3px rgba(0,0,0,0.35)',
                }}
              />
            </div>

            {/* Acrylic body */}
            <div
              className="relative w-full overflow-hidden"
              style={{
                paddingBottom: `${a.ratio * 100}%`,
                borderRadius: a.radius,
                background:
                  'linear-gradient(135deg, rgba(255,255,255,0.55), rgba(220,245,250,0.25) 50%, rgba(255,255,255,0.5))',
                border: '4px solid rgba(255,255,255,0.8)',
                boxShadow:
                  'inset 3px 3px 4px rgba(255,255,255,0.9), inset -4px -4px 0 rgba(150,206,210,0.3)',
              }}
            >
              <div
              className="absolute overflow-hidden bg-white"
              style={{
                inset: '9%',
                borderRadius: shape === 'round' ? '50%' : '8px',
                ...(editable ? { cursor: 'grab', touchAction: 'none' } : {}),
              }}
              {...(editable ? {
                tabIndex: 0,
                role: 'group',
                'aria-label': 'Your design. Drag, or use the arrow keys, to move it. Plus and minus zoom.',
                onPointerDown: startDrag,
                onPointerMove: moveDrag,
                onPointerUp: endDrag,
                onPointerCancel: endDrag,
                onKeyDown,
              } : {})}
            >
              {/* NFC sticker: the middle layer, between the acrylic and the design */}
              <img
                src={ntag}
                alt=""
                draggable={false}
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 object-contain"
                style={{
                  width: '200%',
                  maxWidth: 'none',
                  filter: 'drop-shadow(0 2px 4px rgba(25,67,83,0.24))',
                  opacity: 1,
                }}
              />

              {/* Customer design: the top layer, covers the sticker once uploaded */}
              {image && (adjustable ? (
                <img
                  src={image}
                  alt="Your design"
                  draggable={false}
                  style={imageStyle(current, windowAspect, imageAspect)}
                />
              ) : (
                <img
                  src={image}
                  alt="Your design"
                  className="absolute inset-0 h-full w-full bg-white object-cover"
                />
              ))}
            </div>

              <div
                className="pointer-events-none absolute"
                style={{
                  top: '-20%',
                  left: '-30%',
                  width: '45%',
                  height: '140%',
                  transform: 'rotate(16deg)',
                  background:
                    'linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent)',
                }}
              />
              </div>
            </div>
          </div>

          {/* CLASP, FRONT COPY */}
          <img
            key={`front-${chain}`}
            src={clasp.src}
            alt=""
            draggable={false}
            className="absolute inset-0 z-20 block h-auto w-full"
            style={{ ...clasp3d, clipPath: frontClip }}
          />

          {DEBUG_ANCHOR && (
            <span
              className="absolute z-30 h-2 w-2 rounded-full bg-red-500"
              style={{
                left: `${clasp.anchorX}%`,
                top: `${clasp.anchorY}%`,
                transform: 'translate(-50%, -50%)',
              }}
            />
          )}
        </div>
      </div>
    </div>
  )
}
