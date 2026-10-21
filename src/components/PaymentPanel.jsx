import { useState } from 'react'
import DemoQr from './DemoQr'
import { api } from '../services/api'
import { resizeImageToDataUrl } from '../lib/image'

const REFERENCE_PATTERN = /^[A-Za-z0-9-]{6,30}$/

// Shows the demo payment QR and collects the reference number and proof of payment.
export default function PaymentPanel({ order, account, onUpdated }) {
  const [reference, setReference] = useState('')
  const [proof, setProof] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

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
    if (!REFERENCE_PATTERN.test(reference.trim())) {
      setError('Enter the reference number from your payment (6-30 letters, numbers, or dashes).')
      return
    }
    if (!proof) {
      setError('Upload a screenshot or photo of your proof of payment.')
      return
    }

    setBusy(true)
    setError('')
    try {
      const configured = api.isConfigured()
      if (configured) {
        const result = await api.submitPaymentProof({
          orderId: order.id,
          customerId: account.id,
          reference: reference.trim(),
          proofImage: proof,
        })
        if (!result.ok) throw new Error(result.error || 'The proof of payment could not be saved.')
      }
      onUpdated({
        ...order,
        status: 'Payment submitted',
        paymentStatus: 'Submitted',
        paymentReference: reference.trim().toUpperCase(),
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
          <li>Enter the reference number and upload the screenshot below.</li>
        </ol>

        <input
          value={reference}
          onChange={(event) => { setReference(event.target.value); setError('') }}
          placeholder="Payment reference number *"
          aria-label="Payment reference number"
          className="w-full rounded-xl border border-white/20 bg-white/5 p-2 text-white placeholder-blue-200"
        />

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
