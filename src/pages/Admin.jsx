import { useEffect, useState } from 'react'
import { loadOrders, saveOrders } from '../lib/storage'
import { api, downloadReceipt } from '../services/api'
import { displayOrderStatus, orderStatusColor, paymentLabel, ORDER_STATUSES, FULFILLMENT_STATUSES } from '../lib/orderStatus'
import { SHAPES, CHAINS, METRO_MANILA_CITIES } from '../lib/pricing'
import { getBarangays } from '../data/metroManila'
import { ALL_STATUSES, EMPTY_FILTERS, activeFilterCount, filterChips, filterOrders, orderKpis, topItems } from '../lib/reports'
import { itemKey, stockLevel, useInventory } from '../lib/inventory'
import PaymentReview from '../components/PaymentReview'
import OrderDetails from '../components/OrderDetails'
import ReportDialog from '../components/ReportDialog'
import LoadingOverlay from '../components/LoadingOverlay'
import DateRangePicker from '../components/DateRangePicker'

const TABS = ['Dashboard', 'Orders', 'Inventory']
const STATUSES = ORDER_STATUSES

const STOCK_BADGES = {
  ok: { label: 'In stock', className: 'tapik-status-confirmed' },
  low: { label: 'Low stock', className: 'tapik-status-pending' },
  out: { label: 'Out of stock', className: 'tapik-status-cancelled' },
}

