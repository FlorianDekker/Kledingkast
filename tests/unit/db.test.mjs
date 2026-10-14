import 'fake-indexeddb/auto'
import { test, assert } from './t.mjs'
import { db } from '../../src/db/db.js'
import { applyImport, importedFormKeys, saveItem, saveWear, deleteItem, mergeItems, setPhoto, setLayer, setBase } from '../../src/db/actions.js'
import { BASE_ID } from '../../src/db/db.js'
import { planImport } from '../../src/utils/importForm.js'
import { exportBackup, restoreBackup } from '../../src/utils/backup.js'

const parsed = {
  dataRows: [
    { naam: 'Spijkerbroek', categorie: 'broek', prijs: 40, aankoopdatum: '2022-01-01', uitKast: false, verkoopprijs: null },
    { naam: 'Witte gympen', categorie: 'schoenen', prijs: 80, aankoopdatum: '2022-01-01', uitKast: false, verkoopprijs: null },
  ],
  responses: [
    { datum: '2022-02-04', key: '2022-02-04T12:00:00', cells: { broek: 'Spijkerbroek', schoenen: 'Witte gympen, Oude laarzen, Rare sloffen' } },
    { datum: '2022-02-05', key: '2022-02-05T12:00:00', cells: { schoenen: 'Rare sloffen' } },
  ],
}

await test('eerste import met keuzes voor onbekende namen', async () => {
  const plan = planImport(parsed)
  const decisions = new Map([['rare sloffen', { action: 'ignore' }]])
  const r = await applyImport(plan, decisions)
  assert.deepEqual(r, { items: 3, wears: 2 })
  const items = await db.items.toArray()
  assert.deepEqual(items.map(i => i.naam).sort(), ['Oude laarzen', 'Spijkerbroek', 'Witte gympen'])
  assert.equal(items.find(i => i.naam === 'Witte gympen').kleur, 'wit')
  const wears = await db.wears.orderBy('datum').toArray()
  assert.equal(wears[0].itemIds.length, 3)
  assert.deepEqual(wears[1].itemIds, [])
})

await test('tweede import van hetzelfde bestand voegt niets toe', async () => {
  const items = await db.items.toArray()
  const aliases = await db.aliases.toArray()
  const plan = planImport(parsed, { items, aliases, importedKeys: await importedFormKeys() })
  assert.equal(plan.wears.length, 0)
  assert.equal(plan.newItems.length, 0)
  assert.equal(plan.unknown.length, 0)
  assert.deepEqual(await applyImport(plan), { items: 0, wears: 0 })
})

await test('outfit loggen, samenvoegen en verwijderen', async () => {
  const broek = (await db.items.toArray()).find(i => i.naam === 'Spijkerbroek')
  const dubbel = await saveItem({ naam: 'Spijkerbroek blauw', categorie: 'broek', prijs: 0 })
  await saveWear({ datum: '2024-05-01', itemIds: [dubbel.id] })
  await mergeItems(dubbel.id, broek.id)
  assert.equal(await db.items.get(dubbel.id), undefined)
  assert.equal(await db.wears.where('itemIds').equals(broek.id).count(), 2)
  assert.equal((await db.aliases.get('spijkerbroek blauw')).itemId, broek.id)

  const laarzen = (await db.items.toArray()).find(i => i.naam === 'Oude laarzen')
  await deleteItem(laarzen.id)
  assert.equal(await db.wears.where('itemIds').equals(laarzen.id).count(), 0)
  assert.equal((await db.aliases.get('oude laarzen'))?.itemId ?? null, null)
})

await test('saveWear weigert een lege outfit', async () => {
  await assert.rejects(() => saveWear({ datum: '2024-05-02', itemIds: [] }), /minstens/)
})

await test('poplaag gaat mee bij samenvoegen en weg bij verwijderen', async () => {
  const a = await saveItem({ naam: 'Laag A', categorie: 'tshirt' })
  const b = await saveItem({ naam: 'Laag B', categorie: 'tshirt' })
  await setLayer(a.id, { blob: new Blob([new Uint8Array([9])], { type: 'image/png' }), x: 1, y: 2, w: 3, h: 4, width: 10, height: 15 })
  await mergeItems(a.id, b.id)
  assert.equal(await db.layers.get(a.id), undefined)
  assert.equal((await db.layers.get(b.id)).x, 1)
  await deleteItem(b.id)
  assert.equal(await db.layers.get(b.id), undefined)
})

await test('back-up en terugzetten, inclusief foto en poplagen', async () => {
  const it = (await db.items.toArray())[0]
  await setPhoto(it.id, new Blob([new Uint8Array([1, 2, 3, 250])], { type: 'image/jpeg' }))
  await setBase({ blob: new Blob([new Uint8Array([7, 7])], { type: 'image/png' }), width: 10, height: 15 })
  await setLayer(it.id, { blob: new Blob([new Uint8Array([5])], { type: 'image/png' }), x: 1, y: 2, w: 3, h: 4, width: 10, height: 15 })
  const backup = JSON.parse(JSON.stringify(await exportBackup()))
  const before = { items: await db.items.count(), wears: await db.wears.count() }
  await db.items.clear()
  const r = await restoreBackup(backup)
  assert.equal(r.items, before.items)
  assert.equal(await db.wears.count(), before.wears)
  const p = await db.photos.get(it.id)
  assert.deepEqual([...new Uint8Array(await p.blob.arrayBuffer())], [1, 2, 3, 250])
  assert.equal(r.layers, 2)
  assert.deepEqual([...new Uint8Array(await (await db.layers.get(BASE_ID)).blob.arrayBuffer())], [7, 7])
  assert.equal((await db.layers.get(it.id)).h, 4)
  await assert.rejects(() => restoreBackup({ app: 'iets anders' }), /geen back-up/)
})
