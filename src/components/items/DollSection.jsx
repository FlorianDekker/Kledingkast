import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { OutfitDoll } from './OutfitDoll'
import { BASE_ID } from '../../db/db'
import { saveItem, setLayer, removeLayer } from '../../db/actions'
import { useLayers, canTuck } from '../../hooks/useLayers'
import { makeLayer } from '../../utils/layerImage'
import { takeFile } from '../../utils/fileInput'
import { promptOpDePop } from '../../constants/prompts'

/** "Op de pop" in het detailscherm van een kledingstuk. */
export function DollSection({ item }) {
  const layers = useLayers()
  const fileRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState(null)
  const [copied, setCopied] = useState(false)

  if (!layers) return null
  const hasBase = layers.has(BASE_ID)
  const layer = layers.get(item.id)

  async function pick(e) {
    setNote(null)
    try {
      const file = await takeFile(e)
      if (!file) return
      setBusy(true)
      const { coverage: _c, background, ...stored } = await makeLayer(file)
      await setLayer(item.id, stored)
      if (background !== 'transparant') {
        setNote('De achtergrond was niet echt doorzichtig; die is weggeveegd. Check of er geen stukjes van het kledingstuk zijn meegegaan.')
      }
    } catch (err) {
      setNote(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(promptOpDePop(item.naam))
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setNote('Kopiëren lukte niet.')
    }
  }

  return (
    <div className="rounded-2xl p-3" style={{ background: 'var(--color-surface-2)' }}>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted mb-2">Op de pop</div>
      <div className="flex gap-3">
        {hasBase && layer && (
          <div className="rounded-xl" style={{ background: 'var(--color-surface)' }}>
            <OutfitDoll items={[item]} layers={layers} height={180} />
          </div>
        )}
        <div className="flex-1 min-w-0 flex flex-col gap-2 items-start text-sm">
          {!hasBase && (
            <p className="text-xs text-muted">
              Stel eerst je basispop in via <Link to="/meer" className="font-medium" style={{ color: 'var(--color-accent)' }}>Meer</Link>.
            </p>
          )}
          {!layer && (
            <p className="text-xs text-muted">
              Laat ChatGPT dit stuk aantrekken op je magenta pop en upload die afbeelding. De app knipt de pop eruit.
            </p>
          )}
          <button onClick={() => fileRef.current?.click()} disabled={busy} className="font-semibold disabled:opacity-50" style={{ color: 'var(--color-accent)' }}>
            {busy ? 'Bezig met knippen…' : layer ? 'Andere afbeelding' : 'Afbeelding uploaden'}
          </button>
          <button onClick={copyPrompt} className="text-muted">{copied ? '✓ Prompt gekopieerd' : 'Kopieer prompt voor ChatGPT'}</button>
          {layer && <button onClick={() => removeLayer(item.id)} className="text-muted">Weghalen</button>}
          {layer && canTuck(item) && (
            <label className="flex items-center gap-2 mt-1">
              <input
                type="checkbox"
                checked={!!item.ingestopt}
                onChange={e => saveItem({ ...item, ingestopt: e.target.checked })}
                className="accent-[var(--color-accent)]"
              />
              Ingestopt (onder de broek)
            </label>
          )}
        </div>
      </div>
      {note && <div className="text-xs mt-2" style={{ color: 'var(--color-orange)' }}>{note}</div>}
      <input ref={fileRef} type="file" accept="image/png,image/*" className="hidden" onChange={pick} />
    </div>
  )
}
