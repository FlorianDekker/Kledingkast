import { useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { PageWrapper } from '../components/layout/PageWrapper'
import { ImportSheet } from '../components/import/ImportSheet'
import { db, setSetting } from '../db/db'
import { useSetting } from '../hooks/useData'
import { takeFile } from '../utils/fileInput'
import { downloadFile } from '../utils/download'
import { exportBackupBlob, restoreBackup } from '../utils/backup'
import { parseAmount } from '../utils/format'
import { todayStr } from '../utils/stats'

const BUNDLED = `${import.meta.env.BASE_URL}data/Kleding.xlsx`

function Card({ title, children }) {
  return (
    <div className="card mx-4 p-4">
      <div className="text-sm font-semibold mb-2">{title}</div>
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
      setMsg(`Back-up teruggezet: ${r.items} stukken, ${r.wears} outfits, ${r.photos} foto's.`)
    } catch (err) {
      setMsg(err.message)
    }
  }

  async function wipe() {
    if (!window.confirm('Echt alles wissen? Kledingstukken, outfits en foto\'s zijn daarna weg. Maak eerst een back-up.')) return
    await Promise.all([db.items.clear(), db.wears.clear(), db.aliases.clear(), db.photos.clear()])
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
