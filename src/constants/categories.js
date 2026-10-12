// De zes vakjes van het Google Form, in dezelfde volgorde.
// `form` is de kolomkop in "Form responses 1", `data` de waarde in Data!Type.
export const CATEGORIES = [
  { key: 'broek',    label: 'Broek',           form: 'Broek',           data: 'Broek',    emoji: '👖' },
  { key: 'tshirt',   label: 'T-shirt',         form: 'T-shirt',         data: 'T-shirt',  emoji: '👕' },
  { key: 'trui',     label: 'Trui/vest/jasje', form: 'Trui/Vest/Jasje', data: 'Trui',     emoji: '🧶' },
  { key: 'blouse',   label: 'Blousje',         form: 'Blousje',         data: 'Blousje',  emoji: '👔' },
  { key: 'schoenen', label: 'Schoenen',        form: 'Schoenen',        data: 'Schoenen', emoji: '👞' },
  { key: 'jas',      label: 'Jas',             form: 'Jas',             data: 'Jas',      emoji: '🧥' },
]

export const CATEGORY_BY_KEY = Object.fromEntries(CATEGORIES.map(c => [c.key, c]))

const norm = s => String(s ?? '').trim().toLowerCase()

/** Data!Type ("Broek", "trui", ...) of formulierkop naar categoriesleutel; null als onbekend. */
export function categoryFromLabel(label) {
  const n = norm(label)
  const hit = CATEGORIES.find(c => norm(c.data) === n || norm(c.form) === n || c.key === n || norm(c.label) === n)
  return hit?.key ?? null
}
