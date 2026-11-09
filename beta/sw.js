// מטמון של קבצי האפליקציה, כדי שתיפתח גם בלי אינטרנט (הנתונים האחרונים נשמרים בנפרד בטלפון).
// הבקשות ל-Moodle לא עוברות כאן ולא נשמרות במטמון.
// the beta (…/beta/) and the regular app share one site: each keeps and cleans only its own cache
const CH = /\/beta\/$/.test(self.registration.scope) ? "beta-" : "";
const CACHE = "moodle-tasks-" + CH + "v18";
const SHELL = ["./", "index.html", "manifest.json", "icon-192.png", "icon-512.png", "apple-touch-icon.png"];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  const mine = k => CH ? k.startsWith("moodle-tasks-beta-") : !k.startsWith("moodle-tasks-beta-");
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && mine(k)).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== self.location.origin) return;
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(e.request, { ignoreSearch: true });
    const net = fetch(e.request).then(r => { if (r.ok) c.put(e.request, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  }));
});
