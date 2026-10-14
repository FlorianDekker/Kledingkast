import { useState } from 'react'
import { Sheet } from '../ui/Sheet'
import { ItemThumb } from '../items/ItemThumb'
import { ItemSheet } from '../items/ItemSheet'
import { euro, euro0, agoLabel } from '../../utils/format'
import { todayStr } from '../../utils/stats'

/**
 * Lijst met stukken (rows uit allItemStats) in een paneel; tik opent het stuk.
 * `info(row)` bepaalt de regel onder de naam, `right(row)` het getal rechts.
 */
export function ItemListSheet({ open, onClose, title, subtitle, rows, photoUrls, info, right }) {
  const [openId, setOpenId] = useState(null)
  const today = todayStr()
  const sub = info ?? (r => `${r.count}× gedragen${r.cpw != null ? ` · ${euro(r.cpw)} per keer` : ''} · ${agoLabel(r.lastWorn, today)}`)
  const rechts = right ?? (r => (r.item.prijs != null ? euro0(r.item.prijs) : ''))
  return (
    <>
      <Sheet open={open} onClose={onClose} title={title} subtitle={subtitle} maxHeight="88vh">
        <div className="px-4 py-2">
          {rows.map(r => (
            <button key={r.item.id} onClick={() => setOpenId(r.item.id)} className="w-full flex items-center gap-3 py-2 text-left">
              <ItemThumb item={r.item} url={photoUrls?.get(r.item.id)} size={40} rounded="rounded-xl" />
              <div className="flex-1 min-w-0">
                <div className="text-sm truncate" style={{ opacity: r.item.uitKast ? 0.55 : 1 }}>{r.item.naam}</div>
                <div className="text-[11px] text-muted truncate">{sub(r)}{r.item.uitKast ? ' · uit de kast' : ''}</div>
              </div>
              <span className="text-sm tabular-nums shrink-0">{rechts(r)}</span>
            </button>
          ))}
          {rows.length === 0 && <div className="py-8 text-center text-sm text-muted">Geen stukken</div>}
        </div>
      </Sheet>
      <ItemSheet open={!!openId} itemId={openId} onClose={() => setOpenId(null)} />
    </>
  )
}
