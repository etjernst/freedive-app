import { app, popView } from './store.svelte.js'

// Hardware/browser back inside the app. A sentinel history entry absorbs each
// back press, so back walks the app's own view trail instead of closing a
// standalone PWA. On the entry view, the first press shows a hint and arms a
// short window; a second press inside it lets the back action fall through,
// which closes the installed app (or leaves the page in a plain tab).
const EXIT_WINDOW_MS = 2000
let armedAt = 0

function arm() {
  history.pushState({ winnow: 'sentinel' }, '', window.location.href)
}

export function initBackNav() {
  arm()
  window.addEventListener('popstate', () => {
    if (popView()) {
      arm()
      return
    }
    if (Date.now() - armedAt < EXIT_WINDOW_MS) {
      // Second press: we are on the base entry now; one more step leaves.
      history.back()
      return
    }
    armedAt = Date.now()
    app.exitHint = true
    setTimeout(() => (app.exitHint = false), EXIT_WINDOW_MS)
    arm()
  })
}
