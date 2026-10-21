// A full-screen "please wait" box with a spinner. It sits above the page so nothing underneath can be clicked.
export default function LoadingOverlay({ title, message }) {
  return (
    <div
      className="fixed inset-0 z-[100001] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      role="alertdialog"
      aria-modal="true"
      aria-live="assertive"
      aria-labelledby="loading-overlay-title"
    >
      <div className="tapik-surface w-full max-w-sm rounded-3xl border border-white/25 p-8 text-center">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-white/25 border-t-yellow-400" />
        <h2 id="loading-overlay-title" className="text-xl font-bold">{title}</h2>
        <p className="mt-2 text-sm text-blue-100">{message}</p>
      </div>
    </div>
  )
}
