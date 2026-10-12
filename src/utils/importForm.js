// Import van de Google Sheet achter het kledingformulier (als .xlsx gedownload).
//
// Twee tabbladen tellen: "Data" (de kledingstukken) en "Form responses 1" (één
// rij per ingevuld formulier). De rest van het bestand zijn formules en grafieken
// die de app zelf uitrekent.
//
// Herhaalbaar: een formulier herkennen we aan zijn tijdstempel (`formKey`), dus
// dezelfde export twee keer inlezen geeft geen dubbele outfits. Zo kan het Form
// een tijdje naast de app blijven bestaan.

import { CATEGORIES, categoryFromLabel } from '../constants/categories'

export const DATA_SHEET = 'Data'
export const FORM_SHEET = 'Form responses 1'
const NONE = 'geen'

export const normName = s => String(s ?? '').trim().replace(/\s+/g, ' ').toLowerCase()

const pad = n => String(n).padStart(2, '0')

/**
 * Excel-serienummer of tekst naar wandkloktijd, zonder tijdzone-gedoe:
 * { datum: 'YYYY-MM-DD', key: 'YYYY-MM-DDTHH:MM:SS' } of null.
 */
export function excelMoment(v) {
  if (v == null || v === '') return null
  let y, mo, d, h, mi, s
  if (typeof v === 'number') {
    // Serienummer 25569 = 1-1-1970; de UTC-velden zijn hier gewoon de wandklok.
    const dt = new Date(Math.round((v - 25569) * 86400) * 1000)
    ;[y, mo, d, h, mi, s] = [dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate(), dt.getUTCHours(), dt.getUTCMinutes(), dt.getUTCSeconds()]
  } else if (v instanceof Date) {
    ;[y, mo, d, h, mi, s] = [v.getFullYear(), v.getMonth() + 1, v.getDate(), v.getHours(), v.getMinutes(), v.getSeconds()]
  } else {
    const t = String(v).trim()
    // 2022-02-04 17:19:31 of 4/2/2022 17:19:31 (Google Sheets, dag-maand-jaar)
    let m = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/.exec(t)
    if (m) [y, mo, d, h, mi, s] = [m[1], m[2], m[3], m[4] ?? 0, m[5] ?? 0, m[6] ?? 0].map(Number)
    else {
      m = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/.exec(t)
      if (!m) return null
      ;[d, mo, y, h, mi, s] = [m[1], m[2], m[3], m[4] ?? 0, m[5] ?? 0, m[6] ?? 0].map(Number)
    }
  }
  if (!y || !mo || !d) return null
  const datum = `${y}-${pad(mo)}-${pad(d)}`
  return { datum, key: `${datum}T${pad(h)}:${pad(mi)}:${pad(s)}` }
}

