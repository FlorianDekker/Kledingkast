import { useEffect, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'

// Volgorde van onder naar boven. Ingestopte shirts/blouses gaan ónder de broek.
const ORDER = { schoenen: 0, broek: 2, tshirt: 3, blouse: 4, trui: 5, jas: 6 }
const TUCKED = { tshirt: 1, blouse: 1.5 }

export function layerOrder(item) {
  if (item.ingestopt && TUCKED[item.categorie] != null) return TUCKED[item.categorie]
  return ORDER[item.categorie] ?? 3
}

export const canTuck = item => TUCKED[item?.categorie] != null

/** Alle lagen + basispop (itemId → { …meta, url }); null zolang ze laden. */
export function useLayers() {
  const rows = useLiveQuery(() => db.layers.toArray(), [], null)
  const layers = useMemo(() => {
    if (!rows) return null
    const m = new Map()
    for (const r of rows) {
      m.set(r.itemId, { ...r, url: URL.createObjectURL(r.blob), maskUrl: r.maskBlob ? URL.createObjectURL(r.maskBlob) : null })
    }
    return m
  }, [rows])
  useEffect(() => () => {
    if (layers) for (const l of layers.values()) { URL.revokeObjectURL(l.url); if (l.maskUrl) URL.revokeObjectURL(l.maskUrl) }
  }, [layers])
  return layers
}

export const itemsWithoutLayer = (items, layers) => items.filter(it => !layers?.get(it.id))
