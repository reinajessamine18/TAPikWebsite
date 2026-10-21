// Builds a viewable or downloadable link for a Google Drive file URL; other URLs pass through unchanged.
export function driveImageUrl(image, format = 'preview') {
  const value = String(image || '')
  const fileId = value.match(/\/file\/d\/([^/?]+)/)?.[1] || value.match(/[?&]id=([^&]+)/)?.[1]
  if (!fileId) return value
  const encodedFileId = encodeURIComponent(fileId)
  if (format === 'download') return `https://drive.google.com/uc?export=download&id=${encodedFileId}`
  return `https://drive.google.com/open?id=${encodedFileId}`
}
