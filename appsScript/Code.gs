// Google Apps Script backend for TAPikWebsite.
// Deploy as a Web app that executes as the spreadsheet owner.

const DESIGN_FOLDER_NAME = 'TAPik Customer Designs'
const PROOF_FOLDER_NAME = 'TAPik Payment Proofs'

// Optional Orders columns. They are added automatically when missing.
const ORDER_EXTRA_HEADERS = [
  'ReceiptNumber', 'ReceiptURL', 'Landmark', 'Barangay', 'City',
  'ProofURL', 'ProofHash', 'PaymentSubmittedAt', 'PaymentVerifiedAt', 'PaymentRejectReason', 'StockDeducted'
]

// Statuses an admin may pick by hand. Payment statuses only change through
// submitPaymentProof and verifyPayment, so an order cannot skip verification.
const FULFILLMENT_STATUSES = ['Being prepared', 'Packed', 'Shipped', 'Delivered']
const PAYABLE_STATUSES = ['Awaiting payment', 'Payment rejected', 'Pending']

// Keep in sync with SHAPES and CHAINS in src/lib/pricing.js.
const INVENTORY_HEADERS = ['ItemType', 'ItemID', 'ItemName', 'Stock', 'Threshold', 'UpdatedAt']
const INVENTORY_ITEMS = [
  { type: 'shape', id: 'rectangle', name: 'Rectangle' },
  { type: 'shape', id: 'curved', name: 'Curved Rectangle' },
  { type: 'shape', id: 'round', name: 'Round' },
  { type: 'shape', id: 'square', name: 'Square' },
  { type: 'chain', id: 'ring', name: 'Ring' },
  { type: 'chain', id: 'gold', name: 'Gold' },
  { type: 'chain', id: 'silver', name: 'Silver' },
  { type: 'chain', id: 'red', name: 'Red' },
  { type: 'chain', id: 'orange', name: 'Orange' },
  { type: 'chain', id: 'yellow', name: 'Yellow' },
  { type: 'chain', id: 'green', name: 'Green' },
  { type: 'chain', id: 'blue', name: 'Blue' },
  { type: 'chain', id: 'purple', name: 'Purple' },
  { type: 'chain', id: 'black', name: 'Black' },
  { type: 'chain', id: 'white', name: 'White' },
  { type: 'chain', id: 'lightpink', name: 'Light Pink' },
  { type: 'chain', id: 'rosepink', name: 'Rose Pink' }
]
const DEFAULT_STOCK = 100
const DEFAULT_THRESHOLD = 10

// Creates the Inventory sheet on first use and adds a row for any shape or chain that has none.
function ensureInventorySheet() {
  let sheet = getDb().getSheetByName('Inventory')
  if (!sheet) {
    sheet = getDb().insertSheet('Inventory')
    sheet.appendRow(INVENTORY_HEADERS)
  }
  assertHeaders('Inventory', INVENTORY_HEADERS)
  const existing = sheetToObjects(sheet)
  INVENTORY_ITEMS.forEach(function (item) {
    const found = existing.some(function (row) {
      return row.ItemType === item.type && row.ItemID === item.id
    })
    if (!found) {
      sheet.appendRow([item.type, item.id, item.name, DEFAULT_STOCK, DEFAULT_THRESHOLD, new Date()])
    }
  })
  return sheet
}

function getInventory() {
  const lock = LockService.getScriptLock()
  lock.waitLock(10000)
  try {
    const rows = sheetToObjects(ensureInventorySheet())
    return {
      ok: true,
      data: rows.map(function (row) {
        return {
          type: row.ItemType,
          id: row.ItemID,
          name: row.ItemName,
          stock: Number(row.Stock) || 0,
          threshold: Number(row.Threshold) || 0
        }
      })
    }
  } finally {
    lock.releaseLock()
  }
}

function updateInventory(data) {
  const stock = Math.floor(Number(data.stock))
  const threshold = Math.floor(Number(data.threshold))
  if (!(stock >= 0) || !(threshold >= 0)) {
    return { ok: false, error: 'Stock and threshold must be whole numbers of 0 or more.' }
  }

  const lock = LockService.getScriptLock()
  lock.waitLock(10000)
  try {
    const sheet = ensureInventorySheet()
    const values = sheet.getDataRange().getValues()
    const headers = values[0]
    const typeColumn = headers.indexOf('ItemType')
    const idColumn = headers.indexOf('ItemID')
    for (let row = 1; row < values.length; row++) {
      if (values[row][typeColumn] === data.type && values[row][idColumn] === data.id) {
        sheet.getRange(row + 1, headers.indexOf('Stock') + 1).setValue(stock)
        sheet.getRange(row + 1, headers.indexOf('Threshold') + 1).setValue(threshold)
        sheet.getRange(row + 1, headers.indexOf('UpdatedAt') + 1).setValue(new Date())
        return { ok: true, stock: stock, threshold: threshold }
      }
    }
    return { ok: false, error: 'Inventory item not found' }
  } finally {
    lock.releaseLock()
  }
}

// How many of each shape and chain the given order items use (one of each per keychain).
function inventoryNeeds(items) {
  const needed = {}
  items.forEach(function (item) {
    const quantity = Number(item.qty) || 1
    const parts = [['shape', item.shape], ['chain', item.chain]]
    parts.forEach(function (part) {
      if (!part[1]) return
      const key = part[0] + ':' + part[1]
      needed[key] = (needed[key] || 0) + quantity
    })
  })
  return needed
}

// Throws when a new order needs more of a shape or chain than is in stock.
function assertInStock(items) {
  const needed = inventoryNeeds(items)
  sheetToObjects(ensureInventorySheet()).forEach(function (row) {
    const key = row.ItemType + ':' + row.ItemID
    if (needed[key] && (Number(row.Stock) || 0) < needed[key]) {
      throw new Error('Sorry, the ' + (row.ItemName || row.ItemID) + ' ' + row.ItemType
        + ' no longer has enough stock for your order. Please adjust your cart.')
    }
  })
}

