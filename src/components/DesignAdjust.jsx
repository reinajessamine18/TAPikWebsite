import { MAX_ZOOM, MIN_ZOOM } from '../lib/designCrop'

const stepButton = 'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/40 text-xl font-bold leading-none hover:bg-white/10 disabled:opacity-40'

// Zoom controls for the uploaded design. Dragging the design on the keychain moves it.
export default function DesignAdjust({ zoom, onZoom, onReset }) {
  return (
    <div className="mx-auto mt-3 w-full max-w-sm rounded-2xl border border-white/25 bg-white/10 p-4 text-white">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold">Zoom and position your design</p>
        <button type="button" onClick={onReset} className="text-sm text-yellow-300 underline underline-offset-2">Reset</button>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <button type="button" onClick={() => onZoom(zoom - 0.1)} disabled={zoom <= MIN_ZOOM} aria-label="Zoom out" className={stepButton}>−</button>
        <input
          type="range"
          min={MIN_ZOOM}
          max={MAX_ZOOM}
          step="0.01"
          value={zoom}
          onChange={(event) => onZoom(Number(event.target.value))}
          aria-label="Zoom"
          className="min-w-0 flex-1 accent-yellow-400"
        />
        <button type="button" onClick={() => onZoom(zoom + 0.1)} disabled={zoom >= MAX_ZOOM} aria-label="Zoom in" className={stepButton}>+</button>
        <span className="w-12 shrink-0 text-right text-sm font-bold">{Math.round(zoom * 100)}%</span>
      </div>

      <p className="mt-3 text-xs text-blue-100">
        Drag your design on the keychain to move it, or click it and use the arrow keys. Anything outside the acrylic window will be cut off.
      </p>
    </div>
  )
}
