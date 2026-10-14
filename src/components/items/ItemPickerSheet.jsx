import { useMemo, useState } from 'react'
import { Sheet } from '../ui/Sheet'
import { ItemThumb } from './ItemThumb'
import { CATEGORIES } from '../../constants/categories'

/**
 * Kies een kledingstuk uit een lijst (samenvoegen, koppelen bij import).
 * `preferCategory` zet die categorie bovenaan.
 */
export function ItemPickerSheet({ open, onClose, items, photoUrls, onPick, title = 'Kies een kledingstuk', subtitle, preferCategory, excludeId }) {
  const [q, setQ] = useState('')
  const groups = useMemo(() => {
    const term = q.trim().toLowerCase()
    const list = (items ?? [])
      .filter(i => i.id !== excludeId)
      .filter(i => !term || i.naam.toLowerCase().includes(term))
    const order = [...CATEGORIES].sort((a, b) => (a.key === preferCategory ? -1 : b.key === preferCategory ? 1 : 0))
    return order
      .map(c => ({ ...c, items: list.filter(i => i.categorie === c.key).sort((a, b) => a.naam.localeCompare(b.naam)) }))
      .filter(g => g.items.length)
  }, [items, q, preferCategory, excludeId])

  return (
    <Sheet open={open} onClose={onClose} title={title} subtitle={subtitle} maxHeight="90vh">
      <div className="px-4 pt-3 pb-2">
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Zoek op naam"
          className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
          style={{ background: 'var(--color-surface-2)', color: 'var(--color-text)' }}
        />
      </div>
      {groups.map(g => (
        <div key={g.key} className="px-4 pb-2">
          <div className="eyebrow mt-3 mb-1">{g.label}</div>
          {g.items.map(it => (
            <button
              key={it.id}
              onClick={() => onPick(it)}
              className="w-full flex items-center gap-3 py-2 text-left"
            >
              <ItemThumb item={it} url={photoUrls?.get(it.id)} size={36} />
              <span className="text-sm flex-1 min-w-0 truncate">{it.naam}</span>
              {it.uitKast && <span className="text-[10px] text-muted">uit kast</span>}
            </button>
          ))}
        </div>
      ))}
      {groups.length === 0 && <div className="px-4 py-8 text-center text-sm text-muted">Niets gevonden</div>}
    </Sheet>
  )
}
