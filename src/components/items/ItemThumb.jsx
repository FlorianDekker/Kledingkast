import { CATEGORY_BY_KEY } from '../../constants/categories'
import { COLOUR_BY_KEY } from '../../utils/colors'

/** Foto van het stuk, of anders een gekleurd rondje met het categorie-icoon. */
export function ItemThumb({ item, url, size = 44, rounded = 'rounded-xl', className = '' }) {
  const style = { width: size, height: size, minWidth: size }
  if (url) {
    return <img src={url} alt="" className={`${rounded} object-cover ${className}`} style={style} draggable={false} />
  }
  const hex = COLOUR_BY_KEY[item?.kleur]?.hex
  return (
    <div
      className={`${rounded} flex items-center justify-center ${className}`}
      style={{
        ...style,
        background: hex ? `${hex}33` : 'var(--color-surface-2)',
        boxShadow: hex ? `inset 0 0 0 2px ${hex}55` : undefined,
        fontSize: size * 0.48,
      }}
    >
      {CATEGORY_BY_KEY[item?.categorie]?.emoji ?? '👕'}
    </div>
  )
}
