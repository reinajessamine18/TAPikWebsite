import React from 'react'
import tagline from '../assets/tapikMotto.png'

const PAGES = [
  { id: 'home', label: 'Home' },
  { id: 'customize', label: 'Customize' },
  { id: 'cart', label: 'Cart' },
  { id: 'orders', label: 'Orders' },
]

export default function Navbar({ page, setPage, cartCount = 0 }) {
  return (
    <header className="tapik-navbar">
      <div className="tapik-navbar-inner">
        {/* Clickable logo image */}
        <button
          type="button"
          className="tapik-brand"
          onClick={() => setPage('home')}
          aria-label="Go to homepage"
        >
          <img
            src={tagline}
            alt="TAPik Home"
            className="tapik-brand-logo"
          />
        </button>

        {/* Main navigation */}
        <nav
          className="tapik-navigation"
          aria-label="Main navigation"
        >
          {PAGES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setPage(item.id)}
              aria-current={
                page === item.id ? 'page' : undefined
              }
              className={`tapik-nav-link ${
                page === item.id ? 'is-active' : ''
              }`}
            >
              {item.label}

              {item.id === 'cart' && cartCount > 0 && (
                <span className="tapik-cart-count">
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