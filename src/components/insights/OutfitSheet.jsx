import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sheet } from '../ui/Sheet'
import { ItemThumb } from '../items/ItemThumb'
import { ItemSheet } from '../items/ItemSheet'
import { OutfitDoll } from '../items/OutfitDoll'
import { dateLabel } from '../../utils/format'

/**
 * Een outfit (of combinatie) groot op de pop, met de stukken eronder.
 * `datum`: knop "Naar deze dag"; altijd: "Trek dit aan" (vult Vandaag).
 */
export function OutfitSheet({ open, onClose, title, subtitle, items, layers, photoUrls, datum = null, datums = null }) {
  const navigate = useNavigate()
  const [openId, setOpenId] = useState(null)
  if (!open) return null
  const aantrekken = () => navigate(`/?outfit=${items.map(i => i.id).join(',')}`)
  return (
    <>
      <Sheet open onClose={onClose} title={title} subtitle={subtitle} maxHeight="92vh"
        footer={
          <div className="flex gap-2">
            {datum && <button onClick={() => navigate(`/?datum=${datum}`)} className="btn-soft flex-1 py-3 text-sm">Naar deze dag</button>}
            <button onClick={aantrekken} className="btn-accent flex-1 py-3 text-sm">Trek dit aan</button>
          </div>
        }>
        <div className="px-4 pt-3">
          <div className="stage flex justify-center py-3 mb-3">
            {layers?.size
              ? <OutfitDoll items={items} layers={layers} height={300} />
              : <div className="h-[300px]" />}
          </div>
          {items.map(it => (
            <button key={it.id} onClick={() => setOpenId(it.id)} className="w-full flex items-center gap-3 py-1.5 text-left">
              <ItemThumb item={it} url={photoUrls?.get(it.id)} size={36} rounded="rounded-xl" />
              <span className="text-sm flex-1 min-w-0 truncate">{it.naam}</span>
            </button>
          ))}
          {datums?.length > 0 && (
            <div className="mt-3">
              <div className="eyebrow mb-1">Gedragen op</div>
              <div className="text-sm leading-6 text-muted">
                {datums.slice(0, 12).map(d => dateLabel(d)).join(' · ')}{datums.length > 12 ? ` en nog ${datums.length - 12} keer` : ''}
              </div>
            </div>
          )}
        </div>
      </Sheet>
      <ItemSheet open={!!openId} itemId={openId} onClose={() => setOpenId(null)} />
    </>
  )
}
