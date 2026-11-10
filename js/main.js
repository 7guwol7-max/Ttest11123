// 우리말 수련기 - 게임 흐름: 타이틀, 이야기, 지역, 대회, 엔딩
'use strict';

var Game = {
  data: null,
  stateName: 'boot',

  newData: function () {
    return {
      v: 1, lv: 1, exp: 0, hp: 36, mp: 8, gold: 30,
      items: { herb: 2, rice: 1, charm: 1 },
      equip: { weapon: 'brush0', armor: 'robe0' },
      owned: ['brush0', 'robe0'],
      progress: { boss: { goyu: false, hanja: false, sinjo: false }, wins: { goyu: 0, hanja: 0, sinjo: 0 }, visited: {},
        talkedMentor: false, round: 0, champion: false, introDone: false },
      words: {},
      stats: { answered: 0, correct: 0, wins: 0, defeats: 0, bestCombo: 0, charmsUsed: 0, practice: 0, playSec: 0, flees: 0 },
      pos: null, hintArmed: false
    };
  },
  // 저장 자료가 옛 형식이어도 빠진 칸을 채운다
  fix: function (d) {
    var base = this.newData();
    (function merge(dst, src) {
      Object.keys(src).forEach(function (k) {
        if (dst[k] === undefined || dst[k] === null) dst[k] = src[k];
        else if (typeof src[k] === 'object' && !Array.isArray(src[k]) && src[k] !== null && typeof dst[k] === 'object') merge(dst[k], src[k]);
      });
    })(d, base);
    if (!DATA.equips[d.equip.weapon]) d.equip.weapon = 'brush0';
    if (!DATA.equips[d.equip.armor]) d.equip.armor = 'robe0';
    return d;
  },
  hero: function () {
    var d = this.data, b = DATA.heroBase(d.lv), w = DATA.equips[d.equip.weapon], a = DATA.equips[d.equip.armor];
    return { maxHp: b.maxHp + (a.hp || 0), maxMp: b.maxMp, atk: b.atk + (w.atk || 0), def: b.def + (a.def || 0) };
  },
  save: function () { if (this.data) { this.data.hp = Math.max(0, Math.min(this.data.hp, this.hero().maxHp)); Store.save(this.data); } },
  setState: function (n) { this.stateName = n; },
  ui: function () {},

  gainExp: async function (n) {
    var d = this.data;
    d.exp += n;
    while (d.lv < DATA.maxLv && d.exp >= DATA.expNext(d.lv)) {
      d.exp -= DATA.expNext(d.lv);
      var before = this.hero();
      d.lv++;
      var after = this.hero();
      d.hp = after.maxHp; d.mp = after.maxMp;
      Sound.play('levelup');
      Fx.sparkle(160, 120, '#fff6b0', 24);
      await UI.banner('레벨 업!', 'lvup', 1000);
      var parts = ['최대 HP +' + (after.maxHp - before.maxHp), '기력 +' + (after.maxMp - before.maxMp), '공격 +' + (after.atk - before.atk)];
      if (after.def > before.def) parts.push('방어 +' + (after.def - before.def));
      await UI.say('가람이 Lv ' + d.lv + '에 올랐다! HP와 기력이 모두 회복되었다.\n' + parts.join(' · '));
      var sk = DATA.skills.filter(function (s) { return s.lv === d.lv; })[0];
      if (sk) await UI.say('새 기술 ' + U.josa('「' + sk.name + '」', '을/를') + ' 배웠다! (전투에서 「기술」 → 기력 ' + sk.mp + ' 사용, ' + sk.desc + ')');
    }
    this.save();
  },

  // ---------------------------------------------------------------- 타이틀
  title: async function () {
    UI.clear();
    this.setState('title');
    Engine.setScene(TitleScene);
    Sound.music('title');
    var logo = UI.layer('titlelogo');
    logo.innerHTML = '<div class="tsub">까치 가람의 우리말 겨루기 대회 도전기</div>' +
      '<h1>우리말 수련기</h1>' +
      '<div class="tsmall">6학년 국어 · 소중한 우리말</div>';
    var foot = UI.layer('titlefoot');
    foot.textContent = '방향키·Enter 또는 화면을 눌러 고르세요 · M: 소리 켜기/끄기';
    var saved = Store.load();
    for (;;) {
      var i = await UI.choose([
        { label: '새로 시작' },
        { label: '이어 하기', disabled: !saved, why: '저장된 기록이 없어요.' }
      ], { cls: 'titlemenu', cancel: false, catcher: false, start: saved ? 1 : 0 });
      if (i === 0) {
        if (saved) {
          var ok = await UI.confirm('저장된 기록이 있어요. 지우고 처음부터 할까요?', '새로 시작', '취소');
          if (!ok) continue;
        }
        Store.clear();
        this.data = this.newData();
        logo.remove(); foot.remove();
        this.save();
        await this.intro();
        return;
      }
      if (i === 1 && saved) {
        this.data = this.fix(saved);
        logo.remove(); foot.remove();
        Town.enter('load');
        UI.toast('이어서 시작합니다. (Lv ' + this.data.lv + ')');
        return;
      }
    }
  },

  intro: async function () {
    this.setState('intro');
    Engine.setScene(IntroScene);
    await UI.say([
      '까치 마을에 봄바람이 분다. 올해도 마을 큰 마당에서 「우리말 겨루기 대회」가 열린다는 소식이 들려왔다.',
      { who: '가람', text: '선생님! 저도 이번 우리말 겨루기 대회에 꼭 나가고 싶어요!' },
      { who: '물결 선생', text: '허허, 가람아. 대회에 나가려면 고유어 숲, 한자어 서원, 신조어 저잣거리의 지킴이를 모두 이겨야 한단다.' },
      { who: '물결 선생', text: '겁먹을 것 없다. 낱말의 뜻을 바르게 고르면 그게 곧 공격이 되니까. 틀리더라도 뜻을 배우면 그만큼 강해지는 거란다.' },
      { who: '가람', text: '까악! 열심히 수련할게요!' },
      { who: '물결 선생', text: '좋아. 방향키(또는 화면 누르기)로 걷고, Enter로 말을 걸거나 문에 들어갈 수 있단다. Esc를 누르면 메뉴가 열리지.' }
    ]);
    this.data.progress.introDone = true;
    this.save();
    Town.enter('start');
  },

  // ---------------------------------------------------------------- 지역
  area: async function (id) {
    var A = DATA.areas.filter(function (a) { return a.id === id; })[0];
    var d = this.data, p = d.progress;
    this.setState('area');
    AreaScene.bgName = A.bg;
    Engine.setScene(AreaScene);
    Sound.music('town');
    var infoBox = UI.layer('areainfo');
    var refresh = function () {
      var h = Game.hero();
      infoBox.innerHTML = '<div class="win"><div class="aname">' + U.esc(A.name) + '</div><div class="adesc">' + U.esc(A.desc) + '</div>' +
        '<div class="aprog">탐색 승리 <b>' + Math.min(p.wins[id], A.need) + ' / ' + A.need + '</b>' + (p.boss[id] ? ' · <span class="ok">지킴이 통과!</span>' : '') + '</div>' +
        '<div class="aprog">HP ' + d.hp + '/' + h.maxHp + ' · 기력 ' + d.mp + '/' + h.maxMp + ' · ' + d.gold + '냥</div></div>';
    };
    refresh();
    if (!p.visited[id]) { p.visited[id] = true; await UI.say(A.hello); }
    for (;;) {
      this.setState('area');
      Engine.setScene(AreaScene);
      Sound.music('town');
      refresh();
      infoBox.style.display = '';
      var ready = p.wins[id] >= A.need;
      var bossName = DATA.enemies[A.boss].name;
      var c = await UI.choose([
        { label: '탐색하기', desc: '숲길을 걸으며 만나는 상대와 겨룬다. (' + QUIZ_CATEGORIES[A.cat].name + ' 문제)' },
        { label: p.boss[id] ? '지킴이와 다시 겨루기' : '지킴이에게 도전!', disabled: !ready,
          why: '탐색에서 ' + A.need + '번 이기면 지킴이가 나타나요.', desc: ready ? '지킴이 ' + bossName + ' - 한판 승부! (도망칠 수 없음)' : '탐색에서 ' + A.need + '번 이기면 열린다.' },
        { label: '오답 수첩', desc: '틀린 낱말을 다시 본다.' },
        { label: '마을로 돌아가기', desc: '여관·상점·수련장이 있는 마을로.' }
      ], { title: '어떻게 할까?', cls: 'areamenu', cancel: true, catcher: false });
      if (c === 2) { await this.openNotebook(); continue; }
      if (c === 3 || c < 0) { infoBox.remove(); Town.enter(id); return; }
      infoBox.style.display = 'none';
      if (c === 0) {
        var pool = A.enemies;
        var w = p.wins[id];
        // 처음에는 약한 상대부터
        var en = w < A.need ? pool[Math.min(pool.length - 1, U.randi(0, w))] : U.pick(pool);
        var r = await Battle.run({ enemy: en, cat: A.cat, bg: A.bg, title: A.name });
        if (r === 'lose') { infoBox.remove(); await this.defeat(); return; }
        if (r === 'win') {
          p.wins[id]++;
          this.save();
          if (p.wins[id] === A.need && !p.boss[id]) {
            Engine.setScene(AreaScene);
            await UI.say('땅이 쿠르릉 울린다… ' + U.josa(bossName, '이/가') + ' 가람을 기다리고 있다! (「지킴이에게 도전!」이 열렸다)');
          }
        }
        if (r === 'flee') d.stats.flees++;
        continue;
      }
      if (c === 1) {
        var first = !p.boss[id];
        var rb = await Battle.run({ enemy: A.boss, cat: A.cat, bg: A.bg, title: A.name + ' · 지킴이' });
        if (rb === 'lose') { infoBox.remove(); await this.defeat(); return; }
        if (rb === 'win' && first) {
          p.boss[id] = true;
          this.save();
          Engine.setScene(AreaScene);
          var next = { goyu: '위쪽 길의 「한자어 서원」', hanja: '오른쪽 길의 「신조어 저잣거리」', sinjo: '아래쪽 길의 「우리말 겨루기 대회장」' }[id];
          await UI.say([
            { who: DATA.enemies[A.boss].name, text: { goyu: '허허… 낱말 뿌리가 튼튼하구나. 숲의 인정을 받았다!', hanja: '에헴… 제법이로구나. 서원의 문을 열어 주마.', sinjo: '구구… 줄이지 않고 말하마. 정말 대단했다!' }[id] },
            '마을로 돌아가는 길이 환해졌다. ' + U.josa(next, '이/가') + ' 열렸다!'
          ]);
          infoBox.remove();
          Town.enter(id);
          return;
        }
        continue;
      }
    }
  },

  defeat: async function () {
    var d = this.data, h = this.hero();
    var lost = Math.floor(d.gold * 0.1);
    d.gold -= lost; d.hp = h.maxHp; d.mp = h.maxMp;
    this.save();
    this.setState('defeat');
    Engine.setScene(IntroScene);
    Sound.music('title');
    await UI.say([
      { who: '물결 선생', text: '가람아, 정신이 드니? 쓰러진 너를 마을까지 업고 왔단다.' },
      { who: '물결 선생', text: (lost ? '치료비로 ' + lost + '냥이 들었지만, ' : '') + '배운 낱말과 지금까지의 진행은 그대로란다. 틀린 낱말을 오답 수첩에서 다시 보고 도전해 보자!' }
    ]);
    Town.enter('start');
  },

  // ---------------------------------------------------------------- 대회
  tournament: async function () {
    var d = this.data, p = d.progress;
    this.setState('tournament');
    AreaScene.bgName = 'arena';
    Engine.setScene(AreaScene);
    Sound.music('town');
    if (!p.visited.arena) {
      p.visited.arena = true;
      await UI.say([
        '와아아! 대회장은 구경 온 마을 사람들로 가득하다.',
        { who: '물결 선생', text: '가람아, 오늘은 내가 심판이란다. 대회 문제는 고유어·한자어·신조어 30개 낱말에서 골고루 나온다.' },
        { who: '물결 선생', text: '1회전, 2회전을 이기면 결승에서 지난 대회 장원과 겨루게 된다. 경기 전에는 HP와 기력을 모두 채워 주마!' }
      ]);
    }
    for (;;) {
      this.setState('tournament');
      AreaScene.bgName = 'arena';
      Engine.setScene(AreaScene);
      Sound.music('town');
      var R = DATA.tournament[Math.min(p.round, DATA.tournament.length - 1)];
      var en = DATA.enemies[R.enemy];
      var label = p.champion ? '장원 기념 겨루기 (결승 상대와 다시)' : R.round + ' 시작 : ' + en.name;
      var c = await UI.choose([
        { label: label, desc: '경기 전에 HP와 기력이 모두 회복된다. (도망칠 수 없음)' },
        { label: '오답 수첩', desc: '경기 전에 낱말을 다시 본다.' },
        { label: '마을로 돌아가기', desc: '준비를 더 하고 오자.' }
      ], { title: '우리말 겨루기 대회 · ' + (p.champion ? '장원!' : (p.round + 1) + ' / 3 경기'), cls: 'areamenu', cancel: true, catcher: false });
      if (c === 1) { await this.openNotebook(); continue; }
      if (c !== 0) { Town.enter('arena'); return; }
      var h = this.hero();
      d.hp = h.maxHp; d.mp = h.maxMp;
      var foe = p.champion ? 'bossOwl' : R.enemy;
      await UI.say({ who: '물결 선생', text: (p.champion ? '장원 기념 경기' : R.round) + '! 가람 대 ' + DATA.enemies[foe].name + '. 겨루기 시작!' });
      var r = await Battle.run({ enemy: foe, cat: 'all', bg: 'arena', title: '우리말 겨루기 대회 · ' + (p.champion ? '기념 경기' : R.round), noFlee: true });
      if (r === 'lose') {
        await this.defeat();
        return;
      }
      if (p.champion) { continue; }
      p.round++;
      this.save();
      if (p.round >= DATA.tournament.length) {
        p.champion = true;
        this.save();
        await this.ending();
        return;
      }
      Engine.setScene(AreaScene);
      await UI.say({ who: '물결 선생', text: R.round + ' 승리! 관중들이 「가람! 가람!」 하고 외친다. 다음 경기는 ' + DATA.tournament[p.round].round + '이다!' });
    }
  },

  ending: async function () {
    var d = this.data;
    this.setState('ending');
    EndingScene.t0 = 0;
    Engine.setScene(EndingScene);
    Sound.music('ending');
    await UI.say([
      { who: '장원 부엉이 「솔빛」', text: '부엉… 졌구나. 너의 낱말 실력, 정말 대단하다. 올해의 장원은 가람, 바로 너다!', face: 'bossOwl' },
      { who: '물결 선생', text: '가람아, 축하한다! 처음엔 「시나브로」도 헷갈리던 네가 시나브로 이렇게 자랐구나.' },
      { who: '가람', text: '모두 선생님 덕분이에요! 우리말이 이렇게 재미있는 줄 몰랐어요. 까악!' }
    ]);
    var acc = d.stats.answered ? Math.round(d.stats.correct / d.stats.answered * 100) : 0;
    var html = '<div class="end">' +
      '<div class="endtitle">우리말 겨루기 대회 장원 · 까치 가람</div>' +
      '<div class="endgrid">' +
      '<div class="ebox"><div class="ek">정답률</div><div class="ev">' + acc + '%</div><div class="es">' + d.stats.correct + ' / ' + d.stats.answered + ' 문제</div></div>' +
      '<div class="ebox"><div class="ek">낱말 숙련도</div><div class="ev">★ ' + Words.totalStars() + ' / 90</div><div class="es">★★★ 낱말 ' + Words.mastered() + '/30</div></div>' +
      '<div class="ebox"><div class="ek">플레이 요약</div><div class="es">Lv ' + d.lv + ' · 승리 ' + d.stats.wins + '번 · 쓰러짐 ' + d.stats.defeats + '번</div>' +
      '<div class="es">최고 연속 정답 ' + d.stats.bestCombo + ' · 힌트 부적 ' + d.stats.charmsUsed + '장</div>' +
      '<div class="es">플레이 시간 ' + U.fmtTime(d.stats.playSec) + '</div></div>' +
      '</div>' + this.masteryGrid() + '</div>';
    await UI.panel('엔딩 · 수련 기록', html, { cls: 'endpanel' });
    for (;;) {
      var c = await UI.choose(['계속 하기 (마을로)', '타이틀로'], { title: '수련은 계속된다!', cls: 'center', cancel: false });
      if (c === 0) { Town.enter('arena'); return; }
      if (c === 1) { this.title(); return; }
    }
  },

  masteryGrid: function () {
    var out = '<div class="mgrid">';
    QUIZ_DATA.forEach(function (q) {
      var s = Words.stars(q.id);
      out += '<div class="mcell s' + s + '"><span class="mw">' + U.esc(q.word.replace(/\(.*\)/, '')) + '</span><span class="ms">' + '★'.repeat(s) + '<i>' + '☆'.repeat(3 - s) + '</i></span></div>';
    });
    return out + '</div>';
  },

  // ---------------------------------------------------------------- 창들
  openNotebook: function () {
    var d = Game.data;
    var starsHtml = function (n) { return '<span class="st">' + '★'.repeat(n) + '<i>' + '☆'.repeat(3 - n) + '</i></span>'; };
    var row = function (q) {
      var s = d.words[q.id] || { seen: 0, correct: 0, wrong: 0, streak: 0 };
      return '<div class="nrow' + (s.seen ? '' : ' unseen') + '"><div class="nw">' + U.esc(q.word) + '</div><div class="nm">' + U.esc(Words.meaning(q)) + '</div>' +
        '<div class="nr">' + starsHtml(Math.min(3, s.streak)) + '<div class="nc">' + (s.seen ? '맞힘 ' + s.correct + ' · 틀림 ' + s.wrong : '아직 안 나옴') + '</div></div></div>';
    };
    var wrongs = QUIZ_DATA.filter(function (q) { var s = d.words[q.id]; return s && s.wrong > 0; })
      .sort(function (a, b) { return (d.words[b.id].wrong - d.words[b.id].streak) - (d.words[a.id].wrong - d.words[a.id].streak); });
    var summary = '<div class="nsum">숙련도 ★ ' + Words.totalStars() + ' / 90 · 완전히 익힌 낱말 ' + Words.mastered() + ' / 30 <small>(연속 3번 맞히면 ★★★)</small></div>';
    var tabs = [
      { name: '틀린 낱말 ' + wrongs.length, html: summary + (wrongs.length ? wrongs.map(row).join('') : '<div class="nempty">아직 틀린 낱말이 없어요. 아주 잘하고 있어요!</div>') }
    ];
    ['goyu', 'hanja', 'sinjo'].forEach(function (c) {
      tabs.push({ name: QUIZ_CATEGORIES[c].name, html: summary + Words.list(c).map(row).join('') });
    });
    Game.setState(Game.stateName);
    return UI.panel('오답 수첩', tabs, { cls: 'notebook' });
  },
  openStatus: function () {
    var d = Game.data, h = Game.hero(), p = d.progress;
    var w = DATA.equips[d.equip.weapon], a = DATA.equips[d.equip.armor];
    var acc = d.stats.answered ? Math.round(d.stats.correct / d.stats.answered * 100) : 0;
    var skills = DATA.skills.map(function (s) { return '<li class="' + (d.lv >= s.lv ? '' : 'lock') + '">' + (d.lv >= s.lv ? U.esc(s.name) + ' (기력 ' + s.mp + ') - ' + U.esc(s.desc) : 'Lv ' + s.lv + '에 배움') + '</li>'; }).join('');
    var html = '<div class="status"><div class="sface"><img src="' + Art.url('hero') + '" alt=""></div><div class="scol">' +
      '<div><b>가람</b> · 까치 수련생 · Lv ' + d.lv + ' (다음 레벨까지 경험치 ' + (DATA.expNext(d.lv) - d.exp) + ')</div>' +
      '<div>HP ' + d.hp + '/' + h.maxHp + ' · 기력 ' + d.mp + '/' + h.maxMp + ' · 공격 ' + h.atk + ' · 방어 ' + h.def + '</div>' +
      '<div>무기: ' + U.esc(w.name) + ' · 옷: ' + U.esc(a.name) + '</div>' +
      '<div>도구: 약초 ' + d.items.herb + ' · 꿀떡 ' + d.items.rice + ' · 힌트 부적 ' + d.items.charm + ' · 돈 ' + d.gold + '냥</div>' +
      '<div>정답률 ' + acc + '% (' + d.stats.correct + '/' + d.stats.answered + ') · 최고 연속 정답 ' + d.stats.bestCombo + '</div>' +
      '<div>진행: 고유어 숲 ' + (p.boss.goyu ? '통과' : '도전 중') + ' · 한자어 서원 ' + (p.boss.hanja ? '통과' : p.boss.goyu ? '도전 중' : '잠김') + ' · 신조어 저잣거리 ' + (p.boss.sinjo ? '통과' : p.boss.hanja ? '도전 중' : '잠김') + '</div>' +
      '<div class="sk">기술</div><ul>' + skills + '</ul></div></div>';
    return UI.panel('가람의 상태', html, { cls: 'statuspanel' });
  }
};

