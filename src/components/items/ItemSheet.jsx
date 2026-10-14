import { useEffect, useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Sheet } from '../ui/Sheet'
import { ItemThumb } from './ItemThumb'
import { ItemPickerSheet } from './ItemPickerSheet'
import { Chip } from '../ui/Chip'
import { DollSection } from './DollSection'
import { db } from '../../db/db'
import { saveItem, deleteItem, mergeItems, setPhoto, removePhoto } from '../../db/actions'
import { CATEGORIES } from '../../constants/categories'
import { COLOURS, guessColour } from '../../utils/colors'
import { itemStats, itemPerMonth, todayStr, addDays } from '../../utils/stats'
import { euro, dateLabel, agoLabel, monthLabel, parseAmount } from '../../utils/format'
import { resizeImage } from '../../utils/image'
import { takeFile } from '../../utils/fileInput'
import { useItems, usePhotoUrls, useSetting } from '../../hooks/useData'

const inputCls = 'w-full px-3 py-2.5 rounded-xl text-sm outline-none'
const inputStyle = { background: 'var(--color-surface-2)', color: 'var(--color-text)' }

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-semibold uppercase tracking-wider text-muted mb-1">{label}</span>
      {children}
    </label>
  )
}

function toForm(item) {
  return {
    naam: item?.naam ?? '',
    categorie: item?.categorie ?? 'broek',
    prijs: item?.prijs != null ? String(item.prijs).replace('.', ',') : '',
    aankoopdatum: item?.aankoopdatum ?? '',
    kleur: item?.kleur ?? null,
    uitKast: !!item?.uitKast,
    uitKastDatum: item?.uitKastDatum ?? '',
    verkoopprijs: item?.verkoopprijs != null ? String(item.verkoopprijs).replace('.', ',') : '',
    notitie: item?.notitie ?? '',
  }
}

/**
 * Detail én bewerken van één kledingstuk. Zonder `itemId` maak je een nieuw
 * stuk aan (`preset` vult velden voor, bijv. de categorie).
 */
export function ItemSheet({ open, onClose, itemId = null, preset = null, onSaved }) {
  if (!open) return null
  return <ItemSheetInner onClose={onClose} itemId={itemId} preset={preset} onSaved={onSaved} />
}

