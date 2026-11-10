// 우리말 수련기 - 마을(걸어 다니는 지도)과 마을 안 시설
'use strict';

var Town = (function () {
  var MAP = [
    'TTTTTTTTTbbTTTTTTTTT',
    'T.BBBBB..==..BBBBB.T',
    'T.BBBBB..==..BBBBB.T',
    'T.BBBBB,.==.,BBBBB.T',
    'T.BBDBB..==..BBDBB.T',
    'T...=....==....=...T',
    'T...============...T',
    'a==================c',
    'a==================c',
    'T..,.....==..N..,..T',
    'T.BBBBB..==..BBBBB.T',
    'T.BBBBB..==..BBBBB.T',
    'T.BBDBB..==..BBDBB.T',
    'T...============...T',
    'TTTTTTTTTddTTTTTTTTT'
  ];
  MAP.forEach(function (r, i) { if (r.length !== 20) console.warn('map row', i, r.length); });

  var DOORS = { '4,4': 'inn', '15,4': 'shop', '4,12': 'dojo', '15,12': 'study' };
  var EXITS = { a: 'goyu', b: 'hanja', c: 'sinjo', d: 'arena' };
  var SPAWN = { goyu: [1, 7, 'right'], hanja: [9, 1, 'down'], sinjo: [18, 7, 'left'], arena: [9, 13, 'up'], start: [9, 9, 'down'] };
  var NPCS = [
    { id: 'otter', x: 7, y: 9, sprite: 'otter', name: '물결 선생' },
    { id: 'cat', x: 12, y: 5, sprite: 'cat', name: '나비' },
    { id: 'duck', x: 17, y: 5, sprite: 'duck', name: '오리 할아버지' }
  ];
  var DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

  var bgImg = null;
  var pl = { x: 9, y: 9, fx: 9, fy: 9, dir: 'down', moving: false, t: 0, f: 0 };
  var path = [];
  var pendingTarget = null;
  var handler = null;
  var labels = null, hud = null;
  var busy = false;
  var talkIdx = { cat: 0, duck: 0 };

  function tile(x, y) { return (y >= 0 && y < MAP.length && x >= 0 && x < 20) ? MAP[y][x] : 'T'; }
  function npcAt(x, y) { for (var i = 0; i < NPCS.length; i++) if (NPCS[i].x === x && NPCS[i].y === y) return NPCS[i]; return null; }
  function walkable(x, y) {
    var t = tile(x, y);
    if (t === 'T' || t === 'B' || t === 'D' || t === 'N') return false;
    return !npcAt(x, y);
  }
  function exitLocked(id) {
    var p = Game.data.progress;
    if (id === 'goyu') return false;
    if (id === 'hanja') return !p.boss.goyu;
    if (id === 'sinjo') return !p.boss.hanja;
    if (id === 'arena') return !p.boss.sinjo;
    return true;
  }

  // ---------------------------------------------------------------- 장면
  var scene = {
    isTown: true,
    enter: function () {},
    leave: function () {},
    update: function (dt) {
      if (pl.moving) {
        pl.t += dt / 0.15;
        if (pl.t >= 1) {
          pl.t = 0; pl.moving = false; pl.fx = pl.x; pl.fy = pl.y; pl.f = 1 - pl.f;
          arrived();
        }
      }
      if (!pl.moving && !busy && Input.top() === handler) {
        if (path.length) { var n = path.shift(); tryStep(n[0] - pl.x, n[1] - pl.y); }
        else {
          var H = Input.held;
          if (H.up) tryStep(0, -1); else if (H.down) tryStep(0, 1); else if (H.left) tryStep(-1, 0); else if (H.right) tryStep(1, 0);
        }
      }
    },
    draw: function (ctx, t) {
      if (!bgImg) bgImg = Art.town(MAP);
      ctx.drawImage(bgImg, 0, 0);
      // 출구 표시
      [['a', 0, 7], ['a', 0, 8], ['b', 9, 0], ['b', 10, 0], ['c', 19, 7], ['c', 19, 8], ['d', 9, 14], ['d', 10, 14]].forEach(function (g) {
        Art.gate(ctx, g[1] * 16, g[2] * 16, exitLocked(EXITS[g[0]]), t);
      });
      // 인물들(아래쪽이 앞에 오도록)
      var list = NPCS.map(function (n) { return { y: n.y, draw: function () {
        var bob = Math.round(Math.sin(t * 2.5 + n.x) * 0.6);
        Art.shadow(ctx, n.x * 16 + 8, n.y * 16 + 15, 12);
        Art.draw(ctx, n.sprite, n.x * 16 + 8, n.y * 16 + 16 + bob);
      } }; });
      var px = (pl.fx + (pl.x - pl.fx) * pl.t) * 16, py = (pl.fy + (pl.y - pl.fy) * pl.t) * 16;
      list.push({ y: pl.moving ? Math.max(pl.y, pl.fy) : pl.y, draw: function () {
        var d = pl.dir === 'left' || pl.dir === 'right' ? 'side' : pl.dir;
        var f = pl.moving ? (pl.t < 0.5 ? pl.f : 1 - pl.f) : 0;
        Art.shadow(ctx, px + 8, py + 15, 11);
        Art.draw(ctx, 'heroTown:' + d + ':' + f, px + 8, py + 16 - (pl.moving && pl.t > 0.25 && pl.t < 0.75 ? 1 : 0), { flip: pl.dir === 'left' });
      } });
      list.sort(function (a, b) { return a.y - b.y; });
      list.forEach(function (o) { o.draw(); });
      // 선생님 머리 위 느낌표
      if (Game.data && !Game.data.progress.talkedMentor) {
        var by = Math.round(Math.sin(t * 5) * 1.5);
        ctx.fillStyle = '#fff6b0'; ctx.fillRect(7 * 16 + 7, 9 * 16 - 12 + by, 3, 6); ctx.fillRect(7 * 16 + 7, 9 * 16 - 5 + by, 3, 2);
        ctx.fillStyle = '#140f1c'; ctx.fillRect(7 * 16 + 6, 9 * 16 - 13 + by, 1, 11); ctx.fillRect(7 * 16 + 10, 9 * 16 - 13 + by, 1, 11);
      }
    },
    onTap: function (x, y) {
      if (busy || Input.top() !== handler) return;
      var tx = Math.floor(x / 16), ty = Math.floor(y / 16);
      if (tx === pl.x && ty === pl.y) { interact(); return; }
      var target = [tx, ty];
      var tt = tile(tx, ty), special = npcAt(tx, ty) || tt === 'D' || tt === 'N';
      var goals = [];
      if (walkable(tx, ty)) goals.push([tx, ty]);
      else if (special) {
        [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(function (d) { if (walkable(tx + d[0], ty + d[1]) || (tx + d[0] === pl.x && ty + d[1] === pl.y)) goals.push([tx + d[0], ty + d[1]]); });
        if (tt === 'D') goals = goals.filter(function (g) { return g[1] === ty + 1; });
      }
      if (!goals.length) return;
      var p = bfs(goals);
      if (!p) return;
      path = p;
      pendingTarget = special ? target : null;
      if (!path.length && pendingTarget) { var tgt = pendingTarget; pendingTarget = null; face(tgt); interact(); }
    }
  };

  function bfs(goals) {
    var key = function (x, y) { return x + ',' + y; };
    var goalSet = {};
    goals.forEach(function (g) { goalSet[key(g[0], g[1])] = true; });
    var prev = {}, q = [[pl.x, pl.y]], seen = {};
    seen[key(pl.x, pl.y)] = true;
    while (q.length) {
      var c = q.shift();
      if (goalSet[key(c[0], c[1])]) {
        var out = [], k = key(c[0], c[1]);
        while (prev[k]) { var xy = k.split(',').map(Number); out.unshift(xy); k = prev[k]; }
        return out;
      }
      for (var d in DIRS) {
        var nx = c[0] + DIRS[d][0], ny = c[1] + DIRS[d][1], nk = key(nx, ny);
        if (seen[nk] || !walkable(nx, ny)) continue;
        // 출구 칸은 목적지일 때만 지나간다
        var t = tile(nx, ny);
        if (EXITS[t] && !goalSet[nk]) continue;
        seen[nk] = true; prev[nk] = key(c[0], c[1]); q.push([nx, ny]);
      }
    }
    return null;
  }
  function face(target) {
    var dx = target[0] - pl.x, dy = target[1] - pl.y;
    if (Math.abs(dx) > Math.abs(dy)) pl.dir = dx > 0 ? 'right' : 'left';
    else pl.dir = dy > 0 ? 'down' : 'up';
  }

  function tryStep(dx, dy) {
    pl.dir = dx > 0 ? 'right' : dx < 0 ? 'left' : dy > 0 ? 'down' : 'up';
    var nx = pl.x + dx, ny = pl.y + dy;
    if (walkable(nx, ny)) {
      pl.fx = pl.x; pl.fy = pl.y; pl.x = nx; pl.y = ny; pl.moving = true; pl.t = 0;
    } else {
      path = [];
      var t = tile(nx, ny);
      if (t === 'D' && dy === -1) { pendingTarget = null; enterDoor(DOORS[nx + ',' + ny]); }
    }
  }
  function arrived() {
    var t = tile(pl.x, pl.y);
    if (EXITS[t]) {
      path = [];
      var id = EXITS[t];
      if (exitLocked(id)) {
        Sound.play('buzz');
        var back = { a: [1, 0], b: [0, 1], c: [-1, 0], d: [0, -1] }[t];
        var msg = { hanja: '고유어 숲의 지킴이를 이겨야 길이 열려요.', sinjo: '한자어 서원의 지킴이를 이겨야 길이 열려요.', arena: '세 지역의 지킴이를 모두 이겨야 대회에 나갈 수 있어요.' }[id];
        run(function () { return UI.say('나무 울타리로 막혀 있다. ' + msg); }).then(function () {
          pl.fx = pl.x; pl.fy = pl.y; pl.x += back[0]; pl.y += back[1]; pl.moving = true; pl.t = 0;
        });
        return;
      }
      Sound.play('door');
      leaveTo(id);
      return;
    }
    if (!path.length && pendingTarget) {
      var tg = pendingTarget; pendingTarget = null;
      face(tg);
      interact();
    }
  }

  function facing() { var d = DIRS[pl.dir]; return [pl.x + d[0], pl.y + d[1]]; }
  function interact() {
    if (busy) return;
    var f = facing(), n = npcAt(f[0], f[1]), t = tile(f[0], f[1]);
    if (n) { talk(n); return; }
    if (t === 'D') { enterDoor(DOORS[f[0] + ',' + f[1]]); return; }
    if (t === 'N') { run(noticeBoard); return; }
  }

  // 비동기 상호작용 실행 (그동안 걷기 멈춤)
  function run(fn) {
    busy = true; path = []; pendingTarget = null;
    Input.held.up = Input.held.down = Input.held.left = Input.held.right = false;
    return Promise.resolve().then(fn).catch(function (e) { console.error(e); }).then(function () {
      busy = false; refreshHud(); Game.save();
    });
  }

  function talk(n) {
    var dirTo = { up: 'down', down: 'up', left: 'right', right: 'left' }[pl.dir];
    void dirTo;
    if (n.id === 'otter') { run(mentorTalk); return; }
    var lines = DATA.npcTalk[n.id];
    var i = talkIdx[n.id] % lines.length; talkIdx[n.id]++;
    run(function () { return UI.say(lines[i]); });
  }

  function mentorTalk() {
    var d = Game.data, p = d.progress;
    var lines = [];
    if (!p.talkedMentor) {
      p.talkedMentor = true;
      lines.push('물결 선생: 가람아, 마을에 온 걸 환영한다! 여기서 차근차근 준비하자꾸나.');
      lines.push('물결 선생: 여관에서는 쉬어 갈 수 있고, 상점에서는 약초와 힌트 부적을 판단다.');
      lines.push('물결 선생: 수련장에서는 다치지 않고 낱말을 연습할 수 있지. 틀린 낱말은 서당의 오답 수첩에 적어 두마.');
    }
    var goal;
    if (!p.boss.goyu) goal = '먼저 왼쪽 길로 나가 「고유어 숲」에 가 보렴. 숲에서 세 번 이기면 숲지기가 나타날 게다.';
    else if (!p.boss.hanja) goal = '숲지기를 이겼구나! 이제 위쪽 길의 「한자어 서원」이 열렸다.';
    else if (!p.boss.sinjo) goal = '서원도 통과했다니 대단하구나! 오른쪽 길 끝 「신조어 저잣거리」로 가 보렴.';
    else if (!p.champion) goal = '드디어 아래쪽 대회장이 열렸다! 「우리말 겨루기 대회」에서 실력을 보여 주렴.';
    else goal = '우리 마을의 장원 가람! 이제는 별(★)을 모두 모아 보는 건 어떻겠니?';
    lines.push('물결 선생: ' + goal);
    var wrongs = QUIZ_DATA.filter(function (q) { var s = d.words[q.id]; return s && s.wrong > 0 && s.streak < 2; });
    if (wrongs.length) {
      var q = U.pick(wrongs);
      lines.push('물결 선생: 참, 「' + q.word + '」 기억나니? ' + U.josa('「' + Words.meaning(q) + '」', '이라는/라는') + ' 뜻이란다.');
    } else if (p.talkedMentor) {
      lines.push('물결 선생: 맞히면 맞힐수록 연속 정답이 쌓여 공격이 더 세진단다. 침착하게!');
    }
    return UI.say(lines);
  }

  function noticeBoard() {
    var p = Game.data.progress;
    var mark = function (b) { return b ? '[통과]' : '[ 도전 전 ]'; };
    return UI.say([
      '게시판: 《제1회 우리말 겨루기 대회》 세 지역의 지킴이를 모두 이긴 수련생만 참가할 수 있습니다.',
      '게시판: 고유어 숲 ' + mark(p.boss.goyu) + ' · 한자어 서원 ' + mark(p.boss.hanja) + ' · 신조어 저잣거리 ' + mark(p.boss.sinjo)
    ]);
  }

  function enterDoor(id) {
    if (!id) return;
    Sound.play('door');
    if (id === 'inn') run(inn);
    else if (id === 'shop') run(shop);
    else if (id === 'dojo') run(dojo);
    else if (id === 'study') run(study);
  }

  // ---------------------------------------------------------------- 시설
  function inn() {
    var d = Game.data, h = Game.hero(), cost = 10;
    Game.setState('inn');
    return UI.say('곰 아주머니: 어서 와요, 꼬마 손님! 하룻밤 푹 자면 HP와 기력이 모두 회복돼요. 10냥이에요.').then(function () {
      return UI.choose([{ label: '쉬어 간다', right: cost + '냥' }, '그냥 나간다'], { title: '여관 (가진 돈 ' + d.gold + '냥)', start: 0 });
    }).then(function (i) {
      if (i !== 0) return UI.say('곰 아주머니: 언제든 또 들러요~');
      var free = d.gold < cost;
      if (!free) d.gold -= cost;
      d.hp = h.maxHp; d.mp = h.maxMp;
      Sound.play('heal');
      Fx.sparkle(pl.x * 16 + 8, pl.y * 16, '#fff6b0', 16);
      refreshHud();
      return UI.say(free ? '곰 아주머니: 돈이 모자라네? 괜찮아요, 이번엔 그냥 쉬어 가요. 쿨쿨…' : '곰 아주머니: 쿨쿨… 잘 잤어요? 몸이 아주 가뿐해 보이네요!')
        .then(function () { UI.toast('HP와 기력이 모두 회복되었다!'); });
    }).then(function () { Game.setState('town'); });
  }

  function shop() {
    var d = Game.data;
    Game.setState('shop');
    var last = 0;
    function loop() {
      var items = DATA.shopList.map(function (id) {
        var it = DATA.items[id], eq = DATA.equips[id];
        if (it) return { label: it.name + ' (' + d.items[id] + '개)', right: it.price + '냥', desc: it.desc, id: id, price: it.price, disabled: d.gold < it.price, why: '돈이 모자라요.' };
        var owned = d.owned.indexOf(id) >= 0;
        var cur = DATA.equips[d.equip[eq.slot]];
        var worse = (eq.slot === 'weapon' ? cur.atk >= eq.atk : cur.def >= eq.def);
        return { label: eq.name + (owned ? ' (가짐)' : ''), right: owned ? '-' : eq.price + '냥', desc: eq.desc, id: id, price: eq.price,
          disabled: owned || worse || d.gold < eq.price, why: owned ? '이미 가지고 있어요.' : worse ? '지금 장비가 더 좋아요.' : '돈이 모자라요.' };
      });
      items.push({ label: '나가기', desc: '상점을 나간다.' });
      return UI.choose(items, { title: '상점 · 가진 돈 ' + d.gold + '냥', start: last, cls: 'center shop' }).then(function (i) {
        if (i < 0 || i === items.length - 1) return UI.say('토끼 상인: 깡총! 또 오세요~');
        last = i;
        var sel = items[i];
        d.gold -= sel.price;
        Sound.play('coin');
        if (DATA.items[sel.id]) {
          d.items[sel.id]++;
          UI.toast(U.josa(DATA.items[sel.id].name, '을/를') + ' 샀다!');
        } else {
          var eq = DATA.equips[sel.id];
          d.owned.push(sel.id);
          var before = Game.hero();
          d.equip[eq.slot] = sel.id;
          var after = Game.hero();
          d.hp = Math.min(after.maxHp, d.hp + (after.maxHp - before.maxHp));
          UI.toast(U.josa(eq.name, '을/를') + ' 장착했다!');
        }
        Game.save(); refreshHud();
        return loop();
      });
    }
    return UI.say('토끼 상인: 깡총깡총! 수련에 필요한 물건 다 있어요. 천천히 골라 봐요!').then(loop).then(function () { Game.setState('town'); });
  }

  function dojo() {
    Game.setState('dojo');
    var d = Game.data;
    var cats = [
      { label: '고유어 연습', cat: 'goyu', desc: '시나브로, 아름드리 같은 순우리말 10개' },
      { label: '한자어 연습', cat: 'hanja', desc: '난항, 답보 같은 한자어 10개' },
      { label: '신조어 연습', cat: 'sinjo', desc: '갓생, 중꺾마 같은 새로 생긴 말 10개' },
      { label: '모두 섞어서', cat: 'all', desc: '30개 낱말에서 골고루' },
      { label: '그만두기', desc: '수련장을 나간다.' }
    ];
    function round(cat) {
      var n = 5, right = 0, k = 0;
      function next() {
        if (k >= n) return Promise.resolve();
        k++;
        return Words.ask(cat, { tag: '연습 ' + k + '/' + n, tagCls: 'practice', practice: true }).then(function (r) {
          if (r.correct) right++;
          return next();
        });
      }
      return next().then(function () {
        var exp = right * 2;
        d.stats.practice += n;
        var msg = n + '문제 중 ' + right + '개를 맞혔다! 경험치 +' + exp;
        return UI.say(msg).then(function () { return Game.gainExp(exp); });
      });
    }
    function loop() {
      return UI.choose(cats, { title: '수련장 · 다치지 않고 연습해요' }).then(function (i) {
        if (i < 0 || i === 4) return;
        return round(cats[i].cat).then(loop);
      });
    }
    return UI.say('수련장 안에 낱말 두루마리가 가득하다. 여기서는 틀려도 다치지 않는다. 틀리면 풀이를 꼭 읽어 보자!')
      .then(loop).then(function () { Game.setState('town'); });
  }

  function study() {
    Game.setState('study');
    return UI.say('물결 선생: 서당에 왔구나. 네가 틀렸던 낱말을 수첩에 적어 두었단다.').then(Game.openNotebook).then(function () { Game.setState('town'); });
  }

  function townMenu() {
    return UI.choose([
      { label: '오답 수첩', desc: '틀린 낱말과 30개 낱말의 숙련도를 본다.' },
      { label: '가람의 상태', desc: '레벨, 능력치, 장비, 도구를 본다.' },
      { label: Sound.isMuted() ? '소리 켜기' : '소리 끄기', desc: '배경 음악과 효과음을 켜거나 끈다. (M 키)' },
      { label: '타이틀로', desc: '처음 화면으로 돌아간다. (진행은 자동 저장됨)' },
      { label: '닫기', desc: '' }
    ], { title: '메뉴', cls: 'center' }).then(function (i) {
      if (i === 0) return Game.openNotebook();
      if (i === 1) return Game.openStatus();
      if (i === 2) { Sound.toggleMute(); return; }
      if (i === 3) return UI.confirm('타이틀 화면으로 갈까요?').then(function (ok) { if (ok) { leave(); Game.title(); return 'left'; } });
    });
  }

  // ---------------------------------------------------------------- HUD / 이동
  function refreshHud() {
    if (!hud || !Game.data) return;
    var d = Game.data, h = Game.hero();
    hud.innerHTML = '<b>가람</b> Lv ' + d.lv + ' · HP ' + d.hp + '/' + h.maxHp + ' · 기력 ' + d.mp + '/' + h.maxMp + ' · <span class="g">' + d.gold + '냥</span>';
  }

  function makeLabels() {
    labels = UI.layer('townlabels');
    var L = [
      ['여관', 4.5, 2.75, 'bld'], ['상점', 15.5, 2.75, 'bld'], ['수련장', 4.5, 11.2, 'bld'], ['서당 · 오답 수첩', 15.5, 11.2, 'bld'],
      ['← 고유어 숲', 0.15, 6.25, 'exit l', 'goyu'], ['한자어 서원 ↑', 10, 0.12, 'exit t', 'hanja'],
      ['신조어 저잣거리 →', 19.85, 6.25, 'exit r', 'sinjo'], ['대회장 ↓', 10, 13.95, 'exit b', 'arena']
    ];
    L.forEach(function (l) {
      var locked = l[4] && exitLocked(l[4]);
      var s = UI.el('div', 'tl ' + l[3] + (locked ? ' locked' : ''), U.esc(l[0]) + (locked ? ' <span class="lk">잠김</span>' : ''));
      s.style.left = (l[1] * 48) + 'px'; s.style.top = (l[2] * 48) + 'px';
      labels.appendChild(s);
    });
    hud = UI.layer('townhud');
    var mb = UI.el('button', 'menubtn', '메뉴');
    mb.type = 'button';
    mb.addEventListener('click', function (e) { e.preventDefault(); if (!busy && Input.top() === handler) openMenu(); });
    labels.appendChild(mb);
    refreshHud();
  }
  function openMenu() {
    run(townMenu);
  }

  function enter(spawn) {
    var s = SPAWN[spawn] || SPAWN.start;
    if (Game.data.pos && spawn === 'load') s = [Game.data.pos[0], Game.data.pos[1], 'down'];
    pl.x = pl.fx = s[0]; pl.y = pl.fy = s[1]; pl.dir = s[2]; pl.moving = false; pl.t = 0;
    if (!walkable(pl.x, pl.y) && !EXITS[tile(pl.x, pl.y)]) { pl.x = pl.fx = 9; pl.y = pl.fy = 9; }
    path = []; pendingTarget = null; busy = false;
    Engine.setScene(scene);
    Game.setState('town');
    Sound.music('town');
    makeLabels();
    handler = Input.push(function (a) {
      if (busy) return;
      if (a === 'ok') interact();
      else if (a === 'cancel') openMenu();
      else if (DIRS[a] && !pl.moving) { path = []; pendingTarget = null; tryStep(DIRS[a][0], DIRS[a][1]); }
    });
  }
  function leave() {
    if (handler) Input.remove(handler);
    handler = null;
    if (labels) labels.remove();
    if (hud) hud.remove();
    labels = hud = null;
    Game.data.pos = [pl.x, pl.y];
  }
  function leaveTo(id) {
    busy = true;
    var spot = SPAWN[id];
    Game.data.pos = [spot[0], spot[1]];
    leave();
    UI.fade(true).then(function () {
      UI.fade(false);
      if (id === 'arena') Game.tournament(); else Game.area(id);
    });
  }

  return { enter: enter, leave: leave, refreshHud: refreshHud, map: MAP, player: pl,
    isBusy: function () { return busy; } };
})();
