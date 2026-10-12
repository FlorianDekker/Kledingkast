import Dexie from 'dexie'

// Alles lokaal in IndexedDB. Elk record heeft een eigen id (uuid) en
// `updatedAt`, zodat er later een synchronisatie bovenop kan zonder het model
// om te gooien.
//
// items   kledingstukken: { id, naam, categorie, prijs, aankoopdatum, kleur,
//         uitKast, uitKastDatum, verkoopprijs, notitie, createdAt, updatedAt }
// wears   één gedragen outfit: { id, datum 'YYYY-MM-DD', itemIds[], bron
//         ('app' | 'form'), formKey (tijdstempel uit het Form), createdAt, updatedAt }
// aliases naam uit het Form → kledingstuk: { naam (genormaliseerd), itemId | null (negeren) }
// photos  { itemId, blob } los van items, zodat lijsten licht blijven
// settings { key, value }
export const db = new Dexie('kledingkast')

db.version(1).stores({
  items: 'id, categorie, naam',
  wears: 'id, datum, formKey, *itemIds',
  aliases: 'naam, itemId',
  photos: 'itemId',
  settings: 'key',
})

export const newId = () =>
  (globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`)

export const now = () => new Date().toISOString()

export async function getSetting(key, fallback = null) {
  const row = await db.settings.get(key)
  return row?.value ?? fallback
}

export function setSetting(key, value) {
  return db.settings.put({ key, value })
}
