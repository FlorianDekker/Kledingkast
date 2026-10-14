import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { OutfitSheet } from './OutfitSheet'
import { GarmentIcon } from '../icons/GarmentIcon'
import { layerOrder } from '../../hooks/useLayers'
import { COLOUR_BY_KEY } from '../../utils/colors'
import { calendarMonth, dayMap, streaks, loggedMonths } from '../../utils/insights'
import { dateLabel } from '../../utils/format'

const MAANDEN = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december']
const DAGEN = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo']

/** Het stuk dat een dag het best samenvat: bij voorkeur een met plaatje, bovenste laag eerst. */
function gezicht(items, photoUrls) {
  const sorted = [...items].sort((a, b) => layerOrder(b) - layerOrder(a))
  return sorted.find(i => photoUrls.get(i.id)) ?? sorted.find(i => i.categorie !== 'schoenen') ?? sorted[0]
}

export function KalenderTab({ items, wears, layers, photoUrls, today, startMaand = null }) {
  const navigate = useNavigate()
  const maanden = useMemo(() => loggedMonths(wears, today), [wears, today])
  const [i, setI] = useState(() => Math.max(0, startMaand ? maanden.indexOf(startMaand) : 0))
  const [dag, setDag] = useState(null)
  const byId = useMemo(() => new Map(items.map(it => [it.id, it])), [items])
  const dm = useMemo(() => dayMap(wears), [wears])
  const reeks = useMemo(() => streaks(wears, today), [wears, today])

  const maand = maanden[Math.min(i, maanden.length - 1)]
  const weken = calendarMonth(maand)
  const [jaar, mm] = maand.split('-').map(Number)
  const dagenInMaand = weken.flat().filter(d => d.inMonth && d.datum <= today)
  const gelogd = dagenInMaand.filter(d => dm.has(d.datum)).length

  const dagOutfits = dag ? dm.get(dag) ?? [] : []
  const dagItems = dagOutfits[0] ? dagOutfits[0].itemIds.map(id => byId.get(id)).filter(Boolean) : []

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2.5 px-4">
        <Tegel label="Op rij" waarde={`${reeks.huidig}`} sub={reeks.huidig === 1 ? 'dag' : 'dagen'} />
        <Tegel label="Langste reeks" waarde={`${reeks.langste.lengte}`} sub={reeks.langste.van ? `t/m ${dateLabel(reeks.langste.tot, { weekday: false })}` : ''} />
        <Tegel label="Deze maand" waarde={`${gelogd}/${dagenInMaand.length}`} sub="dagen gelogd" />
      </div>

      <div className="card mx-4 p-4">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => setI(v => Math.min(maanden.length - 1, v + 1))} disabled={i >= maanden.length - 1}
            className="w-9 h-9 rounded-full text-xl disabled:opacity-30" style={{ background: 'var(--color-surface-2)' }} aria-label="Vorige maand">‹</button>
          <div className="font-display text-xl">{MAANDEN[mm - 1]} {jaar}</div>
          <button onClick={() => setI(v => Math.max(0, v - 1))} disabled={i === 0}
            className="w-9 h-9 rounded-full text-xl disabled:opacity-30" style={{ background: 'var(--color-surface-2)' }} aria-label="Volgende maand">›</button>
        </div>
        <div className="grid grid-cols-7 gap-1 mb-1">
          {DAGEN.map(d => <div key={d} className="text-center text-[10px] font-semibold uppercase tracking-wider text-muted">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {weken.flat().map(d => {
            const outfits = dm.get(d.datum)
            const its = outfits ? outfits[0].itemIds.map(id => byId.get(id)).filter(Boolean) : []
            const g = its.length ? gezicht(its, photoUrls) : null
            const toekomst = d.datum > today
            return (
              <button key={d.datum}
                onClick={() => (outfits ? setDag(d.datum) : !toekomst && navigate(`/?datum=${d.datum}`))}
                disabled={!d.inMonth || toekomst}
                className="relative aspect-square rounded-xl flex items-center justify-center overflow-hidden"
                style={{
                  visibility: d.inMonth ? 'visible' : 'hidden',
                  background: outfits ? 'var(--color-surface-2)' : 'transparent',
                  boxShadow: d.datum === today ? '0 0 0 1.5px var(--color-accent)' : undefined,
                  opacity: toekomst ? 0.3 : 1,
                }}>
                {g && (photoUrls.get(g.id)
                  ? <img src={photoUrls.get(g.id)} alt="" className="w-full h-full object-contain p-0.5" />
                  : <GarmentIcon categorie={g.categorie} fill={COLOUR_BY_KEY[g.kleur]?.hex} size={26} strokeWidth={2} />)}
                <span className="absolute top-0.5 left-1 text-[9px] font-semibold text-muted">{Number(d.datum.slice(8))}</span>
                {outfits?.length > 1 && <span className="absolute bottom-0.5 right-1 text-[9px] font-bold">{outfits.length}</span>}
              </button>
            )
          })}
        </div>
        <div className="text-[11px] text-muted mt-3">Tik op een dag voor de outfit; een lege dag opent Vandaag om hem alsnog te loggen.</div>
      </div>

      <OutfitSheet
        open={!!dag}
        onClose={() => setDag(null)}
        title={dag ? dateLabel(dag) : ''}
        subtitle={dagOutfits.length > 1 ? `${dagOutfits.length} outfits; dit is de eerste` : null}
        items={dagItems}
        layers={layers}
        photoUrls={photoUrls}
        datum={dag}
      />
    </div>
  )
}

function Tegel({ label, waarde, sub }) {
  return (
    <div className="card px-3 py-3">
      <div className="eyebrow">{label}</div>
      <div className="font-display text-[26px] leading-tight tabular-nums mt-0.5">{waarde}</div>
      <div className="text-[11px] text-muted truncate">{sub}</div>
    </div>
  )
}