const num = v => {
  if (v == null || v === '') return null
  const n = typeof v === 'number' ? v : Number(String(v).replace(/[€\s]/g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

/** Kolomindex per kopnaam (hoofdletterongevoelig). */
function headerIndex(header) {
  const idx = {}
  header.forEach((h, i) => { if (h != null && String(h).trim() !== '') idx[normName(h)] = i })
  return idx
}

/**
 * Leest het werkboek. `XLSX` is de SheetJS-module (meegegeven zodat tests en
 * app dezelfde code gebruiken). Gooit een begrijpelijke fout als het niet het
 * kledingbestand is.
 */
export function readWorkbook(XLSX, buffer) {
  const wb = XLSX.read(buffer, { type: 'array', cellDates: false })
  const formWs = wb.Sheets[FORM_SHEET]
  if (!formWs) throw new Error(`Tabblad "${FORM_SHEET}" niet gevonden. Is dit de export van je kledingformulier?`)
  const rows = ws => XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null, blankrows: false })

  const dataRows = []
  const dataWs = wb.Sheets[DATA_SHEET]
  if (dataWs) {
    const [header = [], ...body] = rows(dataWs)
    const ix = headerIndex(header)
    const col = (r, name) => (ix[name] != null ? r[ix[name]] : null)
    for (const r of body) {
      const naam = String(col(r, 'naam') ?? '').trim()
      if (!naam) continue
      dataRows.push({
        naam,
        categorie: categoryFromLabel(col(r, 'type')),
        prijs: num(col(r, 'prijs')),
        aankoopdatum: excelMoment(col(r, 'datum'))?.datum ?? null,
        uitKast: num(col(r, 'uit kledingkast')) === 1,
        verkoopprijs: num(col(r, 'prijs voor verkocht')) || null,
        excelWears: num(col(r, 'aantal keer gedragen')),
      })
    }
  }

  const [fHeader = [], ...fBody] = rows(formWs)
  const fix = headerIndex(fHeader)
  if (fix.timestamp == null) throw new Error(`Kolom "Timestamp" ontbreekt in "${FORM_SHEET}".`)
  const catCols = CATEGORIES.map(c => ({ key: c.key, i: fix[normName(c.form)] })).filter(c => c.i != null)
  const responses = []
  for (const r of fBody) {
    const m = excelMoment(r[fix.timestamp])
    if (!m) continue
    const cells = {}
    for (const c of catCols) {
      const v = r[c.i]
      if (v != null && String(v).trim() !== '') cells[c.key] = String(v).trim()
    }
    responses.push({ ...m, cells })
  }
  return { dataRows, responses }
}

/**
 * Splitst een formuliercel in kledingnamen.
 *
 * Google Forms plakt meerdere aangevinkte opties aan elkaar met ", ". Namen die
 * zelf een komma bevatten vallen daardoor uiteen. We zoeken de opdeling met de
 * meeste bekende namen; onbekende stukken plakken we alleen aan elkaar als die
 * combinatie ergens anders als hele cel voorkomt (dan was het één optie).
 *
 * @param cell     celtekst
 * @param isKnown  (genormaliseerde naam) => boolean
 * @param wholeCells Set met genormaliseerde hele celwaarden uit het hele bestand
 * @returns string[] namen zoals ze in de cel stonden ("Geen" eruit)
 */
export function segmentCell(cell, isKnown, wholeCells = new Set()) {
  const raw = String(cell ?? '').trim()
  if (!raw || normName(raw) === NONE) return []
  if (isKnown(normName(raw))) return [raw]
  const parts = raw.split(', ')
  const n = parts.length
  // best[i]: { known, groups, cuts } voor de eerste i delen
  const best = Array(n + 1).fill(null)
  best[0] = { known: 0, groups: 0, cuts: [] }
  for (let i = 1; i <= n; i++) {
    for (let j = 0; j < i; j++) {
      if (!best[j]) continue
      const name = parts.slice(j, i).join(', ')
      const nn = normName(name)
      const known = isKnown(nn)
      if (!known && i - j > 1 && !wholeCells.has(nn)) continue
      const cand = { known: best[j].known + (known ? 1 : 0), groups: best[j].groups + 1, cuts: [...best[j].cuts, name] }
      const b = best[i]
      if (!b || cand.known > b.known || (cand.known === b.known && cand.groups < b.groups)) best[i] = cand
    }
  }
  return best[n].cuts.map(s => s.trim()).filter(s => s && normName(s) !== NONE)
}

/**
 * Maakt een importplan, zonder iets op te slaan.
 *
 * @param parsed    uitkomst van readWorkbook
 * @param existing  { items: [{id, naam}], aliases: [{naam (genormaliseerd), itemId|null}], importedKeys: Set<string> }
 * @returns {
 *   newItems:   dataRows die nog niet als kledingstuk (of alias) bestaan
 *   wears:      [{ key, datum, names: [{naam, categorie}] }] nog niet geïmporteerd
 *   unknown:    [{ naam, categorie, count, lastDatum }] namen in formulieren die nergens bij horen
 *   skipped:    aantal formulieren dat al eerder is ingelezen
 *   empty:      aantal formulieren zonder één kledingstuk
 * }
 */
export function planImport(parsed, existing = {}) {
  const { dataRows, responses } = parsed
  const items = existing.items ?? []
  const aliases = existing.aliases ?? []
  const importedKeys = existing.importedKeys ?? new Set()

  const known = new Set([
    ...items.map(i => normName(i.naam)),
    ...aliases.map(a => normName(a.naam)),
  ])
  const newItems = []
  const seenNew = new Set()
  for (const row of dataRows) {
    const n = normName(row.naam)
    if (known.has(n) || seenNew.has(n)) continue
    seenNew.add(n)
    newItems.push(row)
  }
  const isKnown = n => known.has(n) || seenNew.has(n)

  const wholeCells = new Set()
  for (const r of responses) for (const v of Object.values(r.cells)) wholeCells.add(normName(v))

  const wears = []
  const unknown = new Map()
  let skipped = 0
  let empty = 0
  const keysInFile = new Set()
  for (const r of responses) {
    // Twee formulieren in dezelfde seconde komen in de praktijk niet voor; zou
    // het toch gebeuren, dan krijgt de tweede een volgnummer.
    let key = r.key
    for (let k = 2; keysInFile.has(key); k++) key = `${r.key}#${k}`
    keysInFile.add(key)
    if (importedKeys.has(key)) { skipped++; continue }
    const names = []
    for (const [categorie, cell] of Object.entries(r.cells)) {
      for (const naam of segmentCell(cell, isKnown, wholeCells)) {
        names.push({ naam, categorie })
        const n = normName(naam)
        if (!isKnown(n)) {
          const u = unknown.get(n) ?? { naam, categorie, count: 0, lastDatum: null }
          u.count++
          if (!u.lastDatum || r.datum > u.lastDatum) u.lastDatum = r.datum
          unknown.set(n, u)
        }
      }
    }
    if (names.length === 0) { empty++; continue }
    wears.push({ key, datum: r.datum, names })
  }
  return {
    newItems,
    wears,
    unknown: [...unknown.values()].sort((a, b) => b.count - a.count),
    skipped,
    empty,
  }
}

/**
 * Hoe vaak telt de Excel elk stuk, en hoe vaak de app? Alleen ter informatie
 * bij de eerste import: de Excel telt een beperkt bereik en geen meerkeuzecellen.
 */
export function compareWithExcel(parsed, plan) {
  const counts = new Map()
  for (const w of plan.wears) for (const { naam } of w.names) {
    const n = normName(naam)
    counts.set(n, (counts.get(n) ?? 0) + 1)
  }
  return parsed.dataRows
    .filter(r => r.excelWears != null)
    .map(r => ({ naam: r.naam, excel: r.excelWears, app: counts.get(normName(r.naam)) ?? 0 }))
    .filter(r => r.excel !== r.app)
    .sort((a, b) => (b.app - b.excel) - (a.app - a.excel))
}
