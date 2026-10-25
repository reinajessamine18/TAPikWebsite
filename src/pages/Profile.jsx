import { useState } from 'react'
import AddressFields from '../components/AddressFields'
import Modal from '../components/Modal'
import PasswordInput from '../components/PasswordInput'
import { REGION, normalizeDetails } from '../lib/address'
import { changePassword, loadDeliveryDetails, saveDeliveryDetails } from '../lib/storage'
import { displayOrderStatus, orderStatusColor } from '../lib/orderStatus'
import { SHAPES, CHAINS } from '../lib/pricing'

const labelOf = (list, id) => list.find((option) => option.id === id)?.label || id || ''
const money = (amount) =>
  (Number(amount) || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const itemsText = (order) =>
  (order.items || [])
    .map((item) => `${labelOf(SHAPES, item.shape)} / ${labelOf(CHAINS, item.chain)} ×${Number(item.qty) || 1}`)
    .join(', ')

const inputClass = 'mt-1 w-full rounded-xl border border-white/20 bg-white/5 p-2 text-white placeholder-blue-200'
const HISTORY_PREVIEW = 5
const PHONE_PATTERN = /^\+?[0-9 ()-]{7,20}$/

// Saved details are one object shared with checkout; each form on this page updates only its own fields.
const storedDetails = (accountId) => normalizeDetails(loadDeliveryDetails(accountId)) || {}
const saveDetails = (accountId, fields) =>
  saveDeliveryDetails(accountId, { ...storedDetails(accountId), ...fields, province: REGION })

function InfoRow({ label, value }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-blue-200">{label}</dt>
      <dd className="mt-0.5 break-words font-medium">{value || <span className="text-blue-200">Not added</span>}</dd>
    </div>
  )
}

function FormButtons({ onCancel, saveLabel }) {
  return (
    <div className="mt-5 flex gap-3">
      <button type="button" onClick={onCancel} className="flex-1 rounded-xl border border-white/30 px-4 py-3 font-semibold hover:bg-white/10">Cancel</button>
      <button type="submit" className="flex-1 rounded-xl bg-yellow-400 px-4 py-3 font-bold text-slate-950 hover:bg-yellow-300">{saveLabel}</button>
    </div>
  )
}

