// מטמון של קבצי האפליקציה, כדי שתיפתח גם בלי אינטרנט (הנתונים האחרונים נשמרים בנפרד בטלפון).
// הבקשות ל-Moodle לא עוברות כאן ולא נשמרות במטמון.
// the beta (…/beta/) and the regular app share one site: each keeps and cleans only its own cache
const CH = /\/beta\/$/.test(self.registration.scope) ? "beta-" : "";
const CACHE = "moodle-tasks-" + CH + "v116";
const SHELL = ["./", "index.html", "manifest.json", "icon-192.png", "icon-512.png", "icon-any-192.png", "icon-any-512.png", "apple-touch-icon.png", "favicon-64.png", "badge-96.png", "logo.svg"];
self.addEventListener("install", e => {
  // "reload": straight from the site, not from the browser's own 10-minute cache (else a new version could install an old page)
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: "reload" })))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  const mine = k => CH ? k.startsWith("moodle-tasks-beta-") : !k.startsWith("moodle-tasks-beta-");
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && mine(k)).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== self.location.origin) return;
  if (/\.mp4$/.test(u.pathname)) return;      // videos go straight to the network (phones ask for them in byte ranges)
  const doc = e.request.mode === "navigate" || /\/(index\.html)?$/.test(u.pathname);
  const fresh = e.request.cache === "reload" || e.request.cache === "no-store";      // "check for a new version": the network's answer, kept
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(e.request, { ignoreSearch: true });
    // fetched again every time (checked with the site, cheap when unchanged) and kept for the next open
    const net = fetch(e.request.url, { cache: "no-cache", credentials: "same-origin" }).then(async r => {
      if (r.ok) {
        if (doc && hit && !fresh) {                    // the page itself changed: tell the open app a new version is ready
          const [a, b] = await Promise.all([c.match(e.request, { ignoreSearch: true }).then(x => x ? x.text() : ""), r.clone().text()]);
          if (a && a !== b) self.clients.matchAll({ type: "window" }).then(cs => cs.forEach(w => w.postMessage({ type: "updated" })));
        }
        await c.put(e.request, r.clone());
      }
      return r;
    }).catch(() => hit);
    if (fresh) return net.then(r => r || hit);
    return hit || net;
  }));
});
// התראות: השרת שולח את התזכורת בזמן שלה, וכאן היא מוצגת בטלפון. לחיצה פותחת את האפליקציה.
/* a deadline reminder: ask Moodle first whether it's already done (Michal, 22.11: reminders for tasks already submitted – the reminder was set
   when the app was last opened). Only a clear "submitted" from Moodle stops it; any doubt (offline, slow, unknown task) shows it as before */
const SWDB = "mtsw" + (CH ? "-beta" : "");
const swGet = () => new Promise(res => {
  try { const r = indexedDB.open(SWDB, 1); r.onupgradeneeded = () => r.result.createObjectStore("kv"); r.onerror = () => res(null);
    r.onsuccess = () => { const db = r.result; try { const q = db.transaction("kv").objectStore("kv").get("chk"); q.onsuccess = () => { res(q.result || null); db.close(); }; q.onerror = () => { res(null); db.close(); }; } catch (e) { res(null); db.close(); } };
  } catch (e) { res(null); }
});
async function mcall(s, fn, p) {                     // the student's own token, to the student's own Moodle only
  const body = new URLSearchParams({ wstoken: s.t, wsfunction: fn, moodlewsrestformat: "json" });
  for (const [k, v] of Object.entries(p)) body.append(k, String(v));
  const ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), 6000);
  try { const r = await fetch(s.u + "/webservice/rest/server.php", { method: "POST", body, cache: "no-store", credentials: "omit", referrerPolicy: "no-referrer", signal: ctl.signal });
    const j = await r.json(); if (!j || j.exception) throw new Error("moodle"); return j; }
  finally { clearTimeout(tm); }
}
async function doneAlready(tag, s) {
  const m = /^t:(.+):[^:]+$/.exec(tag || ""), x = m && s && s.k && s.k[m[1]];
  if (!x || !/^https:\/\//.test(s.u || "") || !s.t) return false;
  try {
    if (x.ty === "assign") { const a = (await mcall(s, "mod_assign_get_submission_status", { assignid: x.id })).lastattempt || {};
      return ((a.submission && a.submission.status) || (a.teamsubmission && a.teamsubmission.status)) === "submitted"; }
    if (x.ty === "quiz") { const j = await mcall(s, "mod_quiz_get_user_attempts", { quizid: x.id, status: "finished" }); return !!(j.attempts && j.attempts.length); }
    if (x.ty === "event") {        // Moodle drops an activity's deadline from the student's list once it's done (an automatic checker: on submission)
      // look where the deadline is NOW: a lecturer may have moved it since the app was last opened (an extension is not a submission)
      const ev = (await mcall(s, "core_calendar_get_calendar_event_by_id", { eventid: x.id })).event, ts = ev && Number(ev.timestart);
      if (!ts) return false;
      const j = await mcall(s, "core_calendar_get_action_events_by_timesort", { timesortfrom: ts - 3600, timesortto: ts + 3600, limitnum: 50 });
      return Array.isArray(j.events) && j.events.length < 50 && !j.events.some(e => e.id === x.id); }
  } catch (e) {}
  return false;
}
const SW_DONE = { he: "כבר הגשת ✓ לא נזכיר לך שוב על זה", en: "Already submitted ✓ No more reminders about it", fr: "Déjà rendu ✓ Plus de rappels pour ce devoir" };
async function dropRest(tag, s) {                    // the server forgets this task's later reminders too
  try { const sub = await self.registration.pushManager.getSubscription(), pre = tag.replace(/[^:]+$/, "");
    if (sub && s.p) await fetch(s.p + "/drop", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint, prefix: pre }) }); } catch (e) {}
}
self.addEventListener("push", e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = { body: e.data ? e.data.text() : "" }; }
  e.waitUntil((async () => {
    if (/^t:/.test(d.tag || "")) {
      const s = await swGet();
      if (await doneAlready(d.tag, s)) {
        await dropRest(d.tag, s);
        // an iPhone must show something for every push (or it stops delivering them): one quiet line instead of the reminder, and none after it
        if (!/iPhone|iPad|iPod/.test(self.navigator.userAgent || "") && !(/Macintosh/.test(self.navigator.userAgent || "") && self.navigator.maxTouchPoints > 1)) return;
        d = { title: String(d.title || "").replace(/^⏰\s*/, "✓ "), body: SW_DONE[s.l] || SW_DONE.he, tag: d.tag };
      }
    }
    return self.registration.showNotification(d.title || "MoodlePro", {
      body: d.body || "", tag: d.tag || undefined, renotify: !!d.tag, icon: "icon-any-192.png", badge: "badge-96.png", dir: "auto",
      timestamp: d.at || Date.now(), data: { tag: d.tag || "" } });
  })());
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  // a reminder about a task opens that task's page (proposal), not just the app
  const m = /^t:(.+):[^:]+$/.exec((e.notification.data && e.notification.data.tag) || ""), key = m ? m[1] : "";
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(cs => {
    const c = cs.find(w => w.url.startsWith(self.registration.scope));
    if (c) { if (key) c.postMessage({ type: "openTask", key }); return c.focus(); }
    return self.clients.openWindow(self.registration.scope + (key ? "#tk=" + encodeURIComponent(key) : ""));
  }));
});
