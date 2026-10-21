const CART_KEY = 'tapik_cart'
const ORDERS_KEY = 'tapik_orders'
const USERS_KEY = 'tapik_users'
const SESSION_KEY = 'tapik_session'
const PRODUCTS_KEY = 'tapik_products'
const DELIVERY_DETAILS_PREFIX = 'tapik_delivery_details_'

const DEMO_ADMIN = {
  id: 'tapik-admin',
  name: 'TAPik Admin',
  email: 'admin@tapikco.com',
  password: 'TapikAdmin2026!',
  role: 'admin',
}

export function loadCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || []
  } catch {
    return []
  }
}

export function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart))
}

export function loadOrders() {
  try {
    return JSON.parse(localStorage.getItem(ORDERS_KEY)) || []
  } catch {
    return []
  }
}

export function saveOrders(orders) {
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders))
}

// Replaces stored orders that share an id with the given ones and keeps the rest.
export function upsertOrders(updated) {
  const ids = new Set(updated.map((order) => order.id))
  saveOrders([...updated, ...loadOrders().filter((order) => !ids.has(order.id))])
}

export function loadUsers() {
  try {
    const users = JSON.parse(localStorage.getItem(USERS_KEY)) || []
    if (!users.some((user) => user.role === 'admin')) {
      users.push(DEMO_ADMIN)
      localStorage.setItem(USERS_KEY, JSON.stringify(users))
    }
    return users
  } catch {
    return [DEMO_ADMIN]
  }
}

export function registerUser({ name, email, password }) {
  const users = loadUsers()
  const normalizedEmail = email.trim().toLowerCase()
  if (users.some((user) => user.email.toLowerCase() === normalizedEmail)) {
    throw new Error('An account with this email already exists.')
  }
  const user = {
    id: newId('user'),
    name: name.trim(),
    email: normalizedEmail,
    password,
    role: 'customer',
  }
  localStorage.setItem(USERS_KEY, JSON.stringify([...users, user]))
  return user
}

export function authenticateUser(email, password) {
  const normalizedEmail = email.trim().toLowerCase()
  const user = loadUsers().find(
    (account) => account.email.toLowerCase() === normalizedEmail && account.password === password
  )
  if (!user) throw new Error('Email or password is incorrect.')
  return user
}

export function saveSession(user) {
  const session = { id: user.id, name: user.name, email: user.email, role: user.role }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function loadSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY))
  } catch {
    return null
  }
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY)
}

export function loadProducts() {
  try {
    const stored = JSON.parse(localStorage.getItem(PRODUCTS_KEY))
    if (stored) return stored
  } catch {
    return []
  }
  return []
}

export function saveProducts(products) {
  localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products))
}

export function loadDeliveryDetails(userId) {
  if (!userId) return null
  try {
    return JSON.parse(localStorage.getItem(`${DELIVERY_DETAILS_PREFIX}${userId}`))
  } catch {
    return null
  }
}

export function saveDeliveryDetails(userId, details) {
  if (!userId) return
  localStorage.setItem(`${DELIVERY_DETAILS_PREFIX}${userId}`, JSON.stringify(details))
}

export function newId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}
