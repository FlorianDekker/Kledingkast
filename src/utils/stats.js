// Alle rekenwerk dat in de Excel in formules en hulptabbladen zat.
// Puur: krijgt items en wears binnen, geeft getallen terug.

import { CATEGORIES } from '../constants/categories'

export const todayStr = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export function daysBetween(a, b) {
  const [y1, m1, d1] = a.split('-').map(Number)
  const [y2, m2, d2] = b.split('-').map(Number)
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000)
}

export function addDays(datum, n) {
  const [y, m, d] = datum.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + n))
  return dt.toISOString().slice(0, 10)
}

const round2 = n => Math.round(n * 100) / 100

export function median(values) {
  const v = values.filter(x => x != null && Number.isFinite(x)).sort((a, b) => a - b)
  if (v.length === 0) return null
  const m = Math.floor(v.length / 2)
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2
}

/** itemId → gesorteerde lijst datums waarop het gedragen is. */
export function wearIndex(wears) {
  const idx = new Map()
  for (const w of wears) {
    for (const id of w.itemIds ?? []) {
      let list = idx.get(id)
      if (!list) idx.set(id, (list = []))
      list.push(w.datum)
    }
  }
  for (const list of idx.values()) list.sort()
  return idx
}

/** Netto kosten: aankoopprijs min wat het verkopen opbracht. null als de prijs onbekend is. */
export const netCost = item => (item.prijs == null ? null : item.prijs - (item.verkoopprijs ?? 0))

/**
 * Cijfers van één stuk.
 * cpw is null als de prijs onbekend is of het stuk nog nooit gedragen is.
 */
export function itemStats(item, dates = [], today = todayStr()) {
  const count = dates.length
  const cost = netCost(item)
  const lastWorn = count ? dates[count - 1] : null
  const cpw = cost != null && count > 0 ? round2(cost / count) : null
  return {
    count,
    cpw,
    lastWorn,
    firstWorn: count ? dates[0] : null,
    daysSince: lastWorn ? daysBetween(lastWorn, today) : null,
    // Hoe vaak nog dragen tot het onder het doelbedrag per keer zit
    toTarget: target => (cost == null || cost <= 0 ? 0 : Math.max(0, Math.ceil(cost / target) - count)),
  }
}

/** Alle stukken met hun cijfers, in één keer. */
export function allItemStats(items, wears, today = todayStr()) {
  const idx = wearIndex(wears)
  return items.map(item => ({ item, ...itemStats(item, idx.get(item.id), today) }))
}

/** Kerncijfers voor de bovenkant van de statistiekenpagina. */
export function overview(rows, wears) {
  const inKast = rows.filter(r => !r.item.uitKast)
  const priced = rows.filter(r => r.item.prijs != null)
  return {
    inKast: inKast.length,
    total: rows.length,
    spend: round2(priced.reduce((s, r) => s + r.item.prijs, 0)),
    outfits: wears.filter(w => w.itemIds?.length).length,
    medianCpw: median(rows.map(r => r.cpw)),
  }
}

/** Per categorie: aantal, gem. keer gedragen per stuk, gem. prijs, totaal uitgegeven. */
export function byCategory(rows) {
  return CATEGORIES.map(c => {
    const rs = rows.filter(r => r.item.categorie === c.key)
    const priced = rs.filter(r => r.item.prijs != null)
    const spend = priced.reduce((s, r) => s + r.item.prijs, 0)
    return {
      ...c,
      n: rs.length,
      wears: rs.reduce((s, r) => s + r.count, 0),
      avgWears: rs.length ? Math.round(rs.reduce((s, r) => s + r.count, 0) / rs.length) : 0,
      avgPrice: priced.length ? round2(spend / priced.length) : null,
      spend: round2(spend),
      medianCpw: median(rs.map(r => r.cpw)),
    }
  })
}

/** Per aankoopjaar, zoals het tabblad "Jaren". */
export function byPurchaseYear(rows) {
  const years = new Map()
  for (const r of rows) {
    const y = r.item.aankoopdatum?.slice(0, 4)
    if (!y) continue
    if (!years.has(y)) years.set(y, [])
    years.get(y).push(r)
  }
  return [...years.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([year, rs]) => {
    const priced = rs.filter(r => r.item.prijs != null)
    const spend = priced.reduce((s, r) => s + r.item.prijs, 0)
    const wears = rs.reduce((s, r) => s + r.count, 0)
    return {
      year,
      bought: rs.length,
      wears,
      avgWears: Math.round(wears / rs.length),
      spend: round2(spend),
      avgPrice: priced.length ? round2(spend / priced.length) : null,
      medianCpw: median(rs.map(r => r.cpw)),
    }
  })
}