// direction -1 takes the items out of stock, +1 puts them back. Returns the keys that ran short.
function adjustInventory(items, direction) {
  const needed = inventoryNeeds(items)
  const sheet = ensureInventorySheet()
  const values = sheet.getDataRange().getValues()
  const headers = values[0]
  const typeColumn = headers.indexOf('ItemType')
  const idColumn = headers.indexOf('ItemID')
  const stockColumn = headers.indexOf('Stock')
  const updatedColumn = headers.indexOf('UpdatedAt')
  const shortages = []

  for (let row = 1; row < values.length; row++) {
    const key = values[row][typeColumn] + ':' + values[row][idColumn]
    if (!needed[key]) continue
    const next = (Number(values[row][stockColumn]) || 0) + direction * needed[key]
    if (next < 0) shortages.push(key)
    sheet.getRange(row + 1, stockColumn + 1).setValue(Math.max(0, next))
    sheet.getRange(row + 1, updatedColumn + 1).setValue(new Date())
  }
  return shortages
}

function ensureOrderHeaders() {
  return ensureHeaders('Orders', ORDER_EXTRA_HEADERS)
}

function getDb() {
  return SpreadsheetApp.getActiveSpreadsheet()
}

function getSheet(name) {
  const sheet = getDb().getSheetByName(name)
  if (!sheet) throw new Error('Sheet not found: ' + name)
  return sheet
}

function sheetToObjects(sheet) {
  const values = sheet.getDataRange().getValues()
  if (values.length < 2) return []
  const headers = values[0]
  return values.slice(1).map((row) => {
    const object = {}
    headers.forEach((header, index) => { object[header] = row[index] })
    return object
  })
}

function genId(prefix) {
  return prefix + '_' + Utilities.getUuid().slice(0, 8)
}

function assertHeaders(sheetName, requiredHeaders) {
  const sheet = getSheet(sheetName)
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
  const missing = requiredHeaders.filter((header) => headers.indexOf(header) < 0)
  if (missing.length) {
    throw new Error(sheetName + ' sheet is missing required headers: ' + missing.join(', '))
  }
  return headers
}

function ensureHeaders(sheetName, additionalHeaders) {
  const sheet = getSheet(sheetName)
  const lastColumn = Math.max(sheet.getLastColumn(), 1)
  const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0]
  additionalHeaders.forEach((header) => {
    if (headers.indexOf(header) < 0) {
      const column = sheet.getLastColumn() + 1
      sheet.getRange(1, column).setValue(header)
      headers.push(header)
    }
  })
  return headers
}

function upsertByKey(sheetName, keyHeader, key, record) {
  const sheet = getSheet(sheetName)
  const values = sheet.getDataRange().getValues()
  const headers = values[0] || []
  const keyColumn = headers.indexOf(keyHeader)
  if (keyColumn < 0) throw new Error(sheetName + ' sheet is missing ' + keyHeader + ' header')

  const rowValues = headers.map((header) => record[header] === undefined ? '' : record[header])
  const target = values.findIndex((row, index) => index > 0 && String(row[keyColumn]) === String(key))
  if (target < 0) {
    sheet.appendRow(rowValues)
  } else {
    sheet.getRange(target + 1, 1, 1, headers.length).setValues([rowValues])
  }
}

function doGet(event) {
  const action = (event.parameter.action || '').trim()
  let result = { ok: false, error: 'Unknown action' }
  try {
    if (action === 'getProducts') {
      result = { ok: true, data: sheetToObjects(getSheet('Products')) }
    } else if (action === 'getShippingRates') {
      result = { ok: true, data: sheetToObjects(getSheet('ShippingRates')) }
    } else if (action === 'getOrders') {
      result = { ok: true, data: sheetToObjects(getSheet('Orders')) }
    } else if (action === 'getReceipt') {
      result = getReceipt(event.parameter.payload ? JSON.parse(event.parameter.payload) : {})
    } else if (action === 'getDesignImage') {
      result = getDesignImage(event.parameter.payload ? JSON.parse(event.parameter.payload) : {})
    } else if (action === 'getAdminData') {
      result = { ok: true, data: getAdminData() }
    } else if (action === 'getInventory') {
      result = getInventory()
    } else if (action === 'getCustomerOrders') {
      result = getCustomerOrders(event.parameter.payload ? JSON.parse(event.parameter.payload) : {})
    } else if (action === 'getPaymentProof') {
      result = getPaymentProof(event.parameter.payload ? JSON.parse(event.parameter.payload) : {})
    } else if (action === 'ping') {
      result = { ok: true, message: 'TAPik Apps Script is connected' }
    } else {
      result = { ok: true, message: 'TAPik Apps Script is running' }
    }
  } catch (error) {
    result = { ok: false, error: String(error) }
  }
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON)
}

function doPost(event) {
  let payload = {}
  try { payload = JSON.parse(event.postData.contents || '{}') } catch (error) { payload = {} }
  const action = payload.action || ''
  let result = { ok: false, error: 'Unknown action' }
  try {
    if (action === 'createOrder') {
      result = createOrder(payload.data || {})
    } else if (action === 'updateOrderStatus') {
      result = updateOrderStatus(payload.data || {})
    } else if (action === 'submitPaymentProof') {
      result = submitPaymentProof(payload.data || {})
    } else if (action === 'updateInventory') {
      result = updateInventory(payload.data || {})
    } else if (action === 'verifyPayment') {
      result = verifyPayment(payload.data || {})
    } else if (action === 'saveProduct') {
      result = saveProduct(payload.data || {})
    } else if (action === 'deleteProduct') {
      result = deleteProduct(payload.data || {})
    }
  } catch (error) {
    result = { ok: false, error: String(error) }
  }
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON)
}

