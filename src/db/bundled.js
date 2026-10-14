// Meegeleverde basispop en lagen (public/data/) automatisch toepassen.
//
// Elk meegeleverd onderdeel wordt hooguit één keer toegepast: wat is gedaan
// staat in de setting MEEGELEVERD. Haal je een laag of de basispop weg, dan
// komt hij dus niet terug. Een stuk dat al een eigen laag heeft, blijft
// ongemoeid.
import { db, BASE_ID, getSetting, setSetting } from './db'
import { setBase, setLayer } from './actions'
import { normName } from '../utils/importForm'

const DATA = `${import.meta.env.BASE_URL}data/`
const MEEGELEVERD = 'meegeleverd'
const BASE = { key: 'basispop:basispop.png', file: 'basispop.png', width: 1024, height: 1536 }

let running = null

async function blob(file) {
  const res = await fetch(`${DATA}${file}`, { cache: 'no-cache' })
  if (!res.ok) throw new Error(`${file}: ${res.status}`)
  return res.blob()
}

async function run() {
  const done = new Set(await getSetting(MEEGELEVERD, []))
  const before = done.size

  if (!done.has(BASE.key)) {
    if (!(await db.layers.get(BASE_ID))) await setBase({ blob: await blob(BASE.file), width: BASE.width, height: BASE.height })
    done.add(BASE.key)
  }

  const res = await fetch(`${DATA}lagen/lagen.json`, { cache: 'no-cache' })
  const manifest = res.ok ? await res.json() : {}
  const lagen = manifest.lagen ?? []
  const ingetrokken = manifest.ingetrokken ?? []
  const items = lagen.length || ingetrokken.length ? await db.items.toArray() : []
  const byName = new Map(items.map(i => [normName(i.naam), i.id]))

  // Aan het verkeerde stuk meegeleverd? Weghalen, maar alleen als wíj hem daar
  // hebben gezet en hij nog precies zo staat (een eigen upload blijft staan).
  for (const l of ingetrokken) {
    const key = `laag:${normName(l.naam)}:${l.file}`
    if (!done.has(key) || done.has(`weg:${key}`)) continue
    const itemId = byName.get(normName(l.naam))
    const cur = itemId ? await db.layers.get(itemId) : null
    if (cur && cur.x === l.x && cur.y === l.y && cur.w === l.w && cur.h === l.h) await db.layers.delete(itemId)
    done.add(`weg:${key}`)
  }

  if (lagen.length) {
    for (const l of lagen) {
      const key = `laag:${normName(l.naam)}:${l.file}`
      if (done.has(key)) continue
      const itemId = byName.get(normName(l.naam))
      if (!itemId) continue // stuk (nog) niet in de kast; volgende keer opnieuw proberen
      const cur = await db.layers.get(itemId)
      // Had je een eerdere meegeleverde versie zelf weggehaald? Dan blijft hij weg.
      const eerderToegepast = [...done].some(k => k.startsWith(`laag:${normName(l.naam)}:`))
      if (!cur && eerderToegepast) { done.add(key); continue }
      // Een eerdere meegeleverde versie mag vervangen worden; een eigen upload nooit.
      const ouder = cur && (
        cur.bron?.startsWith(`laag:${normName(l.naam)}:`) ||
        (l.vervangt ?? []).some(v => v.x === cur.x && v.y === cur.y && v.w === cur.w && v.h === cur.h)
      )
      if (!cur || ouder) {
        const mask = l.mask ? { maskBlob: await blob(`lagen/${l.mask.file}`), mx: l.mask.x, my: l.mask.y, mw: l.mask.w, mh: l.mask.h } : {}
        await setLayer(itemId, { blob: await blob(`lagen/${l.file}`), x: l.x, y: l.y, w: l.w, h: l.h, width: l.width, height: l.height, ...mask, bron: key })
        // Standaard "ingestopt" (bijv. een pakoverhemd), tenzij je het zelf al instelde
        const item = items.find(i => i.id === itemId)
        if (l.ingestopt != null && item && item.ingestopt == null) await db.items.update(itemId, { ingestopt: l.ingestopt })
      }
      done.add(key)
    }
  }

  if (done.size !== before) await setSetting(MEEGELEVERD, [...done])
}

/** Past toe wat nog niet is toegepast. Veilig om vaak aan te roepen; fouten (offline) worden genegeerd. */
export function applyBundled() {
  if (!running) running = run().catch(() => {}).finally(() => { running = null })
  return running
}