// ---------------------------------------------------------------- 장면들
var TitleScene = {
  draw: function (ctx, t) {
    ctx.drawImage(Art.bg('title'), 0, 0);
    // 하늘을 나는 까치 두 마리
    for (var i = 0; i < 2; i++) {
      var x = ((t * (18 + i * 7) + i * 170) % 380) - 30;
      var y = 70 + i * 22 + Math.round(Math.sin(t * 2 + i) * 4);
      var flap = Math.floor(t * 6 + i) % 2;
      ctx.fillStyle = '#140f1c';
      ctx.fillRect(Math.round(x), y, 6, 2);
      ctx.fillRect(Math.round(x) + 5, y - 1, 2, 2);
      ctx.fillRect(Math.round(x) - 4, y + 1, 4, 1);
      if (flap) { ctx.fillRect(Math.round(x) + 1, y - 3, 2, 3); } else { ctx.fillRect(Math.round(x) + 1, y + 2, 2, 2); }
    }
    Art.shadow(ctx, 160, 222, 26);
    Art.draw(ctx, 'hero', 160, 222 + Math.round(Math.sin(t * 3) * 1.2));
  }
};
var IntroScene = {
  draw: function (ctx, t) {
    ctx.drawImage(Art.bg('forest'), 0, 0);
    ctx.fillStyle = 'rgba(20,15,40,0.2)'; ctx.fillRect(0, 0, 320, 240);
    Art.shadow(ctx, 112, 176, 50);
    Art.draw(ctx, 'hero', 112, 176 + Math.round(Math.sin(t * 3) * 1.2), { scale: 2 });
    Art.shadow(ctx, 212, 176, 28);
    Art.draw(ctx, 'otter', 212, 176 + Math.round(Math.sin(t * 2.5)), { scale: 2 });
  }
};
var AreaScene = {
  bgName: 'forest',
  draw: function (ctx, t) {
    ctx.drawImage(Art.bg(this.bgName), 0, 0);
    Art.shadow(ctx, 84, 178, 50);
    Art.draw(ctx, 'hero', 84, 178 + Math.round(Math.sin(t * 3) * 1.2), { scale: 2 });
    if (this.bgName === 'forest' && Math.random() < 0.05) Fx.parts.push({ x: U.rand(0, 320), y: -2, vx: U.rand(-6, 6), vy: U.rand(12, 22), life: 6, max: 6, c: U.pick(['#7ab84a', '#d8a040']), g: 0 });
    if (this.bgName === 'market' && Math.random() < 0.04) Fx.parts.push({ x: U.rand(0, 320), y: U.rand(60, 90), vx: 0, vy: -4, life: 2, max: 2, c: '#fff3c0', g: 0, star: true });
    if (this.bgName === 'arena' && Math.random() < 0.1) Fx.parts.push({ x: U.rand(0, 320), y: U.rand(60, 110), vx: 0, vy: -10, life: 0.4, max: 0.4, c: U.pick(['#fff', '#f4e070']), g: 0 });
  }
};
var EndingScene = {
  draw: function (ctx, t) {
    ctx.drawImage(Art.bg('arena'), 0, 0);
    if (Math.random() < 0.6) Fx.parts.push({ x: U.rand(0, 320), y: -2, vx: U.rand(-10, 10), vy: U.rand(20, 40), life: 6, max: 6, c: U.pick(['#d8433a', '#3a7ae8', '#f0c030', '#3aa86a', '#f0a0c0', '#fff']), g: 0 });
    Art.shadow(ctx, 160, 186, 50);
    var hop = Math.abs(Math.sin(t * 4)) * 8;
    Art.draw(ctx, 'hero', 160, 186 - Math.round(hop), { scale: 2 });
    Art.shadow(ctx, 84, 186, 28);
    Art.draw(ctx, 'otter', 84, 186, { scale: 2 });
    Art.shadow(ctx, 248, 186, 60);
    Art.draw(ctx, 'bossOwl', 248, 186, { flip: true, scale: 1.5 });
  }
};

