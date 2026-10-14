import React from 'react'
import { CLASP_ART } from './keychainParts'

// true = shows a red dot at the anchor so you can tune it
const DEBUG_ANCHOR = false

const ACRYLIC_SHAPES = {
  rectangle: { width: 44, ratio: 1.45, radius: '10px' },
  curved:    { width: 44, ratio: 1.45, radius: '38px 10px 38px 10px' },
  round:     { width: 52, ratio: 1.0,  radius: '50%' },
  square:    { width: 50, ratio: 1.0,  radius: '10px' },
}

const HOLE = 0.075 // hole center, as a fraction of acrylic width below its top

export default function KeychainPreview({
  shape = 'rectangle',
  chain = 'ring',
  image = null,
}) {
  const clasp = CLASP_ART[chain] || CLASP_ART.ring
  const a = ACRYLIC_SHAPES[shape] || ACRYLIC_SHAPES.rectangle
  const aw = (a.width / clasp.width) * 100

  // Front copy shows only a small window on the LEFT of the ring's bottom wire,
  // so the wire crosses in front of the tab on that side only.
  const frontClip = `inset(${clasp.anchorY - 10}% ${100 - clasp.anchorX}% ${
    Math.max(0, 100 - clasp.anchorY - 10)
  }% ${clasp.anchorX - 16}%)`

  const clasp3d = { filter: 'drop-shadow(2px 4px 3px rgba(25,67,83,0.35))' }

  return (
    <div
      className="mx-auto w-full max-w-[360px]"
      style={{ paddingBottom: `${a.width * (a.ratio + 0.16)}%` }}
    >
      <div className="relative mx-auto" style={{ width: `${clasp.width}%` }}>
        {/* CLASP, BACK COPY (behind the acrylic) */}
        <img
          key={`back-${chain}`}
          src={clasp.src}
          alt=""
          draggable={false}
          className="relative z-0 block h-auto w-full"
          style={clasp3d}
        />

        {/* ACRYLIC (middle layer) */}
        <div
          className="absolute z-10 flex flex-col items-center"
          style={{
            left: `${clasp.anchorX}%`,
            top: `${clasp.anchorY}%`,
            width: `${aw}%`,
            transform: 'translateX(-50%)',
            marginTop: `-${HOLE * aw}%`,
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
              }}
            >
              {image ? (
                <img src={image} alt="Your design" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center border-2 border-dashed border-blue-300 p-2 text-center text-xl text-yellow-400">
                  Your design here
                </div>
              )}
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

        {/* CLASP, FRONT COPY (clipped: only the left part of the ring wire) */}
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
  )
}