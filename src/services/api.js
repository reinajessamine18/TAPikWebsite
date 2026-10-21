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
  if (!res.ok) throw new Error(`Apps Script request failed (${res.status})`)
  const result = await res.json()
  if (!result || typeof result !== 'object') throw new Error('Apps Script returned an invalid response')
  if (result.ok === false && result.error === 'Unknown action') {
    throw new Error('The order database is out of date. Deploy the latest Code.gs in Apps Script as a new version, then try again.')
  }
  return result
}

export const api = {
  isConfigured: () => Boolean(BASE_URL),
  getProducts: () => call('getProducts'),
  getShippingRates: () => call('getShippingRates'),
  getOrders: () => call('getOrders'),
  getAdminData: () => call('getAdminData'),
  getInventory: () => call('getInventory'),
  updateInventory: (data) => call('updateInventory', data, 'POST'),
  getCustomerOrders: (data) => call('getCustomerOrders', data),
  getPaymentProof: (data) => call('getPaymentProof', data),
  submitPaymentProof: (data) => call('submitPaymentProof', data, 'POST'),
  verifyPayment: (data) => call('verifyPayment', data, 'POST'),
  getReceipt: (data) => call('getReceipt', data),
  getDesignImage: (data) => call('getDesignImage', data),
  testConnection: () => call('ping'),
  createOrder: (data) => call('createOrder', data, 'POST'),
  updateOrderStatus: (data) => call('updateOrderStatus', data, 'POST'),
  saveProduct: (data) => call('saveProduct', data, 'POST'),
  deleteProduct: (data) => call('deleteProduct', data, 'POST'),
}

export async function downloadReceipt(orderId) {
  const result = await api.getReceipt({ orderId })
  if (!result.ok || !result.data) {
    throw new Error(result.error || 'Apps Script did not return the receipt PDF.')
  }

  const bytes = Uint8Array.from(atob(result.data), (character) => character.charCodeAt(0))
  const blob = new Blob([bytes], { type: result.mimeType || 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = result.fileName || `${result.receiptNumber || orderId}.pdf`
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
