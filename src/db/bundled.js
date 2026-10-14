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
  const lagen = res.ok ? (await res.json()).lagen ?? [] : []
  if (lagen.length) {
    const items = await db.items.toArray()
    const byName = new Map(items.map(i => [normName(i.naam), i.id]))
    for (const l of lagen) {
      const key = `laag:${normName(l.naam)}:${l.file}`
      if (done.has(key)) continue
      const itemId = byName.get(normName(l.naam))
      if (!itemId) continue // stuk (nog) niet in de kast; volgende keer opnieuw proberen
      if (!(await db.layers.get(itemId))) {
        await setLayer(itemId, { blob: await blob(`lagen/${l.file}`), x: l.x, y: l.y, w: l.w, h: l.h, width: l.width, height: l.height })
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
