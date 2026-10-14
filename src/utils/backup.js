// Back-up als één JSON-bestand, inclusief foto's (als base64).
import { db } from '../db/db'

export const BACKUP_APP = 'kledingkast'
export const BACKUP_VERSION = 1

async function blobToBase64(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(bin)
}

function base64ToBlob(b64, type) {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type })
}

export async function exportBackup() {
  const [items, wears, aliases, settings, photos, layers] = await Promise.all([
    db.items.toArray(), db.wears.toArray(), db.aliases.toArray(), db.settings.toArray(), db.photos.toArray(), db.layers.toArray(),
  ])
  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    items, wears, aliases, settings,
    photos: await Promise.all(photos.map(async p => ({
      itemId: p.itemId, type: p.blob.type || 'image/jpeg', data: await blobToBase64(p.blob),
    }))),
    layers: await Promise.all(layers.map(async ({ blob, maskBlob, ...meta }) => ({
      ...meta, type: blob.type || 'image/png', data: await blobToBase64(blob),
      ...(maskBlob ? { maskData: await blobToBase64(maskBlob) } : {}),
    }))),
  }
}

export async function exportBackupBlob() {
  return new Blob([JSON.stringify(await exportBackup())], { type: 'application/json' })
}

/** Vervangt álle data door de back-up. Gooit bij een bestand dat geen back-up is. */
export async function restoreBackup(json) {
  const b = typeof json === 'string' ? JSON.parse(json) : json
  if (b?.app !== BACKUP_APP || !Array.isArray(b.items) || !Array.isArray(b.wears)) {
    throw new Error('Dit is geen back-up van Kledingkast.')
  }
  if (b.version > BACKUP_VERSION) throw new Error('Deze back-up komt uit een nieuwere versie van de app. Werk de app eerst bij.')
  await db.transaction('rw', db.items, db.wears, db.aliases, db.settings, db.photos, db.layers, async () => {
    await Promise.all([db.items.clear(), db.wears.clear(), db.aliases.clear(), db.settings.clear(), db.photos.clear(), db.layers.clear()])
    await db.items.bulkPut(b.items)
    await db.wears.bulkPut(b.wears)
    await db.aliases.bulkPut(b.aliases ?? [])
    await db.settings.bulkPut(b.settings ?? [])
    await db.photos.bulkPut((b.photos ?? []).map(p => ({ itemId: p.itemId, blob: base64ToBlob(p.data, p.type) })))
    await db.layers.bulkPut((b.layers ?? []).map(({ data, type, maskData, ...meta }) => ({
      ...meta, blob: base64ToBlob(data, type), ...(maskData ? { maskBlob: base64ToBlob(maskData, 'image/png') } : {}),
    })))
  })
  return { items: b.items.length, wears: b.wears.length, photos: (b.photos ?? []).length, layers: (b.layers ?? []).length }
}
