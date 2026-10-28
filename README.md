# Session Timer

A conference stage timer in **one HTML file**. Open it in Chrome or Edge. There is nothing to install, it needs no internet, and it writes no files.

**Open it online:** <https://appendko.github.io/session-timer/>
**Use it offline:** download [`timer.html`](timer.html) and double-click it.

It replaces an older Python timer packaged as an `.exe`. Antivirus software quarantined that `.exe` (a false positive), so this version is plain HTML with nothing for antivirus to flag.

---

## For session chairs

### Before the session

1. Open the timer and **click once anywhere**. Browsers only allow sound after a click; the orange "Click anywhere to enable sound" note disappears once sound is on.
2. Set the **talk length**: click a preset (5, 10, 12, 15, 20, 30 min) or type minutes and seconds and press **Set**.
3. Add **cues** (optional), the bells that ring at set moments. Use the row under the cue list: pick **Talk** or **Discussion**, type a time, give it a name, choose a ring, press **Add cue**.
4. Press **F** for full screen and **C** for "clock only" (hides the cue list).

If an orange note says **"Screen may sleep"**, the browser couldn't keep the screen awake. Turn off screen sleep in Windows power settings for the session.

### During the talk

| Key | Action |
|---|---|
| **Space** | Start / pause |
| **R** | Reset (asks first if running) |
| **↑ / ↓** | Clock reading +1 / −1 min |
| **Shift + ↑ / ↓** | Clock reading +10 / −10 s |
| **F** | Full screen |
| **C** | Clock only |
| **M** | Mute (the screen still flashes) |
| **Esc** | Leave a text box, close the key list, leave Clock only |
| **?** | Show all keys |

The clock is **green** while running, **amber** in the last minute (or the last 10% of the talk, whichever is longer), **red** once the talk time is up, and **grey** when paused.

**A cue rings when the big clock reads its time.** In a 20:00 countdown, a Talk cue at 05:00 rings with five minutes left. Every cue also flashes the screen and shows its name, in case the room can't hear the bell. Ring types are single, double, triple (count the dings) and flurry (six quick dings).

### After the talk time: discussion

When the talk length runs out, the timer rings, shows "Time's up", and then **counts the discussion up from 00:00** in red under a "Discussion" label. A **Discussion** cue rings when that clock reads its time.

**Example: 20 min slot = 15 min talk + 5 min discussion**

| Picker | Time | Name | Ring |
|---|---|---|---|
| Talk | 03:00 | 3 min left | single |
| Talk | 00:00 | Talk over | double |
| Discussion | 05:00 | End of discussion | flurry |

Set the talk length to 15:00. For the next speaker, just press **R**, then **Space**.

### Good to know

- Settings, cues and even a running clock survive a page reload; they are kept in the browser, not in a file. After a reload, click once to turn the sound back on, and press F again for full screen.
- A cue whose time has already passed won't ring. A cue the clock can never reach is marked **!** in the list.
- Arrow keys and Space are ignored while you are typing in a box. Press **Esc** or click the clock to get them back.

---

## For maintainers

### Layout

| Path | What it is |
|---|---|
| `timer.html` | The whole app: markup, CSS, and one inline script |
| `index.html` | Forwards the GitHub Pages root URL to `timer.html` |
| `.nojekyll` | Tells GitHub Pages to serve the files as they are |
| `tools/selftest.ps1` | Runs the built-in logic tests (`timer.html#selftest`) in headless Edge |
| `tools/uitest.ps1` + `uitest-driver.js` | Drives the real page through clicks and keys with a controllable clock |
| `tools/smoke.ps1` | Screenshot + DOM dump of the page, for layout checks |
| `docs/superpowers/specs/` | Design: behaviour, decisions, error handling |
| `docs/superpowers/plans/` | The original step-by-step build plan |

### Hard rules

- **One self-contained file.** All CSS and JS are inline. No CDN, no web fonts, no network requests, no build step, no ES modules (they don't work from `file://`).
- A `Content-Security-Policy` meta tag (`default-src 'none'`) makes the browser block every outside request, so a slip can't reach the network. Keep it.
- The page **never writes files**. Settings live in `localStorage` (key `sessionTimer.v1`), and every access is wrapped in try/catch.
- Time is always computed from timestamps (`performance.now()`, checked against `Date.now()` to survive PC sleep), never by counting ticks.

### How the script is organised

`timer.html` contains one `<script>` in sections, in this order:

1. **engine**: pure functions (`Timer`, `fireAt`, `checkDue`, `planRings`, `shownSeconds`, `colourStage`, …). No DOM access.
2. **bell synthesis**: the reception-bell sound, built from partials and a hammer-noise burst, so there are no audio files.
3. **storage**: `loadState` / `saveState` with validation.
4. **audio playback** (`Bells`): Web Audio. Upcoming bells are scheduled on the audio clock, so they ring on time even in a hidden, throttled tab.
5. **ui** (`startApp`): DOM wiring, the clock canvas, keys, wake lock, full screen.
6. **selftest**: runs instead of the app when the URL ends in `#selftest`.

Cue times mean "what the big clock reads". A discussion cue is stored with a negative time: `-300` rings 5:00 after the talk ends.

### Testing (Windows, Edge installed)

```powershell
powershell -ExecutionPolicy Bypass -File tools\selftest.ps1   # logic: expects "SELFTEST RESULT: PASS"
powershell -ExecutionPolicy Bypass -File tools\uitest.ps1     # UI: expects "UITEST RESULT: PASS"
powershell -ExecutionPolicy Bypass -File tools\smoke.ps1      # writes %TEMP%\timer-smoke.png
```

To test by hand, open `timer.html#selftest` in a browser to see the logic tests. Open `timer.html#debug` and use the DevTools console to see when each bell was scheduled and when it was seen.

Things the automated tests can't cover, so check them by hand before a release:
- The bells actually sound.
- Full screen works.
- The bells ring on time while the tab is hidden: start a 10:00 timer with cues, switch tabs for about 9 minutes, and listen.
