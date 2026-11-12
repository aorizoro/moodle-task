// שרת ההתראות של "משימות Moodle".
// האפליקציה שולחת לכאן רק את רשימת התזכורות של המכשיר (זמן, כותרת ושורה קצרה) ואת כתובת ההתראות של הדפדפן.
// אין כאן טוקן של Moodle, סיסמה או שום גישה לחשבון. כשמגיע הזמן השרת שולח התראה, ומוחק אותה.
//
// Push server for the Moodle tasks app. One Durable Object per device keeps that device's upcoming
// reminders and wakes itself (an alarm) exactly when the next one is due. Web Push per RFC 8291/8292;
// the VAPID key pair is made on first use and never leaves the server.
import { DurableObject } from "cloudflare:workers";

const ORIGINS = ["https://aorizoro.github.io"];
const PUSH_HOSTS = /^(fcm\.googleapis\.com|android\.googleapis\.com|updates\.push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9-]+\.push\.apple\.com|[a-z0-9.-]+\.notify\.windows\.com)$/;
const MAX_ITEMS = 500, MAX_BODY = 768 * 1024, MAX_ICS = 700 * 1024, SUBJECT = "https://aorizoro.github.io/moodle-task/";

const enc = new TextEncoder();
const b64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64u = s => Uint8Array.from(atob(String(s).replace(/-/g, "+").replace(/_/g, "/") + "===".slice((String(s).length + 3) % 4)), c => c.charCodeAt(0));
const cat = (...a) => { const out = new Uint8Array(a.reduce((n, x) => n + x.length, 0)); let o = 0; for (const x of a) { out.set(x, o); o += x.length; } return out; };
const sha256 = async s => b64u(await crypto.subtle.digest("SHA-256", enc.encode(s)));
const hmac = async (key, data) => new Uint8Array(await crypto.subtle.sign("HMAC", await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]), data));
const clip = (s, n) => String(s == null ? "" : s).slice(0, n);

function okEndpoint(ep, env) {
  let u; try { u = new URL(ep); } catch (e) { return false; }
  if (env.TEST_PUSH === "1" && u.protocol === "http:" && u.hostname === "127.0.0.1") return true;
  return u.protocol === "https:" && PUSH_HOSTS.test(u.hostname);
}
function okSub(s, env) {
  if (!s || typeof s.endpoint !== "string" || !s.keys || !okEndpoint(s.endpoint, env)) return false;
  try { return unb64u(s.keys.p256dh).length === 65 && unb64u(s.keys.auth).length === 16; } catch (e) { return false; }
}

