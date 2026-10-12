// Kleuren voor de grafiek "keer gedragen per kleur". Je Excel had geen
// kleurkolom; bij de import raden we de kleur uit de naam ("Dickies 874 zwart"
// → zwart). In het stuk zelf is hij aan te passen.
export const COLOURS = [
  { key: 'zwart',  label: 'Zwart',  hex: '#1f2937', words: ['zwart', 'zwarte', 'black'] },
  { key: 'wit',    label: 'Wit',    hex: '#e5e7eb', words: ['wit', 'witte', 'white', 'creme', 'crème', 'ecru'] },
  { key: 'grijs',  label: 'Grijs',  hex: '#9ca3af', words: ['grijs', 'grijze', 'grey', 'gray', 'antraciet'] },
  { key: 'blauw',  label: 'Blauw',  hex: '#3b82f6', words: ['blauw', 'blauwe', 'lichtblauw', 'lichtblauwe', 'donkerblauw', 'donkerblauwe', 'navy', 'cyan', 'spijkerbroek', 'spijkerjas', 'denim', 'jeans'] },
  { key: 'groen',  label: 'Groen',  hex: '#10b981', words: ['groen', 'groene', 'olijf', 'kaki', 'khaki', 'mint'] },
  { key: 'bruin',  label: 'Bruin',  hex: '#92400e', words: ['bruin', 'bruine', 'camel', 'cognac'] },
  { key: 'beige',  label: 'Beige',  hex: '#d6c4a0', words: ['beige', 'zand', 'taupe'] },
  { key: 'rood',   label: 'Rood',   hex: '#ef4444', words: ['rood', 'rode', 'bordeaux', 'red'] },
  { key: 'roze',   label: 'Roze',   hex: '#f472b6', words: ['roze', 'pink'] },
  { key: 'geel',   label: 'Geel',   hex: '#facc15', words: ['geel', 'gele', 'mosterd'] },
  { key: 'oranje', label: 'Oranje', hex: '#f97316', words: ['oranje'] },
  { key: 'paars',  label: 'Paars',  hex: '#8b5cf6', words: ['paars', 'paarse', 'lila'] },
  { key: 'multi',  label: 'Bont',   hex: '#a3a3a3', words: [] },
]

export const COLOUR_BY_KEY = Object.fromEntries(COLOURS.map(c => [c.key, c]))

/** Eerste kleurwoord in de naam (van links af); null als er geen in staat. */
export function guessColour(naam) {
  const words = String(naam ?? '').toLowerCase().split(/[^a-zà-ÿ]+/).filter(Boolean)
  for (const w of words) {
    const hit = COLOURS.find(c => c.words.includes(w))
    if (hit) return hit.key
  }
  return null
}
