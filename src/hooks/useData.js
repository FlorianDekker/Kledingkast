import { useEffect, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { allItemStats, todayStr } from '../utils/stats'

/** Alle kledingstukken; null zolang IndexedDB nog laadt. */
export const useItems = () => useLiveQuery(() => db.items.toArray(), [], null)

/** Alle outfits; null zolang IndexedDB nog laadt. */
export const useWears = () => useLiveQuery(() => db.wears.toArray(), [], null)

export const useSetting = (key, fallback) =>
  useLiveQuery(async () => (await db.settings.get(key))?.value ?? fallback, [key], fallback)

/** Stukken met hun cijfers (keer gedragen, cpw, laatst gedragen …). */
export function useItemStats() {
  const items = useItems()
  const wears = useWears()
  const rows = useMemo(
    () => (items && wears ? allItemStats(items, wears, todayStr()) : null),
    [items, wears]
  )
  return { items, wears, rows }
}

/** itemId → object-URL van de foto. De URL's worden opgeruimd bij wijzigingen. */
export function usePhotoUrls() {
  const photos = useLiveQuery(() => db.photos.toArray(), [], [])
  const urls = useMemo(() => {
    const m = new Map()
    for (const p of photos) if (p.blob) m.set(p.itemId, URL.createObjectURL(p.blob))
    return m
  }, [photos])
  useEffect(() => () => { for (const u of urls.values()) URL.revokeObjectURL(u) }, [urls])
  return urls
}