/* ---------- Web Push: encrypt (RFC 8291, aes128gcm) and sign (VAPID, RFC 8292) ---------- */
async function encrypt(sub, payload) {
  const ua = unb64u(sub.keys.p256dh), auth = unb64u(sub.keys.auth);
  const eph = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const asPub = new Uint8Array(await crypto.subtle.exportKey("raw", eph.publicKey));
  const uaKey = await crypto.subtle.importKey("raw", ua, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, eph.privateKey, 256));
  const ikm = await hmac(await hmac(auth, shared), cat(enc.encode("WebPush: info\0"), ua, asPub, new Uint8Array([1])));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const prk = await hmac(salt, ikm);
  const cek = (await hmac(prk, cat(enc.encode("Content-Encoding: aes128gcm\0"), new Uint8Array([1])))).slice(0, 16);
  const nonce = (await hmac(prk, cat(enc.encode("Content-Encoding: nonce\0"), new Uint8Array([1])))).slice(0, 12);
  const key = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, key, cat(enc.encode(payload), new Uint8Array([2]))));
  return cat(salt, new Uint8Array([0, 0, 16, 0]), new Uint8Array([65]), asPub, ct);   // header: salt, record size 4096, key id = our public key
}
async function vapidHeader(endpoint, vk) {
  const aud = new URL(endpoint).origin, now = Math.floor(Date.now() / 1000);
  const head = b64u(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" }))), claims = b64u(enc.encode(JSON.stringify({ aud, exp: now + 12 * 3600, sub: SUBJECT })));
  const key = await crypto.subtle.importKey("jwk", vk.jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, enc.encode(head + "." + claims));
  return "vapid t=" + head + "." + claims + "." + b64u(sig) + ", k=" + vk.pub;
}
async function sendPush(sub, msg, vk, ttl) {
  const body = await encrypt(sub, JSON.stringify(msg));
  const r = await fetch(sub.endpoint, { method: "POST", body, headers: {
    "Content-Encoding": "aes128gcm", "Content-Type": "application/octet-stream", TTL: String(ttl || 6 * 3600), Urgency: "high",
    Authorization: await vapidHeader(sub.endpoint, vk) } });
  return r.status;
}

/* ---------- the server's own VAPID key pair, made once ---------- */
export class Keys extends DurableObject {
  async get() {
    let k = await this.ctx.storage.get("vapid");
    if (!k) {
      const p = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
      k = { jwk: await crypto.subtle.exportKey("jwk", p.privateKey), pub: b64u(await crypto.subtle.exportKey("raw", p.publicKey)) };
      await this.ctx.storage.put("vapid", k);
    }
    return k;
  }
}
const vapid = env => env.KEYS.get(env.KEYS.idFromName("vapid-v1")).get();

/* ---------- one device: its reminders, and an alarm set to the next one ----------
   All of a device's reminders are kept as ONE stored value (a sorted list), so an upload or a sent notification is a single write:
   the free plan allows 100,000 written rows a day, and a row per reminder would have used it up at a couple of hundred users. */
const sameJson = (a, b) => JSON.stringify(a) === JSON.stringify(b);
export class Device extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {          // devices set up before this kept a table row per reminder: move them over once
      let rows = null;
      try { rows = ctx.storage.sql.exec("SELECT at, title, body, tag FROM items ORDER BY at").toArray(); } catch (e) { rows = null; }
      if (!rows) return;
      const test = rows.find(r => r.tag === "test");
      await ctx.storage.put("items", rows.filter(r => r.tag !== "test").map(r => ({ at: r.at, title: r.title, body: r.body, tag: r.tag })));
      if (test) await ctx.storage.put("test", { at: test.at, title: test.title, body: test.body, tag: "test" });
      ctx.storage.sql.exec("DROP TABLE items");
      await this.rearm();
    });
  }
  async load() { const m = await this.ctx.storage.get(["items", "test"]); return { items: m.get("items") || [], test: m.get("test") || null }; }
  async rearm(st) {
    const { items, test } = st || await this.load();
    const t = Math.min(items.length ? items[0].at : Infinity, test ? test.at : Infinity);
    const cur = await this.ctx.storage.getAlarm();
    if (t === Infinity) { if (cur != null) await this.ctx.storage.deleteAlarm(); return null; }
    const want = Math.max(t, Date.now() + 1000);
    if (cur == null || Math.abs(cur - want) > 500) await this.ctx.storage.setAlarm(want);
    return t;
  }
  async sync(sub, items, lang) {
    const now = Date.now(), old = await this.ctx.storage.get(["sub", "lang", "seen"]), put = {};
    if (!sameJson(old.get("sub"), sub)) put.sub = sub;
    if (old.get("lang") !== lang) put.lang = lang;
    if (now - (old.get("seen") || 0) > 86400000) put.seen = now;              // "still in use" needs a day's precision, not a write per upload
    const keep = items.filter(x => x && Number.isFinite(x.at) && x.at > now - 60000 && x.at < now + 400 * 86400000).sort((a, b) => a.at - b.at).slice(0, MAX_ITEMS)
      .map(x => ({ at: Math.round(x.at), title: clip(x.title, 120), body: clip(x.body, 240), tag: clip(x.tag, 80) }));
    put.items = keep;                                                          // a test notification on its way is kept apart, and survives a new upload
    await this.ctx.storage.put(put);
    return { count: keep.length, next: await this.rearm({ items: keep, test: await this.ctx.storage.get("test") || null }) };
  }
  async forget() { await this.ctx.storage.delete(["sub", "lang", "seen", "items", "test"]); await this.ctx.storage.deleteAlarm(); }
  async test(msg, delay) {
    const sub = await this.ctx.storage.get("sub"); if (!sub) return 404;
    if (delay > 0) {                                                       // later, so the app can be closed meanwhile
      await this.ctx.storage.put("test", { at: Date.now() + delay * 1000, title: msg.title, body: msg.body, tag: "test" });
      await this.rearm(); return 202;
    }
    const st = await sendPush(sub, msg, await vapid(this.env), 600);
    if (st === 404 || st === 410) await this.forget();
    return st;
  }
  async alarm() {
    const sub = await this.ctx.storage.get("sub"); if (!sub) return this.forget();
    const now = Date.now(), st = await this.load(), vk = await vapid(this.env);
    const due = st.items.filter(x => x.at <= now + 1000).concat(st.test && st.test.at <= now + 1000 ? [st.test] : []).sort((a, b) => a.at - b.at);
    const done = new Set(); let retry = false;
    for (const x of due) {
      if (x.at < now - 3 * 3600000) { done.add(x); continue; }                // far too late to be useful
      let code = 0; try { code = await sendPush(sub, { title: x.title, body: x.body, tag: x.tag, at: x.at }, vk); } catch (e) { code = 0; }
      if (code === 404 || code === 410) return this.forget();                // the browser dropped this subscription
      if (code >= 200 && code < 300 || code === 400 || code === 413) done.add(x); else retry = true;
    }
    if (done.size) {
      st.items = st.items.filter(x => !done.has(x));
      if (st.test && done.has(st.test)) { st.test = null; await this.ctx.storage.delete("test"); }
      await this.ctx.storage.put("items", st.items);
    }
    if (retry) await this.ctx.storage.setAlarm(Date.now() + 5 * 60000); else await this.rearm(st);
    // a device that has not checked in for two months is forgotten
    if (now - ((await this.ctx.storage.get("seen")) || now) > 60 * 86400000) await this.forget();
  }
}

/* ---------- a private calendar feed: the app uploads the calendar, calendar apps subscribe to its secret address ---------- */
const EMPTY_ICS = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//MoodlePro//EN\r\nCALSCALE:GREGORIAN\r\nX-WR-CALNAME:MoodlePro\r\nEND:VCALENDAR\r\n";
const okKey = k => typeof k === "string" && /^[A-Za-z0-9_-]{24,64}$/.test(k);
export class Feed extends DurableObject {
  async put(ics) { await this.ctx.storage.put("ics", ics); await this.ctx.storage.put("at", Date.now()); return { ok: true, bytes: ics.length }; }
  async stop() { await this.ctx.storage.put("ics", EMPTY_ICS); await this.ctx.storage.put("at", Date.now()); return { ok: true }; }   // stays subscribable, just empty
  async get() { return (await this.ctx.storage.get("ics")) || EMPTY_ICS; }
}
const feed = async (env, key) => env.FEEDS.get(env.FEEDS.idFromName(await sha256("feed:" + key)));

