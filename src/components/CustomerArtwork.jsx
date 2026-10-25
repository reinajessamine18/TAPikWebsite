import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { driveImageUrl } from '../lib/drive'

// Shows a customer's uploaded artwork, loading Drive images through the Apps Script thumbnail endpoint.
export default function CustomerArtwork({ image, className = 'h-28 w-28' }) {
  const [loadedImage, setLoadedImage] = useState(null)
  const [failedImage, setFailedImage] = useState(null)
  const value = String(image || '')
  const fileId = value.match(/\/file\/d\/([^/?]+)/)?.[1] || value.match(/[?&]id=([^&]+)/)?.[1]

  useEffect(() => {
    let active = true
    if (!fileId) return () => { active = false }

    api.getDesignImage({ fileId })
      .then((result) => {
        if (!result.ok || !result.data) {
          throw new Error(result.error || 'Image preview is unavailable')
        }
        if (active) setLoadedImage({
          image,
          source: `data:${result.mimeType || 'image/jpeg'};base64,${result.data}`,
        })
      })
      .catch((loadError) => {
        if (active) setFailedImage({ image, message: loadError.message })
      })

    return () => { active = false }
  }, [fileId, image])

  const source = fileId
    ? loadedImage?.image === image ? loadedImage.source : ''
    : value
  const error = failedImage?.image === image ? failedImage.message : ''
  if (error) {
    return <div className={`flex ${className} shrink-0 items-center justify-center rounded bg-white/10 p-2 text-center text-xs text-blue-200`}>Preview unavailable</div>
  }
  if (!source) {
    return <div className={`flex ${className} shrink-0 items-center justify-center rounded bg-white/10 text-xs text-blue-200`}>Loading photo…</div>
  }

  const picture = <img src={source} alt="Customer-uploaded artwork" className={`${className} rounded bg-white object-contain`} />
  // A design still stored in this browser is a data: URL, which browsers refuse to open in a new tab.
  if (!fileId) return <span className="shrink-0">{picture}</span>

  return (
    <a href={driveImageUrl(image, 'original')} target="_blank" rel="noreferrer" aria-label="View original customer artwork" className="shrink-0">
      {picture}
    </a>
  )
}