// Keep in sync with SHIPPING_ZONES and WEIGHT_SURCHARGES in src/lib/pricing.js.
const SHIPPING_ZONES = [
  { fee: 60, cities: ['Pasig', 'Marikina', 'Mandaluyong', 'San Juan', 'Taguig', 'Pateros'] },
  { fee: 80, cities: ['Quezon City', 'Makati', 'Manila', 'Pasay'] },
  { fee: 100, cities: ['Parañaque', 'Caloocan', 'Muntinlupa'] },
  { fee: 120, cities: ['Las Piñas', 'Valenzuela', 'Malabon', 'Navotas'] }
]
const WEIGHT_SURCHARGES = [
  { maxKg: 1, fee: 0 },
  { maxKg: 2, fee: 20 },
  { maxKg: 3, fee: 40 }
]

// Returns null when the city is not a delivery city.
function calculateShippingFee(weightGrams, city) {
  const zone = SHIPPING_ZONES.filter(function (z) { return z.cities.indexOf(city) !== -1 })[0]
  if (!zone) return null
  const kg = Math.max(0.001, weightGrams / 1000)
  const bracket = WEIGHT_SURCHARGES.filter(function (b) { return kg <= b.maxKg })[0] ||
    WEIGHT_SURCHARGES[WEIGHT_SURCHARGES.length - 1]
  return zone.fee + bracket.fee
}

function createOrder(data) {
  const lock = LockService.getScriptLock()
  lock.waitLock(10000)
  try {
    assertHeaders('Orders', [
      'OrderID', 'CustomerID', 'OrderDate', 'Subtotal', 'ShippingFee', 'TotalAmount',
      'PaymentMethod', 'PaymentStatus', 'OrderStatus', 'ShippingAddressID', 'Notes'
    ])
    ensureOrderHeaders()
    assertHeaders('Customers', ['CustomerID', 'CustomerName', 'Email', 'Phone'])
    assertHeaders('OrderItems', ['OrderItemID', 'OrderID', 'ProductID', 'Quantity', 'UnitPrice', 'Subtotal'])
    assertHeaders('Shipments', [
      'ShipmentID', 'OrderID', 'Courier', 'TrackingNumber', 'ShipmentStatus', 'RecipientName',
      'RecipientPhone', 'DeliveryAddress', 'BookedAt', 'ShippedAt', 'DeliveredAt', 'TrackingURL',
      'IsSimulated', 'Remarks'
    ])

    const orderId = data.id || genId('TAP')
    const customer = data.customer || {}
    const customerId = data.customerId || customer.customerId || genId('CUST')
    const items = Array.isArray(data.items) ? data.items : []
    // Recompute the shipping fee here so the browser cannot set its own price.
    const weightGrams = items.reduce(function (sum, item) {
      return sum + (Number(item.weightGrams) || 50) * (Number(item.qty) || 1)
    }, 0)
    const shippingFee = calculateShippingFee(weightGrams, customer.city)
    if (shippingFee === null) {
      throw new Error('Delivery is only available within Metro Manila cities.')
    }
    const orderTotal = (Number(data.subtotal) || 0) + shippingFee
    const now = new Date()
    const existingOrder = sheetToObjects(getSheet('Orders'))
      .find((order) => String(order.OrderID || '') === String(orderId)) || {}
    const existingNotes = parseOrderNotes(existingOrder.Notes)
    // Re-posting an order must never reset its payment progress, and the browser
    // cannot choose the status: every new order starts as awaiting payment.
    const orderStatus = existingOrder.OrderStatus || 'Awaiting payment'
    const paymentMethod = existingOrder.PaymentMethod || 'QR (demo)'
    const paymentStatus = existingOrder.PaymentStatus || 'Pending'
    if (!existingOrder.OrderID) assertInStock(items)
    const shipmentSheet = getSheet('Shipments')
    const existingShipment = sheetToObjects(shipmentSheet)
      .find((shipment) => String(shipment.OrderID || '') === String(orderId)) || {}
    const existingTrackingNumber = String(existingShipment.TrackingNumber || '')
    const trackingNumber = /^JT-\d+$/.test(existingTrackingNumber)
      ? existingTrackingNumber
      : genTrackingNumber()

    // Design files are uploaded to Drive when the customer submits payment, which keeps checkout quick.
    const itemDetails = items.map((item, index) => ({
      name: item.shapeName || 'Custom keychain',
      shape: item.shape || '',
      chain: item.chain || '',
      imageURL: ((existingNotes.items || [])[index] || {}).imageURL || '',
      nfcLink: item.nfcLink || ''
    }))
    // The receipt is issued by verifyPayment once the payment is confirmed, so a new order has none.
    const receiptNumber = existingOrder.ReceiptNumber || existingNotes.receiptNumber || ''
    const receiptURL = existingOrder.ReceiptURL || existingNotes.receiptURL || ''

    upsertByKey('Customers', 'CustomerID', customerId, {
      CustomerID: customerId,
      CustomerName: customer.name || '',
      Email: customer.email || '',
      Phone: customer.phone || ''
    })

    upsertByKey('Orders', 'OrderID', orderId, {
      OrderID: orderId,
      CustomerID: customerId,
      OrderDate: data.date ? new Date(data.date) : now,
      Subtotal: Number(data.subtotal) || 0,
      ShippingFee: shippingFee,
      TotalAmount: orderTotal,
      PaymentMethod: paymentMethod,
      PaymentStatus: paymentStatus,
      OrderStatus: orderStatus,
      ShippingAddressID: data.shippingAddressId || '',
      ReceiptNumber: receiptNumber,
      ReceiptURL: receiptURL,
      Landmark: customer.landmark || '',
      Barangay: customer.barangay || '',
      City: customer.city || '',
      ProofHash: existingOrder.ProofHash || '',
      StockDeducted: existingOrder.StockDeducted || '',
      ProofURL: existingOrder.ProofURL || '',
      PaymentSubmittedAt: existingOrder.PaymentSubmittedAt || '',
      PaymentVerifiedAt: existingOrder.PaymentVerifiedAt || '',
      PaymentRejectReason: existingOrder.PaymentRejectReason || '',
      Notes: JSON.stringify({
        customerInstructions: customer.instructions || '',
        customerAddress: {
          street: customer.street || '',
          landmark: customer.landmark || '',
          barangay: customer.barangay || '',
          city: customer.city || '',
          province: customer.province || ''
        },
        items: itemDetails
      })
    })

    items.forEach((item, index) => {
      const itemId = orderId + '_item_' + (index + 1)
      upsertByKey('OrderItems', 'OrderItemID', itemId, {
        OrderItemID: itemId,
        OrderID: orderId,
        ProductID: item.productId || item.shape || 'custom',
        Quantity: Number(item.qty) || 1,
        UnitPrice: Number(item.price) || 0,
        Subtotal: (Number(item.price) || 0) * (Number(item.qty) || 1)
      })
    })

    const deliveryAddress = [customer.street, customer.barangay, customer.city, customer.province]
      .filter(Boolean).join(', ')
    upsertByKey('Shipments', 'ShipmentID', 'SHP_' + orderId, {
      ShipmentID: 'SHP_' + orderId,
      OrderID: orderId,
      Courier: existingShipment.Courier || 'J&T Express',
      TrackingNumber: trackingNumber,
      ShipmentStatus: orderStatus,
      RecipientName: customer.name || '',
      RecipientPhone: customer.phone || '',
      DeliveryAddress: deliveryAddress,
      BookedAt: now,
      ShippedAt: '',
      DeliveredAt: '',
      TrackingURL: '',
      IsSimulated: true,
      Remarks: 'Simulated shipment'
    })

    return {
      ok: true,
      orderId: orderId,
      trackingNumber: trackingNumber,
      receiptNumber: receiptNumber,
      receiptURL: receiptURL
    }
  } finally {
    clearOrderCache()
    lock.releaseLock()
  }
}

