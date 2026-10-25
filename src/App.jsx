
import { useEffect, useState } from 'react'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Customize from './pages/Customize'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import Orders from './pages/Orders'
import Admin from './pages/Admin'
import Account from './pages/Account'
import Profile from './pages/Profile'
import StatusToasts from './components/StatusToasts'
import { useCustomerOrders } from './lib/useCustomerOrders'
import { useStatusToasts } from './lib/useStatusToasts'
import { clearSession, loadCart, loadSession, saveCart, saveSession } from './lib/storage'
import bg from './assets/TAPikbg.png'

export default function App() {
  const [page, setPage] = useState('home')
  const [account, setAccount] = useState(loadSession)
  const [cart, setCartState] = useState(loadCart)
  const [accountMode, setAccountMode] = useState('login')
  const [showAccountPrompt, setShowAccountPrompt] = useState(false)
  const [pendingItem, setPendingItem] = useState(null)

  // One shared, live feed of the signed-in customer's orders for Home, Orders and Profile, plus pop-ups for status changes.
  const customerId = account?.role === 'customer' ? account.id : null
  const customerOrders = useCustomerOrders(customerId)
  const { toasts, dismiss: dismissToast } = useStatusToasts(customerOrders.orders)

  useEffect(() => {
    saveCart(cart)
  }, [account, cart])

  const setCart = (updater) => {
    setCartState((prev) =>
      typeof updater === 'function' ? updater(prev) : updater
    )
  }

  const addToCart = (item) => {
    if (!account) {
      setPendingItem(item)
      setShowAccountPrompt(true)
      return
    }
    setCart((prev) => [...prev, item])
    setPage('cart')
  }

  const completeSignIn = (user) => {
    saveSession(user)
    const { id, name, email, role } = user
    setAccount({ id, name, email, role })
    setShowAccountPrompt(false)
    if (role === 'admin') {
      setPendingItem(null)
      setPage('admin')
      return
    }
    if (pendingItem) {
      setCart((prev) => [...prev, pendingItem])
      setPendingItem(null)
      setPage('cart')
    } else {
      setPage('home')
    }
  }

  const signOut = () => {
    clearSession()
    setAccount(null)
    setPage('home')
  }

  const requireAccount = () => setShowAccountPrompt(true)

  const renderPage = () => {
    switch (page) {
      case 'home':
        return <Home setPage={setPage} onAccount={requireAccount} account={account} orders={customerOrders.orders} />

      case 'customize':
        return <Customize onAddToCart={addToCart} />

      case 'cart':
        return account
          ? <Cart cart={cart} setCart={setCart} setPage={setPage} />
          : <AccountRequired onSignIn={requireAccount} />

      case 'checkout':
        return account
          ? <Checkout cart={cart} setCart={setCart} setPage={setPage} account={account} />
          : <AccountRequired onSignIn={requireAccount} />

      case 'orders':
        return account
          ? <Orders account={account} ordersState={customerOrders} />
          : <AccountRequired onSignIn={requireAccount} />

      case 'profile':
        return account
          ? <Profile account={account} setPage={setPage} orders={customerOrders.orders} />
          : <AccountRequired onSignIn={requireAccount} />

      case 'admin':
        return account?.role === 'admin'
          ? <Admin />
          : <AccountRequired onSignIn={requireAccount} admin />

      case 'account':
        return <Account onSuccess={completeSignIn} initialMode={accountMode} />

      default:
        return <Home setPage={setPage} onAccount={requireAccount} account={account} orders={customerOrders.orders} />
    }
  }

  const cartCount = cart.reduce((sum, item) => sum + (Number(item.qty) || 0), 0)
  const isAdmin = account?.role === 'admin'

  return (
    <div
      className="tapik-app"
      style={{ backgroundImage: `url(${bg})` }}
    >
      {isAdmin ? (
        <header className="tapik-admin-navbar">
          <h1>TAPik Admin Dashboard</h1>
          <button type="button" onClick={signOut}>Log out</button>
        </header>
      ) : (
        <Navbar
          page={page}
          setPage={setPage}
          cartCount={account ? cartCount : 0}
          account={account}
          onSignIn={() => { setAccountMode('login'); setPage('account') }}
          onSignUp={() => { setAccountMode('register'); setPage('account') }}
          onSignOut={signOut}
        />
      )}

      <main className="tapik-main">
        {isAdmin ? <Admin /> : renderPage()}
      </main>

      {showAccountPrompt && (
        <Account
          modal
          onSuccess={completeSignIn}
          onCancel={() => { setShowAccountPrompt(false); setPendingItem(null) }}
        />
      )}

      {customerId && <StatusToasts toasts={toasts} onDismiss={dismissToast} onView={() => setPage('orders')} />}

      {!isAdmin && (
        <footer className="tapik-footer">
          © {new Date().getFullYear()} TAPik Company
          <span>Customized anik-anik acrylic keychains with NFC</span>
        </footer>
      )}
    </div>
  )
}

function AccountRequired({ onSignIn, admin = false }) {
  return (
    <section className="flex min-h-[55vh] items-center justify-center px-4 py-12 text-center text-white">
      <div className="max-w-md">
        <h1 className="text-3xl font-black">{admin ? 'Admin sign in required' : 'Please log in first'}</h1>
        <p className="mt-3 text-blue-100">{admin ? 'Log in with the admin account to manage TAPik.' : 'Sign in or create an account to view your cart and orders.'}</p>
        <button type="button" onClick={onSignIn} className="mt-6 rounded-lg bg-yellow-400 px-6 py-3 font-bold text-slate-950 hover:bg-yellow-300">Log in or sign up</button>
      </div>
    </section>
  )
}
