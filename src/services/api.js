// Optional Google Apps Script connection.
// Set VITE_APPS_SCRIPT_URL in a .env file once you deploy the Apps Script web app.
const BASE_URL = import.meta.env.VITE_APPS_SCRIPT_URL

async function call(action, payload, method = 'GET') {
  if (!BASE_URL) return { ok: false, local: true, error: 'Apps Script URL not configured' }
  const url = new URL(BASE_URL)
  if (method === 'GET') {
    url.searchParams.set('action', action)
    if (payload) url.searchParams.set('payload', JSON.stringify(payload))
  }
  const res = await fetch(url.toString(), method === 'GET' ? undefined : {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, data: payload }),
  })
  return res.json()
}

export const api = {
  isConfigured: () => Boolean(BASE_URL),
  getProducts: () => call('getProducts'),
  getShippingRates: () => call('getShippingRates'),
  getOrders: () => call('getOrders'),
  createOrder: (data) => call('createOrder', data, 'POST'),
  updateOrderStatus: (data) => call('updateOrderStatus', data, 'POST'),
}