function findOrder(orderId) {
  return sheetToObjects(getSheet('Orders'))
    .find((order) => String(order.OrderID || '') === String(orderId)) || null
}

// Writes the given columns on one order row. Returns false when the order is missing.
function updateOrderRow(orderId, fields) {
  const sheet = getSheet('Orders')
  const values = sheet.getDataRange().getValues()
  const headers = values[0] || []
  const idColumn = headers.indexOf('OrderID')
  if (idColumn < 0) throw new Error('Orders sheet is missing OrderID header')

  for (let row = 1; row < values.length; row++) {
    if (String(values[row][idColumn]) !== String(orderId)) continue
    Object.keys(fields).forEach((key) => {
      const column = headers.indexOf(key)
      if (column < 0) throw new Error('Orders sheet is missing ' + key + ' header')
      sheet.getRange(row + 1, column + 1).setValue(fields[key])
    })
    return true
  }
  return false
}

function syncShipmentStatus(orderId, status) {
  const shipmentSheet = getSheet('Shipments')
  const shipmentValues = shipmentSheet.getDataRange().getValues()
  const shipmentHeaders = shipmentValues[0] || []
  const shipmentOrderColumn = shipmentHeaders.indexOf('OrderID')
  const shipmentStatusColumn = shipmentHeaders.indexOf('ShipmentStatus')
  if (shipmentOrderColumn < 0 || shipmentStatusColumn < 0) return
  for (let shipmentRow = 1; shipmentRow < shipmentValues.length; shipmentRow++) {
    if (String(shipmentValues[shipmentRow][shipmentOrderColumn]) === String(orderId)) {
      shipmentSheet.getRange(shipmentRow + 1, shipmentStatusColumn + 1).setValue(status)
    }
  }
}

function updateOrderStatus(data) {
  const status = String(data.status || '')
  if (status !== 'Cancelled' && FULFILLMENT_STATUSES.indexOf(status) < 0) {
    return { ok: false, error: 'Payment statuses can only be changed through payment verification.' }
  }

  const lock = LockService.getScriptLock()
  lock.waitLock(10000)
  try {
    ensureOrderHeaders()
    const order = findOrder(data.orderId)
    if (!order) return { ok: false, error: 'Order not found' }
    if (status !== 'Cancelled' && order.PaymentStatus !== 'Paid') {
      return { ok: false, error: 'Confirm the payment before preparing or shipping this order.' }
    }
    if (order.OrderStatus === 'Cancelled') {
      return { ok: false, error: 'A cancelled order cannot be reopened.' }
    }
    if (order.OrderStatus === 'Delivered') {
      return { ok: false, error: 'A delivered order cannot be changed.' }
    }

    const fields = { OrderStatus: status }
    if (status === 'Cancelled' && order.StockDeducted === 'yes') {
      // Cancelling a paid order puts its shapes and chains back in stock, once.
      const cancelled = buildOrders('').find((entry) => entry.id === String(data.orderId))
      adjustInventory(cancelled.items, 1)
      fields.StockDeducted = 'no'
    }
    updateOrderRow(data.orderId, fields)
    syncShipmentStatus(data.orderId, status)
    return { ok: true }
  } finally {
    clearOrderCache()
    lock.releaseLock()
  }
}

