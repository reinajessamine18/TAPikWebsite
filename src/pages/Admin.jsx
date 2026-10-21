import { useEffect, useState } from 'react'
import { loadOrders, loadProducts, saveOrders, saveProducts } from '../lib/storage'
import { SAMPLE_PRODUCTS } from '../data/products'
import { api, downloadReceipt } from '../services/api'
import { displayOrderStatus, orderStatusColor, paymentLabel, ORDER_STATUSES, FULFILLMENT_STATUSES } from '../lib/orderStatus'
import PaymentReview from '../components/PaymentReview'

const TABS = ['Dashboard', 'Orders']
const STATUSES = ORDER_STATUSES
const emptyProduct = { name: '', description: '', price: '', stock: '', imageUrl: '', productLink: '' }

function driveImageUrl(image, format = 'preview') {
  const value = String(image || '')
  const fileId = value.match(/\/file\/d\/([^/?]+)/)?.[1] || value.match(/[?&]id=([^&]+)/)?.[1]
  if (!fileId) return value
  const encodedFileId = encodeURIComponent(fileId)
  if (format === 'download') return `https://drive.google.com/uc?export=download&id=${encodedFileId}`
  return `https://drive.google.com/open?id=${encodedFileId}`
}

function CustomerArtwork({ image }) {
  const [loadedImage, setLoadedImage] = useState(null)
  const [failedImage, setFailedImage] = useState(null)
  const value = String(image || '')
  const fileId = value.match(/\/file\/d\/([^/?]+)/)?.[1] || value.match(/[?&]id=([^&]+)/)?.[1]

  useEffect(() => {
    let active = true
    if (!fileId) return () => { active = false }

    api.getDesignImage({ fileId })
      .then((result) => {
        if (!result.ok || !result.data) {
          throw new Error(result.error || 'Image preview is unavailable')
        }
        if (active) setLoadedImage({
          image,
          source: `data:${result.mimeType || 'image/jpeg'};base64,${result.data}`,
        })
      })
      .catch((loadError) => {
        if (active) setFailedImage({ image, message: loadError.message })
      })

    return () => { active = false }
  }, [fileId, image])

  const source = fileId
    ? loadedImage?.image === image ? loadedImage.source : ''
    : value
  const error = failedImage?.image === image ? failedImage.message : ''
  if (error) {
    return <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded bg-white/10 p-2 text-center text-xs text-blue-200">Preview unavailable</div>
  }
  if (!source) {
    return <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded bg-white/10 text-xs text-blue-200">Loading photo…</div>
  }

  return (
    <a href={driveImageUrl(image, 'original')} target="_blank" rel="noreferrer" aria-label="View original customer artwork" className="shrink-0">
      <img src={source} alt="Customer-uploaded artwork" className="h-28 w-28 rounded bg-white object-contain" />
    </a>
  )
}

function productFromSheet(row) {
  return {
    id: row.ProductID,
    name: row.ProductName || '',
    description: row.Description || '',
    category: row.Category || '',
    price: Number(row.Price) || 0,
    stock: Number(row.Stock) || 0,
    imageUrl: row.ImageURL || '',
    weightGrams: Number(row.WeightGrams) || 50,
    isActive: row.IsActive !== false,
    productLink: row.ProductLink || '',
  }
}

async function fetchAppsScriptData() {
  const health = await api.testConnection()
  if (health.message !== 'TAPik Apps Script is connected') {
    throw new Error('The deployed Apps Script is outdated. Deploy the latest Code.gs as a new version.')
  }
  const result = await api.getAdminData()
  if (!result.ok || !Array.isArray(result.data?.orders) || !Array.isArray(result.data?.products)) {
    throw new Error(result.error || 'Apps Script did not return the expected order and inventory data.')
  }
  return result.data
}

