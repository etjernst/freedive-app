import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { VitePWA } from 'vite-plugin-pwa'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const isSeals = mode === 'seals' || process.env.VITE_EDITION === 'seals'
  const edition = isSeals ? 'seals' : 'full'

  // GitHub Pages serves each edition under its own project path so the base
  // must match, for asset URLs, the service worker scope, and the manifest
  // start_url to resolve correctly on the live origin.
  const base = isSeals ? '/winnow-seals/' : '/freedive-app/'

  return {
    base,
    // Read by src/lib/edition.js to pick the app name, tagline, and DB name.
    define: {
      'import.meta.env.VITE_EDITION': JSON.stringify(edition),
    },
    resolve: {
      alias: {
        // The exercise library import: canon fixtures for the full edition,
        // the seals-only catalog for the seals edition.
        $fixtures: path.resolve(
          __dirname,
          isSeals ? 'seed/fixtures.seals.json' : 'seed/fixtures.json',
        ),
      },
    },
    plugins: [
      svelte(),
      VitePWA({
        // 'prompt', not 'autoUpdate': a new service worker waits and we show
        // an update banner. We never skip-waiting behind the user's back,
        // because that reloads the page and would discard a half-filled
        // capture form. The app calls skipWaiting only when the user accepts.
        registerType: 'prompt',
        injectRegister: null,
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,ico,json}'],
          // SPA fallback so deep-links (e.g. /freedive-app/session/<id>)
          // resolve to index.html when offline.
          navigateFallback: base + 'index.html',
        },
        manifest: {
          name: isSeals ? 'Winnow Seals' : 'Winnow',
          short_name: isSeals ? 'Winnow Seals' : 'Winnow',
          description: isSeals
            ? 'Sydney Seals pool session builder and log'
            : 'Freediving capture, tracking, and coaching log',
          theme_color: '#f4f2ea',
          background_color: '#f4f2ea',
          display: 'standalone',
          orientation: 'portrait',
          icons: [
            { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
            {
              src: 'icons/icon-512-maskable.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        devOptions: { enabled: false },
      }),
    ],
  }
})
