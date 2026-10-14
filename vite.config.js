import { readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const pkg = JSON.parse(readFileSync(fileURLToPath(new URL('./package.json', import.meta.url)), 'utf-8'))

// Build-stempel (commit + tijd) voor op de Meer-pagina: zo zie je op de
// telefoon of de PWA de nieuwste versie draait.
function buildStamp() {
  let hash = 'dev'
  try { hash = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() } catch { /* geen git */ }
  const d = new Date()
  const pad = n => String(n).padStart(2, '0')
  return `${hash} · ${pad(d.getDate())}-${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default defineConfig({
  base: '/Kledingkast/',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_STAMP__: JSON.stringify(buildStamp()),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/*.png'],
      manifest: {
        name: 'Kledingkast',
        short_name: 'Kast',
        lang: 'nl',
        description: 'Log wat je draagt en zie wat je kleding je per keer kost',
        theme_color: '#F5F3EE',
        background_color: '#F5F3EE',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/Kledingkast/',
        scope: '/Kledingkast/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        navigateFallback: '/Kledingkast/index.html',
      },
    }),
  ],
})
