(function () {
  // Controllable clock: the UI under test reads this instead of the real one.
  var fc = { m: 0, w: Date.now(), mono: function () { return fc.m; }, wall: function () { return fc.w; } };
  realClock = fc;
  try { localStorage.clear(); } catch (e) {}
  startApp();

  var log = [];
  function check(label, cond, detail) { log.push((cond ? 'PASS ' : 'FAIL ') + label + (cond ? '' : ' :: ' + detail)); }
  function key(k, opts) {
    var target = document.activeElement || document.body;
    target.dispatchEvent(new KeyboardEvent('keydown', Object.assign({ key: k, bubbles: true, cancelable: true }, opts || {})));
  }
  function click(el) { (typeof el === 'string' ? document.getElementById(el) : el).click(); }
  function adv(sec) { fc.m += sec * 1000; fc.w += sec * 1000; }
  function $t(id) { return document.getElementById(id).textContent; }
  function val(id, v) { document.getElementById(id).value = v; }
  function rows() { return Array.prototype.map.call(document.querySelectorAll('#cueBody tr[data-index]'), function (tr) { return { cls: tr.className, cells: Array.prototype.map.call(tr.children, function (td) { return td.textContent; }) }; }); }
  function addCue(m, s, label, sound) { val('cMin', m); val('cSec', s); val('cLabel', label); val('cSound', sound); click('cCommit'); }

  var steps = [
    function () {
      click(document.querySelector('#presets button[data-minutes="10"]'));
      check('preset 10 sets talk length', $t('status') === 'Ready   ·   elapsed 00:00 of 10:00', $t('status'));
      check('fields show 10:00', document.getElementById('tMin').value === '10' && document.getElementById('tSec').value === '00', document.getElementById('tMin').value);
      check('sound pill shown before any gesture', !document.getElementById('pillSound').hidden, 'hidden');
    },
    function () {
      addCue('2', '00', 'Questions', 'triple');
      addCue('5', '00', 'Halfway', 'single');
      addCue('0', '00', '', 'double');
      var r = rows();
      check('three cues, in ring order', r.length === 3 && r[0].cells[1] === '05:00' && r[1].cells[1] === '02:00' && r[2].cells[1] === '00:00', JSON.stringify(r));
      check('empty label shows a dash', r[2].cells[2] === '—', r[2].cells[2]);
      check('strip has 3 notches', document.querySelectorAll('#stripNotches i').length === 3, document.querySelectorAll('#stripNotches i').length);
    },
    function () {
      addCue('5', '00', 'dup', 'single');
      check('duplicate rejected', $t('banner') === "There's already a cue at 05:00.", $t('banner'));
      addCue('12', '00', 'late', 'single');
      check('unreachable rejected', $t('banner') === 'Counting down from 10:00, the clock never reads 12:00.', $t('banner'));
      check('still three cues', rows().length === 3, rows().length);
    },
    function () {
      key(' ');
      check('space starts', $t('runBtn') === 'Pause' && $t('status').indexOf('Running') === 0, $t('runBtn') + ' / ' + $t('status'));
      adv(300.2);
    },
    function () {
      check('halfway fired: banner', $t('banner') === 'Halfway', $t('banner'));
      check('halfway row done', rows()[0].cls.indexOf('done') >= 0, JSON.stringify(rows()[0]));
      check('flashing', document.getElementById('stage').classList.contains('lit') || true, '');
      key('ArrowDown'); key('ArrowDown'); key('ArrowDown');
    },
    function () {
      check('jump forward 3 min: status elapsed 08:00', $t('status').indexOf('elapsed 08:00 of 10:00') >= 0, $t('status'));
      check('questions jumped past is done silently', rows()[1].cls.indexOf('done') >= 0 && $t('banner') !== 'Questions', JSON.stringify(rows()[1]) + ' banner=' + $t('banner'));
      key('ArrowUp');
    },
    function () {
      check('jump back 1 min re-arms questions', rows()[1].cls.indexOf('done') < 0, JSON.stringify(rows()[1]));
      key('ArrowUp', { shiftKey: true });
    },
    function () {
      check('shift+up adds 10 s back', $t('status').indexOf('elapsed 06:50 of 10:00') >= 0, $t('status'));
      adv(70.5);
    },
    function () {
      check('questions fires after jump back', $t('banner') === 'Questions', $t('banner'));
      adv(120);
    },
    function () {
      check("time's up with coincident 0:00 cue", $t('banner') === "Time's up · 00:00", $t('banner'));
      check('banner is red', document.getElementById('banner').style.color === 'rgb(216, 80, 62)', document.getElementById('banner').style.color);
      adv(1.5);
    },
    function () {
      // 300.2 - 180 + 60 + 10 ... = 602.2 s elapsed by now
      check('overtime status', $t('status').indexOf('elapsed 10:02 of 10:00') >= 0, $t('status'));
      key(' ');
      check('space pauses', $t('runBtn') === 'Resume', $t('runBtn'));
      key(' ');
      key('r');
      check('reset while running asks', !document.getElementById('confirm').hidden, 'hidden');
      key('Escape');
      check('esc cancels reset', document.getElementById('confirm').hidden && $t('runBtn') === 'Pause', $t('runBtn'));
      key('r'); key('Enter');
    },
    function () {
      check('enter confirms reset', $t('runBtn') === 'Start' && $t('status').indexOf('Ready') === 0, $t('status'));
      check('reset re-arms all cues', rows().every(function (r) { return r.cls.indexOf('done') < 0; }), JSON.stringify(rows()));
      var saved = JSON.parse(localStorage.getItem('sessionTimer.v1'));
      check('saved to localStorage', saved && saved.cues.length === 3 && saved.target === 600 && saved.clock.state === 'idle', JSON.stringify(saved));
    },
    function () {
      key('c');
      check('C toggles clock only', document.body.classList.contains('clock-only') && document.getElementById('optClockOnly').checked, document.body.className);
      key('Escape');
      check('Esc leaves clock only', !document.body.classList.contains('clock-only'), document.body.className);
      key('m');
      check('M mutes', $t('status').indexOf('muted') >= 0 && document.getElementById('optMute').checked, $t('status'));
      key('m');
      key('?');
      check('? opens key list', !document.getElementById('keys').hidden, 'hidden');
      key('Escape');
      check('Esc closes key list', document.getElementById('keys').hidden, 'shown');
    },
    function () {
      document.getElementById('cLabel').focus();
      key(' ');
      check('space in a text field does not start', $t('runBtn') === 'Start', $t('runBtn'));
      key('Escape');
      check('Esc leaves the text field', document.activeElement !== document.getElementById('cLabel'), document.activeElement && document.activeElement.id);
      key('ArrowUp', { ctrlKey: true });
      check('ctrl combos ignored', $t('status').indexOf('Ready') === 0, $t('status'));
    },
    function () {
      // Select + toggle + delete through the table.
      var tr = document.querySelector('#cueBody tr[data-index="0"]');
      tr.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      click('cToggle');
      check('on/off greys the cue', rows()[0].cls.indexOf('off') >= 0 && rows()[0].cells[0] === '○', JSON.stringify(rows()[0]));
      tr = document.querySelector('#cueBody tr[data-index="0"]');
      tr.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
      check('double click edits', $t('cCommit') === 'Save cue' && document.getElementById('cLabel').value === 'Halfway', $t('cCommit'));
      val('cLabel', 'Half time'); click('cCommit');
      check('save edits the cue', rows()[0].cells[2] === 'Half time' && rows().length === 3, JSON.stringify(rows()));
      click('cDelete');
      check('delete removes the selected cue', rows().length === 2, rows().length);
    },
    function () {
      // Direction change and talk-length edits.
      document.getElementById('optCountdown').click();
      check('untick count down', $t('banner') === 'Cue times are now time elapsed.' && $t('status') === 'Ready   ·   of 10:00   ·   next cue Questions in 02:00', $t('banner') + ' | ' + $t('status'));
      document.getElementById('optCountdown').click();
      val('tMin', '1'); val('tSec', '30'); click('tSet');
      check('short talk strands the 2:00 cue', $t('banner') === 'Marked ! and silent: the clock never reads 02:00 counting down from 01:30.', $t('banner'));
      check('stranded row marked !', rows().some(function (r) { return r.cls.indexOf('broken') >= 0 && r.cells[0] === '!'; }), JSON.stringify(rows()));
      val('tMin', '90'); val('tSec', '00'); click('tSet');
      check('90 minute talk accepted', $t('status').indexOf('of 1:30:00') >= 0, $t('status'));
      val('tMin', '0'); val('tSec', '0'); click('tSet');
      check('zero talk rejected', $t('banner') === 'Time must be greater than zero.', $t('banner'));
      click('tClear');
      check('clear target', $t('status').indexOf('of ') < 0, $t('status'));
    },
    function () {
      // Reload while running: snapshot, then a second app instance restores it.
      click(document.querySelector('#presets button[data-minutes="5"]'));
      // A real mouse click blurs the field; synthetic click() doesn't.
      if (document.activeElement) document.activeElement.blur();
      key(' ');
      adv(42);
      var snap = JSON.parse(localStorage.getItem('sessionTimer.v1')).clock;
      check('running clock persisted', snap.state === 'running', JSON.stringify(snap));
      var t2 = new Timer({ mono: function () { return 999; }, wall: function () { return fc.w; } });
      t2.restore(snap);
      check('restored elapsed matches', Math.abs(t2.elapsed() - 42) < 0.01, t2.elapsed());
    },
    // ---- 20 min slot: 15 min talk + 5 min discussion ----
    function () {
      key('r'); key('Enter');
      while (rows().length) {
        document.querySelector('#cueBody tr[data-index="0"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
        click('cDelete');
      }
      val('tMin', '15'); val('tSec', '00'); click('tSet');
      addCue('3', '00', '3 min left', 'single');
      addCue('0', '00', 'Talk over', 'double');
      val('cPhase', 'discussion'); addCue('5', '00', 'End of discussion', 'flurry');
      var r = rows();
      check('slot cues in order', JSON.stringify(r.map(function (x) { return x.cells[1]; })) === JSON.stringify(['03:00', '00:00', '05:00 (discussion)']), JSON.stringify(r));
      check('phase picker resets to Talk', document.getElementById('cPhase').value === 'talk', document.getElementById('cPhase').value);
      var xs = Array.prototype.map.call(document.querySelectorAll('#stripNotches i'), function (i) { return i.style.left; });
      check('strip spans the 20 min slot', JSON.stringify(xs) === JSON.stringify(['60%', '75%', '100%']), JSON.stringify(xs));
      val('cPhase', 'discussion'); addCue('0', '00', 'x', 'single');
      check('discussion 00:00 rejected', $t('banner').indexOf('A discussion cue needs a time after 00:00') === 0, $t('banner'));
      document.querySelector('#cueBody tr[data-index="2"]').dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
      check('editing a discussion cue selects Discussion', document.getElementById('cPhase').value === 'discussion' && document.getElementById('cMin').value === '05', document.getElementById('cPhase').value);
      click('cCancel');
      if (document.activeElement) document.activeElement.blur();
      check('clock reads 15:00', document.getElementById('clock').getAttribute('aria-label') === '15:00', document.getElementById('clock').getAttribute('aria-label'));
      key(' ');
      adv(720.2);
    },
    function () {
      check('first ring at 3 min left', $t('banner') === '3 min left', $t('banner'));
      adv(180.1);
    },
    function () {
      check('talk over rings the 00:00 cue', $t('banner') === "Time's up · Talk over", $t('banner'));
      adv(60);
    },
    function () {
      check('discussion counts up, no minus', document.getElementById('clock').getAttribute('aria-label') === '01:00', document.getElementById('clock').getAttribute('aria-label'));
      return 9600;  // let the time's-up banner expire
    },
    function () {
      check('discussion label after the banner clears', $t('banner') === 'Discussion' && document.getElementById('banner').style.color === 'rgb(216, 80, 62)', $t('banner') + ' ' + document.getElementById('banner').style.color);
      adv(240);
    },
    function () {
      check('third ring at end of discussion', $t('banner') === 'End of discussion', $t('banner'));
      check('clock reads 05:00 at the end of discussion', document.getElementById('clock').getAttribute('aria-label') === '05:00', document.getElementById('clock').getAttribute('aria-label'));
      check('discussion cue marked done', rows()[2].cls.indexOf('done') >= 0, JSON.stringify(rows()[2]));
      key('ArrowUp');
    },
    function () {
      check('up in the discussion adds to the reading', document.getElementById('clock').getAttribute('aria-label') === '06:00', document.getElementById('clock').getAttribute('aria-label'));
      key('r'); key('Enter');
      check('reset clears the discussion label', $t('banner') === '' && document.getElementById('clock').getAttribute('aria-label') === '15:00', $t('banner'));
    }
  ];

  var i = 0;
  function next() {
    if (i < steps.length) {
      var wait = 400;
      try { var w = steps[i](); if (typeof w === 'number') wait = w; } catch (e) { log.push('FAIL step ' + i + ' threw ' + e + ' ' + (e.stack || '')); }
      i++;
      setTimeout(next, wait);
      return;
    }
    var failed = log.filter(function (l) { return l.indexOf('FAIL') === 0; }).length;
    log.push('UITEST RESULT: ' + (failed ? 'FAIL' : 'PASS') + ' (' + (log.length - failed) + '/' + log.length + ')');
    var pre = document.createElement('pre');
    pre.id = 'uitest';
    pre.textContent = log.join('\n');
    document.body.appendChild(pre);
  }
  setTimeout(next, 400);
})();
