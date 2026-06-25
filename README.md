# Freedive Log

A freediving capture, tracking, and coaching PWA.
Client-side only: data lives in the browser (IndexedDB) and round-trips to Dropbox via the API.
No backend.

Hosted on GitHub Pages at the custom domain: https://emiliatjernstrom.com/freedive-app/
(The `etjernst.github.io/freedive-app/` URL 301-redirects here, so OAuth and deep-links must use the custom domain.)

## Stack

- Svelte 5 and Vite, with `vite-plugin-pwa` (Workbox service worker, web manifest).
- IndexedDB for the offline source of truth, Dropbox API for backup and sync, local-file export/import as the zero-setup fallback.
- Built and deployed to GitHub Pages by `.github/workflows/deploy.yml` on push to `main`, so the site never needs a local build.

## Routing (pinned)

The app is a single-page client served under the Pages base path.
These three URL shapes are fixed so OAuth and deep-links resolve on the live origin.

- Base path `/freedive-app/` drives the Vite `base`, the manifest scope, and the service worker `navigateFallback`.
- OAuth callback returns to `https://emiliatjernstrom.com/freedive-app/`; the Dropbox PKCE response is read from the query string on load, then stripped from the URL. App-folder scoped, public client, no secret.
- Session deep-link is `/freedive-app/?s=<sessionId>`, a query param rather than a path segment, so GitHub Pages serves `index.html` without per-route 404s. Coaching citations link here.

## Layout

- `schema/` holds the JSON Schema, the capacity and vocabulary reference, and the validator.
- `seed/` holds the fixture exercise templates (the seed library).
- `src/` holds the app.

## Develop

```
npm install
npm run dev      # local dev server
npm run build    # production build into dist/
npm run preview  # serve the production build
```

Validate the seed library against the schema:

```
python schema/validate.py
```
