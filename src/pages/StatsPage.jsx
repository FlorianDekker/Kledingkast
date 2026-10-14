import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Chip } from '../components/ui/Chip'
import { ItemThumb } from '../components/items/ItemThumb'
import { ItemSheet } from '../components/items/ItemSheet'
import { MonthBars, MonthLine, LabelBars, PriceCpwScatter } from '../components/charts/Charts'
import { ItemListSheet } from '../components/insights/ItemListSheet'
import { KalenderTab } from '../components/insights/KalenderTab'
import { CombinatiesTab } from '../components/insights/CombinatiesTab'
import { RecordsTab } from '../components/insights/RecordsTab'
import { WeekdagTab } from '../components/insights/WeekdagTab'
import { useLayers } from '../hooks/useLayers'
import { useItemStats, usePhotoUrls, useSetting } from '../hooks/useData'
import {
  overview, byCategory, byPurchaseYear, outfitsPerMonth, medianCpwOverTime, wearsByColour, suggestions, todayStr,
} from '../utils/stats'
import { COLOUR_BY_KEY } from '../utils/colors'
import { euro, euro0, agoLabel } from '../utils/format'

const CAT_METRICS = [
  { key: 'avgWears', label: 'Gem. keer gedragen', format: v => `${v}×` },
  { key: 'medianCpw', label: 'Mediaan per keer', format: v => euro(v) },
  { key: 'avgPrice', label: 'Gem. prijs', format: v => euro0(v) },
  { key: 'spend', label: 'Uitgegeven', format: v => euro0(v) },
]
const YEAR_METRICS = [
  { key: 'bought', label: 'Gekocht', format: v => `${v}` },
  { key: 'spend', label: 'Uitgegeven', format: v => euro0(v) },
  { key: 'avgWears', label: 'Gem. keer gedragen', format: v => `${v}×` },
  { key: 'medianCpw', label: 'Mediaan per keer', format: v => euro(v) },
]
// Tabbladen à la FinanceTracker; ?tab= in de URL zodat je er vanuit elders heen kunt
const TABS = [
  { key: 'overzicht', label: 'Overzicht' },
  { key: 'kalender', label: 'Kalender' },
  { key: 'combinaties', label: 'Combinaties' },
  { key: 'records', label: 'Records' },
  { key: 'weekdag', label: 'Weekdag' },
  { key: 'verdeling', label: 'Verdeling' },
]

const RANGES = [
  { key: '12', label: '1 jaar', months: 12 },
  { key: '36', label: '3 jaar', months: 36 },
  { key: 'alles', label: 'Alles', months: null },
]

function Card({ title, sub, right, children }) {
  return (
    <div className="card mx-4 p-4">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <div className="font-display text-xl leading-tight">{title}</div>
          {sub && <div className="text-xs text-muted mt-0.5">{sub}</div>}
        </div>
        {right}
      </div>
      {children}
    </div>
  )
}

function Stat({ label, value, onClick }) {
  return (
    <button onClick={onClick} className="card px-4 py-3.5 text-left">
      <div className="eyebrow flex justify-between">{label}<span aria-hidden="true">›</span></div>
      <div className="font-display text-[28px] leading-tight tabular-nums mt-1">{value}</div>
    </button>
  )
}

function MetricChips({ metrics, value, onChange }) {
  return (
    <div className="flex gap-1.5 overflow-x-auto scrollbar-none -mx-4 px-4 mb-3">
      {metrics.map(m => <Chip key={m.key} active={value === m.key} onClick={() => onChange(m.key)}>{m.label}</Chip>)}
    </div>
  )
}

