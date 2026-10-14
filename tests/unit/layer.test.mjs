import { test, assert } from './t.mjs'
import { extractLayer, greyMannequin } from '../../src/utils/layerKey.js'

const W = 60, H = 90
const MAGENTA = [255, 0, 255, 255]
const WHITE = [250, 250, 250, 255]
const SHOE = [40, 35, 30, 255]

function image(bg) {
  const d = new Uint8ClampedArray(W * H * 4)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) d.set(bg(x, y), (y * W + x) * 4)
  return d
}
function rect(d, x0, y0, x1, y1, c) {
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) d.set(c, (y * W + x) * 4)
}
const alphaAt = (L, x, y) => L.data[((y - L.y) * L.w + (x - L.x)) * 4 + 3]

// Pop 20..40 breed over de hele hoogte, shirt 15..45 × 20..50 (wit, breder dan de pop),
// schoen 18..42 × 80..88 (donker).
function scene(bg) {
  const d = image(bg)
  rect(d, 20, 5, 40, 85, MAGENTA)
  rect(d, 15, 20, 45, 50, WHITE)
  rect(d, 18, 80, 42, 88, SHOE)
  return d
}

await test('transparante achtergrond: pop weg, shirt en schoen blijven', () => {
  const L = extractLayer(scene(() => [0, 0, 0, 0]), W, H)
  assert.equal(L.background, 'transparant')
  assert.deepEqual([L.x, L.y, L.x + L.w, L.y + L.h], [15, 20, 45, 88])
  assert.equal(alphaAt(L, 30, 30), 255)  // shirt
  assert.equal(alphaAt(L, 30, 60), 0)    // pop tussen shirt en schoen
  assert.equal(alphaAt(L, 30, 84), 255)  // schoen
})

await test('ingetekend ruitjespatroon wordt weggeveegd, gekleurd shirt blijft', () => {
  const checker = (x, y) => ((x >> 2) + (y >> 2)) % 2 ? [255, 255, 255, 255] : [204, 204, 204, 255]
  const d = scene(checker)
  rect(d, 15, 20, 45, 50, [170, 195, 230, 255]) // lichtblauw: licht, maar niet grijs
  const L = extractLayer(d, W, H)
  assert.equal(L.background, 'licht weggeveegd')
  assert.deepEqual([L.x, L.y, L.x + L.w, L.y + L.h], [15, 20, 45, 88])
  assert.equal(alphaAt(L, 16, 30), 255)  // rand van het shirt, naast de achtergrond
  assert.equal(alphaAt(L, 30, 30), 255)
})

await test('roze weerschijn op de rand wordt neutraal', () => {
  const d = scene(() => [0, 0, 0, 0])
  rect(d, 15, 20, 16, 50, [250, 200, 250, 255]) // licht roze rand aan het shirt
  const L = extractLayer(d, W, H)
  const i = ((30 - L.y) * L.w + (15 - L.x)) * 4
  assert.ok(Math.abs(L.data[i] - L.data[i + 1]) < 10, `rood ${L.data[i]} vs groen ${L.data[i + 1]}`)
})

await test('losse spikkels verdwijnen', () => {
  const d = scene(() => [0, 0, 0, 0])
  rect(d, 2, 2, 5, 5, SHOE)
  const L = extractLayer(d, W, H)
  assert.equal(L.x, 15)
  assert.equal(L.y, 20)
})

await test('alleen pop geeft een lege laag', () => {
  const d = image(() => [0, 0, 0, 0])
  rect(d, 20, 5, 40, 85, MAGENTA)
  assert.equal(extractLayer(d, W, H).w, 0)
})

await test('greyMannequin maakt magenta grijs en laat de rest staan', () => {
  const d = new Uint8ClampedArray([255, 0, 255, 255, 250, 250, 250, 255])
  const g = greyMannequin(d)
  assert.equal(g[0], g[1]); assert.equal(g[1], g[2])
  assert.deepEqual([...g.slice(4)], [250, 250, 250, 255])
})
