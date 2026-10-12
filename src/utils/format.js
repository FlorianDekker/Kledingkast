import { daysBetween, todayStr } from './stats'

const euroFmt = new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' })
const euroFmt0 = new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

export const euro = n => (n == null ? '–' : euroFmt.format(n))
export const euro0 = n => (n == null ? '–' : euroFmt0.format(n))

const MAANDEN = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']
const DAGEN = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za']

function parts(datum) {
  const [y, m, d] = datum.split('-').map(Number)
  return { y, m, d, wd: new Date(Date.UTC(y, m - 1, d)).getUTCDay() }
}

/** '2026-10-12' → 'ma 12 okt' (met jaar als het niet dit jaar is). */
export function dateLabel(datum, { weekday = true } = {}) {
  if (!datum) return '–'
  const { y, m, d, wd } = parts(datum)
  const jaar = y !== new Date().getFullYear() ? ` ${y}` : ''
  return `${weekday ? `${DAGEN[wd]} ` : ''}${d} ${MAANDEN[m - 1]}${jaar}`
}

/** '2024-03' → 'mrt 24' */
export function monthLabel(month) {
  const [y, m] = month.split('-').map(Number)
  return `${MAANDEN[m - 1]} ${String(y).slice(2)}`
}

/** Hoe lang geleden, kort: vandaag, gisteren, 5 dagen, 3 weken, 4 mnd, 2 jaar. */
export function agoLabel(datum, today = todayStr()) {
  if (!datum) return 'nooit'
  const n = daysBetween(datum, today)
  if (n <= 0) return 'vandaag'
  if (n === 1) return 'gisteren'
  if (n < 14) return `${n} dagen geleden`
  if (n < 61) return `${Math.round(n / 7)} weken geleden`
  if (n < 730) return `${Math.round(n / 30.4)} mnd geleden`
  const jaar = Math.floor(n / 365)
  return `${jaar} jaar geleden`
}

/** Getal uit een invoerveld ('12,50' of '12.50'); null bij leeg. */
export function parseAmount(s) {
  const t = String(s ?? '').trim().replace(/[€\s]/g, '').replace(',', '.')
  if (t === '') return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}
