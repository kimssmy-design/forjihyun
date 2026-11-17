// children.js — 아이 목록(추가·이름 바꾸기·삭제·완성 표시)과 이름 부르기
var Children = (function () {
  function d() { return State.data; }
  function uid() { return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  function list() { return d().children; }

  function get(id) {
    var l = list();
    for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i];
    return null;
  }

  function selected() { return get(d().selectedId) || list()[0] || null; }

  // "김하늘, 이도윤" 또는 줄바꿈으로 여러 명 한꺼번에
  function addNames(text) {
    var names = String(text || '').split(/[\n,，、\t]+/).map(function (s) { return s.trim(); }).filter(Boolean);
    var first = null;
    names.forEach(function (n) {
      var c = { id: uid(), name: n.slice(0, 20), done: false };
      list().push(c);
      if (!first) first = c;
    });
    if (first) d().selectedId = first.id;
    State.save();
    return names.length;
  }

  function select(id) { d().selectedId = id; State.save(); }

  function rename(id, name) {
    var c = get(id);
    if (c && name.trim()) { c.name = name.trim().slice(0, 20); State.save(); }
  }

  async function remove(id) {
    var l = list();
    var i = l.findIndex(function (c) { return c.id === id; });
    if (i < 0) return;
    l.splice(i, 1);
    await Store.deleteOwner(id);
    d().selectedId = l[Math.max(0, i - 1)] ? l[Math.max(0, i - 1)].id : null;
    State.save();
  }

  function markDone(id, v) {
    var c = get(id);
    if (c) { c.done = v !== false; State.save(); }
  }

  // ---------- 이름 부르기 ----------
  function isHangul(s) { return /^[가-힣]+$/.test(s); }

  // 설정에 따라 성을 빼고 불러요 (세 글자 한글 이름만)
  function callName(c) {
    var n = c.name;
    if (State.data.settings.dropSurname && n.length === 3 && isHangul(n)) return n.slice(1);
    return n;
  }

  function hasBatchim(ch) {
    var code = ch.charCodeAt(0) - 0xAC00;
    if (code < 0 || code > 11171) return false;
    return code % 28 !== 0;
  }

  // {이름} → 서아, {이름아} → 서아야 / 하늘아
  function fill(tpl, c) {
    var n = callName(c);
    var last = n.charAt(n.length - 1);
    var a = isHangul(last) ? (hasBatchim(last) ? n + '아' : n + '야') : n;
    return String(tpl || '').replace(/\{이름아\}/g, a).replace(/\{이름\}/g, n);
  }

  return {
    list: list, get: get, selected: selected, addNames: addNames, select: select,
    rename: rename, remove: remove, markDone: markDone, callName: callName, fill: fill
  };
})();
