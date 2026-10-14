// Rekenwerk voor de tabbladen van Inzicht: kalender, reeksen, combinaties,
// records en weekdagen. Puur: krijgt items/wears/rows binnen.

import { addDays, daysBetween, monthRange } from './stats'
import { dateLabel, longMonthLabel } from './format'

const logged = wears => wears.filter(w => w.itemIds?.length)

/** datum → outfits van die dag (oudste eerst). */
export function dayMap(wears) {
  const m = new Map()
  for (const w of logged(wears)) {
    if (!m.has(w.datum)) m.set(w.datum, [])
    m.get(w.datum).push(w)
  }
  for (const list of m.values()) list.sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? ''))
  return m
}

/** Weekdag 0 = maandag … 6 = zondag. */
export function weekday(datum) {
  const [y, m, d] = datum.split('-').map(Number)
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7
}

/** Maandrooster (maandag eerst): weken met 7 dagen { datum, inMonth }. */
export function calendarMonth(month) {
  const first = `${month}-01`
  const start = addDays(first, -weekday(first))
  const weeks = []
  let d = start
  while (true) {
    const week = []
    for (let i = 0; i < 7; i++) {
      week.push({ datum: d, inMonth: d.slice(0, 7) === month })
      d = addDays(d, 1)
    }
    weeks.push(week)
    if (d.slice(0, 7) !== month) break
  }
  return weeks
}

/**
 * Reeksen dagen met minstens één gelogde outfit.
 * huidig: reeks die vandaag of gisteren eindigt; langste: { lengte, van, tot }.
 */
export function streaks(wears, today) {
  const days = [...new Set(logged(wears).map(w => w.datum))].sort()
  let langste = { lengte: 0, van: null, tot: null }
  let run = 0
  let van = null
  for (let i = 0; i < days.length; i++) {
    if (i > 0 && daysBetween(days[i - 1], days[i]) === 1) run++
    else { run = 1; van = days[i] }
    if (run > langste.lengte) langste = { lengte: run, van, tot: days[i] }
  }
  let huidig = 0
  const set = new Set(days)
  let d = set.has(today) ? today : addDays(today, -1)
  while (set.has(d)) { huidig++; d = addDays(d, -1) }
  return { huidig, langste, dagen: days.length }
}

const setKey = ids => [...ids].sort().join('|')

/**
 * Vaste outfits: precies dezelfde set stukken, minstens `min` keer.
 * @returns [{ itemIds, count, datums (nieuwste eerst) }]
 */
export function topOutfits(wears, { min = 2, limit = 12 } = {}) {
  const m = new Map()
  for (const w of logged(wears)) {
    const k = setKey(w.itemIds)
    if (!m.has(k)) m.set(k, { itemIds: [...new Set(w.itemIds)], count: 0, datums: [] })
    const e = m.get(k)
    e.count++
    e.datums.push(w.datum)
  }
  return [...m.values()]
    .filter(e => e.count >= min && e.itemIds.length > 1)
    .map(e => ({ ...e, datums: e.datums.sort().reverse() }))
    .sort((a, b) => b.count - a.count || b.itemIds.length - a.itemIds.length)
    .slice(0, limit)
}

/**
 * Vaste duo's: twee stukken van verschillende soort die samen gedragen worden.
 * @param byId Map id → item (voor de soort)
 */
export function topPairs(wears, byId, { limit = 15, soorten = null } = {}) {
  const m = new Map()
  for (const w of logged(wears)) {
    const ids = [...new Set(w.itemIds)].filter(id => byId.has(id))
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = byId.get(ids[i]), b = byId.get(ids[j])
        if (a.categorie === b.categorie) continue
        if (soorten && !(soorten.includes(a.categorie) && soorten.includes(b.categorie))) continue
        const k = setKey([a.id, b.id])
        if (!m.has(k)) m.set(k, { itemIds: [a.id, b.id], count: 0, laatst: null })
        const e = m.get(k)
        e.count++
        if (!e.laatst || w.datum > e.laatst) e.laatst = w.datum
      }
    }
  }
  return [...m.values()].sort((a, b) => b.count - a.count).slice(0, limit)
}

/** Waar wordt dit stuk het vaakst mee gecombineerd? [{ itemId, count }] */
export function coWorn(itemId, wears, { limit = 6 } = {}) {
  const m = new Map()
  for (const w of logged(wears)) {
    if (!w.itemIds.includes(itemId)) continue
    for (const id of new Set(w.itemIds)) if (id !== itemId) m.set(id, (m.get(id) ?? 0) + 1)
  }
  return [...m.entries()].map(([id, count]) => ({ itemId: id, count })).sort((a, b) => b.count - a.count).slice(0, limit)
}

