import { test, assert } from './t.mjs'
import { itemStats, allItemStats, byPurchaseYear, medianCpwOverTime, suggestions, outfitsPerMonth, overview, byCategory, median, daysBetween, addDays } from '../../src/utils/stats.js'
import { guessColour } from '../../src/utils/colors.js'

const items = [
  { id: 'a', naam: 'Dickies zwart', categorie: 'broek', prijs: 60, aankoopdatum: '2024-01-05', uitKast: false, verkoopprijs: null },
  { id: 'b', naam: 'Wit t-shirt', categorie: 'tshirt', prijs: 10, aankoopdatum: '2023-06-01', uitKast: false, verkoopprijs: null },
  { id: 'c', naam: 'Oude jas', categorie: 'jas', prijs: 100, aankoopdatum: '2023-01-01', uitKast: true, verkoopprijs: 40 },
  { id: 'd', naam: 'Cadeau trui', categorie: 'trui', prijs: null, aankoopdatum: null, uitKast: false, verkoopprijs: null },
]
const wears = [
  { id: 'w1', datum: '2024-01-10', itemIds: ['a', 'b'] },
  { id: 'w2', datum: '2024-02-10', itemIds: ['a', 'c'] },
  { id: 'w3', datum: '2024-03-10', itemIds: ['a'] },
  { id: 'w4', datum: '2024-03-11', itemIds: [] },
]
const today = '2024-06-08'

await test('datumhulpjes', () => {
  assert.equal(daysBetween('2024-02-28', '2024-03-01'), 2)
  assert.equal(addDays('2024-12-31', 1), '2025-01-01')
  assert.equal(median([3, 1, 2]), 2)
  assert.equal(median([1, 2, 3, 4]), 2.5)
  assert.equal(median([]), null)
})

await test('itemStats: cpw met verkoopprijs, laatst gedragen, doel', () => {
  const s = itemStats(items[2], ['2024-02-10'], today)
  assert.equal(s.cpw, 60)
  assert.equal(s.daysSince, 119)
  const a = itemStats(items[0], ['2024-01-10', '2024-02-10', '2024-03-10'], today)
  assert.equal(a.cpw, 20)
  assert.equal(a.toTarget(1), 57)
  assert.equal(itemStats(items[3], ['2024-01-01']).cpw, null)
  assert.equal(itemStats(items[0], []).cpw, null)
})

const rows = allItemStats(items, wears, today)
await test('overview en byCategory', () => {
  const o = overview(rows, wears)
  assert.deepEqual(o, { inKast: 3, total: 4, spend: 170, outfits: 3, medianCpw: 20 })
  const bc = byCategory(rows)
  assert.equal(bc.find(c => c.key === 'broek').avgWears, 3)
  assert.equal(bc.find(c => c.key === 'trui').avgPrice, null)
})

await test('byPurchaseYear', () => {
  const y = byPurchaseYear(rows)
  assert.deepEqual(y.map(r => [r.year, r.bought, r.wears, r.spend]), [['2023', 2, 2, 110], ['2024', 1, 3, 60]])
})

await test('outfitsPerMonth vult lege maanden en negeert lege outfits', () => {
  assert.deepEqual(outfitsPerMonth(wears).map(m => m.count), [1, 1, 1])
})

await test('medianCpwOverTime telt alleen gedragen stukken tot die maand', () => {
  const m = medianCpwOverTime(items, wears)
  assert.deepEqual(m.map(x => x.median), [35, 30, 20])
})

await test('suggesties', () => {
  const s = suggestions(rows, { today, minDays: 60 })
  assert.deepEqual(s.vergeten.map(r => r.item.id), ['d', 'b', 'a'])
  assert.deepEqual(s.duurst.map(r => r.item.id), ['a', 'b'])
  assert.equal(s.vergeten.some(r => r.item.uitKast), false)
  const near = suggestions(rows, { today, target: 10, maxToTarget: 5 })
  assert.deepEqual(near.bijnaDoel.map(r => [r.item.id, r.nodig]), [['a', 3]])
})

await test('kleur raden uit de naam', () => {
  assert.equal(guessColour('Dickies 874 zwart'), 'zwart')
  assert.equal(guessColour('Bruine Curduroy broek'), 'bruin')
  assert.equal(guessColour("Spijkerbroek levi's"), 'blauw')
  assert.equal(guessColour('Vans Mte Crosspath Xc'), null)
})
