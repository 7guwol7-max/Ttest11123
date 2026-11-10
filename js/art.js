// 우리말 수련기 - 그림: 코드로 직접 그린 픽셀 아트 (외부 이미지 없음)
'use strict';

var Art = (function () {
  var OL = '#140f1c';

  // --------------------------------------------------------------- 픽셀 격자
  function G(w, h) { this.w = w; this.h = h; this.d = new Array(w * h); }
  G.prototype.p = function (x, y, c) {
    x = Math.floor(x); y = Math.floor(y);
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.d[y * this.w + x] = c;
  };
  G.prototype.get = function (x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return undefined;
    return this.d[y * this.w + x];
  };
  G.prototype.rect = function (x, y, w, h, c) {
    for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) this.p(x + i, y + j, c);
    return this;
  };
  // 타원 (hi: 왼쪽 위 밝은 색, lo: 오른쪽 아래 어두운 색)
  G.prototype.ell = function (cx, cy, rx, ry, c, hi, lo) {
    for (var y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++) {
      for (var x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
        var dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) {
          var col = c;
          if (hi && dx * 0.7 + dy < -0.62) col = hi;
          else if (lo && dx * 0.5 + dy > 0.58) col = lo;
          this.p(x, y, col);
        }
      }
    }
    return this;
  };
  G.prototype.line = function (x0, y0, x1, y1, c) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    var dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, err = dx + dy;
    for (;;) {
      this.p(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      var e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
    return this;
  };
  G.prototype.poly = function (pts, c) {
    var minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
    pts.forEach(function (p) { minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]); minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); });
    for (var y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
      for (var x = Math.floor(minX); x <= Math.ceil(maxX); x++) {
        var px = x + 0.5, py = y + 0.5, inside = false;
        for (var i = 0, j = pts.length - 1; i < pts.length; j = i++) {
          var xi = pts[i][0], yi = pts[i][1], xj = pts[j][0], yj = pts[j][1];
          if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) inside = !inside;
        }
        if (inside) this.p(x, y, c);
      }
    }
    return this;
  };
  // 문자열 그림 찍기
  G.prototype.pat = function (x, y, rows, pal) {
    for (var j = 0; j < rows.length; j++) for (var i = 0; i < rows[j].length; i++) {
      var ch = rows[j][i];
      if (pal[ch]) this.p(x + i, y + j, pal[ch]);
    }
    return this;
  };
  G.prototype.outline = function (c) {
    var src = this.d.slice(), w = this.w, h = this.h;
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
      if (src[y * w + x]) continue;
      var n = (x > 0 && src[y * w + x - 1]) || (x < w - 1 && src[y * w + x + 1]) ||
              (y > 0 && src[(y - 1) * w + x]) || (y < h - 1 && src[(y + 1) * w + x]);
      if (n) this.d[y * w + x] = c || OL;
    }
    return this;
  };
  G.prototype.flipX = function () {
    var w = this.w, h = this.h, s = this.d.slice();
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) this.d[y * w + x] = s[y * w + (w - 1 - x)];
    return this;
  };

  var rgbCache = {};
  function rgb(hex) {
    if (rgbCache[hex]) return rgbCache[hex];
    var v = hex.replace('#', '');
    if (v.length === 3) v = v[0] + v[0] + v[1] + v[1] + v[2] + v[2];
    var r = [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
    rgbCache[hex] = r;
    return r;
  }
  function toCanvas(g, white) {
    var c = document.createElement('canvas');
    c.width = g.w; c.height = g.h;
    var x = c.getContext('2d'), img = x.createImageData(g.w, g.h);
    for (var i = 0; i < g.d.length; i++) {
      var col = g.d[i];
      if (!col) continue;
      var v = white ? [255, 255, 255] : rgb(col);
      img.data[i * 4] = v[0]; img.data[i * 4 + 1] = v[1]; img.data[i * 4 + 2] = v[2]; img.data[i * 4 + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    return c;
  }

  // 결정적 난수(배경을 매번 같게)
  function rng(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  // ===================================================================
  // 캐릭터 스프라이트 (전투용: 주인공은 오른쪽, 적은 왼쪽을 본다)
  var BLK = '#262a40', BLK_H = '#414a70', BLK_L = '#171a28', WHT = '#f6f2e6', WHT_L = '#d2ccbd', BLUE = '#4a86c8';

  var S = {};

  S.hero = function () {
    var g = new G(32, 32);
    // 꼬리
    g.poly([[1, 26], [10, 18], [14, 21], [4, 29]], '#243150');
    g.line(3, 27, 11, 20, BLUE);
    g.line(2, 27, 3, 28, '#6aa6e0');
    // 다리
    g.rect(14, 25, 1, 4, '#3a3a48').rect(19, 25, 1, 4, '#3a3a48').rect(12, 29, 4, 1, '#3a3a48').rect(18, 29, 4, 1, '#3a3a48');
    // 몸
    g.ell(16, 19, 8, 6.5, BLK, BLK_H, BLK_L);
    g.ell(19, 21, 5, 4, WHT, null, WHT_L);
    // 날개
    g.ell(12.5, 18, 6, 3.6, '#1f2540', '#36416c');
    g.rect(9, 16, 5, 2, WHT);
    g.line(7, 20, 13, 20, BLUE).line(8, 21, 12, 21, '#2e5f99');
    // 머리
    g.ell(22, 11, 6, 5.6, BLK, BLK_H, BLK_L);
    g.rect(23, 9, 2, 2, '#ffffff'); g.p(24, 10, '#111');
    g.p(25, 12, '#e89aa0');
    // 부리
    g.poly([[27, 10], [31.5, 11.8], [27, 13]], '#5a5566'); g.p(28, 11, '#9a94a6');
    // 빨간 목도리
    g.rect(17, 15, 9, 2, '#d8433a'); g.rect(17, 16, 9, 1, '#a82e2a');
    g.poly([[18, 15], [11, 12], [12, 15.5], [18, 17]], '#d8433a');
    g.p(12, 13, '#f07a6a');
    // 붓
    g.line(20, 23, 27, 16, '#9a6a35'); g.p(26, 17, '#e8e0c8'); g.rect(27, 14, 2, 2, '#1a1a1a'); g.p(29, 13, '#1a1a1a');
    return g.outline();
  };

  // 마을용 작은 주인공 (dir: down/up/side, f: 걷기 프레임)
  S.heroTown = function (dir, f) {
    var g = new G(16, 16);
    var foot = f ? 1 : 0;
    if (dir === 'side') {
      g.poly([[0, 13], [4, 10], [6, 12], [1, 15]], '#243150'); g.p(1, 13, BLUE);
      g.ell(7, 10, 5, 4, BLK, BLK_H, BLK_L);
      g.ell(9, 11.5, 2.8, 2.4, WHT);
      g.rect(4, 9, 4, 1, WHT);
      g.ell(10.5, 5.5, 3.8, 3.5, BLK, BLK_H);
      g.p(11, 4, '#fff'); g.p(12, 4, '#fff'); g.p(12, 5, '#111');
      g.rect(14, 5, 2, 1, '#6a6476'); g.p(14, 6, '#5a5566');
      g.rect(7, 8, 5, 1, '#d8433a');
      g.p(6 + foot, 14, '#3a3a48'); g.p(9 - foot, 14, '#3a3a48'); g.p(6 + foot, 15, '#3a3a48'); g.p(9 - foot, 15, '#3a3a48');
    } else if (dir === 'up') {
      g.rect(7, 12, 2, 4, '#243150'); g.p(7, 15, BLUE);
      g.ell(8, 10, 5, 4.2, BLK, BLK_H, BLK_L);
      g.rect(3, 10, 2, 2, WHT); g.rect(11, 10, 2, 2, WHT);
      g.ell(8, 5, 4, 3.6, BLK, BLK_H);
      g.rect(5, 8, 6, 1, '#d8433a'); g.p(10, 9, '#d8433a');
      g.p(5, 14 + foot, '#3a3a48'); g.p(10, 15 - foot, '#3a3a48');
    } else {
      g.ell(8, 10, 5, 4.2, BLK, BLK_H, BLK_L);
      g.ell(8, 11, 3, 3, WHT, null, WHT_L);
      g.rect(3, 9, 1, 2, WHT); g.rect(12, 9, 1, 2, WHT);
      g.ell(8, 5, 4, 3.6, BLK, BLK_H);
      g.p(6, 4, '#fff'); g.p(10, 4, '#fff'); g.p(6, 5, '#111'); g.p(10, 5, '#111');
      g.rect(7, 6, 2, 2, '#6a6476');
      g.rect(5, 8, 6, 1, '#d8433a');
      g.p(6, 14 + foot, '#3a3a48'); g.p(6, 15, '#3a3a48'); g.p(9, 15 - foot, '#3a3a48'); g.p(9, 15, '#3a3a48');
    }
    return g.outline();
  };

  // --- 마을 사람들 (16x16)
  S.otter = function () { // 훈장 수달 '물결 선생'
    var g = new G(16, 18);
    g.rect(12, 12, 3, 2, '#7a4e2a'); g.p(14, 11, '#7a4e2a');
    g.ell(8, 12.5, 5, 4.5, '#8a5a32', '#a87444', '#6a4224');
    g.ell(8, 13.5, 3, 3, '#e6cfa4');
    g.rect(4, 11, 3, 2, '#3c6e9e'); // 책
    g.ell(8, 7, 4.2, 3.8, '#8a5a32', '#a87444');
    g.ell(8, 8.2, 2.8, 2, '#e6cfa4');
    g.p(6, 6, '#111'); g.p(10, 6, '#111'); g.p(8, 8, '#2a1a10');
    g.p(4, 8, '#ccc'); g.p(12, 8, '#ccc');
    g.rect(2, 3, 12, 1, '#1d1a22'); g.rect(5, 0, 6, 3, '#2a2630'); g.rect(6, 1, 4, 1, '#3e3a48'); // 갓
    g.p(5, 4, '#1d1a22'); g.p(11, 4, '#1d1a22');
    g.p(6, 17, '#5a3a20'); g.p(10, 17, '#5a3a20');
    return g.outline();
  };
  S.bear = function () { // 여관 곰 아주머니
    var g = new G(16, 18);
    g.ell(8, 12, 6, 5.5, '#9a6a40', '#b4824f', '#7a5030');
    g.ell(8, 13, 4, 4, '#f0ead8');
    g.rect(5, 11, 6, 1, '#d06a6a');
    g.ell(3.5, 3.5, 1.8, 1.8, '#9a6a40'); g.ell(12.5, 3.5, 1.8, 1.8, '#9a6a40');
    g.ell(8, 6.5, 5, 4.2, '#9a6a40', '#b4824f');
    g.ell(8, 8, 2.4, 1.6, '#e2c49a');
    g.p(6, 6, '#111'); g.p(10, 6, '#111'); g.p(8, 7, '#3a2216');
    g.rect(4, 2, 8, 2, '#d8433a'); g.p(12, 3, '#d8433a'); g.p(13, 4, '#d8433a');
    g.p(5, 17, '#5a3a20'); g.p(10, 17, '#5a3a20');
    return g.outline();
  };
  S.rabbit = function () { // 상점 토끼
    var g = new G(16, 18);
    g.ell(6, 3, 1.4, 3.4, '#f4f0f0'); g.ell(10, 3, 1.4, 3.4, '#f4f0f0');
    g.p(6, 3, '#f0a0b0'); g.p(10, 3, '#f0a0b0'); g.p(6, 2, '#f0a0b0'); g.p(10, 2, '#f0a0b0');
    g.ell(8, 12.5, 4.6, 4.6, '#f4f0f0', null, '#d8d0d6');
    g.rect(4, 10, 8, 4, '#3f8a5a'); g.rect(7, 10, 2, 4, '#f4f0f0');
    g.ell(8, 8, 4, 3.4, '#f4f0f0', null, '#d8d0d6');
    g.p(6, 7, '#111'); g.p(10, 7, '#111'); g.p(8, 9, '#f08090');
    g.p(5, 9, '#f8c0c8'); g.p(11, 9, '#f8c0c8');
    g.p(6, 17, '#c8c0c6'); g.p(10, 17, '#c8c0c6');
    return g.outline();
  };
  S.cat = function () { // 고양이 '나비'
    var g = new G(16, 16);
    g.line(12, 13, 15, 8, '#e09040'); g.p(15, 7, '#e09040');
    g.ell(8, 11.5, 4.5, 4, '#e8a050', '#f4c070', '#c07830');
    g.ell(8, 12.5, 2.4, 2.4, '#fbeedd');
    g.poly([[3.5, 6], [4.5, 1], [7, 4]], '#e8a050'); g.poly([[12.5, 6], [11.5, 1], [9, 4]], '#e8a050');
    g.ell(8, 6, 4.5, 3.6, '#e8a050', '#f4c070');
    g.rect(6, 3, 1, 2, '#c07830'); g.rect(9, 3, 1, 2, '#c07830');
    g.p(6, 6, '#2a6a3a'); g.p(10, 6, '#2a6a3a'); g.p(8, 7, '#f08090');
    return g.outline();
  };
  S.duck = function () { // 오리 할아버지
    var g = new G(16, 18);
    g.line(13, 6, 13, 17, '#8a5a2b'); g.p(12, 6, '#8a5a2b');
    g.ell(7.5, 12, 5, 4.5, '#f4f4ec', null, '#d6d6cc');
    g.ell(7, 6, 3.8, 3.6, '#f4f4ec');
    g.rect(1, 6, 3, 2, '#f0a030'); g.p(2, 8, '#d08020');
    g.p(6, 5, '#111');
    g.rect(5, 2, 4, 1, '#888'); g.p(4, 3, '#888');
    g.rect(5, 16, 2, 1, '#f0a030'); g.rect(9, 16, 2, 1, '#f0a030');
    g.rect(4, 11, 7, 1, '#6a7ab0');
    return g.outline();
  };

  // --- 적: 고유어 숲
  S.acorn = function () { // 도토리 도깨비
    var g = new G(32, 32);
    g.line(4, 12, 8, 26, '#7a5a30'); g.ell(4, 11, 2, 2, '#9a7440');
    g.ell(16, 20, 9, 9, '#b8783a', '#d8995a', '#8a5426');
    g.ell(16, 11, 10.5, 5, '#6a4a28', '#8a6438', '#4a321a');
    for (var i = 7; i < 26; i += 3) g.p(i, 10, '#4a321a'), g.p(i + 1, 12, '#8a6438');
    g.rect(15, 3, 2, 4, '#5a3a1a');
    g.poly([[10, 8], [12, 2], [13, 8]], '#f0e2b0'); // 뿔
    g.rect(10, 17, 4, 3, '#fff'); g.rect(18, 17, 4, 3, '#fff');
    g.rect(10, 18, 2, 2, '#111'); g.rect(18, 18, 2, 2, '#111');
    g.line(10, 16, 13, 17, '#4a2a10'); g.line(22, 16, 19, 17, '#4a2a10');
    g.rect(12, 23, 8, 2, '#5a2a10'); g.p(13, 23, '#fff'); g.p(18, 23, '#fff');
    g.rect(11, 28, 3, 3, '#6a4a28'); g.rect(19, 28, 3, 3, '#6a4a28');
    return g.outline();
  };
  S.mushroom = function () { // 버섯 꼬마
    var g = new G(32, 32);
    g.ell(16, 23, 6.5, 7, '#f2e2c4', null, '#d0bc98');
    g.ell(16, 12, 13, 8, '#d8433a', '#f06a5a', '#a82e2a');
    g.rect(3, 13, 26, 2, '#a82e2a');
    g.ell(10, 9, 2.4, 2, '#fff'); g.ell(20, 7, 2, 1.6, '#fff'); g.ell(23, 12, 1.6, 1.4, '#fff'); g.ell(14, 4.5, 1.6, 1.2, '#fff'); g.ell(6, 13, 1.2, 1, '#fff');
    g.rect(12, 20, 2, 3, '#111'); g.rect(18, 20, 2, 3, '#111');
    g.p(12, 20, '#fff'); g.p(18, 20, '#fff');
    g.rect(11, 24, 2, 1, '#f0a0a0'); g.rect(19, 24, 2, 1, '#f0a0a0');
    g.rect(15, 25, 2, 1, '#6a3a20');
    g.rect(11, 29, 4, 2, '#8a6a4a'); g.rect(17, 29, 4, 2, '#8a6a4a');
    return g.outline();
  };
  S.tanuki = function () { // 덤불 너구리
    var g = new G(32, 32);
    g.ell(26, 22, 5, 3.4, '#6a5a48'); g.rect(28, 20, 2, 5, '#3a2e24'); // 꼬리
    g.ell(16, 21, 10, 8.5, '#8a7660', '#a8927a', '#665444');
    g.ell(15, 23, 6, 5, '#e8dcc4');
    g.ell(8, 7, 2.6, 2.6, '#665444'); g.ell(22, 7, 2.6, 2.6, '#665444');
    g.ell(15, 12, 9, 6.5, '#8a7660', '#a8927a');
    g.ell(10.5, 12, 3.6, 2.4, '#2e2620'); g.ell(19.5, 12, 3.6, 2.4, '#2e2620');
    g.p(10, 11, '#fff'); g.p(19, 11, '#fff'); g.p(11, 12, '#ffe'); g.p(20, 12, '#ffe');
    g.ell(15, 15.5, 3, 2, '#e8dcc4'); g.rect(14, 14, 2, 1, '#111');
    // 머리 위 덤불
    g.ell(12, 4.5, 4, 2.5, '#3f8a3a', '#5aa850'); g.ell(18, 3.5, 3.4, 2.4, '#3f8a3a', '#5aa850'); g.p(15, 2, '#d8433a');
    g.rect(9, 28, 4, 3, '#4a3c30'); g.rect(19, 28, 4, 3, '#4a3c30');
    return g.outline();
  };
  S.bossTree = function () { // 숲지기 고목 '우듬지'
    var g = new G(48, 48);
    g.ell(24, 12, 20, 11, '#2f6a32', '#4a9046', '#204a24');
    g.ell(10, 16, 9, 7, '#2f6a32', '#4a9046', '#204a24');
    g.ell(38, 16, 9, 7, '#2f6a32', '#4a9046', '#204a24');
    g.ell(18, 7, 6, 4, '#4a9046', '#6ab060'); g.ell(32, 9, 5, 3, '#4a9046', '#6ab060');
    g.p(14, 12, '#e8a0c0'); g.p(30, 6, '#e8a0c0'); g.p(36, 14, '#f0e080'); g.p(9, 18, '#f0e080');
    g.rect(14, 20, 20, 24, '#6a4a2c'); g.rect(14, 20, 4, 24, '#86603a'); g.rect(30, 20, 4, 24, '#4e3420');
    g.poly([[10, 47], [14, 38], [18, 47]], '#5a3e24'); g.poly([[30, 47], [34, 38], [38, 47]], '#5a3e24');
    g.line(19, 24, 19, 42, '#5a3e24'); g.line(28, 26, 28, 44, '#5a3e24');
    // 팔 가지
    g.line(14, 28, 5, 22, '#5a3e24').line(14, 29, 5, 23, '#6a4a2c'); g.line(5, 22, 2, 19, '#5a3e24'); g.line(5, 22, 3, 25, '#5a3e24');
    g.line(34, 28, 43, 23, '#5a3e24').line(34, 29, 43, 24, '#6a4a2c'); g.line(43, 23, 46, 20, '#5a3e24');
    // 얼굴
    g.rect(17, 25, 5, 4, '#1c120a'); g.rect(26, 25, 5, 4, '#1c120a');
    g.rect(19, 26, 2, 2, '#f0d050'); g.rect(28, 26, 2, 2, '#f0d050');
    g.line(16, 23, 22, 25, '#2a1a0e'); g.line(32, 23, 26, 25, '#2a1a0e');
    g.rect(19, 33, 10, 4, '#1c120a'); g.rect(20, 33, 2, 1, '#e8dcc0'); g.rect(26, 33, 2, 1, '#e8dcc0');
    g.ell(24, 40, 3, 1.4, '#3a7a3a'); // 이끼 수염
    return g.outline();
  };

  // --- 적: 한자어 서원
  S.inktoad = function () { // 먹물 두꺼비
    var g = new G(32, 32);
    g.ell(16, 21, 12, 8.5, '#2c2a40', '#48446a', '#1a1828');
    g.ell(15, 24, 8, 4, '#5a5478');
    g.ell(9, 12, 4, 4, '#2c2a40', '#48446a'); g.ell(21, 12, 4, 4, '#2c2a40', '#48446a');
    g.ell(9, 11.5, 2.4, 2.4, '#f4e070'); g.ell(21, 11.5, 2.4, 2.4, '#f4e070');
    g.rect(8, 11, 2, 2, '#111'); g.rect(20, 11, 2, 2, '#111');
    g.line(6, 18, 25, 18, '#111'); g.line(6, 17, 6, 18, '#111'); g.line(25, 17, 25, 18, '#111');
    g.ell(13, 16, 1, 0.8, '#7a74a0'); g.ell(24, 22, 1.6, 1, '#7a74a0'); g.ell(8, 24, 1.2, 1, '#7a74a0');
    g.rect(4, 27, 6, 3, '#2c2a40'); g.rect(22, 27, 6, 3, '#2c2a40');
    // 먹물 방울
    g.ell(28, 13, 1.4, 2, '#111'); g.p(28, 10, '#111');
    return g.outline();
  };
  S.weasel = function () { // 붓끝 족제비
    var g = new G(32, 32);
    g.poly([[18, 25], [27, 12], [31, 8], [29, 16], [22, 27]], '#e0a050');
    g.poly([[27, 12], [31, 4], [31, 9]], '#1a1a1a'); g.p(30, 10, '#1a1a1a'); // 붓끝 꼬리
    g.ell(15, 22, 6, 6.5, '#d08840', '#e8a860', '#a86a2e');
    g.ell(13.5, 23, 3.5, 4.5, '#f8eedc');
    g.ell(11, 11, 5.5, 5, '#d08840', '#e8a860');
    g.ell(8.5, 13, 3, 2.2, '#f8eedc');
    g.p(6, 13, '#2a1a10'); g.p(7, 12, '#2a1a10');
    g.rect(9, 9, 2, 2, '#111'); g.p(9, 9, '#fff'); g.rect(13, 9, 2, 2, '#111'); g.p(13, 9, '#fff');
    g.ell(9, 6, 1.6, 1.6, '#d08840'); g.ell(15, 6, 1.6, 1.6, '#d08840');
    g.rect(11, 28, 3, 3, '#a86a2e'); g.rect(17, 28, 3, 3, '#a86a2e');
    // 들고 있는 붓
    g.line(4, 24, 10, 16, '#7a5a30'); g.rect(2, 24, 3, 3, '#1a1a1a');
    return g.outline();
  };
  S.bookworm = function () { // 책벌레
    var g = new G(32, 32);
    // 책
    g.poly([[2, 22], [16, 26], [30, 22], [30, 30], [16, 31], [2, 30]], '#8a3a3a');
    g.poly([[3, 21], [16, 24], [29, 21], [29, 27], [16, 29], [3, 27]], '#f4ecd8');
    g.line(16, 24, 16, 29, '#b8a888');
    g.line(5, 23, 13, 25, '#b8a888'); g.line(19, 25, 27, 23, '#b8a888');
    // 벌레
    g.ell(16, 18, 4, 4.5, '#7ab84a', '#9ad06a', '#5a9a3a');
    g.ell(18, 12, 4.4, 4, '#7ab84a', '#9ad06a', '#5a9a3a');
    g.ell(14, 6.5, 5, 4.4, '#8ac85a', '#a8e078');
    g.rect(9, 5, 4, 3, '#fff'); g.rect(15, 5, 4, 3, '#fff'); // 안경
    g.rect(9, 5, 4, 1, '#3a2a1a'); g.rect(15, 5, 4, 1, '#3a2a1a'); g.rect(13, 6, 2, 1, '#3a2a1a');
    g.p(10, 6, '#111'); g.p(16, 6, '#111');
    g.rect(11, 10, 3, 1, '#3a5a2a');
    g.line(12, 2, 10, 0, '#5a9a3a'); g.line(16, 2, 18, 0, '#5a9a3a');
    return g.outline();
  };
  S.bossTurtle = function () { // 벼루 거북 '묵향 대감'
    var g = new G(48, 48);
    g.ell(10, 30, 7, 5.5, '#6a9a6a', '#88b888', '#4a7a4a'); // 머리
    g.rect(3, 28, 3, 3, '#fff'); g.p(4, 29, '#111'); g.p(3, 29, '#111');
    g.poly([[4, 34], [8, 34], [6, 42]], '#f4f4f4'); g.line(6, 34, 6, 41, '#d8d8d8'); // 수염
    g.rect(2, 22, 16, 2, '#1d1a22'); g.rect(6, 15, 8, 7, '#2a2630'); g.rect(7, 16, 6, 1, '#4a4656'); // 갓
    g.line(4, 24, 3, 32, '#2a2630');
    // 벼루 등껍질
    g.ell(29, 30, 17, 12, '#3a3a44', '#585868', '#24242c');
    g.ell(29, 28, 12, 7, '#24242c');
    g.ell(28, 27, 9, 4.5, '#141418'); g.ell(26, 26, 3, 1.4, '#3a3a50');
    g.rect(16, 36, 26, 2, '#5a5a6a');
    g.rect(16, 40, 5, 6, '#6a9a6a'); g.rect(36, 40, 5, 6, '#6a9a6a');
    g.rect(15, 45, 7, 2, '#4a7a4a'); g.rect(35, 45, 7, 2, '#4a7a4a');
    g.poly([[45, 34], [48, 37], [44, 37]], '#6a9a6a');
    // 붓 꽂이
    g.line(36, 20, 42, 6, '#9a6a35'); g.rect(41, 3, 3, 4, '#1a1a1a');
    return g.outline();
  };

  // --- 적: 신조어 저잣거리
  S.sparrow = function () { // 줄임말 참새
    var g = new G(32, 32);
    g.poly([[24, 20], [31, 22], [30, 26], [23, 24]], '#6a4a2a');
    g.ell(17, 20, 8, 7, '#a8784a', '#c4945e', '#7a5430');
    g.ell(14, 22, 5, 4.5, '#f0e2c8');
    g.ell(20, 19, 4.5, 3.5, '#7a5430', '#94683e'); g.line(17, 19, 23, 21, '#4a321a');
    g.ell(13, 11, 6, 5.5, '#8a5a32', '#a8784a');
    g.ell(11, 13, 3.4, 2.4, '#f0e2c8');
    g.rect(10, 9, 2, 2, '#111'); g.p(10, 9, '#fff');
    g.poly([[7, 11], [3, 12.5], [7, 14]], '#f0b030');
    g.rect(14, 26, 1, 4, '#d09040'); g.rect(18, 26, 1, 4, '#d09040');
    // 말풍선(점 세 개)
    g.ell(25, 6, 6, 4, '#fff'); g.poly([[21, 8], [19, 12], [24, 9]], '#fff');
    g.p(22, 6, '#333'); g.p(25, 6, '#333'); g.p(28, 6, '#333');
    return g.outline();
  };
  S.bell = function () { // 알림 요정 '띵동'
    var g = new G(32, 32);
    g.ell(6, 14, 4.5, 6, '#c8e8ff', '#ffffff'); g.ell(26, 14, 4.5, 6, '#c8e8ff', '#ffffff');
    g.poly([[9, 24], [11, 9], [16, 5], [21, 9], [23, 24]], '#f4c430');
    g.ell(16, 11, 6, 6, '#f4c430', '#ffe070');
    g.rect(8, 23, 16, 3, '#d8a020'); g.ell(16, 27.5, 2.4, 2.2, '#d8a020');
    g.rect(15, 3, 2, 2, '#d8a020');
    g.line(12, 10, 12, 18, '#ffe890');
    g.rect(12, 14, 2, 3, '#111'); g.rect(18, 14, 2, 3, '#111');
    g.rect(15, 19, 2, 1, '#8a5a10');
    // 빨간 알림 숫자 배지
    g.ell(23, 7, 4, 4, '#e83a3a', '#ff6a6a'); g.rect(23, 5, 1, 4, '#fff'); g.p(22, 6, '#fff');
    return g.outline();
  };
  S.memecat = function () { // 짤 고양이
    var g = new G(32, 32);
    g.line(25, 25, 30, 16, '#e8e8e8'); g.line(26, 25, 31, 17, '#e8e8e8'); g.p(30, 15, '#e8e8e8');
    g.ell(16, 22, 9, 8, '#f4f4f4', '#ffffff', '#cfcfd6');
    g.poly([[6, 10], [7, 1], [13, 6]], '#f4f4f4'); g.poly([[26, 10], [25, 1], [19, 6]], '#f4f4f4');
    g.p(8, 5, '#f0a0b0'); g.p(24, 5, '#f0a0b0');
    g.ell(16, 11, 10, 7, '#f4f4f4', '#ffffff', '#cfcfd6');
    // 선글라스
    g.rect(7, 9, 7, 3, '#141418'); g.rect(18, 9, 7, 3, '#141418'); g.rect(14, 9, 4, 1, '#141418');
    g.p(8, 9, '#6a6a80'); g.p(19, 9, '#6a6a80');
    g.p(16, 13, '#f08090'); g.line(13, 15, 15, 16, '#555'); g.line(19, 15, 17, 16, '#555');
    g.line(2, 13, 7, 14, '#bbb'); g.line(30, 13, 25, 14, '#bbb');
    g.rect(10, 28, 4, 3, '#dadada'); g.rect(18, 28, 4, 3, '#dadada');
    // 금목걸이
    g.line(10, 18, 16, 21, '#f0c030'); g.line(22, 18, 16, 21, '#f0c030');
    return g.outline();
  };
  S.bossPigeon = function () { // 줄임말 대왕 비둘기 '구구절절'
    var g = new G(48, 48);
    g.poly([[34, 30], [47, 34], [46, 40], [32, 37]], '#5a6070');
    g.ell(26, 30, 14, 12, '#8a90a8', '#a8aec4', '#666c84');
    g.ell(20, 22, 8, 6, '#5a9a8a', '#7ab8a8'); g.ell(22, 20, 6, 3, '#8a5aa8'); // 목 무지갯빛
    g.ell(30, 30, 9, 6, '#7a8098', '#9aa0b8'); g.line(24, 30, 38, 33, '#555a70'); g.line(26, 33, 37, 36, '#555a70');
    g.ell(16, 14, 8, 7, '#8a90a8', '#a8aec4');
    g.rect(11, 12, 3, 3, '#e86a20'); g.p(12, 13, '#111');
    g.poly([[9, 15], [3, 17], [9, 18]], '#d0c0b0'); g.p(9, 14, '#fff');
    // 왕관
    g.poly([[10, 8], [11, 2], [14, 6], [16, 1], [18, 6], [21, 2], [22, 8]], '#f0c030'); g.rect(10, 7, 12, 2, '#d8a020');
    g.p(16, 4, '#e83a3a'); g.p(12, 6, '#3a8ae8'); g.p(20, 6, '#3a8ae8');
    // 손에 든 휴대전화
    g.rect(6, 28, 6, 9, '#2a2a34'); g.rect(7, 29, 4, 6, '#7ad0ff'); g.p(8, 30, '#fff');
    g.rect(22, 41, 2, 5, '#e86a7a'); g.rect(30, 41, 2, 5, '#e86a7a'); g.rect(20, 46, 5, 1, '#e86a7a'); g.rect(28, 46, 5, 1, '#e86a7a');
    return g.outline();
  };

  // --- 대회 상대
  S.hedgehog = function () { // 고슴도치 '도담'
    var g = new G(32, 32);
    for (var k = 0; k < 9; k++) {
      var a = Math.PI * (0.15 + k * 0.1);
      g.poly([[18 + Math.cos(a) * 7, 18 - Math.sin(a) * 7], [18 + Math.cos(a + 0.12) * 14, 18 - Math.sin(a + 0.12) * 13], [18 + Math.cos(a + 0.22) * 7, 18 - Math.sin(a + 0.22) * 7]], '#5a4a3a');
    }
    g.ell(18, 19, 10, 9, '#6a5848', '#8a7460', '#4a3c30');
    g.ell(11, 21, 6.5, 6, '#e8d0b0', '#f8e4c8');
    g.p(5, 22, '#111'); g.p(4, 22, '#111');
    g.rect(9, 18, 2, 2, '#111'); g.p(9, 18, '#fff');
    g.rect(7, 13, 12, 2, '#3a7ae8'); g.poly([[19, 13], [24, 11], [23, 16]], '#3a7ae8'); // 머리띠
    g.p(12, 24, '#f0a0a0');
    g.rect(10, 28, 4, 3, '#4a3c30'); g.rect(20, 28, 4, 3, '#4a3c30');
    return g.outline();
  };
  S.fox = function () { // 여우 '여울'
    var g = new G(32, 32);
    g.poly([[22, 26], [30, 16], [31, 26]], '#e07a30'); g.poly([[29, 18], [31, 14], [31, 20]], '#fff');
    g.ell(17, 22, 7, 7.5, '#e07a30', '#f0964a', '#b85a20');
    g.ell(15, 24, 4, 5, '#fbeedd');
    g.poly([[9, 8], [10, 1], [14, 6]], '#e07a30'); g.poly([[20, 8], [20, 1], [16, 5]], '#e07a30');
    g.p(10, 4, '#2a1a10'); g.p(19, 4, '#2a1a10');
    g.ell(14, 11, 6.5, 5, '#e07a30', '#f0964a');
    g.poly([[4, 13], [11, 10], [12, 16]], '#fbeedd'); g.p(4, 13, '#111');
    g.rect(10, 9, 2, 2, '#111'); g.rect(16, 9, 2, 2, '#111'); g.p(10, 9, '#fff'); g.p(16, 9, '#fff');
    // 부채
    g.poly([[3, 20], [9, 26], [1, 28]], '#c83a5a'); g.line(3, 20, 6, 27, '#f0c0d0'); g.line(9, 26, 6, 29, '#7a5a30');
    g.rect(12, 28, 3, 3, '#3a2a20'); g.rect(19, 28, 3, 3, '#3a2a20');
    return g.outline();
  };
  S.bossOwl = function () { // 부엉이 장원 '솔빛'
    var g = new G(48, 48);
    g.ell(24, 28, 15, 17, '#7a5a3a', '#9a7650', '#5a4028');
    g.ell(24, 32, 9, 11, '#e8d8b8');
    for (var y = 26; y < 42; y += 4) for (var x = 18; x < 31; x += 4) g.p(x + (y % 8 ? 2 : 0), y, '#b89a70');
    g.ell(11, 30, 4, 10, '#6a4a2e', '#86603e'); g.ell(37, 30, 4, 10, '#6a4a2e', '#86603e');
    g.poly([[11, 12], [13, 3], [18, 10]], '#7a5a3a'); g.poly([[37, 12], [35, 3], [30, 10]], '#7a5a3a');
    g.ell(17, 17, 6, 6, '#f8f0d8'); g.ell(31, 17, 6, 6, '#f8f0d8');
    g.ell(17, 17, 3.4, 3.4, '#f0a020'); g.ell(31, 17, 3.4, 3.4, '#f0a020');
    g.rect(16, 16, 3, 3, '#111'); g.rect(30, 16, 3, 3, '#111'); g.p(16, 16, '#fff'); g.p(30, 16, '#fff');
    g.poly([[22, 21], [26, 21], [24, 26]], '#e8a030');
    // 장원 어사화(머리 꽃 장식)
    g.line(24, 8, 24, 2, '#3a7a3a'); g.line(24, 3, 44, 6, '#3a7a3a');
    for (var f = 0; f < 5; f++) g.ell(28 + f * 4, 4 + f * 0.6, 1.6, 1.6, f % 2 ? '#f0a0c0' : '#f4e070');
    g.rect(15, 44, 5, 3, '#e8a030'); g.rect(28, 44, 5, 3, '#e8a030');
    return g.outline();
  };

  // ===================================================================
  // 스프라이트 캐시
  var cache = {};
  function sprite(key) {
    if (cache[key]) return cache[key];
    var parts = key.split(':'), fn = S[parts[0]];
    if (!fn) { console.warn('no sprite', key); return null; }
    var g = fn(parts[1], parts[2] === '1');
    var flipped = null;
    var s = { w: g.w, h: g.h, img: toCanvas(g), white: toCanvas(g, true), url: null };
    cache[key] = s;
    return s;
  }
  function spriteURL(key) {
    var s = sprite(key);
    if (!s) return '';
    if (!s.url) {
      // 확대된 초상화 (DOM 안에서 선명하게)
      var c = document.createElement('canvas');
      c.width = s.w * 4; c.height = s.h * 4;
      var x = c.getContext('2d'); x.imageSmoothingEnabled = false;
      x.drawImage(s.img, 0, 0, c.width, c.height);
      try { s.url = c.toDataURL(); } catch (e) { s.url = ''; }
    }
    return s.url;
  }
  // 그리기: (x,y)는 발 밑 가운데
  function draw(ctx, key, x, y, opts) {
    var s = sprite(key);
    if (!s) return;
    opts = opts || {};
    var img = opts.flash ? s.white : s.img;
    var sc = opts.scale || 1, w = s.w * sc, h = s.h * sc;
    var dx = Math.round(x - w / 2), dy = Math.round(y - h);
    if (opts.alpha !== undefined) ctx.globalAlpha = opts.alpha;
    ctx.imageSmoothingEnabled = false;
    if (opts.flip) {
      ctx.save(); ctx.translate(dx + w, dy); ctx.scale(-1, 1); ctx.drawImage(img, 0, 0, w, h); ctx.restore();
    } else {
      ctx.drawImage(img, dx, dy, w, h);
    }
    ctx.globalAlpha = 1;
  }
  function shadow(ctx, x, y, w) {
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    var h = Math.max(2, Math.round(w / 5));
    for (var j = 0; j < h; j++) {
      var k = 1 - Math.pow((j - (h - 1) / 2) / (h / 2), 2);
      var ww = Math.round(w * Math.sqrt(Math.max(0, k)));
      ctx.fillRect(Math.round(x - ww / 2), Math.round(y - h / 2 + j), ww, 1);
    }
  }

  // ===================================================================
  // 배경
  function mk(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; var x = c.getContext('2d'); x.imageSmoothingEnabled = false; return [c, x]; }
  // 디더링 띠 그라데이션
  function bands(x, y0, y1, cols) {
    var n = cols.length, bh = (y1 - y0) / n;
    for (var i = 0; i < n; i++) {
      var a = Math.round(y0 + i * bh), b = Math.round(y0 + (i + 1) * bh);
      x.fillStyle = cols[i]; x.fillRect(0, a, 320, b - a);
      if (i < n - 1) {
        x.fillStyle = cols[i + 1];
        for (var px = 0; px < 320; px += 2) { x.fillRect(px + ((b) % 2), b - 2, 1, 1); x.fillRect(px, b - 1, 1, 1); }
      }
    }
  }
  function hills(x, base, amp, freq, phase, col, r) {
    x.fillStyle = col;
    for (var px = 0; px < 320; px++) {
      var h = Math.round(base - amp * (0.6 * Math.sin(px * freq + phase) + 0.4 * Math.sin(px * freq * 2.3 + phase * 1.7)) - (r ? r() * 2 : 0));
      x.fillRect(px, h, 1, 240 - h);
    }
  }
  function pxCircle(x, cx, cy, r, col) {
    x.fillStyle = col;
    for (var dy = -r; dy <= r; dy++) {
      var w = Math.round(Math.sqrt(r * r - dy * dy));
      x.fillRect(Math.round(cx - w), Math.round(cy + dy), w * 2 + 1, 1);
    }
  }
  function pine(x, cx, by, h, c1, c2) {
    for (var j = 0; j < h; j++) {
      var w = Math.round((j / h) * h * 0.45) + 1;
      if (j % 6 === 5) w -= 2;
      x.fillStyle = (j % 6 < 2) ? c2 : c1;
      x.fillRect(cx - w, by - h + j, w * 2 + 1, 1);
    }
  }
  function roundTree(x, cx, by, r, trunk, c1, c2, c3) {
    x.fillStyle = trunk; x.fillRect(cx - 2, by - r, 4, r);
    pxCircle(x, cx, by - r - r * 0.6, r, c1);
    pxCircle(x, cx - r * 0.3, by - r - r * 0.85, r * 0.55, c2);
    if (c3) pxCircle(x, cx + r * 0.35, by - r - r * 0.3, r * 0.4, c3);
  }
  function ground(x, y, c1, c2, r) {
    x.fillStyle = c1; x.fillRect(0, y, 320, 240 - y);
    x.fillStyle = c2;
    for (var i = 0; i < 260; i++) { var gx = Math.floor(r() * 320), gy = y + Math.floor(r() * (240 - y)); x.fillRect(gx, gy, 2, 1); }
  }

  var BG = {};
  BG.title = function () {
    var a = mk(320, 240), c = a[0], x = a[1], r = rng(7);
    bands(x, 0, 150, ['#1a1838', '#262350', '#3a2f68', '#5a3c78', '#8a4a78', '#c46a6a', '#e8946a', '#f4c07a']);
    x.fillStyle = '#fff';
    for (var i = 0; i < 50; i++) { var sx = Math.floor(r() * 320), sy = Math.floor(r() * 70); x.globalAlpha = 0.4 + r() * 0.6; x.fillRect(sx, sy, 1, 1); }
    x.globalAlpha = 1;
    pxCircle(x, 258, 46, 14, '#fbeec0'); pxCircle(x, 252, 42, 4, '#f0dca0');
    hills(x, 120, 22, 0.018, 1, '#4a3a6a');
    hills(x, 138, 16, 0.026, 3, '#3a2c58');
    hills(x, 156, 10, 0.04, 5, '#2a2244');
    // 마을 지붕 실루엣
    x.fillStyle = '#1c1630';
    [[30, 168, 40], [80, 172, 34], [200, 170, 44], [262, 166, 38]].forEach(function (h) {
      x.fillRect(h[0] - h[2] / 2 + 4, h[1] - 8, h[2] - 8, 14);
      for (var k = 0; k < 6; k++) x.fillRect(h[0] - h[2] / 2 - 2 + k, h[1] - 10 - k, h[2] + 4 - k * 2, 1);
    });
    x.fillStyle = '#16122a'; x.fillRect(0, 176, 320, 64);
    x.fillStyle = '#f4c07a'; [[28, 170], [84, 174], [196, 172], [206, 172], [266, 168]].forEach(function (p) { x.fillRect(p[0], p[1], 3, 3); });
    // 강물 반짝임
    x.fillStyle = '#2a2448'; x.fillRect(0, 196, 320, 44);
    x.fillStyle = '#5a4a80';
    for (var j = 0; j < 40; j++) x.fillRect(Math.floor(r() * 310), 200 + Math.floor(r() * 38), 4 + Math.floor(r() * 8), 1);
    return c;
  };
  BG.forest = function () {
    var a = mk(320, 240), c = a[0], x = a[1], r = rng(11);
    bands(x, 0, 120, ['#8fd0e8', '#a4dcea', '#bce6e6', '#d4eedc']);
    hills(x, 96, 14, 0.02, 2, '#7ab8a0');
    for (var i = 0; i < 14; i++) pine(x, 10 + i * 24 + Math.floor(r() * 10), 128, 38 + Math.floor(r() * 18), '#3a7a5a', '#4a8a68');
    hills(x, 124, 6, 0.05, 1, '#3f7a3e');
    for (var k = 0; k < 7; k++) roundTree(x, 20 + k * 48 + Math.floor(r() * 10), 132, 10 + Math.floor(r() * 4), '#5a3e24', '#2f6a32', '#4a9046', '#3f8040');
    ground(x, 132, '#6aae4a', '#5a9a3e', r);
    x.fillStyle = '#c9a66b'; // 오솔길
    for (var y = 150; y < 240; y++) { var w = (y - 140) * 1.4; x.fillRect(Math.round(160 - w), y, Math.round(w * 2), 1); }
    x.fillStyle = '#b08f58';
    for (var p = 0; p < 40; p++) { var py = 155 + Math.floor(r() * 85), pw = (py - 140) * 1.3; x.fillRect(Math.round(160 - pw + r() * pw * 2), py, 2, 1); }
    // 꽃
    for (var f = 0; f < 30; f++) { x.fillStyle = U.pick(['#f4e070', '#f0a0c0', '#fff']); var fx = Math.floor(r() * 320), fy = 136 + Math.floor(r() * 100); if (Math.abs(fx - 160) > (fy - 140) * 1.5) x.fillRect(fx, fy, 1, 1); }
    return c;
  };
  BG.seowon = function () {
    var a = mk(320, 240), c = a[0], x = a[1], r = rng(23);
    bands(x, 0, 60, ['#f0d8a8', '#f4e2bc', '#f8ecd0']);
    // 지붕
    x.fillStyle = '#3a3e4e'; x.fillRect(0, 18, 320, 26);
    for (var i = 0; i < 320; i += 6) { x.fillStyle = '#4e5468'; x.fillRect(i, 18, 3, 26); }
    x.fillStyle = '#2a2c38'; x.fillRect(0, 42, 320, 4);
    x.fillStyle = '#5a6078'; for (var j = 0; j < 320; j += 6) x.fillRect(j, 44, 4, 2);
    // 처마 단청
    x.fillStyle = '#2a8a6a'; x.fillRect(0, 46, 320, 4);
    x.fillStyle = '#c83a3a'; for (var d = 0; d < 320; d += 16) x.fillRect(d + 4, 46, 6, 4);
    x.fillStyle = '#f0c040'; for (var d2 = 0; d2 < 320; d2 += 16) x.fillRect(d2 + 6, 47, 2, 2);
    // 벽, 기둥, 창호
    x.fillStyle = '#e8d8b0'; x.fillRect(0, 50, 320, 76);
    for (var p = 0; p < 6; p++) {
      var px = 8 + p * 62;
      x.fillStyle = '#7a3a2a'; x.fillRect(px, 50, 8, 76); x.fillStyle = '#9a4a34'; x.fillRect(px, 50, 3, 76);
      if (p < 5) {
        x.fillStyle = '#f8f0dc'; x.fillRect(px + 14, 60, 42, 52);
        x.fillStyle = '#8a5a3a';
        x.fillRect(px + 14, 60, 42, 2); x.fillRect(px + 14, 110, 42, 2); x.fillRect(px + 14, 60, 2, 52); x.fillRect(px + 54, 60, 2, 52);
        for (var gx = px + 20; gx < px + 54; gx += 7) x.fillRect(gx, 62, 1, 48);
        for (var gy = 66; gy < 110; gy += 7) x.fillRect(px + 16, gy, 38, 1);
      }
    }
    x.fillStyle = '#6a4a30'; x.fillRect(0, 122, 320, 8); x.fillStyle = '#86603e'; x.fillRect(0, 122, 320, 2);
    // 마당 돌바닥
    x.fillStyle = '#b8b0a0'; x.fillRect(0, 130, 320, 110);
    x.fillStyle = '#a49c8c';
    for (var ry = 130; ry < 240; ry += 12) { x.fillRect(0, ry, 320, 1); for (var rx = (ry / 12 % 2) * 14; rx < 320; rx += 28) x.fillRect(rx, ry, 1, 12); }
    x.fillStyle = '#c8c0b0'; for (var s = 0; s < 80; s++) x.fillRect(Math.floor(r() * 320), 131 + Math.floor(r() * 108), 2, 1);
    // 석등
    [[34, 150], [290, 150]].forEach(function (l) {
      x.fillStyle = '#8a8478'; x.fillRect(l[0] - 3, l[1] - 30, 6, 30); x.fillRect(l[0] - 8, l[1] - 34, 16, 4); x.fillRect(l[0] - 6, l[1] - 44, 12, 10); x.fillRect(l[0] - 9, l[1] - 48, 18, 4);
      x.fillStyle = '#f4d070'; x.fillRect(l[0] - 3, l[1] - 42, 6, 6);
      x.fillStyle = '#6a6458'; x.fillRect(l[0] - 6, l[1], 12, 3);
    });
    return c;
  };
  BG.market = function () {
    var a = mk(320, 240), c = a[0], x = a[1], r = rng(31);
    bands(x, 0, 120, ['#2a2050', '#3a2a68', '#5a3a80', '#8a4a88', '#c06a88']);
    x.fillStyle = '#fff'; for (var i = 0; i < 25; i++) x.fillRect(Math.floor(r() * 320), Math.floor(r() * 50), 1, 1);
    // 뒤 건물
    for (var b = 0; b < 8; b++) { x.fillStyle = b % 2 ? '#2a2244' : '#322850'; var bh = 40 + Math.floor(r() * 30); x.fillRect(b * 42 - 4, 110 - bh, 40, bh + 20); x.fillStyle = '#f4d070'; for (var w = 0; w < 4; w++) if (r() > 0.4) x.fillRect(b * 42 + 4 + w * 8, 110 - bh + 8 + Math.floor(r() * 2) * 12, 4, 5); }
    // 노점 차양
    var aw = [['#d8433a', '#f4ecd8'], ['#3a7ae8', '#f4ecd8'], ['#3aa86a', '#f4ecd8'], ['#e8a030', '#f4ecd8']];
    for (var s = 0; s < 4; s++) {
      var sx = 4 + s * 80;
      x.fillStyle = '#5a3a24'; x.fillRect(sx + 2, 96, 3, 40); x.fillRect(sx + 69, 96, 3, 40);
      for (var k = 0; k < 74; k += 8) { x.fillStyle = aw[s][(k / 8) % 2]; x.fillRect(sx + k, 88, 8, 12); x.fillRect(sx + k + 1, 100, 6, 2); }
      x.fillStyle = '#7a5434'; x.fillRect(sx, 118, 74, 14); x.fillStyle = '#9a6a44'; x.fillRect(sx, 118, 74, 2);
      for (var g2 = 0; g2 < 6; g2++) { x.fillStyle = U.pick(['#f06a5a', '#f4e070', '#7ac85a', '#f0a0c0', '#fff']); x.fillRect(sx + 6 + g2 * 11, 113, 6, 5); }
    }
    // 등불 줄
    x.fillStyle = '#3a2a20';
    for (var lx = 0; lx < 320; lx++) x.fillRect(lx, 70 + Math.round(Math.sin(lx / 320 * Math.PI * 3) * 6), 1, 1);
    for (var l = 0; l < 10; l++) { var llx = 14 + l * 32, lly = 72 + Math.round(Math.sin(llx / 320 * Math.PI * 3) * 6); x.fillStyle = l % 2 ? '#e8503a' : '#f4c040'; x.fillRect(llx - 3, lly, 7, 8); x.fillStyle = '#fff3c0'; x.fillRect(llx - 1, lly + 2, 3, 4); }
    ground(x, 132, '#a88a68', '#987a58', r);
    x.fillStyle = '#b89a78'; for (var y = 140; y < 240; y += 18) x.fillRect(0, y, 320, 1);
    return c;
  };
  BG.arena = function () {
    var a = mk(320, 240), c = a[0], x = a[1], r = rng(41);
    bands(x, 0, 70, ['#6ab4f0', '#86c4f4', '#a4d4f6', '#c4e4f8']);
    pxCircle(x, 40, 22, 9, '#fff'); pxCircle(x, 52, 24, 7, '#fff'); pxCircle(x, 270, 30, 8, '#fff'); pxCircle(x, 282, 28, 10, '#fff');
    // 관중석
    for (var row = 0; row < 5; row++) {
      x.fillStyle = row % 2 ? '#8a5a3a' : '#7a4e30'; x.fillRect(0, 60 + row * 12, 320, 12);
      for (var px = (row % 2) * 5; px < 320; px += 10) {
        x.fillStyle = U.pick(['#f4c07a', '#e8a070', '#d08850', '#f0d0a0']); x.fillRect(px + 2, 62 + row * 12, 5, 5);
        x.fillStyle = U.pick(['#d8433a', '#3a7ae8', '#3aa86a', '#e8a030', '#8a5aa8', '#fff']); x.fillRect(px + 1, 67 + row * 12, 7, 5);
      }
    }
    // 깃발
    for (var f = 0; f < 9; f++) {
      var fx = 10 + f * 38; x.fillStyle = '#5a3a24'; x.fillRect(fx, 30, 2, 32);
      x.fillStyle = ['#d8433a', '#3a7ae8', '#f0c030', '#3aa86a', '#8a5aa8'][f % 5]; x.fillRect(fx + 2, 30, 14, 9); x.fillRect(fx + 2, 39, 10, 3);
    }
    // 무대
    x.fillStyle = '#c8945a'; x.fillRect(0, 120, 320, 120);
    x.fillStyle = '#b4824a'; for (var y = 120; y < 240; y += 10) x.fillRect(0, y, 320, 1);
    for (var y2 = 120; y2 < 240; y2 += 10) for (var bx = ((y2 / 10) % 2) * 20; bx < 320; bx += 40) x.fillRect(bx, y2, 1, 10);
    x.fillStyle = '#d8433a'; x.fillRect(0, 118, 320, 4); x.fillStyle = '#f0c030'; for (var t = 0; t < 320; t += 12) x.fillRect(t, 119, 6, 2);
    return c;
  };

  var bgCache = {};
  function bg(name) {
    if (!bgCache[name]) bgCache[name] = BG[name]();
    return bgCache[name];
  }

  // ===================================================================
  // 마을 지도 그리기
  function drawHouse(x, tx, ty, tw, th, roof, roofHi, doorCol) {
    var X = tx * 16, Y = ty * 16, W = tw * 16, H = th * 16;
    var roofH = Math.round(H * 0.55);
    // 벽
    x.fillStyle = '#efe2c0'; x.fillRect(X + 3, Y + roofH - 2, W - 6, H - roofH + 2);
    x.fillStyle = '#d8c8a0'; x.fillRect(X + 3, Y + H - 3, W - 6, 3);
    // 기둥
    x.fillStyle = '#7a4a2a';
    for (var p = X + 3; p <= X + W - 6; p += 16) x.fillRect(p, Y + roofH - 2, 3, H - roofH + 2);
    x.fillRect(X + W - 6, Y + roofH - 2, 3, H - roofH + 2);
    // 창
    for (var wx = X + 9; wx < X + W - 12; wx += 16) {
      if (Math.floor((wx - X) / 16) === doorCol) continue;
      x.fillStyle = '#fbf6e8'; x.fillRect(wx, Y + roofH + 3, 8, 8);
      x.fillStyle = '#9a6a44'; x.fillRect(wx + 3, Y + roofH + 3, 1, 8); x.fillRect(wx, Y + roofH + 6, 8, 1);
    }
    // 문
    var dx = X + doorCol * 16;
    x.fillStyle = '#6a3e22'; x.fillRect(dx + 3, Y + H - 13, 10, 13);
    x.fillStyle = '#8a5a32'; x.fillRect(dx + 4, Y + H - 12, 4, 12); x.fillRect(dx + 9, Y + H - 12, 3, 12);
    x.fillStyle = '#f0c040'; x.fillRect(dx + 7, Y + H - 7, 1, 2); x.fillRect(dx + 9, Y + H - 7, 1, 2);
    // 기와 지붕 (처마가 바깥으로 살짝 들림)
    for (var j = 0; j < roofH; j++) {
      var over = j > roofH - 5 ? 2 : (j < 3 ? -2 + j : 0);
      x.fillStyle = (j % 4 === 3) ? roofHi : roof;
      x.fillRect(X - over, Y + j, W + over * 2, 1);
    }
    x.fillStyle = roofHi;
    for (var k = X + 2; k < X + W - 2; k += 4) x.fillRect(k, Y + 2, 1, roofH - 4);
    x.fillStyle = '#1e1c26'; x.fillRect(X - 2, Y + roofH - 1, W + 4, 2);
    x.fillRect(X - 4, Y + roofH - 3, 2, 2); x.fillRect(X + W + 2, Y + roofH - 3, 2, 2);
    x.fillStyle = '#2a2830'; x.fillRect(X + 2, Y, W - 4, 2); // 용마루
    x.fillRect(X, Y - 1, 3, 2); x.fillRect(X + W - 3, Y - 1, 3, 2);
  }

  function town(map) {
    var a = mk(320, 240), c = a[0], x = a[1], r = rng(5);
    var rows = map.length, cols = map[0].length;
    function at(tx, ty) { return (ty >= 0 && ty < rows && tx >= 0 && tx < cols) ? map[ty][tx] : 'T'; }
    function isPath(ch) { return ch === '=' || ch === 'a' || ch === 'b' || ch === 'c' || ch === 'd'; }
    for (var ty = 0; ty < rows; ty++) for (var tx = 0; tx < cols; tx++) {
      var X = tx * 16, Y = ty * 16, ch = map[ty][tx];
      x.fillStyle = '#62a64c'; x.fillRect(X, Y, 16, 16);
      for (var i = 0; i < 4; i++) { x.fillStyle = r() > 0.5 ? '#529440' : '#76b85c'; var gx = X + Math.floor(r() * 14), gy = Y + Math.floor(r() * 14); x.fillRect(gx, gy, 1, 2); x.fillRect(gx + 1, gy + 1, 1, 1); }
      if (isPath(ch)) {
        x.fillStyle = '#d2b07a'; x.fillRect(X, Y, 16, 16);
        // 풀과 맞닿은 가장자리 부드럽게
        x.fillStyle = '#62a64c';
        if (!isPath(at(tx, ty - 1)) && at(tx, ty - 1) !== 'D') { x.fillRect(X, Y, 16, 1); x.fillRect(X + 3, Y + 1, 4, 1); x.fillRect(X + 11, Y + 1, 2, 1); }
        if (!isPath(at(tx, ty + 1)) && at(tx, ty + 1) !== 'D') { x.fillRect(X, Y + 15, 16, 1); x.fillRect(X + 6, Y + 14, 3, 1); }
        if (!isPath(at(tx - 1, ty))) { x.fillRect(X, Y, 1, 16); x.fillRect(X + 1, Y + 5, 1, 3); }
        if (!isPath(at(tx + 1, ty))) { x.fillRect(X + 15, Y, 1, 16); x.fillRect(X + 14, Y + 9, 1, 3); }
        x.fillStyle = '#b8955e';
        for (var s = 0; s < 3; s++) x.fillRect(X + 2 + Math.floor(r() * 12), Y + 2 + Math.floor(r() * 12), 2, 1);
      } else if (ch === ',') {
        for (var f = 0; f < 3; f++) { x.fillStyle = U.pick(['#f4e070', '#f0a0c0', '#ffffff', '#e86a6a']); var fx = X + 2 + Math.floor(r() * 12), fy = Y + 2 + Math.floor(r() * 12); x.fillRect(fx, fy, 2, 2); x.fillStyle = '#3f7a30'; x.fillRect(fx, fy + 2, 1, 1); }
      }
    }
    // 나무 (아래 줄부터 위로 겹치게)
    for (var ty2 = 0; ty2 < rows; ty2++) for (var tx2 = 0; tx2 < cols; tx2++) {
      if (map[ty2][tx2] !== 'T') continue;
      var cx = tx2 * 16 + 8, by = ty2 * 16 + 16;
      x.fillStyle = 'rgba(0,0,0,0.2)'; x.fillRect(cx - 6, by - 3, 12, 3);
      x.fillStyle = '#6a4424'; x.fillRect(cx - 2, by - 7, 4, 6);
      pxCircle(x, cx, by - 10, 7, '#2e6a34');
      pxCircle(x, cx - 2, by - 12, 4, '#3f8a42');
      x.fillStyle = '#58a454'; x.fillRect(cx - 4, by - 15, 2, 1); x.fillRect(cx - 1, by - 14, 2, 1);
    }
    // 건물
    drawHouse(x, 2, 1, 5, 4, '#3e5a78', '#56769a', 2);  // 여관
    drawHouse(x, 13, 1, 5, 4, '#8a3a34', '#a8524a', 2); // 상점
    drawHouse(x, 2, 10, 5, 3, '#3e6a4a', '#568a62', 2); // 수련장
    drawHouse(x, 13, 10, 5, 3, '#4a3e78', '#62569a', 2); // 서당
    // 게시판
    var nb = null;
    for (var y3 = 0; y3 < rows; y3++) for (var x3 = 0; x3 < cols; x3++) if (map[y3][x3] === 'N') nb = [x3, y3];
    if (nb) {
      var NX = nb[0] * 16, NY = nb[1] * 16;
      x.fillStyle = '#6a4424'; x.fillRect(NX + 3, NY + 8, 2, 8); x.fillRect(NX + 11, NY + 8, 2, 8);
      x.fillStyle = '#9a6a3a'; x.fillRect(NX + 1, NY + 1, 14, 10); x.fillStyle = '#f8f0dc'; x.fillRect(NX + 3, NY + 3, 4, 6); x.fillRect(NX + 9, NY + 3, 4, 5);
      x.fillStyle = '#5a3a1e'; x.fillRect(NX + 1, NY + 1, 14, 1);
    }
    return c;
  }

  // 출구 표시 (잠금 여부는 매 프레임)
  function gate(ctx, X, Y, locked, t) {
    if (locked) {
      ctx.fillStyle = '#7a4a2a'; ctx.fillRect(X + 1, Y + 5, 14, 2); ctx.fillRect(X + 1, Y + 10, 14, 2);
      ctx.fillStyle = '#5a3418'; ctx.fillRect(X + 2, Y + 3, 2, 12); ctx.fillRect(X + 12, Y + 3, 2, 12);
    } else {
      var a = (Math.sin(t * 4) + 1) / 2;
      ctx.globalAlpha = 0.25 + a * 0.35;
      ctx.fillStyle = '#fff6b0'; ctx.fillRect(X + 2, Y + 2, 12, 12);
      ctx.globalAlpha = 1;
    }
  }

  return {
    sprite: sprite, url: spriteURL, draw: draw, shadow: shadow, bg: bg, town: town, gate: gate,
    names: function () { return Object.keys(S); }
  };
})();