function submitPaymentProof(data) {
  const lock = LockService.getScriptLock()
  lock.waitLock(10000)
  try {
    ensureOrderHeaders()
    const orderId = String(data.orderId || '')
    const order = findOrder(orderId)
    if (!order) return { ok: false, error: 'Order not found' }
    if (String(order.CustomerID || '') !== String(data.customerId || '')) {
      return { ok: false, error: 'This order belongs to a different account.' }
    }
    if (PAYABLE_STATUSES.indexOf(String(order.OrderStatus || '')) < 0) {
      return { ok: false, error: 'This order is not waiting for payment.' }
    }

    if (!data.proofImage || String(data.proofImage).indexOf('data:image/') !== 0) {
      return { ok: false, error: 'Upload a screenshot or photo of your proof of payment.' }
    }

    // Upload any design files that have not reached Drive yet, then record the order's artwork links.
    const notes = parseOrderNotes(order.Notes)
    const noteItems = notes.items || []
    const designs = Array.isArray(data.designs) ? data.designs : []
    let designsSaved = false
    noteItems.forEach(function (item, index) {
      const design = designs[index]
      if (!item.imageURL && typeof design === 'string' && design.indexOf('data:image/') === 0) {
        item.imageURL = saveDesignImage(design)
        designsSaved = true
      }
    })

    const proof = saveProofImage(data.proofImage, orderId)
    const fields = {
      OrderStatus: 'Payment submitted',
      PaymentStatus: 'Submitted',
      ProofURL: proof.url,
      ProofHash: proof.hash,
      PaymentSubmittedAt: new Date(),
      PaymentVerifiedAt: '',
      PaymentRejectReason: ''
    }
    if (designsSaved) fields.Notes = JSON.stringify(notes)
    updateOrderRow(orderId, fields)
    syncShipmentStatus(orderId, 'Payment submitted')
    return { ok: true, status: 'Payment submitted', paymentStatus: 'Submitted' }
  } finally {
    clearOrderCache()
    lock.releaseLock()
  }
}

// Admin decision on a submitted proof: decision is 'confirm' or 'reject'.
function verifyPayment(data) {
  const decision = String(data.decision || '')
  const reason = String(data.reason || '').trim().slice(0, 200)
  if (decision !== 'confirm' && decision !== 'reject') {
    return { ok: false, error: 'Decision must be confirm or reject.' }
  }
  if (decision === 'reject' && !reason) {
    return { ok: false, error: 'Give a reason so the customer knows what to fix.' }
  }

  const lock = LockService.getScriptLock()
  lock.waitLock(10000)
  try {
    ensureOrderHeaders()
    const order = findOrder(data.orderId)
    if (!order) return { ok: false, error: 'Order not found' }
    if (order.OrderStatus !== 'Payment submitted') {
      return { ok: false, error: 'There is no submitted proof of payment to review for this order.' }
    }

    const confirmed = decision === 'confirm'
    const fields = confirmed
      ? { OrderStatus: 'Confirmed payment', PaymentStatus: 'Paid', PaymentVerifiedAt: new Date(), PaymentRejectReason: '' }
      : { OrderStatus: 'Payment rejected', PaymentStatus: 'Rejected', PaymentRejectReason: reason }

    // Issue the receipt before saving the decision, so a Drive error cannot leave a paid order without one.
    let receiptNumber = ''
    let receiptURL = ''
    let stockShortages = []
    if (confirmed) {
      const paidOrder = buildOrders('').find((entry) => entry.id === String(data.orderId))
      receiptNumber = 'RCP-' + paidOrder.id
      receiptURL = createOrderReceipt({
        receiptNumber: receiptNumber,
        orderId: paidOrder.id,
        date: new Date(),
        customer: paidOrder.customer,
        items: paidOrder.items,
        subtotal: paidOrder.subtotal,
        shipping: paidOrder.shipping,
        total: paidOrder.total,
        paymentMethod: paidOrder.paymentMethod,
        paymentStatus: 'Paid'
      })
      fields.ReceiptNumber = receiptNumber
      fields.ReceiptURL = receiptURL
      // Stock is taken out only now, when the payment is confirmed.
      stockShortages = adjustInventory(paidOrder.items, -1)
      fields.StockDeducted = 'yes'
    }

    updateOrderRow(data.orderId, fields)
    syncShipmentStatus(data.orderId, fields.OrderStatus)
    return {
      ok: true,
      status: fields.OrderStatus,
      paymentStatus: fields.PaymentStatus,
      paymentVerifiedAt: confirmed ? fields.PaymentVerifiedAt : '',
      paymentRejectReason: confirmed ? '' : reason,
      receiptNumber: receiptNumber,
      receiptURL: receiptURL,
      stockShortages: stockShortages
    }
  } finally {
    clearOrderCache()
    lock.releaseLock()
  }
}

function getPaymentProof(data) {
  ensureOrderHeaders()
  const order = findOrder(data.orderId)
  if (!order) return { ok: false, error: 'Order not found' }
  const match = String(order.ProofURL || '').match(/\/file\/d\/([^/?]+)/)
  if (!match) return { ok: false, error: 'No proof of payment has been uploaded for this order.' }

  const file = DriveApp.getFileById(decodeURIComponent(match[1]))
  const parents = file.getParents()
  const proofFolderId = getProofFolder().getId()
  let belongsToProofFolder = false
  while (parents.hasNext()) {
    if (parents.next().getId() === proofFolderId) {
      belongsToProofFolder = true
      break
    }
  }
  if (!belongsToProofFolder) {
    return { ok: false, error: 'The requested file is not a stored proof of payment' }
  }

  const blob = file.getBlob()
  return {
    ok: true,
    mimeType: blob.getContentType(),
    data: Utilities.base64Encode(blob.getBytes())
  }
}

