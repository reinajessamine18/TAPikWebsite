
import React, { useState, useEffect } from 'react'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Customize from './pages/Customize'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import Orders from './pages/Orders'
import Admin from './pages/Admin'
import { loadCart, saveCart } from './lib/storage'
import bg from './assets/TAPikbg.png'

export default function App() {
  const [page, setPage] = useState('home')
  const [cart, setCartState] = useState([])

  useEffect(() => {
    setCartState(loadCart())
  }, [])

  useEffect(() => {
    saveCart(cart)
  }, [cart])

  const setCart = (updater) => {
    setCartState((prev) =>
      typeof updater === 'function' ? updater(prev) : updater
    )
  }

  const addToCart = (item) => {
    setCart((prev) => [...prev, item])
    setPage('cart')
  }

  const renderPage = () => {
    switch (page) {
      case 'home':
        return <Home setPage={setPage} />

      case 'customize':
        return <Customize onAddToCart={addToCart} />

      case 'cart':
        return <Cart cart={cart} setCart={setCart} setPage={setPage} />

      case 'checkout':
        return <Checkout cart={cart} setCart={setCart} setPage={setPage} />

      case 'orders':
        return <Orders />

      case 'admin':
        return <Admin />

      default:
        return <Home setPage={setPage} />
    }
  }

  const cartCount = cart.reduce((sum, item) => sum + (Number(item.qty) || 0), 0)

  return (
    <div
      className="tapik-app"
      style={{ backgroundImage: `url(${bg})` }}
    >
      <Navbar
        page={page}
        setPage={setPage}
        cartCount={cartCount}
      />

      <main className="tapik-main">
        {renderPage()}
      </main>

      <footer className="tapik-footer">
        © {new Date().getFullYear()} TAPik Company
        <span>
          Customized anik-anik acrylic keychains with NFC
        </span>
      </footer>
    </div>
  )
}
