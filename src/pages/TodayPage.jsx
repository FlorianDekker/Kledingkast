import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ItemSheet } from '../components/items/ItemSheet'
import { ItemThumb } from '../components/items/ItemThumb'
import { OutfitDoll } from '../components/items/OutfitDoll'
import { GarmentIcon } from '../components/icons/GarmentIcon'
import { useItemStats, usePhotoUrls } from '../hooks/useData'
import { useLayers, layerOrder } from '../hooks/useLayers'
import { saveWear, deleteWear } from '../db/actions'
import { BASE_ID } from '../db/db'
import { CATEGORIES } from '../constants/categories'
import { COLOUR_BY_KEY } from '../utils/colors'
import { recentCounts, todayStr, addDays } from '../utils/stats'
import { agoLabel, longDateLabel } from '../utils/format'
import { dressMe } from '../utils/insights'

export function TodayPage() {
  const { items, wears, rows } = useItemStats()
  const photoUrls = usePhotoUrls()
  const layers = useLayers()
  const today = todayStr()
  // Vanuit Inzicht: ?datum=… (naar een dag) of ?outfit=id,id (trek dit aan)
  const [params, setParams] = useSearchParams()
  const [datum, setDatum] = useState(() => {
    const d = params.get('datum')
    return d && /^\d{4}-\d{2}-\d{2}$/.test(d) && d <= today ? d : today
  })
  const [selected, setSelected] = useState(() => new Set((params.get('outfit') ?? '').split(',').filter(Boolean)))
  const [geschud, setGeschud] = useState(() => new Set()) // door "Verras me" gekozen, dus niet vast
  useEffect(() => {
    if (params.has('datum') || params.has('outfit')) setParams({}, { replace: true })
  }, [params, setParams])
  const [editingId, setEditingId] = useState(null)
  const [tab, setTab] = useState(CATEGORIES[0].key)
  const [shown, setShown] = useState(0)
  const [newFor, setNewFor] = useState(null)
  const [openItem, setOpenItem] = useState(null)
  const [flash, setFlash] = useState(null)

  const byId = useMemo(() => new Map((items ?? []).map(i => [i.id, i])), [items])
  const totals = useMemo(() => new Map((rows ?? []).map(r => [r.item.id, r.count])), [rows])
  const recent = useMemo(() => (wears ? recentCounts(wears, today) : new Map()), [wears, today])

  const tabItems = useMemo(() => {
    const score = it => [recent.get(it.id) ?? 0, totals.get(it.id) ?? 0]
    return (items ?? [])
      .filter(i => i.categorie === tab && (!i.uitKast || selected.has(i.id)))
      .sort((a, b) => {
        const [ra, ta] = score(a)
        const [rb, tb] = score(b)
        return rb - ra || tb - ta || a.naam.localeCompare(b.naam)
      })
  }, [items, tab, recent, totals, selected])

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

  if (items === null || wears === null || layers === null) return <div className="min-h-screen" />

  if (items.length === 0) {
    return (
      <div className="safe-top px-5 animate-fade-in">
        <h1 className="font-display text-[34px] leading-none mb-6">Vandaag</h1>
        <div className="stage p-8 text-center">
          <div className="flex justify-center mb-4"><GarmentIcon categorie="trui" fill="#D9D3C8" size={72} /></div>
          <div className="font-display text-2xl mb-2">Je kast is nog leeg</div>
          <p className="text-sm text-muted mb-6">Importeer je Excel van het Google Form, of begin met je eerste kledingstuk.</p>
          <Link to="/meer" className="btn-accent block py-3.5 text-sm mb-3">Excel importeren</Link>
          <button onClick={() => setNewFor('broek')} className="text-sm font-medium">Zelf een stuk toevoegen</button>
        </div>
        <ItemSheet open={!!newFor} preset={{ categorie: newFor }} onClose={() => setNewFor(null)} />
      </div>
    )
  }

  const composing = selected.size > 0 || !!editingId
  const viewIndex = Math.min(shown, Math.max(0, dayWears.length - 1))
  const viewWear = !composing && dayWears.length ? dayWears[viewIndex] : null
  const stageItems = composing ? chosen : viewWear ? viewWear.itemIds.map(id => byId.get(id)).filter(Boolean) : []
  const hasDoll = !!layers.get(BASE_ID)
  const offDoll = stageItems.filter(it => !layers.get(it.id)).length

  const toggle = id => {
    setSelected(s => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })
    // Zelf aangetikt of weggehaald: telt niet meer als geschud
    setGeschud(g => { const n = new Set(g); n.delete(id); return n })
  }

  // Whering's "Dress Me": wat je zelf koos blijft staan, de rest wordt geschud
  function verras() {
    const vast = {}
    for (const it of chosen) if (!geschud.has(it.id) && !vast[it.categorie]) vast[it.categorie] = it.id
    const opPop = new Set([...layers.keys()])
    const ids = dressMe(items, wears, { today, vast, opPop })
    const vasteIds = new Set(Object.values(vast))
    setSelected(new Set(ids))
    setGeschud(new Set(ids.filter(id => !vasteIds.has(id))))
  }

  const changeDay = d => {
    if (d > today) return
    setDatum(d)
    setEditingId(null)
    setSelected(new Set())
    setShown(0)
  }

  const say = text => {
    setFlash(text)
    setTimeout(() => setFlash(null), 1800)
  }

  async function save() {
    if (!selected.size) return
    const wasEditing = !!editingId
    await saveWear({ id: editingId ?? undefined, datum, itemIds: [...selected] })
    setSelected(new Set())
    setGeschud(new Set())
    setEditingId(null)
    setShown(wasEditing ? viewIndex : dayWears.length)
    say(wasEditing ? 'Outfit bijgewerkt' : 'Outfit opgeslagen')
  }

  function edit(w) {
    setEditingId(w.id)
    setSelected(new Set(w.itemIds))
  }

  async function remove(w) {
    if (!window.confirm('Deze outfit verwijderen?')) return
    await deleteWear(w.id)
    setShown(0)
  }

  function cancel() {
    setEditingId(null)
    setSelected(new Set())
    setGeschud(new Set())
  }

  const dayTitle = datum === today ? 'Vandaag' : datum === addDays(today, -1) ? 'Gisteren' : 'Terugblik'
  const badge = editingId ? 'Bewerken' : composing ? 'Nieuwe outfit'
    : viewWear ? (dayWears.length > 1 ? `Gelogd · ${viewIndex + 1} van ${dayWears.length}` : 'Gelogd')
    : 'Nog niets gelogd'

  return (
    <div className="flex flex-col animate-fade-in" style={{ height: '100dvh' }}>
      {/* Kop met datum */}
      <header className="safe-top px-5 pb-3 flex items-end justify-between gap-3 shrink-0">
        <label className="relative min-w-0">
          <div className="eyebrow">{longDateLabel(datum)}</div>
          <h1 className="font-display text-[34px] leading-none m-0">{dayTitle}</h1>
          <input type="date" value={datum} max={today} onChange={e => e.target.value && changeDay(e.target.value)}
            className="absolute inset-0 opacity-0" aria-label="Kies datum" />
        </label>
        <div className="flex gap-1.5 shrink-0">
          <RoundButton onClick={() => changeDay(addDays(datum, -1))} label="Vorige dag">‹</RoundButton>
          <RoundButton onClick={() => changeDay(addDays(datum, 1))} disabled={datum >= today} label="Volgende dag">›</RoundButton>
        </div>
      </header>

      {/* Podium met de pop */}
      <section className="px-4 shrink-0">
        <div className="stage relative overflow-hidden" style={{ height: 'clamp(250px, 43dvh, 460px)' }}>
          <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2 z-10">
            <span className="eyebrow px-2.5 py-1 rounded-full" style={{ background: 'var(--color-surface)', color: 'var(--color-text)' }}>{badge}</span>
            <div className="flex gap-1.5">
              {viewWear && (
                <>
                  <StageButton onClick={() => edit(viewWear)}>Bewerk</StageButton>
                  <StageButton onClick={() => remove(viewWear)}>Verwijder</StageButton>
                </>
              )}
              {!viewWear && !editingId && (
                <StageButton onClick={verras}>{geschud.size ? '↻ Nog eens' : '✦ Verras me'}</StageButton>
              )}
              {!composing && !viewWear && lastOutfit && (
                <StageButton onClick={() => setSelected(new Set(lastOutfit.itemIds.filter(id => byId.get(id) && !byId.get(id).uitKast)))}>
                  ↺ Zelfde als {agoLabel(lastOutfit.datum, datum).replace(' geleden', ' terug')}
                </StageButton>
              )}
            </div>
          </div>

          <div className="absolute inset-0 flex items-center justify-center pt-10 pb-12">
            {hasDoll
              ? <OutfitDoll items={stageItems} layers={layers} height="100%" />
              : <FlatLay items={stageItems} photoUrls={photoUrls} />}
          </div>

          {!composing && !viewWear && (
            <div className="absolute inset-x-0 bottom-4 text-center text-sm text-muted">Kies hieronder wat je aanhebt</div>
          )}

          {stageItems.length > 0 && (
            <div className="absolute inset-x-0 bottom-0 px-3 pb-3 z-10">
              {offDoll > 0 && hasDoll && (
                <div className="text-[11px] text-muted mb-1.5 px-1">{offDoll} {offDoll === 1 ? 'stuk staat' : 'stukken staan'} nog niet op de pop</div>
              )}
              <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
                {stageItems.map(it => (
                  <button key={it.id}
                    onClick={() => (composing ? toggle(it.id) : setOpenItem(it.id))}
                    className="shrink-0 flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full text-xs"
                    style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)', opacity: hasDoll && !layers.get(it.id) ? 0.7 : 1 }}>
                    <ItemThumb item={it} url={photoUrls.get(it.id)} size={22} rounded="rounded-full" />
                    <span className="max-w-[9rem] truncate">{it.naam}</span>
                    {composing && <span className="text-muted">×</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {dayWears.length > 1 && !composing && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-1.5 z-10">
              {dayWears.map((w, i) => (
                <button key={w.id} onClick={() => setShown(i)} aria-label={`Outfit ${i + 1}`}
                  className="w-2 h-2 rounded-full" style={{ background: i === viewIndex ? 'var(--color-text)' : 'var(--color-text-dim)' }} />
              ))}
            </div>
          )}

          {flash && (
            <div className="absolute inset-x-0 top-14 flex justify-center z-20 animate-fade-in">
              <span className="text-xs font-semibold px-3 py-1.5 rounded-full" style={{ background: 'var(--color-accent)', color: 'var(--color-on-accent)' }}>✓ {flash}</span>
            </div>
          )}
        </div>
      </section>

      {/* Tabbladen per soort */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-none px-4 pt-3 pb-2 shrink-0">
        {CATEGORIES.map(c => {
          const n = chosen.filter(it => it.categorie === c.key).length
          const on = tab === c.key
          return (
            <button key={c.key} onClick={() => setTab(c.key)}
              className="shrink-0 flex items-center gap-1.5 pl-2 pr-3 py-1.5 rounded-full text-[13px] font-medium"
              style={on ? { background: 'var(--color-accent)', color: 'var(--color-on-accent)' } : { background: 'var(--color-surface)', color: 'var(--color-text)', boxShadow: 'var(--shadow-card)' }}>
              <GarmentIcon categorie={c.key} fill={on ? '#E9E5DE' : '#D9D3C8'} size={20} strokeWidth={2} />
              {c.label}
              {n > 0 && (
                <span className="min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center"
                  style={on ? { background: 'var(--color-on-accent)', color: 'var(--color-accent)' } : { background: 'var(--color-accent)', color: 'var(--color-on-accent)' }}>{n}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Raster met stukken */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 pt-1" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 150px)' }}>
        <div className="grid grid-cols-3 gap-x-2.5 gap-y-3">
          {tabItems.map(it => {
            const on = selected.has(it.id)
            return (
              <button key={it.id} onClick={() => toggle(it.id)} className="text-left">
                <div className="relative aspect-square rounded-2xl flex items-center justify-center overflow-hidden"
                  style={{ background: 'var(--color-surface)', boxShadow: on ? '0 0 0 2px var(--color-accent)' : 'var(--shadow-card)' }}>
                  {photoUrls.get(it.id)
                    ? <img src={photoUrls.get(it.id)} alt="" className="w-full h-full object-contain p-1.5" />
                    : <GarmentIcon categorie={it.categorie} fill={tileColour(it)} size={58} />}
                  {on && (
                    <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center"
                      style={{ background: 'var(--color-accent)', color: 'var(--color-on-accent)' }}>✓</span>
                  )}
                </div>
                <div className={`text-[12px] leading-tight mt-1.5 line-clamp-2 ${on ? 'font-semibold' : ''}`}>{it.naam}</div>
                <div className="text-[11px] text-muted mt-0.5 tabular-nums">{totals.get(it.id) ?? 0}×</div>
              </button>
            )
          })}
          <button onClick={() => setNewFor(tab)} className="text-left">
            <div className="aspect-square rounded-2xl flex items-center justify-center text-3xl font-light text-muted"
              style={{ border: '1.5px dashed var(--color-text-dim)' }}>+</div>
            <div className="text-[12px] mt-1.5 text-muted">Nieuw stuk</div>
          </button>
        </div>
      </div>

      {/* Opslaan */}
      {composing && (
        <div className="fixed left-0 right-0 z-30 px-4 flex gap-2 animate-fade-in-up" style={{ bottom: 'calc(env(safe-area-inset-bottom) + 66px)' }}>
          <button onClick={cancel} className="px-5 py-3.5 rounded-full text-sm font-medium glass" style={{ boxShadow: 'var(--shadow-float)' }}>
            Annuleer
          </button>
          <button onClick={save} disabled={!selected.size} className="btn-accent flex-1 py-3.5 text-sm disabled:opacity-40" style={{ boxShadow: 'var(--shadow-float)' }}>
            {editingId ? 'Wijziging opslaan' : `Opslaan · ${selected.size} ${selected.size === 1 ? 'stuk' : 'stukken'}`}
          </button>
        </div>
      )}

      <ItemSheet
        open={!!newFor}
        preset={{ categorie: newFor }}
        onClose={() => setNewFor(null)}
        onSaved={it => setSelected(s => new Set(s).add(it.id))}
      />
      <ItemSheet open={!!openItem} itemId={openItem} onClose={() => setOpenItem(null)} />
    </div>
  )
}

const tileColour = it => (it.kleur === 'multi' ? '#C9B8A6' : COLOUR_BY_KEY[it.kleur]?.hex)

function RoundButton({ onClick, disabled, label, children }) {
  return (
    <button onClick={onClick} disabled={disabled} aria-label={label}
      className="w-9 h-9 rounded-full text-xl leading-none flex items-center justify-center disabled:opacity-30"
      style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}>
      {children}
    </button>
  )
}

function StageButton({ onClick, children }) {
  return (
    <button onClick={onClick} className="text-xs font-medium px-2.5 py-1 rounded-full"
      style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}>
      {children}
    </button>
  )
}

/** Zonder basispop: de stukken als flat lay, van boven (jas) naar beneden (schoenen). */
function FlatLay({ items, photoUrls }) {
  if (!items.length) return <GarmentIcon categorie="tshirt" fill="#E3DED5" size={120} strokeWidth={1} />
  const sorted = [...items].sort((a, b) => layerOrder(b) - layerOrder(a))
  return (
    <div className="h-full flex flex-col items-center justify-center gap-2">
      {sorted.map(it => <ItemThumb key={it.id} item={it} url={photoUrls.get(it.id)} size={Math.min(84, 300 / sorted.length)} rounded="rounded-2xl" />)}
    </div>
  )
}
