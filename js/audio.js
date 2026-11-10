// 우리말 수련기 - 소리: WebAudio로 직접 만든 효과음과 칩튠 음악 (외부 파일 없음)
'use strict';

var Sound = (function () {
  var ac = null, master = null, musicBus = null, sfxBus = null;
  var muted = Store.getPref('muted', false);
  var current = null;      // 재생 중인 곡 이름
  var wanted = null;       // 오디오가 열리기 전에 요청된 곡
  var seq = null;          // 시퀀서 상태
  var timer = null;
  var noiseBuf = null;

  var NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
  function freq(n) {
    var m = /^([A-G]#?)(\d)$/.exec(n);
    if (!m) return 0;
    var midi = (parseInt(m[2], 10) + 1) * 12 + NOTE[m[1]];
    return 440 * Math.pow(2, (midi - 69) / 12);
  }
  // "C5:2 D5:1 R:1" -> [{f, len}] (len은 8분음표 단위)
  function parse(str) {
    return str.trim().split(/\s+/).filter(function (t) { return t !== '|'; }).map(function (t) {
      var p = t.split(':');
      return { f: p[0] === 'R' ? 0 : freq(p[0]), len: parseFloat(p[1] || '1') };
    });
  }
  function bassLine(roots, pattern) {
    // roots: 마디별 근음, pattern: 한 마디(8칸) 안의 옥타브 패턴
    var out = [];
    roots.forEach(function (r) {
      var oct = parseInt(r.slice(-1), 10), name = r.slice(0, -1);
      pattern.forEach(function (p) { out.push(p === 'R' ? 'R:1' : name + (oct + p) + ':1'); });
    });
    return out.join(' ');
  }

  // 직접 작곡한 단순한 5음계 선율들
  var TRACKS = {
    title: {
      bpm: 88, wave: 'triangle', lead: parse(
        'G4:2 A4:2 C5:3 D5:1 | E5:4 D5:2 C5:2 | A4:2 C5:2 D5:2 E5:2 | D5:6 R:2 |' +
        'E5:2 G5:2 E5:2 D5:2 | C5:3 D5:1 A4:4 | G4:2 A4:2 C5:2 D5:2 | C5:6 R:2'),
      bass: parse(bassLine(['C3', 'A2', 'F2', 'G2', 'C3', 'A2', 'F2', 'C3'], [0, 'R', 1, 'R', 0, 'R', 1, 'R'])),
      drums: false
    },
    town: {
      bpm: 112, wave: 'square', lead: parse(
        'E5:2 G5:2 A5:3 G5:1 | E5:2 D5:2 C5:4 | D5:2 E5:2 G5:2 E5:2 | D5:6 R:2 |' +
        'E5:2 G5:2 A5:2 C6:2 | A5:2 G5:2 E5:4 | D5:2 E5:2 D5:2 C5:2 | C5:6 R:2 |' +
        'A4:2 C5:2 D5:2 C5:2 | A4:2 G4:2 A4:4 | C5:2 D5:2 E5:2 G5:2 | E5:6 R:2 |' +
        'G5:2 E5:2 D5:2 E5:2 | C5:2 D5:2 A4:4 | G4:2 A4:2 C5:2 D5:2 | C5:6 R:2'),
      bass: parse(bassLine(['C3', 'A2', 'F2', 'G2', 'C3', 'A2', 'F2', 'C3', 'A2', 'F2', 'C3', 'G2', 'C3', 'A2', 'G2', 'C3'], [0, 'R', 1, 'R', 0, 'R', 1, 0])),
      drums: 'soft'
    },
    battle: {
      bpm: 152, wave: 'square', lead: parse(
        'A4:1 C5:1 E5:1 A5:1 G5:2 E5:2 | D5:1 E5:1 G5:2 E5:2 C5:2 | A4:1 C5:1 D5:1 E5:1 G5:2 A5:2 | G5:1 E5:1 D5:1 C5:1 D5:4 |' +
        'A4:1 C5:1 E5:1 A5:1 C6:2 A5:2 | G5:1 A5:1 G5:1 E5:1 D5:2 E5:2 | C5:1 D5:1 E5:1 G5:1 E5:2 D5:2 | C5:2 B4:2 A4:4'),
      bass: parse(bassLine(['A2', 'F2', 'C3', 'G2', 'A2', 'F2', 'G2', 'E2'], [0, 1, 0, 1, 0, 1, 0, 1])),
      drums: 'beat'
    },
    boss: {
      bpm: 168, wave: 'sawtooth', lead: parse(
        'D5:1 F5:1 A5:2 G5:1 F5:1 D5:2 | C5:1 D5:1 F5:2 D5:4 | D5:1 F5:1 A5:1 C6:1 A5:2 G5:2 | F5:1 G5:1 F5:1 D5:1 E5:4 |' +
        'A5:2 G5:2 F5:2 D5:2 | C5:1 D5:1 F5:1 G5:1 A5:4 | D6:2 C6:2 A5:2 G5:2 | F5:2 E5:2 D5:4'),
      bass: parse(bassLine(['D2', 'A#1', 'F2', 'C2', 'D2', 'A#1', 'C2', 'A1'], [0, 0, 1, 0, 0, 1, 0, 1])),
      drums: 'beat'
    },
    ending: {
      bpm: 100, wave: 'triangle', lead: parse(
        'C5:2 E5:2 G5:2 A5:2 | G5:4 E5:4 | F5:2 A5:2 G5:2 E5:2 | D5:6 R:2 |' +
        'E5:2 G5:2 A5:2 C6:2 | D6:4 C6:2 A5:2 | G5:2 E5:2 D5:2 E5:2 | C5:6 R:2'),
      bass: parse(bassLine(['C3', 'E2', 'F2', 'G2', 'A2', 'F2', 'G2', 'C3'], [0, 'R', 1, 'R', 0, 1, 0, 'R'])),
      drums: 'soft'
    }
  };

  function ensure() {
    if (ac) return true;
    try {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return false;
      ac = new Ctx();
      master = ac.createGain(); master.gain.value = muted ? 0 : 0.8; master.connect(ac.destination);
      musicBus = ac.createGain(); musicBus.gain.value = 0.32; musicBus.connect(master);
      sfxBus = ac.createGain(); sfxBus.gain.value = 0.6; sfxBus.connect(master);
      noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.5, ac.sampleRate);
      var d = noiseBuf.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      return true;
    } catch (e) { ac = null; return false; }
  }

  function tone(f, t, dur, type, vol, bus, slideTo) {
    if (!ac || !f) return;
    var o = ac.createOscillator(), g = ac.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(f, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.setValueAtTime(vol, t + Math.max(0.01, dur * 0.6));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(bus || sfxBus);
    o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(t, dur, vol, bus, hp) {
    if (!ac) return;
    var s = ac.createBufferSource(); s.buffer = noiseBuf;
    var f = ac.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp || 1000;
    var g = ac.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(bus || sfxBus);
    s.start(t); s.stop(t + dur + 0.02);
  }

  var SFX = {
    move: function (t) { tone(660, t, 0.04, 'square', 0.08); },
    select: function (t) { tone(880, t, 0.06, 'square', 0.12); tone(1320, t + 0.05, 0.08, 'square', 0.1); },
    cancel: function (t) { tone(520, t, 0.06, 'square', 0.1); tone(390, t + 0.05, 0.08, 'square', 0.08); },
    buzz: function (t) { tone(140, t, 0.18, 'sawtooth', 0.12); },
    talk: function (t) { tone(U.pick([700, 760, 820]), t, 0.03, 'triangle', 0.06); },
    correct: function (t) {
      [1047, 1319, 1568, 2093].forEach(function (f, i) { tone(f, t + i * 0.07, 0.14, 'square', 0.11); });
    },
    wrong: function (t) { tone(330, t, 0.18, 'sawtooth', 0.12, null, 220); tone(220, t + 0.16, 0.3, 'sawtooth', 0.12, null, 130); },
    hit: function (t) { noise(t, 0.16, 0.35, null, 800); tone(180, t, 0.12, 'square', 0.18, null, 60); },
    bighit: function (t) { noise(t, 0.35, 0.45, null, 300); tone(140, t, 0.3, 'sawtooth', 0.2, null, 40); },
    hurt: function (t) { noise(t, 0.12, 0.25, null, 2000); tone(300, t, 0.15, 'square', 0.14, null, 120); },
    block: function (t) { tone(1800, t, 0.12, 'triangle', 0.15); tone(2400, t + 0.03, 0.2, 'triangle', 0.1); noise(t, 0.08, 0.15, null, 4000); },
    heal: function (t) { tone(523, t, 0.4, 'sine', 0.15, null, 1046); tone(784, t + 0.1, 0.4, 'sine', 0.1, null, 1568); },
    skill: function (t) { tone(400, t, 0.3, 'square', 0.12, null, 1600); noise(t + 0.15, 0.3, 0.2, null, 3000); },
    charge: function (t) { tone(110, t, 0.6, 'sawtooth', 0.12, null, 330); },
    coin: function (t) { tone(988, t, 0.06, 'square', 0.1); tone(1319, t + 0.06, 0.16, 'square', 0.1); },
    door: function (t) { tone(300, t, 0.08, 'triangle', 0.15); tone(200, t + 0.06, 0.1, 'triangle', 0.12); },
    flee: function (t) { [800, 600, 400, 300].forEach(function (f, i) { tone(f, t + i * 0.05, 0.06, 'square', 0.08); }); },
    levelup: function (t) {
      [523, 659, 784, 1047, 784, 1047, 1319].forEach(function (f, i) { tone(f, t + i * 0.08, 0.16, 'square', 0.12); });
    },
    victory: function (t) {
      var n = [[784, 0], [784, 0.12], [784, 0.24], [1047, 0.4], [988, 0.7], [1047, 0.85], [1319, 1.0]];
      n.forEach(function (x) { tone(x[0], t + x[1], 0.2, 'square', 0.12); tone(x[0] / 2, t + x[1], 0.2, 'triangle', 0.1); });
    },
    lose: function (t) { [523, 466, 415, 349].forEach(function (f, i) { tone(f, t + i * 0.25, 0.3, 'triangle', 0.13); }); }
  };

  function play(name) {
    if (!ensure() || muted) return;
    var fn = SFX[name];
    if (fn) { try { fn(ac.currentTime + 0.01); } catch (e) { /* 무시 */ } }
  }

  // ------------------------------------------------------------- 음악
  function startSeq(name) {
    stopSeq();
    var tr = TRACKS[name];
    if (!tr || !ac) return;
    var step = 60 / tr.bpm / 2; // 8분음표 길이(초)
    seq = { tr: tr, step: step, li: 0, bi: 0, lt: ac.currentTime + 0.1, bt: ac.currentTime + 0.1, dt: ac.currentTime + 0.1, beat: 0 };
    timer = setInterval(schedule, 40);
    schedule();
  }
  function stopSeq() {
    if (timer) clearInterval(timer);
    timer = null; seq = null;
  }
  function schedule() {
    if (!seq || !ac) return;
    var ahead = ac.currentTime + 0.25, tr = seq.tr, n;
    while (seq.lt < ahead) {
      n = tr.lead[seq.li];
      if (n.f) tone(n.f, seq.lt, n.len * seq.step * 0.92, tr.wave, tr.wave === 'sawtooth' ? 0.05 : 0.08, musicBus);
      seq.lt += n.len * seq.step;
      seq.li = (seq.li + 1) % tr.lead.length;
    }
    while (seq.bt < ahead) {
      n = tr.bass[seq.bi];
      if (n.f) tone(n.f, seq.bt, n.len * seq.step * 0.8, 'triangle', 0.16, musicBus);
      seq.bt += n.len * seq.step;
      seq.bi = (seq.bi + 1) % tr.bass.length;
    }
    if (tr.drums) {
      while (seq.dt < ahead) {
        var b = seq.beat % 8;
        if (tr.drums === 'beat') {
          if (b === 0 || b === 4) tone(120, seq.dt, 0.1, 'sine', 0.35, musicBus, 45);
          if (b === 2 || b === 6) noise(seq.dt, 0.08, 0.12, musicBus, 1500);
          noise(seq.dt, 0.03, 0.04, musicBus, 7000);
        } else {
          if (b === 0) tone(110, seq.dt, 0.08, 'sine', 0.2, musicBus, 50);
          if (b === 4) noise(seq.dt, 0.04, 0.05, musicBus, 5000);
        }
        seq.dt += seq.step;
        seq.beat++;
      }
    }
  }

  function music(name) {
    wanted = name;
    if (!ac || ac.state !== 'running') return; // 첫 입력 뒤에 시작
    if (current === name && seq) return;
    current = name;
    if (muted || !name) { stopSeq(); return; }
    startSeq(name);
  }

  function unlock() {
    if (!ensure()) return;
    if (ac.state === 'suspended') {
      ac.resume().then(function () { if (wanted && !seq) { current = null; music(wanted); } });
    } else if (wanted && !seq && !muted) { current = null; music(wanted); }
  }

  function toggleMute() {
    muted = !muted;
    Store.setPref('muted', muted);
    if (ac) master.gain.value = muted ? 0 : 0.8;
    if (muted) { stopSeq(); current = null; } else { unlock(); if (wanted) { current = null; music(wanted); } }
    var b = document.getElementById('muteBtn');
    if (b) { b.textContent = muted ? '소리 끔' : '소리 켬'; b.classList.toggle('off', muted); }
  }

  return {
    play: play, music: music, unlock: unlock, toggleMute: toggleMute,
    isMuted: function () { return muted; },
    current: function () { return wanted; }
  };
})();