export function StatsPage() {
  const { items, wears, rows: allRows } = useItemStats()
  const photoUrls = usePhotoUrls()
  const target = useSetting('doelCpw', 1)
  const [alleenKast, setAlleenKast] = useState(false)
  const [range, setRange] = useState('36')
  const [catMetric, setCatMetric] = useState('avgWears')
  const [yearMetric, setYearMetric] = useState('spend')
  const [jaar, setJaar] = useState(null)
  const [openId, setOpenId] = useState(null)
  const [lijst, setLijst] = useState(null) // { title, subtitle, rows, right }
  const [kalenderMaand, setKalenderMaand] = useState(null)
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const layers = useLayers()
  const tab = TABS.some(t => t.key === params.get('tab')) ? params.get('tab') : 'overzicht'
  const setTab = key => { setParams(key === 'overzicht' ? {} : { tab: key }, { replace: true }); window.scrollTo(0, 0) }
  const today = todayStr()

  const rows = useMemo(() => (allRows ?? []).filter(r => !alleenKast || !r.item.uitKast), [allRows, alleenKast])
  const data = useMemo(() => {
    if (!allRows) return null
    const months = RANGES.find(r => r.key === range).months
    const cut = arr => (months ? arr.slice(-months) : arr)
    return {
      ov: overview(rows, wears),
      cats: byCategory(rows),
      years: byPurchaseYear(rows, { tot: today.slice(0, 4) }),
      perMonth: cut(outfitsPerMonth(wears)),
      cpwTime: cut(medianCpwOverTime(items, wears)),
      colours: wearsByColour(rows).filter(c => c.count > 0),
      tips: suggestions(rows, { today, target }),
      scatter: rows.filter(r => r.cpw != null && r.item.prijs > 0).map(r => ({ id: r.item.id, naam: r.item.naam, x: r.item.prijs, y: r.cpw, count: r.count })),
    }
  }, [allRows, rows, items, wears, range, today, target])

  if (!data) return <PageWrapper title="Inzicht" />
  if (!allRows.length) {
    return <PageWrapper title="Inzicht"><div className="card mx-4 p-6 text-sm text-muted text-center">Nog geen kleding. Importeer je Excel via Meer.</div></PageWrapper>
  }

  const cm = CAT_METRICS.find(m => m.key === catMetric)
  const ym = YEAR_METRICS.find(m => m.key === yearMetric)
  const rangeChips = (
    <div className="flex gap-1 shrink-0">
      {RANGES.map(r => (
        <button key={r.key} onClick={() => setRange(r.key)} className="text-[11px] px-2 py-1 rounded-full font-medium whitespace-nowrap"
          style={range === r.key ? { background: 'var(--color-accent)', color: 'var(--color-on-accent)' } : { color: 'var(--color-muted)' }}>
          {r.label}
        </button>
      ))}
    </div>
  )

  const filter = (
    <div className="flex gap-1.5 px-4 mb-3">
      <Chip active={!alleenKast} onClick={() => setAlleenKast(false)}>Alles ooit</Chip>
      <Chip active={alleenKast} onClick={() => setAlleenKast(true)}>Nu in de kast</Chip>
    </div>
  )
  const openLijst = (title, subtitle, lijstRows, extra = {}) => setLijst({ title, subtitle, rows: lijstRows, ...extra })

  return (
    <PageWrapper title="Inzicht">
      <div className="sticky top-0 z-20 glass mb-3 py-2">
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none px-4">
          {TABS.map(t => <Chip key={t.key} active={tab === t.key} onClick={() => setTab(t.key)}>{t.label}</Chip>)}
        </div>
      </div>

      {tab === 'overzicht' && (
        <>
          {filter}
          <div className="grid grid-cols-2 gap-2.5 px-4 mb-4">
            <Stat label="In de kast" value={data.ov.inKast} onClick={() => navigate('/kast')} />
            <Stat label="Uitgegeven" value={euro0(data.ov.spend)} onClick={() => setTab('verdeling')} />
            <Stat label="Outfits gelogd" value={data.ov.outfits.toLocaleString('nl-NL')} onClick={() => setTab('kalender')} />
            <Stat label="Mediaan per keer" value={euro(data.ov.medianCpw)}
              onClick={() => openLijst('Prijs per keer', 'Goedkoopst per keer bovenaan',
                rows.filter(r => r.cpw != null).sort((a, b) => a.cpw - b.cpw), { right: r => euro(r.cpw) })} />
          </div>
          <div className="space-y-4">
            <Card title="Suggesties" sub={`Voor wat nu in je kast hangt; doel is ${euro(target)} per keer`}>
              <TipList title="Al lang niet aangehad" rows={data.tips.vergeten} photoUrls={photoUrls} onOpen={setOpenId}
                detail={r => agoLabel(r.lastWorn, today)} />
              <TipList title={`Bijna onder ${euro(target)} per keer`} rows={data.tips.bijnaDoel} photoUrls={photoUrls} onOpen={setOpenId}
                detail={r => `nog ${r.nodig}× dragen`} />
              <TipList title="Duurst per keer" rows={data.tips.duurst} photoUrls={photoUrls} onOpen={setOpenId}
                detail={r => `${euro(r.cpw)} per keer · ${r.count}×`} />
            </Card>

            <Card title="Outfits per maand" right={rangeChips}>
              <MonthBars data={data.perMonth} />
            </Card>

            <Card title="Mediane cost per wear" sub="Per maand: de middelste prijs per keer van alles wat je toen al had en gedragen had" right={rangeChips}>
              <MonthLine data={data.cpwTime} valueKey="median" format={v => euro(v)} />
            </Card>

            <Card title="Prijs tegen cost per wear" sub="Elke stip is een stuk; tik voor details. Verticale as is logaritmisch.">
              <PriceCpwScatter points={data.scatter} onPick={p => setOpenId(p.id)} />
            </Card>
          </div>
        </>
      )}

      {tab === 'kalender' && (
        <KalenderTab key={kalenderMaand ?? 'nu'} items={items} wears={wears} layers={layers} photoUrls={photoUrls} today={today} startMaand={kalenderMaand} />
      )}
      {tab === 'combinaties' && <CombinatiesTab items={items} wears={wears} layers={layers} photoUrls={photoUrls} today={today} />}
      {tab === 'records' && (
        <RecordsTab rows={allRows} wears={wears} photoUrls={photoUrls} today={today}
          onMaand={m => { setKalenderMaand(m); setTab('kalender') }} />
      )}
      {tab === 'weekdag' && <WeekdagTab items={items} wears={wears} photoUrls={photoUrls} />}

      {tab === 'verdeling' && (
        <>
          {filter}
          <div className="space-y-4">
            <Card title="Per soort" sub="Tik op een soort voor de stukken">
              <MetricChips metrics={CAT_METRICS} value={catMetric} onChange={setCatMetric} />
              <LabelBars
                labels={data.cats.map(c => c.label)}
                values={data.cats.map(c => c[catMetric])}
                format={v => (v == null ? '–' : cm.format(v))}
                onPick={i => {
                  const c = data.cats[i]
                  openLijst(c.label, `${c.n} stuks · ${c.wears}× gedragen`, rows.filter(r => r.item.categorie === c.key).sort((a, b) => b.count - a.count))
                }}
              />
            </Card>

            <Card title="Per aankoopjaar">
              <MetricChips metrics={YEAR_METRICS} value={yearMetric} onChange={setYearMetric} />
              <LabelBars
                labels={data.years.map(y => y.year)}
                values={data.years.map(y => y[yearMetric])}
                format={v => (v == null ? '–' : ym.format(v))}
                onPick={i => setJaar(j => (j === data.years[i].year ? null : data.years[i].year))}
                selected={jaar == null ? null : data.years.findIndex(y => y.year === jaar)}
              />
              {jaar == null
                ? <div className="text-xs text-muted mt-2">Tik op een jaar om te zien wat je toen kocht.</div>
                : <JaarLijst jaar={data.years.find(y => y.year === jaar)} photoUrls={photoUrls} onOpen={setOpenId} onClose={() => setJaar(null)} />}
              <table className="w-full text-xs mt-3 tabular-nums">
                <thead className="text-muted">
                  <tr><th className="text-left font-medium py-1">Jaar</th><th className="text-right font-medium">Stuks</th><th className="text-right font-medium">Uitgegeven</th><th className="text-right font-medium">Gem. ×</th><th className="text-right font-medium">Per keer</th></tr>
                </thead>
                <tbody>
                  {data.years.map(y => (
                    <tr key={y.year} onClick={() => setJaar(j => (j === y.year ? null : y.year))}
                      style={{ borderTop: '1px solid var(--color-border)', fontWeight: jaar === y.year ? 600 : undefined }}>
                      <td className="py-1.5">{y.year}</td><td className="text-right">{y.bought}</td><td className="text-right">{euro0(y.spend)}</td>
                      <td className="text-right">{y.avgWears}</td><td className="text-right">{euro(y.medianCpw)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

            <Card title="Keer gedragen per kleur" sub="Tik op een kleur voor de stukken. De kleur is bij de import uit de naam geraden; pas hem aan per stuk.">
              <LabelBars
                labels={data.colours.map(c => COLOUR_BY_KEY[c.kleur]?.label ?? 'Onbekend')}
                values={data.colours.map(c => c.count)}
                colors={data.colours.map(c => COLOUR_BY_KEY[c.kleur]?.hex ?? '#d4d4d4')}
                format={v => `${v}×`}
                onPick={i => {
                  const k = data.colours[i].kleur
                  openLijst(COLOUR_BY_KEY[k]?.label ?? 'Onbekende kleur', `${data.colours[i].count}× gedragen`,
                    rows.filter(r => (r.item.kleur ?? 'onbekend') === k).sort((a, b) => b.count - a.count))
                }}
              />
            </Card>
          </div>
        </>
      )}

      <ItemSheet open={!!openId} itemId={openId} onClose={() => setOpenId(null)} />
      <ItemListSheet open={!!lijst} onClose={() => setLijst(null)} title={lijst?.title} subtitle={lijst?.subtitle}
        rows={lijst?.rows ?? []} photoUrls={photoUrls} right={lijst?.right} />
    </PageWrapper>
  )
}

function TipList({ title, rows, photoUrls, onOpen, detail }) {
  if (!rows.length) return null
  return (
    <div className="mb-3 last:mb-0">
      <div className="eyebrow mb-1">{title}</div>
      {rows.map(r => (
        <button key={r.item.id} onClick={() => onOpen(r.item.id)} className="w-full flex items-center gap-2.5 py-1.5 text-left">
          <ItemThumb item={r.item} url={photoUrls.get(r.item.id)} size={30} rounded="rounded-lg" />
          <span className="text-sm flex-1 min-w-0 truncate">{r.item.naam}</span>
          <span className="text-xs text-muted shrink-0">{detail(r)}</span>
        </button>
      ))}
    </div>
  )
}

function JaarLijst({ jaar, photoUrls, onOpen, onClose }) {
  if (!jaar) return null
  return (
    <div className="mt-3 rounded-2xl p-3 animate-fade-in" style={{ background: 'var(--color-surface-2)' }}>
      <div className="flex items-baseline justify-between mb-1">
        <div className="font-display text-lg">{jaar.year}</div>
        <button onClick={onClose} className="text-xs text-muted">Sluiten</button>
      </div>
      <div className="text-xs text-muted mb-2">
        {jaar.bought ? `${jaar.bought} ${jaar.bought === 1 ? 'stuk' : 'stukken'} · samen ${euro0(jaar.spend)}` : `Niets gekocht in ${jaar.year}`}
      </div>
      {jaar.rows.map(r => (
        <button key={r.item.id} onClick={() => onOpen(r.item.id)} className="w-full flex items-center gap-2.5 py-1.5 text-left">
          <ItemThumb item={r.item} url={photoUrls.get(r.item.id)} size={34} rounded="rounded-lg" />
          <div className="flex-1 min-w-0">
            <div className="text-sm truncate" style={{ opacity: r.item.uitKast ? 0.55 : 1 }}>{r.item.naam}</div>
            <div className="text-[11px] text-muted truncate">
              {r.count}× gedragen{r.cpw != null ? ` · ${euro(r.cpw)} per keer` : ''}{r.item.uitKast ? ' · uit de kast' : ''}
            </div>
          </div>
          <span className="text-sm tabular-nums shrink-0">{r.item.prijs != null ? euro0(r.item.prijs) : '–'}</span>
        </button>
      ))}
    </div>
  )
}
