import { useEffect, useState } from 'react'
import DemoQr from './DemoQr'
import LoadingOverlay from './LoadingOverlay'
import { api } from '../services/api'
import { resizeImageToDataUrl } from '../lib/image'

// Shows the demo payment QR and collects the proof of payment.
export default function PaymentPanel({ order, account, onUpdated }) {
  const [proof, setProof] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // Warn before the tab is closed or refreshed while the proof is still uploading.
  useEffect(() => {
    if (!busy) return undefined
    const warn = (event) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [busy])

  const handleFile = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image (a screenshot or photo of your payment).')
      return
    }
    try {
      setProof(await resizeImageToDataUrl(file))
      setError('')
    } catch (loadError) {
      setError(loadError.message)
    }
  }

  const submit = async (event) => {
    event.preventDefault()
    if (busy) return
    if (!proof) {
      setError('Upload a screenshot or photo of your proof of payment.')
      return
    }

    setBusy(true)
    setError('')
    try {
      const configured = api.isConfigured()
      let current = order
      if (configured) {
        if (!order.savedToAppsScript) {
          // The order reaches the order database together with the payment, in this one step.
          const created = await api.createOrder({ ...order, items: (order.items || []).map((item) => ({ ...item, image: '' })) })
          if (!created.ok || !created.orderId) throw new Error(created.error || 'The order could not be saved.')
          current = { ...order, trackingNumber: created.trackingNumber, courier: 'J&T Express', isSimulated: true, savedToAppsScript: true }
        }
        const result = await api.submitPaymentProof({
          orderId: current.id,
          customerId: account.id,
          proofImage: proof,
          // Artwork that has not been uploaded yet travels with the payment.
          designs: (order.items || []).map((item) => (String(item.image || '').startsWith('data:image/') ? item.image : '')),
        })
        if (!result.ok) throw new Error(result.error || 'The proof of payment could not be saved.')
      }
      onUpdated({
        ...current,
        status: 'Payment submitted',
        paymentStatus: 'Submitted',
        paymentRejectReason: '',
        // Without the order database the proof is kept in this browser only.
        ...(configured ? {} : { proofImage: proof, hasProof: true }),
      })
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="tapik-surface grid gap-5 rounded-2xl border border-white/25 p-5 text-left sm:grid-cols-[180px_minmax(0,1fr)]">
      {busy && (
        <LoadingOverlay
          title="Submitting your payment…"
          message="This can take a few seconds while we save your order and upload your proof of payment and design. Please don't close or refresh this page."
        />
      )}
      <div>
        <DemoQr seed={order.id} />
        <p className="mt-2 text-center text-xs font-bold uppercase tracking-wide text-yellow-300">Demo QR · not a real payment</p>
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-sm text-blue-100">Amount to pay</p>
          <p className="text-2xl font-black text-white">PHP {Number(order.total || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
          <p className="text-xs text-blue-200">Order {order.id}</p>
        </div>

        <ol className="list-decimal space-y-1 pl-5 text-sm text-blue-50">
          <li>Scan the QR code with your e-wallet or banking app.</li>
          <li>Pay the exact amount, then take a screenshot of the confirmation.</li>
          <li>Upload the screenshot below.</li>
        </ol>

        <div className="flex flex-wrap items-center gap-3">
          <label className="cursor-pointer rounded-lg border border-white/40 px-4 py-2 text-sm font-bold hover:bg-white/10">
            {proof ? 'Replace screenshot' : 'Upload proof of payment *'}
            <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
          </label>
          {proof && <img src={proof} alt="Proof of payment preview" className="h-16 w-16 rounded bg-white object-cover" />}
        </div>

        {error && <p role="alert" className="text-sm text-rose-200">{error}</p>}

        <button type="submit" disabled={busy} className="w-full rounded-full bg-yellow-400 py-3 font-bold text-blue-900 disabled:opacity-60">
          {busy ? 'Submitting...' : 'Submit proof of payment'}
        </button>
        <p className="text-xs text-blue-200">Your order stays on hold until our team verifies the payment.</p>
      </div>
    </form>
  )
}
