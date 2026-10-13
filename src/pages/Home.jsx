import React from 'react'
import tapikLogo from '../assets/TAPik-logo.png'

export default function Home({ setPage }) {
  return (
    <div className="text-white">
      {/* HERO SECTION */}
      <section className="mx-auto grid min-h-[65vh] max-w-6xl grid-cols-1 items-center gap-8 px-4 py-14 md:grid-cols-2 md:gap-12 md:py-16">

        {/* LEFT: TEXT CONTENT */}
        <div className="order-2 text-center md:order-1 md:text-left">
          <p className="mb-3 text-sm font-bold tracking-widest text-yellow-400">
            TAPik — FILIPINO ANIK-ANIK + NFC
          </p>

          <h1 className="text-4xl font-black leading-tight md:text-5xl">
            Make your own
            <span className="text-yellow-400"> anik-anik</span>,
            now with a digital tap.
          </h1>

          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-blue-100 md:mx-0 md:text-lg">
            Design your own acrylic keychain, choose your favorite shape
            and clasp, and add an NFC link to connect your keepsake to
            your digital world.
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-3 md:justify-start">
            <button
              type="button"
              onClick={() => setPage('customize')}
              className="rounded-full bg-yellow-400 px-6 py-3 font-bold text-blue-950 transition hover:bg-yellow-300"
            >
              Start customizing
            </button>

            <button
              type="button"
              onClick={() => setPage('cart')}
              className="rounded-full border border-yellow-400 px-6 py-3 font-bold text-yellow-400 transition hover:bg-yellow-400/10"
            >
              View cart
            </button>
          </div>

          {/* PRODUCT HIGHLIGHTS */}
          <div className="mt-8 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl bg-blue-800/50 p-3">
              <div className="text-lg font-black text-yellow-400 sm:text-xl">
                PHP 78
              </div>
              <div className="mt-1 text-xs text-blue-200">
                Standard build
              </div>
            </div>

            <div className="rounded-xl bg-blue-800/50 p-3">
              <div className="text-lg font-black text-yellow-400 sm:text-xl">
                4
              </div>
              <div className="mt-1 text-xs text-blue-200">
                Acrylic shapes
              </div>
            </div>

            <div className="rounded-xl bg-blue-800/50 p-3">
              <div className="text-lg font-black text-yellow-400 sm:text-xl">
                NFC
              </div>
              <div className="mt-1 text-xs text-blue-200">
                Tap-to-open link
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: LOGO SIZED TO BALANCE THE TEXT */}
        <div className="order-1 flex items-center justify-center md:order-2">
          <img
            src={tapikLogo}
            alt="TAPik logo"
            className="h-auto w-[65%] max-w-[240px] object-contain sm:max-w-[280px] md:w-full md:max-w-[340px]"
          />
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section className="bg-white/10 backdrop-blur">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-14 md:grid-cols-3">
          {[
            {
              title: 'Make it yours',
              text: 'Upload your own artwork and preview your design on the Customize page.',
            },
            {
              title: 'Personalized NFC',
              text: 'Connect your keychain to a website, social profile, or another supported link.',
            },
            {
              title: 'Simple pricing',
              text: 'Choose your shape and clasp, adjust the quantity, and review your total before checkout.',
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl border border-white/20 bg-white/5 p-6"
            >
              <h2 className="mb-2 text-xl font-bold text-yellow-400">
                {feature.title}
              </h2>

              <p className="leading-relaxed text-blue-100">
                {feature.text}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}