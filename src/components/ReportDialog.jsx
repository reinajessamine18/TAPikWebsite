import { useState } from 'react'
import {
  buildCsv, buildReportHtml, describeFilters, downloadTextFile, openPrintableReport, summarize,
} from '../lib/reports'

const money = (amount) =>
  (Number(amount) || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// Previews the report for the orders that match the Orders-tab filters and exports it.
export default function ReportDialog({ orders, filters, onClose }) {
  const [message, setMessage] = useState('')
  const summary = summarize(orders)
  const filterText = describeFilters(filters)

  const downloadCsv = () => {
    downloadTextFile(`tapik-report-${new Date().toISOString().slice(0, 10)}.csv`, buildCsv(orders), 'text/csv;charset=utf-8')
    setMessage('CSV downloaded. It opens in Excel or Google Sheets.')
  }

  const printReport = () => {
    const opened = openPrintableReport(buildReportHtml(orders, filters))
    setMessage(opened ? 'In the print window, choose "Save as PDF" as the printer to keep a PDF.' : 'Your browser blocked the report window. Allow pop-ups for this site and try again.')
  }

  return (
    <div
      className="fixed inset-0 z-[99990] flex items-start justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm sm:items-center"
      onClick={(event) => { if (event.target === event.currentTarget) onClose() }}
    >
      <div role="dialog" aria-modal="true" aria-label="Generate report" className="tapik-surface my-auto w-full max-w-lg rounded-2xl border border-white/25 p-5 text-white">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-xl font-black">Generate report</h3>
            <p className="text-sm text-blue-200">Covers the orders that match the filters in the Orders tab.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-2xl leading-none text-blue-100 hover:text-white">×</button>
        </div>

        <div className="rounded-xl border border-white/15 bg-white/5 p-4">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-200">Filters</p>
          <p className="mt-1 text-sm">{filterText.length ? filterText.join(' · ') : 'None (all orders)'}</p>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-blue-200">Orders</p><p className="text-xl font-black">{summary.orderCount}</p></div>
            <div><p className="text-blue-200">Sales (confirmed payments)</p><p className="text-xl font-black">PHP {money(summary.sales)}</p></div>
          </div>
          {Object.keys(summary.byStatus).length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-2 text-xs">
              {Object.entries(summary.byStatus).map(([status, count]) => (
                <li key={status} className="rounded-md bg-white/10 px-2 py-1">{status}: {count}</li>
              ))}
            </ul>
          )}
        </div>

        {orders.length === 0 && <p className="mt-3 text-sm text-amber-200">No orders match the current filters, so the report would be empty.</p>}
        {message && <p role="status" className="mt-3 text-sm text-blue-100">{message}</p>}

        <div className="mt-5 flex flex-wrap justify-end gap-3">
          <button type="button" onClick={downloadCsv} disabled={orders.length === 0} className="rounded-lg border border-white/30 px-4 py-2 font-bold hover:bg-white/10 disabled:opacity-40">Download CSV</button>
          <button type="button" onClick={printReport} disabled={orders.length === 0} className="rounded-lg bg-yellow-300 px-4 py-2 font-bold text-slate-950 disabled:opacity-40">Print / Save as PDF</button>
        </div>
      </div>
    </div>
  )
}
