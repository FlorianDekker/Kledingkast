import { useEffect, useRef } from 'react'
import { BASE_ID } from '../../db/db'
import { layerOrder } from '../../hooks/useLayers'

// Geladen afbeeldingen per URL; object-URL's zijn uniek per versie.
const cache = new Map()
function load(url) {
  if (!cache.has(url)) {
    if (cache.size > 300) cache.clear()
    cache.set(url, new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = url
    }))
  }
  return cache.get(url)
}

/**
 * De pop met de gekozen stukken aan, van onder naar boven gestapeld op een
 * canvas. Heeft een laag een wismasker, dan wordt eerst alles eronder gewist
 * waar in zijn eigen afbeelding achtergrond was: zo piept een basispop of shirt
 * dat op een iets ander lichaam getekend is niet naast het stuk uit.
 * Stukken zonder laag worden overgeslagen. Rendert niets zonder basispop.
 */
export function OutfitDoll({ items, layers, height = 260, className = '' }) {
  const canvasRef = useRef(null)
  const base = layers?.get(BASE_ID)
  const stack = base
    ? items.filter(it => layers.get(it.id)).sort((a, b) => layerOrder(a) - layerOrder(b)).map(it => layers.get(it.id))
    : []
  const signature = base ? [base.url, ...stack.map(l => `${l.url}|${l.maskUrl ?? ''}`)].join(',') : ''

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !base) return
    let cancelled = false
    ;(async () => {
      try {
        const [baseImg, ...imgs] = await Promise.all([
          load(base.url),
          ...stack.map(async l => [await load(l.url), l.maskUrl ? await load(l.maskUrl) : null]),
        ])
        if (cancelled) return
        const ctx = canvas.getContext('2d')
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(baseImg, 0, 0, canvas.width, canvas.height)
        stack.forEach((l, i) => {
          const sx = canvas.width / l.width
          const sy = canvas.height / l.height
          const [img, mask] = imgs[i]
          if (mask) {
            ctx.globalCompositeOperation = 'destination-out'
            ctx.drawImage(mask, l.mx * sx, l.my * sy, l.mw * sx, l.mh * sy)
            ctx.globalCompositeOperation = 'source-over'
          }
          ctx.drawImage(img, l.x * sx, l.y * sy, l.w * sx, l.h * sy)
        })
      } catch {
        /* afbeelding niet te laden: laat het canvas zoals het is */
      }
    })()
    return () => { cancelled = true }
    // signature dekt base + stack (URL's en volgorde)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature])

  if (!base) return null
  return (
    <canvas
      ref={canvasRef}
      width={base.width}
      height={base.height}
      className={`shrink-0 ${className}`}
      style={{ height, aspectRatio: `${base.width} / ${base.height}` }}
      aria-label={items.map(it => it.naam).join(', ')}
      role="img"
    />
  )
}
