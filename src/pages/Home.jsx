import React from 'react'
import KeychainPreview from '../components/KeychainPreview'

export default function Home({ setPage }) {
  return (
    <div className="text-white">
      <section className="max-w-6xl mx-auto px-4 py-16 grid md:grid-cols-2 gap-10 items-center">
        <div>
          <p className="text-yellow-400 font-bold tracking-widest text-sm mb-2">TAPik - Filipino anik-anik + NFC</p>
          <h1 className="text-4xl md:text-5xl font-black leading-tight">
            Make your own <span className="text-yellow-400">anik-anik</span>, now with a digital tap.
          </h1>
          <p className="mt-4 text-blue-100 text-lg">
            Design your acrylic keychain, upload your art, pick a shape and clasp, add an NFC link,
            and see the finished product before you order.
          </p>
          <div className="mt-6 flex gap-3">
            <button onClick={() => setPage('customize')} className="bg-yellow-400 text-blue-900 font-bold px-6 py-3 rounded-full hover:bg-yellow-300">
              Start customizing
            </button>
            <button onClick={() => setPage('cart')} className="border border-yellow-400 text-yellow-400 font-bold px-6 py-3 rounded-full hover:bg-yellow-400/10">
              View cart
            </button>
          </div>
          <div className="mt-8 grid grid-cols-3 gap-4 text-center">
            <div className="bg-blue-800/50 rounded-xl p-3">
              <div className="text-yellow-400 font-black text-2xl">PHP 78</div>
              <div className="text-xs text-blue-200">standard build</div>
            </div>
            <div className="bg-blue-800/50 rounded-xl p-3">
              <div className="text-yellow-400 font-black text-2xl">4</div>
              <div className="text-xs text-blue-200">acrylic shapes</div>
            </div>
            <div className="bg-blue-800/50 rounded-xl p-3">
              <div className="text-yellow-400 font-black text-2xl">NFC</div>
              <div className="text-xs text-blue-200">optional tap link</div>
            </div>
          </div>
        </div>
        <div className="flex justify-center">
          <KeychainPreview shape="round" chain="gold" nfc={true} />
        </div>
      </section>

      <section className="bg-white/10 backdrop-blur text-white">
        <div className="max-w-6xl mx-auto px-4 py-14 grid md:grid-cols-3 gap-6">
          {[
            { title: 'Live preview', text: 'Upload your image and instantly see how it looks on the finished keychain, just like custom shirt printing sites.' },
            { title: 'Component pricing', text: 'Pick only what you need. Price updates automatically as you choose shape, clasp, print, and NFC.' },
            { title: 'Simulated J&T delivery', text: 'Enter your delivery address and see an estimated shipping fee before checkout (demo rates).' },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border border-white/20 p-6 bg-white/5">
              <h3 className="font-bold text-xl mb-2 text-yellow-400">{f.title}</h3>
              <p className="text-blue-100">{f.text}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
