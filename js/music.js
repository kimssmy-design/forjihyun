// music.js — 배경음악 만들기 (직접 만든 짧은 멜로디 또는 내가 넣은 음악 파일)
var Music = (function () {
  var SR = 44100;

  // 저작권 걱정 없는 자체 제작 멜로디 (8분음표 단위, null = 쉼표)
  var MELODIES = {
    orgel: {
      name: '오르골', bpm: 96, wave: 'sine', decay: 1.4, vol: 0.32,
      notes: [76, 79, 84, 79, 81, 79, 76, null, 74, 76, 79, 76, 74, 72, 74, null,
        76, 79, 81, 84, 81, 79, 76, 79, 74, 76, 74, 72, null, null, 72, null],
      bass: [48, 45, 41, 43]
    },
    tong: {
      name: '통통', bpm: 120, wave: 'triangle', decay: 0.35, vol: 0.4,
      notes: [72, null, 76, null, 79, null, 76, null, 81, null, 79, null, 76, null, 74, null,
        72, 74, 76, 79, 81, 79, 76, 74, 72, null, 67, null, 72, null, null, null],
      bass: [48, 53, 45, 43]
    }
  };

  function freq(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  function note(ctx, out, m, t, mel, vol) {
    var o = ctx.createOscillator();
    var g = ctx.createGain();
    o.type = mel.wave;
    o.frequency.value = freq(m);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + mel.decay);
    o.connect(g);
    g.connect(out);
    o.start(t);
    o.stop(t + mel.decay + 0.05);
    if (mel.wave === 'sine') { // 오르골 느낌의 맑은 배음
      var o2 = ctx.createOscillator();
      var g2 = ctx.createGain();
      o2.frequency.value = freq(m) * 3;
      g2.gain.setValueAtTime(0.0001, t);
      g2.gain.exponentialRampToValueAtTime(vol * 0.12, t + 0.004);
      g2.gain.exponentialRampToValueAtTime(0.0001, t + mel.decay * 0.4);
      o2.connect(g2); g2.connect(out);
      o2.start(t); o2.stop(t + mel.decay * 0.4 + 0.05);
    }
  }

  function melody(ctx, out, mel, duration) {
    var step = 60 / mel.bpm / 2;
    var i = 0;
    for (var t = 0.15; t < duration; t += step, i++) {
      var m = mel.notes[i % mel.notes.length];
      if (m) note(ctx, out, m, t, mel, mel.vol);
      if (i % 8 === 0) note(ctx, out, mel.bass[(i / 8) % mel.bass.length], t, mel, mel.vol * 0.7);
    }
  }

  function decodeOn(ctx, buf) {
    return new Promise(function (resolve, reject) {
      var r = ctx.decodeAudioData(buf, resolve, reject);
      if (r && r.then) r.then(resolve, reject);
    });
  }

  function renderOffline(ctx) {
    return new Promise(function (resolve, reject) {
      ctx.oncomplete = function (e) { resolve(e.renderedBuffer); };
      var r = ctx.startRendering();
      if (r && r.then) r.then(resolve, reject);
    });
  }

  // 영상 길이에 맞춘 음악(AudioBuffer). 음악 없음이면 null
  async function build(duration) {
    var s = State.data.settings;
    if (s.music === 'none') return null;
    var Off = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!Off) return null;
    var ctx = new Off(2, Math.ceil(duration * SR), SR);
    var master = ctx.createGain();
    master.connect(ctx.destination);
    var end = Math.max(0.5, duration);
    master.gain.setValueAtTime(0, 0);
    master.gain.linearRampToValueAtTime(0.9, Math.min(0.4, end / 2));
    master.gain.setValueAtTime(0.9, Math.max(0.5, end - 2.5));
    master.gain.linearRampToValueAtTime(0, end);

    if (s.music === 'file') {
      var rec = await Store.get('music');
      if (!rec || !rec.blob) return null;
      var audio = await decodeOn(ctx, await rec.blob.arrayBuffer());
      var src = ctx.createBufferSource();
      src.buffer = audio;
      src.loop = true;
      src.connect(master);
      src.start(0);
    } else {
      melody(ctx, master, MELODIES[s.music] || MELODIES.orgel, duration);
    }
    return renderOffline(ctx);
  }

  async function setFile(file) {
    await Store.set('music', { name: file.name, blob: file });
    State.data.settings.music = 'file';
    State.data.settings.musicName = file.name;
    State.save();
  }

  return { MELODIES: MELODIES, build: build, setFile: setFile };
})();
