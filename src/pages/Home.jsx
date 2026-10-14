import React, { useEffect, useRef, useState } from 'react'
import tapikLogo from '../assets/TAPik-logo.png'

function Reveal({ children, delay = 0, className = '' }) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.15 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={`tapik-reveal ${visible ? 'is-visible' : ''} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}

export default function Home({ setPage }) {
  return (
    <div className="text-white">
      {/* HERO SECTION */}
      <section className="mx-auto grid min-h-[65vh] max-w-6xl grid-cols-1 items-center gap-8 px-4 py-14 md:grid-cols-2 md:gap-12 md:py-16">

        {/* LEFT: TEXT CONTENT */}
        <div className="order-2 text-center md:order-1 md:text-left">
          <h1 className="text-4xl font-black leading-tight md:text-5xl">
            Make your own
            <span className="text-yellow-400"> anik-anik</span>,
            now with a digital tap.
          </h1>

          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-white md:mx-0 md:text-lg">
          TAPik is a smart accessory brand that merges personalized acrylic
          design with embedded Near Field Communication (NFC) technology.
          Rooted in the Filipino concept of anik-anik—decorative charms and
          upgrades everyday accessories into interactive profile-sharing tools.
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-3 md:justify-start">
            <button
              type="button"
              onClick={() => setPage('customize')}
              className="rounded-full bg-yellow-400 px-6 py-3 font-bold text-white transition hover:bg-yellow-300"
            >
              Start customizing
            </button>

            <button
            type="button"
            onClick={() => setPage('cart')}
            className="rounded-full border border-white px-6 py-3 font-bold text-white transition hover:bg-white/10"
          >
            View cart
          </button>
          </div>

          {/* PRODUCT HIGHLIGHTS */}
        <div className="mt-8 grid grid-cols-3 gap-3">
          <div className="tapik-stat-card">
            <div className="tapik-stat-value">PHP 78</div>
            <div className="tapik-stat-label">Standard build</div>
          </div>

          <div className="tapik-stat-card">
            <div className="tapik-stat-value">4</div>
            <div className="tapik-stat-label">Acrylic shapes</div>
          </div>

          <div className="tapik-stat-card">
            <div className="tapik-stat-value">NFC</div>
            <div className="tapik-stat-label">Tap-to-open link</div>
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

      {/* THREE STEPS */}
<section className="py-6">
  {['Customized your Design', 'Program your Link', 'Tap & Connect'].map(
    (label, i) => (
      <Reveal key={label} delay={i * 120} className="mb-4">
        <div className="tapik-pill-bar tapik-hover-card">{label}</div>
      </Reveal>
    )
  )}
</section>

{/* WHAT SETS TAPIK APART */}
<section className="mx-auto max-w-6xl px-4 py-14">
  <Reveal>
    <h2 className="tapik-section-title mb-8 text-center">
      What sets <span className="text-[#ffc15b]">TAPik</span> apart?
    </h2>
  </Reveal>

  <div className="grid gap-5 md:grid-cols-3">
    {[
      'We bridge beloved Filipino charm culture (anik-anik) with modern contactless tech',
      'Our NFC chip is completely hidden beneath protective acrylic, keeping the artwork front and center.',
      'Real-time web customization lets customers design, preview, and program their links before ordering.',
    ].map((text, i) => (
      <Reveal key={text} delay={i * 140}>
        <div className="tapik-bubble tapik-hover-card">{text}</div>
      </Reveal>
    ))}
  </div>
</section>

{/* KEY FEATURES + LINK VIA */}
<section className="mx-auto grid max-w-6xl gap-8 px-4 pb-16 md:grid-cols-[1.4fr_1fr] md:items-start">
  <Reveal>
    <h2 className="tapik-section-title mb-4">Key Features:</h2>
    <div className="tapik-feature-box tapik-hover-card">
      <ul>
        <li>High-Gloss Acrylic Container</li>
        <li>Embedded NFC Chip</li>
        <li>Custom Printed Artwork</li>
        <li>Versatile Hardware</li>
      </ul>
    </div>
  </Reveal>

  <Reveal delay={160}>
    <h3 className="tapik-section-title mb-4 text-[28px]">
      You can Link it via:
    </h3>
    <div className="flex flex-wrap gap-2">
      {[
        'Social Media Profiles',
        'Digital Contact Cards',
        'Portfolios',
        'LinkedIn Profiles',
        'Custom Web Links',
        'GCash',
        'Spotify Playlists',
      ].map((item) => (
        <span key={item} className="tapik-link-chip tapik-hover-card">
          {item}
        </span>
      ))}
    </div>
  </Reveal>
</section>

{/* CONNECT WITH US */}
<section className="tapik-contact-strip">
  <Reveal>
    <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6 px-4 py-8">
      <h2 className="tapik-section-title">Connect with Us</h2>

      <div className="tapik-contact-list">
        <span>www.tapikco.com</span>
        <span>tapikcorp@gmail.com</span>
        <span>@tapik.official</span>
        <span>TAPik Company</span>
      </div>
    </div>
  </Reveal>
</section>
    </div>
  )
}