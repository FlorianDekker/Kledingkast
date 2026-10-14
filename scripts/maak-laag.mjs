// Knipt een magenta-pop-afbeelding van ChatGPT tot laag en levert hem mee met de app.
//
//   node scripts/maak-laag.mjs "<bron.png>" "<naam zoals in de kast>"
//
// Schrijft public/data/lagen/<slug>.png en werkt public/data/lagen/lagen.json bij.
// De app hangt meegeleverde lagen bij het opstarten aan het stuk met die naam
// (zie src/db/bundled.js), maar alleen als dat stuk nog geen laag heeft.
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { PNG } from 'pngjs'
import { extractLayer } from '../src/utils/layerKey.js'

const [bron, naam] = process.argv.slice(2)
if (!bron || !naam) {
  console.error('gebruik: node scripts/maak-laag.mjs <bron.png> <naam>')
  process.exit(1)
}
const DIR = new URL('../public/data/lagen/', import.meta.url)
const MANIFEST = new URL('lagen.json', DIR)

const im = PNG.sync.read(readFileSync(bron))
const L = extractLayer(im.data, im.width, im.height)
if (!L.w) throw new Error('niets over na het wegknippen van de pop')
const slug = naam.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const out = new PNG({ width: L.w, height: L.h })
out.data = Buffer.from(L.data)
writeFileSync(new URL(`${slug}.png`, DIR), PNG.sync.write(out))

const manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : { lagen: [] }
manifest.lagen = manifest.lagen.filter(l => l.naam !== naam)
manifest.lagen.push({ naam, file: `${slug}.png`, x: L.x, y: L.y, w: L.w, h: L.h, width: L.width, height: L.height })
writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n')
console.log(`${naam}: ${slug}.png (${L.w}×${L.h} op ${L.x},${L.y}; achtergrond ${L.background}; dekking ${(L.coverage * 100).toFixed(1)}%)`)
