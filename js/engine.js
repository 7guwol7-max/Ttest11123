// 우리말 수련기 - 엔진: 유틸리티, 화면 맞춤, 게임 루프, 입력, 효과, 저장
'use strict';

var U = {
  rand: function (a, b) { return a + Math.random() * (b - a); },
  randi: function (a, b) { return Math.floor(a + Math.random() * (b - a + 1)); },
  pick: function (arr) { return arr[Math.floor(Math.random() * arr.length)]; },
  clamp: function (v, a, b) { return v < a ? a : (v > b ? b : v); },
  shuffle: function (arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  },
  sleep: function (ms) {
    return new Promise(function (res) { setTimeout(res, ms / Engine.speed); });
  },
  esc: function (s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  },
  // 받침 유무에 따라 조사 고르기: U.josa('까치', '이/가') -> '까치가'
  josa: function (word, pair) {
    var parts = pair.split('/');
    var clean = String(word).replace(/\(.*\)$/, '').replace(/['"’」』]+$/, '');
    var ch = clean.charCodeAt(clean.length - 1) - 0xac00;
    var has = false, rieul = false;
    if (ch >= 0 && ch <= 11171) { var j = ch % 28; has = j !== 0; rieul = j === 8; }
    if (parts[0] === '으로') return word + ((has && !rieul) ? '으로' : '로');
    return word + (has ? parts[0] : parts[1]);
  },
  fmtTime: function (sec) {
    sec = Math.floor(sec);
    var m = Math.floor(sec / 60), s = sec % 60;
    return m + '분 ' + (s < 10 ? '0' : '') + s + '초';
  }
};

// ---------------------------------------------------------------------------
// 저장 (localStorage가 막혀 있어도 게임은 동작)
var Store = {
  key: 'urimal-suryeongi-save-v1',
  load: function () {
    try {
      var s = window.localStorage.getItem(this.key);
      return s ? JSON.parse(s) : null;
    } catch (e) { return null; }
  },
  save: function (obj) {
    try { window.localStorage.setItem(this.key, JSON.stringify(obj)); return true; } catch (e) { return false; }
  },
  clear: function () {
    try { window.localStorage.removeItem(this.key); } catch (e) { /* 무시 */ }
  },
  getPref: function (k, def) {
    try { var v = window.localStorage.getItem('urimal-pref-' + k); return v === null ? def : JSON.parse(v); } catch (e) { return def; }
  },
  setPref: function (k, v) {
    try { window.localStorage.setItem('urimal-pref-' + k, JSON.stringify(v)); } catch (e) { /* 무시 */ }
  }
};

// ---------------------------------------------------------------------------
// 입력: 키보드 + 화면 버튼. 맨 위 핸들러 하나만 동작(action)을 받는다.
var Input = {
  held: { up: false, down: false, left: false, right: false },
  stack: [],
  lastAction: 0,
  codeMap: {
    ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
    ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
    Enter: 'ok', NumpadEnter: 'ok', Space: 'ok', KeyZ: 'ok',
    Escape: 'cancel', KeyX: 'cancel', Backspace: 'cancel',
    Digit1: '1', Digit2: '2', Digit3: '3', Digit4: '4',
    Numpad1: '1', Numpad2: '2', Numpad3: '3', Numpad4: '4',
    KeyH: 'hint', KeyM: 'mute'
  },
  push: function (fn) { this.stack.push(fn); return fn; },
  remove: function (fn) {
    var i = this.stack.lastIndexOf(fn);
    if (i >= 0) this.stack.splice(i, 1);
  },
  top: function () { return this.stack[this.stack.length - 1] || null; },
  dispatch: function (action) {
    this.lastAction = performance.now();
    if (action === 'mute') { Sound.toggleMute(); return; }
    var h = this.top();
    if (h) h(action);
  },
  init: function () {
    var self = this;
    window.addEventListener('keydown', function (e) {
      Sound.unlock();
      var a = self.codeMap[e.code];
      if (!a) {
        // 코드가 없는 환경 대비(e.key)
        var k = e.key;
        if (k === 'Enter' || k === ' ') a = 'ok';
        else if (k === 'Escape') a = 'cancel';
        else if (k >= '1' && k <= '4') a = k;
      }
      if (!a) return;
      e.preventDefault();
      if (a === 'up' || a === 'down' || a === 'left' || a === 'right') self.held[a] = true;
      if (e.repeat && (a === 'ok' || a === 'cancel' || a === 'mute' || a === 'hint' || (a >= '1' && a <= '4'))) return;
      self.dispatch(a);
    });
    window.addEventListener('keyup', function (e) {
      var a = self.codeMap[e.code];
      if (a && self.held.hasOwnProperty(a)) self.held[a] = false;
    });
    window.addEventListener('blur', function () {
      self.held.up = self.held.down = self.held.left = self.held.right = false;
    });
    window.addEventListener('pointerdown', function () { Sound.unlock(); }, true);
    window.addEventListener('touchend', function () { Sound.unlock(); }, true);
    // 마우스로 누른 버튼에 포커스가 남아 Enter/Space가 두 번 먹히지 않게 한다
    document.addEventListener('click', function (e) {
      Sound.unlock();
      var b = e.target && e.target.closest ? e.target.closest('button') : null;
      if (b) b.blur();
    }, true);

    // 화면 방향 패드
    var pad = document.getElementById('touch');
    if (pad) {
      var btns = pad.querySelectorAll('[data-dir],[data-act]');
      Array.prototype.forEach.call(btns, function (b) {
        var dir = b.getAttribute('data-dir'), act = b.getAttribute('data-act');
        var down = function (e) {
          e.preventDefault();
          Sound.unlock();
          b.classList.add('on');
          if (dir) { self.held[dir] = true; self.dispatch(dir); }
          if (act) self.dispatch(act);
        };
        var up = function (e) {
          e.preventDefault();
          b.classList.remove('on');
          if (dir) self.held[dir] = false;
        };
        b.addEventListener('pointerdown', down);
        b.addEventListener('pointerup', up);
        b.addEventListener('pointercancel', up);
        b.addEventListener('pointerleave', up);
      });
    }
  }
};

// ---------------------------------------------------------------------------
// 효과: 파티클, 화면 번쩍임
var Fx = {
  parts: [],
  flashA: 0, flashColor: '#fff',
  burst: function (x, y, color, n, spread) {
    spread = spread || 60;
    for (var i = 0; i < (n || 10); i++) {
      var a = Math.random() * Math.PI * 2, s = U.rand(spread * 0.3, spread);
      this.parts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 20, life: U.rand(0.35, 0.7), max: 0.7, c: color, g: 120 });
    }
  },
  sparkle: function (x, y, color, n) {
    for (var i = 0; i < (n || 8); i++) {
      this.parts.push({ x: x + U.rand(-14, 14), y: y + U.rand(-8, 8), vx: U.rand(-8, 8), vy: U.rand(-40, -15), life: U.rand(0.5, 1.0), max: 1, c: color, g: 0, star: true });
    }
  },
  flash: function (color, a) { this.flashColor = color || '#fff'; this.flashA = a || 0.6; },
  update: function (dt) {
    for (var i = this.parts.length - 1; i >= 0; i--) {
      var p = this.parts[i];
      p.life -= dt;
      if (p.life <= 0) { this.parts.splice(i, 1); continue; }
      p.vy += p.g * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
    }
    if (this.flashA > 0) this.flashA = Math.max(0, this.flashA - dt * 2.5);
  },
  draw: function (ctx) {
    for (var i = 0; i < this.parts.length; i++) {
      var p = this.parts[i];
      ctx.fillStyle = p.c;
      var x = Math.round(p.x), y = Math.round(p.y);
      if (p.star && p.life > 0.2) {
        ctx.fillRect(x - 1, y, 3, 1); ctx.fillRect(x, y - 1, 1, 3);
      } else {
        ctx.fillRect(x, y, 2, 2);
      }
    }
    if (this.flashA > 0) {
      ctx.globalAlpha = this.flashA;
      ctx.fillStyle = this.flashColor;
      ctx.fillRect(0, 0, Engine.W, Engine.H);
      ctx.globalAlpha = 1;
    }
  },
  clear: function () { this.parts.length = 0; this.flashA = 0; }
};

