// Zoom and position ("crop") of an uploaded design inside the acrylic's design window.
//
// All numbers are fractions of the window, so they do not depend on screen size:
//   zoom 1 = the image just covers the window; 4 = four times larger.
//   cx, cy = how far the image centre is moved from the window centre (a fraction of the window's width / height).

export const DEFAULT_CROP = { zoom: 1, cx: 0, cy: 0 }
export const MIN_ZOOM = 1
export const MAX_ZOOM = 4

// The image's size, as a fraction of the window, when it exactly covers it. Aspects are width / height.
const coverSize = (windowAspect, imageAspect) => ({
  w: Math.max(1, imageAspect / windowAspect),
  h: Math.max(1, windowAspect / imageAspect),
})

// Keeps the zoom in range and the image from being dragged far enough to leave a gap inside the window.
export function clampCrop(crop, windowAspect, imageAspect) {
  const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(crop.zoom) || MIN_ZOOM))
  const cover = coverSize(windowAspect, imageAspect)
  const limitX = (cover.w * zoom - 1) / 2
  const limitY = (cover.h * zoom - 1) / 2
  return {
    zoom,
    cx: Math.max(-limitX, Math.min(limitX, Number(crop.cx) || 0)),
    cy: Math.max(-limitY, Math.min(limitY, Number(crop.cy) || 0)),
  }
}

// CSS for an <img> placed inside the window (which must be position: relative / absolute and overflow hidden).
export function imageStyle(crop, windowAspect, imageAspect) {
  const { zoom, cx, cy } = clampCrop(crop, windowAspect, imageAspect)
  const cover = coverSize(windowAspect, imageAspect)
  const w = cover.w * zoom
  const h = cover.h * zoom
  return {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: `${w * 100}%`,
    height: `${h * 100}%`,
    maxWidth: 'none',
    transform: `translate(calc(-50% + ${(cx / w) * 100}%), calc(-50% + ${(cy / h) * 100}%))`,
    userSelect: 'none',
    pointerEvents: 'none',
  }
}

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('The image could not be opened.'))
    image.src = src
  })
}

// Draws exactly what is visible in the window into a new image, so everything downstream (cart, order, Drive,
// admin) shows and prints the cut design without needing to know about zoom or position.
export async function bakeCrop(src, crop, windowAspect, outputWidth = 1000) {
  const image = await loadImage(src)
  const imageAspect = image.naturalWidth / image.naturalHeight
  const { zoom, cx, cy } = clampCrop(crop, windowAspect, imageAspect)
  const cover = coverSize(windowAspect, imageAspect)

  const width = outputWidth
  const height = Math.round(outputWidth / windowAspect)
  const drawW = cover.w * zoom * width
  const drawH = cover.h * zoom * height

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, width, height)
  context.drawImage(image, width / 2 + cx * width - drawW / 2, height / 2 + cy * height - drawH / 2, drawW, drawH)
  return canvas.toDataURL('image/jpeg', 0.92)
}
