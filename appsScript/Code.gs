// Google Apps Script backend for TAPikWebsite.
// Deploy this as a Web app: Execute as "Me", Who has access "Anyone".
// Then copy the Web app URL into your React .env as VITE_APPS_SCRIPT_URL.

const SHEET_NAME = 'TAPik Database'

function getDb() {
  return SpreadsheetApp.getActiveSpreadsheet()
}

function getSheet(name) {
  const sh = getDb().getSheetByName(name)
  if (!sh) throw new Error('Sheet not found: ' + name)
  return sh
}

function sheetToObjects(sheet) {
  const values = sheet.getDataRange().getValues()
  if (values.length < 2) return []
  const headers = values[0]
  return values.slice(1).map((row) => {
    const obj = {}
    headers.forEach((h, i) => { obj[h] = row[i] })
    return obj
  })
}

function appendRow(sheetName, values) {
  const sh = getSheet(sheetName)
  sh.appendRow(values)
}

function genId(prefix) {
  return prefix + '_' + Utilities.getUuid().slice(0, 8)
}

function doGet(e) {
  const action = (e.parameter.action || '').trim()
  let result = { ok: false, error: 'Unknown action' }
  try {
    if (action === 'getProducts') {
      result = { ok: true, data: sheetToObjects(getSheet('Products')) }
    } else if (action === 'getShippingRates') {
      result = { ok: true, data: sheetToObjects(getSheet('ShippingRates')) }
    } else if (action === 'getOrders') {
      result = { ok: true, data: sheetToObjects(getSheet('Orders')) }
    } else {
      result = { ok: true, message: 'TAPik Apps Script is running' }
    }
  } catch (err) {
    result = { ok: false, error: String(err) }
  }
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON)
}

function doPost(e) {
  let payload = {}
  try { payload = JSON.parse(e.postData.contents || '{}') } catch (err) { payload = {} }
  const action = payload.action || ''
  let result = { ok: false, error: 'Unknown action' }
  try {
    if (action === 'createOrder') {
      result = createOrder(payload.data || {})
    } else if (action === 'updateOrderStatus') {
      result = updateOrderStatus(payload.data || {})
    } else {
      result = { ok: false, error: 'Unknown action' }
    }
  } catch (err) {
    result = { ok: false, error: String(err) }
  }
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON)
}

function createOrder(data) {
  const lock = LockService.getScriptLock()
  lock.waitLock(10000)
  try {
    const orderId = genId('TAP')
    const now = new Date()
    const customer = data.customer || {}
    const items = data.items || []
    const orderRow = [
      orderId, customer.customerId || genId('CUST'), now,
      data.subtotal || 0, data.shipping || 0, data.total || 0,
      data.paymentMethod || 'Manual', data.paymentStatus || 'Pending',
      data.status || 'Processing', data.shippingAddressId || '', data.notes || ''
    ]
    appendRow('Orders', orderRow)

    items.forEach((it) => {
      appendRow('OrderItems', [
        genId('OI'), orderId, it.shape || it.productId || 'custom', it.shapeName || 'Custom keychain',
        it.qty || 1, it.price || 0, (it.price || 0) * (it.qty || 1)
      ])
    })

    // Shipment row (simulated J&T by default)
    appendRow('Shipments', [
      genId('SHP'), orderId, 'J&T Express (simulated)', data.trackingNumber || '',
      'Processing', customer.name || '', customer.phone || '',
      [customer.street, customer.barangay, customer.city, customer.province].filter(Boolean).join(', '),
      now, '', '', '', true, 'Demo shipment'
    ])
    return { ok: true, orderId: orderId, trackingNumber: data.trackingNumber || '' }
  } finally {
    lock.releaseLock()
  }
}

function updateOrderStatus(data) {
  const sh = getSheet('Orders')
  const values = sh.getDataRange().getValues()
  const headers = values[0]
  const statusCol = headers.indexOf('OrderStatus') + 1
  const idCol = headers.indexOf('OrderID') + 1
  for (let r = 1; r < values.length; r++) {
    if (values[r][idCol - 1] === data.orderId) {
      sh.getRange(r + 1, statusCol).setValue(data.status)
      return { ok: true }
    }
  }
  return { ok: false, error: 'Order not found' }
}
