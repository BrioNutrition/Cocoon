/* Cocoon · service worker
   - Pages et fichiers du site : copie locale d'abord (l'app s'ouvre tout de suite, même sans réseau),
     et la dernière version est téléchargée en arrière-plan. Si elle a changé, l'app est prévenue
     et se recharge discrètement la prochaine fois qu'elle passe en arrière-plan.
   - Première visite (rien en cache) : réseau.
   - Bibliothèques et polices (versions figées) : copie locale d'abord. */
const CACHE = "cocoon-v6";
const STATIC = /^https:\/\/(cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com)\//;
self.addEventListener("install", e => { self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(["./", "./cocoon-runtime.js", "./config.js"]).catch(() => {}))); });
self.addEventListener("activate", e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())
));
const sig = (r) => r ? (r.headers.get("etag") || "") + "|" + (r.headers.get("last-modified") || "") + "|" + (r.headers.get("content-length") || "") : "";
let told = 0;
async function refresh(req, key) {
  const c = await caches.open(CACHE), old = await c.match(key, { ignoreSearch: req.mode === "navigate" });
  const r = await fetch(req.url, { cache: "no-cache", credentials: "same-origin" });
  if (!r.ok) return r;
  await c.put(key, r.clone());
  if (old && sig(old) !== sig(r) && Date.now() - told > 5000) {
    told = Date.now();
    const cs = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    cs.forEach((w) => w.postMessage({ cocoonUpdate: true }));
  }
  return r;
}
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
  e.respondWith(caches.match(key, { ignoreSearch: req.mode === "navigate" }).then(hit => {
    const net = refresh(req, key);
    if (hit) { e.waitUntil(net.catch(() => {})); return hit; }
    return net.catch(() => caches.match("./").then(r => r || Response.error()));
  }));
});

/* Notifications : affichage et ouverture de l'app au bon endroit */
self.addEventListener("push", e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch (_) { d = { body: e.data ? e.data.text() : "" }; }
  e.waitUntil(self.registration.showNotification(d.title || "Cocoon", {
    body: d.body || "", icon: "icon-192.png", badge: "icon-192.png", tag: d.tag || undefined,
    actions: Array.isArray(d.actions) ? d.actions.slice(0, 2) : undefined, data: { url: d.url || "./", acts: d.acts || null }
  }));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const D = e.notification.data || {}, act = e.action && D.acts && D.acts[e.action];
  const url = new URL(act || D.url || "./", self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(cs => {
    for (const c of cs) { if ("focus" in c) { c.postMessage({ cocoonGo: url }); return c.focus(); } }
    return self.clients.openWindow(url);
  }));
});