function getAdminData() {
  assignMissingSimulatedTrackingNumbers()
  return {
    orders: buildOrders(''),
    products: sheetToObjects(getSheet('Products'))
  }
}

function getCustomerOrders(data) {
  const customerId = String(data.customerId || '')
  if (!customerId) return { ok: false, error: 'Customer ID is required' }
  return { ok: true, data: buildOrders(customerId) }
}

// Order lists are cached briefly because the storefront and admin page poll them. Every write bumps the
// cache version (clearOrderCache), so a payment decision or status change is never served stale.
const ORDER_CACHE_SECONDS = 10

function orderCacheKey(customerId) {
  const cache = CacheService.getScriptCache()
  let version = cache.get('ordersVersion')
  if (!version) {
    version = String(Date.now())
    cache.put('ordersVersion', version, 21600)
  }
  return 'orders_' + version + '_' + customerId
}

function clearOrderCache() {
  CacheService.getScriptCache().put('ordersVersion', String(Date.now()), 21600)
}

// Builds the order list the storefront uses. Pass a customer ID to limit it to one customer.
function buildOrders(customerId) {
  const cache = CacheService.getScriptCache()
  const cacheKey = orderCacheKey(customerId)
  const cached = cache.get(cacheKey)
  if (cached) return JSON.parse(cached)

  const orders = buildOrdersUncached(customerId)
  try {
    cache.put(cacheKey, JSON.stringify(orders), ORDER_CACHE_SECONDS)
  } catch (error) {
    // Results over the cache's 100 KB limit are simply not cached.
  }
  return orders
}

function groupBy(rows, keyHeader) {
  const groups = {}
  rows.forEach((row) => {
    const key = String(row[keyHeader] || '')
    ;(groups[key] = groups[key] || []).push(row)
  })
  return groups
}

function buildOrdersUncached(customerId) {
  ensureOrderHeaders()
  const allOrders = sheetToObjects(getSheet('Orders'))
  const orders = customerId
    ? allOrders.filter((row) => String(row.CustomerID || '') === customerId)
    : allOrders
  // Index the other sheets once so each order is a lookup, not a scan.
  const itemsByOrder = groupBy(sheetToObjects(getSheet('OrderItems')), 'OrderID')
  const customersById = {}
  sheetToObjects(getSheet('Customers')).forEach((entry) => {
    const key = String(entry.CustomerID || '')
    if (!(key in customersById)) customersById[key] = entry
  })
  const shipmentsByOrder = {}
  sheetToObjects(getSheet('Shipments')).forEach((entry) => {
    const key = String(entry.OrderID || '')
    if (!(key in shipmentsByOrder)) shipmentsByOrder[key] = entry
  })

  // The same proof image on more than one order is a common sign of a faked or reused proof.
  const proofCounts = {}
  allOrders.forEach((row) => {
    const hash = String(row.ProofHash || '')
    if (hash) proofCounts[hash] = (proofCounts[hash] || 0) + 1
  })

  return orders.map((row) => {
    const orderId = String(row.OrderID || '')
    const customer = customersById[String(row.CustomerID || '')] || {}
    const shipment = shipmentsByOrder[orderId] || {}
    const notes = parseOrderNotes(row.Notes)
    const rows = itemsByOrder[orderId] || []
    const proofHash = String(row.ProofHash || '')

    return {
      id: orderId,
      customerId: row.CustomerID || '',
      date: row.OrderDate || '',
      subtotal: Number(row.Subtotal) || 0,
      shipping: Number(row.ShippingFee) || 0,
      total: Number(row.TotalAmount) || 0,
      paymentMethod: row.PaymentMethod || '',
      paymentStatus: row.PaymentStatus || 'Pending',
      paymentSubmittedAt: row.PaymentSubmittedAt || '',
      paymentVerifiedAt: row.PaymentVerifiedAt || '',
      paymentRejectReason: row.PaymentRejectReason || '',
      hasProof: Boolean(row.ProofURL),
      duplicateProof: Boolean(proofHash) && proofCounts[proofHash] > 1,
      status: row.OrderStatus || 'Awaiting payment',
      receiptNumber: row.ReceiptNumber || notes.receiptNumber || '',
      receiptURL: row.ReceiptURL || notes.receiptURL || '',
      trackingNumber: shipment.TrackingNumber || '',
      courier: shipment.Courier || '',
      isSimulated: shipment.IsSimulated === true || String(shipment.IsSimulated).toUpperCase() === 'TRUE',
      customer: {
        name: customer.CustomerName || shipment.RecipientName || '',
        email: customer.Email || '',
        phone: customer.Phone || shipment.RecipientPhone || '',
        street: notes.customerAddress?.street || '',
        landmark: row.Landmark || notes.customerAddress?.landmark || '',
        barangay: row.Barangay || notes.customerAddress?.barangay || '',
        city: row.City || notes.customerAddress?.city || '',
        province: notes.customerAddress?.province || '',
        address: shipment.DeliveryAddress || '',
        instructions: notes.customerInstructions || ''
      },
      items: rows.map((item, index) => {
        const detail = (notes.items || [])[index] || {}
        return {
          id: item.OrderItemID,
          shape: detail.shape || item.ProductID || 'custom',
          name: detail.name || 'Custom keychain',
          chain: detail.chain || '',
          qty: Number(item.Quantity) || 1,
          price: Number(item.UnitPrice) || 0,
          image: detail.imageURL || '',
          nfcLink: detail.nfcLink || ''
        }
      })
    }
  })
}

