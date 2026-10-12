// Foto verkleinen tot een JPEG van max. `max` px aan de lange kant, zodat
// IndexedDB en de back-up klein blijven.
export async function resizeImage(file, max = 800, quality = 0.82) {
  let source
  try {
    source = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    source = await new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('Deze foto kan niet worden gelezen.'))
      img.src = URL.createObjectURL(file)
    })
  }
  const w = source.width
  const h = source.height
  const scale = Math.min(1, max / Math.max(w, h))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(w * scale)
  canvas.height = Math.round(h * scale)
  canvas.getContext('2d').drawImage(source, 0, 0, canvas.width, canvas.height)
  source.close?.()
  return new Promise((resolve, reject) =>
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Foto verkleinen mislukt.'))), 'image/jpeg', quality)
  )
}