// ---------------------------------------------------------------------------
var Engine = {
  W: 320, H: 240, DW: 960, DH: 720,
  speed: 1,
  scene: null,
  t: 0,
  shakeT: 0, shakeMag: 0,
  canvas: null, ctx: null, stage: null,
  isTouch: false,
  init: function () {
    this.canvas = document.getElementById('screen');
    this.ctx = this.canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.stage = document.getElementById('stage');
    this.isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    if (this.isTouch) document.body.classList.add('touchdev');
    var self = this;
    this.resize();
    window.addEventListener('resize', function () { self.resize(); });
    this.canvas.addEventListener('pointerdown', function (e) {
      if (!self.scene || !self.scene.onTap) return;
      var r = self.canvas.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width * self.W;
      var y = (e.clientY - r.top) / r.height * self.H;
      self.scene.onTap(x, y);
    });
    var last = performance.now();
    var loop = function (ts) {
      var dt = Math.min(0.05, Math.max(0, (ts - last) / 1000));
      last = ts;
      self.frame(dt * self.speed);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  },
  resize: function () {
    var vw = window.innerWidth, vh = window.innerHeight;
    var k = Math.min(vw / this.DW, vh / this.DH);
    var sw = this.DW * k, sh = this.DH * k;
    var left = (vw - sw) / 2, top = (vh - sh) / 2;
    var spare = vh - sh;
    var body = document.body;
    // 세로 화면(태블릿 등)에서 남는 아래 공간에 방향 패드를 둔다
    if (spare >= 230) {
      top = Math.max(0, Math.min(top, (spare - 230) / 2));
      body.classList.add('padbelow');
      var pad = document.getElementById('touch');
      if (pad) { pad.style.top = (top + sh + 12) + 'px'; pad.style.height = Math.min(260, vh - (top + sh + 12) - 8) + 'px'; }
    } else {
      body.classList.remove('padbelow');
      var pad2 = document.getElementById('touch');
      if (pad2) { pad2.style.top = ''; pad2.style.height = ''; }
    }
    this.stage.style.transform = 'translate(' + Math.round(left) + 'px,' + Math.round(top) + 'px) scale(' + k + ')';
    this.scale = k;
  },
  setScene: function (s) {
    if (this.scene && this.scene.leave) this.scene.leave();
    this.scene = s;
    Fx.clear();
    if (s && s.enter) s.enter();
    document.body.classList.toggle('town', !!(s && s.isTown));
  },
  shake: function (mag, dur) { this.shakeMag = mag; this.shakeT = dur || 0.3; },
  frame: function (dt) {
    this.t += dt;
    Fx.update(dt);
    if (this.scene && this.scene.update) this.scene.update(dt);
    var ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, this.W, this.H);
    if (this.shakeT > 0) {
      this.shakeT -= dt;
      var m = this.shakeMag * Math.max(0, Math.min(1, this.shakeT / 0.3));
      ctx.setTransform(1, 0, 0, 1, Math.round(U.rand(-m, m)), Math.round(U.rand(-m, m)));
    }
    if (this.scene && this.scene.draw) this.scene.draw(ctx, this.t);
    Fx.draw(ctx);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
};
