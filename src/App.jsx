import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { db } from './db/db'
import { applyBundled } from './db/bundled'
import { BottomNav } from './components/layout/BottomNav'
import { TodayPage } from './pages/TodayPage'
import { WardrobePage } from './pages/WardrobePage'
import { StatsPage } from './pages/StatsPage'
import { MorePage } from './pages/MorePage'
import { applySheetMargin, DEFAULT_SHEET_MARGIN } from './utils/theme'

export const BASENAME = '/Kledingkast'

export default function App() {
  useEffect(() => {
    db.settings.get('theme').then(row => {
      document.documentElement.classList.toggle('dark', (row?.value ?? 'light') === 'dark')
    })
    applySheetMargin(DEFAULT_SHEET_MARGIN)
    applyBundled()
  }, [])

  // Gedraag je als app: geen terugveeg aan de linkerrand, geen knijpzoom.
  // (Dubbeltik-zoom en zoom-bij-invoer regelt index.css / de viewport-tag.)
  useEffect(() => {
    const edge = e => { if (e.touches[0].clientX < 20) e.preventDefault() }
    const pinch = e => { if (e.touches.length > 1) e.preventDefault() }
    const gesture = e => e.preventDefault() // Safari: gesturestart/-change
    document.addEventListener('touchstart', edge, { passive: false })
    document.addEventListener('touchmove', pinch, { passive: false })
    document.addEventListener('gesturestart', gesture)
    document.addEventListener('gesturechange', gesture)
    return () => {
      document.removeEventListener('touchstart', edge)
      document.removeEventListener('touchmove', pinch)
      document.removeEventListener('gesturestart', gesture)
      document.removeEventListener('gesturechange', gesture)
    }
  }, [])

  return (
    <BrowserRouter basename={BASENAME}>
      <div className="flex flex-col min-h-screen bg-bg" style={{ color: 'var(--color-text)' }}>
        <Routes>
          <Route path="/" element={<TodayPage />} />
          <Route path="/kast" element={<WardrobePage />} />
          <Route path="/statistieken" element={<StatsPage />} />
          <Route path="/meer" element={<MorePage />} />
        </Routes>
        <BottomNav />
      </div>
    </BrowserRouter>
  )
}
