// 우리말 수련기 - 턴제 전투 (퀴즈로 공격하고 막는다)
'use strict';

var Battle = (function () {
  var st = null;
  var HX = 84, HY = 178, EX = 234, EY = 178, SC = 2; // 발 위치(캔버스 좌표), 확대 배율

  // ---------------------------------------------------------------- 그리기
  var scene = {
    update: function (dt) {
      if (!st) return;
      for (var i = st.tweens.length - 1; i >= 0; i--) {
        var tw = st.tweens[i];
        tw.t += dt;
        var p = Math.min(1, tw.t / tw.dur);
        tw.fn(p);
        if (p >= 1) { st.tweens.splice(i, 1); tw.done(); }
      }
      if (st.hFlash > 0) st.hFlash -= dt;
      if (st.eFlash > 0) st.eFlash -= dt;
      if (st.charged && Math.random() < dt * 14) {
        var sp = Art.sprite(st.e.sprite);
        Fx.parts.push({ x: EX + U.rand(-sp.w, sp.w), y: EY - U.rand(0, sp.h * SC), vx: 0, vy: -30, life: 0.6, max: 0.6, c: U.pick(['#ff6a4a', '#ffd04a']), g: 0 });
      }
    },
    draw: function (ctx, t) {
      if (!st) return;
      ctx.drawImage(Art.bg(st.bg), 0, 0);
      var es = Art.sprite(st.e.sprite);
      Art.shadow(ctx, HX + st.hx, HY, 50);
      if (st.eAlpha > 0) Art.shadow(ctx, EX + st.ex, EY, es.w * 1.6);
      var hb = Math.round(Math.sin(t * 3) * 1.2);
      var eb = Math.round(Math.sin(t * 2.4 + 1) * 1.5);
      var hf = st.hFlash > 0 && Math.floor(st.hFlash * 20) % 2 === 0;
      var ef = st.eFlash > 0 && Math.floor(st.eFlash * 20) % 2 === 0;
      if (st.eAlpha > 0) Art.draw(ctx, st.e.sprite, EX + st.ex, EY + eb + st.ey, { flash: ef, alpha: st.eAlpha, scale: SC });
      if (st.charged) {
        ctx.globalAlpha = 0.25 + 0.2 * Math.sin(t * 10);
        Art.draw(ctx, st.e.sprite, EX + st.ex, EY + eb, { flash: true, scale: SC });
        ctx.globalAlpha = 1;
      }
      Art.draw(ctx, 'hero', HX + st.hx, HY + hb + st.hy, { flash: hf, alpha: st.hAlpha, scale: SC });
      if (st.shield > 0) {
        ctx.globalAlpha = Math.min(1, st.shield);
        ctx.fillStyle = '#9ad8ff';
        for (var a = -1.1; a <= 1.1; a += 0.06) ctx.fillRect(Math.round(HX + 36 + Math.cos(a) * 10), Math.round(HY - 32 + Math.sin(a) * 34), 2, 2);
        ctx.globalAlpha = 1;
        st.shield -= 0.016;
      }
    }
  };
  function tween(dur, fn) {
    return new Promise(function (res) { st.tweens.push({ t: 0, dur: dur, fn: fn, done: res }); });
  }
  function lunge(who, dist) {
    var k = who === 'hero' ? 'hx' : 'ex';
    return tween(0.28, function (p) { st[k] = Math.round(Math.sin(p * Math.PI) * dist); });
  }

  // ---------------------------------------------------------------- HUD
  function makeHud() {
    var hud = UI.layer('bhud');
    hud.innerHTML =
      '<div class="bh-top">' + U.esc(st.title) + '</div>' +
      '<div class="win bh-enemy"><div class="bh-name"></div><div class="bh-bar"><i></i></div></div>' +
      '<div class="win bh-hero"><div class="bh-name">가람 <small>Lv <span class="lv"></span></small><span class="bh-combo"></span></div>' +
      '<div class="bh-stat">HP <span class="bh-bar hp"><i></i></span><span class="num hpn"></span></div>' +
      '<div class="bh-stat">기력 <span class="bh-bar mp"><i></i></span><span class="num mpn"></span></div></div>' +
      '<div class="win bh-log"><div class="bh-text"></div></div>';
    st.hud = hud;
    updateHud();
  }
  function updateHud() {
    if (!st || !st.hud) return;
    var d = Game.data, h = Game.hero(), q = function (s) { return st.hud.querySelector(s); };
    q('.bh-enemy .bh-name').textContent = st.e.name;
    q('.bh-enemy .bh-bar i').style.width = (st.ehp / st.emax * 100) + '%';
    q('.lv').textContent = d.lv;
    q('.hp i').style.width = (d.hp / h.maxHp * 100) + '%';
    q('.hp').classList.toggle('low', d.hp / h.maxHp < 0.3);
    q('.mp i').style.width = (d.mp / h.maxMp * 100) + '%';
    q('.hpn').textContent = d.hp + '/' + h.maxHp;
    q('.mpn').textContent = d.mp + '/' + h.maxMp;
    q('.bh-combo').textContent = st.combo >= 2 ? '연속 ' + st.combo : '';
  }
  function log(text, ms) {
    if (st && st.hud) st.hud.querySelector('.bh-text').textContent = text;
    return U.sleep(ms !== undefined ? ms : 650 + text.length * 22);
  }

  // ---------------------------------------------------------------- 계산
  function comboMul() { return 1 + 0.2 * Math.min(5, Math.max(0, st.combo - 1)); }
  function heroDamage(mul) {
    var h = Game.hero();
    return Math.max(1, Math.round((h.atk + U.randi(0, 2)) * comboMul() * mul));
  }
  function enemyDamage(mul) {
    var h = Game.hero();
    return Math.max(1, Math.round(st.e.atk * U.rand(0.85, 1.15) * mul - h.def * 0.6));
  }

  async function hitEnemy(dmg, big) {
    await lunge('hero', big ? 60 : 40);
    Sound.play(big ? 'bighit' : 'hit');
    st.eFlash = 0.35;
    Engine.shake(big ? 5 : 3, 0.3);
    var sp = Art.sprite(st.e.sprite);
    Fx.burst(EX, EY - sp.h * SC / 2, big ? '#ffd04a' : '#ffffff', big ? 18 : 10);
    UI.floatText(EX, EY - sp.h * SC - 2, String(dmg), big ? 'dmg big' : 'dmg');
    st.ehp = Math.max(0, st.ehp - dmg);
    updateHud();
    await U.sleep(350);
  }
  async function hurtHero(dmg) {
    var d = Game.data;
    await lunge('enemy', -40);
    Sound.play('hurt');
    st.hFlash = 0.35;
    Engine.shake(4, 0.3);
    Fx.burst(HX, HY - 32, '#ff7a6a', 12);
    UI.floatText(HX, HY - 68, String(dmg), 'dmg hero');
    d.hp -= dmg;
    if (d.hp <= 0) {
      if (st.lastCorrect) { d.hp = 1; updateHud(); await log('가람이 꾹 버텼다! (정답을 맞힌 기세 덕분이다)'); }
      else d.hp = 0;
    }
    updateHud();
    await U.sleep(250);
  }

  function onCorrect() {
    st.combo++; st.lastCorrect = true;
    var d = Game.data;
    d.stats.bestCombo = Math.max(d.stats.bestCombo, st.combo);
    d.mp = Math.min(Game.hero().maxMp, d.mp + 1);
    updateHud();
  }
  function onWrong() { st.combo = 0; st.lastCorrect = false; updateHud(); }

  // ---------------------------------------------------------------- 주인공 차례
  async function playerTurn() {
    var d = Game.data;
    for (;;) {
      await log('무엇을 할까?', 0);
      Game.setState('battle');
      var c = await UI.choose([
        { label: '공격' }, { label: '기술' }, { label: '도구' }, { label: '도망' }
      ], { cls: 'cmd', grid: true, cancel: false, catcher: false, start: st.lastCmd || 0 });
      st.lastCmd = c;
      if (c === 0) {
        var r = await Words.ask(st.cat, { tag: '공격 퀴즈', tagCls: 'attack', combo: st.combo });
        if (r.correct) {
          onCorrect();
          if (st.combo >= 2) UI.banner('연속 정답! <b>×' + st.combo + '</b>', 'combo', 900);
          await log('가람의 붓 공격!', 300);
          var dmg = heroDamage(1);
          await hitEnemy(dmg, st.combo >= 4);
          await log(st.e.name + '에게 ' + dmg + '의 피해!', 500);
        } else {
          onWrong();
          await lunge('hero', 20);
          UI.floatText(EX, EY - 70, '빗나감', 'miss');
          await log('공격이 빗나갔다… 연속 정답이 끊겼다.');
        }
        return 'acted';
      }
      if (c === 1) {
        var skills = DATA.skills.filter(function (s) { return d.lv >= s.lv; });
        if (!skills.length) { UI.toast('레벨 2가 되면 첫 기술을 배울 수 있어요!'); Sound.play('buzz'); continue; }
        var list = DATA.skills.map(function (s) {
          var locked = d.lv < s.lv;
          return { label: locked ? '??? (Lv ' + s.lv + ')' : s.name, right: locked ? '' : '기력 ' + s.mp, disabled: locked || d.mp < s.mp,
            why: locked ? '레벨 ' + s.lv + '에 배워요.' : '기력이 모자라요.', desc: locked ? '레벨 ' + s.lv + '이 되면 배운다.' : s.desc };
        });
        var si = await UI.choose(list, { cls: 'cmd sub', title: '기술 (기력 ' + d.mp + ')', catcher: false });
        if (si < 0) continue;
        var sk = DATA.skills[si];
        d.mp -= sk.mp; updateHud();
        Sound.play('skill');
        await log('가람의 「' + sk.name + '」! 10초 안에 맞혀라!', 700);
        var r2 = await Words.ask(st.cat, { tag: sk.name + ' · 10초', tagCls: 'skill', time: 10, combo: st.combo, prompt: '10초 안에 알맞은 뜻을 고르면 기술 성공!' });
        if (r2.correct) {
          onCorrect();
          if (sk.heal) {
            var h = Game.hero(), amt = Math.round(h.maxHp * sk.heal);
            d.hp = Math.min(h.maxHp, d.hp + amt);
            Sound.play('heal'); Fx.sparkle(HX, HY - 36, '#9affb0', 16);
            UI.floatText(HX, HY - 70, '+' + amt, 'heal');
            updateHud();
            await log('맑은 노랫소리에 HP가 ' + amt + ' 회복되었다!');
          }
          var sdmg = heroDamage(sk.mul);
          Fx.flash('#fff6c0', 0.5);
          await hitEnemy(sdmg, true);
          await log('「' + sk.name + '」 성공! ' + sdmg + '의 큰 피해!', 600);
        } else {
          onWrong();
          await log(r2.timeout ? '시간이 다 되어 기술이 흩어졌다…' : '기술이 실패했다… 연속 정답이 끊겼다.');
        }
        return 'acted';
      }
      if (c === 2) {
        var its = [
          { id: 'herb', label: '약초 (' + d.items.herb + ')', disabled: d.items.herb <= 0, why: '약초가 없어요.', desc: 'HP를 40 회복한다. (차례를 씀)' },
          { id: 'rice', label: '꿀떡 (' + d.items.rice + ')', disabled: d.items.rice <= 0, why: '꿀떡이 없어요.', desc: '기력을 10 회복한다. (차례를 씀)' },
          { id: 'charm', label: '힌트 부적 (' + d.items.charm + ')', disabled: d.items.charm <= 0 || d.hintArmed, why: d.hintArmed ? '이미 부적을 꺼내 두었어요.' : '부적이 없어요.', desc: '다음 문제에서 틀린 보기 2개를 지운다. (차례를 쓰지 않음)' }
        ];
        var ii = await UI.choose(its, { cls: 'cmd sub', title: '도구', catcher: false });
        if (ii < 0) continue;
        var hh = Game.hero();
        if (its[ii].id === 'herb') {
          d.items.herb--;
          var heal = Math.min(DATA.items.herb.heal, hh.maxHp - d.hp);
          d.hp += heal;
          Sound.play('heal'); Fx.sparkle(HX, HY - 36, '#9affb0', 14); UI.floatText(HX, HY - 70, '+' + heal, 'heal');
          updateHud();
          await log('약초를 먹었다. HP가 ' + heal + ' 회복되었다!');
          return 'acted';
        }
        if (its[ii].id === 'rice') {
          d.items.rice--;
          var mp = Math.min(DATA.items.rice.mp, hh.maxMp - d.mp);
          d.mp += mp;
          Sound.play('heal'); Fx.sparkle(HX, HY - 36, '#9ad8ff', 14); UI.floatText(HX, HY - 70, '+' + mp, 'mp');
          updateHud();
          await log('꿀떡을 먹었다. 기력이 ' + mp + ' 회복되었다!');
          return 'acted';
        }
        d.items.charm--; d.hintArmed = true; d.stats.charmsUsed++;
        Sound.play('heal'); Fx.sparkle(HX, HY - 50, '#f4e070', 14);
        await log('힌트 부적을 꺼냈다! 다음 문제에서 틀린 보기 2개가 사라진다.');
        continue;
      }
      if (c === 3) {
        if (st.noFlee) { Sound.play('buzz'); await log(st.e.rival ? '대회에서는 도망칠 수 없다! 끝까지 겨루자!' : '지킴이에게서는 도망칠 수 없다!'); continue; }
        if (Math.random() < 0.65) {
          Sound.play('flee');
          await tween(0.4, function (p) { st.hx = -Math.round(p * 120); });
          await log('가람은 재빨리 도망쳤다!');
          return 'fled';
        }
        await log('도망치려 했지만 막혀 버렸다!');
        return 'acted';
      }
    }
  }

  // ---------------------------------------------------------------- 적 차례
  async function enemyTurn() {
    var e = st.e;
    st.turn++;
    if (st.charged) {
      st.charged = false;
      await log(e.name + '의 「' + e.strong + '」!', 700);
      Sound.play('charge');
      await log('방어 퀴즈! 맞히면 공격을 막을 수 있어요!', 600);
      var r = await Words.ask(st.cat, { tag: '방어 퀴즈', tagCls: 'defend', combo: st.combo, prompt: '맞히면 「' + e.strong + '」을 막아 내요! 이 낱말의 뜻은?' });
      if (r.correct) {
        onCorrect();
        st.shield = 1.2;
        await lunge('enemy', -30);
        Sound.play('block');
        Fx.burst(HX + 36, HY - 32, '#9ad8ff', 16);
        UI.floatText(HX, HY - 70, '막아 냄!', 'block');
        await log('가람이 낱말 방패로 공격을 막아 냈다!');
      } else {
        onWrong();
        var dmg = enemyDamage(e.strongMul);
        await hurtHero(dmg);
        await log('으악! ' + dmg + '의 큰 피해를 입었다!');
      }
      return;
    }
    if (e.boss && st.turn % 3 === 2) {
      st.charged = true;
      Sound.play('charge');
      await log(U.josa(e.name, '이/가') + ' ' + e.charge, 900);
      await log('(다음 차례에 강한 공격이 온다! 방어 퀴즈를 준비하자.)', 1000);
      return;
    }
    var roll = Math.random();
    if (roll < 0.08) {
      await lunge('enemy', -30);
      UI.floatText(HX, HY - 70, '피함', 'miss');
      await log(U.josa(e.name, '이/가') + ' 헛발질을 했다! 가람은 가볍게 피했다.');
      return;
    }
    var special = !e.boss && roll > 0.85;
    var move = special ? e.special : U.pick(e.moves);
    var dmg2 = enemyDamage(special ? 1.4 : 1);
    await log(e.name + '의 「' + move + '」!', 500);
    await hurtHero(dmg2);
    await log('가람은 ' + dmg2 + '의 피해를 입었다.', 500);
  }

  // ---------------------------------------------------------------- 전투 진행
  // opts: {enemy, cat, bg, title, noFlee, music}
  async function run(opts) {
    var e = DATA.enemies[opts.enemy];
    var d = Game.data;
    st = {
      e: e, ehp: e.hp, emax: e.hp, cat: opts.cat, bg: opts.bg, title: opts.title || '',
      noFlee: !!(opts.noFlee || e.boss), combo: 0, lastCorrect: false, charged: false, turn: 0,
      hx: -120, hy: 0, ex: 120, ey: 0, hFlash: 0, eFlash: 0, eAlpha: 1, hAlpha: 1, shield: 0, tweens: [], hud: null, lastCmd: 0
    };
    Engine.setScene(scene);
    Game.setState('battle');
    Sound.music(e.boss ? 'boss' : 'battle');
    makeHud();
    await tween(0.45, function (p) { st.hx = Math.round(-120 * (1 - p)); st.ex = Math.round(120 * (1 - p)); });
    await log(U.josa(e.name, '이/가') + ' 나타났다!', 500);
    await UI.say({ who: e.name, text: e.intro, face: e.sprite });

    var result = null;
    while (!result) {
      var a = await playerTurn();
      if (a === 'fled') { result = 'flee'; break; }
      if (st.ehp <= 0) { result = 'win'; break; }
      await enemyTurn();
      if (d.hp <= 0) { result = 'lose'; break; }
    }

    if (result === 'win') {
      Sound.music(null);
      Sound.play('victory');
      await tween(0.6, function (p) { st.eAlpha = 1 - p; st.ey = Math.round(p * 6); });
      Fx.sparkle(EX, EY - 40, '#ffffff', 22);
      d.stats.wins++;
      d.gold += e.gold;
      await log(U.josa(e.name, '을/를') + ' 물리쳤다!', 400);
      await UI.banner('승리!', 'win', 1000);
      await UI.say('승리! 경험치 ' + e.exp + ', ' + e.gold + '냥을 얻었다.');
      await Game.gainExp(e.exp);
    } else if (result === 'lose') {
      Sound.music(null);
      Sound.play('lose');
      d.stats.defeats++;
      await tween(0.6, function (p) { st.hAlpha = 1 - p * 0.7; st.hy = Math.round(p * 4); });
      await log('가람은 눈앞이 캄캄해졌다…', 1200);
    }
    st.hud.remove();
    st.hud = null;
    Game.save();
    return result;
  }

  return { run: run, state: function () { return st; } };
})();
