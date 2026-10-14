import { useCallback, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageWrapper } from '../components/layout/PageWrapper'
import { ItemThumb } from '../components/items/ItemThumb'
import { ItemSheet } from '../components/items/ItemSheet'
import { OutfitDoll } from '../components/items/OutfitDoll'
import { useLayers } from '../hooks/useLayers'
import { BASE_ID } from '../db/db'
import { useItemStats, usePhotoUrls } from '../hooks/useData'
import { saveWear, deleteWear } from '../db/actions'
import { CATEGORIES } from '../constants/categories'
import { recentCounts, suggestions, todayStr, addDays } from '../utils/stats'
import { dateLabel, agoLabel } from '../utils/format'

export function TodayPage() {
  const { items, wears, rows } = useItemStats()
  const photoUrls = usePhotoUrls()
  const layers = useLayers()
  const hasDoll = !!layers?.get(BASE_ID)
  // Is het grote voorbeeld in beeld? Zo niet, dan een kleine pop naast de opslaanknop.
  const [previewVisible, setPreviewVisible] = useState(false)
  const observer = useRef(null)
  const previewRef = useCallback(node => {
    observer.current?.disconnect()
    observer.current = null
    if (!node) { setPreviewVisible(false); return }
    observer.current = new IntersectionObserver(([e]) => setPreviewVisible(e.isIntersecting), { threshold: 0.2 })
    observer.current.observe(node)
  }, [])
  const today = todayStr()
  const [datum, setDatum] = useState(today)
  const [selected, setSelected] = useState(() => new Set())
  const [editingId, setEditingId] = useState(null)
  const [newFor, setNewFor] = useState(null) // categorie voor "nieuw stuk"
  const [openItem, setOpenItem] = useState(null)
  const [flash, setFlash] = useState(null)

  const byId = useMemo(() => new Map((items ?? []).map(i => [i.id, i])), [items])
  const totals = useMemo(() => new Map((rows ?? []).map(r => [r.item.id, r.count])), [rows])
  const recent = useMemo(() => (wears ? recentCounts(wears, today) : new Map()), [wears, today])

  const perCategory = useMemo(() => {
    const score = it => [recent.get(it.id) ?? 0, totals.get(it.id) ?? 0]
    return CATEGORIES.map(c => ({
      ...c,
      items: (items ?? [])
        .filter(i => i.categorie === c.key && (!i.uitKast || selected.has(i.id)))
        .sort((a, b) => {
          const [ra, ta] = score(a)
          const [rb, tb] = score(b)
          return rb - ra || tb - ta || a.naam.localeCompare(b.naam)
        }),
    }))
  }, [items, recent, totals, selected])

  const dayWears = useMemo(
    () => (wears ?? []).filter(w => w.datum === datum && w.itemIds?.length).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [wears, datum]
  )
  const lastOutfit = useMemo(() => {
    const prev = (wears ?? [])
      .filter(w => w.itemIds?.length && w.id !== editingId && w.datum <= datum)
      .sort((a, b) => b.datum.localeCompare(a.datum) || b.createdAt.localeCompare(a.createdAt))
    return prev[0] ?? null
  }, [wears, datum, editingId])
  const chosen = useMemo(() => [...selected].map(id => byId.get(id)).filter(Boolean), [selected, byId])
  const tips = useMemo(() => (rows ? suggestions(rows, { today, limit: 6 }).vergeten : []), [rows, today])

  if (items === null || wears === null) return <PageWrapper title="Vandaag" />

  if (items.length === 0) {
    return (
      <PageWrapper title="Vandaag">
        <div className="card mx-4 p-6 text-center">
          <div className="text-4xl mb-2">👕</div>
          <div className="font-semibold mb-1">Je kast is nog leeg</div>
          <p className="text-sm text-muted mb-4">Importeer je Excel van het Google Form, of begin met je eerste kledingstuk.</p>
          <Link to="/meer" className="btn-accent block py-3 text-sm mb-2">Excel importeren</Link>
          <button onClick={() => setNewFor('broek')} className="text-sm font-medium" style={{ color: 'var(--color-accent)' }}>Zelf een stuk toevoegen</button>
        </div>
        <ItemSheet open={!!newFor} preset={{ categorie: newFor }} onClose={() => setNewFor(null)} />
      </PageWrapper>
    )
  }

  const toggle = id => setSelected(s => {
    const n = new Set(s)
    if (n.has(id)) n.delete(id); else n.add(id)
    return n
  })

  const changeDay = d => {
    if (d > today) return
    setDatum(d)
    setEditingId(null)
    setSelected(new Set())
  }

  async function save() {
    if (!selected.size) return
    await saveWear({ id: editingId ?? undefined, datum, itemIds: [...selected] })
    setFlash(editingId ? 'Outfit bijgewerkt' : 'Outfit opgeslagen')
    setTimeout(() => setFlash(null), 1800)
    setSelected(new Set())
    setEditingId(null)
  }

  function edit(w) {
    setEditingId(w.id)
    setSelected(new Set(w.itemIds))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function remove(w) {
    if (!window.confirm('Deze outfit verwijderen?')) return
    await deleteWear(w.id)
    if (editingId === w.id) { setEditingId(null); setSelected(new Set()) }
  }

  const dayTitle = datum === today ? 'Vandaag' : datum === addDays(today, -1) ? 'Gisteren' : dateLabel(datum)

  return (
    <PageWrapper>
      <div className="safe-top px-4 pt-4 pb-2 flex items-center gap-2">
        <button onClick={() => changeDay(addDays(datum, -1))} className="w-9 h-9 rounded-full text-lg" style={{ background: 'var(--color-surface)' }} aria-label="Vorige dag">‹</button>
        <label className="flex-1 text-center relative">
          <div className="text-xl font-bold">{dayTitle}</div>
          <div className="text-xs text-muted">{dateLabel(datum)}</div>
          <input type="date" value={datum} max={today} onChange={e => e.target.value && changeDay(e.target.value)}
            className="absolute inset-0 opacity-0" aria-label="Kies datum" />
        </label>
        <button onClick={() => changeDay(addDays(datum, 1))} disabled={datum >= today}
          className="w-9 h-9 rounded-full text-lg disabled:opacity-30" style={{ background: 'var(--color-surface)' }} aria-label="Volgende dag">›</button>
      </div>

      {dayWears.length > 0 && (
        <div className="px-4 space-y-2 mb-3">
          {dayWears.map(w => (
            <div key={w.id} className="card p-3" style={editingId === w.id ? { boxShadow: '0 0 0 2px var(--color-accent)' } : undefined}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                  {w.bron === 'form' ? 'Gelogd via Form' : 'Gelogd'}{editingId === w.id ? ' · aan het bewerken' : ''}
                </span>
                <div className="flex gap-3 text-xs font-medium">
                  <button onClick={() => edit(w)} style={{ color: 'var(--color-accent)' }}>Bewerk</button>
                  <button onClick={() => remove(w)} className="text-red">Verwijder</button>
                </div>
              </div>
              <div className="flex gap-3">
              {hasDoll && w.itemIds.some(id => layers.get(id)) && (
                <OutfitDoll items={w.itemIds.map(id => byId.get(id)).filter(Boolean)} layers={layers} height={170} />
              )}
              <div className="flex flex-wrap gap-2 content-start">
                {w.itemIds.map(id => byId.get(id)).filter(Boolean).map(it => (
                  <button key={it.id} onClick={() => setOpenItem(it.id)} className="flex items-center gap-1.5 pr-2.5 rounded-full" style={{ background: 'var(--color-surface-2)' }}>
                    <ItemThumb item={it} url={photoUrls.get(it.id)} size={28} rounded="rounded-full" />
                    <span className="text-xs">{it.naam}</span>
                  </button>
                ))}
              </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="px-4 mb-2 flex items-center justify-between">
        <div className="text-sm font-semibold">{editingId ? 'Outfit bewerken' : dayWears.length ? 'Nog een outfit' : 'Wat heb je aan?'}</div>
        {lastOutfit && !editingId && (
          <button onClick={() => setSelected(new Set(lastOutfit.itemIds.filter(id => byId.get(id) && !byId.get(id).uitKast)))}
            className="text-xs font-medium px-3 py-1.5 rounded-full" style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent)' }}>
            ↺ Zelfde als {lastOutfit.datum === datum ? 'net' : agoLabel(lastOutfit.datum, datum).replace(' geleden', ' terug')}
          </button>
        )}
      </div>

      {hasDoll && selected.size > 0 && (() => {
        const zonder = chosen.filter(it => !layers.get(it.id))
        return (
          <div ref={previewRef} className="card mx-4 mb-3 p-3 flex gap-3 items-center animate-fade-in">
            <OutfitDoll items={chosen} layers={layers} height={280} />
            <div className="flex-1 min-w-0 text-xs text-muted space-y-1">
              {chosen.filter(it => layers.get(it.id)).map(it => <div key={it.id} className="truncate" style={{ color: 'var(--color-text)' }}>{it.naam}</div>)}
              {zonder.length > 0 && (
                <div className="pt-2">
                  <div className="font-semibold uppercase tracking-wider text-[10px]">Nog niet op de pop</div>
                  {zonder.map(it => <div key={it.id} className="truncate">{it.naam}</div>)}
                </div>
              )}
            </div>
          </div>
        )
      })()}

      <div className="space-y-3 pb-28">
        {perCategory.map(c => (
          <div key={c.key}>
            <div className="px-4 text-[11px] font-semibold uppercase tracking-wider text-muted mb-1.5">{c.emoji} {c.label}</div>
            <div className="flex gap-2 overflow-x-auto scrollbar-none px-4 pb-1">
              {c.items.map(it => {
                const on = selected.has(it.id)
                return (
                  <button key={it.id} onClick={() => toggle(it.id)} className="shrink-0 w-[76px] text-center">
                    <div className="relative mx-auto w-fit rounded-2xl" style={{ boxShadow: on ? '0 0 0 3px var(--color-accent)' : undefined }}>
                      <ItemThumb item={it} url={photoUrls.get(it.id)} size={64} rounded="rounded-2xl" />
                      {on && (
                        <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full text-[11px] text-white flex items-center justify-center"
                          style={{ background: 'var(--color-accent)' }}>✓</span>
                      )}
                    </div>
                    <div className={`text-[11px] leading-tight mt-1.5 line-clamp-2 ${on ? 'font-semibold' : ''}`}>{it.naam}</div>
                  </button>
                )
              })}
              <button onClick={() => setNewFor(c.key)} className="shrink-0 w-[76px] text-center">
                <div className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center text-2xl text-muted"
                  style={{ border: '2px dashed var(--color-text-dim)' }}>+</div>
                <div className="text-[11px] mt-1.5 text-muted">Nieuw</div>
              </button>
            </div>
          </div>
        ))}

        {tips.length > 0 && !editingId && (
          <div className="card mx-4 p-3">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted mb-2">Al lang niet aangehad</div>
            <div className="flex flex-wrap gap-2">
              {tips.map(r => (
                <button key={r.item.id} onClick={() => toggle(r.item.id)}
                  className="flex items-center gap-1.5 pr-2.5 rounded-full text-left"
                  style={{ background: selected.has(r.item.id) ? 'var(--color-accent-light)' : 'var(--color-surface-2)' }}>
                  <ItemThumb item={r.item} url={photoUrls.get(r.item.id)} size={28} rounded="rounded-full" />
                  <span className="text-xs">{r.item.naam} <span className="text-muted">· {agoLabel(r.lastWorn, today)}</span></span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="fixed left-0 right-0 z-30 px-4" style={{ bottom: 'calc(env(safe-area-inset-bottom) + 68px)' }}>
        {flash && <div className="text-center text-xs font-medium mb-2 animate-fade-in" style={{ color: 'var(--color-green)' }}>✓ {flash}</div>}
        {(selected.size > 0 || editingId) && (
          <div className="flex gap-2 items-end animate-fade-in-up">
            {hasDoll && selected.size > 0 && !previewVisible && (
              <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Naar het voorbeeld"
                className="rounded-2xl px-1 pt-1 shrink-0" style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}>
                <OutfitDoll items={chosen} layers={layers} height={104} />
              </button>
            )}
            {editingId && (
              <button onClick={() => { setEditingId(null); setSelected(new Set()) }} className="px-4 py-3 rounded-2xl text-sm font-medium" style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}>
                Annuleer
              </button>
            )}
            <button onClick={save} disabled={!selected.size} className="btn-accent flex-1 py-3.5 text-sm disabled:opacity-50">
              {editingId ? 'Wijziging opslaan' : `Outfit opslaan · ${selected.size} ${selected.size === 1 ? 'stuk' : 'stukken'}`}
            </button>
          </div>
        )}
      </div>

      <ItemSheet
        open={!!newFor}
        preset={{ categorie: newFor }}
        onClose={() => setNewFor(null)}
        onSaved={it => setSelected(s => new Set(s).add(it.id))}
      />
      <ItemSheet open={!!openItem} itemId={openItem} onClose={() => setOpenItem(null)} />
    </PageWrapper>
  )
}
