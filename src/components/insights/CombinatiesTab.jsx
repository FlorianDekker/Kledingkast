import { useMemo, useState } from 'react'
import { OutfitSheet } from './OutfitSheet'
import { OutfitDoll } from '../items/OutfitDoll'
import { ItemThumb } from '../items/ItemThumb'
import { Chip } from '../ui/Chip'
import { BASE_ID } from '../../db/db'
import { topOutfits, topPairs } from '../../utils/insights'
import { agoLabel } from '../../utils/format'

const DUO_FILTERS = [
  { key: 'broek-schoenen', label: 'Broek + schoenen', soorten: ['broek', 'schoenen'] },
  { key: 'broek-boven', label: 'Broek + boven', soorten: ['broek', 'tshirt', 'blouse', 'trui'] },
  { key: 'boven-jas', label: 'Boven + jas', soorten: ['tshirt', 'blouse', 'trui', 'jas'] },
  { key: 'alles', label: 'Alles', soorten: null },
]

export function CombinatiesTab({ items, wears, layers, photoUrls, today }) {
  const byId = useMemo(() => new Map(items.map(it => [it.id, it])), [items])
  const [filter, setFilter] = useState('broek-schoenen')
  const [open, setOpen] = useState(null) // { items, title, subtitle, datums }
  const outfits = useMemo(() => topOutfits(wears, { limit: 10 }), [wears])
  const duos = useMemo(
    () => topPairs(wears, byId, { soorten: DUO_FILTERS.find(f => f.key === filter).soorten, limit: 12 }),
    [wears, byId, filter]
  )
  const hasDoll = !!layers?.get(BASE_ID)
  const its = ids => ids.map(id => byId.get(id)).filter(Boolean)

  return (
    <div className="space-y-4">
      <div className="card mx-4 p-4">
        <div className="font-display text-xl leading-tight">Vaste outfits</div>
        <div className="text-xs text-muted mt-0.5 mb-3">Precies dezelfde stukken, vaker dan één keer</div>
        <div className="grid grid-cols-2 gap-2.5">
          {outfits.map(o => (
            <button key={o.itemIds.join()} className="text-left rounded-2xl p-2" style={{ background: 'var(--color-surface-2)' }}
              onClick={() => setOpen({ items: its(o.itemIds), title: `${o.count}× gedragen`, subtitle: `laatst ${agoLabel(o.datums[0], today)}`, datums: o.datums })}>
              <div className="flex justify-center h-[150px] items-center">
                {hasDoll && its(o.itemIds).filter(it => layers.get(it.id)).length * 2 >= o.itemIds.length
                  ? <OutfitDoll items={its(o.itemIds)} layers={layers} height={150} />
                  : <div className="flex flex-wrap gap-1 justify-center">{its(o.itemIds).map(it => <ItemThumb key={it.id} item={it} url={photoUrls.get(it.id)} size={40} />)}</div>}
              </div>
              <div className="text-xs font-semibold mt-1">{o.count}×</div>
              <div className="text-[11px] text-muted leading-tight line-clamp-2">{its(o.itemIds).map(i => i.naam).join(', ')}</div>
            </button>
          ))}
        </div>
        {outfits.length === 0 && <div className="text-sm text-muted">Nog geen outfit vaker dan één keer gedragen.</div>}
      </div>

      <div className="card mx-4 p-4">
        <div className="font-display text-xl leading-tight">Vaste duo's</div>
        <div className="text-xs text-muted mt-0.5 mb-3">Welke stukken je het vaakst samen draagt</div>
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none -mx-4 px-4 mb-3">
          {DUO_FILTERS.map(f => <Chip key={f.key} active={filter === f.key} onClick={() => setFilter(f.key)}>{f.label}</Chip>)}
        </div>
        {duos.map(d => {
          const [a, b] = its(d.itemIds)
          if (!a || !b) return null
          return (
            <button key={d.itemIds.join()} className="w-full flex items-center gap-2.5 py-2 text-left"
              onClick={() => setOpen({ items: [a, b], title: `${d.count}× samen`, subtitle: `laatst ${agoLabel(d.laatst, today)}` })}>
              <div className="flex -space-x-2 shrink-0">
                <ItemThumb item={a} url={photoUrls.get(a.id)} size={38} rounded="rounded-xl" className="ring-2 ring-[var(--color-surface)]" />
                <ItemThumb item={b} url={photoUrls.get(b.id)} size={38} rounded="rounded-xl" className="ring-2 ring-[var(--color-surface)]" />
              </div>
              <div className="flex-1 min-w-0 text-sm leading-tight">
                <div className="truncate">{a.naam}</div>
                <div className="truncate text-muted">+ {b.naam}</div>
              </div>
              <span className="text-sm font-semibold tabular-nums">{d.count}×</span>
            </button>
          )
        })}
      </div>

      <OutfitSheet open={!!open} onClose={() => setOpen(null)} title={open?.title} subtitle={open?.subtitle}
        items={open?.items ?? []} layers={layers} photoUrls={photoUrls} datums={open?.datums} />
    </div>
  )
}
