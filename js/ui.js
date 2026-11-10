// 우리말 수련기 - 화면 위 글자/메뉴 (선명한 한글을 위해 DOM으로 그림)
'use strict';

var UI = (function () {
  var root = null;
  var info = { type: null }; // 자동 테스트용 현재 UI 상태

  function init() { root = document.getElementById('ui'); }
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }
  function add(e) { root.appendChild(e); return e; }
  // 열리자마자 들어온 입력(이전 키 눌림)은 무시
  var lastOpen = 0;
  // 창이 막 열린 직후의 클릭(이전 터치에서 이어진 '유령 클릭')은 무시
  function fresh() { return performance.now() - lastOpen < 280; }
  function modal(fn, guard) {
    var t0 = performance.now(), g = guard === undefined ? 120 : guard;
    lastOpen = t0;
    var h = function (a) { if (performance.now() - t0 < g) return; fn(a); };
    Input.push(h);
    return h;
  }
  function catcher(onTap) {
    var c = el('div', 'catcher');
    c.addEventListener('click', function (e) { e.preventDefault(); if (onTap && !fresh()) onTap(); });
    return c;
  }
  function face(key) {
    var url = Art.url(key);
    var f = el('div', 'face');
    if (url) { var im = el('img'); im.src = url; im.alt = ''; f.appendChild(im); }
    return f;
  }

  // ------------------------------------------------------------ 대화
  var FACES = { '가람': 'hero', '물결 선생': 'otter', '곰 아주머니': 'bear', '토끼 상인': 'rabbit', '나비': 'cat', '오리 할아버지': 'duck' };
  function sayOne(pg, opts) {
    var who = opts.who, text = pg, fc = opts.face;
    if (typeof pg === 'object') { who = pg.who || who; text = pg.text; fc = pg.face || fc; }
    var m = /^([^:\n]{1,16}): ([\s\S]*)$/.exec(text);
    if (!who && m) { who = m[1]; text = m[2]; }
    if (!fc && who && FACES[who]) fc = FACES[who];
    return new Promise(function (res) {
      var wrap = el('div', 'dlgwrap');
      var box = el('div', 'win dialog' + (fc ? ' hasface' : '') + (opts.top ? ' top' : ''));
      if (fc) box.appendChild(face(fc));
      var inner = el('div', 'dinner');
      if (who) inner.appendChild(el('div', 'dname', U.esc(who)));
      var body = el('div', 'dtext');
      inner.appendChild(body);
      box.appendChild(inner);
      var arrow = el('div', 'dnext', '▼');
      box.appendChild(arrow);
      var cat = catcher(advance);
      wrap.appendChild(cat); wrap.appendChild(box);
      add(wrap);
      var i = 0, done = false, n = text.length;
      info = { type: 'dialog', text: text, who: who || '' };
      var tm = setInterval(function () {
        i += 1;
        if (i % 4 === 1) Sound.play('talk');
        if (i >= n) { i = n; finish(); return; }
        body.textContent = text.slice(0, i);
      }, 22 / Engine.speed);
      function finish() { clearInterval(tm); body.textContent = text; done = true; arrow.classList.add('on'); }
      function advance() {
        if (!done) { finish(); return; }
        Input.remove(h); wrap.remove(); info = { type: null };
        res();
      }
      var h = modal(function (a) { if (a === 'ok' || a === 'cancel') advance(); });
    });
  }
  function say(pages, opts) {
    opts = opts || {};
    if (!Array.isArray(pages)) pages = [pages];
    var p = Promise.resolve();
    pages.forEach(function (pg) { p = p.then(function () { return sayOne(pg, opts); }); });
    return p;
  }

  // ------------------------------------------------------------ 메뉴
  // items: 문자열 또는 {label, right, disabled, why, desc}
  function choose(items, opts) {
    opts = opts || {};
    items = items.map(function (it) { return typeof it === 'string' ? { label: it } : it; });
    return new Promise(function (res) {
      var wrap = el('div', 'menuwrap ' + (opts.cls || 'center'));
      if (opts.catcher !== false) wrap.appendChild(catcher(opts.cancel === false ? null : function () { close(-1, true); }));
      var col = el('div', 'menucol');
      var box = el('div', 'win menu');
      if (opts.title) box.appendChild(el('div', 'mtitle', opts.title));
      var list = el('div', 'mlist');
      var btns = items.map(function (it, i) {
        var b = el('button', 'mitem' + (it.disabled ? ' dis' : ''),
          '<span class="ml">' + U.esc(it.label) + '</span>' + (it.right !== undefined ? '<span class="mr">' + U.esc(it.right) + '</span>' : ''));
        b.type = 'button';
        b.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') { cursor = i; render(); } });
        b.addEventListener('click', function (e) { e.preventDefault(); if (fresh()) return; cursor = i; render(); pick(i); });
        list.appendChild(b);
        return b;
      });
      box.appendChild(list);
      col.appendChild(box);
      var desc = null;
      if (opts.desc || items.some(function (it) { return it.desc; })) { desc = el('div', 'win mdesc'); col.appendChild(desc); }
      wrap.appendChild(col);
      add(wrap);
      var cursor = U.clamp(opts.start || 0, 0, items.length - 1);
      function render() {
        btns.forEach(function (b, i) { b.classList.toggle('sel', i === cursor); });
        var it = items[cursor];
        if (desc) desc.innerHTML = it ? U.esc(it.desc || (opts.desc ? opts.desc(cursor) : '') || '') : '';
        if (btns[cursor] && btns[cursor].scrollIntoView && items.length > 6) btns[cursor].scrollIntoView({ block: 'nearest' });
        info = { type: 'menu', title: opts.title || '', items: items.map(function (x) { return x.label; }), cursor: cursor };
      }
      function pick(i) {
        var it = items[i];
        if (!it) return;
        if (it.disabled) { Sound.play('buzz'); if (it.why) toast(it.why); return; }
        Sound.play('select');
        close(i);
      }
      function close(v, byCancel) {
        if (byCancel && opts.cancel === false) return;
        if (byCancel) Sound.play('cancel');
        Input.remove(h); wrap.remove(); info = { type: null };
        res(v);
      }
      var h = modal(function (a) {
        var n = items.length;
        if (a === 'up' || (a === 'left' && opts.grid)) { cursor = (cursor - 1 + n) % n; Sound.play('move'); render(); }
        else if (a === 'down' || (a === 'right' && opts.grid)) { cursor = (cursor + 1) % n; Sound.play('move'); render(); }
        else if (a === 'ok') pick(cursor);
        else if (a === 'cancel') { if (opts.cancel !== false) close(-1, true); }
        else if (a >= '1' && a <= '9' && opts.digits !== false) { var d = parseInt(a, 10) - 1; if (d < n) { cursor = d; render(); pick(d); } }
      });
      render();
    });
  }

  function confirm(text, yes, no) {
    return choose([yes || '예', no || '아니요'], { title: text, cls: 'center confirm', start: 1 }).then(function (i) { return i === 0; });
  }

  // ------------------------------------------------------------ 퀴즈
  // opts: tag, tagCls, time(초), hint(처음부터 힌트), charms()->개수, useCharm()->bool, practice, combo
  var CIRC = ['①', '②', '③', '④'];
  function quiz(item, opts) {
    opts = opts || {};
    return new Promise(function (res) {
      var order = U.shuffle([0, 1, 2, 3]);
      var correctPos = order.indexOf(item.answer);
      var hidden = {};
      var wrap = el('div', 'quizwrap');
      wrap.appendChild(catcher(null));
      var box = el('div', 'win quiz');
      var head = el('div', 'qhead');
      head.appendChild(el('span', 'qtag ' + (opts.tagCls || ''), U.esc(opts.tag || '퀴즈')));
      head.appendChild(el('span', 'qcat', U.esc(QUIZ_CATEGORIES[item.cat] ? QUIZ_CATEGORIES[item.cat].name : '')));
      if (opts.combo > 0) head.appendChild(el('span', 'qcombo', '연속 정답 ' + opts.combo));
      var stars = Words.stars(item.id);
      head.appendChild(el('span', 'qstar', '<b>' + '★'.repeat(stars) + '</b>' + '☆'.repeat(3 - stars)));
      box.appendChild(head);
      var tbar = null, tfill = null;
      if (opts.time) { tbar = el('div', 'qtimer'); tfill = el('div', 'fill'); tbar.appendChild(tfill); box.appendChild(tbar); }
      box.appendChild(el('div', 'qword', U.esc(item.word)));
      box.appendChild(el('div', 'qprompt', U.esc(opts.prompt || '이 낱말의 뜻으로 알맞은 것을 고르세요.')));
      var grid = el('div', 'qchoices');
      var btns = order.map(function (ci, pos) {
        var b = el('button', 'choice', '<span class="num">' + (pos + 1) + '</span><span class="txt">' + U.esc(item.choices[ci]) + '</span>');
        b.type = 'button';
        b.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse' && !locked) { cursor = pos; render(); } });
        b.addEventListener('click', function (e) { e.preventDefault(); if (!locked && !fresh()) answer(pos); });
        grid.appendChild(b);
        return b;
      });
      box.appendChild(grid);
      var foot = el('div', 'qfoot');
      var hintBtn = null;
      box.appendChild(foot);
      wrap.appendChild(box);
      add(wrap);

      var cursor = 0, locked = false, waiting = false, raf = 0;
      function visible(p) { return !hidden[p]; }
      function render() {
        btns.forEach(function (b, i) { b.classList.toggle('sel', i === cursor && !locked); });
        info = { type: locked ? 'quiz-result' : 'quiz', word: item.word, correct: correctPos + 1, hidden: Object.keys(hidden).map(Number), waiting: waiting };
      }
      function applyHint() {
        var wrongs = U.shuffle([0, 1, 2, 3].filter(function (p) { return p !== correctPos; })).slice(0, 2);
        wrongs.forEach(function (p) { hidden[p] = true; btns[p].classList.add('gone'); btns[p].disabled = true; });
        if (hidden[cursor]) cursor = correctPos === cursor ? cursor : [0, 1, 2, 3].filter(visible)[0];
        if (hintBtn) { hintBtn.remove(); hintBtn = null; }
        foot.insertBefore(el('span', 'qhintused', '힌트 부적의 힘으로 보기 2개가 사라졌어요!'), foot.firstChild);
        Fx.sparkle(160, 120, '#f4e070', 12);
        render();
      }
      function tryHint() {
        if (locked || hintBtn === null) return;
        if (opts.useCharm && opts.useCharm()) { Sound.play('heal'); applyHint(); }
      }
      if (opts.hint) applyHint();
      else if (opts.charms && opts.charms() > 0 && opts.useCharm) {
        hintBtn = el('button', 'qhint', '힌트 부적 쓰기 <small>(H)</small> · 남은 ' + opts.charms() + '장');
        hintBtn.type = 'button';
        hintBtn.addEventListener('click', function (e) { e.preventDefault(); tryHint(); });
        foot.appendChild(hintBtn);
      }

      var t0 = performance.now();
      if (opts.time) {
        var total = opts.time * 1000 / Engine.speed;
        var tick = function () {
          if (locked) return;
          var left = 1 - (performance.now() - t0) / total;
          tfill.style.width = Math.max(0, left * 100) + '%';
          tbar.classList.toggle('low', left < 0.3);
          if (left <= 0) { answer(-1); return; }
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      }

      function answer(pos) {
        if (locked) return;
        if (pos >= 0 && hidden[pos]) return;
        locked = true;
        cancelAnimationFrame(raf);
        var ok = pos === correctPos;
        btns[correctPos].classList.add('right');
        if (pos >= 0 && !ok) btns[pos].classList.add('wrong');
        btns.forEach(function (b) { b.disabled = true; });
        if (hintBtn) hintBtn.remove();
        var meaning = item.choices[item.answer];
        var fb = el('div', 'qfb ' + (ok ? 'ok' : 'no'));
        var line = '<div class="fbline"><b>' + U.esc(item.word) + '</b> : ' + U.esc(meaning) + '</div>';
        var top = el('div', 'fbtop', ok ? line : '<div class="fbhead">' + (pos < 0 ? '시간이 다 됐어요!' : '아쉬워요!') + ' 정답은 <b>' + CIRC[correctPos] + '번</b>이에요.</div>');
        fb.appendChild(top);
        if (ok) {
          Sound.play('correct');
          box.appendChild(el('div', 'stamp', '정답!'));
        } else {
          Sound.play('wrong');
          fb.insertAdjacentHTML('beforeend', line);
        }
        box.classList.add('locked');
        foot.innerHTML = '';
        foot.appendChild(fb);
        var needWait = !ok || opts.practice;
        if (needWait) {
          var go = el('button', 'qgo', '알겠어요 ▶');
          go.type = 'button';
          go.addEventListener('click', function (e) { e.preventDefault(); if (!fresh()) finish(); });
          top.appendChild(go);
          waiting = true;
          h2 = modal(function (a) { if (a === 'ok' || a === 'cancel') finish(); }, 350);
        } else {
          setTimeout(finish, 800 / Engine.speed);
        }
        render();
        function finish() {
          if (finish.done) return;
          finish.done = true;
          if (h2) Input.remove(h2);
          Input.remove(h); wrap.remove(); info = { type: null };
          res({ correct: ok, timeout: pos < 0, item: item });
        }
      }
      var h2 = null;
      var h = modal(function (a) {
        if (locked) return;
        var vis = [0, 1, 2, 3].filter(visible);
        var k = vis.indexOf(cursor);
        if (a === 'up' || a === 'left') { cursor = vis[(k - 1 + vis.length) % vis.length]; Sound.play('move'); render(); }
        else if (a === 'down' || a === 'right') { cursor = vis[(k + 1) % vis.length]; Sound.play('move'); render(); }
        else if (a === 'ok') answer(cursor);
        else if (a >= '1' && a <= '4') answer(parseInt(a, 10) - 1);
        else if (a === 'hint') tryHint();
      }, 200);
      render();
    });
  }

  // ------------------------------------------------------------ 큰 창(오답 수첩, 상태 등)
  // tabs: [{name, html}] 혹은 html 하나
  function panel(title, tabs, opts) {
    opts = opts || {};
    if (!Array.isArray(tabs)) tabs = [{ name: '', html: tabs }];
    return new Promise(function (res) {
      var wrap = el('div', 'panelwrap');
      wrap.appendChild(catcher(null));
      var box = el('div', 'win panel ' + (opts.cls || ''));
      var head = el('div', 'phead');
      head.appendChild(el('div', 'ptitle', U.esc(title)));
      var tabBtns = [];
      if (tabs.length > 1) {
        var tb = el('div', 'ptabs');
        tabs.forEach(function (t, i) {
          var b = el('button', 'ptab', U.esc(t.name));
          b.type = 'button';
          b.addEventListener('click', function (e) { e.preventDefault(); cur = i; render(); Sound.play('move'); });
          tb.appendChild(b); tabBtns.push(b);
        });
        head.appendChild(tb);
      }
      var x = el('button', 'pclose', '닫기 ✕');
      x.type = 'button';
      x.addEventListener('click', function (e) { e.preventDefault(); if (!fresh()) close(); });
      head.appendChild(x);
      box.appendChild(head);
      var body = el('div', 'pbody');
      box.appendChild(body);
      box.appendChild(el('div', 'pfoot', tabs.length > 1 ? '←→ 탭 바꾸기 · ↑↓ 스크롤 · Esc 닫기' : '↑↓ 스크롤 · Enter/Esc 닫기'));
      wrap.appendChild(box);
      add(wrap);
      var cur = 0;
      function render() {
        body.innerHTML = tabs[cur].html;
        body.scrollTop = 0;
        tabBtns.forEach(function (b, i) { b.classList.toggle('sel', i === cur); });
        info = { type: 'panel', title: title, tab: cur };
      }
      function close() { Sound.play('cancel'); Input.remove(h); wrap.remove(); info = { type: null }; res(); }
      var h = modal(function (a) {
        if (a === 'up') body.scrollTop -= 60;
        else if (a === 'down') body.scrollTop += 60;
        else if ((a === 'left' || a === 'right') && tabs.length > 1) { cur = (cur + (a === 'left' ? -1 : 1) + tabs.length) % tabs.length; Sound.play('move'); render(); }
        else if (a === 'ok' || a === 'cancel') close();
      });
      render();
    });
  }

  // ------------------------------------------------------------ 짧은 알림들
  function toast(text, ms) {
    var t = add(el('div', 'toast', U.esc(text)));
    setTimeout(function () { t.classList.add('out'); }, (ms || 1600) / Engine.speed);
    setTimeout(function () { t.remove(); }, ((ms || 1600) + 400) / Engine.speed);
  }
  function banner(html, cls, ms) {
    var b = add(el('div', 'banner ' + (cls || ''), html));
    ms = (ms || 900) / Engine.speed;
    return new Promise(function (res) {
      setTimeout(function () { b.remove(); res(); }, ms);
    });
  }
  // 캔버스 좌표 위 떠오르는 글자(피해 숫자)
  function floatText(x, y, text, cls) {
    var f = add(el('div', 'float ' + (cls || ''), U.esc(text)));
    f.style.left = (x * 3) + 'px';
    f.style.top = (y * 3) + 'px';
    f.style.animationDuration = (1000 / Engine.speed) + 'ms';
    setTimeout(function () { f.remove(); }, 1000 / Engine.speed);
  }
  // 정보 표시 등 지속되는 층
  function layer(cls) { return add(el('div', cls)); }
  function clear() { root.innerHTML = ''; info = { type: null }; }
  function fade(on) {
    var f = document.getElementById('fader');
    if (!f) return U.sleep(0);
    f.classList.toggle('on', !!on);
    return U.sleep(300);
  }

  return {
    init: init, el: el, say: say, choose: choose, confirm: confirm, quiz: quiz, panel: panel,
    toast: toast, banner: banner, floatText: floatText, layer: layer, clear: clear, fade: fade, face: face,
    info: function () { return info; }
  };
})();
