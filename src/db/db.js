import Dexie from 'dexie'

// Alles lokaal in IndexedDB. Elk record heeft een eigen id (uuid) en
// `updatedAt`, zodat er later een synchronisatie bovenop kan zonder het model
// om te gooien.
//
// items   kledingstukken: { id, naam, categorie, prijs, aankoopdatum, kleur,
//         uitKast, uitKastDatum, verkoopprijs, notitie, ingestopt, createdAt, updatedAt }
// wears   één gedragen outfit: { id, datum 'YYYY-MM-DD', itemIds[], bron
//         ('app' | 'form'), formKey (tijdstempel uit het Form), createdAt, updatedAt }
// aliases naam uit het Form → kledingstuk: { naam (genormaliseerd), itemId | null (negeren) }
// photos  { itemId, blob } los van items, zodat lijsten licht blijven
// layers  het stuk zoals het op de pop zit: { itemId, blob (bijgesneden PNG), x, y, w, h,
//         width, height } met (x, y, w, h) de plek op het popcanvas (width × height).
//         De basispop zelf staat er onder itemId BASE_ID.
// settings { key, value }
export const db = new Dexie('kledingkast')

db.version(1).stores({
  items: 'id, categorie, naam',
  wears: 'id, datum, formKey, *itemIds',
  aliases: 'naam, itemId',
  photos: 'itemId',
  settings: 'key',
})

// v2: lagen voor de aankleedpop (alleen een tabel erbij; bestaande data blijft staan)
db.version(2).stores({
  layers: 'itemId',
})

export const BASE_ID = '__basispop__'

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
