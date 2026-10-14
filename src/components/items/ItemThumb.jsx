import { GarmentIcon } from '../icons/GarmentIcon'
import { COLOUR_BY_KEY } from '../../utils/colors'

const MULTI = '#C9B8A6'

/** Foto van het stuk, of anders een illustratie in de kleur van het stuk. */
export function ItemThumb({ item, url, size = 44, rounded = 'rounded-xl', className = '' }) {
  const style = { width: size, height: size, minWidth: size }
  if (url) {
    return (
      <div className={`${rounded} overflow-hidden flex items-center justify-center ${className}`} style={{ ...style, background: 'var(--color-surface-2)' }}>
        <img src={url} alt="" className="w-full h-full object-contain" draggable={false} />
      </div>
    )
  }
  const kleur = item?.kleur === 'multi' ? MULTI : COLOUR_BY_KEY[item?.kleur]?.hex
  return (
    <div className={`${rounded} flex items-center justify-center ${className}`} style={{ ...style, background: 'var(--color-surface-2)' }}>
      <GarmentIcon categorie={item?.categorie} fill={kleur} size={Math.round(size * 0.72)} />
    </div>
  )
}
