import { BASE_ID } from '../../db/db'
import { layerOrder } from '../../hooks/useLayers'

/**
 * De pop met de gekozen stukken aan, in vaste volgorde gestapeld.
 * Stukken zonder laag worden overgeslagen (zie itemsWithoutLayer).
 * Rendert niets zolang er geen basispop is.
 */
export function OutfitDoll({ items, layers, height = 260, className = '' }) {
  const base = layers?.get(BASE_ID)
  if (!base) return null
  const stack = items
    .filter(it => layers.get(it.id))
    .sort((a, b) => layerOrder(a) - layerOrder(b))
  const pct = (v, total) => `${(v / total) * 100}%`
  return (
    <div className={`relative shrink-0 ${className}`} style={{ height, aspectRatio: `${base.width} / ${base.height}` }}>
      <img src={base.url} alt="" className="absolute inset-0 w-full h-full" draggable={false} />
      {stack.map(it => {
        const l = layers.get(it.id)
        return (
          <img
            key={it.id}
            src={l.url}
            alt={it.naam}
            draggable={false}
            className="absolute"
            style={{ left: pct(l.x, l.width), top: pct(l.y, l.height), width: pct(l.w, l.width), height: pct(l.h, l.height) }}
          />
        )
      })}
    </div>
  )
}
