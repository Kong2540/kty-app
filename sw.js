/* Service worker: เก็บหน้าแอปไว้ในเครื่อง เปิดเร็วขึ้น (ไม่แคชข้อมูลจาก API) */
const CACHE = 'kty-app-v1.0';
const SHELL = ['./', './index.html', './config.js', './manifest.webmanifest', './icon.svg', './icon-192.png', './icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return; // API และฟอนต์ไปตรงเครือข่าย
  // เครือข่ายก่อน ถ้าออฟไลน์ใช้ของในเครื่อง (ได้โค้ดใหม่เสมอเมื่อมีเน็ต)
  e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); return r; }).catch(() => caches.match(e.request).then(r => r || caches.match('./index.html'))));
});
