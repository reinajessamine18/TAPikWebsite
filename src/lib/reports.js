import { SHAPES, CHAINS } from './pricing'
import { displayOrderStatus, paymentLabel } from './orderStatus'

export const ALL_STATUSES = 'All statuses'

export const EMPTY_FILTERS = {
  search: '',
  status: ALL_STATUSES,
  city: '',
  barangay: '',
  from: '',
  to: '',
  shape: '',
  chain: '',
}

const pad = (value) => String(value).padStart(2, '0')

// yyyy-mm-dd in the admin's local time, to compare with the date inputs.
export function localDateKey(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

const INACTIVE_STATUSES = ['Cancelled', 'Payment rejected']
export const isActiveOrder = (order) => !INACTIVE_STATUSES.includes(displayOrderStatus(order.status))

const labelFor = (type, id) =>
  (type === 'shape' ? SHAPES : CHAINS).find((option) => option.id === id)?.label || id || 'Unspecified'

export function filterOrders(orders, filters) {
  const query = filters.search.trim().toLowerCase()
  return orders.filter((order) => {
    const customer = order.customer || {}
    const items = order.items || []

    if (query) {
      const searchable = [
        order.id, customer.name, customer.email, customer.phone,
        ...items.flatMap((item) => [item.shape, item.name, item.chain, item.nfcLink]),
      ]
      if (!searchable.some((value) => String(value || '').toLowerCase().includes(query))) return false
    }
    if (filters.status !== ALL_STATUSES && displayOrderStatus(order.status) !== filters.status) return false
    if (filters.city && customer.city !== filters.city) return false
    if (filters.barangay && customer.barangay !== filters.barangay) return false
    if (filters.from || filters.to) {
      const key = localDateKey(order.date)
      if (!key) return false
      if (filters.from && key < filters.from) return false
      if (filters.to && key > filters.to) return false
    }
    if (filters.shape && !items.some((item) => item.shape === filters.shape)) return false
    if (filters.chain && !items.some((item) => item.chain === filters.chain)) return false
    return true
  })
}

export function activeFilterCount(filters) {
  return [
    filters.search.trim(), filters.status !== ALL_STATUSES, filters.city, filters.barangay,
    filters.from, filters.to, filters.shape, filters.chain,
  ].filter(Boolean).length
}

// The filters in use, one entry each: its text, and what to reset to remove just that filter.
export function filterChips(filters) {
  const chips = []
  if (filters.search.trim()) chips.push({ key: 'search', label: `Search: "${filters.search.trim()}"`, clear: { search: '' } })
  if (filters.status !== ALL_STATUSES) chips.push({ key: 'status', label: `Status: ${filters.status}`, clear: { status: ALL_STATUSES } })
  if (filters.city) chips.push({ key: 'city', label: `City: ${filters.city}`, clear: { city: '', barangay: '' } })
  if (filters.barangay) chips.push({ key: 'barangay', label: `Barangay: ${filters.barangay}`, clear: { barangay: '' } })
  if (filters.from || filters.to) {
    const label = filters.from && filters.to
      ? (filters.from === filters.to ? `Date: ${filters.from}` : `Date: ${filters.from} to ${filters.to}`)
      : (filters.from ? `Date: from ${filters.from}` : `Date: up to ${filters.to}`)
    chips.push({ key: 'date', label, clear: { from: '', to: '' } })
  }
  if (filters.shape) chips.push({ key: 'shape', label: `Shape: ${labelFor('shape', filters.shape)}`, clear: { shape: '' } })
  if (filters.chain) chips.push({ key: 'chain', label: `Chain: ${labelFor('chain', filters.chain)}`, clear: { chain: '' } })
  return chips
}

// Human-readable list of the filters in use, for the report.
export function describeFilters(filters) {
  return filterChips(filters).map((chip) => chip.label)
}

// Units sold per shape or chain. Cancelled and rejected orders are left out unless asked for.
export function topItems(orders, type, includeInactive = false) {
  const counted = includeInactive ? orders : orders.filter(isActiveOrder)
  const totals = new Map()
  counted.forEach((order) => {
    const seenInOrder = new Set()
    ;(order.items || []).forEach((item) => {
      const id = item[type] || ''
      const entry = totals.get(id) || { id, label: labelFor(type, id), units: 0, orders: 0 }
      entry.units += Number(item.qty) || 1
      if (!seenInOrder.has(id)) {
        entry.orders += 1
        seenInOrder.add(id)
      }
      totals.set(id, entry)
    })
  })
  const rows = [...totals.values()].sort((a, b) => b.units - a.units || a.label.localeCompare(b.label))
  const totalUnits = rows.reduce((sum, row) => sum + row.units, 0)
  return rows.map((row) => ({ ...row, share: totalUnits ? Math.round((row.units / totalUnits) * 100) : 0 }))
}

export function summarize(orders) {
  const byStatus = {}
  orders.forEach((order) => {
    const status = displayOrderStatus(order.status)
    byStatus[status] = (byStatus[status] || 0) + 1
  })
  const sales = orders
    .filter((order) => order.paymentStatus === 'Paid' && displayOrderStatus(order.status) !== 'Cancelled')
    .reduce((sum, order) => sum + (Number(order.total) || 0), 0)
  return { orderCount: orders.length, sales, byStatus }
}

// Headline numbers for the Orders tab, for whichever orders are passed in (usually the filtered ones).
export function orderKpis(orders) {
  const paid = orders.filter((order) => order.paymentStatus === 'Paid' && displayOrderStatus(order.status) !== 'Cancelled')
  const sales = paid.reduce((sum, order) => sum + (Number(order.total) || 0), 0)
  const units = orders.filter(isActiveOrder).reduce(
    (sum, order) => sum + (order.items || []).reduce((count, item) => count + (Number(item.qty) || 1), 0),
    0
  )
  const countStatus = (status) => orders.filter((order) => displayOrderStatus(order.status) === status).length
  return {
    orders: orders.length,
    sales,
    paidOrders: paid.length,
    average: paid.length ? sales / paid.length : 0,
    units,
    toVerify: countStatus('Payment submitted'),
    toPrepare: countStatus('Confirmed payment') + countStatus('Being prepared'),
  }
}

const money = (amount) =>
  (Number(amount) || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const itemSummary = (order) =>
  (order.items || [])
    .map((item) => `${labelFor('shape', item.shape)} / ${labelFor('chain', item.chain)} x${Number(item.qty) || 1}`)
    .join('; ')

const orderAddress = (order) => {
  const customer = order.customer || {}
  return [customer.street, customer.barangay, customer.city, customer.province].filter(Boolean).join(', ')
    || customer.address || ''
}

const BOM = String.fromCharCode(0xfeff)

const csvCell = (value) => {
  const text = String(value ?? '')
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function buildCsv(orders) {
  const header = [
    'Order ID', 'Date', 'Customer', 'Email', 'Phone', 'City', 'Barangay', 'Address',
    'Status', 'Payment', 'Items', 'Subtotal', 'Shipping', 'Total', 'Tracking',
  ]
  const rows = orders.map((order) => [
    order.id,
    order.date ? localDateKey(order.date) : '',
    order.customer?.name, order.customer?.email, order.customer?.phone,
    order.customer?.city, order.customer?.barangay, orderAddress(order),
    displayOrderStatus(order.status), paymentLabel(order), itemSummary(order),
    Number(order.subtotal) || 0, Number(order.shipping) || 0, Number(order.total) || 0,
    order.trackingNumber,
  ])
  // The leading BOM makes Excel read the file as UTF-8 (names like "Parañaque").
  return `${BOM}${[header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n')}\r\n`
}

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')

export function buildReportHtml(orders, filters) {
  const summary = summarize(orders)
  const kpis = orderKpis(orders)
  const filterText = describeFilters(filters)
  const kpiCards = [
    ['Orders', kpis.orders],
    ['Sales (confirmed payments)', `PHP ${money(kpis.sales)}`],
    ['Items sold', kpis.units],
    ['Average order', `PHP ${money(kpis.average)}`],
    ['Needs attention', `${kpis.toVerify} to verify, ${kpis.toPrepare} to prepare`],
  ].map(([label, value]) => `<div class="kpi"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join('')
  const topTable = (title, rows) => `
    <h3>${escapeHtml(title)}</h3>
    ${rows.length ? `<table><thead><tr><th>Item</th><th>Units</th><th>Orders</th></tr></thead><tbody>
      ${rows.map((row) => `<tr><td>${escapeHtml(row.label)}</td><td>${row.units}</td><td>${row.orders}</td></tr>`).join('')}
    </tbody></table>` : '<p class="muted">No orders.</p>'}`

  const statusRows = Object.entries(summary.byStatus)
    .map(([status, count]) => `<tr><td>${escapeHtml(status)}</td><td>${count}</td></tr>`).join('')
  const orderRows = [...orders]
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
    .map((order) => `<tr>
      <td>${escapeHtml(order.id)}</td>
      <td>${escapeHtml(order.date ? localDateKey(order.date) : '')}</td>
      <td>${escapeHtml(order.customer?.name)}</td>
      <td>${escapeHtml([order.customer?.barangay, order.customer?.city].filter(Boolean).join(', '))}</td>
      <td>${escapeHtml(itemSummary(order))}</td>
      <td>${escapeHtml(displayOrderStatus(order.status))}</td>
      <td class="num">${money(order.total)}</td>
    </tr>`).join('')

  return `<!doctype html><html><head><meta charset="utf-8"><title>TAPik report</title>
<style>
  body{font:13px Arial,sans-serif;color:#172554;margin:28px}
  h1{margin:0;color:#2563eb;font-size:22px}h2{margin:22px 0 6px;font-size:16px}h3{margin:14px 0 4px;font-size:13px}
  .muted{color:#475569}table{width:100%;border-collapse:collapse;margin-top:6px}
  th,td{padding:6px 8px;border-bottom:1px solid #cbd5e1;text-align:left;vertical-align:top}
  th{background:#eff6ff}.num{text-align:right;white-space:nowrap}
  .kpis{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-top:10px}
  .kpi{border:1px solid #cbd5e1;border-radius:6px;padding:8px 10px}
  .kpi span{display:block;color:#475569;font-size:11px}.kpi strong{display:block;margin-top:2px;font-size:15px}
  .two{display:grid;grid-template-columns:1fr 1fr;gap:24px}
  @media print{body{margin:12mm}tr{page-break-inside:avoid}}
</style></head><body>
<h1>TAPik sales report</h1>
<p class="muted">Generated ${escapeHtml(new Date().toLocaleString())}</p>
<p><strong>Filters:</strong> ${filterText.length ? escapeHtml(filterText.join(' · ')) : 'None (all orders)'}</p>
<div class="kpis">${kpiCards}</div>
<h2>Orders by status</h2>
<table><tbody>${statusRows || '<tr><td class="muted">No orders.</td></tr>'}</tbody></table>
<h2>Most ordered</h2>
<p class="muted">Cancelled and rejected orders are not counted.</p>
<div class="two"><div>${topTable('Shapes', topItems(orders, 'shape'))}</div><div>${topTable('Chains', topItems(orders, 'chain'))}</div></div>
<h2>Orders</h2>
<table><thead><tr><th>Order</th><th>Date</th><th>Customer</th><th>Location</th><th>Items</th><th>Status</th><th class="num">Total (PHP)</th></tr></thead>
<tbody>${orderRows || '<tr><td colspan="7" class="muted">No orders match the filters.</td></tr>'}</tbody></table>
</body></html>`
}

export function downloadTextFile(fileName, text, mimeType) {
  const url = URL.createObjectURL(new Blob([text], { type: mimeType }))
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// Opens the report in a new tab and starts printing, where it can be saved as PDF. False if blocked.
export function openPrintableReport(html) {
  const reportWindow = window.open('', '_blank')
  if (!reportWindow) return false
  reportWindow.document.open()
  reportWindow.document.write(html)
  reportWindow.document.close()
  reportWindow.focus()
  window.setTimeout(() => reportWindow.print(), 300)
  return true
}
