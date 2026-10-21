import { useEffect, useState } from 'react'
import { api } from '../services/api'

// Admin modal for checking a submitted proof of payment before confirming or rejecting it.
export default function PaymentReview({ order, onClose, onDecision }) {
  const [proof, setProof] = useState(order.proofImage || '')
  const [proofError, setProofError] = useState('')
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (order.proofImage || !api.isConfigured()) return undefined
    let active = true
    api.getPaymentProof({ orderId: order.id })
      .then((result) => {
        if (!result.ok || !result.data) throw new Error(result.error || 'The proof image could not be loaded.')
        if (active) setProof(`data:${result.mimeType || 'image/jpeg'};base64,${result.data}`)
      })
      .catch((loadError) => {
        if (active) setProofError(loadError.message)
      })
    return () => { active = false }
  }, [order.id, order.proofImage])

  const decide = async (decision) => {
    if (decision === 'reject' && !reason.trim()) {
      setError('Give a reason so the customer knows what to fix.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await onDecision(order, decision, reason.trim())
    } catch (decisionError) {
      setError(decisionError.message)
      setBusy(false)
    }
  }

  const amount = Number(order.total || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm"
      onClick={(event) => { if (event.target === event.currentTarget && !busy) onClose() }}
    >
      <div role="dialog" aria-modal="true" aria-label="Review proof of payment" className="tapik-surface w-full max-w-2xl rounded-2xl border border-white/25 p-5 text-white">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-xl font-black">Verify payment</h3>
            <p className="text-sm text-blue-200">Order {order.id} · {order.customer?.name || 'Customer'}</p>
          </div>
          <button type="button" onClick={onClose} disabled={busy} aria-label="Close" className="text-2xl leading-none text-blue-100 hover:text-white">×</button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            {proof ? (
              <a href={proof} target="_blank" rel="noreferrer"><img src={proof} alt="Customer proof of payment" className="max-h-80 w-full rounded-lg bg-white object-contain" /></a>
            ) : (
              <div className="flex h-48 items-center justify-center rounded-lg bg-white/10 px-3 text-center text-sm text-blue-200">{proofError || 'Loading proof of payment…'}</div>
            )}
          </div>

          <dl className="space-y-3 text-sm">
            <div><dt className="text-blue-200">Amount due</dt><dd className="text-xl font-black">PHP {amount}</dd></div>
            <div><dt className="text-blue-200">Submitted</dt><dd>{order.paymentSubmittedAt ? new Date(order.paymentSubmittedAt).toLocaleString() : '—'}</dd></div>
            {order.duplicateProof && (
              <p role="alert" className="rounded-lg border border-rose-300/50 bg-rose-950/40 p-2 font-bold text-rose-100">
                Warning: this same proof image was already submitted for another order.
              </p>
            )}
            <p className="text-xs text-blue-200">Check that the amount, date and reference shown on the screenshot match this order before confirming.</p>
          </dl>
        </div>

        {rejecting && (
          <textarea
            value={reason}
            onChange={(event) => { setReason(event.target.value); setError('') }}
            rows={2}
            maxLength={200}
            placeholder="Reason for rejection (shown to the customer)"
            className="mt-4 w-full rounded-lg border border-white/25 bg-white/10 p-2 text-white placeholder:text-blue-200"
          />
        )}
        {error && <p role="alert" className="mt-3 text-sm text-rose-200">{error}</p>}

        <div className="mt-5 flex flex-wrap justify-end gap-3">
          {rejecting ? (
            <>
              <button type="button" disabled={busy} onClick={() => { setRejecting(false); setError('') }} className="rounded-lg border border-white/25 px-4 py-2 font-bold hover:bg-white/10">Back</button>
              <button type="button" disabled={busy} onClick={() => decide('reject')} className="rounded-lg bg-rose-400 px-4 py-2 font-bold text-slate-950 disabled:opacity-60">{busy ? 'Saving…' : 'Confirm rejection'}</button>
            </>
          ) : (
            <>
              <button type="button" disabled={busy} onClick={() => setRejecting(true)} className="rounded-lg border border-rose-300/60 px-4 py-2 font-bold text-rose-100 hover:bg-rose-400/10">Reject</button>
              <button type="button" disabled={busy} onClick={() => decide('confirm')} className="rounded-lg bg-emerald-300 px-4 py-2 font-bold text-slate-950 disabled:opacity-60">{busy ? 'Saving…' : 'Confirm payment'}</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
