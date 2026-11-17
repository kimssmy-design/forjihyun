// storage.js — 모든 자료는 이 기기 안(IndexedDB)에만 저장돼요. 서버로 보내지 않아요.
var Store = (function () {
  var DB_NAME = 'daycare-photo-video';
  var VERSION = 1;
  var dbPromise = null;

  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve, reject) {
      var req = indexedDB.open(DB_NAME, VERSION);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
        if (!db.objectStoreNames.contains('photos')) {
          var s = db.createObjectStore('photos', { keyPath: 'id' });
          s.createIndex('owner', 'owner');
        }
        if (!db.objectStoreNames.contains('fonts')) db.createObjectStore('fonts', { keyPath: 'family' });
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
    return dbPromise;
  }

  function run(storeName, mode, fn) {
    return open().then(function (db) {
      return new Promise(function (resolve, reject) {
        var t = db.transaction(storeName, mode);
        var s = t.objectStore(storeName);
        var result;
        var r = fn(s);
        if (r) r.onsuccess = function () { result = r.result; };
        t.oncomplete = function () { resolve(result); };
        t.onerror = function () { reject(t.error); };
        t.onabort = function () { reject(t.error); };
      });
    });
  }

  return {
    get: function (key) { return run('kv', 'readonly', function (s) { return s.get(key); }); },
    set: function (key, val) { return run('kv', 'readwrite', function (s) { return s.put(val, key); }); },
    del: function (key) { return run('kv', 'readwrite', function (s) { return s.delete(key); }); },

    putPhoto: function (p) { return run('photos', 'readwrite', function (s) { return s.put(p); }); },
    deletePhoto: function (id) { return run('photos', 'readwrite', function (s) { return s.delete(id); }); },
    photosByOwner: function (owner) {
      return run('photos', 'readonly', function (s) { return s.index('owner').getAll(owner); })
        .then(function (list) { return list || []; });
    },
    deleteOwner: function (owner) {
      return run('photos', 'readwrite', function (s) {
        var req = s.index('owner').openCursor(owner);
        req.onsuccess = function () {
          var c = req.result;
          if (c) { c.delete(); c.continue(); }
        };
        return null;
      });
    },

    putFont: function (f) { return run('fonts', 'readwrite', function (s) { return s.put(f); }); },
    clearPhotos: function () { return run('photos', 'readwrite', function (s) { return s.clear(); }); },
    allPhotos: function () {
      return run('photos', 'readonly', function (s) { return s.getAll(); }).then(function (l) { return l || []; });
    },
    allFonts: function () {
      return run('fonts', 'readonly', function (s) { return s.getAll(); })
        .then(function (list) { return list || []; });
    },

    // 브라우저가 저장 공간을 함부로 지우지 않도록 요청
    persist: function () {
      try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}
    }
  };
})();

// 설정·아이 목록 상태 (자동 저장)
var State = (function () {
  var DEFAULTS = {
    className: '',
    titleTpl: '{이름}의 1년',
    endTpl: '{이름아}, 한 해 동안 고마웠어. 사랑해!',
    from: '선생님이',
    dropSurname: true,
    titleFont: 'b:Jua',
    bodyFont: 'b:Gowun Dodum',
    theme: 'cloud',
    seasons: true,
    order: 'date',        // date: 날짜순, shuffle: 골고루 섞기
    shuffleSeed: 1,
    captionsOn: true,
    personalOn: false,    // 아이별 한마디
    photoTextOn: false,   // 사진별 글
    captions: null,       // null이면 기본 문구
    photoSec: 3,
    music: 'picnic',
    musicName: ''
  };
  var data = { settings: Object.assign({}, DEFAULTS), children: [], selectedId: null };
  var timer = null;

  function load() {
    return Store.get('state').then(function (saved) {
      if (saved) {
        data.settings = Object.assign({}, DEFAULTS, saved.settings || {});
        data.children = saved.children || [];
        data.selectedId = saved.selectedId || null;
        // 예전 기본 멜로디(오르골·통통)는 새 기본 곡으로 바꿔요
        if (data.settings.music === 'orgel' || data.settings.music === 'tong') data.settings.music = 'picnic';
      }
      return data;
    }).catch(function () { return data; });
  }

  function save() {
    clearTimeout(timer);
    timer = setTimeout(function () {
      Store.set('state', JSON.parse(JSON.stringify(data))).catch(function () {});
    }, 300);
  }

  // 바로 저장 (불러오기 직후처럼 기다려야 할 때)
  function saveNow() {
    clearTimeout(timer);
    return Store.set('state', JSON.parse(JSON.stringify(data)));
  }

  return { data: data, load: load, save: save, saveNow: saveNow, DEFAULTS: DEFAULTS };
})();
