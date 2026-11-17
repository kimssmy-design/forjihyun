// photo-menu.js — 사진을 눌렀을 때: 대표 사진, 사진별 글, 다른 아이에게도 넣기·옮기기, 빼기
var PhotoMenu = (function () {
  var $ = function (id) { return document.getElementById(id); };
  var textTimer = null;

  // 아이 고르기 창 (multi: 여러 명 체크 / 한 명 고르기)
  function pickKids(title, okLabel, multi) {
    return new Promise(function (resolve) {
      var cur = Children.selected();
      var others = Children.list().filter(function (c) { return !cur || c.id !== cur.id; });
      $('pickTitle').textContent = title;
      $('pickOk').textContent = okLabel;
      var box = $('pickList');
      box.innerHTML = '';
      others.forEach(function (c) {
        var l = document.createElement('label');
        l.className = 'pick';
        l.innerHTML = '<input type="' + (multi ? 'checkbox' : 'radio') + '" name="pickKid"><span></span>';
        l.querySelector('input').value = c.id;
        l.querySelector('span').textContent = c.name;
        box.appendChild(l);
      });
      if (multi && others.length > 1) {
        var all = document.createElement('button');
        all.type = 'button';
        all.className = 'link';
        all.textContent = '모두 고르기';
        all.onclick = function () { box.querySelectorAll('input').forEach(function (i) { i.checked = true; }); };
        box.appendChild(all);
      }
      var done = false;
      $('pickOk').onclick = function () {
        var ids = Array.prototype.map.call(box.querySelectorAll('input:checked'), function (i) { return i.value; });
        if (!ids.length) { App.toast('아이를 골라 주세요'); return; }
        done = true;
        App.closeSheet('pickSheet');
        resolve(ids);
      };
      App.onClose('pickSheet', function () { if (!done) resolve([]); });
      App.openSheet('pickSheet');
    });
  }

  // target: 'own' 또는 'common', onChange(종류): 화면 새로 그리기
  function open(p, target, isCover, onChange) {
    var c = Children.selected();
    var isOwn = target === 'own';
    var hasOthers = Children.list().length > 1;
    $('photoView').src = Photos.thumb(p);

    // 사진별 글
    var useText = State.data.settings.photoTextOn;
    $('photoTextBox').hidden = !useText;
    $('photoText').value = p.text || '';
    $('photoTextHint').textContent = isOwn ? '쓰면 응원 문구 대신 이 글이 나와요' : '공통 사진이라 모든 아이 영상에 같은 글이 나와요';
    $('photoText').oninput = function () {
      clearTimeout(textTimer);
      var v = $('photoText').value.trim();
      textTimer = setTimeout(function () { Photos.setText(p, v).then(function () { onChange('text'); }); }, 400);
    };

    var cb = $('coverSetBtn');
    cb.hidden = !isOwn;
    cb.textContent = isCover ? '★ 지금 대표 사진이에요' : '★ 대표 사진으로 정하기';
    cb.onclick = function () {
      Children.setCover(c.id, p.id);
      Children.markDone(c.id, false);
      App.closeSheet('photoSheet');
      onChange('cover');
      App.toast('대표 사진으로 정했어요');
    };

    $('photoMoveRow').hidden = !(isOwn && hasOthers);
    $('copyBtn').onclick = async function () {
      App.closeSheet('photoSheet');
      var ids = await pickKids('다른 아이에게도 넣기', '넣기', true);
      if (!ids.length) return;
      for (var i = 0; i < ids.length; i++) {
        await Photos.copyTo(p, ids[i]);
        Children.markDone(ids[i], false);
      }
      onChange('copy');
      App.toast(ids.length + '명에게 넣었어요');
    };
    $('moveBtn').onclick = async function () {
      App.closeSheet('photoSheet');
      var ids = await pickKids('다른 아이로 옮기기', '옮기기', false);
      if (!ids.length) return;
      if (c.coverId === p.id) Children.setCover(c.id, null);
      await Photos.moveTo(p, ids[0]);
      Children.markDone(c.id, false);
      Children.markDone(ids[0], false);
      onChange('move', p);
      App.toast(Children.get(ids[0]).name + '에게 옮겼어요');
    };

    $('photoDelBtn').onclick = function () { App.closeSheet('photoSheet'); onChange('delete', p); };
    App.openSheet('photoSheet');
  }

  return { open: open };
})();
