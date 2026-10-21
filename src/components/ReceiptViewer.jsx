import { useState } from 'react'
import Modal from './Modal'
import { buildReceiptHtml, receiptNumberOf } from '../lib/receipt'
import { openPrintableReport } from '../lib/reports'
import { downloadReceipt } from '../services/api'

// Shows a paid order's receipt on screen, with Print and Download.
export default function ReceiptViewer({ order, onClose }) {
  const [message, setMessage] = useState('')
  const [downloading, setDownloading] = useState(false)
  const html = buildReceiptHtml(order)

  const print = () => {
    const opened = openPrintableReport(html)
    setMessage(opened
      ? 'In the print window, choose a printer, or "Save as PDF" to keep a copy.'
      : 'Your browser blocked the print window. Allow pop-ups for this site and try again.')
  }

  const download = async () => {
    setDownloading(true)
    setMessage('')
    try {
      await downloadReceipt(order.id)
    } catch (error) {
      setMessage(`The PDF could not be downloaded (${error.message}). You can still print this receipt and save it as a PDF.`)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <Modal title={`Receipt ${receiptNumberOf(order)}`} onClose={onClose} wide>
      <iframe title="Receipt" srcDoc={html} className="h-[60vh] w-full rounded-lg bg-white" />
      {message && <p role="status" className="mt-3 text-sm text-blue-100">{message}</p>}
      <div className="mt-4 flex flex-wrap justify-end gap-3">
        <button type="button" onClick={onClose} className="rounded-xl border border-white/30 px-4 py-2 font-semibold hover:bg-white/10">Close</button>
        <button type="button" onClick={download} disabled={downloading} className="rounded-xl border border-white/30 px-4 py-2 font-semibold hover:bg-white/10 disabled:opacity-50">
          {downloading ? 'Downloading…' : 'Download PDF'}
        </button>
        <button type="button" onClick={print} className="rounded-xl bg-yellow-400 px-4 py-2 font-bold text-slate-950 hover:bg-yellow-300">Print</button>
      </div>
    </Modal>
  )
}
