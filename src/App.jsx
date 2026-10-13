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

  useEffect(() => { setCartState(loadCart()) }, [])
  useEffect(() => { saveCart(cart) }, [cart])

  const setCart = (updater) => {
    setCartState((prev) => (typeof updater === 'function' ? updater(prev) : updater))
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

  return (
    <div
      className="min-h-screen relative"
      style={{ backgroundColor: '#4f94b2', backgroundImage: `url(${bg})`, backgroundSize: 'cover', backgroundPosition: 'top center', backgroundAttachment: 'fixed' }}
    >
      <div className="absolute inset-0 bg-blue-900/40 -z-0 pointer-events-none" />
      <div className="relative z-10">
        <Navbar page={page} setPage={setPage} cartCount={cart.reduce((s, i) => s + i.qty, 0)} />
        <main>{renderPage()}</main>
        <footer className="bg-blue-900/80 text-blue-200 text-center py-6 text-sm">
          (c) {new Date().getFullYear()} TAPik Company - Customized anik-anik acrylic keychains with NFC - Demo for group project
        </footer>
      </div>
    </div>
  )
}
