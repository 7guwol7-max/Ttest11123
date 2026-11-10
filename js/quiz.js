// 우리말 수련기 - 낱말 기록과 문제 고르기
'use strict';

var Words = {
  lastId: null,
  byId: function (id) {
    for (var i = 0; i < QUIZ_DATA.length; i++) if (QUIZ_DATA[i].id === id) return QUIZ_DATA[i];
    return null;
  },
  stat: function (id) {
    var w = Game.data.words;
    if (!w[id]) w[id] = { seen: 0, correct: 0, wrong: 0, streak: 0, best: 0 };
    return w[id];
  },
  // 숙련도 별: 연속으로 맞힌 횟수(최대 3)
  stars: function (id) {
    if (!Game.data) return 0;
    var s = Game.data.words[id];
    return s ? Math.min(3, s.streak) : 0;
  },
  meaning: function (item) { return item.choices[item.answer]; },
  list: function (cat) {
    return QUIZ_DATA.filter(function (q) { return !cat || cat === 'all' || q.cat === cat; });
  },
  record: function (item, ok) {
    var s = this.stat(item.id), st = Game.data.stats;
    s.seen++;
    st.answered++;
    if (ok) {
      s.correct++; s.streak++; s.best = Math.max(s.best, s.streak);
      st.correct++;
    } else {
      s.wrong++; s.streak = 0;
    }
  },
  // 틀린 낱말·덜 본 낱말이 더 자주 나오도록 가중치를 두고, 같은 낱말이 연속으로 나오지 않게 한다
  pick: function (cat) {
    var self = this;
    var pool = this.list(cat);
    if (pool.length > 1) pool = pool.filter(function (q) { return q.id !== self.lastId; });
    var weights = pool.map(function (q) {
      var s = Game.data.words[q.id] || { seen: 0, correct: 0, wrong: 0, streak: 0 };
      var w = 1;
      if (s.seen === 0) w += 2.5;
      w += Math.max(0, s.wrong - s.correct * 0.5) * 1.5;
      if (s.streak === 0 && s.wrong > 0) w += 2;
      w += Math.max(0, 3 - s.streak) * 0.4;
      w /= (1 + s.seen * 0.15);
      return Math.max(0.15, w);
    });
    var total = weights.reduce(function (a, b) { return a + b; }, 0);
    var r = Math.random() * total;
    for (var i = 0; i < pool.length; i++) { r -= weights[i]; if (r <= 0) { this.lastId = pool[i].id; return pool[i]; } }
    this.lastId = pool[pool.length - 1].id;
    return pool[pool.length - 1];
  },
  // 퀴즈 하나를 내고 결과를 기록한다
  ask: function (cat, opts) {
    var item = this.pick(cat);
    opts = opts || {};
    var d = Game.data;
    var o = {
      tag: opts.tag, tagCls: opts.tagCls, prompt: opts.prompt, time: opts.time, combo: opts.combo, practice: opts.practice,
      hint: !!d.hintArmed,
      charms: function () { return d.items.charm; },
      useCharm: function () {
        if (d.items.charm <= 0) return false;
        d.items.charm--; d.stats.charmsUsed++; Game.save();
        return true;
      }
    };
    d.hintArmed = false;
    return UI.quiz(item, o).then(function (r) {
      Words.record(item, r.correct);
      Game.save();
      return r;
    });
  },
  totalStars: function () {
    var self = this, n = 0;
    QUIZ_DATA.forEach(function (q) { n += self.stars(q.id); });
    return n;
  },
  mastered: function () {
    var self = this;
    return QUIZ_DATA.filter(function (q) { return self.stars(q.id) >= 3; }).length;
  }
};
