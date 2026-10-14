// Knipt een magenta-pop-afbeelding van ChatGPT tot laag en levert hem mee met de app.
//
//   node scripts/maak-laag.mjs "<bron.png>" "<naam zoals in de kast>" [opties]
//   node scripts/maak-laag.mjs --alles [bronmap]
//
// Opties, voor als ChatGPT er meer op zette dan het stuk:
//   --knip-onder <y>          alles vanaf rij y weg (broek/schoenen onder een t-shirt)
//   --knip-boven <y>          alles boven rij y weg (losse schaduw boven een broek)
//   --donker-weg-onder <y>    vanaf rij y alleen donkere pixels weg (broek weg, witte mouwen blijven)
//
// --alles knipt elke laag in lagen.json opnieuw uit zijn bronbestand (standaard in
// je Downloads), met dezelfde opties. Handig als het knippen verbeterd is.
//
// Schrijft public/data/lagen/<slug>-<hash>.png (+ -masker.png) en werkt
// public/data/lagen/lagen.json bij. De app hangt meegeleverde lagen aan het stuk
// met die naam (zie src/db/bundled.js); een nieuwere versie vervangt een oudere
// meegeleverde, nooit een eigen upload.
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { basename, join } from 'node:path'
import { homedir } from 'node:os'
import { PNG } from 'pngjs'
import { extractLayer, cleanLayer, eraseMask } from '../src/utils/layerKey.js'

const DIR = new URL('../public/data/lagen/', import.meta.url)
const MANIFEST = new URL('lagen.json', DIR)

const readManifest = () => (existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : { lagen: [] })
const writePng = (data, w, h) => { const p = new PNG({ width: w, height: h }); p.data = Buffer.from(data); return PNG.sync.write(p) }
const remove = file => { if (file && existsSync(new URL(file, DIR))) unlinkSync(new URL(file, DIR)) }

function maak(bron, naam, opties = {}) {
  const im = PNG.sync.read(readFileSync(bron))
  let L = extractLayer(im.data, im.width, im.height)
  if (opties.knipOnder != null) L = cleanLayer(L, (x, y) => y < opties.knipOnder)
  if (opties.knipBoven != null) L = cleanLayer(L, (x, y) => y >= opties.knipBoven)
  if (opties.donkerWegOnder != null) L = cleanLayer(L, (x, y, r, g, b) => y < opties.donkerWegOnder || (r + g + b) / 3 > 150)
  if (!L.w) throw new Error(`${naam}: niets over na het wegknippen van de pop`)

  const png = writePng(L.data, L.w, L.h)
  const M = eraseMask(L)
  const maskPng = M ? writePng(M.data, M.w, M.h) : null
  // Vingerafdruk in de naam: een nieuwe versie is een nieuw bestand, zodat de
  // app hem als update herkent.
  const hash = createHash('sha1').update(png).update(maskPng ?? '').digest('hex').slice(0, 8)
  const slug = naam.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const file = `${slug}-${hash}.png`
  const maskFile = maskPng ? `${slug}-${hash}-masker.png` : null

  const manifest = readManifest()
  const vorige = manifest.lagen.find(l => l.naam === naam)
  const nieuw = !vorige || vorige.file !== file
  const vervangt = nieuw && vorige
    ? [...(vorige.vervangt ?? []), { file: vorige.file, x: vorige.x, y: vorige.y, w: vorige.w, h: vorige.h }]
    : vorige?.vervangt
  if (nieuw && vorige) { remove(vorige.file); remove(vorige.mask?.file) }
  writeFileSync(new URL(file, DIR), png)
  if (maskPng) writeFileSync(new URL(maskFile, DIR), maskPng)

  const entry = {
    naam, file, x: L.x, y: L.y, w: L.w, h: L.h, width: L.width, height: L.height,
    ...(M ? { mask: { file: maskFile, x: M.x, y: M.y, w: M.w, h: M.h } } : {}),
    bronbestand: basename(bron),
    ...(Object.keys(opties).length ? { opties } : {}),
    ...(vervangt?.length ? { vervangt } : {}),
    ...(vorige?.ingestopt != null ? { ingestopt: vorige.ingestopt } : {}),
  }
  manifest.lagen = manifest.lagen.filter(l => l.naam !== naam)
  manifest.lagen.push(entry)
  writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n')
  console.log(`${naam}: ${file}${nieuw ? '' : ' (ongewijzigd)'} (${L.w}×${L.h} op ${L.x},${L.y}; ${L.background}; dekking ${(L.coverage * 100).toFixed(1)}%)`)
}

const args = process.argv.slice(2)
if (args[0] === '--alles') {
  const map = args[1] ?? join(homedir(), 'Downloads')
  for (const l of readManifest().lagen) {
    if (!l.bronbestand) { console.warn(`${l.naam}: geen bronbestand bekend, overgeslagen`); continue }
    maak(join(map, l.bronbestand), l.naam, l.opties ?? {})
  }
} else {
  const opt = name => { const i = args.indexOf(name); return i >= 0 ? Number(args.splice(i, 2)[1]) : null }
  const opties = {}
  const k = opt('--knip-onder'); if (k != null) opties.knipOnder = k
  const d = opt('--donker-weg-onder'); if (d != null) opties.donkerWegOnder = d
  const b = opt('--knip-boven'); if (b != null) opties.knipBoven = b
  const [bron, naam] = args
  if (!bron || !naam) {
    console.error('gebruik: node scripts/maak-laag.mjs <bron.png> <naam> [--knip-onder y] [--knip-boven y] [--donker-weg-onder y]  |  --alles [map]')
    process.exit(1)
  }
  maak(bron, naam, opties)
}
