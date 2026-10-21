import { useState } from 'react'
import tagline from '../assets/tapikMotto.png'

const PAGES = [
  { id: 'home', label: 'Home' },
  { id: 'customize', label: 'Customize' },
  { id: 'cart', label: 'Cart' },
  { id: 'orders', label: 'Orders' },
]

export default function Navbar({ page, setPage, cartCount = 0, account, onSignIn, onSignUp, onSignOut }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const showCount = account && cartCount > 0

  const go = (id) => {
    setPage(id)
    setMenuOpen(false)
  }

  return (
    <header className="tapik-navbar">
      <div className="tapik-navbar-inner">
        {/* Clickable logo image */}
        <button
          type="button"
          className="tapik-brand"
          onClick={() => go('home')}
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
          id="main-navigation"
          className={`tapik-navigation ${menuOpen ? 'is-open' : ''}`}
          aria-label="Main navigation"
        >
          {PAGES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => go(item.id)}
              aria-current={
                page === item.id ? 'page' : undefined
              }
              className={`tapik-nav-link ${
                page === item.id ? 'is-active' : ''
              }`}
            >
              {item.label}

              {item.id === 'cart' && showCount && (
                <span className="tapik-cart-count">
                  {cartCount}
                </span>
              )}
            </button>
          ))}
        </nav>
        <div className="tapik-auth-actions">
          {account ? (
            <button type="button" onClick={onSignOut} className="tapik-auth-button">Log out</button>
          ) : (
            <>
              <button type="button" onClick={onSignIn} className="tapik-auth-button">Log in</button>
              <button type="button" onClick={onSignUp} className="tapik-auth-button tapik-auth-button-outline">Sign up</button>
            </>
          )}
        </div>

        {/* Menu button, only shown on tablets and phones */}
        <button
          type="button"
          className="tapik-nav-toggle"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          aria-controls="main-navigation"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            {menuOpen ? <path d="M4 4l12 12M16 4L4 16" /> : <path d="M3 5h14M3 10h14M3 15h14" />}
          </svg>
          {showCount && !menuOpen && <span className="tapik-cart-count">{cartCount}</span>}
        </button>
      </div>
    </header>
  )
}