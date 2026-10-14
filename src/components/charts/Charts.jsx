import { Bar, Line, Scatter } from 'react-chartjs-2'
import {
  Chart as ChartJS, BarElement, LineElement, PointElement, LinearScale, LogarithmicScale, CategoryScale, Tooltip, Filler,
} from 'chart.js'
import { tooltipTheme, tickTheme, gridTheme, chartColors } from '../../utils/theme'
import { euro, monthLabel } from '../../utils/format'

ChartJS.register(BarElement, LineElement, PointElement, LinearScale, LogarithmicScale, CategoryScale, Tooltip, Filler)

// Grafieken in de warme accentkleur, niet in de inkt van de knoppen
const accent = () => getComputedStyle(document.documentElement).getPropertyValue('--color-highlight').trim() || '#A0673F'

function baseOptions({ yFormat, horizontal = false } = {}) {
  const valueAxis = {
    beginAtZero: true,
    grid: gridTheme(),
    border: { display: false },
    ticks: { ...tickTheme(), maxTicksLimit: 5, callback: yFormat ? v => yFormat(v) : undefined },
  }
  const catAxis = { grid: { display: false }, border: { display: false }, ticks: { ...tickTheme(), autoSkip: true, maxRotation: 0 } }
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 250 },
    indexAxis: horizontal ? 'y' : 'x',
    interaction: { mode: 'index', intersect: false },
    plugins: { legend: { display: false }, tooltip: { ...tooltipTheme(), displayColors: false } },
    scales: horizontal ? { x: valueAxis, y: catAxis } : { x: catAxis, y: valueAxis },
  }
}

/** Staafjes per maand (één reeks). */
export function MonthBars({ data, format = v => String(v), height = 170 }) {
  const opts = baseOptions({ yFormat: format })
  opts.plugins.tooltip.callbacks = { title: i => monthLabel(data[i[0].dataIndex].month), label: i => format(i.raw) }
  opts.scales.x.ticks.callback = (_, i) => monthLabel(data[i].month)
  opts.scales.x.ticks.maxTicksLimit = 6
  return (
    <div style={{ height }}>
      <Bar
        options={opts}
        data={{
          labels: data.map(d => d.month),
          datasets: [{ data: data.map(d => d.count), backgroundColor: accent(), borderRadius: 3, barPercentage: 0.8, categoryPercentage: 0.9 }],
        }}
      />
    </div>
  )
}

/** Lijn per maand (één reeks), bijv. mediane cost per wear. */
export function MonthLine({ data, valueKey, format = v => String(v), height = 170 }) {
  const opts = baseOptions({ yFormat: format })
  opts.plugins.tooltip.callbacks = { title: i => monthLabel(data[i[0].dataIndex].month), label: i => format(i.raw) }
  opts.scales.x.ticks.callback = (_, i) => monthLabel(data[i].month)
  opts.scales.x.ticks.maxTicksLimit = 6
  const c = accent()
  return (
    <div style={{ height }}>
      <Line
        options={opts}
        data={{
          labels: data.map(d => d.month),
          datasets: [{
            data: data.map(d => d[valueKey]), borderColor: c, borderWidth: 2, pointRadius: 0, pointHoverRadius: 5,
            pointHoverBackgroundColor: c, tension: 0.25, fill: true, backgroundColor: `${c}14`, spanGaps: true,
          }],
        }}
      />
    </div>
  )
}

/** Liggende staven met labels op de as; `colors` optioneel per staaf. */
export function LabelBars({ labels, values, colors, format = v => String(v), height }) {
  const opts = baseOptions({ yFormat: format, horizontal: true })
  opts.interaction = { mode: 'nearest', axis: 'y', intersect: false }
  opts.plugins.tooltip.callbacks = { label: i => format(i.raw) }
  const c = accent()
  return (
    <div style={{ height: height ?? Math.max(120, labels.length * 30 + 30) }}>
      <Bar
        options={opts}
        data={{
          labels,
          datasets: [{
            data: values,
            backgroundColor: colors ?? c,
            borderColor: colors ? 'rgba(0,0,0,0.12)' : undefined,
            borderWidth: colors ? 1 : 0,
            borderRadius: 4,
            barPercentage: 0.75,
          }],
        }}
      />
    </div>
  )
}

/** Prijs tegen cost per wear, één punt per stuk. */
export function PriceCpwScatter({ points, onPick, height = 230 }) {
  const opts = baseOptions({ yFormat: v => euro(v) })
  opts.interaction = { mode: 'nearest', intersect: true }
  opts.scales.x = { ...opts.scales.y, ticks: { ...tickTheme(), maxTicksLimit: 6, callback: v => `€${v}` } }
  opts.scales.y.type = 'logarithmic'
  opts.scales.y.beginAtZero = false
  opts.scales.y.ticks = { ...tickTheme(), callback: v => ([0.1, 0.5, 1, 5, 10, 50].includes(v) ? `€${v}` : '') }
  opts.plugins.tooltip.callbacks = {
    title: i => points[i[0].dataIndex].naam,
    label: i => `${euro(points[i.dataIndex].x)} · ${points[i.dataIndex].count}× · ${euro(points[i.dataIndex].y)} per keer`,
  }
  opts.onClick = (_, els) => { if (els[0] && onPick) onPick(points[els[0].index]) }
  const c = accent()
  return (
    <div style={{ height }}>
      <Scatter
        options={opts}
        data={{
          datasets: [{
            data: points.map(p => ({ x: p.x, y: Math.max(0.05, p.y) })),
            backgroundColor: `${c}99`, borderColor: chartColors().surface, borderWidth: 2, pointRadius: 5, pointHoverRadius: 7,
          }],
        }}
      />
    </div>
  )
}
