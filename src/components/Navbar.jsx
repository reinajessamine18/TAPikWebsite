import React from 'react'
import logo from '../assets/tapikLogo.png'

const PAGES = [
  { id: 'home', label: 'Home' },
  { id: 'customize', label: 'Customize' },
  { id: 'cart', label: 'Cart' },
  { id: 'orders', label: 'Orders' },
]

export default function Navbar({ page, setPage, cartCount }) {
  return (
    <header className="sticky top-0 z-40 bg-blue-900/90 backdrop-blur border-b border-yellow-400/30">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <button onClick={() => setPage('home')} className="flex items-center gap-2">
          <img src={logo} alt="TAPik logo" className="h-10 w-auto" />
          <div className="hidden sm:block">
            <div className="text-yellow-400 font-black tracking-widest text-lg leading-none">TAPik</div>
            <div className="text-xs text-blue-200">anik-anik + NFC</div>
          </div>
        </button>
        <nav className="flex items-center gap-1 sm:gap-2">
          {PAGES.map((p) => (
            <button
              key={p.id}
              onClick={() => setPage(p.id)}
              className={`px-3 py-2 rounded-full text-sm font-medium transition ${
                page === p.id
                  ? 'bg-yellow-400 text-blue-900'
                  : 'text-blue-100 hover:bg-blue-800'
              }`}
            >
              {p.label}
              {p.id === 'cart' && cartCount > 0 && (
                <span className="ml-1 inline-block bg-yellow-400 text-blue-900 text-xs font-bold rounded-full px-2">
                  {cartCount}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>
    </header>
  )
}
