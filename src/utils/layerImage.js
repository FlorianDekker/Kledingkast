// Browserkant van de aankleedpop: bestand → pixels → laag (PNG) via layerKey.
import { extractLayer, greyMannequin } from './layerKey'

const MAX_WIDTH = 1024

async function decode(file) {
  try {
    return await createImageBitmap(file)
  } catch {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('Deze afbeelding kan niet worden gelezen.'))
      img.src = URL.createObjectURL(file)
    })
  }
}

/** Pixels van het bestand, verkleind tot max. MAX_WIDTH breed. */
async function readPixels(file) {
  const src = await decode(file)
  const scale = Math.min(1, MAX_WIDTH / src.width)
  const width = Math.round(src.width * scale)
  const height = Math.round(src.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(src, 0, 0, width, height)
  src.close?.()
  return { pixels: ctx.getImageData(0, 0, width, height).data, width, height }
}

function toPng(data, width, height) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  canvas.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(data), width, height), 0, 0)
  return new Promise((resolve, reject) =>
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Opslaan van de laag mislukt.'))), 'image/png')
  )
}

/**
 * Magenta-pop-afbeelding → laag om op te slaan.
 * @returns { blob, x, y, w, h, width, height, coverage, background }
 */
export async function makeLayer(file) {
  const { pixels, width, height } = await readPixels(file)
  const L = extractLayer(pixels, width, height)
  if (!L.w) throw new Error('Er bleef niets over na het wegknippen van de pop. Staat er wel een kledingstuk op een magenta pop?')
  if (L.coverage > 0.5) throw new Error('Er bleef te veel over: is de pop wel fel magenta (#FF00FF)?')
  const blob = await toPng(L.data, L.w, L.h)
  return { blob, x: L.x, y: L.y, w: L.w, h: L.h, width, height, coverage: L.coverage, background: L.background }
}

/** Basispop (grijs, of magenta die we grijs maken) → { blob, width, height }. */
export async function makeBase(file) {
  const { pixels, width, height } = await readPixels(file)
  return { blob: await toPng(greyMannequin(pixels), width, height), width, height }
}
