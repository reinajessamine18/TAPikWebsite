import React from 'react'

const SHAPE_PATHS = {
  // clip paths inside a 200x200 square
  round: <circle cx="100" cy="100" r="72" />,
  square: <rect x="28" y="28" width="144" height="144" rx="18" />,
  heart: (
    <path d="M100 170
      C 45 125, 25 90, 55 62
      C 75 46, 95 56, 100 72
      C 105 56, 125 46, 145 62
      C 175 90, 155 125, 100 170 Z" />
  ),
  octagonal: (
    <polygon points="65,28 135,28 172,65 172,135 135,172 65,172 28,135 28,65" />
  ),
}

function chainColor(chain) {
  if (chain === 'gold') return '#d4a017'
  if (chain === 'silver') return '#b8c0cc'
  if (chain === 'beaded') return '#ec4899'
  return '#6b7280'
}

export default function KeychainPreview({ shape = 'round', chain = 'gold', image = null, nfc = true }) {
  const clipId = `clip-${shape}`
  return (
    <svg viewBox="0 0 200 260" className="w-full max-w-[260px] mx-auto drop-shadow-2xl" role="img" aria-label="Keychain preview">
      <defs>
        <clipPath id={clipId}>{SHAPE_PATHS[shape] || SHAPE_PATHS.round}</clipPath>
        <linearGradient id="gloss" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.35" />
          <stop offset="60%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Key ring + attachment */}
      <g transform="translate(100 18)">
        <circle cx="0" cy="0" r="14" fill="none" stroke={chainColor(chain)} strokeWidth="4" />
        {chain === 'beaded' && (
          <>
            <circle cx="-10" cy="10" r="4" fill="#f9a8d4" />
            <circle cx="0" cy="16" r="4" fill="#fbbf24" />
            <circle cx="10" cy="10" r="4" fill="#93c5fd" />
          </>
        )}
        {(chain === 'gold' || chain === 'silver') && (
          <path d="M0 14 L0 34" stroke={chainColor(chain)} strokeWidth="3" />
        )}
        {(chain === 'gold' || chain === 'silver') && (
          <rect x="-6" y="30" width="12" height="16" rx="3" fill={chainColor(chain)} />
        )}
      </g>

      {/* Acrylic body */}
      <g transform="translate(0 40)">
        <rect x="0" y="0" width="200" height="200" rx="22" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="6" />
        <g clipPath={`url(#${clipId})`}>
          {image ? (
            <image href={image} x="0" y="0" width="200" height="200" preserveAspectRatio="xMidYMid slice" />
          ) : (
            <rect x="0" y="0" width="200" height="200" fill="#e2e8f0" />
          )}
          {!image && (
            <text x="100" y="104" textAnchor="middle" fontSize="12" fill="#64748b">Your design here</text>
          )}
        </g>
        <g fill="none" stroke="#94a3b8" strokeWidth="2" opacity="0.6">
          {SHAPE_PATHS[shape]}
        </g>
        <rect x="0" y="0" width="200" height="200" fill="url(#gloss)" clipPath={`url(#${clipId})`} opacity="0.7" />
        {nfc && (
          <g transform="translate(160 160)">
            <circle r="16" fill="#1e3a8a" />
            <path d="M-6 -6 Q 0 -10 6 -6" fill="none" stroke="#facc15" strokeWidth="2" />
            <path d="M-9 -2 Q 0 -8 9 -2" fill="none" stroke="#facc15" strokeWidth="2" />
            <circle r="2" fill="#facc15" />
          </g>
        )}
      </g>

      <ellipse cx="100" cy="250" rx="60" ry="8" fill="#000000" opacity="0.15" />
    </svg>
  )
}
