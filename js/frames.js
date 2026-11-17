// frames.js — 영상 한 장면씩 그리기 (배경·프레임·스티커·글자)
var Frames = (function () {
  var W = 720, H = 1280;

  var THEMES = {
    cloud: { name: '구름', bg: '#DDF0FF', soft: '#EAF6FF', deco: 'cloud', a: '#FFFFFF', b: '#FFD66B', text: '#1E4E79', line: '#8CC8F2', sticker: '#FF8FB1' },
    star: { name: '별', bg: '#EEE8FF', soft: '#F6F2FF', deco: 'star', a: '#FFD66B', b: '#C9B8FF', text: '#45358C', line: '#B7A6F2', sticker: '#FFB547' },
    flower: { name: '꽃', bg: '#FFE9F0', soft: '#FFF3F7', deco: 'flower', a: '#FF9DBB', b: '#FFD66B', text: '#9A2F5A', line: '#F6A8C2', sticker: '#FF6F9A' }
  };

  var SEASONS = {
    '봄': { bg: '#FFEAF2', soft: '#FFF4F8', main: '#FF8FB1', sub: '#FFD66B', icon: 'flower', text: '#A0305A' },
    '여름': { bg: '#DFF6F2', soft: '#EEFBF8', main: '#3CC3A8', sub: '#FFC93C', icon: 'sun', text: '#0E6B5C' },
    '가을': { bg: '#FFF0DC', soft: '#FFF7EC', main: '#F49A3A', sub: '#D9622B', icon: 'leaf', text: '#8A4B0B' },
    '겨울': { bg: '#E6F0FF', soft: '#F2F7FF', main: '#7FA8F0', sub: '#FFFFFF', icon: 'snow', text: '#2C4F8C' }
  };

  // ---------- 도형 ----------
  function rng(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function cloud(ctx, x, y, s, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 30 * s, 0, Math.PI * 2);
    ctx.arc(x + 34 * s, y - 16 * s, 38 * s, 0, Math.PI * 2);
    ctx.arc(x + 72 * s, y, 30 * s, 0, Math.PI * 2);
    ctx.fill();
    rr(ctx, x - 30 * s, y - 4 * s, 132 * s, 34 * s, 17 * s);
    ctx.fill();
  }

  function star(ctx, x, y, r, color, rot) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot || 0);
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineJoin = 'round';
    ctx.lineWidth = r * 0.25;
    ctx.beginPath();
    for (var i = 0; i < 10; i++) {
      var rad = i % 2 ? r * 0.45 : r;
      var a = -Math.PI / 2 + i * Math.PI / 5;
      ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function flower(ctx, x, y, r, petal, center) {
    ctx.fillStyle = petal;
    for (var i = 0; i < 5; i++) {
      var a = i * Math.PI * 2 / 5 - Math.PI / 2;
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * r * 0.6, y + Math.sin(a) * r * 0.6, r * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = center;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.38, 0, Math.PI * 2);
    ctx.fill();
  }

  function heart(ctx, x, y, s, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, 30);
    ctx.bezierCurveTo(-60, -10, -30, -55, 0, -25);
    ctx.bezierCurveTo(30, -55, 60, -10, 0, 30);
    ctx.fill();
    ctx.restore();
  }

  function sun(ctx, x, y, r, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    ctx.lineWidth = r * 0.18;
    for (var i = 0; i < 8; i++) {
      var a = i * Math.PI / 4;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * 0.85, Math.sin(a) * r * 0.85);
      ctx.lineTo(Math.cos(a) * r * 1.25, Math.sin(a) * r * 1.25);
      ctx.stroke();
    }
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.65, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function leaf(ctx, x, y, s, color, rot) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot || 0);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, -40 * s);
    ctx.quadraticCurveTo(36 * s, -10 * s, 0, 40 * s);
    ctx.quadraticCurveTo(-36 * s, -10 * s, 0, -40 * s);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 3 * s;
    ctx.beginPath();
    ctx.moveTo(0, -30 * s);
    ctx.lineTo(0, 48 * s);
    ctx.stroke();
    ctx.restore();
  }

  function snow(ctx, x, y, r, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    ctx.lineWidth = r * 0.16;
    for (var i = 0; i < 6; i++) {
      ctx.rotate(Math.PI / 3);
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(0, -r);
      ctx.moveTo(0, -r * 0.55); ctx.lineTo(r * 0.25, -r * 0.8);
      ctx.moveTo(0, -r * 0.55); ctx.lineTo(-r * 0.25, -r * 0.8);
      ctx.stroke();
    }
    ctx.restore();
  }

  function deco(ctx, kind, x, y, s, c1, c2, rot) {
    if (kind === 'cloud') cloud(ctx, x - 36 * s, y, s, c1);
    else if (kind === 'star') star(ctx, x, y, 34 * s, c1, rot);
    else if (kind === 'flower') flower(ctx, x, y, 44 * s, c1, c2);
    else if (kind === 'sun') sun(ctx, x, y, 36 * s, c1);
    else if (kind === 'leaf') leaf(ctx, x, y, s, c1, rot);
    else if (kind === 'snow') snow(ctx, x, y, 34 * s, c1);
    else if (kind === 'heart') heart(ctx, x, y, s, c1);
  }

  // ---------- 배경 (미리 그려서 재사용) ----------
  var bgCache = {};
  function background(pal, kind, seed) {
    var key = pal.bg + kind + seed;
    if (bgCache[key]) return bgCache[key];
    var c = document.createElement('canvas');
    c.width = W; c.height = H;
    var ctx = c.getContext('2d');
    var r = rng(seed * 977 + 13);
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = pal.soft;
    for (var i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.arc(r() * W, r() * H, 120 + r() * 160, 0, Math.PI * 2);
      ctx.fill();
    }
    // 동그란 색종이 점
    for (i = 0; i < 26; i++) {
      ctx.fillStyle = i % 2 ? pal.c1 : pal.c2;
      ctx.globalAlpha = 0.55;
      ctx.beginPath();
      ctx.arc(r() * W, r() * H, 5 + r() * 7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // 가장자리 장식 (가운데 사진 자리는 비워요)
    var placed = 0, tries = 0;
    while (placed < 11 && tries < 200) {
      tries++;
      var x = 40 + r() * (W - 80), y = 40 + r() * (H - 80);
      if (x > 110 && x < W - 110 && y > 200 && y < H - 170) continue;
      deco(ctx, kind, x, y, 0.7 + r() * 0.6, kind === 'cloud' || i % 3 ? pal.c1 : pal.c2, pal.c2, r() * Math.PI);
      placed++;
      i++;
    }
    bgCache[key] = c;
    return c;
  }

  function themePal(t) { return { bg: t.bg, soft: t.soft, c1: t.a, c2: t.b }; }
  function seasonPal(s) { return { bg: s.bg, soft: s.soft, c1: s.main, c2: s.sub }; }

  // ---------- 글자 ----------
  function wrapLines(ctx, text, maxW) {
    var out = [];
    String(text).split('\n').forEach(function (para) {
      var words = para.split(' ');
      var line = '';
      words.forEach(function (w) {
        var test = line ? line + ' ' + w : w;
        if (ctx.measureText(test).width <= maxW) { line = test; return; }
        if (line) out.push(line);
        line = '';
        // 한 단어가 너무 길면 글자 단위로 자르기
        var piece = '';
        for (var i = 0; i < w.length; i++) {
          if (ctx.measureText(piece + w[i]).width > maxW && piece) { out.push(piece); piece = ''; }
          piece += w[i];
        }
        line = piece;
      });
      out.push(line);
    });
    return out;
  }

  function fitText(ctx, text, fontKey, px, maxW, maxLines) {
    var lines;
    while (true) {
      ctx.font = Fonts.css(fontKey, px);
      lines = wrapLines(ctx, text, maxW);
      if (lines.length <= maxLines || px <= 36) break;
      px -= 6;
    }
    return { lines: lines, px: px };
  }

  function drawLines(ctx, lines, x, y, lh, fill, stroke, sw) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    var top = y - (lines.length - 1) * lh / 2;
    lines.forEach(function (l, i) {
      if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = sw;
        ctx.strokeText(l, x, top + i * lh);
      }
      ctx.fillStyle = fill;
      ctx.fillText(l, x, top + i * lh);
    });
  }

  function easeOut(t) { t = Math.min(1, Math.max(0, t)); return 1 - Math.pow(1 - t, 3); }
  function easeBack(t) {
    t = Math.min(1, Math.max(0, t));
    var c1 = 1.7, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  // 사진을 칸에 꽉 차게(가운데 기준) 그리기
  function drawCover(ctx, img, x, y, w, h, zoom) {
    var s = Photos.sizeOf(img);
    var r = Math.max(w / s.w, h / s.h) * (zoom || 1);
    var dw = s.w * r, dh = s.h * r;
    ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  }

  // ---------- 장면 ----------
  function drawTitle(ctx, sl, p, env) {
    var t = env.theme;
    ctx.drawImage(background(themePal(t), t.deco, 1), 0, 0);
    var k = 0.92 + 0.08 * easeOut(p * 3);   // 첫 화면부터 보이게 (카톡 미리보기 썸네일)
    if (env.settings.className) {
      ctx.font = Fonts.css(env.settings.bodyFont, 40);
      var tw = ctx.measureText(env.settings.className).width + 70;
      ctx.fillStyle = '#FFFFFF';
      rr(ctx, (W - tw) / 2, 120, tw, 76, 38);
      ctx.fill();
      ctx.fillStyle = t.text;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(env.settings.className, W / 2, 160);
    }
    var cx = W / 2, cy = 560, R = 230;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(k, k);
    ctx.fillStyle = t.line;
    ctx.beginPath(); ctx.arc(0, 0, R + 26, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.arc(0, 0, R + 16, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.clip();
    if (sl.img) drawCover(ctx, sl.img, -R, -R, R * 2, R * 2, 1 + 0.04 * p);
    else { ctx.fillStyle = t.soft; ctx.fillRect(-R, -R, R * 2, R * 2); }
    ctx.restore();
    heart(ctx, cx + 200, cy - 190, 0.9 * k, t.sticker);
    star(ctx, cx - 215, cy + 175, 30 * k, '#FFD66B', 0.3);
    var tk = easeOut(p * 3);
    var ft = fitText(ctx, sl.title, env.settings.titleFont, 100, 640, 2);
    ctx.font = Fonts.css(env.settings.titleFont, ft.px);
    drawLines(ctx, ft.lines, W / 2, 975 + (1 - tk) * 16, ft.px * 1.2, t.text, '#FFFFFF', 16);
  }

  function drawSeason(ctx, sl, p, env) {
    var s = SEASONS[sl.season];
    ctx.drawImage(background(seasonPal(s), s.icon, 5 + Object.keys(SEASONS).indexOf(sl.season)), 0, 0);
    var k = easeBack(p * 2.6);
    ctx.save();
    ctx.translate(W / 2, 500);
    ctx.scale(k * 3.2, k * 3.2);
    deco(ctx, s.icon, 0, 0, 1, s.main, s.sub, 0.2);
    ctx.restore();
    ctx.globalAlpha = easeOut(p * 3);
    ctx.font = Fonts.css(env.settings.titleFont, 200);
    drawLines(ctx, [sl.season], W / 2, 830, 200, s.text, '#FFFFFF', 22);
    ctx.globalAlpha = 1;
  }

  function drawPhoto(ctx, sl, p, env) {
    var t = env.theme;
    ctx.drawImage(background(themePal(t), t.deco, 2 + sl.idx % 3), 0, 0);
    var img = sl.img;
    var s = Photos.sizeOf(img);
    var a = s.w / s.h, maxW = 600, maxH = 860;
    var cw, ch;
    if (a > maxW / maxH) { cw = maxW; ch = cw / a; } else { ch = maxH; cw = ch * a; }
    var cx = W / 2, cy = 600;
    var k = 0.94 + 0.06 * easeOut(p * 4);
    var tilt = (sl.idx % 2 ? 1 : -1) * 1.8 * Math.PI / 180;
    var pad = 18;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(tilt);
    ctx.scale(k, k);
    ctx.fillStyle = t.line;
    rr(ctx, -cw / 2 - pad - 6, -ch / 2 - pad - 6, cw + pad * 2 + 12, ch + pad * 2 + 12, 40);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    rr(ctx, -cw / 2 - pad, -ch / 2 - pad, cw + pad * 2, ch + pad * 2, 34);
    ctx.fill();
    ctx.save();
    rr(ctx, -cw / 2, -ch / 2, cw, ch, 20);
    ctx.clip();
    drawCover(ctx, img, -cw / 2, -ch / 2, cw, ch, 1 + 0.06 * p);
    ctx.restore();
    if (sl.idx % 2) heart(ctx, cw / 2 - 6, -ch / 2 + 6, 0.85, t.sticker);
    else star(ctx, cw / 2 - 4, -ch / 2 + 4, 40, '#FFD66B', 0.25);
    ctx.restore();
    if (sl.date) {
      var dy = Math.min(H - 70, cy + ch / 2 + pad + 80);
      ctx.font = Fonts.css(env.settings.bodyFont, 44);
      drawLines(ctx, [sl.date], W / 2, dy, 44, t.text, '#FFFFFF', 10);
    }
  }

  function drawEnd(ctx, sl, p, env) {
    var t = env.theme;
    ctx.drawImage(background(themePal(t), t.deco, 9), 0, 0);
    var k = easeBack(p * 2.5) * (1 + 0.05 * Math.sin(p * Math.PI * 6));
    heart(ctx, W / 2, 420, 3.2 * k, t.sticker);
    ctx.globalAlpha = easeOut((p - 0.1) * 3);
    var ft = fitText(ctx, sl.text, env.settings.titleFont, 80, 620, 4);
    ctx.font = Fonts.css(env.settings.titleFont, ft.px);
    drawLines(ctx, ft.lines, W / 2, 760, ft.px * 1.3, t.text, '#FFFFFF', 14);
    if (sl.from) {
      ctx.font = Fonts.css(env.settings.bodyFont, 46);
      drawLines(ctx, [sl.from], W / 2, 1080, 46, t.text, '#FFFFFF', 10);
    }
    ctx.globalAlpha = 1;
  }

  function render(ctx, sl, p, env) {
    if (sl.type === 'title') drawTitle(ctx, sl, p, env);
    else if (sl.type === 'season') drawSeason(ctx, sl, p, env);
    else if (sl.type === 'photo') drawPhoto(ctx, sl, p, env);
    else drawEnd(ctx, sl, p, env);
  }

  return { W: W, H: H, THEMES: THEMES, render: render };
})();
