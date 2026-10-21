import { SHAPES, CHAINS } from './pricing'

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')

const money = (amount) =>
  (Number(amount) || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const labelOf = (list, id) => list.find((option) => option.id === id)?.label || id || ''

export const receiptNumberOf = (order) => order.receiptNumber || `RCP-${order.id}`

// A complete, print-ready receipt page for a paid order. The same page is shown in the viewer and printed.
export function buildReceiptHtml(order) {
  const customer = order.customer || {}
  const address = [customer.street, customer.landmark && `(${customer.landmark})`, customer.barangay, customer.city, customer.province]
    .filter(Boolean).join(', ') || customer.address || ''
  const rows = (order.items || []).map((item) => {
    const quantity = Number(item.qty) || 1
    const unitPrice = Number(item.price) || 0
    const description = [labelOf(SHAPES, item.shape), labelOf(CHAINS, item.chain)].filter(Boolean).join(' · ') || 'Custom keychain'
    return `<tr><td>${escapeHtml(description)}</td><td class="num">${quantity}</td><td class="num">PHP ${money(unitPrice)}</td><td class="num">PHP ${money(quantity * unitPrice)}</td></tr>`
  }).join('')
  const paidOn = order.paymentVerifiedAt ? new Date(order.paymentVerifiedAt).toLocaleString() : ''

  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(receiptNumberOf(order))}</title>
<style>
  body{font:14px Arial,sans-serif;color:#172554;margin:0;padding:32px;background:#fff}
  h1{margin:0;color:#2563eb}.muted{color:#475569}.meta{margin:20px 0;line-height:1.7}
  table{width:100%;border-collapse:collapse;margin-top:18px}
  th,td{padding:9px 8px;border-bottom:1px solid #cbd5e1;text-align:left}th{background:#eff6ff}
  .num{text-align:right;white-space:nowrap}.totals{margin:18px 0 0 auto;width:280px;line-height:1.9}
  .totals div{display:flex;justify-content:space-between}.grand{font-weight:bold;border-top:1px solid #cbd5e1;margin-top:4px;padding-top:4px}
  .paid{display:inline-block;margin-top:6px;padding:2px 10px;border-radius:999px;background:#bbf7d0;color:#14532d;font-size:12px;font-weight:bold}
  .notice{margin-top:28px;padding:10px 12px;background:#f1f5f9;font-size:11px;color:#475569}
  @media print{body{padding:12mm}}
</style></head><body>
<h1>TAPik</h1>
<p class="muted">Order receipt</p>
<div class="meta">
  <strong>Receipt No.:</strong> ${escapeHtml(receiptNumberOf(order))}<br>
  <strong>Order ID:</strong> ${escapeHtml(order.id)}<br>
  <strong>Order date:</strong> ${escapeHtml(order.date ? new Date(order.date).toLocaleString() : '')}<br>
  ${paidOn ? `<strong>Payment confirmed:</strong> ${escapeHtml(paidOn)}<br>` : ''}
  <strong>Customer:</strong> ${escapeHtml(customer.name || '')}${customer.phone ? ` · ${escapeHtml(customer.phone)}` : ''}<br>
  ${customer.email ? `<strong>Email:</strong> ${escapeHtml(customer.email)}<br>` : ''}
  <strong>Deliver to:</strong> ${escapeHtml(address)}<br>
  <strong>Payment method:</strong> ${escapeHtml(order.paymentMethod || 'QR')}
  <span class="paid">PAID</span>
</div>
<table><thead><tr><th>Item</th><th class="num">Qty</th><th class="num">Unit price</th><th class="num">Amount</th></tr></thead><tbody>${rows}</tbody></table>
<div class="totals">
  <div><span>Subtotal</span><span>PHP ${money(order.subtotal)}</span></div>
  <div><span>Shipping</span><span>PHP ${money(order.shipping)}</span></div>
  <div class="grand"><span>Total</span><span>PHP ${money(order.total)}</span></div>
</div>
<p class="notice">This document is an order receipt. It is not a BIR-registered tax invoice.</p>
</body></html>`
}
