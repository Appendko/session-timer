# HTML Session Timer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the quarantined PyInstaller timer with one self-contained `D:\timer\timer.html` that reproduces its behaviour in Chrome or Edge, opened from `file://`.

**Architecture:** A single HTML file with one inline `<style>` and one inline `<script>`. The script is split into sections: engine (pure functions, no DOM), bell synthesis (pure), storage (injectable storage object), audio playback (Web Audio), UI (`startApp()`), and self-test. Opening `timer.html#selftest` runs the pure sections' tests and prints `PASS`/`FAIL` lines and a summary line. A PowerShell runner drives headless Edge to read that result.

**Tech Stack:** Plain HTML/CSS/ES2017 JavaScript, Web Audio API, Fullscreen API, Screen Wake Lock API, localStorage. PowerShell 5.1 and headless Edge for testing.

**Spec:** `docs/superpowers/specs/2026-10-28-html-session-timer-design.md`

## Global Constraints

- The deliverable is exactly one file, `D:\timer\timer.html`. The test runner `D:\timer\tools\selftest.ps1` is a dev tool only.
- `D:\timer\ref\` is READ-ONLY: never create, modify, move, rename or delete anything under it. Never execute `ref\timer.exe` or `ref\timer\timer.exe`.
- All CSS and JS inline. No CDN, no external fonts, no network requests of any kind. CSP meta: `default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'`.
- No build step, no frameworks, no ES modules (must work from `file://`). No inline event-handler attributes; use `addEventListener` only.
- No file-system writes from the page. localStorage only, under key `sessionTimer.v1`, every access wrapped in try/catch.
- Must work in current Chrome/Edge from `file://`.
- Palette: INK `#12151C`, PANEL `#1A1F29`, EDGE `#2A3140`, PAPER `#ECEAE4`, MUTED `#7C8698`, GREEN `#4FB477`, AMBER `#E8A33D`, RED `#D8503E`.
- `D:\timer` is **not** a git repository. Instead of committing, each task ends with a "Checkpoint" step that runs the self-test.
- Edge path: `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`. Headless output only arrives through `Start-Process ... -RedirectStandardOutput`; plain stdout from Git Bash comes back empty.

## File Structure

| File | Responsibility |
|---|---|
| `D:\timer\timer.html` | The whole timer: markup, CSS, and all script sections |
| `D:\timer\tools\selftest.ps1` | Runs `timer.html#selftest` in headless Edge, prints PASS/FAIL lines, exits 0 only on PASS |
| `D:\timer\tools\smoke.ps1` | Loads `timer.html` normally in headless Edge, saves a screenshot and dumps the DOM, for UI checks |

Inside `timer.html`, sections are added in front of marker comments (`/* @@ENGINE */` etc.). Insert new code **directly above** the named marker line and leave the marker in place. Task 10 removes the markers.

---

### Task 1: Skeleton, self-test harness, runners

**Files:**
- Create: `D:\timer\timer.html`
- Create: `D:\timer\tools\selftest.ps1`
- Create: `D:\timer\tools\smoke.ps1`

**Interfaces:**
- Produces: global `SELFTESTS` (array of `{name: string, fn: function(t)}`); `t.eq(label, got, want)` (deep-equal via JSON); `t.ok(label, cond, detail?)`; `t.near(label, got, want, tol)`; `fakeClock(mono?, wall?)` returns `{m, w, mono(), wall(), advance(ms)}`; `runSelftest()`. `startApp()` is called when the hash isn't `#selftest` and `startApp` exists. The summary line format is `SELFTEST RESULT: PASS (n/n)` or `SELFTEST RESULT: FAIL (p/n)`; an empty run counts as FAIL.

- [ ] **Step 1: Create `D:\timer\timer.html`**

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Session Timer</title>
<style>
/* @@CSS */
#selftest { white-space: pre-wrap; margin: 0; padding: 16px; font: 13px/1.5 Consolas, monospace; color: #ECEAE4; background: #12151C; min-height: 100vh; }
</style>
</head>
<body>
<!-- @@MARKUP -->
<pre id="selftest" hidden></pre>
<script>
'use strict';

/* ==== engine ==== */
/* @@ENGINE */

/* ==== bell synthesis ==== */
/* @@BELL */

/* ==== storage ==== */
/* @@STORAGE */

/* ==== audio playback ==== */
/* @@AUDIO */

/* ==== ui ==== */
/* @@UI */

/* ==== selftest ==== */
var SELFTESTS = [];

function fakeClock(mono, wall) {
  var c = {
    m: mono || 0,
    w: wall || 1.7e12,
    mono: function () { return c.m; },
    wall: function () { return c.w; },
    advance: function (ms) { c.m += ms; c.w += ms; }
  };
  return c;
}

SELFTESTS.push({ name: 'harness', fn: function (t) {
  t.ok('harness runs', true);
} });

/* @@TESTS */

function runSelftest() {
  var lines = [], passed = 0, failed = 0;
  var t = {
    ok: function (label, cond, detail) {
      if (cond) { passed++; lines.push('PASS ' + label); }
      else { failed++; lines.push('FAIL ' + label + (detail ? ': ' + detail : '')); }
    },
    eq: function (label, got, want) {
      var a = JSON.stringify(got), b = JSON.stringify(want);
      this.ok(label, a === b, 'got ' + a + ', want ' + b);
    },
    near: function (label, got, want, tol) {
      this.ok(label, Math.abs(got - want) <= tol, 'got ' + got + ', want ' + want + ' \u00b1' + tol);
    }
  };
  SELFTESTS.forEach(function (group) {
    try { group.fn(t); }
    catch (e) { failed++; lines.push('FAIL ' + group.name + ' threw ' + e); }
  });
  var good = failed === 0 && passed > 0;
  lines.push('SELFTEST RESULT: ' + (good ? 'PASS' : 'FAIL') + ' (' + passed + '/' + (passed + failed) + ')');
  var app = document.getElementById('app');
  if (app) app.hidden = true;
  var out = document.getElementById('selftest');
  out.hidden = false;
  out.textContent = lines.join('\n');
  console.log(lines.join('\n'));
}

if (location.hash === '#selftest') runSelftest();
else if (typeof startApp === 'function') startApp();
</script>
</body>
</html>
```

- [ ] **Step 2: Create `D:\timer\tools\selftest.ps1`**

```powershell
# Runs timer.html#selftest in headless Edge and reports the result.
# Exit code 0 only when the page reports PASS.
param([string]$Page = (Join-Path $PSScriptRoot '..\timer.html'))

$edge = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
$path = (Resolve-Path $Page).Path
$url = 'file:///' + ($path -replace '\\', '/') + '#selftest'
$profileDir = Join-Path $env:TEMP 'timer-selftest-profile'
$out = Join-Path $env:TEMP 'timer-selftest-dom.txt'
if (Test-Path $out) { Remove-Item $out -Force }

Start-Process -FilePath $edge -Wait -NoNewWindow -RedirectStandardOutput $out `
  -ArgumentList @('--headless', '--disable-gpu', "--user-data-dir=`"$profileDir`"", '--dump-dom', $url)

$dom = Get-Content $out -Raw
if (-not $dom) { Write-Output 'No output from Edge.'; exit 2 }
$dom = $dom -replace '&amp;', '&' -replace '&lt;', '<' -replace '&gt;', '>'
[regex]::Matches($dom, '(?m)^(PASS|FAIL) .*$') | ForEach-Object { $_.Value }
$summary = [regex]::Match($dom, 'SELFTEST RESULT: \w+ \(\d+/\d+\)').Value
if (-not $summary) { Write-Output 'No SELFTEST RESULT line found (script error before the tests ran?).'; exit 2 }
Write-Output $summary
if ($summary -like 'SELFTEST RESULT: PASS*') { exit 0 } else { exit 1 }
```

- [ ] **Step 3: Create `D:\timer\tools\smoke.ps1`**

```powershell
# Loads timer.html normally in headless Edge: saves a screenshot and the DOM.
param(
  [string]$Page = (Join-Path $PSScriptRoot '..\timer.html'),
  [string]$Size = '1280,720',
  [string]$Hash = ''
)

$edge = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
$path = (Resolve-Path $Page).Path
$url = 'file:///' + ($path -replace '\\', '/') + $Hash
$profileDir = Join-Path $env:TEMP 'timer-smoke-profile'
$png = Join-Path $env:TEMP 'timer-smoke.png'
$dom = Join-Path $env:TEMP 'timer-smoke-dom.txt'
foreach ($f in @($png, $dom)) { if (Test-Path $f) { Remove-Item $f -Force } }

