const CART_KEY = 'tapik_cart'
const ORDERS_KEY = 'tapik_orders'

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

export function newId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}