function assignMissingSimulatedTrackingNumbers() {
  const lock = LockService.getScriptLock()
  lock.waitLock(10000)
  try {
    const sheet = getSheet('Shipments')
    const values = sheet.getDataRange().getValues()
    const headers = values[0] || []
    const trackingColumn = headers.indexOf('TrackingNumber')
    const courierColumn = headers.indexOf('Courier')
    const simulatedColumn = headers.indexOf('IsSimulated')
    if (trackingColumn < 0 || courierColumn < 0 || simulatedColumn < 0) {
      throw new Error('Shipments sheet is missing a required tracking or simulation header')
    }

    for (let row = 1; row < values.length; row++) {
      const isSimulated = values[row][simulatedColumn] === true
        || String(values[row][simulatedColumn]).toUpperCase() === 'TRUE'
      if (!isSimulated) continue
      const trackingNumber = String(values[row][trackingColumn] || '')
      if (!/^JT-\d+$/.test(trackingNumber)) {
        sheet.getRange(row + 1, trackingColumn + 1).setValue(genTrackingNumber())
      }
      if (!values[row][courierColumn]) {
        sheet.getRange(row + 1, courierColumn + 1).setValue('J&T Express')
      }
    }
  } finally {
    lock.releaseLock()
  }
}

function genTrackingNumber() {
  return 'JT-' + Date.now() + String(Math.floor(Math.random() * 10000)).padStart(4, '0')
}

function parseOrderNotes(value) {
  try {
    return JSON.parse(value || '{}')
  } catch (error) {
    return { customerInstructions: String(value || ''), items: [] }
  }
}

function getDesignFolder() {
  const folders = DriveApp.getFoldersByName(DESIGN_FOLDER_NAME)
  return folders.hasNext() ? folders.next() : DriveApp.createFolder(DESIGN_FOLDER_NAME)
}

function getProofFolder() {
  const folders = DriveApp.getFoldersByName(PROOF_FOLDER_NAME)
  return folders.hasNext() ? folders.next() : DriveApp.createFolder(PROOF_FOLDER_NAME)
}

function authorizeDriveAccess() {
  const spreadsheet = getDb()
  const sheetCount = spreadsheet.getSheets().length
  const designFolder = getDesignFolder()
  const receiptFolder = getReceiptFolder()
  const proofFolder = getProofFolder()
  return 'Spreadsheet access is ready (' + sheetCount + ' sheets). Drive folders: '
    + designFolder.getName() + ', ' + receiptFolder.getName() + ', ' + proofFolder.getName()
}

function getReceiptFolder() {
  const folders = DriveApp.getFoldersByName('TAPik Receipts')
  return folders.hasNext() ? folders.next() : DriveApp.createFolder('TAPik Receipts')
}

function createOrderReceipt(receipt) {
  const customer = receipt.customer || {}
  const items = Array.isArray(receipt.items) ? receipt.items : []
  const itemRows = items.map((item) => {
    const quantity = Number(item.qty) || 1
    const unitPrice = Number(item.price) || 0
    const description = [item.shape || item.shapeName || item.name || 'Custom keychain', item.chain]
      .filter(Boolean).join(' · ')
    return '<tr><td>' + escapeHtml(description) + '</td><td>' + quantity
      + '</td><td>PHP ' + unitPrice.toFixed(2) + '</td><td>PHP '
      + (quantity * unitPrice).toFixed(2) + '</td></tr>'
  }).join('')
  const html = '<!doctype html><html><head><meta charset="utf-8"><style>'
    + 'body{font:14px Arial,sans-serif;color:#493f37;padding:36px}h1{margin:0;color:#5799b1}'
    + '.muted{color:#74665c}.meta{margin:22px 0;line-height:1.7}'
    + 'table{width:100%;border-collapse:collapse;margin-top:20px}'
    + 'th,td{padding:10px;border-bottom:1px solid #e2d4c3;text-align:left}'
    + 'th{background:#fff8ec}.totals{margin:20px 0 0 auto;width:260px;line-height:1.8}'
    + '.notice{margin-top:32px;padding:12px;background:#fff8ec;font-size:11px}'
    + '</style></head><body><h1>TAPik</h1><p class="muted">Order receipt / acknowledgment</p>'
    + '<div class="meta"><strong>Receipt No.:</strong> ' + escapeHtml(receipt.receiptNumber)
    + '<br><strong>Order ID:</strong> ' + escapeHtml(receipt.orderId)
    + '<br><strong>Date:</strong> ' + escapeHtml(new Date(receipt.date).toLocaleString())
    + '<br><strong>Customer:</strong> ' + escapeHtml(customer.name || '')
    + '<br><strong>Email:</strong> ' + escapeHtml(customer.email || '')
    + '<br><strong>Payment method:</strong> ' + escapeHtml(receipt.paymentMethod)
    + '<br><strong>Payment status:</strong> ' + escapeHtml(receipt.paymentStatus)
    + '</div><table><thead><tr><th>Item</th><th>Qty</th><th>Unit price</th><th>Amount</th></tr></thead>'
    + '<tbody>' + itemRows + '</tbody></table><div class="totals">'
    + 'Subtotal: PHP ' + (Number(receipt.subtotal) || 0).toFixed(2)
    + '<br>Shipping: PHP ' + (Number(receipt.shipping) || 0).toFixed(2)
    + '<br><strong>Total: PHP ' + (Number(receipt.total) || 0).toFixed(2) + '</strong>'
    + '</div><p class="notice">This document is an order receipt and acknowledgment. '
    + 'It is not a BIR-registered tax invoice. Payment is acknowledged only when the payment status above is Paid.</p>'
    + '</body></html>'
  const pdf = Utilities.newBlob(html, MimeType.HTML, receipt.receiptNumber + '.html')
    .getAs(MimeType.PDF)
    .setName(receipt.receiptNumber + '.pdf')
  const file = getReceiptFolder().createFile(pdf)
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW)
  return 'https://drive.google.com/uc?export=download&id=' + file.getId()
}

