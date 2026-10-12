import { db, newId, now } from './db'
import { normName } from '../utils/importForm'
import { guessColour } from '../utils/colors'

// ── Kledingstukken ─────────────────────────────────────────────────

export async function saveItem(item) {
  const t = now()
  const row = {
    categorie: 'broek', prijs: null, aankoopdatum: null, kleur: null,
    uitKast: false, uitKastDatum: null, verkoopprijs: null, notitie: '',
    ...item,
    naam: String(item.naam ?? '').trim(),
    id: item.id ?? newId(),
    createdAt: item.createdAt ?? t,
    updatedAt: t,
  }
  if (!row.naam) throw new Error('Geef het kledingstuk een naam.')
  await db.items.put(row)
  return row
}

/** Verwijdert een stuk; het verdwijnt ook uit outfits (een lege outfit gaat weg). */
export async function deleteItem(id) {
  await db.transaction('rw', db.items, db.wears, db.photos, db.aliases, async () => {
    const wears = await db.wears.where('itemIds').equals(id).toArray()
    for (const w of wears) {
      const itemIds = w.itemIds.filter(x => x !== id)
      if (itemIds.length === 0) await db.wears.delete(w.id)
      else await db.wears.put({ ...w, itemIds, updatedAt: now() })
    }
    // Aliassen naar dit stuk worden "negeren", zodat een volgende import het
    // stuk niet stilletjes opnieuw aanmaakt.
    await db.aliases.where('itemId').equals(id).modify({ itemId: null })
    await db.photos.delete(id)
    await db.items.delete(id)
  })
}

/**
 * Voegt `fromId` samen in `intoId`: alle keren gedragen gaan over, de naam van
 * het oude stuk wordt een alias. Handig voor dubbel aangemaakte stukken.
 */
export async function mergeItems(fromId, intoId) {
  if (fromId === intoId) return
  await db.transaction('rw', db.items, db.wears, db.photos, db.aliases, async () => {
    const from = await db.items.get(fromId)
    const wears = await db.wears.where('itemIds').equals(fromId).toArray()
    for (const w of wears) {
      const itemIds = [...new Set(w.itemIds.map(x => (x === fromId ? intoId : x)))]
      await db.wears.put({ ...w, itemIds, updatedAt: now() })
    }
    await db.aliases.where('itemId').equals(fromId).modify({ itemId: intoId })
    if (from) await db.aliases.put({ naam: normName(from.naam), itemId: intoId })
    if (!(await db.photos.get(intoId))) {
      const p = await db.photos.get(fromId)
      if (p) await db.photos.put({ itemId: intoId, blob: p.blob })
    }
    await db.photos.delete(fromId)
    await db.items.delete(fromId)
  })
}

// ── Foto's ─────────────────────────────────────────────────────────

export const setPhoto = (itemId, blob) => db.photos.put({ itemId, blob })
export const removePhoto = itemId => db.photos.delete(itemId)

// ── Outfits ────────────────────────────────────────────────────────

export async function saveWear({ id, datum, itemIds, ...rest }) {
  if (!datum) throw new Error('Datum ontbreekt.')
  const ids = [...new Set(itemIds ?? [])]
  if (ids.length === 0) throw new Error('Kies minstens één kledingstuk.')
  const t = now()
  const prev = id ? await db.wears.get(id) : null
  const row = {
    bron: 'app', formKey: null, createdAt: t,
    ...prev, ...rest,
    id: id ?? newId(), datum, itemIds: ids, updatedAt: t,
  }
  await db.wears.put(row)
  return row
}

export const deleteWear = id => db.wears.delete(id)

// ── Import ─────────────────────────────────────────────────────────

/**
 * Voert een importplan uit (zie planImport).
 * @param decisions Map<genormaliseerde naam, { action: 'new' | 'link' | 'ignore', itemId? }>
 *                  voor de onbekende namen; ontbreekt een naam, dan wordt hij een nieuw stuk.
 * @returns { items, wears } aantallen die zijn toegevoegd
 */
export async function applyImport(plan, decisions = new Map()) {
  return db.transaction('rw', db.items, db.wears, db.aliases, async () => {
    const t = now()
    const byName = new Map()
    for (const it of await db.items.toArray()) byName.set(normName(it.naam), it.id)
    for (const a of await db.aliases.toArray()) byName.set(a.naam, a.itemId)

    let itemCount = 0
    const create = async row => {
      const id = newId()
      await db.items.put({
        id, naam: row.naam, categorie: row.categorie ?? 'broek', prijs: row.prijs ?? null,
        aankoopdatum: row.aankoopdatum ?? null, kleur: row.kleur ?? guessColour(row.naam),
        uitKast: !!row.uitKast, uitKastDatum: null, verkoopprijs: row.verkoopprijs ?? null,
        notitie: '', createdAt: t, updatedAt: t,
      })
      byName.set(normName(row.naam), id)
      itemCount++
      return id
    }

    for (const row of plan.newItems) if (!byName.has(normName(row.naam))) await create(row)

    for (const u of plan.unknown) {
      const n = normName(u.naam)
      if (byName.has(n)) continue
      const d = decisions.get(n) ?? { action: 'new' }
      if (d.action === 'link' && d.itemId) {
        await db.aliases.put({ naam: n, itemId: d.itemId })
        byName.set(n, d.itemId)
      } else if (d.action === 'ignore') {
        await db.aliases.put({ naam: n, itemId: null })
        byName.set(n, null)
      } else {
        await create({ naam: u.naam, categorie: u.categorie, ...(d.fields ?? {}) })
      }
    }

    const existingKeys = new Set(
      (await db.wears.where('formKey').above('').toArray()).map(w => w.formKey)
    )
    const rows = []
    for (const w of plan.wears) {
      if (existingKeys.has(w.key)) continue
      const itemIds = [...new Set(w.names.map(x => byName.get(normName(x.naam))).filter(Boolean))]
      // Ook als alles genegeerd is bewaren we de sleutel, anders komt hij bij
      // een volgende import weer als "nieuw" binnen.
      rows.push({ id: newId(), datum: w.datum, itemIds, bron: 'form', formKey: w.key, createdAt: t, updatedAt: t })
    }
    await db.wears.bulkPut(rows)
    return { items: itemCount, wears: rows.length }
  })
}

/** Formuliersleutels die al binnen zijn, voor planImport. */
export async function importedFormKeys() {
  const rows = await db.wears.where('formKey').above('').toArray()
  return new Set(rows.map(w => w.formKey))
}