/** Langste reeks opeenvolgende dagen dat één stuk gedragen is. */
function longestItemRun(dates) {
  const days = [...new Set(dates)].sort()
  let best = { lengte: 0, van: null, tot: null }
  let run = 0, van = null
  for (let i = 0; i < days.length; i++) {
    if (i > 0 && daysBetween(days[i - 1], days[i]) === 1) run++
    else { run = 1; van = days[i] }
    if (run > best.lengte) best = { lengte: run, van, tot: days[i] }
  }
  return best
}

/**
 * Records. Elk record heeft een `itemId` (of null) zodat het aantikbaar is.
 * @param rows uit allItemStats; @param idx wearIndex (itemId → datums)
 */
export function records(rows, wears, idx) {
  const out = []
  const inKast = rows.filter(r => !r.item.uitKast)
  const by = (list, f) => list.reduce((best, r) => (best == null || f(r) > f(best) ? r : best), null)

  const top = by(rows, r => r.count)
  if (top?.count) out.push({ key: 'meest', titel: 'Meest gedragen', waarde: `${top.count}×`, sub: top.item.naam, itemId: top.item.id })

  const zuinig = by(rows.filter(r => r.cpw != null && r.count >= 10 && r.item.prijs > 0), r => -r.cpw)
  if (zuinig) out.push({ key: 'zuinig', titel: 'Goedkoopst per keer', waarde: `€ ${zuinig.cpw.toFixed(2).replace('.', ',')}`, sub: `${zuinig.item.naam} · ${zuinig.count}×`, itemId: zuinig.item.id })

  let run = null
  for (const r of rows) {
    const b = longestItemRun(idx.get(r.item.id) ?? [])
    if (b.lengte > (run?.lengte ?? 1)) run = { ...b, item: r.item }
  }
  if (run) out.push({ key: 'reeks', titel: 'Langst achter elkaar', waarde: `${run.lengte} dagen`, sub: `${run.item.naam} · ${dateLabel(run.van, { weekday: false })} t/m ${dateLabel(run.tot, { weekday: false })}`, itemId: run.item.id })

  let snel = null
  for (const r of rows) {
    const dates = idx.get(r.item.id) ?? []
    if (!r.item.aankoopdatum || dates.length < 10) continue
    const tiende = dates[9]
    if (tiende < r.item.aankoopdatum) continue
    const dagen = daysBetween(r.item.aankoopdatum, tiende)
    if (!snel || dagen < snel.dagen) snel = { dagen, item: r.item }
  }
  if (snel) out.push({ key: 'snel', titel: 'Snelst 10× gedragen', waarde: `${snel.dagen} dagen`, sub: `${snel.item.naam}, na aankoop`, itemId: snel.item.id })

  const outfits = logged(wears)
  const perMaand = new Map()
  for (const w of outfits) perMaand.set(w.datum.slice(0, 7), (perMaand.get(w.datum.slice(0, 7)) ?? 0) + 1)
  const drukst = [...perMaand.entries()].sort((a, b) => b[1] - a[1])[0]
  if (drukst) out.push({ key: 'maand', titel: 'Drukste maand', waarde: `${drukst[1]} outfits`, sub: longMonthLabel(drukst[0]), itemId: null, maand: drukst[0] })

  if (outfits.length) {
    const gem = outfits.reduce((s, w) => s + new Set(w.itemIds).size, 0) / outfits.length
    out.push({ key: 'stukken', titel: 'Stukken per outfit', waarde: gem.toFixed(1).replace('.', ','), sub: 'gemiddeld', itemId: null })
  }

  const ongedragen = inKast.filter(r => r.count === 0)
  out.push({ key: 'ongedragen', titel: 'Nooit gedragen', waarde: `${ongedragen.length}`, sub: ongedragen.length ? 'stukken in je kast' : 'alles wordt gedragen', itemId: null, lijst: ongedragen.map(r => r.item.id) })

  const trouw = by(rows.filter(r => r.firstWorn && r.lastWorn), r => daysBetween(r.firstWorn, r.lastWorn))
  if (trouw) out.push({ key: 'trouw', titel: 'Al het langst mee', waarde: `${Math.floor(daysBetween(trouw.firstWorn, trouw.lastWorn) / 365 * 10) / 10} jaar`.replace('.', ','), sub: trouw.item.naam, itemId: trouw.item.id })

  return out
}

