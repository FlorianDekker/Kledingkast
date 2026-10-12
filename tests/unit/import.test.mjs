import * as XLSX from 'xlsx'
import { test, assert } from './t.mjs'
import { segmentCell, excelMoment, readWorkbook, planImport, compareWithExcel, normName } from '../../src/utils/importForm.js'

const known = new Set(['blauw, witte strepen', 'witte gympen', 'bruine nette', 'spijkerbroek'].map(normName))
const isKnown = n => known.has(n)

await test('cel met één bekende naam', () => assert.deepEqual(segmentCell('Spijkerbroek', isKnown), ['Spijkerbroek']))
await test('Geen en leeg geven niets', () => {
  assert.deepEqual(segmentCell('Geen', isKnown), [])
  assert.deepEqual(segmentCell('', isKnown), [])
})
await test('meerdere keuzes worden gesplitst', () =>
  assert.deepEqual(segmentCell('Bruine nette, Witte gympen', isKnown), ['Bruine nette', 'Witte gympen']))
await test('naam met komma blijft heel', () =>
  assert.deepEqual(segmentCell('Blauw, witte strepen, Witte gympen', isKnown), ['Blauw, witte strepen', 'Witte gympen']))
await test('onbekende komma-naam blijft heel als hij elders als hele cel voorkomt', () => {
  const whole = new Set([normName('Wit, blauwe ronde patronen')])
  assert.deepEqual(segmentCell('Wit, blauwe ronde patronen', isKnown, whole), ['Wit, blauwe ronde patronen'])
  assert.deepEqual(segmentCell('Wit, blauwe ronde patronen', isKnown), ['Wit', 'blauwe ronde patronen'])
})

await test('excelMoment: serienummer en tekst', () => {
  assert.deepEqual(excelMoment(44596.72188), { datum: '2022-02-04', key: '2022-02-04T17:19:30' })
  assert.equal(excelMoment('2026-10-12 12:38:31').key, '2026-10-12T12:38:31')
  assert.equal(excelMoment('4/2/2022 17:19:31').datum, '2022-02-04')
  assert.equal(excelMoment(null), null)
})

function workbook() {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['Naam', 'Prijs', 'Datum', 'Type', 'Aantal keer gedragen', 'Cost/wear', 'Uit kledingkast', 'Prijs voor verkocht'],
    ['Spijkerbroek', 40, 44562, 'Broek', 1, 40, 0, 0],
    ['Blauw, witte strepen', 30, 44600, 'Blousje', 5, 6, 1, 10],
    ['Witte gympen', 80, 44562, 'Schoenen', 2, 40, 0, 0],
  ]), 'Data')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['Timestamp', 'Broek', 'T-shirt', 'Trui/Vest/Jasje', 'Blousje', 'Schoenen', 'Jas'],
    [44596.5, 'Spijkerbroek', 'Geen', null, 'Blauw, witte strepen', 'Witte gympen, Oude laarzen', null],
    [44597.5, 'Spijkerbroek', null, null, null, 'Witte gympen', null],
    [44598.5, 'Geen', null, null, null, null, null],
  ]), 'Form responses 1')
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
}

const parsed = readWorkbook(XLSX, workbook())
await test('readWorkbook leest Data en formulieren', () => {
  assert.equal(parsed.dataRows.length, 3)
  assert.deepEqual(parsed.dataRows[1], {
    naam: 'Blauw, witte strepen', categorie: 'blouse', prijs: 30, aankoopdatum: '2022-02-08',
    uitKast: true, verkoopprijs: 10, excelWears: 5,
  })
  assert.equal(parsed.responses.length, 3)
  assert.deepEqual(parsed.responses[0].cells, { broek: 'Spijkerbroek', tshirt: 'Geen', blouse: 'Blauw, witte strepen', schoenen: 'Witte gympen, Oude laarzen' })
})

await test('planImport: nieuwe stukken, outfits en onbekende namen', () => {
  const plan = planImport(parsed)
  assert.equal(plan.newItems.length, 3)
  assert.equal(plan.wears.length, 2)
  assert.equal(plan.empty, 1)
  assert.deepEqual(plan.unknown, [{ naam: 'Oude laarzen', categorie: 'schoenen', count: 1, lastDatum: '2022-02-04' }])
  assert.deepEqual(plan.wears[0].names.map(n => n.naam), ['Spijkerbroek', 'Blauw, witte strepen', 'Witte gympen', 'Oude laarzen'])
})

await test('planImport: al ingelezen formulieren en bestaande stukken worden overgeslagen', () => {
  const first = planImport(parsed)
  const plan = planImport(parsed, {
    items: [{ id: 'a', naam: 'spijkerbroek ' }],
    aliases: [{ naam: 'oude laarzen', itemId: null }],
    importedKeys: new Set([first.wears[0].key]),
  })
  assert.equal(plan.newItems.length, 2)
  assert.equal(plan.skipped, 1)
  assert.equal(plan.wears.length, 1)
  assert.deepEqual(plan.unknown, [])
})

await test('compareWithExcel toont alleen verschillen', () => {
  const diff = compareWithExcel(parsed, planImport(parsed))
  assert.deepEqual(diff, [{ naam: 'Spijkerbroek', excel: 1, app: 2 }, { naam: 'Blauw, witte strepen', excel: 5, app: 1 }])
})

await test('readWorkbook: verkeerd bestand geeft duidelijke fout', () => {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['x']]), 'Blad1')
  assert.throws(() => readWorkbook(XLSX, XLSX.write(wb, { type: 'array', bookType: 'xlsx' })), /Form responses 1/)
})
