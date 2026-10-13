import React from 'react'
import logo from '../assets/TAPik-logo.png'

// Real-life keychain look: uses the uploaded TAPik logo/keychain image as base,
// then overlays the customer's design on the acrylic insert area.
export default function KeychainPreview({ shape = 'rectangle', chain = 'gold', image = null }) {
  const claspColor = chain === 'silver' ? '#b8c0cc' : '#d4a017'
  return (
    <div className="relative w-full max-w-[320px] mx-auto">
      <img src={logo} alt="TAPik keychain preview" className="w-full h-auto drop-shadow-2xl" />
      {image && (
        <img
          src={image}
          alt="Customer design"
          className="absolute left-[34%] top-[29%] w-[32%] h-[34%] object-cover rounded-xl shadow-lg border border-white/40"
          style={{ mixBlendMode: 'multiply' }}
        />
      )}
      {!image && (
        <div
          className="absolute left-[34%] top-[29%] w-[32%] h-[34%] rounded-xl bg-white/70 border-2 border-dashed border-blue-300 flex items-center justify-center text-blue-700 text-xs text-center p-2"
        >
          Your design here
        </div>
      )}
      {/* Chain tint indicator */}
      <div className="absolute right-[4%] top-[4%] w-10 h-10 rounded-full border-4" style={{ borderColor: claspColor }} />
    </div>
  )
}
