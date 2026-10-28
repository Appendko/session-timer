# HTML Session Timer: Design

Date: 2026-10-28
Status: approved in brainstorming. The user waived the review of each section ("go ahead, I'll update if there are problems").

## Purpose

The institute's conference PC ran a PyInstaller-packaged Python timer (`ref/timer.exe`). Trend Micro Apex One quarantined it as "Unauthorized file encryption", most likely a behaviour-based false positive. The packed exe extracts itself to %TEMP%, writes WAV files to a `pres-timer-*` temp folder and rewrites `%APPDATA%\PresentationTimer\settings.json` on every change. This design replaces it with **one self-contained HTML file** that reproduces the timer's behaviour in Chrome or Edge, opened from `file://`, with nothing to install and nothing written to disk.

`ref/presentation_timer.py` and `ref/README.txt` are the feature spec. They are not a design to copy.

## Hard constraints

- The output is one file, `D:\timer\timer.html`. Nothing is created, changed or removed under `D:\timer\ref\`, and that folder is read-only.
- All CSS and JS are inline. No CDN, no external fonts, no network requests of any kind. Plain HTML/CSS/JS with no build step.
- It must work from `file://` in current Chrome and Edge.
- The page writes no files. localStorage is used. It lives inside the browser profile and the page never creates a file.
- The browser itself blocks every network request: `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'">`. Even a mistake in the code can't reach the network.

## Scope

### Kept from the original (full parity)
- Count down from a talk length, or count up. Overtime keeps counting with a minus sign.
- The original colour rule, unchanged.
- A full cue list: time, label, ring, on/off; add, edit, delete; `!` marks a cue the clock can't reach; "already passed" handling; duplicate-time rejection.
- Banner and screen flash on each cue; a "Time's up" flurry with 8 flashes.
- Status line and progress strip with a notch per cue.
- Toggles: Count down, Clock only, Full screen, Mute.
- Appearance: clock font picker, clock size (Auto or fixed), cue banner text size.
- Saved settings and cues.

### Dropped
- "On top": a browser can't keep a window above others.
- The `--sound-test` and `--selftest` command-line modes, the report files and the audio-fallback chain. Web Audio replaces all of them, and `#selftest` replaces the self-test (see Testing).
- All file writes.

### Added
- Preset talk lengths: 5, 10, 12, 15, 20 and 30 min.
- Shortcuts for the session chair (below).
- Saving the running clock across reloads.
- Bells scheduled on the audio clock so they ring on time in a hidden tab.
- Screen Wake Lock, with a warning if it is refused.
- Status pills for "sound locked" and "screen may sleep".
- Reset confirmation as a box on the page (a browser `confirm()` would exit full screen).

## Layout (option A, stacked, as in the original)

From top to bottom, full width, on the original's dark palette (INK `#12151C`, PANEL `#1A1F29`, EDGE `#2A3140`, PAPER `#ECEAE4`, MUTED `#7C8698`, GREEN `#4FB477`, AMBER `#E8A33D`, RED `#D8503E`):

1. **Banner**: cue or message text, size 10–72 pt (default 13), coloured per message.
2. **Clock**: drawn on a `<canvas>` so the digits' ink, not the line box, is centred (as in the original). The canvas is scaled by devicePixelRatio.
3. **Status line**: `Ready|Running|Paused · elapsed X of Y` (counting down) or `· of Y` (counting up) `· next cue <label> in T · muted`.
4. **Progress strip**: elapsed share of the span. The span is the talk length, or the latest cue's time, or 10 min if there are neither. The fill is green while running, grey otherwise, red once past the span. There is a notch per enabled, reachable cue inside the span: grey before it rings, white after.
5. **Status pills** (shown only when needed): "🔇 Click anywhere to enable sound", "Screen may sleep: check Windows power settings", "No sound in this browser: screen flash only".
6. **Control bar**:
   - Row 1: Start/Pause/Resume (primary green), Reset; on the right, the tick boxes Count down, Clock only, Full screen, Mute.
   - Row 2: "Talk length" MM:SS (minutes 0–599, seconds 0–59, zero-padded on blur), Set, Clear, presets 5/10/12/15/20/30.
