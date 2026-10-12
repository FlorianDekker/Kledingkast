import { useEffect, useState } from 'react'
import { Sheet } from '../ui/Sheet'
import { ItemPickerSheet } from '../items/ItemPickerSheet'
import { db } from '../../db/db'
import { applyImport, importedFormKeys } from '../../db/actions'
import { readWorkbook, planImport, compareWithExcel, normName } from '../../utils/importForm'
import { CATEGORY_BY_KEY } from '../../constants/categories'
import { addDays, todayStr } from '../../utils/stats'
import { agoLabel } from '../../utils/format'
import { useItems, usePhotoUrls } from '../../hooks/useData'

/**
 * Leest een export van het Google Form, laat zien wat er bij komt en vraagt
 * per onbekende naam wat ermee moet. Pas bij "Importeren" wordt er iets bewaard.
 */
export function ImportSheet({ buffer, fileName, onClose }) {
  const [state, setState] = useState({ phase: 'laden' })
  const [decisions, setDecisions] = useState(() => new Map())
  const [linkFor, setLinkFor] = useState(null)
  const [showDiff, setShowDiff] = useState(false)
  const items = useItems()
  const photoUrls = usePhotoUrls()

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const XLSX = await import('xlsx')
        const parsed = readWorkbook(XLSX, buffer)
        const existing = {
          items: await db.items.toArray(),
          aliases: await db.aliases.toArray(),
          importedKeys: await importedFormKeys(),
        }
        const plan = planImport(parsed, existing)
        const diff = existing.items.length === 0 ? compareWithExcel(parsed, plan) : []
        // Al meer dan een jaar niet gedragen: waarschijnlijk weg, dus standaard "uit de kast".
        const yearAgo = addDays(todayStr(), -365)
        const initial = new Map(plan.unknown
          .filter(u => u.lastDatum && u.lastDatum < yearAgo)
          .map(u => [normName(u.naam), { action: 'new', fields: { uitKast: true } }]))
        if (cancelled) return
        setDecisions(initial)
        setState({ phase: 'plan', plan, diff, first: existing.items.length === 0 })
      } catch (err) {
        if (!cancelled) setState({ phase: 'fout', error: err.message })
      }
    })()
    return () => { cancelled = true }
  }, [buffer])

  const decide = (naam, d) => setDecisions(m => new Map(m).set(normName(naam), d))

  async function run() {
    setState(s => ({ ...s, phase: 'bezig' }))
    try {
      const result = await applyImport(state.plan, decisions)
      setState(s => ({ ...s, phase: 'klaar', result }))
    } catch (err) {
      setState({ phase: 'fout', error: err.message })
    }
  }

  const { plan } = state
  const nothing = plan && !plan.newItems.length && !plan.wears.length && !plan.unknown.length

  return (
    <>
      <Sheet
        open
        onClose={onClose}
        title="Excel importeren"
        subtitle={fileName}
        maxHeight="92vh"
        footer={state.phase === 'plan' && !nothing ? (
          <button onClick={run} className="btn-accent w-full py-3 text-sm">
            Importeren: {plan.wears.length.toLocaleString('nl-NL')} outfits
            {plan.newItems.length + plan.unknown.length ? `, tot ${plan.newItems.length + plan.unknown.length} nieuwe stukken` : ''}
          </button>
        ) : state.phase === 'klaar' ? (
          <button onClick={onClose} className="btn-accent w-full py-3 text-sm">Klaar</button>
        ) : null}
      >
        <div className="px-4 pt-4 space-y-4">
          {state.phase === 'laden' && <div className="text-sm text-muted py-6 text-center">Bestand lezen…</div>}
          {state.phase === 'bezig' && <div className="text-sm text-muted py-6 text-center">Importeren…</div>}
          {state.phase === 'fout' && <div className="text-sm text-red py-4">{state.error}</div>}

          {state.phase === 'klaar' && (
            <div className="text-sm py-4 text-center">
              <div className="text-3xl mb-2">✓</div>
              {state.result.wears.toLocaleString('nl-NL')} outfits en {state.result.items} nieuwe stukken toegevoegd.
            </div>
          )}

          {state.phase === 'plan' && (
            <>
              {nothing ? (
                <div className="text-sm py-4 text-center text-muted">
                  Niets nieuws: alle {plan.skipped.toLocaleString('nl-NL')} formulieren uit dit bestand staan al in de app.
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 text-center">
                  <Num label="Nieuwe outfits" value={plan.wears.length} />
                  <Num label="Nieuwe stukken" value={plan.newItems.length} />
                  <Num label="Al binnen" value={plan.skipped} />
                </div>
              )}

              {plan.unknown.length > 0 && (
                <div>
                  <div className="text-sm font-semibold mb-1">Namen die niet in je kast staan ({plan.unknown.length})</div>
                  <p className="text-xs text-muted mb-2">
                    Deze namen staan wel in formulieren, maar niet in het tabblad Data. Maak er een nieuw stuk van,
                    koppel ze aan een bestaand stuk (bijv. een oude schrijfwijze) of negeer ze. De app onthoudt je keuze.
                  </p>
                  <div className="space-y-2">
                    {plan.unknown.map(u => {
                      const d = decisions.get(normName(u.naam)) ?? { action: 'new' }
                      const linked = d.action === 'link' ? items?.find(i => i.id === d.itemId) : null
                      return (
                        <div key={u.naam} className="rounded-xl p-2.5" style={{ background: 'var(--color-surface-2)' }}>
                          <div className="flex justify-between gap-2 text-sm">
                            <span className="font-medium min-w-0 truncate">{u.naam}</span>
                            <span className="text-xs text-muted shrink-0">{CATEGORY_BY_KEY[u.categorie]?.emoji} {u.count}× · laatst {agoLabel(u.lastDatum)}</span>
                          </div>
                          <div className="flex gap-1.5 mt-2">
                            <Opt on={d.action === 'new'} onClick={() => decide(u.naam, { action: 'new' })}>Nieuw stuk</Opt>
                            <Opt on={d.action === 'link'} onClick={() => setLinkFor(u)}>{linked ? `→ ${linked.naam}` : 'Koppel aan…'}</Opt>
                            <Opt on={d.action === 'ignore'} onClick={() => decide(u.naam, { action: 'ignore' })}>Negeer</Opt>
                          </div>
                          {d.action === 'new' && (
                            <label className="flex items-center gap-2 mt-2 text-xs text-muted">
                              <input type="checkbox" checked={!!d.fields?.uitKast}
                                onChange={e => decide(u.naam, { action: 'new', fields: { uitKast: e.target.checked } })}
                                className="accent-[var(--color-accent)]" />
                              Zit niet meer in mijn kast
                            </label>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  {state.first && (
                    <p className="text-xs text-muted mt-2">Koppelen kan pas aan stukken die al in de app staan. Bij de eerste import maak je dus nieuwe stukken; dubbele kun je daarna samenvoegen vanuit het stuk zelf.</p>
                  )}
                </div>
              )}

              {state.diff.length > 0 && (
                <div>
                  <button onClick={() => setShowDiff(v => !v)} className="text-sm font-semibold flex items-center gap-1">
                    {showDiff ? '▾' : '▸'} Telt anders dan je Excel ({state.diff.length} stukken)
                  </button>
                  <p className="text-xs text-muted mt-1">
                    De Excel telt maar een deel van de formulieren mee en slaat keuzes over waarin je twee stukken tegelijk aanvinkte.
                    Bij sommige stukken staat er een vast getal. De app telt opnieuw over alle formulieren.
                  </p>
                  {showDiff && (
                    <table className="w-full text-xs mt-2 tabular-nums">
                      <thead className="text-muted"><tr><th className="text-left font-medium py-1">Stuk</th><th className="text-right font-medium">Excel</th><th className="text-right font-medium">App</th></tr></thead>
                      <tbody>
                        {state.diff.map(r => (
                          <tr key={r.naam} style={{ borderTop: '1px solid var(--color-border)' }}>
                            <td className="py-1 pr-2">{r.naam}</td><td className="text-right">{r.excel}</td><td className="text-right font-semibold">{r.app}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </Sheet>

      <ItemPickerSheet
        open={!!linkFor}
        onClose={() => setLinkFor(null)}
        items={items}
        photoUrls={photoUrls}
        preferCategory={linkFor?.categorie}
        title="Koppel aan"
        subtitle={linkFor ? `"${linkFor.naam}" telt dan mee bij het stuk dat je kiest` : null}
        onPick={it => { decide(linkFor.naam, { action: 'link', itemId: it.id }); setLinkFor(null) }}
      />
    </>
  )
}

function Num({ label, value }) {
  return (
    <div className="rounded-2xl py-2.5" style={{ background: 'var(--color-surface-2)' }}>
      <div className="text-lg font-bold tabular-nums">{value.toLocaleString('nl-NL')}</div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted">{label}</div>
    </div>
  )
}

function Opt({ on, onClick, children }) {
  return (
    <button onClick={onClick} className="px-2.5 py-1 rounded-full text-xs font-medium truncate max-w-[50%]"
      style={on ? { background: 'var(--color-accent)', color: '#fff' } : { background: 'var(--color-surface)', color: 'var(--color-text)' }}>
      {children}
    </button>
  )
}
