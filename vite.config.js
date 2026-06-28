import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages serves this project site under /freedive-app/.
// base must match so asset URLs, the service worker scope, and the
// manifest start_url all resolve correctly on the live origin.
const base = '/freedive-app/'

// https://vite.dev/config/
export default defineConfig({
  base,
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
        name: 'Winnow',
        short_name: 'Winnow',
        description: 'Freediving capture, tracking, and coaching log',
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
})
