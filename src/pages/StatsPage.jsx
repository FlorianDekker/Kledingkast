import { useMemo, useState } from 'react'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Chip } from '../components/ui/Chip'
import { ItemThumb } from '../components/items/ItemThumb'
import { ItemSheet } from '../components/items/ItemSheet'
import { MonthBars, MonthLine, LabelBars, PriceCpwScatter } from '../components/charts/Charts'
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
          <div className="text-sm font-semibold">{title}</div>
          {sub && <div className="text-xs text-muted mt-0.5">{sub}</div>}
        </div>
        {right}
      </div>
      {children}
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="card px-3 py-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted">{label}</div>
      <div className="text-xl font-bold tabular-nums mt-0.5">{value}</div>
    </div>
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
  const [openId, setOpenId] = useState(null)
  const today = todayStr()

  const rows = useMemo(() => (allRows ?? []).filter(r => !alleenKast || !r.item.uitKast), [allRows, alleenKast])
  const data = useMemo(() => {
    if (!allRows) return null
    const months = RANGES.find(r => r.key === range).months
    const cut = arr => (months ? arr.slice(-months) : arr)
    return {
      ov: overview(rows, wears),
      cats: byCategory(rows),
      years: byPurchaseYear(rows),
      perMonth: cut(outfitsPerMonth(wears)),
      cpwTime: cut(medianCpwOverTime(items, wears)),
      colours: wearsByColour(rows).filter(c => c.count > 0),
      tips: suggestions(rows, { today, target }),
      scatter: rows.filter(r => r.cpw != null && r.item.prijs > 0).map(r => ({ id: r.item.id, naam: r.item.naam, x: r.item.prijs, y: r.cpw, count: r.count })),
    }
  }, [allRows, rows, items, wears, range, today, target])

  if (!data) return <PageWrapper title="Statistieken" />
  if (!allRows.length) {
    return <PageWrapper title="Statistieken"><div className="card mx-4 p-6 text-sm text-muted text-center">Nog geen kleding. Importeer je Excel via Meer.</div></PageWrapper>
  }

  const cm = CAT_METRICS.find(m => m.key === catMetric)
  const ym = YEAR_METRICS.find(m => m.key === yearMetric)
  const rangeChips = (
    <div className="flex gap-1 shrink-0">
      {RANGES.map(r => (
        <button key={r.key} onClick={() => setRange(r.key)} className="text-[11px] px-2 py-1 rounded-full font-medium whitespace-nowrap"
          style={range === r.key ? { background: 'var(--color-accent-light)', color: 'var(--color-accent)' } : { color: 'var(--color-muted)' }}>
          {r.label}
        </button>
      ))}
    </div>
  )

  return (
    <PageWrapper title="Statistieken">
      <div className="px-4 mb-3 flex items-center justify-between">
        <div className="flex gap-1.5">
          <Chip active={!alleenKast} onClick={() => setAlleenKast(false)}>Alles ooit</Chip>
          <Chip active={alleenKast} onClick={() => setAlleenKast(true)}>Nu in de kast</Chip>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 px-4 mb-4">
        <Stat label="In de kast" value={data.ov.inKast} />
        <Stat label="Uitgegeven" value={euro0(data.ov.spend)} />
        <Stat label="Outfits gelogd" value={data.ov.outfits.toLocaleString('nl-NL')} />
        <Stat label="Mediaan per keer" value={euro(data.ov.medianCpw)} />
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

        <Card title="Per soort">
          <MetricChips metrics={CAT_METRICS} value={catMetric} onChange={setCatMetric} />
          <LabelBars
            labels={data.cats.map(c => `${c.emoji} ${c.label}`)}
            values={data.cats.map(c => c[catMetric])}
            format={v => (v == null ? '–' : cm.format(v))}
          />
        </Card>

        <Card title="Per aankoopjaar">
          <MetricChips metrics={YEAR_METRICS} value={yearMetric} onChange={setYearMetric} />
          <LabelBars labels={data.years.map(y => y.year)} values={data.years.map(y => y[yearMetric])} format={v => (v == null ? '–' : ym.format(v))} />
          <table className="w-full text-xs mt-3 tabular-nums">
            <thead className="text-muted">
              <tr><th className="text-left font-medium py-1">Jaar</th><th className="text-right font-medium">Stuks</th><th className="text-right font-medium">Uitgegeven</th><th className="text-right font-medium">Gem. ×</th><th className="text-right font-medium">Per keer</th></tr>
            </thead>
            <tbody>
              {data.years.map(y => (
                <tr key={y.year} style={{ borderTop: '1px solid var(--color-border)' }}>
                  <td className="py-1.5">{y.year}</td><td className="text-right">{y.bought}</td><td className="text-right">{euro0(y.spend)}</td>
                  <td className="text-right">{y.avgWears}</td><td className="text-right">{euro(y.medianCpw)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card title="Keer gedragen per kleur" sub="Kleur is bij de import uit de naam geraden; pas hem aan per stuk">
          <LabelBars
            labels={data.colours.map(c => COLOUR_BY_KEY[c.kleur]?.label ?? 'Onbekend')}
            values={data.colours.map(c => c.count)}
            colors={data.colours.map(c => COLOUR_BY_KEY[c.kleur]?.hex ?? '#d4d4d4')}
            format={v => `${v}×`}
          />
        </Card>

        <Card title="Prijs tegen cost per wear" sub="Elke stip is een stuk; tik voor details. Verticale as is logaritmisch.">
          <PriceCpwScatter points={data.scatter} onPick={p => setOpenId(p.id)} />
        </Card>
      </div>

      <ItemSheet open={!!openId} itemId={openId} onClose={() => setOpenId(null)} />
    </PageWrapper>
  )
}

function TipList({ title, rows, photoUrls, onOpen, detail }) {
  if (!rows.length) return null
  return (
    <div className="mb-3 last:mb-0">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted mb-1">{title}</div>
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
