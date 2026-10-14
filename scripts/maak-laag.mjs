// Knipt een magenta-pop-afbeelding van ChatGPT tot laag en levert hem mee met de app.
//
//   node scripts/maak-laag.mjs "<bron.png>" "<naam zoals in de kast>" [opties]
//
// Opties, voor als ChatGPT er meer op zette dan het stuk:
//   --knip-onder <y>          alles vanaf rij y weg (broek/schoenen onder een t-shirt)
//   --donker-weg-onder <y>    vanaf rij y alleen donkere pixels weg (broek weg, witte mouwen blijven)
//
// Schrijft public/data/lagen/<slug>.png en werkt public/data/lagen/lagen.json bij.
// De app hangt meegeleverde lagen bij het opstarten aan het stuk met die naam
// (zie src/db/bundled.js), maar alleen als dat stuk nog geen laag heeft.
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { PNG } from 'pngjs'
import { extractLayer, cleanLayer } from '../src/utils/layerKey.js'

const args = process.argv.slice(2)
const opt = name => { const i = args.indexOf(name); return i >= 0 ? Number(args.splice(i, 2)[1]) : null }
const knipOnder = opt('--knip-onder')
const donkerOnder = opt('--donker-weg-onder')
const [bron, naam] = args
if (!bron || !naam) {
  console.error('gebruik: node scripts/maak-laag.mjs <bron.png> <naam>')
  process.exit(1)
}
const DIR = new URL('../public/data/lagen/', import.meta.url)
const MANIFEST = new URL('lagen.json', DIR)

const im = PNG.sync.read(readFileSync(bron))
let L = extractLayer(im.data, im.width, im.height)
if (knipOnder != null) L = cleanLayer(L, (x, y) => y < knipOnder)
if (donkerOnder != null) L = cleanLayer(L, (x, y, r, g, b) => y < donkerOnder || (r + g + b) / 3 > 150)
if (!L.w) throw new Error('niets over na het wegknippen van de pop')
const slug = naam.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const out = new PNG({ width: L.w, height: L.h })
out.data = Buffer.from(L.data)
const png = PNG.sync.write(out)
// Vingerafdruk in de naam: een nieuwe versie is een nieuw bestand, zodat de app
// hem als update herkent (zie src/db/bundled.js).
const file = `${slug}-${createHash('sha1').update(png).digest('hex').slice(0, 8)}.png`

const manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : { lagen: [] }
const vorige = manifest.lagen.find(l => l.naam === naam)
const vervangt = vorige && vorige.file !== file
  ? [...(vorige.vervangt ?? []), { file: vorige.file, x: vorige.x, y: vorige.y, w: vorige.w, h: vorige.h }]
  : vorige?.vervangt
if (vorige && vorige.file !== file && existsSync(new URL(vorige.file, DIR))) unlinkSync(new URL(vorige.file, DIR))
writeFileSync(new URL(file, DIR), png)
manifest.lagen = manifest.lagen.filter(l => l.naam !== naam)
manifest.lagen.push({ naam, file, x: L.x, y: L.y, w: L.w, h: L.h, width: L.width, height: L.height, ...(vervangt?.length ? { vervangt } : {}) })
writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n')
console.log(`${naam}: ${file} (${L.w}×${L.h} op ${L.x},${L.y}; achtergrond ${L.background}; dekking ${(L.coverage * 100).toFixed(1)}%)`)