/* ---------- the community (MoodlePro Community): one SQLite database for everyone ----------
   Trust-based: a user is a random id + a secret the app made (synced between the user's devices through Moodle).
   No Moodle token ever reaches this server. Name, degree and courses are what the app says.
   Reads are kept low (the free plan: 5M rows read, 100k rows written a day): totals and averages are stored as they change,
   and each course's public part is cached in memory until something in that course changes. */
const HOURS = [0.5, 2, 4.5, 8, 12];                       // the five "how long did it take" answers
const PTS = { add: 3, time: 1, wa: 1, star: 2 };
const EMO = ["👍", "❤️", "🔥", "😂", "🙏"];
const okTk = k => typeof k === "string" && /^(c|[a-z]+:[0-9A-Za-z_.-]{1,40})$/.test(k);   // a thread: "c" = the course chat, or a task key (assign:123)
const okId = s => typeof s === "string" && /^[a-f0-9]{32}$/.test(s);
const okSec = s => typeof s === "string" && /^[a-f0-9]{48}$/.test(s);
const okCid = c => (typeof c === "string" || typeof c === "number") && /^[0-9]{1,12}$/.test(String(c));
const okWa = u => typeof u === "string" && /^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]{10,40}$/.test(u);
// the semester a moment belongs to: Sep–Feb = A (of the year it started), Mar–Aug = B
function semKey(ms) { const d = new Date(ms), y = d.getUTCFullYear(), m = d.getUTCMonth() + 1; return m >= 9 ? y + "A" : m <= 2 ? (y - 1) + "A" : (y - 1) + "B"; }
export class Community extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sql = ctx.storage.sql; this.cc = new Map();
    this.sql.exec(`CREATE TABLE IF NOT EXISTS users (uid TEXT PRIMARY KEY, sech TEXT, name TEXT, deg TEXT, yr TEXT, seen INTEGER);
      CREATE TABLE IF NOT EXISTS courses (cid TEXT PRIMARY KEY, name TEXT, wa TEXT, wa_by TEXT, wa_at INTEGER);
      CREATE TABLE IF NOT EXISTS ledger (id INTEGER PRIMARY KEY AUTOINCREMENT, uid TEXT, pts INTEGER, kind TEXT, from_uid TEXT, cid TEXT, ref TEXT, at INTEGER);
      CREATE INDEX IF NOT EXISTS ledger_uid ON ledger (uid, at);
      CREATE INDEX IF NOT EXISTS ledger_kind ON ledger (uid, kind, cid);
      CREATE TABLE IF NOT EXISTS tot (uid TEXT, cid TEXT, per TEXT, pts INTEGER, PRIMARY KEY (uid, cid, per));
      CREATE INDEX IF NOT EXISTS tot_board ON tot (cid, per, pts);
      CREATE TABLE IF NOT EXISTS times (cid TEXT, aid TEXT, uid TEXT, h REAL, at INTEGER, PRIMARY KEY (cid, aid, uid));
      CREATE INDEX IF NOT EXISTS times_uid ON times (uid);
      CREATE TABLE IF NOT EXISTS agg (cid TEXT, aid TEXT, sum REAL, n INTEGER, PRIMARY KEY (cid, aid));
      CREATE TABLE IF NOT EXISTS shares (id INTEGER PRIMARY KEY AUTOINCREMENT, cid TEXT, uid TEXT, kind TEXT, d TEXT, at INTEGER, made INTEGER, del INTEGER DEFAULT 0, adds INTEGER DEFAULT 0);
      CREATE INDEX IF NOT EXISTS shares_c ON shares (cid, del, at);
      CREATE TABLE IF NOT EXISTS adds (sid INTEGER, uid TEXT, PRIMARY KEY (sid, uid));
      CREATE TABLE IF NOT EXISTS msgs (id INTEGER PRIMARY KEY AUTOINCREMENT, cid TEXT, tk TEXT, uid TEXT, body TEXT, reply INTEGER, at INTEGER, del INTEGER DEFAULT 0, stars INTEGER DEFAULT 0);
      CREATE INDEX IF NOT EXISTS msgs_t ON msgs (cid, tk, id);
      CREATE TABLE IF NOT EXISTS thr (cid TEXT, tk TEXT, n INTEGER, last INTEGER, ver INTEGER, ref TEXT, PRIMARY KEY (cid, tk));
      CREATE TABLE IF NOT EXISTS reacts (mid INTEGER, uid TEXT, emo TEXT, PRIMARY KEY (mid, uid, emo));
      CREATE TABLE IF NOT EXISTS stars (mid INTEGER, uid TEXT, PRIMARY KEY (mid, uid));`);
    this.sql.exec("CREATE TABLE IF NOT EXISTS imgs (id TEXT PRIMARY KEY, type TEXT, data BLOB, at INTEGER)");
    // what happened to me that I'll want to hear about when I open the app (for now: someone starred my message)
    this.sql.exec("CREATE TABLE IF NOT EXISTS notes (id INTEGER PRIMARY KEY AUTOINCREMENT, uid TEXT, kind TEXT, from_uid TEXT, cid TEXT, tk TEXT, mid INTEGER, body TEXT, at INTEGER)");
    this.sql.exec("CREATE INDEX IF NOT EXISTS notes_u ON notes (uid, at)");
    for (const col of ["lb TEXT", "lt TEXT"]) try { this.sql.exec("ALTER TABLE thr ADD COLUMN " + col); } catch (e) {}   // the last message of a thread (who, what) for the chats list
  }
  /* a screenshot attached to a feedback message: kept 120 days, at most 3000, behind a link nobody can guess */
  putImg(type, buf) {
    const id = [...crypto.getRandomValues(new Uint8Array(18))].map(x => x.toString(16).padStart(2, "0")).join("");
    this.sql.exec("INSERT INTO imgs (id, type, data, at) VALUES (?, ?, ?, ?)", id, type, buf, Date.now());
    this.sql.exec("DELETE FROM imgs WHERE at < ?", Date.now() - 120 * 864e5);
    this.sql.exec("DELETE FROM imgs WHERE id NOT IN (SELECT id FROM imgs ORDER BY at DESC LIMIT 3000)");
    return id;
  }
  getImg(id) { const r = this.one("SELECT type, data FROM imgs WHERE id = ?", id); return r ? { type: r.type, data: r.data } : null; }
  q(sql, ...a) { return this.sql.exec(sql, ...a).toArray(); }
  one(sql, ...a) { return this.q(sql, ...a)[0] || null; }
  async auth(b) {
    if (!b || !okId(b.uid) || !okSec(b.sec)) return null;
    const h = await sha256("soc:" + b.sec), u = this.one("SELECT uid, sech, name, deg, yr FROM users WHERE uid = ?", b.uid);
    if (u) return u.sech === h ? u : null;
    const name = clip(b.name, 60).trim(); if (!name) return null;
    this.sql.exec("INSERT INTO users (uid, sech, name, deg, yr, seen) VALUES (?, ?, ?, ?, ?, ?)", b.uid, h, name, clip(b.deg, 60), clip(b.yr, 20), Date.now());
    return { uid: b.uid, sech: h, name, deg: clip(b.deg, 60), yr: clip(b.yr, 20) };
  }
  course(cid, name) {                                       // remember a course's name (for boards and logs); a write only when it is new or renamed
    if (!name) return;
    const c = this.one("SELECT name FROM courses WHERE cid = ?", cid), n = clip(name, 120);
    if (!c) this.sql.exec("INSERT INTO courses (cid, name) VALUES (?, ?)", cid, n);
    else if (c.name !== n) this.sql.exec("UPDATE courses SET name = ? WHERE cid = ?", n, cid);
  }
  award(uid, pts, kind, from, cid, ref) {
    const now = Date.now(), sem = semKey(now);
    this.sql.exec("INSERT INTO ledger (uid, pts, kind, from_uid, cid, ref, at) VALUES (?, ?, ?, ?, ?, ?, ?)", uid, pts, kind, from || "", cid || "", clip(ref, 120), now);
    for (const [c, p] of [["", "all"], ["", sem], [cid || "", "all"], [cid || "", sem]].filter((x, i) => i < 2 || cid))
      this.sql.exec("INSERT INTO tot (uid, cid, per, pts) VALUES (?, ?, ?, ?) ON CONFLICT (uid, cid, per) DO UPDATE SET pts = pts + excluded.pts", uid, c, p, pts);
  }
  pts(uid) { const r = this.q("SELECT per, pts FROM tot WHERE uid = ? AND cid = ''", uid), sem = semKey(Date.now()); return { all: (r.find(x => x.per === "all") || {}).pts || 0, sem: (r.find(x => x.per === sem) || {}).pts || 0 }; }
  pub(cid) {                                                // a course's shared part, cached until it changes
    if (this.cc.has(cid)) return this.cc.get(cid);
    const c = this.one("SELECT wa, wa_by FROM courses WHERE cid = ?", cid) || {}, t = {};
    for (const r of this.q("SELECT aid, sum, n FROM agg WHERE cid = ?", cid)) t[r.aid] = [Math.round(r.sum / r.n * 10) / 10, r.n];
    const sh = this.q(`SELECT s.id, s.uid, s.kind, s.d, s.at, s.adds, u.name, u.deg, u.yr FROM shares s LEFT JOIN users u ON u.uid = s.uid
      WHERE s.cid = ? AND s.del = 0 AND s.at > ? ORDER BY s.at LIMIT 40`, cid, Math.floor(Date.now() / 1000) - 86400)
      .map(r => ({ id: r.id, uid: r.uid, kind: r.kind, d: JSON.parse(r.d || "{}"), at: r.at, adds: r.adds, name: r.name || "", deg: r.deg || "", yr: r.yr || "" }));
    const wb = c.wa_by ? this.one("SELECT name FROM users WHERE uid = ?", c.wa_by) : null, th = {};
    for (const r of this.q("SELECT tk, n, last, ref, lb, lt FROM thr WHERE cid = ? AND n > 0", cid)) th[r.tk] = [r.n, r.last, r.ref || "", r.lb || "", r.lt || ""];
    const v = { wa: c.wa || "", waBy: wb ? wb.name : "", t, sh, th };
    this.cc.set(cid, v); return v;
  }
  async handle(op, b) {
    const me = await this.auth(b); if (!me) return [403, { error: "auth" }];
    const now = Date.now();
    if (op === "overview") {
      const name = clip(b.name, 60).trim(), deg = b.deg === undefined ? me.deg || "" : clip(b.deg, 60), yr = b.yr === undefined ? me.yr || "" : clip(b.yr, 20);
      if ((name && name !== me.name) || deg !== (me.deg || "") || yr !== (me.yr || "")) this.sql.exec("UPDATE users SET name = ?, deg = ?, yr = ?, seen = ? WHERE uid = ?", name || me.name, deg, yr, now, me.uid);
      const cs = (Array.isArray(b.courses) ? b.courses : []).filter(c => c && okCid(c.id)).slice(0, 40), out = {};
      for (const c of cs) { const cid = String(c.id); this.course(cid, c.name); out[cid] = this.pub(cid); }
      const mine = {}; for (const r of this.q("SELECT cid, aid, h FROM times WHERE uid = ?", me.uid)) mine[r.cid + ":" + r.aid] = r.h;
      const added = this.q("SELECT sid FROM adds WHERE uid = ?", me.uid).map(r => r.sid);
      const since = Math.max(Number(b.ns) || 0, now - 14 * 86400e3);
      const notes = this.q(`SELECT n.id, n.kind, n.cid, n.tk, n.mid, n.body, n.at, u.name, t.ref FROM notes n LEFT JOIN users u ON u.uid = n.from_uid LEFT JOIN thr t ON t.cid = n.cid AND t.tk = n.tk
        WHERE n.uid = ? AND n.at > ? ORDER BY n.at DESC LIMIT 20`, me.uid, since).map(r => ({ id: r.id, kind: r.kind, cid: r.cid, tk: r.tk, mid: r.mid, body: r.body || "", at: r.at, name: r.name || "", ref: r.ref || "" }));
      return [200, { me: { uid: me.uid, ...this.pts(me.uid) }, c: out, mine, added, notes }];
    }
    const cid = okCid(b.cid) ? String(b.cid) : "";
    if (op === "time") {
      const h = Number(b.h), aid = clip(b.aid, 40);
      if (!cid || !aid || !HOURS.includes(h)) return [400, { error: "bad" }];
      this.course(cid, b.cname);
      const old = this.one("SELECT h FROM times WHERE cid = ? AND aid = ? AND uid = ?", cid, aid, me.uid);
      if (old && old.h === h) return [200, { ok: true }];
      this.sql.exec("INSERT INTO times (cid, aid, uid, h, at) VALUES (?, ?, ?, ?, ?) ON CONFLICT (cid, aid, uid) DO UPDATE SET h = excluded.h, at = excluded.at", cid, aid, me.uid, h, now);
      this.sql.exec("INSERT INTO agg (cid, aid, sum, n) VALUES (?, ?, ?, 1) ON CONFLICT (cid, aid) DO UPDATE SET sum = sum + ?, n = n + ?", cid, aid, h, old ? h - old.h : h, old ? 0 : 1);
      if (!old) this.award(me.uid, PTS.time, "time", "", cid, b.ref);
      this.cc.delete(cid); return [200, { ok: true, first: !old }];
    }
    if (op === "times") {                                   // who reported how long a task took (names, degree, year, the answer, when)
      const aid = clip(b.aid, 40); if (!cid || !aid) return [400, { error: "bad" }];
      const rows = this.q(`SELECT t.uid, t.h, t.at, u.name, u.deg, u.yr FROM times t LEFT JOIN users u ON u.uid = t.uid WHERE t.cid = ? AND t.aid = ? ORDER BY t.at DESC LIMIT 200`, cid, aid);
      return [200, { rows: rows.map(r => ({ uid: r.uid, h: r.h, at: r.at, name: r.name || "", deg: r.deg || "", yr: r.yr || "" })) }];
    }
    if (op === "wa") {
      const url = String(b.url || "").trim();
      if (!cid || (url && !okWa(url))) return [400, { error: "bad" }];
      this.course(cid, b.cname);
      this.sql.exec("UPDATE courses SET wa = ?, wa_by = ?, wa_at = ? WHERE cid = ?", url, url ? me.uid : "", now, cid);
      let pts = 0;
      if (url && !this.one("SELECT id FROM ledger WHERE uid = ? AND kind = 'wa' AND cid = ?", me.uid, cid)) { this.award(me.uid, PTS.wa, "wa", "", cid, b.cname); pts = PTS.wa; }
      this.cc.delete(cid); return [200, { ok: true, pts }];
    }
    if (op === "share") {
      const kind = b.kind === "task" ? "task" : "xq", at = Math.floor(Number(b.at));
      if (!cid || !Number.isFinite(at) || at < now / 1000 - 86400 || at > now / 1000 + 400 * 86400) return [400, { error: "bad" }];
      const d = b.d || {}, dd = JSON.stringify({ n: clip(d.n, 100), k: clip(d.k, 10), note: clip(d.note, 200), s: clip(d.s, 16), allDay: !!d.allDay });
      this.course(cid, b.cname);
      if (b.id) {
        const s = this.one("SELECT uid, cid FROM shares WHERE id = ?", Number(b.id));
        if (!s || s.uid !== me.uid) return [403, { error: "not yours" }];
        this.sql.exec("UPDATE shares SET d = ?, at = ?, cid = ?, kind = ? WHERE id = ?", dd, at, cid, kind, Number(b.id));
        this.cc.delete(s.cid); this.cc.delete(cid); return [200, { id: Number(b.id) }];
      }
      this.sql.exec("INSERT INTO shares (cid, uid, kind, d, at, made) VALUES (?, ?, ?, ?, ?, ?)", cid, me.uid, kind, dd, at, now);
      const id = this.one("SELECT last_insert_rowid() AS id").id;
      this.cc.delete(cid); return [200, { id }];
    }
    if (op === "unshare") {
      const s = this.one("SELECT uid, cid FROM shares WHERE id = ?", Number(b.id));
      if (!s || s.uid !== me.uid) return [403, { error: "not yours" }];
      this.sql.exec("UPDATE shares SET del = 1 WHERE id = ?", Number(b.id)); this.cc.delete(s.cid); return [200, { ok: true }];
    }
    if (op === "add") {
      const s = this.one("SELECT id, uid, cid, d FROM shares WHERE id = ? AND del = 0", Number(b.id));
      if (!s) return [404, { error: "gone" }];
      if (this.one("SELECT sid FROM adds WHERE sid = ? AND uid = ?", s.id, me.uid)) return [200, { ok: true, again: true }];
      this.sql.exec("INSERT INTO adds (sid, uid) VALUES (?, ?)", s.id, me.uid);
      this.sql.exec("UPDATE shares SET adds = adds + 1 WHERE id = ?", s.id);
      if (s.uid !== me.uid) this.award(s.uid, PTS.add, "add", me.uid, s.cid, JSON.parse(s.d || "{}").n);
      this.cc.delete(s.cid); return [200, { ok: true }];
    }
    if (op === "thread") {                                  // the messages of one thread; "ver" lets an open chat ask cheaply whether anything changed
      const tk = b.tk; if (!cid || !okTk(tk)) return [400, { error: "bad" }];
      const th = this.one("SELECT ver FROM thr WHERE cid = ? AND tk = ?", cid, tk), ver = th ? th.ver : 0;
      if (b.ver !== undefined && Number(b.ver) === ver) return [200, { same: true, ver }];
      const ms = this.q(`SELECT m.id, m.uid, m.body, m.reply, m.at, m.del, m.stars, u.name, u.deg, u.yr, (SELECT pts FROM tot a WHERE a.uid = m.uid AND a.cid = '' AND a.per = 'all') AS total
        FROM msgs m LEFT JOIN users u ON u.uid = m.uid WHERE m.cid = ? AND m.tk = ? ORDER BY m.id DESC LIMIT 150`, cid, tk).reverse();
      const ids = ms.map(m => m.id), re = {}, mine = new Set(), sb = {};
      if (ids.length) {
        const lo = ids[0], hi = ids[ids.length - 1], here = new Set(ids), agg = {};
        for (const r of this.q("SELECT mid, emo, uid FROM reacts WHERE mid >= ? AND mid <= ?", lo, hi)) {
          if (!here.has(r.mid)) continue;
          const k = r.mid + " " + r.emo, a = agg[k] || (agg[k] = [r.mid, r.emo, 0, 0]); a[2]++; if (r.uid === me.uid) a[3] = 1;
        }
        for (const a of Object.values(agg)) (re[a[0]] = re[a[0]] || []).push([a[1], a[2], a[3]]);
        for (const r of this.q("SELECT mid FROM stars WHERE uid = ? AND mid >= ? AND mid <= ?", me.uid, lo, hi)) mine.add(r.mid);
        if (ms.some(m => m.stars > 0))                      // who starred each message (shown under it)
          for (const r of this.q("SELECT s.mid, u.name FROM stars s LEFT JOIN users u ON u.uid = s.uid WHERE s.mid >= ? AND s.mid <= ?", lo, hi))
            if (here.has(r.mid)) (sb[r.mid] = sb[r.mid] || []).length < 20 && sb[r.mid].push(r.name || "");
      }
      return [200, { ver, msgs: ms.map(m => ({ id: m.id, uid: m.uid, name: m.name || "", deg: m.deg || "", yr: m.yr || "", total: m.total || 0, body: m.del ? "" : m.body, del: !!m.del,
        reply: m.reply || 0, at: m.at, stars: m.stars, starred: mine.has(m.id), sb: sb[m.id] || [], re: re[m.id] || [] })) }];
    }
    if (op === "post") {
      const tk = b.tk, body = String(b.body || "").trim().slice(0, 2000);
      if (!cid || !okTk(tk) || !body) return [400, { error: "bad" }];
      this.course(cid, b.cname);
      const reply = Number(b.reply) > 0 && this.one("SELECT id FROM msgs WHERE id = ? AND cid = ? AND tk = ?", Number(b.reply), cid, tk) ? Number(b.reply) : 0;
      this.sql.exec("INSERT INTO msgs (cid, tk, uid, body, reply, at) VALUES (?, ?, ?, ?, ?, ?)", cid, tk, me.uid, body, reply, now);
      const id = this.one("SELECT last_insert_rowid() AS id").id;
      this.sql.exec("INSERT INTO thr (cid, tk, n, last, ver, ref, lb, lt) VALUES (?, ?, 1, ?, 1, ?, ?, ?) ON CONFLICT (cid, tk) DO UPDATE SET n = n + 1, last = excluded.last, ver = ver + 1, ref = CASE WHEN excluded.ref != '' THEN excluded.ref ELSE ref END, lb = excluded.lb, lt = excluded.lt",
        cid, tk, now, clip(b.ref, 120), me.name || "", body.replace(/\s+/g, " ").slice(0, 90));
      this.cc.delete(cid); return [200, { id }];
    }
    if (op === "msgdel" || op === "react" || op === "star") {
      const m = this.one("SELECT id, cid, tk, uid, body FROM msgs WHERE id = ? AND del = 0", Number(b.id)); if (!m) return [404, { error: "gone" }];
      if (op === "msgdel") {
        if (m.uid !== me.uid) return [403, { error: "not yours" }];
        this.sql.exec("UPDATE msgs SET del = 1, body = '' WHERE id = ?", m.id);
        const lm = this.one("SELECT m.body, u.name FROM msgs m LEFT JOIN users u ON u.uid = m.uid WHERE m.cid = ? AND m.tk = ? AND m.del = 0 ORDER BY m.id DESC LIMIT 1", m.cid, m.tk);
        this.sql.exec("UPDATE thr SET n = n - 1, ver = ver + 1, lb = ?, lt = ? WHERE cid = ? AND tk = ?", lm ? lm.name || "" : "", lm ? lm.body.replace(/\s+/g, " ").slice(0, 90) : "", m.cid, m.tk); this.cc.delete(m.cid);
      } else if (op === "react") {
        if (!EMO.includes(b.emo)) return [400, { error: "bad" }];
        if (this.one("SELECT mid FROM reacts WHERE mid = ? AND uid = ? AND emo = ?", m.id, me.uid, b.emo)) this.sql.exec("DELETE FROM reacts WHERE mid = ? AND uid = ? AND emo = ?", m.id, me.uid, b.emo);
        else this.sql.exec("INSERT INTO reacts (mid, uid, emo) VALUES (?, ?, ?)", m.id, me.uid, b.emo);
        this.sql.exec("UPDATE thr SET ver = ver + 1 WHERE cid = ? AND tk = ?", m.cid, m.tk);
      } else {                                              // "helpful answer": once per person, +2 to the writer (not for your own)
        if (m.uid === me.uid) return [400, { error: "own" }];
        if (this.one("SELECT mid FROM stars WHERE mid = ? AND uid = ?", m.id, me.uid)) return [200, { ok: true, again: true }];
        this.sql.exec("INSERT INTO stars (mid, uid) VALUES (?, ?)", m.id, me.uid);
        this.sql.exec("UPDATE msgs SET stars = stars + 1 WHERE id = ?", m.id);
        this.sql.exec("UPDATE thr SET ver = ver + 1 WHERE cid = ? AND tk = ?", m.cid, m.tk);
        const th = this.one("SELECT ref FROM thr WHERE cid = ? AND tk = ?", m.cid, m.tk);
        this.award(m.uid, PTS.star, "star", me.uid, m.cid, (th && th.ref) || "");
        this.sql.exec("INSERT INTO notes (uid, kind, from_uid, cid, tk, mid, body, at) VALUES (?, 'star', ?, ?, ?, ?, ?, ?)", m.uid, me.uid, m.cid, m.tk, m.id, String(m.body || "").replace(/\s+/g, " ").slice(0, 120), now);
        if (Math.random() < 0.05) this.sql.exec("DELETE FROM notes WHERE at < ?", now - 60 * 86400e3);
      }
      return [200, { ok: true }];
    }
    if (op === "board") {
      const per = b.per === "sem" ? semKey(now) : "all", deg = clip(b.deg, 60);
      const rows = this.q(`SELECT t.uid, t.pts, u.name, u.deg, u.yr, (SELECT pts FROM tot a WHERE a.uid = t.uid AND a.cid = '' AND a.per = 'all') AS total
        FROM tot t JOIN users u ON u.uid = t.uid WHERE t.cid = ? AND t.per = ? AND t.pts > 0 ${deg ? "AND u.deg = ?" : ""} ORDER BY t.pts DESC, t.uid LIMIT 20`, cid, per, ...(deg ? [deg] : []));
      const mine = this.one("SELECT pts FROM tot WHERE uid = ? AND cid = ? AND per = ?", me.uid, cid, per);
      const pos = mine && mine.pts > 0 ? this.one(`SELECT COUNT(*) AS n FROM tot t ${deg ? "JOIN users u ON u.uid = t.uid" : ""} WHERE t.cid = ? AND t.per = ? AND t.pts > ? ${deg ? "AND u.deg = ?" : ""}`, cid, per, mine.pts, ...(deg ? [deg] : [])).n + 1 : 0;
      const cn = cid ? this.one("SELECT name FROM courses WHERE cid = ?", cid) : null;
      return [200, { rows: rows.map(r => ({ uid: r.uid, pts: r.pts, total: r.total || 0, name: r.name, deg: r.deg, yr: r.yr })), me: { pts: mine ? mine.pts : 0, pos }, cname: cn ? cn.name : "" }];
    }
    if (op === "user") {
      const who = okId(b.who) ? b.who : me.uid, u = this.one("SELECT uid, name, deg, yr FROM users WHERE uid = ?", who);
      if (!u) return [404, { error: "no such user" }];
      const p = this.pts(who), pos = p.all > 0 ? this.one("SELECT COUNT(*) AS n FROM tot WHERE cid = '' AND per = 'all' AND pts > ?", p.all).n + 1 : 0;
      const log = this.q(`SELECT l.pts, l.kind, l.ref, l.at, l.cid, f.name AS fname, f.uid AS fuid, c.name AS cname FROM ledger l LEFT JOIN users f ON f.uid = l.from_uid AND l.from_uid != ''
        LEFT JOIN courses c ON c.cid = l.cid WHERE l.uid = ? ORDER BY l.at DESC LIMIT 100`, who);
      const by = this.q("SELECT cid, pts FROM tot WHERE uid = ? AND cid != '' AND per = 'all' ORDER BY pts DESC LIMIT 12", who)
        .map(r => ({ cid: r.cid, pts: r.pts, name: (this.one("SELECT name FROM courses WHERE cid = ?", r.cid) || {}).name || "" }));
      return [200, { u: { uid: u.uid, name: u.name, deg: u.deg, yr: u.yr, ...p, pos }, log, by }];
    }
    return [404, { error: "not found" }];
  }
}
const community = env => env.COMMUNITY.get(env.COMMUNITY.idFromName("main"));

