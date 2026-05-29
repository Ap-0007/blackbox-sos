const CACHE = 'blackbox-v1';
const STATIC = ['/', '/index.html', '/user.html', '/bystander.html', '/ambulance.html'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(STATIC)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) =>
    Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Overpass API — network with 6s timeout, fall back to cache
  if (url.hostname === 'overpass-api.de') {
    e.respondWith(
      Promise.race([
        fetch(e.request.clone()).then((res) => {
          if (res.ok) caches.open(CACHE).then((c) => c.put(e.request, res.clone()));
          return res;
        }),
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 6000)),
      ]).catch(() => caches.match(e.request))
    );
    return;
  }

  // Nominatim reverse-geocode — network with timeout, cache fallback
  if (url.hostname === 'nominatim.openstreetmap.org') {
    e.respondWith(
      fetch(e.request.clone(), { headers: { 'User-Agent': 'BlackBoxSOS/1.0' } })
        .then((res) => { caches.open(CACHE).then((c) => c.put(e.request, res.clone())); return res; })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Static assets — cache first
  if (STATIC.some((p) => url.pathname === p || url.pathname.endsWith('.html'))) {
    e.respondWith(caches.match(e.request).then((cached) => cached || fetch(e.request)));
    return;
  }

  // Everything else — network first
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