7. **Panel** (hidden by Clock only):
   - The cue table: On (● / ○ / !), Clock reads, Cue, Ring. Click a row to select it, double-click to edit. Rows are coloured grey when off, green when done, red when unreachable.
   - The editor row: MM:SS, label, ring (single/double/triple/flurry), Add cue or Save cue, Hear it, and Cancel (shown only while editing). Enter in the label field commits.
   - Actions on the selected cue: Edit, On / off, Delete.
   - Appearance: Clock font, Clock size (Auto, or a fixed value from 24, 32, 40, 48, 56, 64, 72, 88, 104, 120, 144, 168, 200, 240, 300, 360, 440, 520, 600), Cue text (10–72).
   - Hint text: "A cue rings when the clock above reads its time. Double click a cue to edit it. Press ? for keys."

**Clock only** hides only item 7, which matches the original. The control bar, status line, strip and pills stay.

**Key list overlay**: `?` opens and closes it. It lists every shortcut.

## Behaviour

### Timekeeping
- States: `idle`, `running`, `paused`. `elapsed = banked + (now − segmentStart)` while running, otherwise `banked`. The page never counts ticks.
- `now` is `performance.now()`, which is monotonic. Each run records its start on both clocks, `performance.now()` and `Date.now()`. When the segment's length is computed, the page uses the monotonic one unless the two disagree by more than 2 s (the PC slept and one clock paused). In that case it uses the wall-clock length so the time spent asleep isn't lost.
- Redraws run on `requestAnimationFrame` while the page is visible, with a 250 ms `setInterval` as backup. Cues are checked in the same loop and on `visibilitychange`. Accuracy never depends on how often either fires.

### Display
- Counting down only happens while a talk length is set and Count down is ticked. Then `remaining = target − elapsed`, and the reading is `ceil(remaining)` while remaining > 0.
- Overtime shows `00:00` until a full second over, then `-00:01`, `-00:02` and so on (−floor(overrun)). This fixes the original, which could show `-00:00`.
- Counting up, the reading is `floor(elapsed)`.
- The format is `MM:SS`, or `H:MM:SS` from one hour.
- Colour (the original rule): with a talk length, the clock is red if remaining < 0, amber if remaining ≤ max(60, 10% of target), green if running, white otherwise. Without a talk length it is green if running, white otherwise. Paused always shows grey. While a flash is running, the clock's own colour is overridden.

### Fitting the clock
- **Auto:** measure the current text with canvas `measureText` (ink width, plus `actualBoundingBoxAscent` and `Descent` of the digits). Target an ink height of 95% of the clock area's height. With Clock only and Full screen both on, target 75% of the screen height instead, capped at 98% of the area. Then shrink until the width fits: 96% of the width, or 99.5% with Clock only and Full screen.
- **Fixed size:** pt × 96/72 gives the font size in px, capped to the same limits so the digits are never clipped.
- The clock is refitted whenever the window is resized, the number of characters changes (e.g. `-` appears, or the clock reaches an hour), a toggle changes, the font changes or the cue text size changes.

### Fonts
- Candidates: the original's list, limited to faces likely on Windows or common installs (Consolas, Cascadia Mono, Cascadia Code, Lucida Console, Courier New, JetBrains Mono, Fira Mono, Roboto Mono, Source Code Pro, IBM Plex Mono, Noto Sans Mono, DejaVu Sans Mono, Arial Narrow, Roboto Condensed, Oswald, Bebas Neue, Haettenschweiler, Segoe UI, Arial, Verdana, Tahoma, Trebuchet MS, Franklin Gothic Medium, Century Gothic, Impact, Georgia, Times New Roman).
- A font counts as installed if its canvas-measured width differs from **either** the `monospace` or the `sans-serif` fallback. A missing font matches both. Consolas matches `monospace` on Windows but not `sans-serif`.
- Order, as in the original: faces whose digits all have the same width come first, then the rest, narrowest first within each group by the width of "09:59".
- Steady digits in any font: canvas has no `fontVariantNumeric` in current Edge (checked 2026-10-28), so each digit is drawn centred in a cell as wide as the widest digit. Other characters (`:`, `-`) use their own width.
- The default is the first of Consolas, Cascadia Mono or Courier New that is installed. If a saved font is no longer installed, the default is used.

