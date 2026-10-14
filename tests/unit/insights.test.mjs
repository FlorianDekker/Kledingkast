import { test, assert } from './t.mjs'
import { calendarMonth, weekday, streaks, topOutfits, topPairs, coWorn, records, weekdays, dayMap, loggedMonths } from '../../src/utils/insights.js'
import { allItemStats, wearIndex } from '../../src/utils/stats.js'

const items = [
  { id: 'b1', naam: 'Dickies', categorie: 'broek', prijs: 60, aankoopdatum: '2024-01-01' },
  { id: 'b2', naam: 'Levi\'s', categorie: 'broek', prijs: 80, aankoopdatum: '2024-01-01' },
  { id: 's1', naam: 'NB', categorie: 'schoenen', prijs: 150, aankoopdatum: '2024-01-01' },
  { id: 't1', naam: 'Wit shirt', categorie: 'tshirt', prijs: 10, aankoopdatum: '2024-01-01' },
  { id: 'j1', naam: 'Jas', categorie: 'jas', prijs: 100, aankoopdatum: '2024-01-01', uitKast: false },
]
const byId = new Map(items.map(i => [i.id, i]))
const w = (datum, ...itemIds) => ({ id: `${datum}-${itemIds.join('')}`, datum, itemIds, createdAt: `${datum}T08:00` })
// Maandag 1 jan 2024 t/m woensdag 3 jan: Dickies+NB+shirt; vrijdag 5 jan: Levi's+NB
const wears = [
  w('2024-01-01', 'b1', 's1', 't1'), w('2024-01-02', 'b1', 's1', 't1'), w('2024-01-03', 'b1', 's1', 't1'),
  w('2024-01-05', 'b2', 's1'), w('2024-01-08', 'b1', 's1', 't1'), w('2024-01-09', 'b2', 's1'),
  w('2024-01-10'),
]

await test('weekdag en maandrooster beginnen op maandag', () => {
  assert.equal(weekday('2024-01-01'), 0) // maandag
  assert.equal(weekday('2024-01-07'), 6) // zondag
  const weeks = calendarMonth('2024-02')
  assert.equal(weeks[0][0].datum, '2024-01-29')
  assert.equal(weeks[0][3].datum, '2024-02-01')
  assert.ok(weeks.at(-1).some(d => d.datum === '2024-02-29'))
  assert.ok(weeks.every(wk => wk.length === 7))
})

await test('dayMap negeert lege outfits', () => {
  const m = dayMap(wears)
  assert.equal(m.size, 6)
  assert.equal(m.has('2024-01-10'), false)
})

await test('reeksen dagen gelogd', () => {
  const s = streaks(wears, '2024-01-10')
  assert.deepEqual(s.langste, { lengte: 3, van: '2024-01-01', tot: '2024-01-03' })
  assert.equal(s.huidig, 2) // 8 en 9 januari, vandaag (10) nog niets
  assert.equal(streaks(wears, '2024-01-20').huidig, 0)
})

await test('vaste outfits en duo\'s', () => {
  const o = topOutfits(wears)
  assert.deepEqual(o[0].itemIds.sort(), ['b1', 's1', 't1'])
  assert.equal(o[0].count, 4)
  assert.equal(o[0].datums[0], '2024-01-08')
  const p = topPairs(wears, byId)
  assert.deepEqual(p[0].itemIds.sort(), ['b1', 's1'])
  assert.equal(p[0].count, 4)
  const bs = topPairs(wears, byId, { soorten: ['broek', 'schoenen'] })
  assert.ok(bs.every(x => x.itemIds.every(id => ['broek', 'schoenen'].includes(byId.get(id).categorie))))
})

await test('vaak gecombineerd met', () => {
  assert.deepEqual(coWorn('s1', wears), [{ itemId: 'b1', count: 4 }, { itemId: 't1', count: 4 }, { itemId: 'b2', count: 2 }])
})

await test('records', () => {
  const rows = allItemStats(items, wears, '2024-01-10')
  const r = Object.fromEntries(records(rows, wears, wearIndex(wears), '2024-01-10').map(x => [x.key, x]))
  assert.equal(r.meest.itemId, 's1')
  assert.equal(r.reeks.itemId, 'b1')
  assert.equal(r.reeks.waarde, '3 dagen')
  assert.equal(r.maand.sub, 'januari 2024')
  assert.deepEqual(r.ongedragen.lijst, ['j1'])
  assert.equal(r.stukken.waarde, '2,7')
})

await test('weekdagen', () => {
  const d = weekdays(wears, { minCount: 1, minDag: 1 })
  assert.equal(d[0].outfits, 2) // twee maandagen
  assert.equal(d[4].outfits, 1) // vrijdag
  assert.equal(d[4].meest[0].itemId, 'b2') // op vrijdag de Levi's
  assert.ok(d[4].typisch.some(x => x.itemId === 'b2'))
})

await test('gelogde maanden, nieuwste eerst', () => {
  assert.deepEqual(loggedMonths(wears, '2024-03-02'), ['2024-03', '2024-02', '2024-01'])
})

await test('verras me: vaste stukken blijven, soorten volgen de gewoonte', async () => {
  const { dressMe } = await import('../../src/utils/insights.js')
  let seed = 1
  const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  for (let k = 0; k < 20; k++) {
    const ids = dressMe(items, wears, { today: '2024-01-20', random, vast: { broek: 'b2' } })
    const cats = ids.map(id => byId.get(id).categorie)
    assert.ok(ids.includes('b2'), 'vaste broek blijft')
    assert.equal(cats.filter(c => c === 'broek').length, 1)
    assert.ok(cats.includes('schoenen'))
    assert.ok(!cats.includes('jas'), 'in januari nooit een jas gedragen, dus nooit een jas')
  }
})