// ---------------------------------------------------------------- 시작
window.addEventListener('load', function () {
  UI.init();
  Input.init();
  Engine.init();
  var mb = document.getElementById('muteBtn');
  if (mb) {
    mb.textContent = Sound.isMuted() ? '소리 끔' : '소리 켬';
    mb.classList.toggle('off', Sound.isMuted());
    mb.addEventListener('click', function (e) { e.preventDefault(); Sound.unlock(); Sound.toggleMute(); });
  }
  setInterval(function () {
    if (Game.data && Game.stateName !== 'title' && !document.hidden) {
      Game.data.stats.playSec++;
      if (Game.data.stats.playSec % 15 === 0) Game.save();
    }
  }, 1000);
  Game.title();
});

// 자동 테스트·디버그용
window.__game = {
  get state() { return Game.stateName; },
  get ui() { return UI.info(); },
  get data() { return Game.data; },
  hero: function () { return Game.data ? Game.hero() : null; },
  battle: function () {
    var s = Battle.state();
    return s && s.hud ? { enemy: s.e.name, ehp: s.ehp, emax: s.emax, combo: s.combo, charged: s.charged } : null;
  },
  town: function () { return { x: Town.player.x, y: Town.player.y, dir: Town.player.dir, moving: Town.player.moving, busy: Town.isBusy() }; },
  setHero: function (o) {
    var d = Game.data;
    if (!d) return;
    ['lv', 'exp', 'hp', 'mp', 'gold'].forEach(function (k) { if (o[k] !== undefined) d[k] = o[k]; });
    if (o.items) Object.keys(o.items).forEach(function (k) { d.items[k] = o.items[k]; });
    if (o.full) { var h = Game.hero(); d.hp = h.maxHp; d.mp = h.maxMp; }
    Town.refreshHud();
    Game.save();
  },
  setProgress: function (o) { var p = Game.data.progress; Object.keys(o).forEach(function (k) { if (typeof o[k] === 'object') Object.assign(p[k], o[k]); else p[k] = o[k]; }); Game.save(); },
  setSpeed: function (n) { Engine.speed = n; }
};
