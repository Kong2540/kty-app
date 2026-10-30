/* Service worker: เก็บหน้าแอปไว้ในเครื่อง + รับแจ้งเตือน Push ขณะปิดแอป */
const CACHE = 'kty-app-v2.1';
const SHELL = ['./', './index.html', './app.js', './config.js', './manifest.webmanifest', './icon.svg', './icon-192.png', './icon-512.png'];
try {
  importScripts('config.js');
  if (self.KTY_CONFIG && self.KTY_CONFIG.FIREBASE) {
    importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js', 'https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');
    firebase.initializeApp(self.KTY_CONFIG.FIREBASE);
    firebase.messaging(); // แสดงแจ้งเตือนและเปิดลิงก์เมื่อกด โดย Firebase จัดการให้
  }
} catch (e) { /* ไม่มี Firebase ก็ยังใช้แอปได้ตามปกติ */ }
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); return r; }).catch(() => caches.match(e.request).then(r => r || caches.match('./index.html'))));
});
