/* ============================================================
   Countdown lock. The site stays closed until UNLOCK_AT, then opens by itself.
   - Edit UNLOCK_AT to change the date. Time is given in UTC.
     Now: 3 January 2027, 00:00 WIB (UTC+7) = 2 January 2027, 17:00 UTC.
   - The current time is read from the web server's clock when possible,
     so changing the phone's clock does not open it early. If the server
     time can't be read (e.g. opening the file directly), the device clock is used.
   - The rest of the site (SCRIPTS below) is only loaded after the unlock.
   ============================================================ */
(function () {
  'use strict';
  var UNLOCK_AT = Date.UTC(2027, 0, 2, 17, 0, 0);
  var SCRIPTS = ['js/content.js', 'js/audio.js', 'js/script.js', 'js/extras.js', 'js/scene.js', 'js/gl3d.js', 'js/cake3d.js', 'js/cake.js', 'js/d3.js'];
  var HINTS = ['Eits, belum boleh dibuka.', 'Sabar ya, tinggal sebentar lagi.', 'Masih dibungkus rapi.', 'Hampir. Tapi belum.', 'Dikocok pun isinya tidak akan keluar.'];

  var offset = 0, loaded = false, root = document.documentElement;
  root.classList.add('locked'); // hide the site straight away so nothing flashes

  function loadSite() {
    if (loaded) return; loaded = true;
    SCRIPTS.forEach(function (src) { var s = document.createElement('script'); s.src = src; s.async = false; document.body.appendChild(s); });
  }
  function now() { return Date.now() + offset; }
  function ready(fn) { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn); else fn(); }

  function readServerClock(cb) {
    var done = false, t0 = Date.now();
    function finish(o) { if (done) return; done = true; cb(o); }
    setTimeout(function () { finish(0); }, 2500);
    try {
      fetch(location.pathname, { method: 'HEAD', cache: 'no-store' }).then(function (r) {
        var t = Date.parse(r.headers.get('Date') || '');
        finish(isNaN(t) ? 0 : t - (t0 + Date.now()) / 2);
      }).catch(function () { finish(0); });
    } catch (e) { finish(0); }
  }

  readServerClock(function (o) {
    offset = o;
    ready(function () {
      if (now() >= UNLOCK_AT) { root.classList.remove('locked'); loadSite(); return; }
      showLock();
    });
  });

  function showLock() {
    var el = document.createElement('div');
    el.id = 'lock'; el.setAttribute('role', 'main');
    var stars = '';
    for (var i = 0; i < 38; i++) stars += '<i style="left:' + (Math.random() * 100).toFixed(1) + '%;top:' + (Math.random() * 100).toFixed(1) + '%;animation-delay:' + (Math.random() * 4).toFixed(1) + 's;animation-duration:' + (3 + Math.random() * 3).toFixed(1) + 's"></i>';
    el.innerHTML =
      '<div class="stars" aria-hidden="true">' + stars + '</div>' +
      '<p class="lk-eyebrow">For Natan</p>' +
      '<button class="gift" type="button" aria-label="Hadiah, belum bisa dibuka">' +
        '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
          '<rect x="14" y="40" width="72" height="48" rx="4"/><rect x="10" y="28" width="80" height="14" rx="4"/>' +
          '<path d="M50 28v60M50 28c-6-14-24-14-22-4 1 6 12 6 22 4zM50 28c6-14 24-14 22-4-1 6-12 6-22 4z"/></svg></button>' +
      '<h1>Belum waktunya dibuka</h1>' +
      '<p class="lk-sub">Ada sesuatu yang sedang menunggumu. Hadiah ini baru bisa dibuka pada <b>3 Januari 2027</b>.</p>' +
      '<div class="cd" role="timer" aria-label="Hitung mundur"><div><b id="lkD">--</b><span>Hari</span></div><div><b id="lkH">--</b><span>Jam</span></div><div><b id="lkM">--</b><span>Menit</span></div><div><b id="lkS">--</b><span>Detik</span></div></div>' +
      '<p class="lk-hint" id="lkHint" aria-live="polite"></p>' +
      '<p class="lk-foot">Sampai ketemu di hari ulang tahunmu ♡</p>';
    document.body.appendChild(el);

    var q = function (id) { return document.getElementById(id); }, hintI = 0, timer;
    var gift = el.querySelector('.gift');
    gift.addEventListener('click', function () {
      gift.classList.remove('shake'); void gift.offsetWidth; gift.classList.add('shake');
      q('lkHint').textContent = HINTS[hintI++ % HINTS.length];
    });

    function tick() {
      var left = UNLOCK_AT - now();
      if (left <= 0) { clearInterval(timer); open(); return; }
      var s = Math.floor(left / 1000);
      q('lkD').textContent = Math.floor(s / 86400);
      q('lkH').textContent = String(Math.floor(s % 86400 / 3600)).padStart(2, '0');
      q('lkM').textContent = String(Math.floor(s % 3600 / 60)).padStart(2, '0');
      q('lkS').textContent = String(s % 60).padStart(2, '0');
    }
    function open() {
      el.querySelector('h1').textContent = 'Selamat ulang tahun, Natan ♡';
      q('lkHint').textContent = 'Sudah waktunya…';
      loadSite();
      setTimeout(function () { el.classList.add('leave'); root.classList.remove('locked'); setTimeout(function () { el.remove(); }, 1000); }, 1800);
    }
    tick(); timer = setInterval(tick, 1000);
  }
})();
