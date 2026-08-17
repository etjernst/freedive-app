import { mount } from 'svelte'
import './app.css'
import App from './App.svelte'
import { initPWA } from './lib/pwa.svelte.js'
import { initApp } from './lib/store.svelte.js'
import { initBackNav } from './lib/backnav.js'
import { APP_NAME } from './lib/edition.js'

// index.html carries a static <title>Winnow</title>; set it from the edition
// here so the seals build reads "Winnow Seals" in the tab and app switcher.
document.title = APP_NAME

initPWA()
// Open the database, request persistent storage, and seed the library on
// first run. Fire-and-forget: the shell renders against reactive state that
// fills in as this resolves. Back-navigation arms after init so the OAuth
// callback's URL cleanup never touches the sentinel entry.
initApp().then(initBackNav)

const app = mount(App, {
  target: document.getElementById('app'),
})

export default app