/** Lijst maanden 'YYYY-MM' van `from` t/m `to`. */
export function monthRange(from, to) {
  const out = []
  let [y, m] = from.slice(0, 7).split('-').map(Number)
  const [ty, tm] = to.slice(0, 7).split('-').map(Number)
  while (y < ty || (y === ty && m <= tm)) {
    out.push(`${y}-${String(m).padStart(2, '0')}`)
    if (++m > 12) { m = 1; y++ }
  }
  return out
}

/** Aantal gelogde outfits per maand. */
export function outfitsPerMonth(wears) {
  const logged = wears.filter(w => w.itemIds?.length)
  if (!logged.length) return []
  const counts = new Map()
  for (const w of logged) counts.set(w.datum.slice(0, 7), (counts.get(w.datum.slice(0, 7)) ?? 0) + 1)
  const dates = logged.map(w => w.datum).sort()
  return monthRange(dates[0], dates[dates.length - 1]).map(m => ({ month: m, count: counts.get(m) ?? 0 }))
}

/** Hoe vaak een stuk per maand gedragen is (voor het detailscherm). */
export function itemPerMonth(dates, from, to) {
  if (!dates.length) return []
  const counts = new Map()
  for (const d of dates) counts.set(d.slice(0, 7), (counts.get(d.slice(0, 7)) ?? 0) + 1)
  return monthRange(from ?? dates[0], to ?? dates[dates.length - 1]).map(m => ({ month: m, count: counts.get(m) ?? 0 }))
}

/**
 * Mediane cost per wear aan het eind van elke maand (tabblad "Median cpw").
 * Per maand tellen alle stukken met een bekende prijs die vóór dat moment
 * gekocht én minstens één keer gedragen zijn.
 */
export function medianCpwOverTime(items, wears) {
  const idx = wearIndex(wears)
  const logged = wears.filter(w => w.itemIds?.length).map(w => w.datum).sort()
  if (!logged.length) return []
  const priced = items.filter(i => i.prijs != null)
  return monthRange(logged[0], logged[logged.length - 1]).map(month => {
    const end = `${month}-31`
    const values = []
    for (const it of priced) {
      if (it.aankoopdatum && it.aankoopdatum > end) continue
      const dates = idx.get(it.id) ?? []
      let n = 0
      for (const d of dates) { if (d <= end) n++; else break }
      if (n > 0) values.push(netCost(it) / n)
    }
    const med = median(values)
    return { month, median: med == null ? null : round2(med), n: values.length }
  })
}

/** Keer gedragen per kleur. */
export function wearsByColour(rows) {
  const m = new Map()
  for (const r of rows) {
    const k = r.item.kleur ?? 'onbekend'
    m.set(k, (m.get(k) ?? 0) + r.count)
  }
  return [...m.entries()].map(([kleur, count]) => ({ kleur, count })).sort((a, b) => b.count - a.count)
}

/**
 * Suggesties voor stukken in de kast.
 * - vergeten: langst niet gedragen (of nog nooit), minimaal `minDays` geleden
 * - bijnaDoel: nog maar een paar keer dragen tot onder het doelbedrag per keer
 * - duurst: hoogste cost per wear
 */
export function suggestions(rows, { today = todayStr(), minDays = 60, target = 1, maxToTarget = 10, limit = 5 } = {}) {
  const inKast = rows.filter(r => !r.item.uitKast)
  const age = r => (r.daysSince ?? (r.item.aankoopdatum ? daysBetween(r.item.aankoopdatum, today) : Infinity))
  const vergeten = inKast
    .filter(r => age(r) >= minDays)
    .sort((a, b) => age(b) - age(a))
    .slice(0, limit)
  const bijnaDoel = inKast
    .map(r => ({ ...r, nodig: r.toTarget(target) }))
    .filter(r => r.cpw != null && r.nodig > 0 && r.nodig <= maxToTarget)
    .sort((a, b) => a.nodig - b.nodig)
    .slice(0, limit)
  const duurst = inKast
    .filter(r => r.cpw != null)
    .sort((a, b) => b.cpw - a.cpw)
    .slice(0, limit)
  return { vergeten, bijnaDoel, duurst }
}

/** Populariteit voor de volgorde in de logkiezer: keer gedragen in de laatste `days` dagen. */
export function recentCounts(wears, today = todayStr(), days = 120) {
  const from = addDays(today, -days)
  const m = new Map()
  for (const w of wears) {
    if (w.datum < from) continue
    for (const id of w.itemIds ?? []) m.set(id, (m.get(id) ?? 0) + 1)
  }
  return m
}
