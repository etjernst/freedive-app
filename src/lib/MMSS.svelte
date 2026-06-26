<script>
  import { parseMMSS, fmtMMSS } from './settings.js'

  // mm:ss text input that writes back a seconds number through bind:seconds.
  // The text is the source of truth while editing, so parsing never reformats
  // mid-keystroke; the seed value formats once at mount.
  let { seconds = $bindable(null), placeholder = 'm:ss', id = undefined } = $props()
  let text = $state(fmtMMSS(seconds))

  function onInput(e) {
    text = e.target.value
    seconds = parseMMSS(text)
  }
</script>

<input {id} {placeholder} inputmode="numeric" value={text} oninput={onInput} />
