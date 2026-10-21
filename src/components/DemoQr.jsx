const SIZE = 25
const FINDER = 7

// Small deterministic generator so the same order always shows the same pattern.
function seededRandom(seed) {
  let state = 0
  for (let i = 0; i < seed.length; i++) state = (state * 31 + seed.charCodeAt(i)) >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const inFinder = (x, y) =>
  (x < FINDER && y < FINDER) ||
  (x >= SIZE - FINDER && y < FINDER) ||
  (x < FINDER && y >= SIZE - FINDER)

function finderCell(x, y) {
  const localX = x < FINDER ? x : x - (SIZE - FINDER)
  const localY = y < FINDER ? y : y - (SIZE - FINDER)
  const ring = Math.max(Math.abs(localX - 3), Math.abs(localY - 3))
  return ring !== 2
}

// A decorative stand-in for a payment QR code. It is NOT scannable and encodes nothing.
export default function DemoQr({ seed }) {
  const random = seededRandom(String(seed))
  const cells = []
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const filled = inFinder(x, y) ? finderCell(x, y) : random() > 0.52
      if (filled) cells.push(<rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" />)
    }
  }

  return (
    <svg
      viewBox={`-2 -2 ${SIZE + 4} ${SIZE + 4}`}
      role="img"
      aria-label="Demo payment QR code"
      className="h-auto w-full rounded-lg bg-white"
      shapeRendering="crispEdges"
    >
      <g fill="#0f172a">{cells}</g>
    </svg>
  )
}
