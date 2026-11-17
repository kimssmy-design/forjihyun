// app.js — 화면 연결 (설정, 아이 목록, 사진 칸, 만들기·미리보기·한꺼번에 만들기)
var App = (function () {
  var $ = function (id) { return document.getElementById(id); };
  var own = [], common = [];
  var photoTarget = 'own';
  var cancelFlag = false;
  var result = null;       // {blob, ext, tl, child}
  var previewCtl = null;
  var resultUrl = null;

  // ---------- 공통 ----------
  var toastTimer = null;
  function toast(msg, ms) {
    var t = $('toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, ms || 2600);
  }
  function openSheet(id) { $(id).hidden = false; }
  function closeSheet(id) {
    $(id).hidden = true;
    if (id === 'previewSheet' && previewCtl) { previewCtl.stop(); previewCtl = null; }
    if (id === 'resultSheet') { cancelFlag = true; $('resultVideo').pause(); }
  }
  function S() { return State.data.settings; }

  // ---------- 설정 ----------
  function seg(el, items, current, onPick) {
    el.innerHTML = '';
    items.forEach(function (it) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = it[1];
      if (String(it[0]) === String(current)) b.className = 'on';
      b.onclick = function () { onPick(it[0]); };
      el.appendChild(b);
    });
  }

  function renderSettings() {
    var s = S();
    $('sClass').value = s.className;
    $('sTitle').value = s.titleTpl;
    $('sEnd').value = s.endTpl;
    $('sFrom').value = s.from;
    $('sDrop').checked = !!s.dropSurname;
    $('sSeason').checked = !!s.seasons;
    renderFontBtns();
    var themes = Object.keys(Frames.THEMES).map(function (k) { return [k, Frames.THEMES[k].name]; });
    seg($('themeSeg'), themes, s.theme, function (v) { s.theme = v; State.save(); renderSettings(); });
    seg($('secSeg'), [[2, '2초'], [3, '3초'], [4, '4초'], [5, '5초']], s.photoSec, function (v) { s.photoSec = v; State.save(); renderSettings(); });
    seg($('musicSeg'), [['none', '없음'], ['orgel', '오르골'], ['tong', '통통'], ['file', '내 음악']], s.music, function (v) {
      if (v === 'file' && !s.musicName) { $('musicFile').click(); return; }
      s.music = v; State.save(); renderSettings();
    });
    $('musicName').textContent = s.musicName ? '내 음악: ' + s.musicName : '';
  }

  function renderFontBtns() {
    var s = S();
    var tb = $('titleFontBtn'), bb = $('bodyFontBtn');
    tb.textContent = Fonts.label(s.titleFont);
    tb.style.font = Fonts.css(s.titleFont, 18);
    bb.textContent = Fonts.label(s.bodyFont);
    bb.style.font = Fonts.css(s.bodyFont, 18);
  }

  function bindSettings() {
    function text(id, key) {
      $(id).addEventListener('input', function () { S()[key] = $(id).value; State.save(); });
    }
    text('sClass', 'className');
    text('sTitle', 'titleTpl');
    text('sEnd', 'endTpl');
    text('sFrom', 'from');
    $('sDrop').onchange = function () { S().dropSurname = $('sDrop').checked; State.save(); };
    $('sSeason').onchange = function () { S().seasons = $('sSeason').checked; State.save(); };
    $('titleFontBtn').onclick = function () {
      Fonts.openPicker('title', S().titleFont, function (k) { S().titleFont = k; State.save(); renderFontBtns(); });
    };
    $('bodyFontBtn').onclick = function () {
      Fonts.openPicker('body', S().bodyFont, function (k) { S().bodyFont = k; State.save(); renderFontBtns(); });
    };
    $('musicFile').onchange = function (e) {
      var f = e.target.files[0];
      e.target.value = '';
      if (!f) return;
      Music.setFile(f).then(function () { renderSettings(); toast('음악을 넣었어요'); })
        .catch(function () { toast('음악 파일을 저장하지 못했어요'); });
    };
    $('musicTry').onclick = async function () {
      if (S().music === 'none') { toast('배경음악이 "없음"이에요'); return; }
      try {
        var buf = await Music.build(8);
        if (!buf) { toast('음악 파일을 먼저 넣어 주세요'); return; }
        var ctx = new (window.AudioContext || window.webkitAudioContext)();
        var src = ctx.createBufferSource();
        src.buffer = buf; src.connect(ctx.destination); src.start();
        src.onended = function () { ctx.close(); };
      } catch (e) { toast('이 음악은 재생할 수 없어요'); }
    };
    $('panelToggle').onclick = function () { $('panel').classList.toggle('open'); };
  }

  // ---------- 아이 목록 ----------
  function renderChildren() {
    var list = Children.list();
    var sel = Children.selected();
    var box = $('childChips');
    box.innerHTML = '';
    if (!list.length) {
      var e = document.createElement('button');
      e.type = 'button';
      e.className = 'empty';
      e.innerHTML = '＋ 눌러서 아이 이름 넣기<small>여러 명을 한꺼번에 넣을 수 있어요</small>';
      e.onclick = openAddName;
      box.appendChild(e);
    }
    list.forEach(function (c) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'kid' + (c.done ? ' done' : '') + (sel && c.id === sel.id ? ' on' : '');
      b.textContent = (c.done ? '✓ ' : '') + c.name;
      b.onclick = function () { Children.select(c.id); refreshChild(); };
      box.appendChild(b);
    });
    var done = list.filter(function (c) { return c.done; }).length;
    $('doneCount').textContent = list.length ? '(' + done + ' / ' + list.length + ' 완성)' : '';
    $('childSection').hidden = !sel;
    $('makeBtn').textContent = sel ? '✨ ' + Children.callName(sel) + ' 영상 만들기' : '✨ 영상 만들기';
  }

  var nameMode = 'add';
  function openAddName() {
    nameMode = 'add';
    $('nameTitle').textContent = '아이 추가';
    $('nameInput').value = '';
    $('nameOk').textContent = '넣기';
    openSheet('nameSheet');
    setTimeout(function () { $('nameInput').focus(); }, 50);
  }

  function bindChildren() {
    $('addChildBtn').onclick = openAddName;
    $('renameBtn').onclick = function () {
      var c = Children.selected();
      if (!c) return;
      nameMode = 'rename';
      $('nameTitle').textContent = '이름 바꾸기';
      $('nameInput').value = c.name;
      $('nameOk').textContent = '바꾸기';
      openSheet('nameSheet');
    };
    $('nameOk').onclick = function () {
      var v = $('nameInput').value;
      if (nameMode === 'rename') {
        Children.rename(Children.selected().id, v.split(/\n/)[0]);
      } else {
        var n = Children.addNames(v);
        if (!n) { toast('이름을 넣어 주세요'); return; }
        toast(n + '명을 넣었어요');
      }
      closeSheet('nameSheet');
      refreshChild();
    };
    $('deleteChildBtn').onclick = async function () {
      var c = Children.selected();
      if (!c) return;
      if (!confirm(c.name + ' 아이와 사진을 모두 지울까요?')) return;
      own.forEach(function (p) { Photos.forget(p.id); });
      await Children.remove(c.id);
      refreshChild();
    };
  }

  // ---------- 사진 칸 ----------
  function tile(p, target) {
    var d = document.createElement('div');
    d.className = 'tile';
    d.innerHTML = '<img alt="">' + (p.exif ? '<span class="d"></span>' : '') + '<button type="button" class="rm" aria-label="사진 빼기">✕</button>';
    d.querySelector('img').src = Photos.thumb(p);
    if (p.exif) d.querySelector('.d').textContent = Photos.dateLabel(p.date);
    d.querySelector('.rm').onclick = async function () {
      await Photos.remove(p.id);
      if (target === 'own') {
        own = own.filter(function (x) { return x.id !== p.id; });
        Children.markDone(Children.selected().id, false);
      } else {
        common = common.filter(function (x) { return x.id !== p.id; });
      }
      renderGrids();
      renderChildren();
    };
    return d;
  }

  function renderGrid(el, list, target) {
    el.innerHTML = '';
    if (!list.length) {
      var e = document.createElement('button');
      e.type = 'button';
      e.className = 'empty';
      e.style.gridColumn = '1 / -1';
      e.innerHTML = target === 'own'
        ? '📷 눌러서 사진 넣기<small>여러 장을 한꺼번에 골라도 돼요 · 찍은 날짜순으로 정리돼요</small>'
        : '👫 눌러서 공통 사진 넣기<small>단체사진·행사 사진을 넣으면 모든 아이 영상에 들어가요</small>';
      e.onclick = function () { pickPhotos(target); };
      el.appendChild(e);
      return;
    }
    Photos.sortByDate(list).forEach(function (p) { el.appendChild(tile(p, target)); });
    var add = document.createElement('div');
    add.className = 'tile add';
    add.innerHTML = '<b>＋</b>사진 더 넣기';
    add.onclick = function () { pickPhotos(target); };
    el.appendChild(add);
  }

  function renderGrids() {
    var c = Children.selected();
    if (c) {
      $('childTitle').textContent = c.name + ' 사진';
      $('childSub').textContent = '사진 ' + own.length + '장 · 찍은 날짜순' + (common.length ? ' · 공통 사진 ' + common.length + '장 함께' : '') + (c.done ? ' · 완성 ✓' : '');
      renderGrid($('ownGrid'), own, 'own');
    }
    renderGrid($('commonGrid'), common, 'common');
  }

  function pickPhotos(target) {
    photoTarget = target;
    $('photoInput').click();
  }

  async function addPhotos(files, target) {
    var c = Children.selected();
    if (target === 'own' && !c) { toast('먼저 아이 이름을 넣어 주세요'); return; }
    var owner = target === 'own' ? c.id : 'common';
    var r = await Photos.addFiles(files, owner, function (i, n) { toast('사진 넣는 중 ' + i + ' / ' + n, 60000); });
    if (target === 'own') { own = own.concat(r.added); Children.markDone(c.id, false); }
    else common = common.concat(r.added);
    renderGrids();
    renderChildren();
    if (r.failed) toast(r.failed + '장은 열 수 없는 형식이에요 (HEIC는 JPG로 바꿔서 넣어 주세요)', 4000);
    else toast(r.added.length + '장을 넣었어요');
  }

  function bindPhotos() {
    $('photoInput').onchange = function (e) {
      var files = e.target.files;
      if (files && files.length) addPhotos(files, photoTarget).finally(function () { e.target.value = ''; });
    };
    // PC: 끌어다 놓기
    [['childSection', 'own'], [null, 'common']].forEach(function (pair) {
      var el = pair[0] ? $(pair[0]) : document.querySelector('.card.common');
      el.addEventListener('dragover', function (e) { e.preventDefault(); el.classList.add('drag'); });
      el.addEventListener('dragleave', function () { el.classList.remove('drag'); });
      el.addEventListener('drop', function (e) {
        e.preventDefault();
        el.classList.remove('drag');
        if (e.dataTransfer.files.length) addPhotos(e.dataTransfer.files, pair[1]);
      });
    });
  }

  async function refreshChild() {
    var c = Children.selected();
    own = c ? await Store.photosByOwner(c.id) : [];
    renderChildren();
    renderGrids();
  }

  // ---------- 만들기 ----------
  function fileName(c, ext) { return c.name + '_포토영상.' + ext; }

  function showWorking(title) {
    $('resultTitle').textContent = title;
    $('workCanvas').hidden = false;
    $('resultVideo').hidden = true;
    $('working').hidden = false;
    $('done').hidden = true;
    $('barFill').style.width = '0%';
    openSheet('resultSheet');
  }

  async function makeOne(c, onProgress) {
    var mine = await Store.photosByOwner(c.id);
    if (!mine.length && !common.length) throw new Error('사진을 먼저 넣어 주세요');
    var tl = await Player.build(c, mine, common);
    var audio = null;
    try { audio = await Music.build(tl.total); } catch (e) { toast('음악을 불러오지 못해 음악 없이 만들어요', 3000); }
    var r = await Exporter.make($('workCanvas'), tl, audio, onProgress, function () { return cancelFlag; });
    r.tl = tl;
    r.child = c;
    return r;
  }

  function guardFirst() {
    var c = Children.selected();
    if (!c) { toast('먼저 아이 이름을 넣어 주세요'); openAddName(); return null; }
    if (!own.length && !common.length) { toast('사진을 먼저 넣어 주세요'); return null; }
    return c;
  }

  async function onMake() {
    var c = guardFirst();
    if (!c) return;
    showWorking(Children.callName(c) + ' 영상 만드는 중');
    cancelFlag = false;
    $('workText').textContent = '영상 만드는 중… 화면을 켜 두세요';
    try {
      var r = await makeOne(c, function (p) {
        $('barFill').style.width = Math.round(p * 100) + '%';
        $('workText').textContent = '영상 만드는 중… ' + Math.round(p * 100) + '% · 화면을 켜 두세요';
      });
      if ($('resultSheet').hidden) return;
      Children.markDone(c.id, true);
      renderChildren();
      renderGrids();
      showDone(r);
    } catch (e) {
      if (e && e.cancelled) return;
      closeSheet('resultSheet');
      toast(e && e.message ? e.message : '영상을 만들지 못했어요', 4500);
    }
  }

  function showDone(r) {
    result = r;
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    resultUrl = URL.createObjectURL(r.blob);
    $('resultTitle').textContent = Children.callName(r.child) + ' 영상 완성!';
    $('workCanvas').hidden = true;
    var v = $('resultVideo');
    v.src = resultUrl;
    v.hidden = false;
    $('working').hidden = true;
    $('done').hidden = false;
    var mb = (r.blob.size / 1048576).toFixed(1);
    $('doneNote').textContent = (r.note ? r.note + ' ' : '') + '(' + mb + 'MB)' + (Exporter.isIOS ? ' · 저장할 때 \'동영상 저장\'을 눌러 주세요' : '');
    $('shareBtn').hidden = !Exporter.canShareFile(r.blob, fileName(r.child, r.ext));
    var next = nextChild(r.child.id);
    $('nextBtn').hidden = !next;
  }

  function nextChild(fromId) {
    var l = Children.list();
    var i = l.findIndex(function (c) { return c.id === fromId; });
    for (var k = 1; k <= l.length; k++) {
      var c = l[(i + k) % l.length];
      if (!c.done && c.id !== fromId) return c;
    }
    return null;
  }

  function bindResult() {
    $('saveBtn').onclick = function () {
      if (!result) return;
      Exporter.save(result.blob, fileName(result.child, result.ext)).then(function (how) {
        if (how === 'downloaded') toast('저장했어요');
      });
    };
    $('shareBtn').onclick = function () {
      if (!result) return;
      Exporter.share(result.blob, fileName(result.child, result.ext), Children.callName(result.child) + ' 포토 영상')
        .catch(function (e) { if (!e || e.name !== 'AbortError') toast('공유하지 못했어요. 저장한 뒤 보내 주세요'); });
    };
    $('coverBtn').onclick = async function () {
      if (!result) return;
      var blob = await Exporter.cover(result.tl);
      var name = result.child.name + '_대표사진.jpg';
      if (Exporter.isIOS && Exporter.canShareFile(blob, name)) {
        Exporter.share(blob, name, name).catch(function () {});
      } else {
        Exporter.download(blob, name);
        toast('대표 사진을 저장했어요');
      }
    };
    $('nextBtn').onclick = function () {
      var n = result && nextChild(result.child.id);
      closeSheet('resultSheet');
      if (n) { Children.select(n.id); refreshChild(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    };
    $('cancelBtn').onclick = function () { closeSheet('resultSheet'); toast('만들기를 멈췄어요'); };
  }

  // PC: 남은 아이 모두 만들기 (한 명씩 차례대로 저장)
  async function onBatch() {
    var list = [];
    for (var i = 0; i < Children.list().length; i++) {
      var c = Children.list()[i];
      if (c.done) continue;
      var mine = await Store.photosByOwner(c.id);
      if (mine.length) list.push(c);
    }
    if (!list.length) { toast('사진이 들어간, 아직 안 만든 아이가 없어요'); return; }
    if (!confirm(list.length + '명의 영상을 차례대로 만들고 저장할까요?\n(만드는 동안 이 창을 켜 두세요)')) return;
    var made = 0;
    showWorking('반 전체 만드는 중');
    cancelFlag = false;
    for (var k = 0; k < list.length; k++) {
      if (cancelFlag) break;
      var kid = list[k];
      try {
        var r = await makeOne(kid, function (p) {
          var all = (k + p) / list.length;
          $('barFill').style.width = Math.round(all * 100) + '%';
          $('workText').textContent = (k + 1) + ' / ' + list.length + ' · ' + kid.name + ' 만드는 중 (' + Math.round(p * 100) + '%)';
        });
        if (cancelFlag) break;
        Exporter.download(r.blob, fileName(kid, r.ext));
        Children.markDone(kid.id, true);
        made++;
        renderChildren();
        await new Promise(function (res) { setTimeout(res, 800); });
      } catch (e) {
        if (e && e.cancelled) break;
        toast(kid.name + ' 영상을 만들지 못했어요', 3000);
      }
    }
    closeSheet('resultSheet');
    await refreshChild();
    toast(made + '명의 영상을 저장했어요', 4000);
  }

  // ---------- 미리보기 ----------
  async function onPreview() {
    var c = guardFirst();
    if (!c) return;
    openSheet('previewSheet');
    $('previewText').textContent = '준비 중…';
    try {
      var tl = await Player.build(c, own, common);
      var audio = null;
      try { audio = await Music.build(tl.total); } catch (e) {}
      function start() {
        if (previewCtl) previewCtl.stop();
        previewCtl = Player.play($('previewCanvas'), tl, audio, function (t) {
          $('previewFill').style.width = Math.round(t / tl.total * 100) + '%';
          $('previewText').textContent = Math.floor(t) + '초 / ' + Math.round(tl.total) + '초 · 사진 ' + tl.photoCount + '장';
        });
      }
      $('replayBtn').onclick = start;
      if (!$('previewSheet').hidden) start();
    } catch (e) {
      closeSheet('previewSheet');
      toast('미리보기를 준비하지 못했어요');
    }
  }

  // ---------- 카톡 등 앱 안 브라우저 안내 ----------
  function checkInApp() {
    var ua = navigator.userAgent;
    if (/KAKAOTALK/i.test(ua)) {
      $('inappBanner').hidden = false;
      $('inappBtn').onclick = function () {
        location.href = 'kakaotalk://web/openExternal?url=' + encodeURIComponent(location.href);
      };
    } else if (/NAVER\(|Instagram|FBAN|FBAV|Line\//i.test(ua)) {
      $('inappBanner').hidden = false;
      $('inappText').textContent = '앱 안에서는 영상 저장이 안 될 수 있어요. 메뉴에서 "다른 브라우저로 열기"를 눌러 주세요.';
      $('inappBtn').hidden = true;
    }
  }

  async function init() {
    document.querySelectorAll('[data-close]').forEach(function (b) {
      b.onclick = function () { closeSheet(b.dataset.close); };
    });
    document.querySelectorAll('.sheet').forEach(function (sh) {
      sh.addEventListener('click', function (e) {
        if (e.target === sh && sh.id !== 'resultSheet') closeSheet(sh.id);
      });
    });
    $('helpBtn').onclick = function () { openSheet('helpSheet'); };
    $('makeBtn').onclick = onMake;
    $('previewBtn').onclick = onPreview;
    $('batchBtn').onclick = onBatch;
    checkInApp();
    Store.persist();
    await State.load();
    await Fonts.init();
    common = await Store.photosByOwner('common');
    bindSettings();
    bindChildren();
    bindPhotos();
    bindResult();
    renderSettings();
    await refreshChild();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(renderFontBtns);
  }

  return { init: init, toast: toast, openSheet: openSheet, closeSheet: closeSheet };
})();

App.init().catch(function (e) {
  console.error(e);
  alert('시작하지 못했어요. 브라우저를 최신으로 바꾸거나 다른 브라우저로 열어 주세요.');
});
