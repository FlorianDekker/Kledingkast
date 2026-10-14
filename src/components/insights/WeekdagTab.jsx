import { useMemo, useState } from 'react'
import { ItemSheet } from '../items/ItemSheet'
import { ItemThumb } from '../items/ItemThumb'
import { weekdays } from '../../utils/insights'

const NAMEN = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag']

/** Wat draag je op welke dag? "Typisch" = vaker dan je dat stuk gemiddeld draagt. */
export function WeekdagTab({ items, wears, photoUrls }) {
  const byId = useMemo(() => new Map(items.map(it => [it.id, it])), [items])
  const dagen = useMemo(() => weekdays(wears), [wears])
  const max = Math.max(1, ...dagen.map(d => d.outfits))
  const [openId, setOpenId] = useState(null)

  return (
    <div className="space-y-2.5">
      {dagen.map(d => {
        const lijst = (d.typisch.length ? d.typisch : d.meest).map(x => ({ ...x, item: byId.get(x.itemId) })).filter(x => x.item)
        return (
          <div key={d.dag} className="card mx-4 p-3.5">
            <div className="flex items-baseline justify-between mb-1.5">
              <div className="font-display text-lg">{NAMEN[d.dag]}</div>
              <div className="text-xs text-muted tabular-nums">{d.outfits} outfits</div>
            </div>
            <div className="h-1.5 rounded-full mb-2.5" style={{ background: 'var(--color-surface-2)' }}>
              <div className="h-full rounded-full" style={{ width: `${(d.outfits / max) * 100}%`, background: 'var(--color-highlight)' }} />
            </div>
            <div className="eyebrow mb-1">{d.typisch.length ? 'Typisch voor deze dag' : 'Meest gedragen'}</div>
            <div className="flex flex-wrap gap-1.5">
              {lijst.map(x => (
                <button key={x.itemId} onClick={() => setOpenId(x.itemId)} className="flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full text-xs"
                  style={{ background: 'var(--color-surface-2)' }}>
                  <ItemThumb item={x.item} url={photoUrls.get(x.itemId)} size={22} rounded="rounded-full" />
                  <span className="max-w-[9rem] truncate">{x.item.naam}</span>
                  {x.lift && <span className="text-muted">{x.lift.toFixed(1).replace('.', ',')}×</span>}
                </button>
              ))}
              {lijst.length === 0 && <span className="text-xs text-muted">Nog te weinig gelogd</span>}
            </div>
          </div>
        )
      })}
      <div className="text-[11px] text-muted px-5">"2,0×" betekent: op deze dag draag je dit stuk twee keer zo vaak als gemiddeld.</div>
      <ItemSheet open={!!openId} itemId={openId} onClose={() => setOpenId(null)} />
    </div>
  )
}
