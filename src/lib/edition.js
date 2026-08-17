// Which build of the app this is: 'full' (Winnow) or 'seals' (Winnow Seals,
// the Sydney Seals pool-session builder). Selected at build time via
// VITE_EDITION (see vite.config.js, which also sets it from --mode seals).
export const EDITION = import.meta.env.VITE_EDITION === 'seals' ? 'seals' : 'full'
export const IS_SEALS = EDITION === 'seals'

export const APP_NAME = IS_SEALS ? 'Winnow Seals' : 'Winnow'
export const APP_TAGLINE = IS_SEALS ? 'Sydney Seals pool sessions' : 'Capture, tracking, and coaching'
