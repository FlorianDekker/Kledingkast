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

// Elk stuk tekent in een eigen groep, en een wismasker wist alleen binnen de
// eigen groep. Een colbert wist zo een overhemdmouw die ernaast uitsteekt, maar
// nooit een stuk broek; een broek wist een grijze kuit van de basispop, maar
// nooit de manchet van een overhemd bij de heup. Bovenstukken wissen de
// basispop niet: ChatGPT zet de armen telkens anders, dan vreet het de arm aan.
// Tekenvolgorde: basispop, schoenen, ingestopte shirts, broek, bovenstukken.
const GROEPEN = ['basis', 'schoenen', 'ingestopt', 'broek', 'boven']
function groepVan(item) {
  if (item.categorie === 'schoenen') return { teken: 'schoenen', wis: ['schoenen'] }
  if (item.categorie === 'broek') return { teken: 'broek', wis: ['broek', 'basis'] }
  if (layerOrder(item) < layerOrder({ categorie: 'broek' })) return { teken: 'ingestopt', wis: ['ingestopt'] }
  return { teken: 'boven', wis: ['ingestopt', 'boven'] }
}

/**
 * De pop met de gekozen stukken aan, van onder naar boven gestapeld op een
 * canvas. Heeft een laag een wismasker, dan wordt eerst gewist wat eronder ligt
 * waar in zijn eigen afbeelding achtergrond was: zo piept een shirt dat op een
 * iets ander lichaam getekend is niet naast het stuk uit. Zie GROEPEN.
 * Stukken zonder laag worden overgeslagen. Rendert niets zonder basispop.
 */
export function OutfitDoll({ items, layers, height = 260, className = '' }) {
  const canvasRef = useRef(null)
  const base = layers?.get(BASE_ID)
  const stack = base
    ? items.filter(it => layers.get(it.id)).sort((a, b) => layerOrder(a) - layerOrder(b))
      .map(it => ({ ...layers.get(it.id), ...groepVan(it) }))
    : []
  const signature = base ? [base.url, ...stack.map(l => `${l.url}|${l.maskUrl ?? ''}|${l.teken}`)].join(',') : ''

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
        const { width, height } = canvas
        const layerCanvas = () => {
          const c = document.createElement('canvas')
          c.width = width
          c.height = height
          return c
        }
        const groep = Object.fromEntries(GROEPEN.map(g => [g, layerCanvas().getContext('2d')]))
        groep.basis.drawImage(baseImg, 0, 0, width, height)
        stack.forEach((l, i) => {
          const sx = width / l.width
          const sy = height / l.height
          const [img, mask] = imgs[i]
          if (mask) {
            for (const g of l.wis) {
              groep[g].globalCompositeOperation = 'destination-out'
              groep[g].drawImage(mask, l.mx * sx, l.my * sy, l.mw * sx, l.mh * sy)
              groep[g].globalCompositeOperation = 'source-over'
            }
          }
          groep[l.teken].drawImage(img, l.x * sx, l.y * sy, l.w * sx, l.h * sy)
        })
        const ctx = canvas.getContext('2d')
        ctx.clearRect(0, 0, width, height)
        for (const g of GROEPEN) ctx.drawImage(groep[g].canvas, 0, 0)
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