### Cues (the original's semantics)
- A cue's time means **"the clock reads this"**. `fireAt(cue)` is `target − cue.at` when counting down. That gives `null`, meaning unreachable, if `cue.at > target`. When counting up, `fireAt(cue)` is `cue.at`.
- Cue times may be 0:00. A talk length must be > 0 ("Time must be greater than zero.").
- **Time fields** are minutes 0–599 and seconds 0–59. They are read with `readPair(min, sec)`, which floors the value, clamps it to range and turns non-numbers into 0, giving `m*60+s`. On blur the fields are zero-padded again. This fixes a bug in the original: it passed "MM:SS" through a parser that rejected minutes > 59, so a 90-minute talk couldn't be set. Free-text time parsing is no longer needed.
- **Adding or saving a cue** is rejected, with a red banner, if the clock can never reach it ("Counting down from 03:00, the clock never reads 05:00."). It is rejected with an amber banner if another cue has the same time. If the cue's `fireAt` has already passed, it is marked done and the banner says "Added 02:00: already passed, so it won't ring this run."
- **Sorting:** cues are listed in the order they will ring, with unreachable ones last.
- **Re-arming:** when the talk length changes, it is cleared, or Count down is toggled, each cue's done flag is recomputed as `fireAt ≠ null && elapsed ≥ fireAt`. Unreachable enabled cues give a red banner: "Marked ! and silent: the clock never reads 05:00, 06:00 counting down from 03:00."
- Toggling a cue on again re-arms it only if its time is still ahead.
- **Firing** (JS check, while running): every enabled, not-done cue with `elapsed ≥ fireAt` is marked done. The banner (amber) reads "label + label"; a cue without a label shows its time. The screen flashes 5 times: background AMBER and digits INK, alternating every 170 ms. The cue table updates.
- **Time's up:** when `elapsed ≥ target` for the first time, the banner turns red and reads "Time's up", or "Time's up · <cue labels>" when a cue's `fireAt == target` fired in the same check. The screen flashes 8 times.
- Banners clear after 9 s. A red banner keeps its colour through a flash.
- **Reset** sets elapsed to 0 and the state to idle, re-arms every cue, sets time's-up back to not fired and clears the banner.