function getReceipt(data) {
  const orderId = String(data.orderId || '')
  if (!orderId) return { ok: false, error: 'Order ID is required' }
  const sheet = getSheet('Orders')
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
  const orderColumn = headers.indexOf('OrderID')
  const receiptNumberColumn = headers.indexOf('ReceiptNumber')
  const receiptUrlColumn = headers.indexOf('ReceiptURL')
  if (orderColumn < 0 || receiptUrlColumn < 0) {
    return { ok: false, error: 'Orders sheet is missing receipt columns' }
  }

  const rows = sheet.getDataRange().getValues()
  const row = rows.slice(1).find((values) => String(values[orderColumn]) === orderId)
  if (!row) return { ok: false, error: 'Order not found' }
  const paymentColumn = headers.indexOf('PaymentStatus')
  if (paymentColumn < 0 || row[paymentColumn] !== 'Paid') {
    return { ok: false, error: 'The receipt is available once the payment is confirmed.' }
  }
  const receiptUrl = String(row[receiptUrlColumn] || '')
  const match = receiptUrl.match(/[?&]id=([^&]+)/) || receiptUrl.match(/\/file\/d\/([^/?]+)/)
  if (!match) return { ok: false, error: 'Stored receipt link is missing a Drive file ID' }

  const file = DriveApp.getFileById(decodeURIComponent(match[1]))
  return {
    ok: true,
    receiptNumber: receiptNumberColumn >= 0 ? row[receiptNumberColumn] || '' : '',
    fileName: file.getName(),
    mimeType: file.getMimeType(),
    data: Utilities.base64Encode(file.getBlob().getBytes())
  }
}

function getDesignImage(data) {
  const fileId = String(data.fileId || '')
  if (!/^[a-zA-Z0-9_-]+$/.test(fileId)) {
    return { ok: false, error: 'A valid design file ID is required' }
  }

  const file = DriveApp.getFileById(fileId)
  const parents = file.getParents()
  const designFolderId = getDesignFolder().getId()
  let belongsToDesignFolder = false
  while (parents.hasNext()) {
    if (parents.next().getId() === designFolderId) {
      belongsToDesignFolder = true
      break
    }
  }
  if (!belongsToDesignFolder) {
    return { ok: false, error: 'The requested file is not a stored customer design' }
  }

  const blob = file.getThumbnail() || file.getBlob()
  return {
    ok: true,
    mimeType: blob.getContentType(),
    data: Utilities.base64Encode(blob.getBytes())
  }
}

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function saveDesignImage(image) {
  if (!image || image.indexOf('data:') !== 0) return image
  const match = image.match(/^data:([^;]+);base64,([\s\S]+)$/)
  if (!match) throw new Error('Uploaded design image is not a valid data URL')
  const mimeType = match[1]
  const bytes = Utilities.base64Decode(match[2])
  const extension = mimeType.split('/')[1].replace(/[^a-zA-Z0-9]/g, '') || 'img'
  const blob = Utilities.newBlob(bytes, mimeType, genId('design') + '.' + extension)
  const file = getDesignFolder().createFile(blob)
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW)
  return 'https://drive.google.com/uc?export=view&id=' + file.getId()
}

// Proofs of payment stay private in Drive; the admin page reads them through getPaymentProof.
function saveProofImage(image, orderId) {
  const match = String(image).match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([\s\S]+)$/)
  if (!match) throw new Error('Proof of payment is not a valid image')
  const bytes = Utilities.base64Decode(match[2])
  if (bytes.length > 8 * 1024 * 1024) throw new Error('Proof of payment image is too large')
  const extension = match[1].split('/')[1].replace(/[^a-zA-Z0-9]/g, '') || 'img'
  const blob = Utilities.newBlob(bytes, match[1], 'proof_' + orderId + '_' + Date.now() + '.' + extension)
  const file = getProofFolder().createFile(blob)
  return {
    url: 'https://drive.google.com/file/d/' + file.getId() + '/view',
    hash: proofFingerprint(bytes)
  }
}

function proofFingerprint(bytes) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, bytes)
    .map(function (byte) { return ('0' + (byte & 0xff).toString(16)).slice(-2) })
    .join('')
}

function saveProduct(data) {
  const headers = assertHeaders('Products', [
    'ProductID', 'ProductName', 'Description', 'Category', 'Price', 'Stock', 'ImageURL',
    'WeightGrams', 'IsActive', 'CreatedAt', 'UpdatedAt'
  ])
  const productId = data.id || genId('PROD')
  const existing = sheetToObjects(getSheet('Products')).find((product) => String(product.ProductID) === String(productId)) || {}
  const record = {
    ProductID: productId,
    ProductName: data.name || '',
    Description: data.description || '',
    Category: data.category || 'Keychains',
    Price: Number(data.price) || 0,
    Stock: Number(data.stock) || 0,
    ImageURL: data.imageUrl || '',
    WeightGrams: Number(data.weightGrams) || 50,
    IsActive: data.isActive !== false,
    CreatedAt: existing.CreatedAt || new Date(),
    UpdatedAt: new Date()
  }
  if (!headers.length) throw new Error('Products sheet has no headers')
  upsertByKey('Products', 'ProductID', productId, record)
  return { ok: true, productId: productId }
}

function deleteProduct(data) {
  const sheet = getSheet('Products')
  const values = sheet.getDataRange().getValues()
  const idColumn = (values[0] || []).indexOf('ProductID')
  if (idColumn < 0) return { ok: false, error: 'Products sheet is missing ProductID header' }
  for (let row = 1; row < values.length; row++) {
    if (String(values[row][idColumn]) === String(data.productId)) {
      sheet.deleteRow(row + 1)
      return { ok: true }
    }
  }
  return { ok: false, error: 'Product not found' }
}