/**
 * Per weekdag: aantal outfits en de stukken die je dan relatief het vaakst
 * draagt (vergeleken met hoe vaak je ze gemiddeld draagt).
 */
export function weekdays(wears, { minCount = 8, minDag = 3, limit = 3 } = {}) {
  const outfits = logged(wears)
  const perDag = Array.from({ length: 7 }, () => ({ outfits: 0, items: new Map() }))
  const totaal = new Map()
  for (const w of outfits) {
    const d = perDag[weekday(w.datum)]
    d.outfits++
    for (const id of new Set(w.itemIds)) {
      d.items.set(id, (d.items.get(id) ?? 0) + 1)
      totaal.set(id, (totaal.get(id) ?? 0) + 1)
    }
  }
  const n = outfits.length || 1
  return perDag.map((d, i) => {
    const typisch = [...d.items.entries()]
      .filter(([id]) => (totaal.get(id) ?? 0) >= minCount)
      .map(([id, c]) => ({ itemId: id, count: c, lift: (c / (d.outfits || 1)) / ((totaal.get(id) ?? 0) / n) }))
      .filter(x => x.lift > 1.2 && x.count >= minDag)
      .sort((a, b) => b.lift - a.lift)
      .slice(0, limit)
    const meest = [...d.items.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([itemId, count]) => ({ itemId, count }))
    return { dag: i, outfits: d.outfits, typisch, meest }
  })
}

/** Maanden met minstens één outfit, nieuwste eerst (voor de kalender). */
export function loggedMonths(wears, today) {
  const ds = logged(wears).map(w => w.datum).sort()
  if (!ds.length) return [today.slice(0, 7)]
  return monthRange(ds[0], today).reverse()
}

/**
 * "Verras me" (à la Whering's Dress Me): een outfit uit je kast.
 * - Welke soorten erin zitten volgt je eigen gewoonte in deze maand van het jaar
 *   (draag je in oktober vaak een trui, dan vaak een trui).
 * - Lang niet gedragen stukken krijgen voorrang (herontdekken, à la Acloset);
 *   stukken die al op de pop staan (`opPop`) ook, zodat je iets ziet.
 * - `vast` (categorie → itemId) blijft staan; de rest wordt gekozen.
 * @returns itemIds
 */
export function dressMe(items, wears, { today, vast = {}, random = Math.random, opPop = null } = {}) {
  const byId = new Map(items.map(i => [i.id, i]))
  const inKast = items.filter(i => !i.uitKast)
  const lastWorn = new Map()
  for (const w of logged(wears)) for (const id of w.itemIds) if (!lastWorn.has(id) || w.datum > lastWorn.get(id)) lastWorn.set(id, w.datum)

  // Kans per soort in deze maand van het jaar (anders over alles)
  const maand = today.slice(5, 7)
  let hist = logged(wears).filter(w => w.datum.slice(5, 7) === maand)
  if (hist.length < 10) hist = logged(wears)
  const share = cat => (hist.length
    ? hist.filter(w => w.itemIds.some(id => byId.get(id)?.categorie === cat)).length / hist.length
    : 0.5)

  const pick = cat => {
    const pool = inKast.filter(i => i.categorie === cat)
    if (!pool.length) return null
    const weights = pool.map(i => {
      const dagen = lastWorn.has(i.id) ? Math.min(365, daysBetween(lastWorn.get(i.id), today)) : 365
      return (1 + dagen / 30) * (opPop?.has(i.id) ? 8 : 1)
    })
    let r = random() * weights.reduce((s, w) => s + w, 0)
    for (let k = 0; k < pool.length; k++) { r -= weights[k]; if (r <= 0) return pool[k].id }
    return pool[pool.length - 1].id
  }

  const gekozen = { ...vast }
  for (const cat of ['broek', 'schoenen']) if (!gekozen[cat]) gekozen[cat] = pick(cat)
  if (!gekozen.tshirt && !gekozen.blouse) {
    const t = share('tshirt'), b = share('blouse')
    const cat = random() * (t + b || 1) < t ? 'tshirt' : 'blouse'
    gekozen[cat] = pick(cat) ?? pick(cat === 'tshirt' ? 'blouse' : 'tshirt')
  }
  for (const cat of ['trui', 'jas']) if (!gekozen[cat] && random() < share(cat)) gekozen[cat] = pick(cat)
  return Object.values(gekozen).filter(Boolean)
}
