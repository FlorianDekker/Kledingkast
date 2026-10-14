import { useMemo, useState } from 'react'
import { PageWrapper } from '../components/layout/PageWrapper'
import { ItemSheet } from '../components/items/ItemSheet'
import { GarmentIcon } from '../components/icons/GarmentIcon'
import { Chip } from '../components/ui/Chip'
import { useItemStats, usePhotoUrls } from '../hooks/useData'
import { CATEGORIES } from '../constants/categories'
import { COLOUR_BY_KEY } from '../utils/colors'
import { todayStr } from '../utils/stats'
import { euro, euro0, agoLabel, dateLabel } from '../utils/format'

const SORTS = [
  { key: 'gedragen', label: 'Meest gedragen', cmp: (a, b) => b.count - a.count, info: r => `${r.count}× gedragen` },
  { key: 'cpw-laag', label: 'Goedkoopst per keer', cmp: (a, b) => (a.cpw ?? Infinity) - (b.cpw ?? Infinity), info: cpwInfo },
  { key: 'cpw-hoog', label: 'Duurst per keer', cmp: (a, b) => (b.cpw ?? -1) - (a.cpw ?? -1), info: cpwInfo },
  { key: 'recent', label: 'Laatst gedragen', cmp: (a, b) => (b.lastWorn ?? '').localeCompare(a.lastWorn ?? ''), info: (r, t) => agoLabel(r.lastWorn, t) },
  { key: 'vergeten', label: 'Langst niet gedragen', cmp: (a, b) => (a.lastWorn ?? '').localeCompare(b.lastWorn ?? ''), info: (r, t) => agoLabel(r.lastWorn, t) },
  { key: 'nieuw', label: 'Nieuwste aankoop', cmp: (a, b) => (b.item.aankoopdatum ?? '').localeCompare(a.item.aankoopdatum ?? ''), info: r => (r.item.aankoopdatum ? dateLabel(r.item.aankoopdatum, { weekday: false }) : 'datum onbekend') },
  { key: 'naam', label: 'Naam', cmp: (a, b) => a.item.naam.localeCompare(b.item.naam), info: r => `${r.count}× gedragen` },
]

function cpwInfo(r) {
  if (r.cpw != null) return `${euro(r.cpw)} per keer`
  return r.item.prijs == null ? 'prijs onbekend' : 'nog niet gedragen'
}

const tileColour = it => (it.kleur === 'multi' ? '#C9B8A6' : COLOUR_BY_KEY[it.kleur]?.hex)

export function WardrobePage() {
  const { rows } = useItemStats()
  const photoUrls = usePhotoUrls()
  const [cat, setCat] = useState('alles')
  const [q, setQ] = useState('')
  const [sort, setSort] = useState('gedragen')
  const [toonUit, setToonUit] = useState(false)
  const [openId, setOpenId] = useState(null)
  const [adding, setAdding] = useState(false)
  const today = todayStr()
  const sorter = SORTS.find(s => s.key === sort)

  const list = useMemo(() => {
    if (!rows) return []
    const term = q.trim().toLowerCase()
    return rows
      .filter(r => toonUit || !r.item.uitKast)
      .filter(r => cat === 'alles' || r.item.categorie === cat)
      .filter(r => !term || r.item.naam.toLowerCase().includes(term))
      .sort((a, b) => sorter.cmp(a, b) || a.item.naam.localeCompare(b.item.naam))
  }, [rows, q, sorter, cat, toonUit])

  const spend = list.reduce((s, r) => s + (r.item.prijs ?? 0), 0)

  return (
    <PageWrapper
      title="Kast"
      eyebrow={`${list.length} stuks · samen ${euro0(spend)}`}
      right={
        <button onClick={() => setAdding(true)} aria-label="Kledingstuk toevoegen"
          className="w-10 h-10 rounded-full text-2xl font-light flex items-center justify-center btn-accent">+</button>
      }
    >
      <div className="px-4 space-y-3 mb-4">
        <div className="relative">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
          </svg>
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Zoek in je kast"
            className="w-full pl-10 pr-3.5 py-2.5 rounded-full outline-none"
            style={{ background: 'var(--color-surface)', color: 'var(--color-text)', boxShadow: 'var(--shadow-card)' }}
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none -mx-4 px-4">
          <Chip active={cat === 'alles'} onClick={() => setCat('alles')}>Alles</Chip>
          {CATEGORIES.map(c => (
            <Chip key={c.key} active={cat === c.key} onClick={() => setCat(c.key)}>{c.label}</Chip>
          ))}
        </div>
        <div className="flex items-center justify-between gap-2">
          <label className="relative flex items-center gap-1 text-sm font-medium">
            {sorter.label}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="m6 9 6 6 6-6" /></svg>
            <select value={sort} onChange={e => setSort(e.target.value)} className="absolute inset-0 opacity-0" aria-label="Sorteren">
              {SORTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </label>
          <button onClick={() => setToonUit(v => !v)} className="text-xs font-medium px-3 py-1.5 rounded-full"
            style={toonUit ? { background: 'var(--color-accent)', color: 'var(--color-on-accent)' } : { background: 'var(--color-surface-2)' }}>
            Ook uit de kast
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-x-2.5 gap-y-4 px-4">
        {list.map(r => (
          <button key={r.item.id} onClick={() => setOpenId(r.item.id)} className="text-left" style={{ opacity: r.item.uitKast ? 0.5 : 1 }}>
            <div className="aspect-square rounded-2xl flex items-center justify-center overflow-hidden"
              style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}>
              {photoUrls.get(r.item.id)
                ? <img src={photoUrls.get(r.item.id)} alt="" className="w-full h-full object-contain p-1.5" />
                : <GarmentIcon categorie={r.item.categorie} fill={tileColour(r.item)} size={58} />}
            </div>
            <div className="text-[12px] leading-tight mt-1.5 line-clamp-2">{r.item.naam}</div>
            <div className="text-[11px] text-muted mt-0.5 tabular-nums truncate">
              {r.item.uitKast ? 'uit de kast' : sorter.info(r, today)}
            </div>
          </button>
        ))}
      </div>
      {list.length === 0 && <div className="p-10 text-center text-sm text-muted">Niets gevonden</div>}

      <ItemSheet open={!!openId} itemId={openId} onClose={() => setOpenId(null)} />
      <ItemSheet open={adding} preset={{ categorie: cat === 'alles' ? 'broek' : cat }} onClose={() => setAdding(false)} />
    </PageWrapper>
  )
}
