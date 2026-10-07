/* Cocoon · service worker
   Réseau d'abord SANS cache HTTP (toujours la dernière version mise en ligne),
   copie locale seulement si pas de connexion. */
const CACHE = "cocoon-v3";
self.addEventListener("install", e => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())
));
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return;
  e.respondWith(fetch(e.request.url, { cache: "no-cache", credentials: "same-origin" }).then(r => {
    if (r.ok) { const c = r.clone(); caches.open(CACHE).then(k => k.put(e.request, c)); }
    return r;
  }).catch(() => caches.match(e.request).then(r => r || caches.match("./"))));
});