Start-Process -FilePath $edge -Wait -NoNewWindow `
  -ArgumentList @('--headless', '--disable-gpu', "--user-data-dir=`"$profileDir`"", '--hide-scrollbars',
                  "--window-size=$Size", "--screenshot=`"$png`"", $url)
Start-Process -FilePath $edge -Wait -NoNewWindow -RedirectStandardOutput $dom `
  -ArgumentList @('--headless', '--disable-gpu', "--user-data-dir=`"$profileDir`"", '--dump-dom', $url)

Write-Output "screenshot: $png"
Write-Output "dom: $dom"
```

- [ ] **Step 4: Run the self-test**

Run (PowerShell): `powershell -ExecutionPolicy Bypass -File D:\timer\tools\selftest.ps1`
Expected:
```
PASS harness runs
SELFTEST RESULT: PASS (1/1)
```
Exit code 0.

- [ ] **Step 5: Check the runner detects failure**

Temporarily change `t.ok('harness runs', true);` to `t.ok('harness runs', false);`, run the self-test again, and expect `FAIL harness runs` and `SELFTEST RESULT: FAIL (0/1)` with exit code 1. Revert the change and re-run to get PASS (1/1).

- [ ] **Step 6: Checkpoint**: self-test PASS (1/1).

---

### Task 2: Engine (formatting, field reading, Timer)

**Files:**
- Modify: `D:\timer\timer.html`, above `/* @@ENGINE */` and above `/* @@TESTS */`

**Interfaces:**
- Consumes: `SELFTESTS`, `fakeClock` from Task 1.
- Produces:
  - Constants `MAX_MINUTES = 599`, `MAX_SECONDS = 35999`, `RING_NAMES = ['single','double','triple','flurry']`, `DEFAULT_RING = 'single'`, `TARGET_RING = 'flurry'`, `SLEEP_TOLERANCE_MS = 2000`.
  - `pad2(n) -> string`
  - `formatHms(totalSeconds:int, forceHours?:bool) -> string`
  - `readPair(minText, secText) -> {m:int, s:int, total:int}`
  - `Timer(clock)` where clock is `{mono():ms, wall():ms}`. Fields: `state` ('idle'|'running'|'paused'), `bankedMs`. Methods: `elapsed() -> seconds (float, ≥0)`, `start()`, `pause()`, `toggle()`, `reset()`, `setElapsed(seconds)`, `snapshot() -> {state, bankedMs, segmentStartWall}`, `restore(snapshot)`.

- [ ] **Step 1: Write the failing tests** (insert above `/* @@TESTS */`)

```js
SELFTESTS.push({ name: 'format', fn: function (t) {
  t.eq('format 0', formatHms(0), '00:00');
  t.eq('format 61', formatHms(61), '01:01');
  t.eq('format 3600', formatHms(3600), '1:00:00');
  t.eq('format -5', formatHms(-5), '-00:05');
  t.eq('format force hours', formatHms(59, true), '0:00:59');
  t.eq('format -0 has no sign', formatHms(-0), '00:00');
  t.eq('format max', formatHms(35999), '9:59:59');
  t.eq('pad2', [pad2(3), pad2(12), pad2(120)], ['03', '12', '120']);
} });

SELFTESTS.push({ name: 'readPair', fn: function (t) {
  t.eq('12:30', readPair('12', '30').total, 750);
  t.eq('599:59', readPair('599', '59').total, 35999);
  t.eq('clamped high', readPair('600', '75'), { m: 599, s: 59, total: 35999 });
  t.eq('garbage is zero', readPair('abc', '').total, 0);
  t.eq('negative clamps to 0', readPair('-3', '5').total, 5);
  t.eq('fraction floors', readPair('2.7', '09').total, 129);
  t.eq('90 minute talk', readPair('90', '00').total, 5400);
} });

SELFTESTS.push({ name: 'timer', fn: function (t) {
  var c = fakeClock();
  var tm = new Timer(c);
  t.eq('starts idle', tm.state, 'idle');
  t.eq('idle elapsed', tm.elapsed(), 0);
  tm.start(); c.advance(200); tm.pause();
  t.near('elapsed after 0.2s', tm.elapsed(), 0.2, 1e-9);
  c.advance(150);
  t.near('no advance while paused', tm.elapsed(), 0.2, 1e-9);
  tm.start(); c.advance(150); tm.pause();
  t.near('two segments', tm.elapsed(), 0.35, 1e-9);
  tm.toggle(); t.eq('toggle starts', tm.state, 'running');
  tm.toggle(); t.eq('toggle pauses', tm.state, 'paused');
  tm.reset();
  t.eq('reset clears', tm.elapsed(), 0);
  t.eq('reset state', tm.state, 'idle');

  // The PC sleeps: the monotonic clock stops, the wall clock keeps going.
  var s = fakeClock(); var ts = new Timer(s);
  ts.start(); s.advance(10000); s.w += 60000;
  t.near('sleep uses wall clock', ts.elapsed(), 70, 1e-9);
  var j = fakeClock(); var tj = new Timer(j);
  tj.start(); j.advance(10000); j.w += 1500;
  t.near('small wall jitter ignored', tj.elapsed(), 10, 1e-9);

  // Reload while running: restore from a snapshot on a fresh page.
  var a = fakeClock(1000, 5e11); var ta = new Timer(a);
  ta.start(); a.advance(30000); ta.pause(); ta.start(); a.advance(5000);
  var snap = ta.snapshot();
  t.eq('snapshot state', snap.state, 'running');
  var b = fakeClock(42, a.w + 20000); var tb = new Timer(b);
  tb.restore(snap);
  t.near('restored running elapsed', tb.elapsed(), 55, 1e-6);
  b.advance(1000);
  t.near('restored keeps running', tb.elapsed(), 56, 1e-6);

  var e = fakeClock(); var te = new Timer(e);
  te.setElapsed(30);
  t.eq('setElapsed from idle pauses', te.state, 'paused');
  t.near('setElapsed value', te.elapsed(), 30, 1e-9);
  var z = new Timer(fakeClock()); z.setElapsed(0);
  t.eq('setElapsed 0 stays idle', z.state, 'idle');
  var r = fakeClock(); var tr = new Timer(r);
  tr.start(); r.advance(5000); tr.setElapsed(100); r.advance(2000);
  t.near('setElapsed while running', tr.elapsed(), 102, 1e-9);
  tr.setElapsed(-5);
  t.near('setElapsed clamps at 0', tr.elapsed(), 0, 1e-9);
} });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `powershell -ExecutionPolicy Bypass -File D:\timer\tools\selftest.ps1`
Expected: `FAIL format threw ReferenceError: formatHms is not defined` (and the same for readPair and timer), with summary `SELFTEST RESULT: FAIL`.

- [ ] **Step 3: Implement** (insert above `/* @@ENGINE */`)

```js
var MAX_MINUTES = 599;
var MAX_SECONDS = MAX_MINUTES * 60 + 59;
var RING_NAMES = ['single', 'double', 'triple', 'flurry'];
var DEFAULT_RING = 'single';
var TARGET_RING = 'flurry';
// A bigger gap than this between the two clocks means the PC slept.
var SLEEP_TOLERANCE_MS = 2000;

function pad2(n) { return (n < 10 ? '0' : '') + n; }

// Whole seconds -> 'MM:SS' or 'H:MM:SS'. Negative values keep a leading '-'.
function formatHms(total, forceHours) {
  var negative = total < 0;
  var t = Math.abs(Math.trunc(total));
  var h = Math.floor(t / 3600), m = Math.floor(t % 3600 / 60), s = t % 60;
  var text = (h || forceHours) ? h + ':' + pad2(m) + ':' + pad2(s) : pad2(m) + ':' + pad2(s);
  return negative ? '-' + text : text;
}

// A minutes field and a seconds field as whole seconds, forced into range.
// The original parsed "MM:SS" and so rejected talks longer than 59:59.
function readPair(minText, secText) {
  function clamp(text, hi) {
    var v = Math.floor(Number(String(text).trim()));
    return isFinite(v) ? Math.max(0, Math.min(hi, v)) : 0;
  }
  var m = clamp(minText, MAX_MINUTES), s = clamp(secText, 59);
  return { m: m, s: s, total: m * 60 + s };
}

// Elapsed time from a monotonic clock, checked against the wall clock so a
// PC that slept doesn't lose the time it was asleep. Never counts ticks.
function Timer(clock) {
  this.clock = clock;
  this.state = 'idle';
  this.bankedMs = 0;
  this.segMono = 0;
  this.segWall = 0;
}
Timer.prototype.segmentMs = function () {
  var mono = this.clock.mono() - this.segMono;
  var wall = this.clock.wall() - this.segWall;
  return Math.abs(wall - mono) > SLEEP_TOLERANCE_MS ? wall : mono;
};
Timer.prototype.elapsed = function () {
  var ms = this.bankedMs + (this.state === 'running' ? this.segmentMs() : 0);
  return Math.max(0, ms) / 1000;
};
Timer.prototype.markSegment = function () {
  this.segMono = this.clock.mono();
  this.segWall = this.clock.wall();
};
Timer.prototype.start = function () {
  if (this.state === 'running') return;
  this.markSegment();
  this.state = 'running';
};
Timer.prototype.pause = function () {
  if (this.state !== 'running') return;
  this.bankedMs += this.segmentMs();
  this.state = 'paused';
};
Timer.prototype.toggle = function () {
  if (this.state === 'running') this.pause(); else this.start();
};
Timer.prototype.reset = function () {
  this.state = 'idle';
  this.bankedMs = 0;
};
// Jump to an elapsed time. A timer that hasn't started is left paused there.
Timer.prototype.setElapsed = function (seconds) {
  this.bankedMs = Math.max(0, seconds) * 1000;
  if (this.state === 'running') this.markSegment();
  else if (this.bankedMs > 0) this.state = 'paused';
};
Timer.prototype.snapshot = function () {
  return { state: this.state, bankedMs: this.bankedMs, segmentStartWall: this.segWall };
};
Timer.prototype.restore = function (snap) {
  this.state = snap.state;
  this.bankedMs = snap.bankedMs;
  this.segWall = snap.segmentStartWall;
  // A new page has a new monotonic origin; line it up with the wall clock.
  this.segMono = this.clock.mono() - (this.clock.wall() - this.segWall);
};
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `powershell -ExecutionPolicy Bypass -File D:\timer\tools\selftest.ps1`
Expected: every line PASS, `SELFTEST RESULT: PASS (35/35)` (1 harness + 8 format + 7 readPair + 19 timer).

- [ ] **Step 5: Checkpoint**: self-test PASS.

---

### Task 3: Engine (cues, display rules, adjust)

**Files:**
- Modify: `D:\timer\timer.html`, above `/* @@ENGINE */` and above `/* @@TESTS */`

**Interfaces:**
- Consumes: `formatHms`, `TARGET_RING`, `DEFAULT_RING` from Task 2.
- Produces (S is the settings object `{target: int|null, countdown: bool, ...}`; a cue is `{at:int, label:string, sound:string, enabled:bool, fired:bool}`):
  - `countingDown(S) -> bool`
  - `fireAt(cue, S) -> number|null`
  - `sortCues(cues, S)` (in place)
  - `rearm(cues, S, elapsed) -> targetFired:bool` (sets each `cue.fired`)
  - `describeCue(cue) -> string`
  - `unreachable(cues, S) -> cue[]`, `unreachableText(cues, S) -> string|null`
  - `cueProblem(at, S, cues, editing) -> {text, colour:'red'|'amber'}|null`
  - `checkDue(cues, S, elapsed, targetFired) -> {due:cue[], timesUp:bool, coincident:cue[], ringSound:string|null, ringOwner:cue|'target'|null}` (marks due cues fired)
  - `planRings(cues, S, elapsed, targetFired) -> [{delay:seconds, sound, owner:cue|'target'}]`
  - `shownSeconds(S, elapsed) -> int`
  - `colourStage(S, state, elapsed) -> 'paper'|'green'|'amber'|'red'|'muted'`
  - `statusText(S, state, elapsed, cues, muted) -> string`
  - `stripModel(cues, S, state, elapsed) -> {fraction, fill:'green'|'muted'|'red', notches:[{x, fired}]}`
  - `adjustedElapsed(S, elapsed, deltaShown) -> seconds`

- [ ] **Step 1: Write the failing tests** (insert above `/* @@TESTS */`)

```js
function testCue(at, extra) {
  var c = { at: at, label: '', sound: 'single', enabled: true, fired: false };
  for (var k in extra) c[k] = extra[k];
  return c;
}

SELFTESTS.push({ name: 'fireAt', fn: function (t) {
  var down = { target: 1200, countdown: true }, up = { target: 1200, countdown: false }, none = { target: null, countdown: true };
  t.ok('countingDown needs a target', countingDown(down) && !countingDown(up) && !countingDown(none));
  t.eq('countdown 5:00 cue fires at 15:00 elapsed', fireAt(testCue(300), down), 900);
  t.eq('countdown cue longer than talk is unreachable', fireAt(testCue(1300), down), null);
  t.eq('countdown 0:00 cue fires at the end', fireAt(testCue(0), down), 1200);
  t.eq('count up uses the time directly', fireAt(testCue(300), up), 300);
  t.eq('no target counts up', fireAt(testCue(1300), none), 1300);

  var cues = [testCue(60), testCue(600), testCue(1500), testCue(300)];
  sortCues(cues, down);
  t.eq('sorted in ring order, unreachable last', cues.map(function (c) { return c.at; }), [600, 300, 60, 1500]);
  sortCues(cues, up);
  t.eq('sorted counting up', cues.map(function (c) { return c.at; }), [60, 300, 600, 1500]);

  var r = [testCue(600), testCue(300), testCue(60)];
  var fired = rearm(r, down, 950);
  t.eq('rearm marks passed cues', r.map(function (c) { return c.fired; }), [true, true, false]);
  t.eq('rearm time not up yet', fired, false);
  t.eq('rearm time up', rearm(r, down, 1200), true);
  rearm(r, down, 0);
  t.eq('rearm after jumping back', r.map(function (c) { return c.fired; }), [false, false, false]);
  t.eq('rearm without target', rearm(r, none, 5000), false);

  t.eq('describe uses label', describeCue(testCue(120, { label: 'Questions' })), 'Questions');
  t.eq('describe falls back to time', describeCue(testCue(120)), '02:00');
} });

SELFTESTS.push({ name: 'cue validation', fn: function (t) {
  var down = { target: 180, countdown: true };
  var cues = [testCue(60), testCue(300), testCue(400, { enabled: false })];
  t.eq('unreachable lists enabled only', unreachable(cues, down).map(function (c) { return c.at; }), [300]);
  t.eq('unreachable text', unreachableText(cues, down),
    'Marked ! and silent: the clock never reads 05:00 counting down from 03:00.');
  t.eq('nothing unreachable', unreachableText([testCue(60)], down), null);
  t.eq('cue past talk length', cueProblem(300, down, cues, null),
    { text: 'Counting down from 03:00, the clock never reads 05:00.', colour: 'red' });
  t.eq('duplicate cue', cueProblem(60, down, cues, null),
    { text: "There's already a cue at 01:00.", colour: 'amber' });
  t.eq('editing a cue may keep its time', cueProblem(60, down, cues, cues[0]), null);
  t.eq('fine cue', cueProblem(120, down, cues, null), null);
} });

SELFTESTS.push({ name: 'checkDue', fn: function (t) {
  var down = { target: 600, countdown: true };
  var cues = [testCue(300, { sound: 'double', label: 'Half' }), testCue(120, { sound: 'triple' }), testCue(60, { enabled: false })];
  var r = checkDue(cues, down, 299, false);
  t.eq('nothing due yet', r.due.length, 0);
  r = checkDue(cues, down, 300, false);
  t.eq('half due', r.due.map(describeCue), ['Half']);
  t.eq('half rings its sound', [r.ringSound, r.ringOwner === cues[0]], ['double', true]);
  t.ok('half marked fired', cues[0].fired);
  r = checkDue(cues, down, 300.5, false);
  t.eq('fires once', r.due.length, 0);
  r = checkDue(cues, down, 1000, false);
  t.eq('jump: 2:00 cue and time up together', [r.due.length, r.timesUp], [1, true]);
  t.eq('time up without coincident cue rings the flurry', [r.ringSound, r.ringOwner], ['flurry', 'target']);
  t.ok('disabled never due', !cues[2].fired);

  var zero = [testCue(0, { sound: 'triple', label: 'End' })];
  r = checkDue(zero, down, 600, false);
  t.eq('0:00 cue coincides with time up', [r.timesUp, r.coincident.map(describeCue), r.ringSound], [true, ['End'], 'triple']);

  var many = [testCue(300, { sound: 'single' }), testCue(200, { sound: 'triple' })];
  r = checkDue(many, down, 450, false);
  t.eq('several due: latest one rings', r.ringSound, 'triple');
  r = checkDue([], down, 700, true);
  t.eq('time up only once', r.timesUp, false);
} });

SELFTESTS.push({ name: 'planRings', fn: function (t) {
  var down = { target: 600, countdown: true };
  var cues = [testCue(300), testCue(120, { sound: 'double' }), testCue(60, { enabled: false }), testCue(900)];
  var plan = planRings(cues, down, 100, false);
  t.eq('plan delays', plan.map(function (p) { return [p.delay, p.sound]; }), [[200, 'single'], [380, 'double'], [500, 'flurry']]);
  t.eq('target owner', plan[2].owner, 'target');
  cues[0].fired = true;
  t.eq('fired cues are skipped', planRings(cues, down, 100, false).length, 2);
  var zero = [testCue(0, { sound: 'triple' })];
  t.eq('coincident 0:00 cue replaces the flurry', planRings(zero, down, 0, false).map(function (p) { return p.sound; }), ['triple']);
  t.eq('nothing after time up', planRings([], down, 700, true).length, 0);
  t.eq('count up, no target', planRings([testCue(30)], { target: null, countdown: true }, 10, false).map(function (p) { return p.delay; }), [20]);
} });

SELFTESTS.push({ name: 'display', fn: function (t) {
  var down = { target: 600, countdown: true }, up = { target: 600, countdown: false };
  t.eq('opens on full length', formatHms(shownSeconds(down, 0)), '10:00');
  t.eq('holds 10:00 for a second', formatHms(shownSeconds(down, 0.3)), '10:00');
  t.eq('last second', formatHms(shownSeconds(down, 599.5)), '00:01');
  t.eq('zero', formatHms(shownSeconds(down, 600)), '00:00');
  t.eq('no -00:00', formatHms(shownSeconds(down, 600.5)), '00:00');
  t.eq('one second over', formatHms(shownSeconds(down, 601.2)), '-00:01');
  t.eq('count up floors', formatHms(shownSeconds(up, 59.9)), '00:59');

  var long = { target: 1200, countdown: true };
  t.eq('green while running', colourStage(long, 'running', 0), 'green');
  t.eq('amber at 10%', colourStage(long, 'running', 1080), 'amber');
  t.eq('green just before', colourStage(long, 'running', 1079), 'green');
  t.eq('red when over', colourStage(long, 'running', 1201), 'red');
  t.eq('paused is grey even when over', colourStage(long, 'paused', 1300), 'muted');
  t.eq('idle is paper', colourStage(long, 'idle', 0), 'paper');
  t.eq('short talk: amber at 1 min', colourStage({ target: 300, countdown: true }, 'running', 240), 'amber');
  t.eq('no target running', colourStage({ target: null, countdown: true }, 'running', 5000), 'green');

  var cues = [testCue(300, { label: 'Half' }), testCue(120)];
  t.eq('status counting down', statusText(down, 'running', 100, cues, false),
    'Running   \u00b7   elapsed 01:40 of 10:00   \u00b7   next cue Half in 03:20');
  t.eq('status counting up, muted', statusText(up, 'paused', 100, cues, true),
    'Paused   \u00b7   of 10:00   \u00b7   next cue 02:00 in 00:20   \u00b7   muted');
  t.eq('status idle, nothing set', statusText({ target: null, countdown: true }, 'idle', 0, [], false), 'Ready');

  var m = stripModel(cues, down, 'running', 150);
  t.eq('strip', m, { fraction: 0.25, fill: 'green', notches: [{ x: 0.5, fired: false }, { x: 0.8, fired: false }] });
  t.eq('strip over', stripModel([], down, 'running', 700).fill, 'red');
  t.eq('strip paused', stripModel([], down, 'paused', 10).fill, 'muted');
  t.eq('strip span from cues', stripModel([testCue(200)], { target: null, countdown: true }, 'idle', 100).fraction, 0.5);
  t.eq('strip default span', stripModel([], { target: null, countdown: true }, 'idle', 60).fraction, 0.1);
} });

SELFTESTS.push({ name: 'adjust', fn: function (t) {
  var down = { target: 600, countdown: true }, up = { target: null, countdown: true };
  t.eq('countdown +1 min clamps at full length', adjustedElapsed(down, 30, 60), 0);
  t.eq('countdown -1 min', adjustedElapsed(down, 30, -60), 90);
  t.eq('countdown +10 s', adjustedElapsed(down, 100, 10), 90);
  t.eq('count up +1 min', adjustedElapsed(up, 30, 60), 90);
  t.eq('count up -1 min clamps at 0', adjustedElapsed(up, 30, -60), 0);
} });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `powershell -ExecutionPolicy Bypass -File D:\timer\tools\selftest.ps1`
Expected: `FAIL fireAt threw ReferenceError: countingDown is not defined` and similar for the other new groups; summary FAIL.

- [ ] **Step 3: Implement** (insert above `/* @@ENGINE */`)

```js
function countingDown(S) { return !!S.target && S.countdown; }

// Elapsed seconds at which a cue rings, or null if the clock never reads
// its time. A cue's time always means "when the big clock reads this".
function fireAt(cue, S) {
  if (countingDown(S)) return cue.at > S.target ? null : S.target - cue.at;
  return cue.at;
}

// In the order they will ring; unreachable cues last.
function sortCues(cues, S) {
  cues.sort(function (a, b) {
    var fa = fireAt(a, S), fb = fireAt(b, S);
    if ((fa === null) !== (fb === null)) return fa === null ? 1 : -1;
    return (fa || 0) - (fb || 0);
  });
}

// A cue's moment moves when the length or direction changes, or the clock
// jumps. Returns whether time's up has already passed.
function rearm(cues, S, elapsed) {
  cues.forEach(function (cue) {
    var f = fireAt(cue, S);
    cue.fired = f !== null && elapsed >= f;
  });
  return !!S.target && elapsed >= S.target;
}

function describeCue(cue) { return cue.label || formatHms(cue.at); }

function unreachable(cues, S) {
  return cues.filter(function (c) { return c.enabled && fireAt(c, S) === null; });
}

function unreachableText(cues, S) {
  var stranded = unreachable(cues, S);
  if (!stranded.length) return null;
  return 'Marked ! and silent: the clock never reads ' +
    stranded.map(function (c) { return formatHms(c.at); }).join(', ') +
    ' counting down from ' + formatHms(S.target) + '.';
}

function cueProblem(at, S, cues, editing) {
  if (countingDown(S) && at > S.target) {
    return { text: 'Counting down from ' + formatHms(S.target) + ', the clock never reads ' + formatHms(at) + '.', colour: 'red' };
  }
  if (cues.some(function (c) { return c.at === at && c !== editing; })) {
    return { text: "There's already a cue at " + formatHms(at) + '.', colour: 'amber' };
  }
  return null;
}

// Marks every cue that has come due and says what to ring. When several
// come due at once (a jump, or a throttled tab) only the latest one rings.
function checkDue(cues, S, elapsed, targetFired) {
  var due = cues.filter(function (c) {
    var f = fireAt(c, S);
    return c.enabled && !c.fired && f !== null && elapsed >= f;
  });
  due.forEach(function (c) { c.fired = true; });
  var result = { due: due, timesUp: false, coincident: [], ringSound: null, ringOwner: null };
  if (due.length) {
    var latest = due.reduce(function (a, b) { return fireAt(b, S) > fireAt(a, S) ? b : a; });
    result.ringSound = latest.sound;
    result.ringOwner = latest;
  }
  if (S.target && !targetFired && elapsed >= S.target) {
    result.timesUp = true;
    // A cue at 0:00 rings instead of the flurry, not on top of it.
    result.coincident = due.filter(function (c) { return fireAt(c, S) === S.target; });
    if (!result.coincident.length) {
      result.ringSound = TARGET_RING;
      result.ringOwner = 'target';
    }
  }
  return result;
}

// Every ring still to come, as seconds from now, for the audio clock.
function planRings(cues, S, elapsed, targetFired) {
  var plan = [];
  cues.forEach(function (c) {
    var f = fireAt(c, S);
    if (c.enabled && !c.fired && f !== null && f > elapsed) {
      plan.push({ delay: f - elapsed, sound: c.sound, owner: c });
    }
  });
  if (S.target && !targetFired && S.target > elapsed) {
    var coincident = cues.some(function (c) {
      return c.enabled && !c.fired && fireAt(c, S) === S.target;
    });
    if (!coincident) plan.push({ delay: S.target - elapsed, sound: TARGET_RING, owner: 'target' });
  }
  return plan;
}

// The number the big clock shows. Counting down rounds up, so a 10 minute
// talk opens on 10:00; overtime only shows -00:01 once a full second is over.
function shownSeconds(S, elapsed) {
  if (!countingDown(S)) return Math.floor(elapsed);
  var remaining = S.target - elapsed;
  return remaining > 0 ? Math.ceil(remaining) : -Math.floor(-remaining);
}

// Stage cue lights: green running, amber final stretch, red over.
function colourStage(S, state, elapsed) {
  if (state === 'paused') return 'muted';
  if (S.target) {
    var remaining = S.target - elapsed;
    if (remaining < 0) return 'red';
    if (remaining <= Math.max(60, S.target * 0.1)) return 'amber';
  }
  return state === 'running' ? 'green' : 'paper';
}

function statusText(S, state, elapsed, cues, muted) {
  var parts = [{ idle: 'Ready', running: 'Running', paused: 'Paused' }[state]];
  if (S.target) {
    parts.push(countingDown(S)
      ? 'elapsed ' + formatHms(Math.floor(elapsed)) + ' of ' + formatHms(S.target)
      : 'of ' + formatHms(S.target));
  }
  var next = null, nextAt = 0;
  cues.forEach(function (c) {
    var f = fireAt(c, S);
    if (c.enabled && !c.fired && f !== null && (next === null || f < nextAt)) { next = c; nextAt = f; }
  });
  if (next) parts.push('next cue ' + describeCue(next) + ' in ' + formatHms(Math.max(0, Math.ceil(nextAt - elapsed))));
  if (muted) parts.push('muted');
  return parts.join('   \u00b7   ');
}

// The cue strip: elapsed fill plus a notch per cue, the shape of the talk.
function stripModel(cues, S, state, elapsed) {
  var times = cues.filter(function (c) { return c.enabled; })
    .map(function (c) { return fireAt(c, S); })
    .filter(function (f) { return f !== null; });
  var span = S.target || Math.max.apply(null, [0].concat(times)) || 600;
  var notches = [];
  cues.forEach(function (c) {
    var f = fireAt(c, S);
    if (c.enabled && f !== null && f <= span) notches.push({ x: f / span, fired: c.fired });
  });
  return {
    fraction: Math.max(0, Math.min(1, elapsed / span)),
    fill: elapsed > span ? 'red' : state === 'running' ? 'green' : 'muted',
    notches: notches
  };
}

// Up means "a bigger number on the clock": more time left counting down,
// more elapsed counting up.
function adjustedElapsed(S, elapsed, deltaShown) {
  return Math.max(0, elapsed + (countingDown(S) ? -deltaShown : deltaShown));
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `powershell -ExecutionPolicy Bypass -File D:\timer\tools\selftest.ps1`
Expected: all PASS, summary `SELFTEST RESULT: PASS (...)`.

- [ ] **Step 5: Checkpoint**: self-test PASS.

---

### Task 4: Storage

**Files:**
- Modify: `D:\timer\timer.html`, above `/* @@STORAGE */` and above `/* @@TESTS */`

**Interfaces:**
- Consumes: `MAX_SECONDS`, `RING_NAMES`, `DEFAULT_RING`.
- Produces:
  - `STORAGE_KEY = 'sessionTimer.v1'`
  - `defaultState() -> {target:null, countdown:true, muted:false, clockOnly:false, clockFont:null, clockSize:null, cueSize:13, cues:[], clock:{state:'idle', bankedMs:0, segmentStartWall:0}}`
  - `sanitizeState(raw) -> state` (same shape; cues get `fired:false`)
  - `getStorage() -> Storage|null`
  - `loadState(storage) -> state` (never throws)
  - `saveState(storage, state) -> bool` (never throws; stores `{version:1, ...}`, cues without `fired`)

- [ ] **Step 1: Write the failing tests** (insert above `/* @@TESTS */`)

```js
function memoryStorage() {
  var data = {};
  return {
    data: data,
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null; },
    setItem: function (k, v) { data[k] = String(v); }
  };
}

SELFTESTS.push({ name: 'storage', fn: function (t) {
  t.eq('empty storage gives defaults', loadState(memoryStorage()), defaultState());
  t.eq('null storage gives defaults', loadState(null), defaultState());

  var st = memoryStorage();
  var state = defaultState();
  state.target = 1200; state.countdown = false; state.muted = true; state.clockOnly = true;
  state.clockFont = 'Consolas'; state.clockSize = 200; state.cueSize = 30;
  state.cues = [{ at: 300, label: 'Half', sound: 'double', enabled: false, fired: true }];
  state.clock = { state: 'running', bankedMs: 1500, segmentStartWall: 1.7e12 };
  t.ok('save works', saveState(st, state));
  var saved = JSON.parse(st.data[STORAGE_KEY]);
  t.eq('saved version', saved.version, 1);
  t.eq('fired is not stored', Object.keys(saved.cues[0]).sort(), ['at', 'enabled', 'label', 'sound']);
  var back = loadState(st);
  state.cues[0].fired = false;
  t.eq('round trip', back, state);

  var bad = memoryStorage();
  bad.setItem(STORAGE_KEY, '{not json');
  t.eq('bad JSON gives defaults', loadState(bad), defaultState());

  var odd = memoryStorage();
  odd.setItem(STORAGE_KEY, JSON.stringify({
    target: 0, countdown: 'yes', clockSize: 5, cueSize: 99, clockFont: 42,
    cues: [{ at: 60, sound: 'kazoo' }, { at: 60, label: 'dup' }, { at: -1 }, { at: 36000 }, null, { at: 1.5 }],
    clock: { state: 'flying', bankedMs: 1, segmentStartWall: 1 }
  }));
  var o = loadState(odd);
  t.eq('invalid target dropped', o.target, null);
  t.eq('invalid booleans dropped', o.countdown, true);
  t.eq('invalid sizes dropped', [o.clockSize, o.cueSize, o.clockFont], [null, 13, null]);
  t.eq('cues cleaned', o.cues, [{ at: 60, label: '', sound: 'single', enabled: true, fired: false }]);
  t.eq('invalid clock dropped', o.clock, defaultState().clock);

  var throwing = {
    getItem: function () { throw new Error('denied'); },
    setItem: function () { throw new Error('denied'); }
  };
  t.eq('throwing storage loads defaults', loadState(throwing), defaultState());
  t.eq('throwing storage save returns false', saveState(throwing, defaultState()), false);
  t.eq('null storage save returns false', saveState(null, defaultState()), false);
} });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `powershell -ExecutionPolicy Bypass -File D:\timer\tools\selftest.ps1`
Expected: `FAIL storage threw ReferenceError: loadState is not defined`.

- [ ] **Step 3: Implement** (insert above `/* @@STORAGE */`)

```js
// Settings live in the browser profile. Nothing is ever written to a file.
var STORAGE_KEY = 'sessionTimer.v1';

function defaultState() {
  return {
    target: null, countdown: true, muted: false, clockOnly: false,
    clockFont: null, clockSize: null, cueSize: 13, cues: [],
    clock: { state: 'idle', bankedMs: 0, segmentStartWall: 0 }
  };
}

function isInt(v, lo, hi) {
  return typeof v === 'number' && Math.floor(v) === v && v >= lo && v <= hi;
}

// Anything stored that doesn't fit the controls' limits is ignored.
function sanitizeState(raw) {
  var d = defaultState();
  if (!raw || typeof raw !== 'object') return d;
  if (isInt(raw.target, 1, MAX_SECONDS)) d.target = raw.target;
  ['countdown', 'muted', 'clockOnly'].forEach(function (k) {
    if (typeof raw[k] === 'boolean') d[k] = raw[k];
  });
  if (typeof raw.clockFont === 'string' && raw.clockFont.length < 100) d.clockFont = raw.clockFont;
  if (isInt(raw.clockSize, 18, 900)) d.clockSize = raw.clockSize;
  if (isInt(raw.cueSize, 10, 72)) d.cueSize = raw.cueSize;
  if (Array.isArray(raw.cues)) {
    raw.cues.forEach(function (c) {
      if (!c || !isInt(c.at, 0, MAX_SECONDS)) return;
      if (d.cues.some(function (x) { return x.at === c.at; })) return;
      d.cues.push({
        at: c.at,
        label: typeof c.label === 'string' ? c.label.slice(0, 200) : '',
        sound: RING_NAMES.indexOf(c.sound) >= 0 ? c.sound : DEFAULT_RING,
        enabled: c.enabled !== false,
        fired: false
      });
    });
  }
  var k = raw.clock;
  if (k && ['idle', 'running', 'paused'].indexOf(k.state) >= 0 &&
      typeof k.bankedMs === 'number' && isFinite(k.bankedMs) && k.bankedMs >= 0 &&
      typeof k.segmentStartWall === 'number' && isFinite(k.segmentStartWall)) {
    d.clock = { state: k.state, bankedMs: k.bankedMs, segmentStartWall: k.segmentStartWall };
  }
  return d;
}

function getStorage() {
  try { return window.localStorage; } catch (e) { return null; }
}

function loadState(storage) {
  try {
    var text = storage ? storage.getItem(STORAGE_KEY) : null;
    return sanitizeState(text ? JSON.parse(text) : null);
  } catch (e) {
    return defaultState();
  }
}

// A blocked or full storage shouldn't stop the talk.
function saveState(storage, state) {
  if (!storage) return false;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify({
      version: 1,
      target: state.target, countdown: state.countdown, muted: state.muted,
      clockOnly: state.clockOnly, clockFont: state.clockFont,
      clockSize: state.clockSize, cueSize: state.cueSize,
      cues: state.cues.map(function (c) {
        return { at: c.at, label: c.label, sound: c.sound, enabled: c.enabled };
      }),
      clock: state.clock
    }));
    return true;
  } catch (e) {
    return false;
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `powershell -ExecutionPolicy Bypass -File D:\timer\tools\selftest.ps1`
Expected: all PASS.

- [ ] **Step 5: Checkpoint**: self-test PASS.

---

### Task 5: Bell synthesis

**Files:**
- Modify: `D:\timer\timer.html`, above `/* @@BELL */` and above `/* @@TESTS */`

**Interfaces:**
- Consumes: `DEFAULT_RING`, `RING_NAMES`.
- Produces: `BELL_F0`, `STRIKE_SECONDS`, `RING_VOLUME`, `BELL_PARTIALS`, `RING_PROFILES`, `mulberry32(seed) -> () => [0,1)`, `strikeSamples(rate) -> Float32Array`, `ringSamples(name, rate, strike) -> Float32Array` (peak exactly `RING_VOLUME`).

- [ ] **Step 1: Write the failing tests** (insert above `/* @@TESTS */`)

```js
SELFTESTS.push({ name: 'bell', fn: function (t) {
  var rate = 44100;
  var strike = strikeSamples(rate);
  t.eq('strike length', strike.length, rate * STRIKE_SECONDS);
  RING_NAMES.forEach(function (name) {
    var s = ringSamples(name, rate, strike);
    var starts = RING_PROFILES[name].map(function (o) { return Math.floor(o * rate); });
    t.eq(name + ': length', s.length, Math.max.apply(null, starts) + strike.length);
    var peak = 0;
    for (var i = 0; i < s.length; i++) peak = Math.max(peak, Math.abs(s[i]));
    t.near(name + ': peak is the ring volume', peak, RING_VOLUME, 1e-3);
    // A bell starts and ends in silence, or you hear a click at the edges.
    t.ok(name + ': silent edges', Math.abs(s[0]) < 0.003 && Math.abs(s[s.length - 1]) < 0.003,
      s[0] + ', ' + s[s.length - 1]);
    // Struck, not swelled: near full volume inside a few milliseconds.
    var onset = 0;
    while (onset < s.length && Math.abs(s[onset]) <= peak * 0.5) onset++;
    t.ok(name + ': sharp onset', onset < rate * 0.005, (onset / rate * 1000).toFixed(1) + 'ms');
    function loudness(a, b) {
      var sum = 0, from = Math.floor(a * rate), to = Math.floor(b * rate);
      for (var j = from; j < to; j++) sum += s[j] * s[j];
      return Math.sqrt(sum / Math.max(1, to - from));
    }
    t.ok(name + ': rings on and fades', loudness(0, 0.1) > loudness(0.9, 1.0) &&
      loudness(0.9, 1.0) > loudness(1.8, 1.9) && loudness(1.8, 1.9) > 0);
  });
  [44100, 48000].forEach(function (r) {
    BELL_PARTIALS.forEach(function (p) {
      t.ok('partial ' + Math.round(BELL_F0 * p[0]) + 'Hz under the aliasing ceiling at ' + r, BELL_F0 * p[0] < r * 0.45);
    });
  });
  var a = mulberry32(7), b = mulberry32(7);
  t.eq('noise is repeatable', [a(), a()], [b(), b()]);
} });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `powershell -ExecutionPolicy Bypass -File D:\timer\tools\selftest.ps1`
Expected: `FAIL bell threw ReferenceError: strikeSamples is not defined`.

- [ ] **Step 3: Implement** (insert above `/* @@BELL */`)

```js
// A reception bell is a metal dome hit by a sprung hammer: a broadband click,
// then inharmonic partials ringing on with the high ones dying first. Each
// strike is built additively, then copied into the rings below.
var BELL_F0 = 1560;
var STRIKE_SECONDS = 2.0;
var RING_VOLUME = 0.62;
// ratio to the fundamental, relative loudness, how much faster it dies away
var BELL_PARTIALS = [
  [1.00, 1.00, 1.0],
  [2.01, 0.70, 1.4],
  [2.78, 0.45, 1.9],
  [3.84, 0.30, 2.6],
  [5.12, 0.20, 3.3],
  [6.71, 0.12, 4.1]
];
// The times, in seconds, at which the bell is struck. Counting dings is
// easier from the stage than telling two pitches apart.
var RING_PROFILES = {
  single: [0],
  double: [0, 0.26],
  triple: [0, 0.24, 0.48],
  flurry: [0, 0.13, 0.26, 0.39, 0.52, 0.68]
};

// Small seeded PRNG so the hammer noise is the same every time.
function mulberry32(seed) {
  return function () {
    seed = seed + 0x6D2B79F5 | 0;
    var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function peakOf(samples) {
  var peak = 0;
  for (var i = 0; i < samples.length; i++) peak = Math.max(peak, Math.abs(samples[i]));
  return peak;
}

// One hammer strike on the dome, as floats in -1..1.
function strikeSamples(rate) {
  var count = Math.floor(rate * STRIKE_SECONDS);
  var samples = new Float32Array(count);
  // Anything above the Nyquist limit would fold back down as a false tone.
  var ceiling = rate * 0.45;
  BELL_PARTIALS.forEach(function (p, number) {
    var frequency = BELL_F0 * p[0];
    if (frequency >= ceiling) return;
    var step = 2 * Math.PI * frequency / rate;
    // Staggered phases: all at zero swells instead of cracking.
    var phase = 0.7 * number;
    // Decays to roughly 1% over the strike; higher partials go sooner.
    var decay = 4.6 * p[2] / STRIKE_SECONDS;
    for (var i = 0; i < count; i++) {
      samples[i] += p[1] * Math.exp(-decay * i / rate) * Math.sin(phase + step * i);
    }
  });
  // The hammer itself: a very short noise burst, which is what makes it read
  // as struck metal rather than a synthesised beep.
  var noise = mulberry32(0xBE11);
  var burst = Math.floor(rate * 0.006);
  for (var j = 0; j < burst; j++) {
    samples[j] += 0.55 * (noise() * 2 - 1) * Math.exp(-(j / rate) / 0.0015);
  }
  var peak = peakOf(samples) || 1;
  for (var n = 0; n < count; n++) {
    var s = n / rate;
    var envelope = Math.min(1, s / 0.0008) *                 // no click in
      Math.min(1, (STRIKE_SECONDS - s) / 0.02) *             // no click out
      (1 + 0.04 * Math.sin(2 * Math.PI * 5.4 * s));          // dome wobble
    samples[n] = samples[n] / peak * envelope;
  }
  return samples;
}

// Mix the strike at each offset. Overlaps add up past 1, so scale by the
// actual peak: every ring ends up equally loud.
function ringSamples(name, rate, strike) {
  var offsets = RING_PROFILES[name] || RING_PROFILES[DEFAULT_RING];
  var starts = offsets.map(function (o) { return Math.floor(o * rate); });
  var mixed = new Float32Array(Math.max.apply(null, starts) + strike.length);
  starts.forEach(function (start, number) {
    // Repeat strikes land a little softer than the first.
    var gain = number === 0 ? 1 : 0.82;
    for (var i = 0; i < strike.length; i++) mixed[start + i] += strike[i] * gain;
  });
  var scale = RING_VOLUME / (peakOf(mixed) || 1);
  for (var k = 0; k < mixed.length; k++) mixed[k] *= scale;
  return mixed;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `powershell -ExecutionPolicy Bypass -File D:\timer\tools\selftest.ps1`
Expected: all PASS. If "silent edges" fails, print the two values from the detail. The tolerance 0.003 is about 100/32767, the original's limit.

- [ ] **Step 5: Checkpoint**: self-test PASS.

---

### Task 6: Markup and CSS (static layout)

**Files:**
- Modify: `D:\timer\timer.html`, above `/* @@CSS */` and above `<!-- @@MARKUP -->`

**Interfaces:**
- Produces element IDs used by Tasks 7–9: `app`, `stage`, `banner`, `clockArea`, `clock` (canvas), `status`, `strip`, `stripFill`, `stripNotches`, `pills`, `pillSound`, `pillNoSound`, `pillWake`, `controls`, `runBtn`, `resetBtn`, `optCountdown`, `optClockOnly`, `optFull`, `optMute`, `tMin`, `tSec`, `tSet`, `tClear`, `presets` (buttons with `data-minutes`), `panel`, `cueWrap`, `cueBody`, `cMin`, `cSec`, `cLabel`, `cSound`, `cCommit`, `cHear`, `cCancel`, `cEdit`, `cToggle`, `cDelete`, `fontSel`, `sizeSel`, `cueSize`, `hint`, `keys`, `confirm`, `confirmYes`, `confirmNo`.
- CSS classes used by script: `#stage.lit` (flash), `body.clock-only` (hides `#panel`), row classes `off`/`done`/`broken`/`selected`, `#stripNotches i.fired`.

- [ ] **Step 1: Insert the CSS** (above `/* @@CSS */`)

```css
:root {
  --ink: #12151C; --panel: #1A1F29; --edge: #2A3140; --paper: #ECEAE4;
  --muted: #7C8698; --green: #4FB477; --amber: #E8A33D; --red: #D8503E;
  --hover: #364052; --selected: #33415C;
  color-scheme: dark;
}
* { box-sizing: border-box; }
html, body { margin: 0; height: 100%; }
body { background: var(--ink); color: var(--paper); font: 14px/1.4 "Segoe UI", system-ui, sans-serif; overflow: auto; }
#app { height: 100vh; display: flex; flex-direction: column; }
#stage { flex: 1 1 auto; min-height: 200px; display: flex; flex-direction: column; background: var(--ink); }
#stage.lit { background: var(--amber); }
#stage.lit #banner, #stage.lit #status { color: var(--ink) !important; }
#banner { text-align: center; font-weight: 700; padding: 6px 16px 0; min-height: 1.7em; max-height: 40%; overflow: hidden; color: var(--amber); }
#clockArea { position: relative; flex: 1 1 auto; min-height: 45%; }
#clock { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
#status { text-align: center; color: var(--muted); font-size: 13px; padding: 0 16px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#strip { position: relative; height: 16px; margin: 4px 28px 10px; }
#strip::before { content: ""; position: absolute; left: 0; right: 0; top: 6px; height: 6px; background: var(--edge); }
#stripFill { position: absolute; left: 0; top: 6px; height: 6px; width: 0; }
#stripNotches i { position: absolute; top: 1px; width: 2px; height: 15px; margin-left: -1px; background: var(--muted); }
#stripNotches i.fired { background: var(--paper); }
#pills { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; padding: 0 16px; }
.pill { background: #3a2a12; color: var(--amber); border-radius: 4px; padding: 3px 10px; font-size: 13px; margin-bottom: 8px; }
.pill[hidden] { display: none; }
#controls { padding: 0 20px 12px; }
.row { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px 16px; margin-top: 8px; }
.group { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.toggles { gap: 4px 14px; }
button { font: inherit; color: var(--paper); background: var(--edge); border: 0; border-radius: 4px; padding: 7px 12px; cursor: pointer; }
button:hover { background: var(--hover); }
button.primary { background: var(--green); color: var(--ink); font-weight: 700; font-size: 15px; padding: 8px 20px; min-width: 6.5em; }
button.primary:hover { background: #63c78a; }
#presets button { padding: 7px 10px; }
label { color: var(--muted); cursor: pointer; user-select: none; }
label:has(input:checked) { color: var(--paper); }
input[type=checkbox] { accent-color: var(--green); vertical-align: -2px; margin: 0 4px 0 0; }
input[type=number], input[type=text], select { font: inherit; color: var(--paper); background: var(--panel); border: 1px solid var(--edge); border-radius: 4px; padding: 5px 6px; }
#controls input[type=number] { background: var(--panel); }
input[type=number] { width: 4.4em; text-align: center; }
.pair { display: inline-flex; align-items: center; gap: 3px; }
.muted { color: var(--muted); }
#panel { background: var(--panel); padding: 10px 20px 12px; }
#panel input[type=number], #panel input[type=text], #panel select { background: var(--ink); }
body.clock-only #panel { display: none; }
#cueWrap { max-height: 10.5em; overflow-y: auto; border: 1px solid var(--edge); }
#cueWrap table { width: 100%; border-collapse: collapse; }
#cueWrap th { position: sticky; top: 0; background: var(--edge); color: var(--muted); font-weight: 400; font-size: 12px; padding: 4px 10px; }
#cueWrap td { padding: 4px 10px; text-align: center; border-top: 1px solid var(--edge); cursor: default; user-select: none; white-space: nowrap; }
#cueWrap th.wide, #cueWrap td:nth-child(3) { text-align: left; width: 100%; white-space: normal; }
#cueWrap tr.selected td { background: var(--selected); }
#cueWrap tr.off td { color: var(--muted); }
#cueWrap tr.done td { color: var(--green); }
#cueWrap tr.broken td { color: var(--red); }
#cueWrap td.empty { color: var(--muted); text-align: center; }
#editor { justify-content: flex-start; }
#cLabel { flex: 1 1 12em; min-width: 8em; }
.look { justify-content: flex-start; gap: 8px 20px; }
#hint { color: var(--muted); font-size: 12px; margin: 10px 0 0; }
.overlay { position: fixed; inset: 0; background: rgba(10, 12, 16, .75); display: flex; align-items: center; justify-content: center; padding: 16px; z-index: 10; }
.overlay[hidden] { display: none; }
.box { background: var(--panel); border: 1px solid var(--edge); border-radius: 8px; padding: 18px 22px; max-width: 32em; }
.box h2 { margin: 0 0 10px; font-size: 18px; }
.box p { margin: 0 0 12px; }
.box table { border-collapse: collapse; }
.box td { padding: 3px 14px 3px 0; vertical-align: top; }
.box .actions { display: flex; gap: 8px; margin-top: 6px; }
kbd { font: 13px Consolas, monospace; background: var(--edge); border-radius: 3px; padding: 1px 6px; white-space: nowrap; }
```

- [ ] **Step 2: Insert the markup** (above `<!-- @@MARKUP -->`)

```html
<div id="app">
  <section id="stage">
    <div id="banner" aria-live="polite"></div>
    <div id="clockArea"><canvas id="clock" role="img" aria-label="Timer"></canvas></div>
    <div id="status">Ready</div>
    <div id="strip"><div id="stripFill"></div><div id="stripNotches"></div></div>
    <div id="pills">
      <span class="pill" id="pillSound" hidden>&#128263; Click anywhere to enable sound</span>
      <span class="pill" id="pillNoSound" hidden>No sound in this browser: screen flash only</span>
      <span class="pill" id="pillWake" hidden>Screen may sleep: check Windows power settings</span>
    </div>
  </section>

  <section id="controls">
    <div class="row">
      <div class="group">
        <button id="runBtn" class="primary">Start</button>
        <button id="resetBtn">Reset</button>
      </div>
      <div class="group toggles">
        <label><input type="checkbox" id="optCountdown">Count down</label>
        <label><input type="checkbox" id="optClockOnly">Clock only</label>
        <label><input type="checkbox" id="optFull">Full screen</label>
        <label><input type="checkbox" id="optMute">Mute</label>
      </div>
    </div>
    <div class="row">
      <div class="group">
        <span class="muted">Talk length</span>
        <span class="pair">
          <input id="tMin" type="number" min="0" max="599" value="00" aria-label="Talk length minutes">
          <span>:</span>
          <input id="tSec" type="number" min="0" max="59" value="00" aria-label="Talk length seconds">
        </span>
        <button id="tSet">Set</button>
        <button id="tClear">Clear</button>
      </div>
      <div class="group" id="presets">
        <span class="muted">Presets</span>
        <button data-minutes="5">5</button>
        <button data-minutes="10">10</button>
        <button data-minutes="12">12</button>
        <button data-minutes="15">15</button>
        <button data-minutes="20">20</button>
        <button data-minutes="30">30</button>
        <span class="muted">min</span>
      </div>
    </div>
  </section>

  <section id="panel">
    <div id="cueWrap">
      <table>
        <thead><tr><th>On</th><th>Clock reads</th><th class="wide">Cue</th><th>Ring</th></tr></thead>
        <tbody id="cueBody"></tbody>
      </table>
    </div>
    <div class="row" id="editor">
      <span class="pair">
        <input id="cMin" type="number" min="0" max="599" value="00" aria-label="Cue minutes">
        <span>:</span>
        <input id="cSec" type="number" min="0" max="59" value="00" aria-label="Cue seconds">
      </span>
      <input id="cLabel" type="text" maxlength="200" placeholder="Cue name (optional)" aria-label="Cue name">
      <select id="cSound" aria-label="Ring">
        <option value="single">single</option>
        <option value="double">double</option>
        <option value="triple">triple</option>
        <option value="flurry">flurry</option>
      </select>
      <button id="cCommit">Add cue</button>
      <button id="cHear">Hear it</button>
      <button id="cCancel" hidden>Cancel</button>
    </div>
    <div class="row">
      <div class="group">
        <button id="cEdit">Edit</button>
        <button id="cToggle">On / off</button>
        <button id="cDelete">Delete</button>
      </div>
    </div>
    <div class="row look">
      <label>Clock font <select id="fontSel"></select></label>
      <label>Clock size <select id="sizeSel"><option value="">Auto</option></select></label>
      <label>Cue text <input id="cueSize" type="number" min="10" max="72" value="13"></label>
    </div>
    <p id="hint">A cue rings when the clock above reads its time. Double click a cue to edit it. Press <kbd>?</kbd> for keys.</p>
  </section>
</div>

<div id="keys" class="overlay" hidden>
  <div class="box">
    <h2>Keys</h2>
    <table>
      <tr><td><kbd>Space</kbd></td><td>Start / pause</td></tr>
      <tr><td><kbd>R</kbd></td><td>Reset (asks first while running)</td></tr>
      <tr><td><kbd>&uarr;</kbd> <kbd>&darr;</kbd></td><td>Clock reading +1 / &minus;1 min</td></tr>
      <tr><td><kbd>Shift</kbd>+<kbd>&uarr;</kbd> <kbd>&darr;</kbd></td><td>Clock reading +10 / &minus;10 s</td></tr>
      <tr><td><kbd>F</kbd></td><td>Full screen</td></tr>
      <tr><td><kbd>C</kbd></td><td>Clock only</td></tr>
      <tr><td><kbd>M</kbd></td><td>Mute</td></tr>
      <tr><td><kbd>Esc</kbd></td><td>Leave a text field, then this list, then Clock only</td></tr>
      <tr><td><kbd>?</kbd></td><td>Show / hide this list</td></tr>
    </table>
    <p class="muted" style="margin:10px 0 0">Keys are ignored while typing in a field.</p>
  </div>
</div>

<div id="confirm" class="overlay" hidden>
  <div class="box">
    <p>The timer is running. Reset it to 00:00?</p>
    <div class="actions">
      <button id="confirmYes" class="primary">Reset</button>
      <button id="confirmNo">Cancel</button>
    </div>
    <p class="muted" style="margin:10px 0 0">Enter = reset &middot; Esc = cancel</p>
  </div>
</div>
```

- [ ] **Step 3: Check the static layout**

Run: `powershell -ExecutionPolicy Bypass -File D:\timer\tools\smoke.ps1`, then open `%TEMP%\timer-smoke.png`.
Expected: dark page with an empty clock area, the "Ready" status line, the control rows (green Start, Reset, four tick boxes, Talk length with presets), and the panel (empty table, editor row, action buttons, appearance row, hint). Nothing overlaps at 1280×720. Also run with `-Size 900,700` and confirm the rows wrap cleanly.

- [ ] **Step 4: Checkpoint**: self-test still PASS (`selftest.ps1`). `#selftest` hides `#app`.

---

### Task 7: Audio playback (`Bells`)

**Files:**
- Modify: `D:\timer\timer.html`, above `/* @@AUDIO */`

**Interfaces:**
- Consumes: `strikeSamples`, `ringSamples`, `RING_NAMES`, `DEFAULT_RING`, `describeCue`.
- Produces:
  - `DEBUG` (bool, `location.hash === '#debug'`), `dlog(...args)`
  - `Bells.init(onChange)`: creates the AudioContext and the four buffers. `onChange()` is called on every context state change.
  - `Bells.available() -> bool`, `Bells.running() -> bool`
  - `Bells.unlock() -> Promise`
  - `Bells.playNow(sound)`: does nothing unless running.
  - `Bells.preview(sound)`: unlocks, then plays.
  - `Bells.schedule(plan)`: cancels everything, then starts each `{delay, sound, owner}` at `currentTime + delay`.
  - `Bells.cancelAll()`
  - `Bells.wasScheduled(owner) -> bool`: true if a sound for this owner already started or will start within 0.5 s.
  - `Bells.forget()`: clears the memory of already-played owners.

- [ ] **Step 1: Implement** (insert above `/* @@AUDIO */`)

```js
var DEBUG = location.hash === '#debug';
function dlog() {
  if (!DEBUG) return;
  console.log.apply(console, ['[timer ' + new Date().toISOString().slice(11, 23) + ']'].concat([].slice.call(arguments)));
}

// Web Audio player. Upcoming rings are scheduled on the audio clock, which
// keeps time even when the browser throttles a hidden tab's timers.
var Bells = {
  ctx: null,
  buffers: {},
  scheduled: [],      // {src, owner, when}
  played: new Set(),  // owners whose scheduled sound has already started

  init: function (onChange) {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { this.ctx = new AC(); } catch (e) { this.ctx = null; return; }
    var ctx = this.ctx, buffers = this.buffers;
    var strike = strikeSamples(ctx.sampleRate);
    RING_NAMES.forEach(function (name) {
      var data = ringSamples(name, ctx.sampleRate, strike);
      var buffer = ctx.createBuffer(1, data.length, ctx.sampleRate);
      buffer.copyToChannel(data, 0);
      buffers[name] = buffer;
    });
    ctx.addEventListener('statechange', function () {
      dlog('audio state', ctx.state);
      if (onChange) onChange();
    });
  },
  available: function () { return !!this.ctx; },
  running: function () { return !!this.ctx && this.ctx.state === 'running'; },
  // Browsers only let a page make sound after a click or key press.
  unlock: function () {
    if (!this.ctx || this.ctx.state === 'running') return Promise.resolve();
    return this.ctx.resume().catch(function () {});
  },
  start: function (sound, when) {
    var src = this.ctx.createBufferSource();
    src.buffer = this.buffers[sound] || this.buffers[DEFAULT_RING];
    src.connect(this.ctx.destination);
    src.start(when);
    return src;
  },
  playNow: function (sound) {
    if (this.running()) this.start(sound, 0);
  },
  preview: function (sound) {
    var self = this;
    if (!this.ctx) return;
    this.unlock().then(function () { self.playNow(sound); });
  },
  schedule: function (plan) {
    this.cancelAll();
    if (!this.running()) return;
    var now = this.ctx.currentTime, self = this;
    plan.forEach(function (item) {
      var when = now + item.delay;
      self.scheduled.push({ src: self.start(item.sound, when), owner: item.owner, when: when });
      dlog('scheduled', item.owner === 'target' ? "time's up" : describeCue(item.owner),
        item.sound, 'in', item.delay.toFixed(3) + 's', 'at audio time', when.toFixed(3));
    });
  },
  cancelAll: function () {
    var now = this.ctx ? this.ctx.currentTime : 0, played = this.played;
    this.scheduled.forEach(function (e) {
      if (e.when <= now) played.add(e.owner);
      else { try { e.src.stop(); } catch (err) { /* already stopped */ } }
    });
    this.scheduled = [];
  },
  // So the on-screen check doesn't ring a cue the audio clock already rang.
  wasScheduled: function (owner) {
    var now = this.ctx ? this.ctx.currentTime : 0;
    return this.played.has(owner) || this.scheduled.some(function (e) {
      return e.owner === owner && e.when <= now + 0.5;
    });
  },
  forget: function () { this.played.clear(); }
};
```

- [ ] **Step 2: Run the self-test** (checks that the script still parses and the pure sections are intact)

Run: `powershell -ExecutionPolicy Bypass -File D:\timer\tools\selftest.ps1`
Expected: PASS. A syntax error here shows up as "No SELFTEST RESULT line found".

- [ ] **Step 3: Checkpoint**: self-test PASS. Audio is exercised by hand in Task 10.

---

### Task 8: UI core (clock, loop, controls, talk length, toggles, banner, flash)

**Files:**
- Modify: `D:\timer\timer.html`, above `/* @@UI */`

**Interfaces:**
- Consumes: everything from Tasks 2–7 plus the element IDs from Task 6.
- Produces: global `startApp()`, already called by the Task 1 bootstrap. Inside `startApp`, Task 9 adds code at the marker comments `// @@CUES` and `// @@KEYS`. Functions Task 9 relies on (closure scope inside `startApp`): `S`, `cues`, `timer`, `targetFired` (let-style var), `selected`, `editing`, `now()`, `persist()`, `reschedule()`, `render()`, `setBanner(text, colour)`, `startFlash(times)`, `refreshTable()` (defined in Task 9; Task 8 provides a stub that Task 9 replaces), `setPair(minId, secId, total)`, `tidyField(input, hi)`, `toggleRun()`, `requestReset()`, `doReset()`, `adjust(deltaShown)`, `applyTargetFromFields()`, `setClockOnly(on)`, `setMute(on)`, `setFullscreen(on)`, `inField(el)`.

- [ ] **Step 1: Implement `startApp`** (insert above `/* @@UI */`)

```js
var COLOURS = {
  ink: '#12151C', paper: '#ECEAE4', muted: '#7C8698',
  green: '#4FB477', amber: '#E8A33D', red: '#D8503E'
};
// Faces worth offering for the clock, if installed.
var CLOCK_FONTS = [
  'Consolas', 'Cascadia Mono', 'Cascadia Code', 'Lucida Console', 'Courier New',
  'JetBrains Mono', 'Fira Mono', 'Roboto Mono', 'Source Code Pro', 'IBM Plex Mono',
  'Noto Sans Mono', 'DejaVu Sans Mono', 'Arial Narrow', 'Roboto Condensed', 'Oswald',
  'Bebas Neue', 'Haettenschweiler', 'Segoe UI', 'Arial', 'Verdana', 'Tahoma',
  'Trebuchet MS', 'Franklin Gothic Medium', 'Century Gothic', 'Impact', 'Georgia',
  'Times New Roman'
];
var DEFAULT_FONTS = ['Consolas', 'Cascadia Mono', 'Courier New'];
var SIZE_CHOICES = [24, 32, 40, 48, 56, 64, 72, 88, 104, 120, 144, 168, 200, 240, 300, 360, 440, 520, 600];
var BANNER_MS = 9000;
var FLASH_STEP_MS = 170;
var realClock = {
  mono: function () { return performance.now(); },
  wall: function () { return Date.now(); }
};

function $(id) { return document.getElementById(id); }

function fontStack(name) {
  return name === 'monospace' ? 'monospace' : '"' + name + '", monospace';
}

// Which of CLOCK_FONTS are installed: steady digits first, then narrowest
// first, because width is what limits how big the clock can be.
function installedFonts() {
  var c = document.createElement('canvas').getContext('2d');
  var sample = 'mmmmmmmmmmlli 09:59 WQ';
  function width(stack) { c.font = '72px ' + stack; return c.measureText(sample).width; }
  var mono = width('monospace'), sans = width('sans-serif');
  var found = CLOCK_FONTS.filter(function (name) {
    return width('"' + name + '", monospace') !== mono || width('"' + name + '", sans-serif') !== sans;
  });
  function steady(name) {
    c.font = 'bold 100px ' + fontStack(name);
    var first = c.measureText('0').width;
    for (var d = 1; d < 10; d++) if (Math.abs(c.measureText(String(d)).width - first) > 0.01) return false;
    return true;
  }
  function readingWidth(name) { c.font = 'bold 1000px ' + fontStack(name); return c.measureText('09:59').width; }
  function byWidth(a, b) { return readingWidth(a) - readingWidth(b); }
  var steadyOnes = found.filter(steady);
  var rest = found.filter(function (n) { return steadyOnes.indexOf(n) < 0; });
  var list = steadyOnes.sort(byWidth).concat(rest.sort(byWidth));
  return list.length ? list : ['monospace'];
}

function startApp() {
  var storage = getStorage();
  var stored = loadState(storage);
  var S = {
    target: stored.target, countdown: stored.countdown, muted: stored.muted,
    clockOnly: stored.clockOnly, clockFont: stored.clockFont,
    clockSize: stored.clockSize, cueSize: stored.cueSize
  };
  var cues = stored.cues;
  var timer = new Timer(realClock);
  timer.restore(stored.clock);
  sortCues(cues, S);
  // After a reload, anything that should already have rung stays silent.
  var targetFired = rearm(cues, S, timer.elapsed());
  var selected = null, editing = null;
  var flashLeft = 0, lit = false, flashJob = 0, bannerJob = 0;
  var wakeLock = null;
  var canvas = $('clock'), g = canvas.getContext('2d');
  var fitCache = { key: '', px: 0 };
  var last = {};  // what is on screen now, so unchanged things aren't redrawn

  function now() { return timer.elapsed(); }

  function persist() {
    saveState(storage, {
      target: S.target, countdown: S.countdown, muted: S.muted, clockOnly: S.clockOnly,
      clockFont: S.clockFont, clockSize: S.clockSize, cueSize: S.cueSize,
      cues: cues, clock: timer.snapshot()
    });
  }

  function reschedule() {
    if (timer.state === 'running' && !S.muted) Bells.schedule(planRings(cues, S, now(), targetFired));
    else Bells.cancelAll();
  }

  // ---------------- banner and flash ----------------

  function setBanner(text, colour) {
    clearTimeout(bannerJob);
    var el = $('banner');
    el.textContent = text;
    el.style.color = COLOURS[colour || 'amber'];
    if (text) bannerJob = setTimeout(function () { el.textContent = ''; }, BANNER_MS);
  }

  // Projector audio fails, and sometimes you don't want a ding the audience
  // can hear, so every cue also flashes the screen.
  function startFlash(times) {
    clearTimeout(flashJob);
    flashLeft = times * 2;
    flashStep();
  }
  function flashStep() {
    if (flashLeft <= 0) {
      flashLeft = 0; lit = false;
      $('stage').classList.remove('lit');
      render();
      return;
    }
    lit = flashLeft % 2 === 0;
    $('stage').classList.toggle('lit', lit);
    flashLeft--;
    render();
    flashJob = setTimeout(flashStep, FLASH_STEP_MS);
  }

  // ---------------- the clock ----------------

  // Each digit sits centred in a cell as wide as the widest digit, so the
  // reading never shuffles sideways, whatever the font.
  function layout(text, px) {
    g.font = 'bold ' + px + 'px ' + fontStack(S.clockFont);
    var digit = 0;
    for (var d = 0; d < 10; d++) digit = Math.max(digit, g.measureText(String(d)).width);
    var cells = [], x = 0;
    for (var i = 0; i < text.length; i++) {
      var ch = text.charAt(i);
      var w = /\d/.test(ch) ? digit : g.measureText(ch).width;
      cells.push({ ch: ch, x: x + w / 2 });
      x += w;
    }
    var ink = g.measureText('0123456789');
    return { width: x, cells: cells, ascent: ink.actualBoundingBoxAscent, descent: ink.actualBoundingBoxDescent };
  }

  // Digit size: height is the aim, width is usually the limit.
  function fitPx(shape, w, h) {
    var bare = S.clockOnly && !!document.fullscreenElement;
    var key = [shape, w, h, S.clockFont, S.clockSize, bare].join('|');
    if (fitCache.key === key) return fitCache.px;
    var probe = layout(shape, 1000);
    var capRatio = (probe.ascent + probe.descent) / 1000 || 0.7;
    var wanted = S.clockSize ? S.clockSize * 96 / 72 * capRatio
      : bare ? 0.75 * screen.height : h * 0.95;
    var ink = Math.max(12, Math.min(wanted, h * 0.98));
    var px = ink / capRatio;
    var budget = Math.max(40, w * (bare ? 0.995 : 0.96));
    px = Math.max(8, Math.floor(Math.min(px, budget * 1000 / probe.width)));
    fitCache = { key: key, px: px };
    return px;
  }

  function drawClock(text, colour) {
    var w = canvas.clientWidth, h = canvas.clientHeight;
    if (w < 2 || h < 2) return;
    var dpr = window.devicePixelRatio || 1;
    var key = [text, colour, w, h, dpr, S.clockFont, S.clockSize, S.clockOnly, !!document.fullscreenElement].join('|');
    if (last.clock === key) return;
    last.clock = key;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    var px = fitPx(text.replace(/\d/g, '0'), w, h);
    var lay = layout(text, px);
    g.fillStyle = colour;
    g.textAlign = 'center';
    g.textBaseline = 'alphabetic';
    // Centre the ink, not the line box.
    var baseline = h / 2 + (lay.ascent - lay.descent) / 2;
    var left = (w - lay.width) / 2;
    lay.cells.forEach(function (c) { g.fillText(c.ch, left + c.x, baseline); });
  }

  function setText(id, text) {
    if (last[id] === text) return;
    last[id] = text;
    $(id).textContent = text;
  }

  function renderStrip(elapsed) {
    var m = stripModel(cues, S, timer.state, elapsed);
    var fill = $('stripFill');
    fill.style.width = (m.fraction * 100).toFixed(3) + '%';
    fill.style.background = COLOURS[m.fill];
    var key = JSON.stringify(m.notches);
    if (last.notches === key) return;
    last.notches = key;
    var box = $('stripNotches');
    box.textContent = '';
    m.notches.forEach(function (n) {
      var mark = document.createElement('i');
      mark.style.left = (n.x * 100) + '%';
      if (n.fired) mark.className = 'fired';
      box.appendChild(mark);
    });
  }

  function render() {
    var elapsed = now();
    var colour = COLOURS[colourStage(S, timer.state, elapsed)];
    if (flashLeft > 0) colour = lit ? COLOURS.ink : COLOURS.paper;
    drawClock(formatHms(shownSeconds(S, elapsed)), colour);
    setText('runBtn', timer.state === 'running' ? 'Pause' : timer.state === 'paused' ? 'Resume' : 'Start');
    setText('status', statusText(S, timer.state, elapsed, cues, S.muted));
    renderStrip(elapsed);
  }

  // ---------------- the loop ----------------

  function handleDue(elapsed) {
    var r = checkDue(cues, S, elapsed, targetFired);
    if (!r.due.length && !r.timesUp) return;
    if (r.timesUp) targetFired = true;
    if (r.ringSound && !S.muted && !Bells.wasScheduled(r.ringOwner)) {
      dlog('ringing now (was not scheduled)', r.ringSound);
      Bells.playNow(r.ringSound);
    }
    r.due.forEach(function (c) {
      dlog('cue', describeCue(c), 'due at', fireAt(c, S).toFixed(3), 'seen at', elapsed.toFixed(3),
        'late by', (elapsed - fireAt(c, S)).toFixed(3) + 's');
    });
    if (r.due.length) {
      setBanner(r.due.map(describeCue).join(' + '), 'amber');
      startFlash(5);
    }
    if (r.timesUp) {
      dlog("time's up due at", S.target, 'seen at', elapsed.toFixed(3));
      setBanner(r.coincident.length ? "Time's up \u00b7 " + r.coincident.map(describeCue).join(' + ') : "Time's up", 'red');
      startFlash(8);
    }
    refreshTable();
  }

  function frame() {
    if (timer.state === 'running') handleDue(now());
    render();
  }

  // ---------------- transport ----------------

  function toggleRun() {
    timer.toggle();
    persist(); reschedule(); render();
  }

  function requestReset() {
    if (timer.state === 'running') { $('confirm').hidden = false; return; }
    doReset();
  }

  function doReset() {
    $('confirm').hidden = true;
    timer.reset();
    cues.forEach(function (c) { c.fired = false; });
    targetFired = false;
    sortCues(cues, S);
    setBanner('');
    refreshTable(); persist(); reschedule(); Bells.forget(); render();
  }

  // Cues jumped past stay silent; cues jumped back before ring again.
  function adjust(deltaShown) {
    timer.setElapsed(adjustedElapsed(S, now(), deltaShown));
    targetFired = rearm(cues, S, now());
    refreshTable(); persist(); reschedule(); Bells.forget(); render();
  }

  // ---------------- talk length and direction ----------------

  function setPair(minId, secId, total) {
    $(minId).value = pad2(Math.floor(total / 60));
    $(secId).value = pad2(total % 60);
  }

  // Force whatever was typed back into padded digits within range.
  function tidyField(input, hi) {
    var v = Math.floor(Number(String(input.value).trim()));
    input.value = pad2(isFinite(v) ? Math.max(0, Math.min(hi, v)) : 0);
  }

  function warnUnreachable() {
    var text = unreachableText(cues, S);
    if (text) setBanner(text, 'red');
    return !!text;
  }

  function afterTimingChange() {
    sortCues(cues, S);
    targetFired = rearm(cues, S, now());
    refreshTable(); persist(); reschedule(); render();
  }

  function applyTarget(total) {
    if (total <= 0) { setBanner('Time must be greater than zero.', 'red'); return; }
    S.target = total;
    setPair('tMin', 'tSec', total);
    afterTimingChange();
    if (!warnUnreachable()) setBanner('');
  }

  function applyTargetFromFields() {
    applyTarget(readPair($('tMin').value, $('tSec').value).total);
  }

  function clearTarget() {
    S.target = null;
    setPair('tMin', 'tSec', 0);
    afterTimingChange();
    if (cues.length) setBanner('No talk length, so cue times are now time elapsed.', 'muted');
  }

  function applyCountdown(on) {
    S.countdown = on;
    $('optCountdown').checked = on;
    afterTimingChange();
    if (!warnUnreachable() && cues.length) {
      setBanner(countingDown(S) ? 'Cue times are now time remaining.' : 'Cue times are now time elapsed.', 'muted');
    }
  }

  // ---------------- view toggles ----------------

  function setClockOnly(on) {
    S.clockOnly = on;
    $('optClockOnly').checked = on;
    document.body.classList.toggle('clock-only', on);
    persist(); render();
  }

  function setMute(on) {
    S.muted = on;
    $('optMute').checked = on;
    persist(); reschedule(); render();
  }

  function setFullscreen(on) {
    var root = document.documentElement;
    if (on && !document.fullscreenElement) {
      var p = root.requestFullscreen ? root.requestFullscreen() : null;
      if (p && p.catch) p.catch(function () { $('optFull').checked = false; });
      else if (!p) $('optFull').checked = false;
    } else if (!on && document.fullscreenElement) {
      document.exitFullscreen();
    }
  }

  function inField(el) {
    if (!el) return false;
    return el.tagName === 'SELECT' || el.tagName === 'TEXTAREA' ||
      (el.tagName === 'INPUT' && el.type !== 'checkbox');
  }

  // ---------------- appearance ----------------

  function fillAppearance() {
    var fonts = installedFonts();
    if (fonts.indexOf(S.clockFont) < 0) {
      S.clockFont = DEFAULT_FONTS.filter(function (f) { return fonts.indexOf(f) >= 0; })[0] || fonts[0];
    }
    var fontSel = $('fontSel');
    fonts.forEach(function (name) {
      var o = document.createElement('option');
      o.value = name; o.textContent = name;
      fontSel.appendChild(o);
    });
    fontSel.value = S.clockFont;
    var sizeSel = $('sizeSel');
    SIZE_CHOICES.forEach(function (n) {
      var o = document.createElement('option');
      o.value = String(n); o.textContent = String(n);
      sizeSel.appendChild(o);
    });
    if (S.clockSize && SIZE_CHOICES.indexOf(S.clockSize) < 0) S.clockSize = null;
    sizeSel.value = S.clockSize ? String(S.clockSize) : '';
    $('cueSize').value = S.cueSize;
    $('banner').style.fontSize = S.cueSize + 'pt';
  }

  function applyCueSize() {
    var v = Math.floor(Number($('cueSize').value));
    S.cueSize = isFinite(v) ? Math.max(10, Math.min(72, v)) : 13;
    $('cueSize').value = S.cueSize;
    $('banner').style.fontSize = S.cueSize + 'pt';
    persist(); render();
  }

  // ---------------- pills and wake lock ----------------

  function updatePills() {
    $('pillNoSound').hidden = Bells.available();
    $('pillSound').hidden = !Bells.available() || Bells.running();
  }

  // Keep the screen on while the timer is visible. Refused or missing,
  // say so, so the chair can fix the power settings before the session.
  function requestWake() {
    if (!('wakeLock' in navigator)) { $('pillWake').hidden = false; return; }
    if (document.visibilityState !== 'visible' || wakeLock) return;
    navigator.wakeLock.request('screen').then(function (lock) {
      wakeLock = lock;
      $('pillWake').hidden = true;
      dlog('wake lock held');
      lock.addEventListener('release', function () {
        wakeLock = null;
        dlog('wake lock released');
        if (document.visibilityState === 'visible') requestWake();
      });
    }).catch(function (err) {
      dlog('wake lock refused', String(err));
      $('pillWake').hidden = false;
    });
  }

  // Stub until Task 9 replaces it with the real cue table.
  function refreshTable() {}

  // @@CUES

  // ---------------- wiring ----------------

  $('runBtn').addEventListener('click', toggleRun);
  $('resetBtn').addEventListener('click', requestReset);
  $('confirmYes').addEventListener('click', doReset);
  $('confirmNo').addEventListener('click', function () { $('confirm').hidden = true; });
  $('optCountdown').addEventListener('change', function () { applyCountdown(this.checked); });
  $('optClockOnly').addEventListener('change', function () { setClockOnly(this.checked); });
  $('optMute').addEventListener('change', function () { setMute(this.checked); });
  $('optFull').addEventListener('change', function () { setFullscreen(this.checked); });
  $('tSet').addEventListener('click', applyTargetFromFields);
  $('tClear').addEventListener('click', clearTarget);
  Array.prototype.forEach.call($('presets').querySelectorAll('button'), function (b) {
    b.addEventListener('click', function () { applyTarget(Number(b.getAttribute('data-minutes')) * 60); });
  });
  [['tMin', MAX_MINUTES], ['tSec', 59], ['cMin', MAX_MINUTES], ['cSec', 59]].forEach(function (pair) {
    $(pair[0]).addEventListener('blur', function () { tidyField(this, pair[1]); });
  });
  $('fontSel').addEventListener('change', function () {
    S.clockFont = this.value; this.blur(); persist(); render();
  });
  $('sizeSel').addEventListener('change', function () {
    S.clockSize = this.value ? Number(this.value) : null; this.blur(); persist(); render();
  });
  $('cueSize').addEventListener('change', applyCueSize);

  document.addEventListener('fullscreenchange', function () {
    $('optFull').checked = !!document.fullscreenElement;
    render();
  });
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') { requestWake(); frame(); }
  });
  window.addEventListener('pagehide', function () { Bells.cancelAll(); });

  // Any click or key press unlocks sound.
  function onGesture() { if (Bells.available() && !Bells.running()) Bells.unlock(); }
  document.addEventListener('pointerdown', onGesture, true);
  document.addEventListener('keydown', onGesture, true);

  // Buttons and tick boxes don't take focus (like the original's
  // takefocus=False), so Space always reaches the timer. Clicking them, or
  // the clock, also steps out of a text field.
  document.addEventListener('mousedown', function (e) {
    var t = e.target;
    if (t.closest('button, label, input[type=checkbox], #cueWrap, #stage')) {
      if (!(t.tagName === 'INPUT' && t.type !== 'checkbox') && t.tagName !== 'SELECT') {
        e.preventDefault();
        if (inField(document.activeElement)) document.activeElement.blur();
      }
    }
  });

  // @@KEYS

  // ---------------- start ----------------

  $('optCountdown').checked = S.countdown;
  $('optMute').checked = S.muted;
  $('optClockOnly').checked = S.clockOnly;
  document.body.classList.toggle('clock-only', S.clockOnly);
  if (S.target) setPair('tMin', 'tSec', S.target);
  fillAppearance();
  Bells.init(function () { updatePills(); reschedule(); });
  updatePills();
  refreshTable();
  requestWake();
  reschedule();
  if (window.ResizeObserver) {
    new ResizeObserver(function () { last.clock = ''; render(); }).observe($('clockArea'));
  }
  window.addEventListener('resize', function () { last.clock = ''; render(); });
  (function loop() { frame(); requestAnimationFrame(loop); })();
  // Backup for when animation frames stop (hidden tab).
  setInterval(frame, 250);
}
```

- [ ] **Step 2: Self-test still passes**

Run: `powershell -ExecutionPolicy Bypass -File D:\timer\tools\selftest.ps1`. Expected: PASS.

- [ ] **Step 3: Smoke render**

Run: `powershell -ExecutionPolicy Bypass -File D:\timer\tools\smoke.ps1`, then view `%TEMP%\timer-smoke.png`.
Expected: large white `00:00` centred in the clock area, "Ready" status, font list populated (check the DOM dump: `#fontSel` has options and `Consolas` is selected), the "Click anywhere to enable sound" pill visible (headless has no gesture). Then run `smoke.ps1 -Size 1920,1080` and confirm the digits scale up.

- [ ] **Step 4: Manual check in Edge** (open `D:\timer\timer.html` by double-click or drag into Edge)

- Click preset 10: the clock shows `10:00`, status "Ready · elapsed 00:00 of 10:00".
- Click Start: digits green, counting down, status "Running", strip filling.
- Click Pause: grey digits, button "Resume".
- Untick Count down: the clock shows elapsed time.
- Tick Clock only: the panel disappears and the controls stay.
- Tick Full screen: the browser goes full screen; Esc leaves it and the box unticks.
- Reload (F5) while running: the timer is still running at the right time, and the sound pill shows until you click.
- Set 0:00 in the talk-length fields and press Set: red banner "Time must be greater than zero."
- Type `90` in the minutes field and press Set: the clock shows `1:30:00`.

- [ ] **Step 5: Checkpoint**: self-test PASS; manual checks done.

---

### Task 9: Cue panel and keyboard

**Files:**
- Modify: `D:\timer\timer.html`: replace the `refreshTable` stub and insert code at `// @@CUES` and `// @@KEYS` inside `startApp`.

**Interfaces:**
- Consumes: the closure functions listed in Task 8.
- Produces: `refreshTable()`, `commitCue()`, `editSelected()`, `cancelEdit()`, `toggleSelected()`, `deleteSelected()`, plus the keyboard handler.

- [ ] **Step 1: Delete the stub**

Remove these two lines from `startApp`:
```js
  // Stub until Task 9 replaces it with the real cue table.
  function refreshTable() {}
```

- [ ] **Step 2: Insert the cue panel above `// @@CUES`**

```js
  // ---------------- cue list ----------------

  function refreshTable() {
    var body = $('cueBody');
    body.textContent = '';
    if (!cues.length) {
      var tr0 = document.createElement('tr'), td0 = document.createElement('td');
      td0.colSpan = 4; td0.className = 'empty';
      td0.textContent = 'No cues yet. Add one below: a time, a name and a ring.';
      tr0.appendChild(td0); body.appendChild(tr0);
      return;
    }
    cues.forEach(function (cue, index) {
      var tr = document.createElement('tr');
      var mark = '\u25cf';
      if (!cue.enabled) { tr.className = 'off'; mark = '\u25cb'; }
      else if (fireAt(cue, S) === null) { tr.className = 'broken'; mark = '!'; }
      else if (cue.fired) tr.className = 'done';
      if (cue === selected) tr.classList.add('selected');
      tr.setAttribute('data-index', String(index));
      [mark, formatHms(cue.at), cue.label || '\u2014', cue.sound].forEach(function (text) {
        var td = document.createElement('td');
        td.textContent = text;
        tr.appendChild(td);
      });
      body.appendChild(tr);
    });
  }

  function rowCue(e) {
    var tr = e.target.closest('tr[data-index]');
    return tr ? cues[Number(tr.getAttribute('data-index'))] : null;
  }

  // Selection is changed in place: rebuilding the rows mid double-click
  // would lose the second click.
  function select(cue) {
    selected = cue;
    Array.prototype.forEach.call($('cueBody').querySelectorAll('tr[data-index]'), function (tr) {
      tr.classList.toggle('selected', cues[Number(tr.getAttribute('data-index'))] === cue);
    });
  }

  function selectedCue() {
    if (selected && cues.indexOf(selected) >= 0) return selected;
    setBanner('Select a cue in the list first.', 'muted');
    return null;
  }

  function endEdit() {
    editing = null;
    setPair('cMin', 'cSec', 0);
    $('cLabel').value = '';
    $('cCommit').textContent = 'Add cue';
    $('cCancel').hidden = true;
  }

  // Add a new cue, or save the one being edited.
  function commitCue() {
    var at = readPair($('cMin').value, $('cSec').value).total;
    setPair('cMin', 'cSec', at);
    var problem = cueProblem(at, S, cues, editing);
    if (problem) { setBanner(problem.text, problem.colour); return; }
    var label = $('cLabel').value.trim();
    var sound = $('cSound').value || DEFAULT_RING;
    var cue = editing, verb = 'Saved';
    if (!cue) {
      cue = { at: at, label: label, sound: sound, enabled: true, fired: false };
      cues.push(cue);
      verb = 'Added';
    } else {
      cue.at = at; cue.label = label; cue.sound = sound;
    }
    var f = fireAt(cue, S);
    var past = f !== null && now() >= f;
    cue.fired = past;  // don't blast the room for a time already gone
    sortCues(cues, S);
    endEdit();
    setBanner(past ? verb + ' ' + formatHms(at) + ' \u2014 already passed, so it won\u2019t ring this run.' : '', 'muted');
    selected = cue;
    refreshTable(); persist(); reschedule(); render();
  }

  function editSelected() {
    var cue = selectedCue();
    if (!cue) return;
    editing = cue;
    setPair('cMin', 'cSec', cue.at);
    $('cLabel').value = cue.label;
    $('cSound').value = cue.sound;
    $('cCommit').textContent = 'Save cue';
    $('cCancel').hidden = false;
    $('cLabel').focus();
    setBanner('Editing the ' + formatHms(cue.at) + ' cue.', 'muted');
  }

  function cancelEdit() {
    endEdit();
    setBanner('');
  }

  function toggleSelected() {
    var cue = selectedCue();
    if (!cue) return;
    cue.enabled = !cue.enabled;
    var f = fireAt(cue, S);
    if (cue.enabled && f !== null && now() < f) cue.fired = false;
    refreshTable(); persist(); reschedule(); render();
  }

  function deleteSelected() {
    var cue = selectedCue();
    if (!cue) return;
    cues.splice(cues.indexOf(cue), 1);
    if (cue === editing) endEdit();
    selected = null;
    refreshTable(); persist(); reschedule(); render();
  }

  $('cueBody').addEventListener('click', function (e) { var c = rowCue(e); if (c) select(c); });
  $('cueBody').addEventListener('dblclick', function (e) { var c = rowCue(e); if (c) { select(c); editSelected(); } });
  $('cCommit').addEventListener('click', commitCue);
  $('cCancel').addEventListener('click', cancelEdit);
  $('cHear').addEventListener('click', function () { Bells.preview($('cSound').value); });
  $('cSound').addEventListener('change', function () { this.blur(); });
  $('cEdit').addEventListener('click', editSelected);
  $('cToggle').addEventListener('click', toggleSelected);
  $('cDelete').addEventListener('click', deleteSelected);
```

- [ ] **Step 3: Insert the keyboard handler above `// @@KEYS`**

```js
  // ---------------- keyboard ----------------

  document.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.altKey || e.metaKey) return;  // leave Ctrl+R, Alt+Tab etc. alone
    if (!$('confirm').hidden) {
      if (e.key === 'Enter') { e.preventDefault(); doReset(); }
      else if (e.key === 'Escape') { e.preventDefault(); $('confirm').hidden = true; }
      return;
    }
    var el = document.activeElement;
    if (e.key === 'Escape') {
      // Step out of a text field first; then the key list; then Clock only.
      // In full screen the browser takes Esc itself and leaves full screen.
      if (inField(el)) el.blur();
      else if (!$('keys').hidden) $('keys').hidden = true;
      else if (S.clockOnly) setClockOnly(false);
      e.preventDefault();
      return;
    }
    if (inField(el)) {
      if (e.key === 'Enter') {
        if (el.id === 'tMin' || el.id === 'tSec') applyTargetFromFields();
        else if (el.id === 'cMin' || el.id === 'cSec' || el.id === 'cLabel') commitCue();
        else if (el.id === 'cueSize') applyCueSize();
      }
      return;  // a space typed into a field is just a space
    }
    var repeatable = e.key === 'ArrowUp' || e.key === 'ArrowDown';
    if (e.repeat && !repeatable) { e.preventDefault(); return; }
    var handled = true;
    switch (e.key) {
      case ' ': toggleRun(); break;
      case 'r': case 'R': requestReset(); break;
      case 'ArrowUp': adjust(e.shiftKey ? 10 : 60); break;
      case 'ArrowDown': adjust(e.shiftKey ? -10 : -60); break;
      case 'f': case 'F': setFullscreen(!document.fullscreenElement); break;
      case 'c': case 'C': setClockOnly(!S.clockOnly); break;
      case 'm': case 'M': setMute(!S.muted); break;
      case '?': $('keys').hidden = !$('keys').hidden; break;
      default: handled = false;
    }
    if (handled) e.preventDefault();
  });
  // Space on a focused control would otherwise click it on key up.
  document.addEventListener('keyup', function (e) {
    if (e.key === ' ' && !inField(document.activeElement)) e.preventDefault();
  });
  $('keys').addEventListener('click', function () { $('keys').hidden = true; });
```

- [ ] **Step 4: Self-test and smoke**

Run `selftest.ps1` (expected PASS) and `smoke.ps1` (expected: the screenshot shows "No cues yet…" in the table).

- [ ] **Step 5: Manual check in Edge, with `#debug`** (open `file:///D:/timer/timer.html#debug`, F12 → Console)

- Preset 10 → add cues `05:00 Halfway single`, `02:00 Questions triple`, `00:00` (no label, double). The table is sorted 05:00, 02:00, 00:00 and the strip has 3 notches.
- Add `05:00` again: amber banner "There's already a cue at 05:00."
- Add `12:00`: red banner "Counting down from 10:00, the clock never reads 12:00."
- Hear it with "triple": three dings.
- Space starts; the console shows `scheduled Halfway single in 300.000s …`.
- Press ↓ five times (−5 min): the clock jumps to about 05:00 and Halfway rings (or is marked done) with no double ring. Press ↓ again past 02:00: Questions is marked done silently (it turns green, no flash). Press ↑ twice: Questions re-arms (white text).
- Let it run to 00:00: the 00:00 cue rings "double" (not the flurry), the banner reads "Time's up · 00:00", 8 flashes, then `-00:01` in red.
- R while running: the box appears; Esc cancels; R then Enter resets.
- Double-click a row: the editor fills, the button reads "Save cue", Cancel shows. Change the label and Save.
- Select a row → On / off: ○ and grey. Delete removes it.
- With the cursor in the label field, Space types a space. Esc leaves the field and Space then starts or pauses.
- `?` shows the key list; Esc or a click closes it.
- C toggles Clock only, M toggles mute ("muted" in the status line), F toggles full screen.

- [ ] **Step 6: Checkpoint**: self-test PASS; manual checks done.

---

### Task 10: Cleanup and verification

**Files:**
- Modify: `D:\timer\timer.html`: remove the marker comments.

- [ ] **Step 1: Remove markers**

Delete the lines `/* @@CSS */`, `<!-- @@MARKUP -->`, `/* @@ENGINE */`, `/* @@BELL */`, `/* @@STORAGE */`, `/* @@AUDIO */`, `/* @@UI */`, `/* @@TESTS */`, `// @@CUES`, `// @@KEYS`. Check with `Select-String -Path D:\timer\timer.html -Pattern '@@'`, which should return no output.

- [ ] **Step 2: Self-test**: `selftest.ps1` gives PASS.

- [ ] **Step 3: Static network scan**

```powershell
Select-String -Path D:\timer\timer.html -Pattern 'https?:', '\bsrc\s*=', '<link', '@import', 'url\(', 'fetch\(', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'sendBeacon', 'new Worker', 'import\('
```
Expected: no output.

- [ ] **Step 4: Network log under a real load**

```powershell
$edge = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
$log = Join-Path $env:TEMP 'timer-netlog.json'
$url = 'file:///D:/timer/timer.html'
Start-Process -FilePath $edge -Wait -NoNewWindow -RedirectStandardOutput (Join-Path $env:TEMP 'timer-net-dom.txt') `
  -ArgumentList @('--headless','--disable-gpu',"--user-data-dir=`"$env:TEMP\timer-net-profile`"","--log-net-log=`"$log`"",'--net-log-capture-mode=Default','--dump-dom',$url)
Select-String -Path $log -Pattern '"url":"[^"]*"' -AllMatches | ForEach-Object { $_.Matches.Value } | Sort-Object -Unique
```
Expected: only `file:///D:/timer/timer.html`, plus at most browser-internal URLs that the page didn't initiate (e.g. Edge's own config service). Report anything else. The CSP blocks every page request anyway, so to confirm it works, temporarily add `<img src="https://example.com/x.png">` to a copy in `%TEMP%` (never in `D:\timer\ref`). The DOM dump of that copy has no loaded image, and `--enable-logging=stderr` shows the CSP violation. Delete the copy afterwards.

- [ ] **Step 5: `/ref` unchanged**

```bash
SP="C:/Users/Appen/AppData/Local/Temp/claude/d--timer/22ff1848-f206-4f04-8a57-1eb61df95c66/scratchpad"
cd /d/timer/ref && find . -type f -print0 | sort -z | xargs -0 sha256sum > "$SP/ref_after.sha256" && diff "$SP/ref_before.sha256" "$SP/ref_after.sha256" && echo REF-UNCHANGED && wc -l < "$SP/ref_after.sha256"
```
Expected: `REF-UNCHANGED` and `26`.

- [ ] **Step 6: Accuracy in a hidden tab (manual, about 10 minutes)**

- Open `file:///D:/timer/timer.html#debug` in Edge and open DevTools → Console. Set preset 10 and add cues at 05:00 and 02:00.
- Note the wall time, press Space, and immediately switch to another tab.
- Leave it hidden for 9 minutes. You should hear Halfway at +5:00 and Questions at +8:00 on time, even though the tab is hidden.
- Return at about +9:00. The clock reads 01:00 ± 1 s compared with the wall clock. The console shows `scheduled …` lines from the start, and the `cue … late by` lines show the on-screen catch-up (which may be late in a hidden tab; that's expected and harmless because the sound came from the audio clock).

- [ ] **Step 7: Final checkpoint**: report the results of steps 2–6 faithfully, including anything that failed.
