/**
 * KO|Apps - Service Worker (sw.js)
 * Android & Brave Mobile için %100 Çevrimdışı (Offline) Önbellekleme ve Hızlı Başlatma
 */

const CACHE_NAME = 'koapps-cache-v1';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/ankaragucu-logo.png',
  './icons/favicon.svg',
  './css/main.css',
  './css/themes.css',
  './css/widgets.css',
  './css/modal.css',
  './css/mobile.css',
  './js/utils.js',
  './js/storage.js',
  './js/search.js',
  './js/rss.js',
  './js/settings.js',
  './js/app.js',
  './js/widgets/ankaragucu.js',
  './js/widgets/weather.js',
  './js/widgets/finance.js',
  './js/widgets/todos.js',
  './js/widgets/shortcuts.js'
];

// Install: Statik dosyaları önbelleğe al
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Statik dosyalar önbelleğe alınıyor...');
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate: Eski önbellekleri temizle
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            console.log('[Service Worker] Eski önbellek siliniyor:', name);
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Stale-While-Revalidate stratejisi
self.addEventListener('fetch', (event) => {
  // Sadece HTTP/HTTPS GET isteklerini işle
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith('http')) return;

  // Dış API veya RSS isteklerini doğrudan ağdan çek, hata durumunda önbelleğe bak
  if (event.request.url.includes('/rss') || event.request.url.includes('api.open-meteo.com') || event.request.url.includes('allorigins')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // Statik dosyalar için: Önce önbellek, arka planda güncelleme
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