export default function Admin() {
  const [tab, setTab] = useState('Dashboard')
  const [orders, setOrders] = useState(loadOrders)
  const [products, setProducts] = useState(() => {
    const stored = loadProducts()
    return stored.length ? stored : SAMPLE_PRODUCTS.map((product) => ({ ...product, stock: 0, imageUrl: '', productLink: '' }))
  })
  const [productForm, setProductForm] = useState(emptyProduct)
  const [editingId, setEditingId] = useState(null)
  const [notice, setNotice] = useState('')
  const [orderSearch, setOrderSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All statuses')
  const [connectionStatus, setConnectionStatus] = useState(api.isConfigured() ? 'checking' : 'not-configured')
  const [lastSyncedAt, setLastSyncedAt] = useState(null)
  const [reviewOrderId, setReviewOrderId] = useState(null)

  const refreshAdminData = async (announce = false) => {
    if (!api.isConfigured()) {
      setConnectionStatus('not-configured')
      if (announce) setNotice('Add VITE_APPS_SCRIPT_URL to connect the order database.')
      return
    }
    setConnectionStatus('checking')
    try {
      const data = await fetchAppsScriptData()
      const remoteOrders = data.orders
      setOrders(remoteOrders)
      saveOrders(remoteOrders)
      if (data.products.length) {
        const remoteProducts = data.products.map(productFromSheet)
        setProducts(remoteProducts)
        saveProducts(remoteProducts)
      }
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
        const data = await fetchAppsScriptData()
        if (!isActive) return
        setOrders(data.orders)
        saveOrders(data.orders)
        if (data.products.length) {
          const remoteProducts = data.products.map(productFromSheet)
          setProducts(remoteProducts)
          saveProducts(remoteProducts)
        }
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

  const updateOrderStatus = async (order, status) => {
    const next = orders.map((item) => item.id === order.id ? { ...item, status } : item)
    setOrders(next)
    saveOrders(next)
    if (api.isConfigured()) {
      try {
        const result = await api.updateOrderStatus({ orderId: order.id, status })
        if (!result.ok) throw new Error(result.error || 'Apps Script rejected the status update.')
        setNotice(`Order ${order.id} updated in Apps Script.`)
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
    if (api.isConfigured()) {
      const result = await api.verifyPayment({ orderId: order.id, decision, reason })
      if (!result.ok) throw new Error(result.error || 'Apps Script rejected the payment decision.')
      verifiedAt = result.paymentVerifiedAt || verifiedAt
      if (confirmed) receipt = { receiptNumber: result.receiptNumber, receiptURL: result.receiptURL }
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
    setNotice(confirmed ? `Payment confirmed for order ${order.id}.` : `Payment rejected for order ${order.id}.`)
  }

  const updateForm = (key, value) => setProductForm((current) => ({ ...current, [key]: value }))

  const saveProduct = async (event) => {
    event.preventDefault()
    const product = {
      ...productForm,
      id: editingId || `product_${Date.now()}`,
      price: Number(productForm.price) || 0,
      stock: Number(productForm.stock) || 0,
    }
    if (api.isConfigured()) {
      try {
        const result = await api.saveProduct(product)
        if (result.ok && result.productId) product.id = result.productId
      } catch {
        setNotice('Could not save to Apps Script. The item was saved in this browser only.')
      }
    }
    const next = editingId
      ? products.map((item) => item.id === editingId ? product : item)
      : [product, ...products]
    setProducts(next)
    saveProducts(next)
    setProductForm(emptyProduct)
    setEditingId(null)
    setNotice('Inventory saved.')
  }

  const editProduct = (product) => {
    setEditingId(product.id)
    setProductForm({
      name: product.name || '', description: product.description || '',
      price: product.price ?? '', stock: product.stock ?? '',
      imageUrl: product.imageUrl || product.image || '', productLink: product.productLink || '',
    })
    setTab('Inventory')
  }

  const removeProduct = async (product) => {
    if (api.isConfigured()) {
      try {
        await api.deleteProduct({ productId: product.id })
      } catch {
        setNotice('Could not remove the item from Apps Script.')
      }
    }
    const next = products.filter((item) => item.id !== product.id)
    setProducts(next)
    saveProducts(next)
  }

  const countStatus = (status) => orders.filter((order) => displayOrderStatus(order.status) === status).length
  const toVerify = countStatus('Payment submitted')
  const toPrepare = countStatus('Confirmed payment') + countStatus('Being prepared')
  const awaitingAction = toVerify + toPrepare
  // Only payments an admin has verified count as sales.
  const grossSales = orders
    .filter((order) => order.paymentStatus === 'Paid' && displayOrderStatus(order.status) !== 'Cancelled')
    .reduce((total, order) => total + (Number(order.total) || 0), 0)
  const recentOrders = [...orders].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)).slice(0, 5)
  const filteredOrders = orders.filter((order) => {
    const query = orderSearch.trim().toLowerCase()
    const searchableValues = [
      order.id,
      order.customer?.name,
      order.customer?.email,
      order.customer?.phone,
      ...(order.items || []).flatMap((item) => [item.shape, item.name, item.chain, item.nfcLink]),
    ]
    const matchesQuery = !query || searchableValues
      .some((value) => String(value || '').toLowerCase().includes(query))
    return matchesQuery && (statusFilter === 'All statuses' || displayOrderStatus(order.status) === statusFilter)
  }).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))

  const handleReceiptDownload = async (order) => {
    try {
      await downloadReceipt(order.id)
      setNotice(`Receipt ${order.receiptNumber || ''} downloaded.`)
    } catch (error) {
      setNotice(`Receipt download failed for ${order.id}: ${error.message}`)
    }
  }

  return (
    <section className="min-h-[calc(100vh-76px)] text-white">
      <div className="mx-auto grid w-full max-w-[1600px] gap-5 px-4 py-6 sm:px-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-7 lg:px-8 lg:py-8">
        <aside className="tapik-surface h-fit rounded-xl border border-white/25 p-3 lg:sticky lg:top-6">
          <p className="px-3 pb-3 pt-2 text-xs font-black uppercase tracking-[0.16em] text-blue-200">Workspace</p>
          <nav className="flex gap-2 overflow-x-auto lg:flex-col" aria-label="Admin navigation">
            {TABS.map((item) => (
              <button key={item} type="button" onClick={() => setTab(item)} aria-current={tab === item ? 'page' : undefined} className={`flex shrink-0 items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-bold transition lg:w-full ${tab === item ? 'bg-yellow-300 text-slate-950' : 'text-blue-50 hover:bg-white/10'}`}>
                <span>{item}</span>
                {item === 'Orders' && <span className={`rounded-md px-2 py-0.5 text-xs ${tab === item ? 'bg-slate-950/10' : 'bg-white/10'}`}>{orders.length}</span>}
              </button>
            ))}
          </nav>
          <div className="mt-5 hidden border-t border-white/15 px-3 pt-4 text-xs text-blue-200 lg:block">
            <p className="font-bold text-white">TAPik Store</p>
            <p className="mt-1">Order and inventory control</p>
          </div>
        </aside>

        <div className="min-w-0">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-yellow-300">TAPik management</p>
              <h2 className="mt-1 text-3xl font-black">{tab}</h2>
            </div>
            <p className="text-sm text-blue-100">{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>

          {notice && <p role="status" className="tapik-surface mb-4 rounded-lg border border-white/25 px-4 py-3 text-sm">{notice}</p>}

          {tab === 'Dashboard' && (
            <div className="space-y-6">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  { label: 'Total orders', value: orders.length, note: `${countStatus('Delivered')} delivered` },
                  { label: 'Needs attention', value: awaitingAction, note: `${toVerify} payment${toVerify === 1 ? '' : 's'} to verify · ${toPrepare} to prepare` },
                  { label: 'In transit', value: countStatus('Shipped'), note: `${countStatus('Packed')} packed and ready` },
                  { label: 'Gross sales', value: `PHP ${grossSales.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, note: 'From confirmed payments' },
                ].map((metric) => (
                  <article key={metric.label} className="tapik-surface rounded-xl border border-white/25 p-4">
                    <p className="text-sm font-semibold text-blue-100">{metric.label}</p>
                    <p className="mt-3 text-2xl font-black text-white">{metric.value}</p>
                    <p className="mt-2 text-xs text-blue-200">{metric.note}</p>
                  </article>
                ))}
              </div>

              <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(260px,0.8fr)]">
                <section className="tapik-surface rounded-xl border border-white/25 p-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div><h3 className="text-lg font-black">Recent orders</h3><p className="text-sm text-blue-200">Latest activity from your storefront</p></div>
                    <button type="button" onClick={() => setTab('Orders')} className="rounded-lg border border-white/20 px-3 py-2 text-sm font-bold hover:bg-white/10">All orders</button>
                  </div>
                  {recentOrders.length === 0 ? <p className="py-8 text-center text-sm text-blue-200">Orders will appear here when customers check out.</p> : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[560px] text-left text-sm">
                        <thead className="border-b border-white/15 text-xs uppercase text-blue-200"><tr><th className="py-3 pr-3">Order</th><th className="py-3 pr-3">Customer</th><th className="py-3 pr-3">Total</th><th className="py-3">Status</th></tr></thead>
                        <tbody>{recentOrders.map((order) => <tr key={order.id} className="border-b border-white/10 last:border-0"><td className="py-3 pr-3 font-bold">{order.id}</td><td className="py-3 pr-3">{order.customer?.name || order.customer?.email || 'Customer'}</td><td className="py-3 pr-3">PHP {Number(order.total || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td><td className="py-3"><span className={`tapik-status-badge rounded-md px-2 py-1 text-xs ${orderStatusColor(order.status)}`}>{displayOrderStatus(order.status)}</span></td></tr>)}</tbody>
                      </table>
                    </div>
                  )}
                </section>

                <section className="tapik-surface rounded-xl border border-white/25 p-5">
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
            <section className="tapik-surface rounded-xl border border-white/25 p-4 sm:p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div><h3 className="text-lg font-black">Order management</h3><p className="text-sm text-blue-200">Search orders, inspect customizations, and update fulfillment.</p></div>
                      <div className="flex items-center gap-2"><span className="rounded-md bg-white/10 px-3 py-2 text-sm">{filteredOrders.length} orders</span><button type="button" onClick={() => refreshAdminData(true)} disabled={connectionStatus === 'checking'} className="rounded-lg border border-white/20 px-3 py-2 text-sm font-bold hover:bg-white/10 disabled:opacity-50">{connectionStatus === 'checking' ? 'Syncing...' : 'Refresh'}</button></div>
              </div>
              <div className="mb-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_190px]">
                <input type="search" value={orderSearch} onChange={(event) => setOrderSearch(event.target.value)} placeholder="Search order, customer, email, or phone" className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder:text-blue-200" />
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-lg border border-white/20 bg-slate-900 px-3 py-2 text-white"><option>All statuses</option>{STATUSES.map((status) => <option key={status}>{status}</option>)}</select>
              </div>
              {filteredOrders.length === 0 ? <p className="py-10 text-center text-blue-200">{orders.length ? 'No orders match these filters.' : 'No orders have been placed yet.'}</p> : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1440px] table-fixed text-left text-sm">
                    <colgroup>
                      <col className="w-[280px]" />
                      <col className="w-[130px]" />
                      <col className="w-[400px]" />
                      <col className="w-[150px]" />
                      <col className="w-[130px]" />
                      <col className="w-[180px]" />
                      <col className="w-[170px]" />
                    </colgroup>
                    <thead className="border-b border-white/15 text-xs uppercase text-blue-200"><tr><th className="px-4 py-3">Order / customer</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Items</th><th className="px-4 py-3">Receipt</th><th className="px-4 py-3">Total</th><th className="px-4 py-3">Payment</th><th className="px-4 py-3">Status</th></tr></thead>
                    <tbody>{filteredOrders.map((order) => (
                      <tr key={order.id} className="border-b border-white/10 align-top last:border-0">
                        <td className="px-4 py-4"><p className="break-words font-bold text-white">{order.id}</p><p className="mt-2 font-semibold">{order.customer?.name || 'Customer'}</p><p className="break-words text-xs text-blue-200">{order.customer?.email || order.customer?.phone || ''}</p><p className="mt-1 break-words text-xs text-blue-200">{order.customer?.address || [order.customer?.street, order.customer?.landmark && `(${order.customer.landmark})`, order.customer?.barangay, order.customer?.city, order.customer?.province].filter(Boolean).join(', ')}</p><p className="mt-2 text-xs text-blue-100">{order.courier || 'J&T Express'} · {order.isSimulated ? 'Simulated' : 'Live'} · Tracking: {order.trackingNumber || 'Not assigned'}</p></td>
                        <td className="px-4 py-4 whitespace-nowrap">{order.date ? new Date(order.date).toLocaleDateString() : '—'}</td>
                        <td className="px-4 py-4"><details className="w-full"><summary className="cursor-pointer text-yellow-200">{(order.items || []).length} item(s)</summary><div className="mt-3 space-y-2">{(order.items || []).map((item, index) => <div key={item.id || index} className="tapik-surface flex min-w-0 gap-3 rounded-lg border border-white/25 p-2">{item.image ? <CustomerArtwork image={item.image} /> : <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded bg-white/10 px-2 text-center text-xs text-blue-200">No uploaded photo</div>}<div className="min-w-0"><p className="break-words font-semibold">{item.shape || item.name || 'Custom keychain'} · {item.chain || 'finish not specified'}</p><p className="text-xs text-blue-100">Qty {item.qty} · PHP {item.price}</p>{item.image && <div className="mt-1 flex flex-wrap gap-3 text-xs"><a href={driveImageUrl(item.image, 'original')} target="_blank" rel="noreferrer" className="text-yellow-200 underline">View original</a><a href={driveImageUrl(item.image, 'download')} target="_blank" rel="noreferrer" className="text-yellow-200 underline">Download</a></div>}{item.nfcLink && <a href={item.nfcLink} target="_blank" rel="noreferrer" className="mt-1 block max-w-full truncate text-xs text-yellow-200 underline">{item.nfcLink}</a>}</div></div>)}</div></details></td>
                        <td className="px-4 py-4">{order.paymentStatus === 'Paid' && order.receiptURL ? <div className="min-w-0"><button type="button" onClick={() => handleReceiptDownload(order)} className="text-left text-yellow-200 underline">Download PDF</button><p className="mt-1 break-words text-xs font-normal text-blue-100">{order.receiptNumber}</p></div> : <span className="text-blue-200">After payment is confirmed</span>}</td>
                        <td className="px-4 py-4 whitespace-nowrap font-bold">PHP {Number(order.total || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                        <td className="px-4 py-4">
                          <span className={`tapik-status-badge rounded-md px-2 py-1 text-xs ${order.paymentStatus === 'Paid' ? 'tapik-status-confirmed' : order.paymentStatus === 'Rejected' ? 'tapik-status-cancelled' : order.paymentStatus === 'Submitted' ? 'tapik-status-submitted' : 'tapik-status-pending'}`}>{paymentLabel(order)}</span>
                          {order.duplicateProof && <p className="mt-1 text-xs font-bold text-rose-200">⚠ Same proof used on another order</p>}
                          {displayOrderStatus(order.status) === 'Payment submitted' && <button type="button" onClick={() => setReviewOrderId(order.id)} className="mt-2 rounded-lg bg-yellow-300 px-3 py-1.5 text-xs font-bold text-slate-950">Review proof</button>}
                          {displayOrderStatus(order.status) === 'Payment rejected' && order.paymentRejectReason && <p className="mt-1 break-words text-xs text-blue-200">Reason: {order.paymentRejectReason}</p>}
                        </td>
                        <td className="px-4 py-4">
                          {order.paymentStatus === 'Paid' ? (
                            <select value={displayOrderStatus(order.status)} onChange={(event) => updateOrderStatus(order, event.target.value)} aria-label={`Status for ${order.id}`} className={`tapik-status-select w-full ${orderStatusColor(order.status)}`}>
                              {displayOrderStatus(order.status) === 'Confirmed payment' && <option>Confirmed payment</option>}
                              {FULFILLMENT_STATUSES.map((status) => <option key={status}>{status}</option>)}
                            </select>
                          ) : (
                            <div>
                              <span className={`tapik-status-badge rounded-md px-2 py-1 text-xs ${orderStatusColor(order.status)}`}>{displayOrderStatus(order.status)}</span>
                              {displayOrderStatus(order.status) !== 'Cancelled' && <button type="button" onClick={() => updateOrderStatus(order, 'Cancelled')} className="mt-2 block text-xs text-rose-200 underline">Cancel order</button>}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {reviewOrderId && orders.find((order) => order.id === reviewOrderId) && (
            <PaymentReview
              order={orders.find((order) => order.id === reviewOrderId)}
              onClose={() => setReviewOrderId(null)}
              onDecision={verifyPayment}
            />
          )}

          {tab === 'Inventory' && (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.8fr)]">
            <div className="space-y-3">
              {products.map((product) => (
                <article key={product.id} className="tapik-surface flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/25 p-4">
                  <div className="flex min-w-0 items-center gap-3">
                    {product.imageUrl || product.image ? <img src={product.imageUrl || product.image} alt="" className="h-14 w-14 rounded-md bg-white object-contain" /> : null}
                    <div className="min-w-0">
                      <h2 className="font-bold">{product.name}</h2>
                      <p className="text-sm text-blue-100">PHP {product.price} · Stock {product.stock ?? 0}</p>
                      {product.productLink && <a href={product.productLink} target="_blank" rel="noreferrer" className="break-all text-xs text-yellow-200 underline">{product.productLink}</a>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => editProduct(product)} className="rounded-lg border border-white/25 px-3 py-2 text-sm hover:bg-white/10">Edit</button>
                    <button type="button" onClick={() => removeProduct(product)} className="rounded-lg border border-rose-300/50 px-3 py-2 text-sm text-rose-200 hover:bg-rose-400/10">Remove</button>
                  </div>
                </article>
              ))}
            </div>
            <form onSubmit={saveProduct} className="tapik-surface h-fit space-y-3 rounded-xl border border-white/25 p-5">
              <h2 className="text-lg font-bold">{editingId ? 'Edit inventory item' : 'Add inventory item'}</h2>
              <input required placeholder="Product name" value={productForm.name} onChange={(event) => updateForm('name', event.target.value)} className="w-full rounded-lg border border-white/25 bg-white/10 px-3 py-2 text-white placeholder:text-blue-200" />
              <textarea placeholder="Description" value={productForm.description} onChange={(event) => updateForm('description', event.target.value)} rows={3} className="w-full rounded-lg border border-white/25 bg-white/10 px-3 py-2 text-white placeholder:text-blue-200" />
              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm">Price<input required min="0" type="number" step="0.01" value={productForm.price} onChange={(event) => updateForm('price', event.target.value)} className="mt-1 w-full rounded-lg border border-white/25 bg-white/10 px-3 py-2 text-white" /></label>
                <label className="text-sm">Stock<input required min="0" type="number" step="1" value={productForm.stock} onChange={(event) => updateForm('stock', event.target.value)} className="mt-1 w-full rounded-lg border border-white/25 bg-white/10 px-3 py-2 text-white" /></label>
              </div>
              <input type="url" placeholder="Image URL" value={productForm.imageUrl} onChange={(event) => updateForm('imageUrl', event.target.value)} className="w-full rounded-lg border border-white/25 bg-white/10 px-3 py-2 text-white placeholder:text-blue-200" />
              <input type="url" placeholder="Product link" value={productForm.productLink} onChange={(event) => updateForm('productLink', event.target.value)} className="w-full rounded-lg border border-white/25 bg-white/10 px-3 py-2 text-white placeholder:text-blue-200" />
              <div className="flex gap-2">
                <button type="submit" className="rounded-lg bg-yellow-400 px-4 py-2 font-bold text-slate-950">Save inventory</button>
                {editingId && <button type="button" onClick={() => { setEditingId(null); setProductForm(emptyProduct) }} className="rounded-lg border border-white/25 px-4 py-2">Cancel</button>}
              </div>
            </form>
          </div>
        )}

          {tab === 'Apps Script' && (
          <div className="tapik-surface max-w-3xl rounded-xl border border-white/25 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-bold">Google Sheets connection</h2>
              <span className={`rounded-full px-3 py-1 text-sm font-bold ${connectionStatus === 'connected' ? 'bg-emerald-300/20 text-emerald-200' : connectionStatus === 'error' ? 'bg-rose-300/20 text-rose-100' : 'bg-amber-300/20 text-amber-100'}`}>
                {connectionStatus === 'connected' ? 'Connected' : connectionStatus === 'checking' ? 'Checking...' : connectionStatus === 'error' ? 'Connection failed' : 'Not configured'}
              </span>
            </div>
            <p className="mt-3 text-blue-100">The Apps Script web app stores orders, order items, uploaded artwork links, NFC URLs, and inventory in the TAPik spreadsheet.</p>
            <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
              <div><dt className="font-bold text-yellow-200">Required tabs</dt><dd>Products, Orders, OrderItems, Customers, ShippingRates, Shipments</dd></div>
              <div><dt className="font-bold text-yellow-200">Configuration</dt><dd>Set VITE_APPS_SCRIPT_URL in the project .env, then redeploy Apps Script and restart Vite.</dd></div>
            </dl>
            <p className="mt-5 text-sm text-blue-100">Orders are sent to Apps Script automatically at checkout. The admin order list syncs when this dashboard opens and every 30 seconds while it stays open.</p>
            {lastSyncedAt && <p className="mt-2 text-xs text-blue-200">Last synced {lastSyncedAt.toLocaleTimeString()}.</p>}
            <p className="mt-4 text-xs text-blue-200">Uploaded designs are placed in Google Drive and their share links are stored with each order item. Use a restricted deployment and production authentication before handling real customer data.</p>
            <button type="button" onClick={() => refreshAdminData(true)} disabled={connectionStatus === 'checking'} className="mt-5 rounded-lg bg-yellow-300 px-4 py-2 font-bold text-slate-950 disabled:opacity-50">{connectionStatus === 'checking' ? 'Syncing...' : 'Sync orders now'}</button>
          </div>
        )}
        </div>
      </div>
    </section>
  )
}