### Sound
- **Bell synthesis:** a port of the original's `strike_samples()` and `make_wav_bytes()`. On the first unlock, JS renders one 2 s strike at 44.1 kHz into a Float32Array: six inharmonic partials at F0 = 1560 Hz (ratios, amplitudes and decay rates copied from `BELL_PARTIALS`), a 6 ms hammer-noise burst (seeded PRNG), the attack and release envelope, and a 5.4 Hz wobble. It then mixes the four ring profiles (single, double, triple, flurry; repeat strikes at gain 0.82) and normalises each to a peak of 0.62, giving four `AudioBuffer`s.
- **Unlock:** a single `AudioContext` is created on load. If its state isn't `running`, the "click anywhere to enable sound" pill is shown. The first `pointerdown` or `keydown` anywhere calls `resume()`. `statechange` updates the pill and triggers a reschedule.
- **Scheduling on the audio clock:** while running and unlocked, every enabled, not-done, reachable cue with `fireAt > elapsed` gets an `AudioBufferSourceNode`, started at `ctx.currentTime + (fireAt − elapsed)`. Time's up gets the flurry at `target − elapsed`, unless a cue has `fireAt == target`. In that case only that cue's ring plays, as in the original. All scheduled nodes are stopped and scheduled again after start, resume, ↑/↓ adjustment, a talk-length or direction change, any edit, toggle or delete of a cue, unlock, and un-muting. Pause, reset, muting, stopping the timer and `pagehide` stop them all.
- **Avoiding double rings:** when the JS check fires a cue that had a scheduled node, no further sound is played. If it had none (audio was locked when it should have been scheduled), the ring is played immediately. When several cues come due at once, only the ring of the one with the latest `fireAt` plays, as in the original.
- **Mute:** no sound; the flash and banner still happen. "muted" appears in the status line.
- **Hear it:** plays the ring chosen in the editor immediately, even when muted (it's a preview). If the context is still locked, the click itself unlocks it.
- **No Web Audio:** the pill reads "No sound in this browser: screen flash only" and the timer works without sound.

### Shortcuts (ignored while a text, number or select field has focus, except Esc)
| Key | Action |
|---|---|
| Space | Start / pause / resume |
| R | Reset (asks first while running) |
| ↑ / ↓ | The clock reading +1 / −1 min |
| Shift+↑ / Shift+↓ | The clock reading +10 / −10 s |
| F | Full screen on/off |
| C | Clock only on/off |
| M | Mute on/off |
| Esc | Leave a text field, then close the key list or reset box, then turn off Clock only. In full screen the browser takes Esc first and leaves full screen. |
| ? | Key list on/off |

- **Adjusting** changes the shown number. Counting down, ↑ subtracts 60 s from elapsed; counting up, ↑ adds 60 s. Elapsed is clamped to ≥ 0. When counting down this means ↑ can't push the time left above the talk length.
- After an adjustment, cues whose `fireAt` is now ahead are re-armed, and cues jumped past are marked done **silently**. The time's-up flag is recomputed the same way (`elapsed ≥ target`), also silently.
- Adjusting works in every state. In idle, the first adjustment makes the state paused with that amount banked, so Start continues from the adjusted reading.
- **Reset box:** a small modal on the page reading "The timer is running. Reset to 00:00?" with Enter or the Reset button to confirm, and Esc or Cancel to cancel. While the timer isn't running, Reset happens at once.
- **Clicking the clock area** blurs any focused field, so Space works again (as in the original).

### Full screen
- `document.documentElement.requestFullscreen()` is triggered by the Full screen tick box or the F key, and `exitFullscreen()` turns it off. `fullscreenchange` keeps the tick box in sync. If the request fails, the box is unticked.
- The full-screen state is not restored after a reload, because browsers require a click or key press first.

### Wake lock
- `navigator.wakeLock.request('screen')` is called whenever the page is visible, from load onward. A conference PC showing the timer should never sleep. It is requested again on `visibilitychange` (when the page becomes visible again) and when the lock reports `release`.
- If the API is missing or the request is rejected, the "Screen may sleep: check Windows power settings" pill is shown and nothing else changes.

### Saving (localStorage key `sessionTimer.v1`)
- **Stored:** `{version:1, target, countdown, muted, clockOnly, clockFont, clockSize, cueSize, cues:[{at,label,sound,enabled}], clock:{state, bankedMs, segmentStartWall}}`.
- **When:** written on every user change and on every clock state change (start, pause, reset, adjust). It is never written per tick.
- **Restoring:** each field is validated with the same limits as the UI; anything invalid falls back to its default. If `clock.state` is `running`, `elapsed = bankedMs + (Date.now() − segmentStartWall)` and the timer continues running. Every cue with `fireAt ≤ elapsed` is marked done silently, and so is time's up. After a reload the sound starts locked, so the pill asks for a click, and clicking schedules the remaining bells.
- **Not stored:** full screen, done flags (always recomputed), the current banner.
- If storage is unavailable or throws, everything is wrapped in try/catch and the page works without it. No message is shown, as in the original.
- If two tabs are open, each saves to the same key and the last write wins. This is not handled further.

## Addendum (2026-10-28): overtime is the discussion

Requested after the first build, for slots like 20 min = 15 min talk + 5 min discussion.

- **No minus sign.** Counting down past the talk length, the clock counts **up from 00:00** (`floor(elapsed − target)`), in red, as before. This replaces the `-00:01` overtime display described above.
- **"Discussion" label.** While a talk length is set, the timer isn't idle and `elapsed ≥ target`, the banner shows "Discussion" in red whenever no other message is showing. Cue and "Time's up" messages still take precedence for their 9 s.
- **Discussion cues.** The cue editor has a Talk/Discussion picker. A discussion cue at `MM:SS` is stored as `at = −seconds` and rings at `target + seconds`, which is when the discussion clock reads `MM:SS`. This works the same counting down or up. With no talk length it is unreachable (`!`, "Marked ! and silent: discussion cues need a talk length."). Adding one with no talk length is rejected ("Set a talk length first: a discussion cue rings after the talk ends."). Discussion 00:00 is rejected: use a Talk cue at 00:00 for the end of the talk. The list shows the time as `05:00 (discussion)`.
- **Strip.** The span is max(talk length, latest enabled cue), so the strip covers the whole slot. The fill turns red once the talk length is passed.
- **↑/↓** still mean "a bigger or smaller number on the clock". In the discussion that adds to or subtracts from elapsed time.
- **Storage** accepts `at` in −35999…35999. The format stays version 1, so existing saved cues still load.
- The clock canvas sets `aria-label` to its current reading.

Example setup for 15 + 5: talk length 15:00; Talk cue 03:00 "3 min left" (single); Talk cue 00:00 "Talk over" (double; it replaces the flurry at the end of the talk); Discussion cue 05:00 "End of discussion" (flurry).

## Code structure

One `<script>` inside `timer.html`, in sections, without modules (so it works on `file://`):

1. **engine**: pure functions and a `Timer` object that takes `now` as an argument. `formatHms`, `parseTime`, `Timer` (start, pause, toggle, reset, adjust, elapsed), `fireAt`, `colourStage`, `shownSeconds`, `dueCues`, `rearm`. No DOM, no global time, so it can be tested with a fake clock.
2. **audio**: bell synthesis, the four buffers, unlock, play-now, schedule-all and cancel-all.
3. **storage**: `load()` (validates and returns a state) and `save(state)` (in try/catch).
4. **ui**: builds the DOM, wires events and shortcuts, fits and draws the clock canvas, the banner, the flash, the cue table, the pills, and wake lock and full screen.
5. **selftest**: runs when the URL contains `#selftest`.

CSS is inline in one `<style>`, using the palette as CSS custom properties. The page is dark only, since it's a stage display, and the body background is set explicitly.

## Error handling summary
| Failure | Behaviour |
|---|---|
| AudioContext locked | Pill; the first click or key press unlocks; bells are scheduled again |
| No Web Audio | Pill "screen flash only"; everything else works |
| Wake lock refused or missing | Pill "Screen may sleep" |
| Full screen refused | Tick box unticked |
| localStorage throws or holds bad data | Defaults; works without saving |
| Saved font not installed | Default font |
| Out-of-range or non-numeric time typed | Clamped into range (non-numbers become 0) and zero-padded on blur; a zero talk length gives a red banner |
| PC slept | Wall-clock check fixes elapsed on the next frame; cues in between fire when the page wakes |

## Testing and verification

1. **`timer.html#selftest`** shows an overlay with PASS/FAIL per check and a summary line, and logs it to the console. The checks:
   - The original's `formatHms` cases, and `readPair` clamping (`"abc"` gives 0, minutes over 599 and seconds over 59 are clamped, `"599","59"` gives 35999).
   - Timer segments with a fake clock: start, pause, resume, reset, and no advance while paused.
   - `fireAt` counting down and up, and unreachable cues.
   - Colour stages at the boundaries.
   - Overtime display (no `-00:00`).
   - Adjust: clamping, re-arming, and cues jumped past going silent.
   - The coincident 0:00 cue together with time's up.
   - The sleep correction in the timing loop.
   - A save-and-restore round trip, including a running clock.
   - Bell buffers: the four lengths match `max(offset)·SR + 2·SR`, peak ≤ 0.62 and > 0.2, silent first and last samples, onset under 5 ms, and decay that keeps falling.
2. **Run the self-test headless**: `msedge --headless --dump-dom "file:///D:/timer/timer.html#selftest"`, then check that the summary in the output reads all passed.
3. **No network**:
   - A static scan of `timer.html` for `http:`, `https:`, `//` URLs in `src`/`href`, `fetch(`, `XMLHttpRequest`, `WebSocket`, `@import`, `url(` and `<link`. The expected result is no matches.
   - Load the page in headless Edge with `--log-net-log` and confirm no requests other than the `file://` page.
4. **Accuracy in a hidden tab**:
   - The engine tests cover the arithmetic.
   - For real behaviour, add a `#debug` hash that logs each cue's planned and actual times to the console (`ctx.currentTime` at scheduling, the JS fire time compared with the expected time).
   - Manual check: in Edge, set a 10:00 talk with cues at 5:00 and 2:00, start, move to another tab for 8 min, come back. The reading must match a stopwatch to within 1 s, and the debug log must show the bells planned on the audio clock. Listen for both bells while the tab is hidden.
5. **`/ref` unchanged**: compare SHA-256 hashes and file listings with the snapshot taken before work began (`scratchpad/ref_before.sha256`, 26 files).
