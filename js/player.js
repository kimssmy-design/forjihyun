// player.js — 장면 순서(타임라인) 만들기, 시간에 맞춰 그리기, 미리보기 재생
var Player = (function () {
  var FADE = 0.6;          // 장면이 겹치며 바뀌는 시간(초)
  var DUR = { title: 3.5, season: 2.2, end: 4.5 };
  var buffer = null;

  function env() {
    var s = State.data.settings;
    return { settings: s, theme: Frames.THEMES[s.theme] || Frames.THEMES.cloud };
  }

  // child: 아이, own: 아이 사진, common: 공통 사진
  async function build(child, own, common) {
    var s = State.data.settings;
    var all = Photos.sortByDate(own.concat(common));
    var firstOwn = Photos.sortByDate(own)[0] || all[0];
    var slides = [];
    slides.push({ type: 'title', title: Children.fill(s.titleTpl, child), img: firstOwn ? await Photos.image(firstOwn) : null, dur: DUR.title });
    var last = null, idx = 0;
    for (var i = 0; i < all.length; i++) {
      var p = all[i];
      if (s.seasons) {
        var season = Photos.seasonOf(p.date);
        if (season !== last) { slides.push({ type: 'season', season: season, dur: DUR.season }); last = season; }
      }
      slides.push({ type: 'photo', img: await Photos.image(p), date: p.exif ? Photos.dateLabel(p.date) : '', idx: idx++, dur: +s.photoSec || 3 });
    }
    slides.push({ type: 'end', text: Children.fill(s.endTpl, child), from: [s.className, s.from].filter(Boolean).join(' '), dur: DUR.end });
    Photos.keepOnly(all.map(function (x) { return x.id; }));

    var t = 0;
    slides.forEach(function (sl, k) {
      sl.start = t;
      t += sl.dur - (k < slides.length - 1 ? FADE : 0);
    });

    // 캔버스에 쓸 글자를 미리 불러오기
    var titleText = slides.map(function (x) { return x.title || x.text || x.season || ''; }).join('');
    var bodyText = slides.map(function (x) { return (x.date || '') + (x.from || ''); }).join('') + (s.className || '') + '0123456789월일';
    await Promise.all([Fonts.ensure(s.titleFont, titleText + '가'), Fonts.ensure(s.bodyFont, bodyText + '가')]);

    return { slides: slides, total: t, photoCount: all.length };
  }

  function renderAt(ctx, tl, t) {
    var e = env();
    var sl = tl.slides, i = 0;
    while (i < sl.length - 1 && sl[i + 1].start <= t) i++;
    var cur = sl[i];
    var local = Math.min(1, Math.max(0, (t - cur.start) / cur.dur));
    if (i > 0 && t < cur.start + FADE) {
      var prev = sl[i - 1];
      Frames.render(ctx, prev, Math.min(1, (t - prev.start) / prev.dur), e);
      if (!buffer) {
        buffer = document.createElement('canvas');
        buffer.width = Frames.W; buffer.height = Frames.H;
      }
      var b = buffer.getContext('2d');
      Frames.render(b, cur, local, e);
      ctx.globalAlpha = (t - cur.start) / FADE;
      ctx.drawImage(buffer, 0, 0);
      ctx.globalAlpha = 1;
    } else {
      Frames.render(ctx, cur, local, e);
    }
    return i;
  }

  // 미리보기 재생 (영상 파일을 만들지 않고 화면에서만)
  function play(canvas, tl, audio, onTick) {
    var ctx = canvas.getContext('2d');
    var actx = null, src = null, stopped = false, t0 = performance.now();
    if (audio) {
      try {
        actx = new (window.AudioContext || window.webkitAudioContext)();
        src = actx.createBufferSource();
        src.buffer = audio;
        src.connect(actx.destination);
        src.start();
      } catch (e) { actx = null; }
    }
    function now() { return (performance.now() - t0) / 1000; }
    function loop() {
      if (stopped) return;
      var t = Math.min(tl.total, now());
      var i = renderAt(ctx, tl, t);
      if (onTick) onTick(t, i);
      if (t >= tl.total) { stop(); return; }
      requestAnimationFrame(loop);
    }
    function stop() {
      if (stopped) return;
      stopped = true;
      try { if (src) src.stop(); } catch (e) {}
      try { if (actx) actx.close(); } catch (e) {}
      if (onTick) onTick(tl.total, -1);
    }
    requestAnimationFrame(loop);
    return { stop: stop };
  }

  return { build: build, renderAt: renderAt, play: play, FADE: FADE };
})();
