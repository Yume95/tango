// Offline cache. App files: serve from cache, refresh in the background.
// dict.json (large): download once into its own cache and keep it.
const CACHE = "tango-v5";
const DICT_CACHE = "tango-dict-2021";
const SHELL = ["./", "index.html", "manifest.webmanifest", "apple-touch-icon.png", "icon-192.png", "icon-512.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL))); self.skipWaiting(); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== DICT_CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin || url.pathname.endsWith("/inbox.json")) return;
  if (url.pathname.endsWith("/dict.json")) {
    e.respondWith(caches.open(DICT_CACHE).then(async c => {
      const hit = await c.match(e.request);
      if (hit) return hit;
      const r = await fetch(e.request);
      if (r.ok) c.put(e.request, r.clone());
      return r;
    }));
    return;
  }
  // Network first so a new version shows up on the next open; cache only when offline.
  e.respondWith(caches.open(CACHE).then(c =>
    fetch(e.request, { cache: "no-cache" })
      .then(r => { if (r.ok) c.put(e.request, r.clone()); return r; })
      .catch(async () => (await c.match(e.request)) || (await c.match("index.html")))
  ));
});
