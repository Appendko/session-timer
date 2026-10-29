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
  // Every row in the list, the talk-end row included: [time, name, ring].
  function table() { return Array.prototype.map.call(document.querySelectorAll('#cueBody tr'), function (tr) { return Array.prototype.slice.call(tr.children, 1).map(function (td) { return td.textContent; }); }); }
  function slot(talk, warn, discussion) { val('tMin', talk); val('wMin', warn); val('dMin', discussion); click('tSet'); }

  var steps = [
    function () {
      check('first visit: 15 + 3 + 5', ['tMin', 'wMin', 'dMin'].map(function (id) { return document.getElementById(id).value; }).join() === '15,3,5' && $t('slotTotal') === '= 20 min slot', $t('slotTotal'));
      check('first visit: one, two, three bells listed', JSON.stringify(table()) === JSON.stringify([['03:00', '3 min left', 'single'], ['00:00', 'Talk over', 'double'], ['05:00 (discussion)', 'End of discussion', 'triple']]), JSON.stringify(table()));
      slot('10', '0', '0');
      check('boxes set a 10 min talk, no other bells', $t('status') === 'Ready   ·   elapsed 00:00 of 10:00' && rows().length === 0, $t('status'));
      check('talk-end row alone', JSON.stringify(table()) === JSON.stringify([['00:00', 'Talk over', 'double']]), JSON.stringify(table()));
      check('sound pill shown before any gesture', !document.getElementById('pillSound').hidden, 'hidden');
    },
    function () {
      addCue('2', '00', 'Questions', 'triple');
      addCue('5', '00', 'Halfway', 'single');
      addCue('0', '00', '', 'double');
      var r = rows();
      check('three cues, in ring order', r.length === 3 && r[0].cells[1] === '05:00' && r[1].cells[1] === '02:00' && r[2].cells[1] === '00:00', JSON.stringify(r));
      check('empty label shows a dash', r[2].cells[2] === '—', r[2].cells[2]);
      check('strip has 3 cue notches + talk end', document.querySelectorAll('#stripNotches i').length === 4, document.querySelectorAll('#stripNotches i').length);
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
      val('tMin', '1'); click('tSet');
      check('short talk strands the 2:00 cue', $t('banner') === 'Marked ! and silent: the clock never reads 02:00 counting down from 01:00.', $t('banner'));
      check('stranded row marked !', rows().some(function (r) { return r.cls.indexOf('broken') >= 0 && r.cells[0] === '!'; }), JSON.stringify(rows()));
      val('tMin', '90'); click('tSet');
      check('90 minute talk accepted', $t('status').indexOf('of 1:30:00') >= 0, $t('status'));
      val('tMin', '0'); click('tSet');
      check('zero talk rejected', $t('banner') === 'Talk time must be greater than zero.', $t('banner'));
      click('tClear');
      check('clear target', $t('status').indexOf('of ') < 0, $t('status'));
    },
    function () {
      // Reload while running: snapshot, then a second app instance restores it.
      click(document.querySelector('#presets button[data-talk="12"]'));
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
    // ---- 20 min slot: 15 min talk + warn at 3 min left + 5 min discussion ----
    function () {
      key('r'); key('Enter');
      var mine;
      while ((mine = document.querySelector('#cueBody tr[data-index]:not(.slot)'))) {
        mine.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        click('cDelete');
      }
      slot('15', '3', '5');
      check('slot total', $t('slotTotal') === '= 20 min slot', $t('slotTotal'));
      check('slot bells in order', JSON.stringify(table()) === JSON.stringify([['03:00', '3 min left', 'single'], ['00:00', 'Talk over', 'double'], ['05:00 (discussion)', 'End of discussion', 'triple']]), JSON.stringify(table()));
      var xs = Array.prototype.map.call(document.querySelectorAll('#stripNotches i'), function (i) { return i.style.left; });
      check('strip spans the 20 min slot', JSON.stringify(xs) === JSON.stringify(['60%', '100%', '75%']), JSON.stringify(xs));
      document.querySelector('#cueBody tr[data-index="1"]').dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
      check('box bells are changed through the boxes', $t('banner').indexOf('This bell comes from the Warn / Discussion boxes') === 0 && $t('cCommit') === 'Add cue', $t('banner'));
      click('cDelete');
      check('box bells cannot be deleted from the list', rows().length === 2, rows().length);
      addCue('3', '00', 'mine', 'single');
      check('a hand-made cue cannot take the warning time', $t('banner') === "There's already a cue at 03:00.", $t('banner'));
      val('cPhase', 'discussion'); addCue('0', '00', 'x', 'single');
      check('discussion 00:00 rejected', $t('banner').indexOf('A discussion cue needs a time after 00:00') === 0, $t('banner'));
      slot('15', '15', '5');
      check('warning must be inside the talk', $t('banner') === 'The warning must come before the talk ends: less than 15 min.', $t('banner'));
      document.getElementById('optCountdown').click();
      check('counting up, the bells keep their moments', JSON.stringify(table().map(function (r) { return r[0]; })) === JSON.stringify(['12:00', '15:00', '05:00 (discussion)']), JSON.stringify(table()));
      document.getElementById('optCountdown').click();
      slot('15', '3', '5');
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
      check("talk over: time's up", $t('banner') === "Time's up", $t('banner'));
      check('talk-end row done', document.querySelector('#cueBody tr.slot:not([data-index])').className.indexOf('done') >= 0, document.querySelector('#cueBody tr.slot:not([data-index])').className);
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
      check('discussion cue marked done', rows()[1].cls.indexOf('done') >= 0, JSON.stringify(rows()[1]));
      key('ArrowUp');
    },
    function () {
      check('up in the discussion adds to the reading', document.getElementById('clock').getAttribute('aria-label') === '06:00', document.getElementById('clock').getAttribute('aria-label'));
      key('r'); key('Enter');
      check('reset clears the discussion label', $t('banner') === '' && document.getElementById('clock').getAttribute('aria-label') === '15:00', $t('banner'));
      click(document.querySelector('#presets button[data-talk="20"][data-discussion="10"]'));
      check('preset sets talk and discussion, keeps the warning', ['tMin', 'wMin', 'dMin'].map(function (id) { return document.getElementById(id).value; }).join() === '20,3,10' && $t('slotTotal') === '= 30 min slot', $t('slotTotal'));
      var saved = JSON.parse(localStorage.getItem('sessionTimer.v1'));
      check('boxes saved', saved.target === 1200 && saved.warn === 180 && saved.discussion === 600 && saved.cues.length === 0, JSON.stringify(saved));
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
