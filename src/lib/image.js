// Reads an image file and returns it as a JPEG data URL no larger than maxSize on its longest side.
export function resizeImageToDataUrl(file, maxSize = 1280) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('The image could not be opened.'))
    reader.onload = () => {
      const image = new Image()
      image.onerror = () => reject(new Error('The image could not be opened.'))
      image.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(image.width * scale)
        canvas.height = Math.round(image.height * scale)
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.85))
      }
      image.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}