const money = (amount) =>
  (Number(amount) || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

async function fetchAppsScriptOrders() {
  const health = await api.testConnection()
  if (health.message !== 'TAPik Apps Script is connected') {
    throw new Error('The deployed Apps Script is outdated. Deploy the latest Code.gs as a new version.')
  }
  const result = await api.getAdminData()
  if (!result.ok || !Array.isArray(result.data?.orders)) {
    throw new Error(result.error || 'Apps Script did not return the expected order data.')
  }
  return result.data.orders
}

export default function Admin() {
  const [tab, setTab] = useState('Dashboard')
  const [navOpen, setNavOpen] = useState(() => window.innerWidth >= 1024)
  const [orders, setOrders] = useState(loadOrders)
  const [notice, setNotice] = useState('')
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [ordersPage, setOrdersPage] = useState(1)
  const [inventorySearch, setInventorySearch] = useState('')
  const [inventoryPage, setInventoryPage] = useState(1)
  const [showReport, setShowReport] = useState(false)
  const [manualRefreshing, setManualRefreshing] = useState(false)
  const [showMoreFilters, setShowMoreFilters] = useState(false)
  const [includeInactive, setIncludeInactive] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState(api.isConfigured() ? 'checking' : 'not-configured')
  const [lastSyncedAt, setLastSyncedAt] = useState(null)
  const [reviewOrderId, setReviewOrderId] = useState(null)
  const [detailsOrderId, setDetailsOrderId] = useState(null)
  const [stockDrafts, setStockDrafts] = useState({})
  const [savingStockKey, setSavingStockKey] = useState('')
  const { inventory, error: inventoryError, refresh: refreshInventory } = useInventory(30000)

  const refreshAdminData = async (announce = false) => {
    if (!api.isConfigured()) {
      setConnectionStatus('not-configured')
      if (announce) setNotice('Add VITE_APPS_SCRIPT_URL to connect the order database.')
      return
    }
    setConnectionStatus('checking')
    try {
      const remoteOrders = await fetchAppsScriptOrders()
      setOrders(remoteOrders)
      saveOrders(remoteOrders)
      setConnectionStatus('connected')
      setLastSyncedAt(new Date())
      if (announce) setNotice(`${remoteOrders.length} orders synced from Apps Script.`)
    } catch (error) {
      setConnectionStatus('error')
      setNotice(`Apps Script order sync failed: ${error.message}`)
    }
  }

  useEffect(() => {
    if (!api.isConfigured()) return undefined

    let isActive = true
    const sync = async () => {
      try {
        const remoteOrders = await fetchAppsScriptOrders()
        if (!isActive) return
        setOrders(remoteOrders)
        saveOrders(remoteOrders)
        setConnectionStatus('connected')
        setLastSyncedAt(new Date())
      } catch (error) {
        if (!isActive) return
        setConnectionStatus('error')
        setNotice(`Apps Script order sync failed: ${error.message}`)
      }
    }

    sync()
    const intervalId = window.setInterval(sync, 30000)
    return () => {
      isActive = false
      window.clearInterval(intervalId)
    }
  }, [])

  // The Refresh button blocks the page with a loading box until the orders come back, like the payment step.
  const handleManualRefresh = async () => {
    setManualRefreshing(true)
    try {
      await refreshAdminData(true)
    } finally {
      setManualRefreshing(false)
    }
  }

  const updateOrderStatus = async (order, status) => {
    const next = orders.map((item) => item.id === order.id ? { ...item, status } : item)
    setOrders(next)
    saveOrders(next)
    if (api.isConfigured()) {
      try {
        const result = await api.updateOrderStatus({ orderId: order.id, status })
        if (!result.ok) throw new Error(result.error || 'Apps Script rejected the status update.')
        setNotice(`Order ${order.id} updated in Apps Script.`)
        if (status === 'Cancelled') refreshInventory()
      } catch (error) {
        setOrders(orders)
        saveOrders(orders)
        setNotice(`Order status was not saved to Apps Script: ${error.message}`)
      }
    }
  }

  // decision is 'confirm' or 'reject'. Throws so the review modal can show the error.
  const verifyPayment = async (order, decision, reason) => {
    const confirmed = decision === 'confirm'
    let verifiedAt = new Date().toISOString()
    let receipt = {}
    let shortages = []
    if (api.isConfigured()) {
      const result = await api.verifyPayment({ orderId: order.id, decision, reason })
      if (!result.ok) throw new Error(result.error || 'Apps Script rejected the payment decision.')
      verifiedAt = result.paymentVerifiedAt || verifiedAt
      if (confirmed) receipt = { receiptNumber: result.receiptNumber, receiptURL: result.receiptURL }
      shortages = result.stockShortages || []
    }
    const next = orders.map((item) => item.id === order.id ? {
      ...item,
      status: confirmed ? 'Confirmed payment' : 'Payment rejected',
      paymentStatus: confirmed ? 'Paid' : 'Rejected',
      paymentVerifiedAt: confirmed ? verifiedAt : '',
      paymentRejectReason: confirmed ? '' : reason,
      ...receipt,
    } : item)
    setOrders(next)
    saveOrders(next)
    setReviewOrderId(null)
    if (confirmed) refreshInventory()
    setNotice(
      confirmed
        ? `Payment confirmed for order ${order.id}.${shortages.length ? ' Some items were short on stock; check Inventory.' : ''}`
        : `Payment rejected for order ${order.id}.`
    )
  }

  const handleReceiptDownload = async (order) => {
    try {
      await downloadReceipt(order.id)
      setNotice(`Receipt ${order.receiptNumber || ''} downloaded.`)
    } catch (error) {
      setNotice(`Receipt download failed for ${order.id}: ${error.message}`)
    }
  }

  const saveStock = async (type, id) => {
    const key = itemKey(type, id)
    const row = inventory?.[key]
    if (!row) return
    const draft = stockDrafts[key] || {}
    const stock = draft.stock ?? row.stock
    const threshold = draft.threshold ?? row.threshold
    setSavingStockKey(key)
    try {
      const result = await api.updateInventory({ type, id, stock: Number(stock), threshold: Number(threshold) })
      if (!result.ok) throw new Error(result.error || 'Apps Script rejected the stock update.')
      await refreshInventory()
      setStockDrafts((current) => {
        const rest = { ...current }
        delete rest[key]
        return rest
      })
      setNotice('Stock saved.')
    } catch (error) {
      setNotice(`Stock was not saved: ${error.message}`)
    } finally {
      setSavingStockKey('')
    }
  }

  const changeDraft = (key, field, value) =>
    setStockDrafts((current) => ({ ...current, [key]: { ...current[key], [field]: value } }))

  const setFilter = (key, value) => {
    setOrdersPage(1)
    setFilters((current) => ({ ...current, [key]: value, ...(key === 'city' ? { barangay: '' } : {}) }))
  }

  const goToTab = (item) => {
    setTab(item)
    if (window.innerWidth < 1024) setNavOpen(false)
  }

  const countStatus = (status) => orders.filter((order) => displayOrderStatus(order.status) === status).length
  const toVerifyOrders = orders
    .filter((order) => displayOrderStatus(order.status) === 'Payment submitted')
    .sort((a, b) => new Date(a.paymentSubmittedAt || a.date || 0) - new Date(b.paymentSubmittedAt || b.date || 0))
  const toVerify = toVerifyOrders.length
  const toPrepare = countStatus('Confirmed payment') + countStatus('Being prepared')
  const awaitingAction = toVerify + toPrepare
  // Only payments an admin has verified count as sales.
  const grossSales = orders
    .filter((order) => order.paymentStatus === 'Paid' && displayOrderStatus(order.status) !== 'Cancelled')
    .reduce((total, order) => total + (Number(order.total) || 0), 0)
  const recentOrders = [...orders].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)).slice(0, 5)
  const filteredOrders = filterOrders(orders, filters)
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
  const orderPageCount = Math.ceil(filteredOrders.length / 10)
  const currentOrdersPage = Math.min(ordersPage, Math.max(1, orderPageCount))
  const visibleOrders = filteredOrders.slice((currentOrdersPage - 1) * 10, currentOrdersPage * 10)
  const filterCount = activeFilterCount(filters)
  const chips = filterChips(filters)
  const kpis = orderKpis(filteredOrders)
  const advancedCount = [filters.city, filters.barangay, filters.shape, filters.chain].filter(Boolean).length
  const topShapes = topItems(orders, 'shape', includeInactive)
  const topChains = topItems(orders, 'chain', includeInactive)

  const inventoryRows = [
    ...SHAPES.map((item) => ({ type: 'shape', ...item })),
    ...CHAINS.map((item) => ({ type: 'chain', ...item })),
  ].map((item) => ({ ...item, row: inventory?.[itemKey(item.type, item.id)] }))
  const matchingInventoryRows = inventoryRows.filter((item) =>
    `${item.label} ${item.type}`.toLowerCase().includes(inventorySearch.trim().toLowerCase())
  )
  const inventoryPageCount = Math.ceil(matchingInventoryRows.length / 10)
  const visibleInventoryRows = matchingInventoryRows.slice((inventoryPage - 1) * 10, inventoryPage * 10)
  const lowStockItems = inventoryRows.filter((item) => item.row && stockLevel(item.row) !== 'ok')
  const reviewOrder = orders.find((order) => order.id === reviewOrderId)
  const detailsOrder = orders.find((order) => order.id === detailsOrderId)

  const itemCountOf = (order) => (order.items || []).reduce((sum, item) => sum + (Number(item.qty) || 1), 0)

  // The Payment and Status cells, used by both the desktop table and the phone cards.
  const renderPaymentCell = (order, status) => (
    <>
        <span className={`tapik-status-badge rounded-md px-2 py-1 text-xs ${order.paymentStatus === 'Paid' ? 'tapik-status-confirmed' : order.paymentStatus === 'Rejected' ? 'tapik-status-cancelled' : order.paymentStatus === 'Submitted' ? 'tapik-status-submitted' : 'tapik-status-pending'}`}>{paymentLabel(order)}</span>
        {status === 'Payment submitted' && <button type="button" onClick={() => setReviewOrderId(order.id)} className="mt-2 block rounded-lg bg-yellow-300 px-3 py-1.5 text-xs font-bold text-slate-950">Verify payment</button>}
        {order.duplicateProof && <p className="mt-1 text-xs font-bold text-rose-200">⚠ Same proof reused</p>}
      </>
  )

  const renderStatusCell = (order, status) => (
    <>
        {order.paymentStatus === 'Paid' && !['Delivered', 'Cancelled'].includes(status) ? (
          <select value={status} onChange={(event) => updateOrderStatus(order, event.target.value)} aria-label={`Status for ${order.id}`} className={`tapik-status-select w-full ${orderStatusColor(order.status)}`}>
            {status === 'Confirmed payment' && <option>Confirmed payment</option>}
            {FULFILLMENT_STATUSES.map((item) => <option key={item}>{item}</option>)}
          </select>
        ) : (
          <div>
            <span className={`tapik-status-badge rounded-md px-2 py-1 text-xs ${orderStatusColor(order.status)}`}>{status}</span>
            {!['Cancelled', 'Delivered'].includes(status) && <button type="button" onClick={() => updateOrderStatus(order, 'Cancelled')} className="mt-2 block text-xs text-rose-200 underline">Cancel order</button>}
          </div>
        )}
      </>
  )

  const renderInventoryTable = (type, title) => (
    <section className="tapik-surface rounded-xl border border-white/25 p-4 sm:p-5">
      <h3 className="mb-3 text-lg font-black">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="border-b border-white/15 text-xs uppercase text-blue-200">
            <tr><th className="py-2 pr-3">Item</th><th className="py-2 pr-3">Stock</th><th className="py-2 pr-3">Warn at</th><th className="py-2 pr-3">Status</th><th className="py-2" /></tr>
          </thead>
          <tbody>
            {visibleInventoryRows.filter((item) => item.type === type).map((item) => {
              const key = itemKey(type, item.id)
              const draft = stockDrafts[key]
              const level = stockLevel(item.row)
              const badge = STOCK_BADGES[level]
              return (
                <tr key={key} className="border-b border-white/10 last:border-0">
                  <td className="py-2 pr-3 font-semibold">{item.label}</td>
                  <td className="py-2 pr-3">
                    <input type="number" min="0" step="1" aria-label={`Stock for ${item.label}`} value={draft?.stock ?? item.row?.stock ?? ''} onChange={(event) => changeDraft(key, 'stock', event.target.value)} className="w-24 rounded-lg border border-white/25 bg-white/10 px-2 py-1 text-white" />
                  </td>
                  <td className="py-2 pr-3">
                    <input type="number" min="0" step="1" aria-label={`Low-stock warning level for ${item.label}`} value={draft?.threshold ?? item.row?.threshold ?? ''} onChange={(event) => changeDraft(key, 'threshold', event.target.value)} className="w-20 rounded-lg border border-white/25 bg-white/10 px-2 py-1 text-white" />
                  </td>
                  <td className="py-2 pr-3"><span className={`tapik-status-badge rounded-md px-2 py-1 text-xs ${badge.className}`}>{badge.label}</span></td>
                  <td className="py-2 text-right">
                    <button type="button" disabled={!draft || savingStockKey === key} onClick={() => saveStock(type, item.id)} className="rounded-lg bg-yellow-300 px-3 py-1.5 text-xs font-bold text-slate-950 disabled:opacity-40">
                      {savingStockKey === key ? 'Saving…' : 'Save'}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )

  return (
    <section className="tapik-admin min-h-[calc(100vh-76px)] text-white">
      <div className={`mx-auto grid w-full max-w-[1600px] gap-5 px-4 py-6 sm:px-6 lg:gap-7 lg:px-8 lg:py-8 ${navOpen ? 'lg:grid-cols-[200px_minmax(0,1fr)]' : ''}`}>
        {navOpen && <button type="button" aria-label="Close menu" onClick={() => setNavOpen(false)} className="fixed inset-0 z-[50] bg-black/60 lg:hidden" />}
        {navOpen && (
          <aside className="tapik-surface fixed inset-y-0 left-0 z-[60] w-64 overflow-y-auto border border-white/25 p-3 lg:static lg:z-auto lg:h-fit lg:w-auto lg:rounded-xl lg:sticky lg:top-6">
            <div className="mb-2 flex items-center justify-between px-2 pt-1 lg:hidden">
              <p className="text-sm font-black">Menu</p>
              <button type="button" onClick={() => setNavOpen(false)} aria-label="Close menu" className="text-2xl leading-none text-blue-100 hover:text-white">×</button>
            </div>
            <nav className="flex flex-col gap-2" aria-label="Admin navigation">
              {TABS.map((item) => {
                const badge = item === 'Orders' ? orders.length : item === 'Inventory' ? lowStockItems.length : item === 'Dashboard' ? toVerify : 0
                return (
                  <button key={item} type="button" onClick={() => goToTab(item)} aria-current={tab === item ? 'page' : undefined} className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-bold transition ${tab === item ? 'bg-yellow-300 text-slate-950' : 'text-blue-50 hover:bg-white/10'}`}>
                    <span>{item}</span>
                    {badge > 0 && <span className={`rounded-md px-2 py-0.5 text-xs ${item === 'Orders' ? (tab === item ? 'bg-slate-950/10' : 'bg-white/10') : 'bg-amber-300 text-slate-950'}`}>{badge}</span>}
                  </button>
                )
              })}
            </nav>
          </aside>
        )}

        <div className="min-w-0">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setNavOpen((open) => !open)} aria-label={navOpen ? 'Hide menu' : 'Show menu'} aria-expanded={navOpen} className="rounded-lg border border-white/25 p-2.5 hover:bg-white/10">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M3 5h14M3 10h14M3 15h14" /></svg>
              </button>
              <div>
                <h2 className="text-2xl font-black sm:text-3xl">{tab}</h2>
              </div>
            </div>
            <p className="hidden text-sm text-blue-100 sm:block">{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>

          {notice && <p role="status" className="tapik-surface mb-4 rounded-lg border border-white/25 px-4 py-3 text-sm">{notice}</p>}

          {tab === 'Dashboard' && (
            <div className="space-y-6">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  { label: 'Total orders', value: orders.length, note: `${countStatus('Delivered')} delivered` },
                  { label: 'Needs attention', value: awaitingAction, note: `${toVerify} payment${toVerify === 1 ? '' : 's'} to verify · ${toPrepare} to prepare` },
                  { label: 'In transit', value: countStatus('Shipped'), note: `${countStatus('Packed')} packed and ready` },
                  { label: 'Gross sales', value: `PHP ${money(grossSales)}`, note: 'From confirmed payments' },
                ].map((metric) => (
                  <article key={metric.label} className="tapik-surface rounded-xl border border-white/25 p-4">
                    <p className="text-sm font-semibold text-blue-100">{metric.label}</p>
                    <p className="mt-3 text-2xl font-black text-white">{metric.value}</p>
                    <p className="mt-2 text-xs text-blue-200">{metric.note}</p>
                  </article>
                ))}
              </div>

              <section className="tapik-surface rounded-xl border border-white/25 p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div><h3 className="text-lg font-black">Payments to verify</h3><p className="text-sm text-blue-200">Customers who uploaded proof of payment, oldest first</p></div>
                  <span className="rounded-md bg-white/10 px-3 py-1 text-sm font-bold">{toVerify}</span>
                </div>
                {toVerify === 0 ? <p className="py-4 text-center text-sm text-blue-200">No payments are waiting for review.</p> : (
                  <ul className="divide-y divide-white/10">
                    {toVerifyOrders.map((order) => (
                      <li key={order.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                        <div className="min-w-0">
                          <p className="break-all text-sm font-bold">{order.id}</p>
                          <p className="text-xs text-blue-200">{order.customer?.name || 'Customer'} · PHP {money(order.total)}{order.duplicateProof ? ' · ⚠ same proof as another order' : ''}</p>
                        </div>
                        <button type="button" onClick={() => setReviewOrderId(order.id)} className="rounded-lg bg-yellow-300 px-3 py-2 text-sm font-bold text-slate-950">Review proof</button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {lowStockItems.length > 0 && (
                <section role="alert" className="rounded-xl border border-amber-300/50 bg-amber-950/40 p-5">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="text-lg font-black text-amber-100">Stock warning · {lowStockItems.length} item{lowStockItems.length === 1 ? '' : 's'}</h3>
                    <button type="button" onClick={() => goToTab('Inventory')} className="rounded-lg border border-amber-200/50 px-3 py-2 text-sm font-bold hover:bg-white/10">Manage stock</button>
                  </div>
                  <ul className="flex flex-wrap gap-2 text-sm">
                    {lowStockItems.map((item) => (
                      <li key={itemKey(item.type, item.id)} className={`tapik-status-badge rounded-md px-2 py-1 text-xs ${STOCK_BADGES[stockLevel(item.row)].className}`}>{item.label} {item.type} · {item.row.stock} left</li>
                    ))}
                  </ul>
                </section>
              )}

              <section className="tapik-surface rounded-xl border border-white/25 p-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div><h3 className="text-lg font-black">Most ordered</h3><p className="text-sm text-blue-200">Units sold per shape and chain</p></div>
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-2 text-xs text-blue-100"><input type="checkbox" checked={includeInactive} onChange={(event) => setIncludeInactive(event.target.checked)} />Include cancelled and rejected</label>
                    <button type="button" onClick={() => setShowReport(true)} className="rounded-lg bg-yellow-300 px-3 py-2 text-sm font-bold text-slate-950">Generate report</button>
                  </div>
                </div>
                <div className="grid gap-5 lg:grid-cols-2">
                  {[['Shapes', topShapes], ['Chains', topChains]].map(([title, rows]) => (
                    <div key={title}>
                      <h4 className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-blue-200">{title}</h4>
                      {rows.length === 0 ? <p className="py-3 text-sm text-blue-200">No orders yet.</p> : (
                        <table className="w-full text-left text-sm">
                          <thead className="border-b border-white/15 text-xs uppercase text-blue-200"><tr><th className="py-2 pr-3">Item</th><th className="py-2 pr-3">Units</th><th className="py-2 pr-3">Orders</th><th className="py-2">Share</th></tr></thead>
                          <tbody>{rows.map((row, index) => (
                            <tr key={row.id || index} className="border-b border-white/10 last:border-0">
                              <td className="py-2 pr-3 font-semibold">{index === 0 && <span aria-hidden="true">★ </span>}{row.label}</td>
                              <td className="py-2 pr-3 font-bold">{row.units}</td>
                              <td className="py-2 pr-3">{row.orders}</td>
                              <td className="py-2"><div className="flex items-center gap-2"><div className="h-2 w-16 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-yellow-300" style={{ width: `${row.share}%` }} /></div><span className="text-xs">{row.share}%</span></div></td>
                            </tr>
                          ))}</tbody>
                        </table>
                      )}
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-xs text-blue-200">The report uses the filters set in the Orders tab{filterCount ? ` (${filterCount} on, ${filteredOrders.length} orders)` : ' (none on, all orders)'}.</p>
              </section>

              <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(260px,0.8fr)]">
                <section className="tapik-surface min-w-0 rounded-xl border border-white/25 p-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div><h3 className="text-lg font-black">Recent orders</h3><p className="text-sm text-blue-200">Latest activity from your storefront</p></div>
                    <button type="button" onClick={() => goToTab('Orders')} className="rounded-lg border border-white/20 px-3 py-2 text-sm font-bold hover:bg-white/10">All orders</button>
                  </div>
                  {recentOrders.length === 0 ? <p className="py-8 text-center text-sm text-blue-200">Orders will appear here when customers check out.</p> : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[480px] text-left text-sm">
                        <thead className="border-b border-white/15 text-xs uppercase text-blue-200"><tr><th className="py-3 pr-3">Order</th><th className="py-3 pr-3">Customer</th><th className="py-3 pr-3">Total</th><th className="py-3">Status</th></tr></thead>
                        <tbody>{recentOrders.map((order) => <tr key={order.id} className="border-b border-white/10 last:border-0"><td className="py-3 pr-3 font-bold">{order.id}</td><td className="py-3 pr-3">{order.customer?.name || order.customer?.email || 'Customer'}</td><td className="py-3 pr-3">PHP {money(order.total)}</td><td className="py-3"><span className={`tapik-status-badge rounded-md px-2 py-1 text-xs ${orderStatusColor(order.status)}`}>{displayOrderStatus(order.status)}</span></td></tr>)}</tbody>
                      </table>
                    </div>
                  )}
                </section>

                <section className="tapik-surface min-w-0 rounded-xl border border-white/25 p-5">
                  <h3 className="text-lg font-black">Order status</h3>
                  <p className="mb-4 text-sm text-blue-200">Current fulfillment breakdown</p>
                  <div className="space-y-3">
                    {STATUSES.map((status) => {
                      const count = countStatus(status)
                      const percent = orders.length ? Math.round((count / orders.length) * 100) : 0
                      return <div key={status}>
                        <div className="mb-1 flex justify-between text-sm"><span>{status}</span><span className="font-bold">{count}</span></div>
                        <div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-yellow-300" style={{ width: `${percent}%` }} /></div>
                      </div>
                    })}
                  </div>
                </section>
              </div>
            </div>
          )}

          {tab === 'Orders' && (
            <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {[
                { label: 'Orders', value: kpis.orders, note: filterCount ? `of ${orders.length} in total` : 'All orders' },
                { label: 'Sales', value: `PHP ${money(kpis.sales)}`, note: `${kpis.paidOrders} paid order${kpis.paidOrders === 1 ? '' : 's'}` },
                { label: 'Items sold', value: kpis.units, note: 'Cancelled and rejected not counted' },
                { label: 'Average order', value: `PHP ${money(kpis.average)}`, note: 'Per paid order' },
                { label: 'Needs attention', value: kpis.toVerify + kpis.toPrepare, note: `${kpis.toVerify} to verify · ${kpis.toPrepare} to prepare` },
              ].map((metric) => (
                <article key={metric.label} className="tapik-surface rounded-xl border border-white/25 p-4">
                  <p className="text-sm font-semibold text-blue-100">{metric.label}</p>
                  <p className="mt-2 break-words text-2xl font-black text-white">{metric.value}</p>
                  <p className="mt-1 text-xs text-blue-200">{metric.note}</p>
                </article>
              ))}
            </div>
            <section className="tapik-surface rounded-xl border border-white/25 p-4 sm:p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div><h3 className="text-lg font-black">Order management</h3><p className="text-sm text-blue-200">Open an order to see the customer, items, payment proof and receipt.</p></div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-white/10 px-3 py-2 text-sm">{filteredOrders.length} orders</span>
                  <button type="button" onClick={() => setShowReport(true)} className="rounded-lg bg-yellow-300 px-3 py-2 text-sm font-bold text-slate-950">Generate report</button>
                  <button type="button" onClick={handleManualRefresh} disabled={connectionStatus === 'checking'} className="rounded-lg border border-white/20 px-3 py-2 text-sm font-bold hover:bg-white/10 disabled:opacity-50">{connectionStatus === 'checking' ? 'Syncing...' : 'Refresh'}</button>
                </div>
              </div>
              <div className="mb-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_190px_240px]">
                <input type="search" value={filters.search} onChange={(event) => setFilter('search', event.target.value)} placeholder="Search order, customer, email, or phone" className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder:text-blue-200 sm:col-span-2 lg:col-span-1" />
                <select value={filters.status} onChange={(event) => setFilter('status', event.target.value)} aria-label="Filter by status" className="rounded-lg border border-white/20 bg-slate-900 px-3 py-2 text-white"><option>{ALL_STATUSES}</option>{STATUSES.map((status) => <option key={status}>{status}</option>)}</select>
                <DateRangePicker from={filters.from} to={filters.to} onChange={({ from, to }) => { setOrdersPage(1); setFilters((current) => ({ ...current, from, to })) }} />
              </div>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => setFilter('status', filters.status === 'Payment submitted' ? ALL_STATUSES : 'Payment submitted')} className={`rounded-lg border px-3 py-2 text-sm font-bold ${filters.status === 'Payment submitted' ? 'border-yellow-300 bg-yellow-300 text-slate-950' : 'border-white/20 hover:bg-white/10'}`}>To verify ({toVerify})</button>
                <button type="button" onClick={() => setShowMoreFilters((open) => !open)} aria-expanded={showMoreFilters} className="rounded-lg border border-white/20 px-3 py-2 text-sm font-bold hover:bg-white/10">
                  {showMoreFilters ? 'Fewer filters' : 'More filters'}{advancedCount > 0 ? ` (${advancedCount})` : ''}
                </button>
              </div>
              {showMoreFilters && (
                <div className="mb-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <select value={filters.city} onChange={(event) => setFilter('city', event.target.value)} aria-label="Filter by city" className="rounded-lg border border-white/20 bg-slate-900 px-3 py-2 text-white"><option value="">City: all</option>{METRO_MANILA_CITIES.map((city) => <option key={city} value={city}>{city}</option>)}</select>
                  <select value={filters.barangay} onChange={(event) => setFilter('barangay', event.target.value)} disabled={!filters.city} aria-label="Filter by barangay" className="rounded-lg border border-white/20 bg-slate-900 px-3 py-2 text-white disabled:opacity-50"><option value="">{filters.city ? 'Barangay: all' : 'Barangay: pick a city first'}</option>{getBarangays(filters.city).map((barangay) => <option key={barangay} value={barangay}>{barangay}</option>)}</select>
                  <select value={filters.shape} onChange={(event) => setFilter('shape', event.target.value)} aria-label="Filter by shape" className="rounded-lg border border-white/20 bg-slate-900 px-3 py-2 text-white"><option value="">Shape: all</option>{SHAPES.map((shape) => <option key={shape.id} value={shape.id}>{shape.label}</option>)}</select>
                  <select value={filters.chain} onChange={(event) => setFilter('chain', event.target.value)} aria-label="Filter by chain" className="rounded-lg border border-white/20 bg-slate-900 px-3 py-2 text-white"><option value="">Chain: all</option>{CHAINS.map((chain) => <option key={chain.id} value={chain.id}>{chain.label}</option>)}</select>
                </div>
              )}
              {chips.length > 0 && (
                <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
                  {chips.map((chip) => (
                    <span key={chip.key} className="inline-flex items-center gap-1 rounded-full bg-white/10 py-1 pl-3 pr-1 text-xs">
                      {chip.label}
                      <button type="button" onClick={() => { setOrdersPage(1); setFilters((current) => ({ ...current, ...chip.clear })) }} aria-label={`Remove filter: ${chip.label}`} className="rounded-full px-1.5 text-base leading-none hover:bg-white/20">×</button>
                    </span>
                  ))}
                  <button type="button" onClick={() => { setOrdersPage(1); setFilters(EMPTY_FILTERS) }} className="rounded-lg border border-white/25 px-3 py-1.5 text-xs font-bold hover:bg-white/10">Clear filters</button>
                </div>
              )}
              {lastSyncedAt && <p className="mb-3 text-xs text-blue-200">Last synced {lastSyncedAt.toLocaleTimeString()}</p>}
              {filteredOrders.length === 0 ? <p className="py-10 text-center text-blue-200">{orders.length ? 'No orders match these filters.' : 'No orders have been placed yet.'}</p> : (
                <>
                <div className="space-y-3 md:hidden">
                  {visibleOrders.map((order) => {
                    const status = displayOrderStatus(order.status)
                    const itemCount = itemCountOf(order)
                    return (
                      <article key={order.id} className="rounded-xl border border-white/15 bg-white/5 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="break-all text-sm font-bold">{order.id}</p>
                            <p className="text-sm text-blue-100">{order.customer?.name || 'Customer'}</p>
                          </div>
                          <p className="shrink-0 text-sm font-bold">PHP {money(order.total)}</p>
                        </div>
                        <p className="mt-1 text-xs text-blue-200">{order.date ? new Date(order.date).toLocaleDateString() : '—'} · {itemCount} item{itemCount === 1 ? '' : 's'}</p>
                        <div className="mt-3 grid grid-cols-2 gap-3">
                          <div><p className="mb-1 text-xs uppercase text-blue-200">Payment</p>{renderPaymentCell(order, status)}</div>
                          <div><p className="mb-1 text-xs uppercase text-blue-200">Status</p>{renderStatusCell(order, status)}</div>
                        </div>
                        <button type="button" onClick={() => setDetailsOrderId(order.id)} className="mt-3 w-full rounded-lg border border-white/25 px-3 py-2 text-sm font-bold hover:bg-white/10">View order</button>
                      </article>
                    )
                  })}
                </div>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[860px] text-left text-sm">
                    <thead className="border-b border-white/15 text-xs uppercase text-blue-200"><tr><th className="px-3 py-3">Order</th><th className="px-3 py-3">Date</th><th className="px-3 py-3">Items</th><th className="px-3 py-3">Total</th><th className="px-3 py-3">Payment</th><th className="px-3 py-3">Status</th><th className="px-3 py-3" /></tr></thead>
                    <tbody>{visibleOrders.map((order) => {
                      const status = displayOrderStatus(order.status)
                      const itemCount = itemCountOf(order)
                      return (
                        <tr key={order.id} className="border-b border-white/10 align-middle last:border-0">
                          <td className="px-3 py-3"><p className="break-all font-bold">{order.id}</p><p className="text-blue-100">{order.customer?.name || 'Customer'}</p></td>
                          <td className="whitespace-nowrap px-3 py-3">{order.date ? new Date(order.date).toLocaleDateString() : '—'}</td>
                          <td className="whitespace-nowrap px-3 py-3">{itemCount} item{itemCount === 1 ? '' : 's'}</td>
                          <td className="whitespace-nowrap px-3 py-3 font-bold">PHP {money(order.total)}</td>
                          <td className="px-3 py-3">{renderPaymentCell(order, status)}</td>
                          <td className="px-3 py-3">{renderStatusCell(order, status)}</td>
                          <td className="px-3 py-3 text-right"><button type="button" onClick={() => setDetailsOrderId(order.id)} className="rounded-lg border border-white/25 px-3 py-1.5 text-xs font-bold hover:bg-white/10">View</button></td>
                        </tr>
                      )
                    })}</tbody>
                  </table>
                </div>
                </>
              )}
              {orderPageCount > 1 && (
                <div className="mt-4 flex items-center justify-center gap-3">
                  <button type="button" onClick={() => setOrdersPage(Math.max(1, currentOrdersPage - 1))} disabled={currentOrdersPage === 1} className="tapik-pagination-previous rounded-lg border border-white/25 px-3 py-2 text-sm font-bold disabled:opacity-40">Previous</button>
                  <span className="text-sm">Page {currentOrdersPage} of {orderPageCount}</span>
                  <button type="button" onClick={() => setOrdersPage(Math.min(orderPageCount, currentOrdersPage + 1))} disabled={currentOrdersPage === orderPageCount} className="tapik-pagination-next rounded-lg border border-white/25 px-3 py-2 text-sm font-bold disabled:opacity-40">Next</button>
                </div>
              )}
            </section>
            </div>
          )}

          {tab === 'Inventory' && (
            <div className="space-y-5">
              {!api.isConfigured() && <p className="tapik-surface rounded-lg border border-white/25 px-4 py-3 text-sm">Connect the order database (VITE_APPS_SCRIPT_URL) to manage stock.</p>}
              {inventoryError && <p role="alert" className="rounded-lg border border-rose-300/40 bg-rose-950/40 px-4 py-3 text-sm text-rose-100">Could not load stock: {inventoryError}</p>}
              {lowStockItems.length > 0 && (
                <p role="alert" className="rounded-lg border border-amber-300/50 bg-amber-950/40 px-4 py-3 text-sm text-amber-100">
                  {lowStockItems.length} item{lowStockItems.length === 1 ? ' is' : 's are'} low or out of stock: {lowStockItems.map((item) => `${item.label} ${item.type}`).join(', ')}.
                </p>
              )}
              <p className="text-sm text-blue-200">Each keychain uses one shape and one chain. Stock is taken out when a payment is confirmed, and put back if a paid order is cancelled. Customers cannot choose items that are out of stock.</p>
              {inventory && (
                <>
                <input type="search" value={inventorySearch} onChange={(event) => { setInventorySearch(event.target.value); setInventoryPage(1) }} placeholder="Search inventory by item or type" aria-label="Search inventory" className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder:text-blue-200" />
                <div className="grid gap-5 xl:grid-cols-2">
                  {visibleInventoryRows.some((item) => item.type === 'shape') && renderInventoryTable('shape', 'Shapes')}
                  {visibleInventoryRows.some((item) => item.type === 'chain') && renderInventoryTable('chain', 'Chains')}
                </div>
                {visibleInventoryRows.length === 0 && <p className="tapik-surface rounded-lg px-4 py-3 text-sm">No inventory items match that search.</p>}
                {inventoryPageCount > 1 && (
                  <div className="flex items-center justify-center gap-3">
                    <button type="button" onClick={() => setInventoryPage((page) => Math.max(1, page - 1))} disabled={inventoryPage === 1} className="tapik-pagination-previous rounded-lg border border-white/25 px-3 py-2 text-sm font-bold disabled:opacity-40">Previous</button>
                    <span className="text-sm">Page {inventoryPage} of {inventoryPageCount}</span>
                    <button type="button" onClick={() => setInventoryPage((page) => Math.min(inventoryPageCount, page + 1))} disabled={inventoryPage === inventoryPageCount} className="tapik-pagination-next rounded-lg border border-white/25 px-3 py-2 text-sm font-bold disabled:opacity-40">Next</button>
                  </div>
                )}
                </>
              )}
              {!inventory && api.isConfigured() && !inventoryError && <p className="text-sm text-blue-200">Loading stock…</p>}
            </div>
          )}

          {manualRefreshing && (
            <LoadingOverlay
              title="Refreshing orders…"
              message="Getting the latest orders from the order database. Please don't close or refresh this page."
            />
          )}

          {showReport && <ReportDialog orders={filteredOrders} filters={filters} onClose={() => setShowReport(false)} />}

          {detailsOrder && (
            <OrderDetails
              order={detailsOrder}
              onClose={() => setDetailsOrderId(null)}
              onReviewPayment={(order) => setReviewOrderId(order.id)}
              onDownloadReceipt={handleReceiptDownload}
            />
          )}

          {reviewOrder && (
            <PaymentReview
              order={reviewOrder}
              onClose={() => setReviewOrderId(null)}
              onDecision={verifyPayment}
            />
          )}
        </div>
      </div>
    </section>
  )
}
