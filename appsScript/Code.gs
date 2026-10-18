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

function createOrder(data) {
  const lock = LockService.getScriptLock()
  lock.waitLock(10000)
  try {
    assertHeaders('Orders', [
      'OrderID', 'CustomerID', 'OrderDate', 'Subtotal', 'ShippingFee', 'TotalAmount',
      'PaymentMethod', 'PaymentStatus', 'OrderStatus', 'ShippingAddressID', 'Notes'
    ])
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
    const now = new Date()

    // Upload designs before writing the order so a Drive permission error cannot leave a partial order.
    const itemDetails = items.map((item) => ({
      name: item.shapeName || 'Custom keychain',
      shape: item.shape || '',
      chain: item.chain || '',
      imageURL: saveDesignImage(item.image || ''),
      nfcLink: item.nfcLink || ''
    }))

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
      ShippingFee: Number(data.shipping) || 0,
      TotalAmount: Number(data.total) || 0,
      PaymentMethod: data.paymentMethod || 'Manual',
      PaymentStatus: data.paymentStatus || 'Pending',
      OrderStatus: data.status || 'Pending',
      ShippingAddressID: data.shippingAddressId || '',
      Notes: JSON.stringify({
        customerInstructions: customer.instructions || '',
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
      Courier: '',
      TrackingNumber: data.trackingNumber || '',
      ShipmentStatus: data.status || 'Pending',
      RecipientName: customer.name || '',
      RecipientPhone: customer.phone || '',
      DeliveryAddress: deliveryAddress,
      BookedAt: now,
      ShippedAt: '',
      DeliveredAt: '',
      TrackingURL: '',
      IsSimulated: true,
      Remarks: 'Awaiting courier booking'
    })

    return { ok: true, orderId: orderId, trackingNumber: data.trackingNumber || '' }
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
        trackingNumber: shipment.TrackingNumber || '',
        customer: {
          name: customer.CustomerName || shipment.RecipientName || '',
          email: customer.Email || '',
          phone: customer.Phone || shipment.RecipientPhone || '',
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
  const folder = getDesignFolder()
  return 'Spreadsheet access is ready (' + sheetCount + ' sheets). Drive upload folder: ' + folder.getName()
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
  return file.getUrl()
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