function ItemSheetInner({ onClose, itemId, preset, onSaved }) {
  const item = useLiveQuery(() => (itemId ? db.items.get(itemId) : null), [itemId], undefined)
  const dates = useLiveQuery(
    async () => (itemId ? (await db.wears.where('itemIds').equals(itemId).toArray()).map(w => w.datum).sort() : []),
    [itemId],
    []
  )
  const photo = useLiveQuery(() => (itemId ? db.photos.get(itemId) : null), [itemId], null)
  const allItems = useItems()
  const photoUrls = usePhotoUrls()
  const target = useSetting('doelCpw', 1)

  const [form, setForm] = useState(() => toForm(preset))
  const [loadedFor, setLoadedFor] = useState(null)
  const [newPhoto, setNewPhoto] = useState(null)
  const [error, setError] = useState(null)
  const [merging, setMerging] = useState(false)
  const kleurAangeraakt = useRef(false)
  const fileRef = useRef(null)

  // Formulier vullen zodra het stuk uit IndexedDB binnen is
  if (item && loadedFor !== item.id) {
    setLoadedFor(item.id)
    setForm(toForm(item))
  }

  const newPhotoUrl = useMemo(() => (newPhoto ? URL.createObjectURL(newPhoto) : null), [newPhoto])
  const photoUrl = useMemo(() => (photo?.blob ? URL.createObjectURL(photo.blob) : null), [photo])
  useEffect(() => () => { if (newPhotoUrl) URL.revokeObjectURL(newPhotoUrl) }, [newPhotoUrl])
  useEffect(() => () => { if (photoUrl) URL.revokeObjectURL(photoUrl) }, [photoUrl])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const isNew = !itemId
  const today = todayStr()
  const stats = item ? itemStats(item, dates, today) : null
  const perMonth = dates.length ? itemPerMonth(dates, addDays(today, -365 * 2).slice(0, 7), today.slice(0, 7)) : []
  const maxMonth = Math.max(1, ...perMonth.map(m => m.count))

  async function pickPhoto(e) {
    try {
      const file = await takeFile(e)
      if (!file) return
      const blob = await resizeImage(file)
      if (isNew) setNewPhoto(blob)
      else await setPhoto(itemId, blob)
    } catch (err) {
      setError(err.message)
    }
  }

  async function save() {
    setError(null)
    try {
      const saved = await saveItem({
        ...(item ?? {}),
        naam: form.naam,
        categorie: form.categorie,
        prijs: parseAmount(form.prijs),
        aankoopdatum: form.aankoopdatum || null,
        kleur: form.kleur,
        uitKast: form.uitKast,
        uitKastDatum: form.uitKast ? form.uitKastDatum || today : null,
        verkoopprijs: form.uitKast ? parseAmount(form.verkoopprijs) : null,
        notitie: form.notitie,
      })
      if (newPhoto) await setPhoto(saved.id, newPhoto)
      onSaved?.(saved)
      onClose()
    } catch (err) {
      setError(err.message)
    }
  }

  async function remove() {
    const n = dates.length
    const msg = n
      ? `"${item.naam}" verwijderen? Het verdwijnt ook uit ${n} gelogde outfit${n === 1 ? '' : 's'}. Weg uit je kast? Gebruik dan liever "Uit de kast".`
      : `"${item.naam}" verwijderen?`
    if (!window.confirm(msg)) return
    await deleteItem(itemId)
    onClose()
  }

  async function mergeInto(target) {
    if (!window.confirm(`"${item.naam}" samenvoegen met "${target.naam}"? Alle ${dates.length} keer gedragen gaan naar "${target.naam}" en dit stuk verdwijnt.`)) return
    await mergeItems(itemId, target.id)
    setMerging(false)
    onClose()
  }

  if (itemId && item === undefined) return null
  if (itemId && item === null) {
    return <Sheet open onClose={onClose} title="Niet gevonden"><div className="p-6 text-sm text-muted">Dit stuk bestaat niet meer.</div></Sheet>
  }

  const shownPhoto = newPhotoUrl ?? photoUrl

  return (
    <>
      <Sheet
        open
        onClose={onClose}
        title={isNew ? 'Nieuw kledingstuk' : item.naam}
        subtitle={isNew ? null : CATEGORIES.find(c => c.key === item.categorie)?.label}
        maxHeight="92vh"
        footer={
          <div>
            {error && <div className="text-xs text-red mb-2">{error}</div>}
            <button onClick={save} className="btn-accent w-full py-3 text-sm">{isNew ? 'Toevoegen' : 'Opslaan'}</button>
          </div>
        }
      >
        <div className="px-4 pt-4 space-y-5">
          <div className="flex items-center gap-4">
            <button onClick={() => fileRef.current?.click()} aria-label="Foto kiezen" className="shrink-0">
              <ItemThumb item={{ ...item, ...form }} url={shownPhoto} size={96} rounded="rounded-2xl" />
            </button>
            <div className="flex flex-col gap-2 items-start">
              <button onClick={() => fileRef.current?.click()} className="text-sm font-semibold" style={{ color: 'var(--color-accent)' }}>
                {shownPhoto ? 'Andere foto' : 'Foto toevoegen'}
              </button>
              {shownPhoto && (
                <button
                  onClick={() => (isNew ? setNewPhoto(null) : removePhoto(itemId))}
                  className="text-sm text-muted"
                >
                  Foto weghalen
                </button>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickPhoto} />
          </div>

          {!isNew && <DollSection item={item} />}

          {stats && (
            <div className="grid grid-cols-3 gap-2">
              <Tile label="Gedragen" value={`${stats.count}×`} />
              <Tile label="Per keer" value={stats.cpw != null ? euro(stats.cpw) : '–'} />
              <Tile label="Laatst" value={agoLabel(stats.lastWorn, today)} small />
            </div>
          )}
          {stats && stats.cpw != null && stats.cpw > target && (
            <div className="text-xs text-muted -mt-3">
              Nog {stats.toTarget(target)} keer dragen tot {euro(target)} per keer.
            </div>
          )}

          {perMonth.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted mb-2">Gedragen per maand, laatste 2 jaar</div>
              <div className="flex items-end gap-[2px] h-16">
                {perMonth.map(m => (
                  <div key={m.month} className="flex-1 rounded-t-sm" title={`${monthLabel(m.month)}: ${m.count}×`}
                    style={{ height: `${Math.max(m.count ? 8 : 2, (m.count / maxMonth) * 100)}%`, background: m.count ? 'var(--color-highlight)' : 'var(--color-surface-2)' }} />
                ))}
              </div>
              <div className="flex justify-between text-[10px] text-muted mt-1">
                <span>{monthLabel(perMonth[0].month)}</span><span>{monthLabel(perMonth[perMonth.length - 1].month)}</span>
              </div>
            </div>
          )}

          <Field label="Naam">
            <input
              className={inputCls} style={inputStyle} value={form.naam}
              onChange={e => {
                set('naam', e.target.value)
                if (isNew && !kleurAangeraakt.current) set('kleur', guessColour(e.target.value))
              }}
              placeholder="Bijv. Dickies 874 zwart"
            />
          </Field>

          <Field label="Soort">
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map(c => (
                <Chip key={c.key} active={form.categorie === c.key} onClick={() => set('categorie', c.key)}>
                  {c.label}
                </Chip>
              ))}
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Prijs (€)">
              <input className={inputCls} style={inputStyle} inputMode="decimal" value={form.prijs} onChange={e => set('prijs', e.target.value)} placeholder="onbekend" />
            </Field>
            <Field label="Gekocht op">
              <input type="date" className={inputCls} style={inputStyle} value={form.aankoopdatum} onChange={e => set('aankoopdatum', e.target.value)} />
            </Field>
          </div>

          <Field label="Kleur">
            <div className="flex flex-wrap gap-2">
              {COLOURS.map(c => (
                <button
                  key={c.key}
                  onClick={() => { kleurAangeraakt.current = true; set('kleur', form.kleur === c.key ? null : c.key) }}
                  aria-label={c.label}
                  title={c.label}
                  className="w-8 h-8 rounded-full"
                  style={{
                    background: c.key === 'multi' ? 'conic-gradient(#ef4444, #facc15, #10b981, #3b82f6, #8b5cf6, #ef4444)' : c.hex,
                    boxShadow: form.kleur === c.key ? '0 0 0 2px var(--color-surface), 0 0 0 4px var(--color-accent)' : 'inset 0 0 0 1px rgba(0,0,0,0.12)',
                  }}
                />
              ))}
            </div>
          </Field>

          <div className="rounded-2xl p-3" style={{ background: 'var(--color-surface-2)' }}>
            <label className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium">Uit de kast</span>
              <input type="checkbox" checked={form.uitKast} onChange={e => set('uitKast', e.target.checked)} className="w-5 h-5 accent-[var(--color-accent)]" />
            </label>
            {form.uitKast && (
              <div className="grid grid-cols-2 gap-3 mt-3">
                <Field label="Sinds">
                  <input type="date" className={inputCls} style={{ ...inputStyle, background: 'var(--color-surface)' }} value={form.uitKastDatum} onChange={e => set('uitKastDatum', e.target.value)} />
                </Field>
                <Field label="Verkocht voor (€)">
                  <input className={inputCls} style={{ ...inputStyle, background: 'var(--color-surface)' }} inputMode="decimal" value={form.verkoopprijs} onChange={e => set('verkoopprijs', e.target.value)} placeholder="0" />
                </Field>
              </div>
            )}
          </div>

          <Field label="Notitie">
            <textarea className={inputCls} style={inputStyle} rows={2} value={form.notitie} onChange={e => set('notitie', e.target.value)} />
          </Field>

          {!isNew && dates.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted mb-1">Laatst gedragen</div>
              <div className="text-sm leading-6">
                {dates.slice(-8).reverse().map(d => dateLabel(d)).join(' · ')}
              </div>
              <div className="text-xs text-muted mt-1">Eerste keer: {dateLabel(dates[0])}</div>
            </div>
          )}

          {!isNew && (
            <div className="flex gap-2 pb-2">
              <button onClick={() => setMerging(true)} className="flex-1 py-2.5 rounded-xl text-sm font-medium" style={{ background: 'var(--color-surface-2)' }}>
                Samenvoegen met…
              </button>
              <button onClick={remove} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-red" style={{ background: 'var(--color-red-dim)' }}>
                Verwijderen
              </button>
            </div>
          )}
        </div>
      </Sheet>

      <ItemPickerSheet
        open={merging}
        onClose={() => setMerging(false)}
        items={allItems}
        photoUrls={photoUrls}
        excludeId={itemId}
        preferCategory={item?.categorie}
        title="Samenvoegen met"
        subtitle={`"${item?.naam}" gaat op in het stuk dat je kiest`}
        onPick={mergeInto}
      />
    </>
  )
}

function Tile({ label, value, small = false }) {
  return (
    <div className="rounded-2xl px-2 py-2.5 text-center" style={{ background: 'var(--color-surface-2)' }}>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted">{label}</div>
      <div className={`${small ? 'text-sm' : 'text-lg'} font-bold tabular-nums mt-0.5`}>{value}</div>
    </div>
  )
}
