<script>
  import { parseMMSS, fmtMMSS, autoColon } from './settings.js'

  // mm:ss text input that writes back a seconds number through bind:seconds.
  // The mobile numeric keypad has no ":", so digit-only entry is formatted
  // timer-style: the last two digits are seconds ("230" -> "2:30"). One or two
  // bare digits stay plain seconds; text containing ":" is left as typed.
  let { seconds = $bindable(null), placeholder = 'm:ss', id = undefined, disabled = false } = $props()
  let text = $state(fmtMMSS(seconds))

  // Re-sync the display when seconds changes from outside (e.g. a rep reorder
  // hands this index-keyed input a different rep). While the user types,
  // seconds always equals parseMMSS(text), so this never reformats a keystroke;
  // Object.is treats NaN as equal so partial garbage input is left alone.
  $effect(() => {
    if (!Object.is(parseMMSS(text), seconds)) text = fmtMMSS(seconds)
  })

  function onInput(e) {
    text = autoColon(e.target.value)
    if (e.target.value !== text) e.target.value = text
    seconds = parseMMSS(text)
  }
</script>

<input {id} {placeholder} {disabled} inputmode="numeric" value={text} oninput={onInput} />
