// Kledingstuk uit een "aangeklede pop"-afbeelding knippen.
//
// De pop is fel magenta (#FF00FF). Alles wat magenta is, is pop en wordt
// doorzichtig; wat overblijft is het kledingstuk, op precies de plek waar het
// op de pop zit. Zo kunnen de lagen van verschillende stukken op één basispop
// gestapeld worden.
//
// ChatGPT levert soms een nep-transparante achtergrond (een ingetekend
// ruitjespatroon) of een egale achtergrond. Die vegen we vanaf de rand weg:
// alles wat op de achtergrond lijkt en via achtergrond met de rand verbonden
// is, gaat weg. Beperking: een wit kledingstuk dat tegen een witte ingetekende
// achtergrond ligt, is op kleur niet te onderscheiden en kan mee verdwijnen.
// De app waarschuwt dan; opnieuw genereren met echte transparantie is de oplossing.
//
// Puur: werkt op RGBA-bytes, zodat het zowel in de browser (canvas) als in de
// tests (Node) draait.

const MAG_LO = 30   // min(r, b) - g hieronder: geen pop
const MAG_HI = 90   // hierboven: volledig pop
const ALPHA_MIN = 16
// Losse stukjes kleiner dan dit deel van het canvas gaan weg (~470 px op 1024×1536)
const MIN_ISLAND_SHARE = 0.0003

/** Hoe "magenta" een pixel is, 0..1. */
const magentaness = (r, g, b) => Math.min(1, Math.max(0, (Math.min(r, b) - g - MAG_LO) / (MAG_HI - MAG_LO)))

/** Mediaan van de randpixels (voor de achtergrondkleur). */
function borderStats(data, w, h) {
  const lums = []
  let transparent = 0
  let n = 0
  const take = i => {
    n++
    if (data[i + 3] < 250) { transparent++; return }
    lums.push((data[i] + data[i + 1] + data[i + 2]) / 3)
  }
  for (let x = 0; x < w; x += 2) { take((x) * 4); take(((h - 1) * w + x) * 4) }
  for (let y = 0; y < h; y += 2) { take((y * w) * 4); take((y * w + w - 1) * 4) }
  lums.sort((a, b) => a - b)
  return { transparentShare: transparent / n, medianLum: lums.length ? lums[lums.length >> 1] : null }
}

/**
 * @param {Uint8ClampedArray|Uint8Array} src RGBA-pixels (wordt niet aangepast)
 * @returns {{ data: Uint8ClampedArray, x, y, w, h, width, height, coverage, background }}
 *   `data` is de bijgesneden laag (w×h) die op (x, y) in het volle canvas hoort.
 *   `coverage` is het aandeel van het canvas dat het stuk bedekt.
 *   `background` zegt wat er met de achtergrond is gebeurd.
 */
export function extractLayer(src, width, height) {
  const n = width * height
  const out = new Uint8ClampedArray(src)

  // 1. Magenta eruit, met de roze weerschijn op randen teruggedrukt
  for (let i = 0; i < out.length; i += 4) {
    const r = out[i], g = out[i + 1], b = out[i + 2]
    const k = magentaness(r, g, b)
    if (k > 0) out[i + 3] = Math.round(out[i + 3] * (1 - k))
    const spill = Math.min(r, b) - g
    if (spill > 0) {
      out[i] = r - spill * 0.9
      out[i + 2] = b - spill * 0.9
    }
  }

  // 2. Ingetekende achtergrond wegvegen (alleen als de rand niet al doorzichtig is)
  const border = borderStats(src, width, height)
  let background = 'transparant'
  if (border.transparentShare < 0.5 && border.medianLum != null) {
    const light = border.medianLum >= 128
    background = light ? 'licht weggeveegd' : 'donker weggeveegd'
    const isBg = i => {
      const r = src[i], g = src[i + 1], b = src[i + 2]
      const sat = Math.max(r, g, b) - Math.min(r, g, b)
      const lum = (r + g + b) / 3
      return sat < 28 && (light ? lum > 170 : lum < 60)
    }
    const seen = new Uint8Array(n)
    const stack = []
    const push = p => { if (!seen[p]) { seen[p] = 1; stack.push(p) } }
    for (let x = 0; x < width; x++) { push(x); push((height - 1) * width + x) }
    for (let y = 0; y < height; y++) { push(y * width); push(y * width + width - 1) }
    while (stack.length) {
      const p = stack.pop()
      const i = p * 4
      // Niet dóór de pop heen vegen: dan zou een wit shirt via de pop
      // bereikbaar worden. Alleen over achtergrond en al-doorzichtige pixels.
      if (!(src[i + 3] < ALPHA_MIN || isBg(i))) continue
      out[i + 3] = 0
      const x = p % width
      if (x > 0) push(p - 1)
      if (x < width - 1) push(p + 1)
      if (p >= width) push(p - width)
      if (p < n - width) push(p + width)
    }
  }

  // 3. Bijna-doorzichtig wordt doorzichtig; losse spikkels weg
  for (let i = 3; i < out.length; i += 4) if (out[i] < ALPHA_MIN) out[i] = 0
  removeIslands(out, width, height)

  // 4. Bijsnijden tot het stuk
  let x0 = width, y0 = height, x1 = -1, y1 = -1, covered = 0
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (out[(y * width + x) * 4 + 3] > 0) {
        covered++
        if (x < x0) x0 = x
        if (x > x1) x1 = x
        if (y < y0) y0 = y
        if (y > y1) y1 = y
      }
    }
  }
  if (x1 < 0) return { data: new Uint8ClampedArray(0), x: 0, y: 0, w: 0, h: 0, width, height, coverage: 0, background }
  const w = x1 - x0 + 1
  const h = y1 - y0 + 1
  const data = new Uint8ClampedArray(w * h * 4)
  for (let y = 0; y < h; y++) {
    const from = ((y0 + y) * width + x0) * 4
    data.set(out.subarray(from, from + w * 4), y * w * 4)
  }
  return { data, x: x0, y: y0, w, h, width, height, coverage: covered / n, background }
}

/** Verwijdert aaneengesloten stukjes kleiner dan MIN_ISLAND_SHARE van het canvas. */
function removeIslands(data, width, height) {
  const n = width * height
  const minIsland = Math.max(20, Math.round(n * MIN_ISLAND_SHARE))
  const label = new Int32Array(n)
  const stack = []
  const members = []
  let id = 0
  for (let s = 0; s < n; s++) {
    if (label[s] || data[s * 4 + 3] === 0) continue
    id++
    members.length = 0
    label[s] = id
    stack.push(s)
    while (stack.length) {
      const p = stack.pop()
      members.push(p)
      const x = p % width
      const nb = [x > 0 ? p - 1 : -1, x < width - 1 ? p + 1 : -1, p - width, p + width]
      for (const q of nb) {
        if (q < 0 || q >= n || label[q] || data[q * 4 + 3] === 0) continue
        label[q] = id
        stack.push(q)
      }
    }
    if (members.length < minIsland) for (const p of members) data[p * 4 + 3] = 0
  }
}

/**
 * Basispop: is hij magenta, dan kleuren we hem grijs (schaduw blijft), zodat
 * je ook de magenta-versie van ChatGPT als basis kunt gebruiken.
 */
export function greyMannequin(src) {
  const out = new Uint8ClampedArray(src)
  for (let i = 0; i < out.length; i += 4) {
    const r = out[i], g = out[i + 1], b = out[i + 2]
    if (magentaness(r, g, b) <= 0) continue
    const v = Math.round(((r + b) / 2) * 0.82)
    out[i] = out[i + 1] = out[i + 2] = v
  }
  return out
}
