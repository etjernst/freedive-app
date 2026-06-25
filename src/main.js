import { mount } from 'svelte'
import './app.css'
import App from './App.svelte'
import { initPWA } from './lib/pwa.svelte.js'
import { initApp } from './lib/store.svelte.js'

initPWA()
// Open the database, request persistent storage, and seed the library on
// first run. Fire-and-forget: the shell renders against reactive state that
// fills in as this resolves.
initApp()

const app = mount(App, {
  target: document.getElementById('app'),
})

export default app
