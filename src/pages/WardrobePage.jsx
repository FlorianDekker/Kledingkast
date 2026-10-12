import { useMemo, useState } from 'react'
import { PageWrapper } from '../components/layout/PageWrapper'
import { ItemThumb } from '../components/items/ItemThumb'
import { ItemSheet } from '../components/items/ItemSheet'
import { Chip } from '../components/ui/Chip'
import { useItemStats, usePhotoUrls } from '../hooks/useData'
import { CATEGORIES } from '../constants/categories'
import { todayStr } from '../utils/stats'
import { euro, euro0, agoLabel } from '../utils/format'

const SORTS = [
  { key: 'gedragen', label: 'Meest gedragen', cmp: (a, b) => b.count - a.count },
  { key: 'cpw-hoog', label: 'Duurst per keer', cmp: (a, b) => (b.cpw ?? -1) - (a.cpw ?? -1) },
  { key: 'cpw-laag', label: 'Goedkoopst per keer', cmp: (a, b) => (a.cpw ?? Infinity) - (b.cpw ?? Infinity) },
  { key: 'recent', label: 'Laatst gedragen', cmp: (a, b) => (b.lastWorn ?? '').localeCompare(a.lastWorn ?? '') },
  { key: 'vergeten', label: 'Langst niet gedragen', cmp: (a, b) => (a.lastWorn ?? '').localeCompare(b.lastWorn ?? '') },
  { key: 'nieuw', label: 'Nieuwste aankoop', cmp: (a, b) => (b.item.aankoopdatum ?? '').localeCompare(a.item.aankoopdatum ?? '') },
  { key: 'naam', label: 'Naam', cmp: (a, b) => a.item.naam.localeCompare(b.item.naam) },
]

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

  const list = useMemo(() => {
    if (!rows) return []
    const term = q.trim().toLowerCase()
    const cmp = SORTS.find(s => s.key === sort).cmp
    return rows
      .filter(r => toonUit || !r.item.uitKast)
      .filter(r => cat === 'alles' || r.item.categorie === cat)
      .filter(r => !term || r.item.naam.toLowerCase().includes(term))
      .sort((a, b) => cmp(a, b) || a.item.naam.localeCompare(b.item.naam))
  }, [rows, q, sort, cat, toonUit])

  const spend = list.reduce((s, r) => s + (r.item.prijs ?? 0), 0)

  return (
    <PageWrapper title="Kast">
      <div className="px-4 space-y-2.5 mb-3">
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Zoek in je kast"
          className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none"
          style={{ background: 'var(--color-surface)', color: 'var(--color-text)', boxShadow: 'var(--shadow-card)' }}
        />
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none -mx-4 px-4">
          <Chip active={cat === 'alles'} onClick={() => setCat('alles')}>Alles</Chip>
          {CATEGORIES.map(c => (
            <Chip key={c.key} active={cat === c.key} onClick={() => setCat(c.key)}>{c.emoji} {c.label}</Chip>
          ))}
        </div>
        <div className="flex items-center justify-between gap-2">
          <select value={sort} onChange={e => setSort(e.target.value)}
            className="text-sm font-medium bg-transparent outline-none" style={{ color: 'var(--color-accent)' }}>
            {SORTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
          <label className="flex items-center gap-2 text-xs text-muted">
            <input type="checkbox" checked={toonUit} onChange={e => setToonUit(e.target.checked)} className="accent-[var(--color-accent)]" />
            Ook uit de kast
          </label>
        </div>
        <div className="text-xs text-muted">{list.length} stuks · samen {euro0(spend)}</div>
      </div>

      <div className="card mx-4 overflow-hidden">
        {list.map((r, i) => (
          <button key={r.item.id} onClick={() => setOpenId(r.item.id)}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-left"
            style={{ borderTop: i ? '1px solid var(--color-border)' : undefined, opacity: r.item.uitKast ? 0.55 : 1 }}>
            <ItemThumb item={r.item} url={photoUrls.get(r.item.id)} size={44} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{r.item.naam}</div>
              <div className="text-xs text-muted truncate">
                {r.item.uitKast ? 'uit de kast · ' : ''}{agoLabel(r.lastWorn, today)}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-sm font-semibold tabular-nums">{r.count}×</div>
              <div className="text-[11px] text-muted tabular-nums">{r.cpw != null ? `${euro(r.cpw)}/keer` : r.item.prijs == null ? 'prijs?' : 'nog niet'}</div>
            </div>
          </button>
        ))}
        {list.length === 0 && <div className="p-8 text-center text-sm text-muted">Niets gevonden</div>}
      </div>

      <button onClick={() => setAdding(true)} aria-label="Kledingstuk toevoegen"
        className="fixed right-5 z-30 w-14 h-14 rounded-full text-white text-3xl flex items-center justify-center"
        style={{ bottom: 'calc(env(safe-area-inset-bottom) + 80px)', background: 'var(--color-accent)', boxShadow: '0 6px 20px rgba(0,0,0,0.2)' }}>
        +
      </button>

      <ItemSheet open={!!openId} itemId={openId} onClose={() => setOpenId(null)} />
      <ItemSheet open={adding} preset={{ categorie: cat === 'alles' ? 'broek' : cat }} onClose={() => setAdding(false)} />
    </PageWrapper>
  )
}
