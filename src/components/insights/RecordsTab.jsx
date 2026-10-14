import { useMemo, useState } from 'react'
import { ItemSheet } from '../items/ItemSheet'
import { ItemThumb } from '../items/ItemThumb'
import { ItemListSheet } from './ItemListSheet'
import { records } from '../../utils/insights'
import { wearIndex } from '../../utils/stats'

/** Records à la FinanceTracker: elke kaart is aantikbaar. */
export function RecordsTab({ rows, wears, photoUrls, today, onMaand }) {
  const idx = useMemo(() => wearIndex(wears), [wears])
  const lijst = useMemo(() => records(rows, wears, idx, today), [rows, wears, idx, today])
  const byId = useMemo(() => new Map(rows.map(r => [r.item.id, r])), [rows])
  const [openId, setOpenId] = useState(null)
  const [lijstOpen, setLijstOpen] = useState(null)

  const tik = r => {
    if (r.itemId) setOpenId(r.itemId)
    else if (r.maand) onMaand?.(r.maand)
    else if (r.lijst) setLijstOpen({ title: r.titel, rows: r.lijst.map(id => byId.get(id)).filter(Boolean) })
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-2.5 px-4">
        {lijst.map(r => {
          const item = r.itemId ? byId.get(r.itemId)?.item : null
          const klikbaar = r.itemId || r.maand || r.lijst?.length
          return (
            <button key={r.key} onClick={() => klikbaar && tik(r)} className="card p-3.5 text-left flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <div className="eyebrow">{r.titel}</div>
                {item && <ItemThumb item={item} url={photoUrls.get(item.id)} size={30} rounded="rounded-lg" />}
              </div>
              <div className="font-display text-[26px] leading-tight tabular-nums mt-1">{r.waarde}</div>
              <div className="text-[11px] text-muted leading-snug line-clamp-2 mt-0.5">{r.sub}</div>
            </button>
          )
        })}
      </div>
      <ItemSheet open={!!openId} itemId={openId} onClose={() => setOpenId(null)} />
      <ItemListSheet open={!!lijstOpen} onClose={() => setLijstOpen(null)} title={lijstOpen?.title} rows={lijstOpen?.rows ?? []} photoUrls={photoUrls} />
    </>
  )
}
