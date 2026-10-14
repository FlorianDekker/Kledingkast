// Lijnillustratie per kledingsoort, ingekleurd in de kleur van het stuk.
// viewBox 48×48; elke vorm is gesloten zodat hij gevuld kan worden.
const SHAPES = {
  tshirt: [
    'M17 7 7 12.5l3.5 7.5 4.5-2V41h18V18l4.5 2 3.5-7.5L31 7c-1 3-3.8 5-7 5s-6-2-7-5Z',
  ],
  trui: [
    'M17 7 9 10.5 4.5 37.5h5.5L15 18v23h18V18l5 19.5h5.5L39 10.5 31 7c-1 3-3.8 5-7 5s-6-2-7-5Z',
    'M15 38h18',
  ],
  blouse: [
    'M18 6.5 9.5 10 5 36.5h5.5L15 19v22h18V19l4.5 17.5H43L38.5 10 30 6.5 24 12Z',
    'M18 6.5 24 12l6-5.5M24 12v29',
    'M22.5 18h0M22.5 24h0M22.5 30h0',
  ],
  broek: [
    'M14 6h20l2.5 36H27L24 17l-3 25h-9.5Z',
    'M14 10h20M24 10v7',
  ],
  schoenen: [
    'M4 33v-6.5c0-1.5 1-2.5 2.5-2.5H12l6-8h4.5l2 5c6.5.5 13 2.5 17.5 6.5V33Z',
    'M4 33h38v3.5H4Z',
    'M20 21.5l2 3M23 20l2 3',
  ],
  jas: [
    'M17 6 9 9 4 38h5l3-20v24h24V18l3 20h5L39 9l-8-3-7 10Z',
    'M17 6l7 10 7-10M24 16v26',
    'M15 32h5M28 32h5',
  ],
}

/**
 * @param fill  kleur van het stuk (hex) of null
 * @param size  px
 */
export function GarmentIcon({ categorie, fill, size = 32, strokeWidth = 1.6 }) {
  const paths = SHAPES[categorie] ?? SHAPES.tshirt
  const f = fill ?? '#D9D3C8'
  // Omtrek altijd donker; detaillijnen op een donker stuk licht, anders zie je ze niet
  const outline = 'var(--garment-outline)'
  const detail = isLight(f) ? 'rgba(28,27,25,0.42)' : 'rgba(255,255,255,0.5)'
  const filled = i => i === 0 || (categorie === 'schoenen' && i === 1)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      {paths.map((d, i) => (
        <path
          key={i}
          d={d}
          fill={filled(i) ? f : 'none'}
          style={{ stroke: filled(i) ? outline : detail }}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ))}
    </svg>
  )
}

function isLight(hex) {
  const h = hex.replace('#', '')
  if (h.length !== 6) return true
  const [r, g, b] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16))
  return 0.299 * r + 0.587 * g + 0.114 * b > 150
}
