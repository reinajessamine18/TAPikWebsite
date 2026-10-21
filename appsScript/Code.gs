// Google Apps Script backend for TAPikWebsite.
// Deploy as a Web app that executes as the spreadsheet owner.

const DESIGN_FOLDER_NAME = 'TAPik Customer Designs'

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
    ensureHeaders('Orders', ['ReceiptNumber', 'ReceiptURL'])
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
    const shipmentSheet = getSheet('Shipments')
    const existingShipment = sheetToObjects(shipmentSheet)
      .find((shipment) => String(shipment.OrderID || '') === String(orderId)) || {}
    const existingTrackingNumber = String(existingShipment.TrackingNumber || '')
    const trackingNumber = /^JT-\d+$/.test(existingTrackingNumber)
      ? existingTrackingNumber
      : genTrackingNumber()

    // Upload designs before writing the order so a Drive permission error cannot leave a partial order.
    const itemDetails = items.map((item) => ({
      name: item.shapeName || 'Custom keychain',
      shape: item.shape || '',
      chain: item.chain || '',
      imageURL: saveDesignImage(item.image || ''),
      nfcLink: item.nfcLink || ''
    }))
    const receiptNumber = existingOrder.ReceiptNumber || existingNotes.receiptNumber || 'RCP-' + orderId
    const receiptURL = existingOrder.ReceiptURL || existingNotes.receiptURL || createOrderReceipt({
      receiptNumber: receiptNumber,
      orderId: orderId,
      date: data.date ? new Date(data.date) : now,
      customer: customer,
      items: items,
      subtotal: data.subtotal,
      shipping: shippingFee,
      total: orderTotal,
      paymentMethod: data.paymentMethod || 'Manual',
      paymentStatus: data.paymentStatus || 'Pending'
    })

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
      PaymentMethod: data.paymentMethod || 'Manual',
      PaymentStatus: data.paymentStatus || 'Pending',
      OrderStatus: data.status || 'Pending',
      ShippingAddressID: data.shippingAddressId || '',
      ReceiptNumber: receiptNumber,
      ReceiptURL: receiptURL,
      Notes: JSON.stringify({
        customerInstructions: customer.instructions || '',
        customerAddress: {
          street: customer.street || '',
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
      ShipmentStatus: data.status || 'Pending',
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
    lock.releaseLock()
  }
}

function updateOrderStatus(data) {
  const sheet = getSheet('Orders')
  const values = sheet.getDataRange().getValues()
  const headers = values[0] || []
  const statusColumn = headers.indexOf('OrderStatus')
  const idColumn = headers.indexOf('OrderID')
  if (statusColumn < 0 || idColumn < 0) {
    return { ok: false, error: 'Orders sheet is missing OrderID or OrderStatus header' }
  }

  for (let row = 1; row < values.length; row++) {
    if (String(values[row][idColumn]) === String(data.orderId)) {
      sheet.getRange(row + 1, statusColumn + 1).setValue(data.status)
      const shipmentSheet = getSheet('Shipments')
      const shipmentValues = shipmentSheet.getDataRange().getValues()
      const shipmentHeaders = shipmentValues[0] || []
      const shipmentOrderColumn = shipmentHeaders.indexOf('OrderID')
      const shipmentStatusColumn = shipmentHeaders.indexOf('ShipmentStatus')
      if (shipmentOrderColumn >= 0 && shipmentStatusColumn >= 0) {
        for (let shipmentRow = 1; shipmentRow < shipmentValues.length; shipmentRow++) {
          if (String(shipmentValues[shipmentRow][shipmentOrderColumn]) === String(data.orderId)) {
            shipmentSheet.getRange(shipmentRow + 1, shipmentStatusColumn + 1).setValue(data.status)
          }
        }
      }
      return { ok: true }
    }
  }
  return { ok: false, error: 'Order not found' }
}

function getAdminData() {
  assignMissingSimulatedTrackingNumbers()
  ensureHeaders('Orders', ['ReceiptNumber', 'ReceiptURL'])
  const orders = sheetToObjects(getSheet('Orders'))
  const orderItems = sheetToObjects(getSheet('OrderItems'))
  const customers = sheetToObjects(getSheet('Customers'))
  const shipments = sheetToObjects(getSheet('Shipments'))

  return {
    orders: orders.map((row) => {
      const orderId = String(row.OrderID || '')
      const customer = customers.find((entry) => String(entry.CustomerID || '') === String(row.CustomerID || '')) || {}
      const shipment = shipments.find((entry) => String(entry.OrderID || '') === orderId) || {}
      const notes = parseOrderNotes(row.Notes)
      const rows = orderItems.filter((entry) => String(entry.OrderID || '') === orderId)

      return {
        id: orderId,
        customerId: row.CustomerID || '',
        date: row.OrderDate || '',
        subtotal: Number(row.Subtotal) || 0,
        shipping: Number(row.ShippingFee) || 0,
        total: Number(row.TotalAmount) || 0,
        paymentMethod: row.PaymentMethod || '',
        paymentStatus: row.PaymentStatus || '',
        status: row.OrderStatus || 'Processing',
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
          barangay: notes.customerAddress?.barangay || '',
          city: notes.customerAddress?.city || '',
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
    }),
    products: sheetToObjects(getSheet('Products'))
  }
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

function authorizeDriveAccess() {
  const spreadsheet = getDb()
  const sheetCount = spreadsheet.getSheets().length
  const designFolder = getDesignFolder()
  const receiptFolder = getReceiptFolder()
  return 'Spreadsheet access is ready (' + sheetCount + ' sheets). Drive folders: '
    + designFolder.getName() + ', ' + receiptFolder.getName()
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
    + 'body{font:14px Arial,sans-serif;color:#172554;padding:36px}h1{margin:0;color:#2563eb}'
    + '.muted{color:#475569}.meta{margin:22px 0;line-height:1.7}'
    + 'table{width:100%;border-collapse:collapse;margin-top:20px}'
    + 'th,td{padding:10px;border-bottom:1px solid #cbd5e1;text-align:left}'
    + 'th{background:#eff6ff}.totals{margin:20px 0 0 auto;width:260px;line-height:1.8}'
    + '.notice{margin-top:32px;padding:12px;background:#f1f5f9;font-size:11px}'
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