// The signed-in customer's profile: contact details, saved delivery address, password, and purchase history.
// Each detail is shown read-only; its Edit button opens a dialog.
export default function Profile({ account, setPage, orders }) {
  const [saved, setSaved] = useState(() => storedDetails(account.id))
  const [editing, setEditing] = useState(null) // 'contact' | 'address' | 'password' | null
  const [notice, setNotice] = useState('')
  const [formError, setFormError] = useState('')
  const [contact, setContact] = useState({ name: '', phone: '' })
  const [address, setAddress] = useState({})
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' })
  const [showAllOrders, setShowAllOrders] = useState(false)

  const name = saved.name || account.name
  const addressText = [saved.street, saved.landmark && `(${saved.landmark})`, saved.barangay, saved.city, saved.city && REGION]
    .filter(Boolean).join(', ')
  const spent = orders
    .filter((order) => order.paymentStatus === 'Paid' && displayOrderStatus(order.status) !== 'Cancelled')
    .reduce((sum, order) => sum + (Number(order.total) || 0), 0)
  const visibleOrders = showAllOrders ? orders : orders.slice(0, HISTORY_PREVIEW)

  const openEdit = (kind) => {
    setFormError('')
    setNotice('')
    if (kind === 'contact') setContact({ name: saved.name || account.name || '', phone: saved.phone || '' })
    if (kind === 'address') {
      setAddress({
        name: saved.name || account.name || '', email: saved.email || account.email || '', phone: saved.phone || '',
        province: REGION, city: saved.city || '', barangay: saved.barangay || '', street: saved.street || '',
        landmark: saved.landmark || '',
      })
    }
    if (kind === 'password') setPasswords({ current: '', next: '', confirm: '' })
    setEditing(kind)
  }

  const closeEdit = () => setEditing(null)

  const finishSave = (message) => {
    setSaved(storedDetails(account.id))
    setEditing(null)
    setNotice(message)
  }

  const saveContact = (event) => {
    event.preventDefault()
    const phone = contact.phone.trim()
    if (!contact.name.trim()) {
      setFormError('Enter the name couriers should ask for.')
      return
    }
    if (!PHONE_PATTERN.test(phone) || phone.replace(/\D/g, '').length < 7) {
      setFormError('Enter a valid contact number, for example 09171234567.')
      return
    }
    saveDetails(account.id, { name: contact.name.trim(), phone })
    finishSave('Contact details saved. We will use them for your deliveries.')
  }

  const saveAddress = (event) => {
    event.preventDefault()
    const { city, barangay, street, landmark } = address
    saveDetails(account.id, { city, barangay, street, landmark })
    finishSave('Delivery address saved. It will be filled in for you at checkout.')
  }

  const updatePassword = (event) => {
    event.preventDefault()
    if (passwords.next.length < 6) {
      setFormError('Your new password must be at least 6 characters.')
      return
    }
    if (passwords.next !== passwords.confirm) {
      setFormError('The new passwords do not match.')
      return
    }
    try {
      changePassword(account.id, passwords.current, passwords.next)
      finishSave('Your password was changed.')
    } catch (error) {
      setFormError(error.message)
    }
  }

  const card = 'tapik-surface rounded-2xl border border-white/25 p-6'
  const editButton = 'shrink-0 rounded-full border border-white/40 px-4 py-1.5 text-sm font-bold hover:bg-white/10'

  return (
    <div className="min-h-screen text-white">
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-10">
        <div>
          <h1 className="text-3xl font-black">{name}</h1>
          <p className="break-all text-blue-100">{account.email}</p>
        </div>

        {notice && <p role="status" className="rounded-xl border border-green-300/40 bg-green-950/40 px-4 py-3 text-sm font-semibold text-green-300">{notice}</p>}

        <div className="grid gap-6 lg:grid-cols-2">
          <section className={card}>
            <div className="mb-4 flex items-start justify-between gap-3">
              <h2 className="text-xl font-bold">Contact details</h2>
              <button type="button" onClick={() => openEdit('contact')} className={editButton}>Edit</button>
            </div>
            <dl className="space-y-3 text-sm">
              <InfoRow label="Name" value={name} />
              <InfoRow label="Contact number" value={saved.phone} />
              <InfoRow label="Email" value={account.email} />
            </dl>
          </section>

          <section className={card}>
            <div className="mb-4 flex items-start justify-between gap-3">
              <h2 className="text-xl font-bold">Password</h2>
              <button type="button" onClick={() => openEdit('password')} className={editButton}>Change</button>
            </div>
            <dl className="text-sm">
              <InfoRow label="Password" value="••••••••" />
            </dl>
          </section>

          <section className={`${card} lg:col-span-2`}>
            <div className="mb-4 flex items-start justify-between gap-3">
              <h2 className="text-xl font-bold">Delivery address</h2>
              <button type="button" onClick={() => openEdit('address')} className={editButton}>{addressText ? 'Edit' : 'Add'}</button>
            </div>
            <dl className="text-sm">
              <InfoRow label="Deliver to" value={addressText} />
            </dl>
            <p className="mt-3 text-xs text-blue-100">This is filled in for you at checkout. Delivery is within Metro Manila only.</p>
          </section>
        </div>

        <section className={card}>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">Purchase history</h2>
              <p className="text-sm text-blue-100">{orders.length} order{orders.length === 1 ? '' : 's'} · PHP {money(spent)} paid so far</p>
            </div>
            <button type="button" onClick={() => setPage('orders')} className="rounded-full border border-yellow-300 px-4 py-2 text-sm font-bold text-yellow-300">Track orders and receipts</button>
          </div>

          {orders.length === 0 ? (
            <p className="py-6 text-center text-blue-100">You have not placed any orders yet.</p>
          ) : (
            <ul className="divide-y divide-white/15">
              {visibleOrders.map((order) => (
                <li key={order.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="break-all font-semibold">{order.id}</p>
                    <p className="text-xs text-blue-100">{order.date ? new Date(order.date).toLocaleDateString() : ''}</p>
                    <p className="mt-1 text-sm text-blue-50">{itemsText(order)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">PHP {money(order.total)}</p>
                    <span className={`tapik-status-badge mt-1 ${orderStatusColor(order.status)}`}>{displayOrderStatus(order.status)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {orders.length > HISTORY_PREVIEW && (
            <button type="button" onClick={() => setShowAllOrders((open) => !open)} className="mt-3 text-sm font-bold text-yellow-300 underline">
              {showAllOrders ? 'Show fewer' : `Show all ${orders.length} orders`}
            </button>
          )}
        </section>
      </div>

      {editing === 'contact' && (
        <Modal title="Edit contact details" onClose={closeEdit}>
          <form onSubmit={saveContact} className="space-y-3">
            <label className="block text-sm font-semibold">
              Full name
              <input required autoComplete="name" value={contact.name} onChange={(e) => { setContact({ ...contact, name: e.target.value }); setFormError('') }} className={inputClass} />
            </label>
            <label className="block text-sm font-semibold">
              Contact number
              <input required type="tel" inputMode="tel" autoComplete="tel" placeholder="09171234567" value={contact.phone} onChange={(e) => { setContact({ ...contact, phone: e.target.value }); setFormError('') }} className={inputClass} />
            </label>
            {formError && <p role="alert" className="text-sm font-semibold text-rose-300">{formError}</p>}
            <FormButtons onCancel={closeEdit} saveLabel="Save" />
          </form>
        </Modal>
      )}

      {editing === 'address' && (
        <Modal title="Edit delivery address" onClose={closeEdit}>
          <form onSubmit={saveAddress} className="space-y-3">
            <AddressFields
              form={address}
              onChange={(key, value) => setAddress((current) => ({ ...current, [key]: value, ...(key === 'city' ? { barangay: '' } : {}) }))}
              showContact={false}
              showInstructions={false}
            />
            <FormButtons onCancel={closeEdit} saveLabel="Save address" />
          </form>
        </Modal>
      )}

      {editing === 'password' && (
        <Modal title="Change password" onClose={closeEdit}>
          <form onSubmit={updatePassword} className="space-y-3">
            <label className="block text-sm font-semibold">
              Current password
              <PasswordInput required autoComplete="current-password" value={passwords.current} onChange={(e) => { setPasswords({ ...passwords, current: e.target.value }); setFormError('') }} className={inputClass} />
            </label>
            <label className="block text-sm font-semibold">
              New password
              <PasswordInput required minLength={6} autoComplete="new-password" value={passwords.next} onChange={(e) => { setPasswords({ ...passwords, next: e.target.value }); setFormError('') }} className={inputClass} />
            </label>
            <label className="block text-sm font-semibold">
              Confirm new password
              <PasswordInput required minLength={6} autoComplete="new-password" value={passwords.confirm} onChange={(e) => { setPasswords({ ...passwords, confirm: e.target.value }); setFormError('') }} className={inputClass} />
            </label>
            {formError && <p role="alert" className="text-sm font-semibold text-rose-300">{formError}</p>}
            <FormButtons onCancel={closeEdit} saveLabel="Change password" />
          </form>
        </Modal>
      )}
    </div>
  )
}
