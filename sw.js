// 달빛마을 마피아 서비스 워커 — 한 번 열면 인터넷 없이도 실행되도록 파일을 저장해 둔다.
const CACHE = 'moonmafia-design-v22';
const SHELL = ['./mobile-design.css', './js/ui-icons.js', './', './index.html', './manifest.webmanifest', './js/main.js', './js/world.js', './js/host.js', './js/roles.js',
  './js/net.js', './js/config.js', './js/audio.js', './js/pass.js', './js/day3d.js', './icons/icon-192.png', './icons/icon-512.png',
  './vendor/three.module.js'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => null)))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Firebase 실시간 통신은 캐시하지 않는다
  if (/firebaseio|firebasedatabase|googleapis\.com\/identity/.test(url.hostname + url.pathname)) return;
  // 내 파일: 네트워크 우선(새 버전 반영), 실패하면 캐시
  if (url.origin === location.origin) {
    e.respondWith(fetch(req).then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); return r; }).catch(() => caches.match(req).then(r => r || caches.match('./index.html'))));
    return;
  }
  // 외부 라이브러리·글꼴: 캐시 우선
  e.respondWith(caches.match(req).then(r => r || fetch(req).then(res => { const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp)); return res; }).catch(() => r)));
});
