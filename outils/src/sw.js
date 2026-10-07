/* Cocoon · service worker
   - Pages et fichiers du site : réseau d'abord SANS cache HTTP (toujours la dernière version),
     copie locale si pas de réseau ou si le réseau traîne (plus de 4 s).
   - Bibliothèques et polices (versions figées) : copie locale d'abord.
   Résultat : l'app s'ouvre et fonctionne même hors connexion. */
const CACHE = "cocoon-v4";
const STATIC = /^https:\/\/(cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com)\//;
self.addEventListener("install", e => { self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(["./", "./cocoon-runtime.js", "./config.js"]).catch(() => {}))); });
self.addEventListener("activate", e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())
));
self.addEventListener("fetch", e => {
  const req = e.request; if (req.method !== "GET") return;
  const u = new URL(req.url);
  if (STATIC.test(req.url)) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
      if (r.ok || r.type === "opaque") { const c = r.clone(); caches.open(CACHE).then(k => k.put(req, c)); }
      return r;
    })));
    return;
  }
  if (u.origin !== location.origin) return;
  const key = req.mode === "navigate" ? "./" : req;
  e.respondWith(new Promise(resolve => {
    let done = false;
    const fallback = () => caches.match(key, { ignoreSearch: req.mode === "navigate" }).then(r => r || caches.match("./"));
    const t = setTimeout(() => fallback().then(r => { if (r && !done) { done = true; resolve(r); } }), 4000);
    fetch(req.url, { cache: "no-cache", credentials: "same-origin" }).then(r => {
      if (r.ok) { const c = r.clone(); caches.open(CACHE).then(k => k.put(key, c)); }
      clearTimeout(t); if (!done) { done = true; resolve(r); }
    }).catch(() => { clearTimeout(t); fallback().then(r => { if (!done) { done = true; resolve(r || Response.error()); } }); });
  }));
});