/* ---------- the HTTP side the app talks to ---------- */
export default {
  async fetch(req, env) {
    const origin = req.headers.get("Origin") || "";
    const allowed = ORIGINS.includes(origin) || (env.DEV_ORIGIN && origin === env.DEV_ORIGIN);
    const H = { "Access-Control-Allow-Origin": allowed ? origin : ORIGINS[0], "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Max-Age": "86400", Vary: "Origin" };
    const out = (o, st) => new Response(JSON.stringify(o), { status: st || 200, headers: { ...H, "Content-Type": "application/json" } });
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: H });
    const path = new URL(req.url).pathname;
    if (req.method === "GET" && path === "/key") return out({ key: (await vapid(env)).pub });
    if (req.method === "GET" && path === "/") return out({ ok: true });
    { const m = /^\/feed\/([A-Za-z0-9_-]{24,64})\.ics$/.exec(path);
      if (m && (req.method === "GET" || req.method === "HEAD")) {
        const ics = await (await feed(env, m[1])).get();
        return new Response(req.method === "HEAD" ? null : ics, { headers: { "Content-Type": "text/calendar; charset=utf-8", "Cache-Control": "max-age=600",
          "Content-Disposition": 'inline; filename="moodlepro.ics"', "X-Content-Type-Options": "nosniff", "Access-Control-Allow-Origin": "*" } });
      } }
    { const m = /^\/fbimg\/([0-9a-f]{36})$/.exec(path);
      if (m && req.method === "GET") {
        const im = await community(env).getImg(m[1]); if (!im) return new Response("not found", { status: 404 });
        return new Response(im.data, { headers: { "Content-Type": im.type, "Cache-Control": "private, max-age=86400", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'" } });
      } }
    if (req.method !== "POST") return out({ error: "not found" }, 404);
    if (!allowed) return out({ error: "origin" }, 403);
    if (path === "/fbimg") {            // a screenshot for a feedback message: an image, up to 1.5 MB
      const type = (req.headers.get("Content-Type") || "").split(";")[0].trim();
      if (!["image/jpeg", "image/png", "image/webp"].includes(type)) return out({ error: "type" }, 415);
      const buf = await req.arrayBuffer(); if (buf.byteLength > 1536 * 1024 || buf.byteLength < 100) return out({ error: "size" }, 413);
      const id = await community(env).putImg(type, buf);
      return out({ id, url: new URL(req.url).origin + "/fbimg/" + id });
    }
    const raw = await req.text(); if (raw.length > MAX_BODY) return out({ error: "too big" }, 413);
    let b; try { b = JSON.parse(raw); } catch (e) { return out({ error: "json" }, 400); }
    if (path === "/feed" || path === "/feed/stop") {
      if (!b || !okKey(b.key)) return out({ error: "key" }, 400);
      const f = await feed(env, b.key);
      if (path === "/feed/stop") return out(await f.stop());
      const ics = typeof b.ics === "string" ? b.ics : "";
      if (ics.length > MAX_ICS) return out({ error: "too big" }, 413);
      if (!/^BEGIN:VCALENDAR\r?\n/.test(ics) || !/END:VCALENDAR\r?\n?$/.test(ics) || /<\s*(script|html|iframe)/i.test(ics)) return out({ error: "not a calendar" }, 400);
      return out(await f.put(ics));
    }
    if (path.startsWith("/social/")) {
      if (raw.length > 64 * 1024) return out({ error: "too big" }, 413);
      const [st, o] = await community(env).handle(path.slice(8), b);
      return out(o, st);
    }
    const ep = b && (b.sub ? b.sub.endpoint : b.endpoint);
    if (typeof ep !== "string" || !okEndpoint(ep, env)) return out({ error: "endpoint" }, 400);
    const dev = env.DEVICES.get(env.DEVICES.idFromName(await sha256(ep)));
    if (path === "/sync") {
      if (!okSub(b.sub, env) || !Array.isArray(b.items)) return out({ error: "bad request" }, 400);
      return out(await dev.sync({ endpoint: b.sub.endpoint, keys: { p256dh: b.sub.keys.p256dh, auth: b.sub.keys.auth } }, b.items, clip(b.lang, 5)));
    }
    if (path === "/unsub") { await dev.forget(); return out({ ok: true }); }
    if (path === "/test") return out({ status: await dev.test({ title: clip(b.title, 120) || "🔔", body: clip(b.body, 240), tag: "test" }, Math.min(Math.max(Number(b.delay) || 0, 0), 120)) });
    return out({ error: "not found" }, 404);
  },
};
