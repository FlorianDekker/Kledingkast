// Laat Node de extensieloze imports van de Vite-bronnen oplossen (.js / .jsx)
import { existsSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve as res } from 'node:path'

export async function resolve(specifier, context, next) {
  if (specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) {
    const base = dirname(fileURLToPath(context.parentURL))
    for (const ext of ['.js', '.jsx', '/index.js']) {
      const p = res(base, specifier + ext)
      if (existsSync(p)) return next(pathToFileURL(p).href, context)
    }
  }
  return next(specifier, context)
}
