import { useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { PageWrapper } from '../components/layout/PageWrapper'
import { ImportSheet } from '../components/import/ImportSheet'
import { db, setSetting, BASE_ID } from '../db/db'
import { setBase, removeBase } from '../db/actions'
import { useLayers } from '../hooks/useLayers'
import { makeBase } from '../utils/layerImage'
import { PROMPT_PRODUCTFOTO } from '../constants/prompts'
import { useSetting } from '../hooks/useData'
import { takeFile } from '../utils/fileInput'
import { downloadFile } from '../utils/download'
import { exportBackupBlob, restoreBackup } from '../utils/backup'
import { parseAmount } from '../utils/format'
import { todayStr } from '../utils/stats'

const BUNDLED = `${import.meta.env.BASE_URL}data/Kleding.xlsx`
const BUNDLED_BASE = `${import.meta.env.BASE_URL}data/basispop.png`

function Card({ title, children }) {
  return (
    <div className="card mx-4 p-4">
      <div className="font-display text-xl leading-tight mb-2">{title}</div>
      {children}
    </div>
  )
}

const btn = 'w-full py-2.5 rounded-xl text-sm font-medium'
const btnStyle = { background: 'var(--color-surface-2)', color: 'var(--color-text)' }

export function MorePage() {
  const [importing, setImporting] = useState(null) // { buffer, fileName }
  const [msg, setMsg] = useState(null)
  const xlsxRef = useRef(null)
  const jsonRef = useRef(null)
  const baseRef = useRef(null)
  const layers = useLayers()
  const base = layers?.get(BASE_ID)
  const layerCount = layers ? [...layers.keys()].filter(k => k !== BASE_ID).length : 0
  const target = useSetting('doelCpw', 1)
  const theme = useSetting('theme', 'light')
  const counts = useLiveQuery(async () => ({
    items: await db.items.count(),
    wears: await db.wears.count(),
    photos: await db.photos.count(),
  }), [], null)

  async function loadBundled() {
    setMsg(null)
    try {
      const res = await fetch(BUNDLED, { cache: 'no-store' })
      if (!res.ok) throw new Error(`Meegeleverde Excel niet gevonden (${res.status}).`)
      setImporting({ buffer: await res.arrayBuffer(), fileName: 'Kleding.xlsx (meegeleverd)' })
    } catch (err) {
      setMsg(err.message)
    }
  }

  async function pickXlsx(e) {
    setMsg(null)
    try {
      const file = await takeFile(e)
      if (file) setImporting({ buffer: await file.arrayBuffer(), fileName: file.name })
    } catch (err) {
      setMsg(err.message)
    }
  }

  async function applyBase(fileOrUrl) {
    setMsg(null)
    try {
      const file = typeof fileOrUrl === 'string'
        ? new File([await (await fetch(fileOrUrl, { cache: 'no-store' })).blob()], 'basispop.png', { type: 'image/png' })
        : fileOrUrl
      if (file) await setBase(await makeBase(file))
    } catch (err) {
      setMsg(err.message)
    }
  }

  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); setMsg('Prompt gekopieerd.') } catch { setMsg('Kopiëren lukte niet.') }
  }

  async function backup() {
    const blob = await exportBackupBlob()
    await downloadFile(blob, `kledingkast-backup-${todayStr()}.json`, { title: 'Kledingkast back-up' })
    await setSetting('laatsteBackup', todayStr())
  }

  async function restore(e) {
    setMsg(null)
    try {
      const file = await takeFile(e)
      if (!file) return
      if (!window.confirm('Alles in de app vervangen door deze back-up?')) return
      const r = await restoreBackup(await file.text())
      setMsg(`Back-up teruggezet: ${r.items} stukken, ${r.wears} outfits, ${r.photos} foto's, ${r.layers} poplagen.`)
    } catch (err) {
      setMsg(err.message)
    }
  }

  async function wipe() {
    if (!window.confirm('Echt alles wissen? Kledingstukken, outfits en foto\'s zijn daarna weg. Maak eerst een back-up.')) return
    await Promise.all([db.items.clear(), db.wears.clear(), db.aliases.clear(), db.photos.clear(), db.layers.clear()])
    await db.settings.delete('meegeleverd') // zodat meegeleverde pop en lagen na een nieuwe import terugkomen
    setMsg('Alles gewist.')
  }

  async function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.classList.toggle('dark', next === 'dark')
    await setSetting('theme', next)
  }

  return (
    <PageWrapper title="Meer">
      <div className="space-y-4">
        {msg && <div className="mx-4 text-sm rounded-xl px-3 py-2" style={{ background: 'var(--color-accent-light)' }}>{msg}</div>}

        <Card title="Google Form importeren">
          <p className="text-xs text-muted mb-3">
            Lees de Google Sheet van je kledingformulier in. Dat kan zo vaak je wilt: formulieren die al binnen zijn
            worden overgeslagen. Download de sheet als .xlsx (Bestand → Downloaden → Microsoft Excel; in de Sheets-app
            op je iPhone: ⋯ → Delen en exporteren → Kopie opslaan als Excel).
          </p>
          <div className="space-y-2">
            <button onClick={loadBundled} className="btn-accent w-full py-2.5 text-sm">Meegeleverde Kleding.xlsx inlezen</button>
            <button onClick={() => xlsxRef.current?.click()} className={btn} style={btnStyle}>Kies een .xlsx-bestand</button>
            <input ref={xlsxRef} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden" onChange={pickXlsx} />
          </div>
        </Card>

        <Card title="Pop">
          <p className="text-xs text-muted mb-3">
            Je basispop: de grijze etalagepop waarop je outfits worden aangekleed. Per kledingstuk upload je in het stuk
            zelf een afbeelding van ChatGPT met het stuk aan op de magenta pop.
            {layerCount > 0 && ` ${layerCount} ${layerCount === 1 ? 'stuk heeft' : 'stukken hebben'} al een laag.`}
          </p>
          <div className="flex gap-3">
            {base && <img src={base.url} alt="Basispop" className="h-32 rounded-xl" style={{ background: 'var(--color-surface-2)' }} />}
            <div className="flex-1 space-y-2">
              {!base && <button onClick={() => applyBase(BUNDLED_BASE)} className="btn-accent w-full py-2.5 text-sm">Meegeleverde basispop gebruiken</button>}
              <button onClick={() => baseRef.current?.click()} className={btn} style={btnStyle}>{base ? 'Andere basispop' : 'Eigen basispop kiezen'}</button>
              {base && <button onClick={() => removeBase()} className={btn} style={btnStyle}>Basispop weghalen</button>}
              <button onClick={() => copyText(PROMPT_PRODUCTFOTO)} className={btn} style={btnStyle}>Kopieer productfoto-prompt</button>
            </div>
          </div>
          <input ref={baseRef} type="file" accept="image/png,image/*" className="hidden"
            onChange={async e => { try { const f = await takeFile(e); if (f) await applyBase(f) } catch (err) { setMsg(err.message) } }} />
        </Card>

        <Card title="Back-up">
          <p className="text-xs text-muted mb-3">
            Alles staat alleen op dit toestel. Bewaar af en toe een back-up in Bestanden of iCloud (foto's gaan mee).
          </p>
          <div className="space-y-2">
            <button onClick={backup} className={btn} style={btnStyle}>Back-up maken</button>
            <button onClick={() => jsonRef.current?.click()} className={btn} style={btnStyle}>Back-up terugzetten</button>
            <input ref={jsonRef} type="file" accept=".json,application/json" className="hidden" onChange={restore} />
          </div>
        </Card>

        <Card title="Instellingen">
          <label className="flex items-center justify-between gap-3 py-1.5">
            <span className="text-sm">Doel per keer dragen</span>
            <input
              key={target}
              defaultValue={String(target).replace('.', ',')}
              inputMode="decimal"
              onBlur={e => { const v = parseAmount(e.target.value); if (v > 0) setSetting('doelCpw', v) }}
              className="w-20 text-right px-2 py-1.5 rounded-lg text-sm outline-none"
              style={{ background: 'var(--color-surface-2)', color: 'var(--color-text)' }}
            />
          </label>
          <label className="flex items-center justify-between gap-3 py-1.5">
            <span className="text-sm">Donkere modus</span>
            <input type="checkbox" checked={theme === 'dark'} onChange={toggleTheme} className="w-5 h-5 accent-[var(--color-accent)]" />
          </label>
        </Card>

        <Card title="Over">
          <div className="text-xs text-muted space-y-1">
            {counts && <div>{counts.items} stukken · {counts.wears.toLocaleString('nl-NL')} outfits · {counts.photos} foto's</div>}
            <div>Versie {__APP_VERSION__} · {__BUILD_STAMP__}</div>
          </div>
          <button onClick={wipe} className="mt-3 text-xs font-medium text-red">Alles wissen</button>
        </Card>
      </div>

      {importing && <ImportSheet buffer={importing.buffer} fileName={importing.fileName} onClose={() => setImporting(null)} />}
    </PageWrapper>
  )
}
