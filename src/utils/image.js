// Foto verkleinen tot max. `max` px aan de lange kant, zodat IndexedDB en de
// back-up klein blijven. Een PNG blijft PNG: productfoto's van ChatGPT hebben
// een transparante achtergrond, en JPEG zou die zwart of wit maken.
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
  const type = file.type === 'image/png' || file.type === 'image/webp' ? 'image/png' : 'image/jpeg'
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(w * scale)
  canvas.height = Math.round(h * scale)
  canvas.getContext('2d').drawImage(source, 0, 0, canvas.width, canvas.height)
  source.close?.()
  return new Promise((resolve, reject) =>
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Foto verkleinen mislukt.'))), type, quality)
  )
}
