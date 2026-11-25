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
const CAMPS = ["lev", "tal", "tvuna", "lustig"], okCamp = c => CAMPS.includes(c) ? c : "";

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
  async drop(pre) {
    const items = (await this.ctx.storage.get("items")) || [], keep = items.filter(x => !String(x.tag || "").startsWith(pre));
    if (keep.length === items.length) return { dropped: 0 };
    await this.ctx.storage.put("items", keep); await this.rearm(); return { dropped: items.length - keep.length };
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

/* ---------- summaries and solutions shared in the course chats ----------
   The bytes live in one Durable Object per course (FILES, "files:<cid>"), split into 1.5 MB rows, so no single object grows big
   (the free plan: 5 GB for the whole account). What a file is (name, size, who, which chat) is in the community database, with the quotas. */
const F_MAX = 10 * 1024 * 1024;                          // one file
const F_USER = 150 * 1024 * 1024, F_DAY = 15;            // one person: 150 MB in all, 15 uploads a day
const F_COURSE = 700 * 1024 * 1024;                      // one course (one object)
const F_ALL = 3 * 1024 * 1024 * 1024;                    // the whole server: 3 GB of files (the free plan has 5 GB for everything)
const F_CHUNK = 1536 * 1024;
const F_TYPES = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx", "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx", "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx", "application/vnd.ms-excel": "xls" };
const F_KINDS = ["sum", "sol", "other"];
const okFid = s => typeof s === "string" && /^[0-9a-f]{36}$/.test(s);
export class Files extends DurableObject {
  constructor(ctx, env) { super(ctx, env); this.sql = ctx.storage.sql; this.sql.exec("CREATE TABLE IF NOT EXISTS ch (fid TEXT, i INTEGER, data BLOB, PRIMARY KEY (fid, i))"); }
  put(fid, buf) {
    const u = new Uint8Array(buf);
    this.ctx.storage.transactionSync(() => { for (let i = 0, k = 0; i < u.length; i += F_CHUNK, k++) this.sql.exec("INSERT OR REPLACE INTO ch (fid, i, data) VALUES (?, ?, ?)", fid, k, u.slice(i, i + F_CHUNK)); });
    return true;
  }
  get(fid) {
    const rows = this.sql.exec("SELECT data FROM ch WHERE fid = ? ORDER BY i", fid).toArray(); if (!rows.length) return null;
    const parts = rows.map(r => new Uint8Array(r.data)), out = new Uint8Array(parts.reduce((n, x) => n + x.length, 0)); let o = 0;
    for (const x of parts) { out.set(x, o); o += x.length; } return out.buffer;
  }
  del(fid) { this.sql.exec("DELETE FROM ch WHERE fid = ?", fid); return true; }
}
const filesOf = (env, cid) => env.FILES.get(env.FILES.idFromName("files:" + cid));

/* ---------- the community (MoodlePro Community): one SQLite database for everyone ----------
   Trust-based: a user is a random id + a secret the app made (synced between the user's devices through Moodle).
   No Moodle token ever reaches this server. Name, degree and courses are what the app says.
   Reads are kept low (the free plan: 5M rows read, 100k rows written a day): totals and averages are stored as they change,
   and each course's public part is cached in memory until something in that course changes. */
const HOURS = [0.5, 2, 4.5, 8, 12];                       // the five "how long did it take" answers
const PTS = { add: 3, time: 1, wa: 1, star: 2 };
const EMO = ["👍", "❤️", "🔥", "😂", "🙏"];
const okTk = k => typeof k === "string" && /^(c|[a-z]+:[0-9A-Za-z_.-]{1,40})$/.test(k);   // a thread: "c" = the course chat, or a task key (assign:123)
// [earlier id, id in use]: 12.11.2026 – Meir's account (177 points) was replaced when he joined on a second device before its sync arrived
const REPAIRS = [["009e02b977552fd2f5bef065b4bc55ea", "d9d9ec43113385bd0af68794cd5f1e72"],
  ["647d4113d96619485bd6ea504dacf03c", "d37e0f70b45198ea33bc62dadd29e48f"]];   // 12.11: רוני טמבור – two accounts (same name, degree and year) on the board
const okId = s => typeof s === "string" && /^[a-f0-9]{32}$/.test(s);
const okSec = s => typeof s === "string" && /^[a-f0-9]{48}$/.test(s);
const okCid = c => (typeof c === "string" || typeof c === "number") && /^[0-9]{1,12}$/.test(String(c));
const okWa = u => typeof u === "string" && /^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]{10,40}$/.test(u);
// the semester a moment belongs to: Sep–Feb = A (of the year it started), Mar–Aug = B
function semKey(ms) { const d = new Date(ms), y = d.getUTCFullYear(), m = d.getUTCMonth() + 1; return m >= 9 ? y + "A" : m <= 2 ? (y - 1) + "A" : (y - 1) + "B"; }
/* ---------- passkeys (WebAuthn) for community management: the device keeps the private key behind Face ID / fingerprint; the server keeps only the
   public key and checks each signature, the challenge it gave, the site (origin + rpId) and that the person was verified (UV) ---------- */
const hex = u => [...new Uint8Array(u)].map(x => x.toString(16).padStart(2, "0")).join("");
function cbor(u8) {                       // just enough CBOR for an attestation object and a COSE key
  let i = 0; const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength), need = n => { if (i + n > u8.length) throw new Error("cbor"); };
  const len = ai => { if (ai < 24) return ai; if (ai === 24) { need(1); return u8[i++]; } if (ai === 25) { need(2); i += 2; return dv.getUint16(i - 2); } if (ai === 26) { need(4); i += 4; return dv.getUint32(i - 4); } throw new Error("cbor"); };
  const item = depth => { if (depth > 8) throw new Error("cbor"); need(1); const b = u8[i++], mt = b >> 5, ai = b & 31;
    if (mt === 7) { if (ai === 20) return false; if (ai === 21) return true; if (ai === 22) return null; throw new Error("cbor"); }
    const n = len(ai);
    if (mt === 0) return n; if (mt === 1) return -1 - n;
    if (mt === 2 || mt === 3) { need(n); const v = u8.slice(i, i + n); i += n; return mt === 2 ? v : new TextDecoder().decode(v); }
    if (mt === 4) { if (n > 64) throw new Error("cbor"); const a = []; for (let k = 0; k < n; k++) a.push(item(depth + 1)); return a; }
    if (mt === 5) { if (n > 64) throw new Error("cbor"); const m = new Map(); for (let k = 0; k < n; k++) { const key = item(depth + 1); m.set(key, item(depth + 1)); } return m; }
    throw new Error("cbor"); };
  const v = item(0); return [v, i];
}
function der2raw(d) {                     // ECDSA signature: DER → r||s (what WebCrypto wants)
  let p = 2; if (d[0] !== 0x30) throw new Error("sig"); if (d[1] & 0x80) p = 2 + (d[1] & 0x7f);
  const rd = () => { if (d[p++] !== 2) throw new Error("sig"); const l = d[p++]; let v = d.slice(p, p + l); p += l; while (v.length > 32 && v[0] === 0) v = v.slice(1); if (v.length > 32) throw new Error("sig"); const o = new Uint8Array(32); o.set(v, 32 - v.length); return o; };
  const o = new Uint8Array(64); o.set(rd()); o.set(rd(), 32); return o;
}
const PK_ALG = { [-7]: { imp: { name: "ECDSA", namedCurve: "P-256" }, ver: { name: "ECDSA", hash: "SHA-256" } }, [-257]: { imp: { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, ver: { name: "RSASSA-PKCS1-v1_5" } } };
function coseJwk(m) {
  const kty = m.get(1), alg = m.get(3);
  if (kty === 2 && alg === -7 && m.get(-1) === 1) return [alg, { kty: "EC", crv: "P-256", x: b64u(m.get(-2)), y: b64u(m.get(-3)), ext: true }];
  if (kty === 3 && alg === -257) return [alg, { kty: "RSA", n: b64u(m.get(-1)), e: b64u(m.get(-2)), alg: "RS256", ext: true }];
  throw new Error("alg");
}

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
    // community management: who is an admin (claimed once with a one-time code whose hash is in the config), and everything an admin does
    this.sql.exec("CREATE TABLE IF NOT EXISTS admins (uid TEXT PRIMARY KEY, at INTEGER); CREATE TABLE IF NOT EXISTS adclaims (h TEXT PRIMARY KEY, uid TEXT, at INTEGER); CREATE TABLE IF NOT EXISTS adlog (id INTEGER PRIMARY KEY AUTOINCREMENT, uid TEXT, act TEXT, d TEXT, at INTEGER); CREATE TABLE IF NOT EXISTS adtries (uid TEXT, at INTEGER); CREATE TABLE IF NOT EXISTS adkeys (cid TEXT PRIMARY KEY, uid TEXT, alg INTEGER, jwk TEXT, cnt INTEGER, at INTEGER); CREATE TABLE IF NOT EXISTS adch (uid TEXT PRIMARY KEY, ch TEXT, adding INTEGER, at INTEGER); CREATE TABLE IF NOT EXISTS adsess (h TEXT PRIMARY KEY, uid TEXT, exp INTEGER)");
    this.env = env;
    // what happened to me that I'll want to hear about when I open the app (for now: someone starred my message)
    this.sql.exec("CREATE TABLE IF NOT EXISTS notes (id INTEGER PRIMARY KEY AUTOINCREMENT, uid TEXT, kind TEXT, from_uid TEXT, cid TEXT, tk TEXT, mid INTEGER, body TEXT, at INTEGER)");
    this.sql.exec("CREATE INDEX IF NOT EXISTS notes_u ON notes (uid, at)");
    this.sql.exec(`CREATE TABLE IF NOT EXISTS files (id TEXT PRIMARY KEY, cid TEXT, uid TEXT, name TEXT, type TEXT, size INTEGER, kind TEXT, at INTEGER, ok INTEGER DEFAULT 0, mid INTEGER DEFAULT 0, tk TEXT DEFAULT '', del INTEGER DEFAULT 0);
      CREATE INDEX IF NOT EXISTS files_u ON files (uid, at);
      CREATE INDEX IF NOT EXISTS files_c ON files (cid, del, at);
      CREATE TABLE IF NOT EXISTS fsum (k TEXT PRIMARY KEY, v INTEGER);`);
    try { this.sql.exec("ALTER TABLE msgs ADD COLUMN att TEXT"); } catch (e) {}
    try { this.sql.exec("ALTER TABLE users ADD COLUMN camp TEXT"); } catch (e) {}   // campus (lev / tal / tvuna / lustig): rank names are feminine for the women's campuses   // a file attached to a message (JSON: id, name, size, type, kind)
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
  fsz(k) { const r = this.one("SELECT v FROM fsum WHERE k = ?", k); return r ? r.v : 0; }
  fadd(k, n) { this.sql.exec("INSERT INTO fsum (k, v) VALUES (?, ?) ON CONFLICT (k) DO UPDATE SET v = MAX(0, v + excluded.v)", k, n); }
  /* before the bytes are stored: who, where, what, and whether it still fits (each person, each course, the whole server) */
  async fileBegin(b, size) {
    const me = await this.auth(b); if (!me) return [403, { error: "auth" }];
    const cid = okCid(b.cid) ? String(b.cid) : "", type = String(b.type || ""), kind = F_KINDS.includes(b.kind) ? b.kind : "other";
    const name = clip(String(b.fn || "").replace(/[\u0000-\u001f\/\\]/g, " ").trim(), 120) || "file." + (F_TYPES[type] || "bin");
    if (!cid) return [400, { error: "bad" }];
    if (!F_TYPES[type]) return [415, { error: "type" }];
    if (!(size > 0) || size > F_MAX) return [413, { error: "size", max: F_MAX }];
    const now = Date.now();
    if (this.one("SELECT COUNT(*) AS n FROM files WHERE uid = ? AND at > ?", me.uid, now - 864e5).n >= F_DAY) return [429, { error: "day", max: F_DAY }];
    if (this.fsz("u:" + me.uid) + size > F_USER) return [413, { error: "user", max: F_USER }];
    if (this.fsz("c:" + cid) + size > F_COURSE) return [507, { error: "course" }];
    if (this.fsz("all") + size > F_ALL) return [507, { error: "full" }];
    this.sql.exec("DELETE FROM files WHERE ok = 0 AND at < ?", now - 3600e3);   // uploads that never finished
    for (const r of this.q("SELECT id FROM files WHERE uid = ? AND ok = 1 AND mid = 0 AND del = 0 AND at < ?", me.uid, now - 6 * 3600e3)) await this.fileDrop(r.id);   // uploaded but never sent: the space comes back
    const id = [...crypto.getRandomValues(new Uint8Array(18))].map(x => x.toString(16).padStart(2, "0")).join("");
    this.sql.exec("INSERT INTO files (id, cid, uid, name, type, size, kind, at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", id, cid, me.uid, name, type, size, kind, now);
    this.course(cid, b.cname);
    return [200, { id, cid, name, type, size, kind }];
  }
  fileDone(id) {
    const f = this.one("SELECT uid, cid, size, ok FROM files WHERE id = ?", id); if (!f || f.ok) return;
    this.ctx.storage.transactionSync(() => { this.sql.exec("UPDATE files SET ok = 1 WHERE id = ?", id); for (const k of ["u:" + f.uid, "c:" + f.cid, "all"]) this.fadd(k, f.size); });
  }
  fileAbort(id) { this.sql.exec("DELETE FROM files WHERE id = ? AND ok = 0", id); }
  fileMeta(id) { const f = this.one("SELECT cid, name, type, size FROM files WHERE id = ? AND ok = 1 AND del = 0", id); return f || null; }
  /* a file stops being shared (its message was deleted): the bytes go too, and the space comes back */
  async fileDrop(id) {
    const f = this.one("SELECT uid, cid, size, ok, del FROM files WHERE id = ?", id); if (!f || f.del) return;
    this.sql.exec("UPDATE files SET del = 1 WHERE id = ?", id);
    if (f.ok) for (const k of ["u:" + f.uid, "c:" + f.cid, "all"]) this.fadd(k, -f.size);
    try { await filesOf(this.env, f.cid).del(id); } catch (e) {}
  }
  getImg(id) { const r = this.one("SELECT type, data FROM imgs WHERE id = ?", id); return r ? { type: r.type, data: r.data } : null; }
  q(sql, ...a) { return this.sql.exec(sql, ...a).toArray(); }
  one(sql, ...a) { return this.q(sql, ...a)[0] || null; }
  async auth(b) {
    if (!b || !okId(b.uid) || !okSec(b.sec)) return null;
    const h = await sha256("soc:" + b.sec), u = this.one("SELECT uid, sech, name, deg, yr, camp FROM users WHERE uid = ?", b.uid);
    if (u) return u.sech === h ? u : null;
    const name = clip(b.name, 60).trim(); if (!name) return null;
    this.sql.exec("INSERT INTO users (uid, sech, name, deg, yr, camp, seen) VALUES (?, ?, ?, ?, ?, ?, ?)", b.uid, h, name, clip(b.deg, 60), clip(b.yr, 20), okCamp(b.camp), Date.now());
    return { uid: b.uid, sech: h, name, deg: clip(b.deg, 60), yr: clip(b.yr, 20), camp: okCamp(b.camp) };
  }
  /* the same person under an earlier id (another device made its own before the two met through sync): they still hold its secret, so its points,
     log, time reports, messages and shares move to the id in use. Nothing is ever deleted except the empty old account. */
  async mergeInto(me, olds) {
    const done = [];
    for (const o of (Array.isArray(olds) ? olds : []).slice(0, 8)) {
      if (!o || !okId(o.uid) || !okSec(o.sec) || o.uid === me.uid) continue;
      const u = this.one("SELECT uid, sech FROM users WHERE uid = ?", o.uid);
      if (!u) { done.push(o.uid); continue; }                                    // never used on the server: nothing to bring over
      if (u.sech !== await sha256("soc:" + o.sec)) continue;
      this.moveUser(o.uid, me.uid); done.push(o.uid);
    }
    return done;
  }
  moveUser(a, b) {
      this.ctx.storage.transactionSync(() => {
        this.sql.exec("UPDATE ledger SET uid = ? WHERE uid = ?", b, a);
        this.sql.exec("UPDATE ledger SET from_uid = ? WHERE from_uid = ?", b, a);
        for (const r of this.q("SELECT cid, per, pts FROM tot WHERE uid = ?", a))
          this.sql.exec("INSERT INTO tot (uid, cid, per, pts) VALUES (?, ?, ?, ?) ON CONFLICT (uid, cid, per) DO UPDATE SET pts = pts + excluded.pts", b, r.cid, r.per, r.pts);
        this.sql.exec("DELETE FROM tot WHERE uid = ?", a);
        for (const r of this.q("SELECT cid, aid, h FROM times WHERE uid = ?", a)) {
          if (this.one("SELECT h FROM times WHERE cid = ? AND aid = ? AND uid = ?", r.cid, r.aid, b)) this.sql.exec("UPDATE agg SET sum = sum - ?, n = n - 1 WHERE cid = ? AND aid = ?", r.h, r.cid, r.aid);   // reported from both: one report
          else this.sql.exec("UPDATE times SET uid = ? WHERE cid = ? AND aid = ? AND uid = ?", b, r.cid, r.aid, a);
        }
        this.sql.exec("DELETE FROM times WHERE uid = ?", a);
        for (const tb of ["msgs", "shares", "notes"]) this.sql.exec(`UPDATE ${tb} SET uid = ? WHERE uid = ?`, b, a);
        this.sql.exec("UPDATE notes SET from_uid = ? WHERE from_uid = ?", b, a);
        for (const tb of ["adds", "stars", "reacts"]) { this.sql.exec(`UPDATE OR IGNORE ${tb} SET uid = ? WHERE uid = ?`, b, a); this.sql.exec(`DELETE FROM ${tb} WHERE uid = ?`, a); }
        this.sql.exec("UPDATE courses SET wa_by = ? WHERE wa_by = ?", b, a);
        this.sql.exec("DELETE FROM users WHERE uid = ?", a);
      });
      this.cc.clear();
  }
  /* one-time repairs: a person whose earlier id got replaced before the app kept old ids (1.7.0-beta.8). Moves only when both accounts exist and carry the same name. */
  repairs() {
    if (this.repaired) return; this.repaired = true;
    for (const [a, b] of REPAIRS) {
      const ua = this.one("SELECT name FROM users WHERE uid = ?", a), ub = this.one("SELECT name FROM users WHERE uid = ?", b);
      if (ua && ub && ua.name && ua.name === ub.name) this.moveUser(a, b);
    }
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
  isAdmin(uid) { return !!this.one("SELECT uid FROM admins WHERE uid = ?", uid); }
  adlog(uid, act, d) { this.sql.exec("INSERT INTO adlog (uid, act, d, at) VALUES (?, ?, ?, ?)", uid, act, d || "", Date.now()); }
  pts(uid) { const r = this.q("SELECT per, pts FROM tot WHERE uid = ? AND cid = ''", uid), sem = semKey(Date.now()); return { all: (r.find(x => x.per === "all") || {}).pts || 0, sem: (r.find(x => x.per === sem) || {}).pts || 0 }; }
  pub(cid) {                                                // a course's shared part, cached until it changes
    if (this.cc.has(cid)) return this.cc.get(cid);
    const c = this.one("SELECT wa, wa_by FROM courses WHERE cid = ?", cid) || {}, t = {};
    for (const r of this.q("SELECT aid, sum, n FROM agg WHERE cid = ?", cid)) t[r.aid] = [Math.round(r.sum / r.n * 10) / 10, r.n];
    const sh = this.q(`SELECT s.id, s.uid, s.kind, s.d, s.at, s.adds, u.name, u.deg, u.yr, u.camp FROM shares s LEFT JOIN users u ON u.uid = s.uid
      WHERE s.cid = ? AND s.del = 0 AND s.at > ? ORDER BY s.at LIMIT 40`, cid, Math.floor(Date.now() / 1000) - 86400)
      .map(r => ({ id: r.id, uid: r.uid, kind: r.kind, d: JSON.parse(r.d || "{}"), at: r.at, adds: r.adds, name: r.name || "", deg: r.deg || "", yr: r.yr || "", camp: r.camp || "" }));
    const wb = c.wa_by ? this.one("SELECT name FROM users WHERE uid = ?", c.wa_by) : null, th = {};
    for (const r of this.q("SELECT tk, n, last, ref, lb, lt FROM thr WHERE cid = ? AND n > 0", cid)) th[r.tk] = [r.n, r.last, r.ref || "", r.lb || "", r.lt || ""];
    const v = { wa: c.wa || "", waBy: wb ? wb.name : "", t, sh, th };
    this.cc.set(cid, v); return v;
  }
  async handle(op, b) {
    this.repairs();
    const me = await this.auth(b); if (!me) return [403, { error: "auth" }];
    const now = Date.now();
    if (op === "overview") {
      const name = clip(b.name, 60).trim(), deg = b.deg === undefined ? me.deg || "" : clip(b.deg, 60), yr = b.yr === undefined ? me.yr || "" : clip(b.yr, 20), camp = b.camp === undefined ? me.camp || "" : okCamp(b.camp);
      if ((name && name !== me.name) || deg !== (me.deg || "") || yr !== (me.yr || "") || camp !== (me.camp || "")) this.sql.exec("UPDATE users SET name = ?, deg = ?, yr = ?, camp = ?, seen = ? WHERE uid = ?", name || me.name, deg, yr, camp, now, me.uid);
      const merged = Array.isArray(b.old) && b.old.length ? await this.mergeInto(me, b.old) : [];
      const cs = (Array.isArray(b.courses) ? b.courses : []).filter(c => c && okCid(c.id)).slice(0, 40), out = {};
      for (const c of cs) { const cid = String(c.id); this.course(cid, c.name); out[cid] = this.pub(cid); }
      const mine = {}; for (const r of this.q("SELECT cid, aid, h FROM times WHERE uid = ?", me.uid)) mine[r.cid + ":" + r.aid] = r.h;
      const added = this.q("SELECT sid FROM adds WHERE uid = ?", me.uid).map(r => r.sid);
      const since = Math.max(Number(b.ns) || 0, now - 14 * 86400e3);
      const notes = this.q(`SELECT n.id, n.kind, n.cid, n.tk, n.mid, n.body, n.at, u.name, t.ref FROM notes n LEFT JOIN users u ON u.uid = n.from_uid LEFT JOIN thr t ON t.cid = n.cid AND t.tk = n.tk
        WHERE n.uid = ? AND n.at > ? ORDER BY n.at DESC LIMIT 20`, me.uid, since).map(r => ({ id: r.id, kind: r.kind, cid: r.cid, tk: r.tk, mid: r.mid, body: r.body || "", at: r.at, name: r.name || "", ref: r.ref || "" }));
      return [200, { me: { uid: me.uid, ...this.pts(me.uid), ...(this.isAdmin(me.uid) ? { admin: true } : {}) }, c: out, mine, added, notes, merged }];
    }
    const cid = okCid(b.cid) ? String(b.cid) : "";
    if (op === "time") {
      const h = Number(b.h), aid = clip(b.aid, 40);
      if (!cid || !aid || !HOURS.includes(h)) return [400, { error: "bad" }];
      if (Number(b.due) > 0 && Number(b.due) * 1000 + 12 * 3600e3 < now) return [400, { error: "late" }];   // closed 12 h after the deadline (helps nobody, no points)
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
      const rows = this.q(`SELECT t.uid, t.h, t.at, u.name, u.deg, u.yr, u.camp FROM times t LEFT JOIN users u ON u.uid = t.uid WHERE t.cid = ? AND t.aid = ? ORDER BY t.at DESC LIMIT 200`, cid, aid);
      return [200, { rows: rows.map(r => ({ uid: r.uid, h: r.h, at: r.at, name: r.name || "", deg: r.deg || "", yr: r.yr || "", camp: r.camp || "" })) }];
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
      const d = b.d || {}, dd = JSON.stringify({ n: clip(d.n, 100), k: clip(d.k, 10), note: clip(d.note, 200), s: clip(d.s, 16), allDay: !!d.allDay, aud: ["camp", "cdy"].includes(d.aud) ? d.aud : "all" });      // who it's for (Pnina); the app shows it only to them
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
      const ms = this.q(`SELECT m.id, m.uid, m.body, m.reply, m.at, m.del, m.stars, m.att, u.name, u.deg, u.yr, u.camp, (SELECT pts FROM tot a WHERE a.uid = m.uid AND a.cid = '' AND a.per = 'all') AS total
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
        if (ms.some(m => m.stars > 0 && m.uid === me.uid))  // who starred my messages (only the writer sees it)
          for (const r of this.q("SELECT s.mid, u.name FROM stars s LEFT JOIN users u ON u.uid = s.uid WHERE s.mid >= ? AND s.mid <= ?", lo, hi))
            if (here.has(r.mid) && ms.find(m => m.id === r.mid).uid === me.uid) (sb[r.mid] = sb[r.mid] || []).length < 20 && sb[r.mid].push(r.name || "");
      }
      return [200, { ver, msgs: ms.map(m => ({ id: m.id, uid: m.uid, name: m.name || "", deg: m.deg || "", yr: m.yr || "", camp: m.camp || "", total: m.total || 0, body: m.del ? "" : m.body, del: !!m.del,
        reply: m.reply || 0, at: m.at, stars: m.stars, starred: mine.has(m.id), sb: sb[m.id] || [], re: re[m.id] || [], att: m.del || !m.att ? null : JSON.parse(m.att) })) }];
    }
    if (op === "post") {
      const tk = b.tk, body = String(b.body || "").trim().slice(0, 2000);
      // a file uploaded just before (POST /sfile): mine, in this course, finished, and not attached to another message
      const f = b.att ? this.one("SELECT id, name, size, type, kind FROM files WHERE id = ? AND uid = ? AND cid = ? AND ok = 1 AND del = 0 AND mid = 0", okFid(b.att) ? b.att : "", me.uid, cid) : null;
      if (b.att && !f) return [400, { error: "file" }];
      if (!cid || !okTk(tk) || (!body && !f)) return [400, { error: "bad" }];
      this.course(cid, b.cname);
      const reply = Number(b.reply) > 0 && this.one("SELECT id FROM msgs WHERE id = ? AND cid = ? AND tk = ?", Number(b.reply), cid, tk) ? Number(b.reply) : 0;
      const att = f ? JSON.stringify({ id: f.id, n: f.name, s: f.size, t: f.type, k: f.kind }) : null;
      this.sql.exec("INSERT INTO msgs (cid, tk, uid, body, reply, at, att) VALUES (?, ?, ?, ?, ?, ?, ?)", cid, tk, me.uid, body, reply, now, att);
      const id = this.one("SELECT last_insert_rowid() AS id").id;
      if (f) this.sql.exec("UPDATE files SET mid = ?, tk = ? WHERE id = ?", id, tk, f.id);
      this.sql.exec("INSERT INTO thr (cid, tk, n, last, ver, ref, lb, lt) VALUES (?, ?, 1, ?, 1, ?, ?, ?) ON CONFLICT (cid, tk) DO UPDATE SET n = n + 1, last = excluded.last, ver = ver + 1, ref = CASE WHEN excluded.ref != '' THEN excluded.ref ELSE ref END, lb = excluded.lb, lt = excluded.lt",
        cid, tk, now, clip(b.ref, 120), me.name || "", (body || "📎 " + f.name).replace(/\s+/g, " ").slice(0, 90));
      this.cc.delete(cid); return [200, { id }];
    }
    if (op === "msgdel" || op === "react" || op === "star") {
      const m = this.one("SELECT id, cid, tk, uid, body, att FROM msgs WHERE id = ? AND del = 0", Number(b.id)); if (!m) return [404, { error: "gone" }];
      if (op === "msgdel") {
        if (m.uid !== me.uid) return [403, { error: "not yours" }];
        this.sql.exec("UPDATE msgs SET del = 1, body = '' WHERE id = ?", m.id);
        if (m.att) { try { await this.fileDrop(JSON.parse(m.att).id); } catch (e) {} }
        const lm = this.one("SELECT m.body, u.name FROM msgs m LEFT JOIN users u ON u.uid = m.uid WHERE m.cid = ? AND m.tk = ? AND m.del = 0 ORDER BY m.id DESC LIMIT 1", m.cid, m.tk);
        this.sql.exec("UPDATE thr SET n = n - 1, ver = ver + 1, lb = ?, lt = ? WHERE cid = ? AND tk = ?", lm ? lm.name || "" : "", lm ? lm.body.replace(/\s+/g, " ").slice(0, 90) : "", m.cid, m.tk); this.cc.delete(m.cid);
      } else if (op === "react") {
        if (!EMO.includes(b.emo)) return [400, { error: "bad" }];
        if (this.one("SELECT mid FROM reacts WHERE mid = ? AND uid = ? AND emo = ?", m.id, me.uid, b.emo)) this.sql.exec("DELETE FROM reacts WHERE mid = ? AND uid = ? AND emo = ?", m.id, me.uid, b.emo);
        else this.sql.exec("INSERT INTO reacts (mid, uid, emo) VALUES (?, ?, ?)", m.id, me.uid, b.emo);
        this.sql.exec("UPDATE thr SET ver = ver + 1 WHERE cid = ? AND tk = ?", m.cid, m.tk);
      } else {                                              // "helpful answer": once per person, +2 to the writer (not for your own)
        if (m.uid === me.uid) return [400, { error: "own" }];
        const au = this.one("SELECT name FROM users WHERE uid = ?", m.uid);                 // the same person on another device (same name): still their own
        if (au && au.name && me.name && au.name.trim() === me.name.trim()) return [400, { error: "own" }];
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
    if (op === "files") {                                   // every summary and solution shared in a course's chats (newest first)
      if (!cid) return [400, { error: "bad" }];
      const rows = this.q(`SELECT f.id, f.name, f.size, f.type, f.kind, f.at, f.mid, f.tk, f.uid, u.name AS who, t.ref, m.stars FROM files f LEFT JOIN users u ON u.uid = f.uid
        LEFT JOIN thr t ON t.cid = f.cid AND t.tk = f.tk LEFT JOIN msgs m ON m.id = f.mid WHERE f.cid = ? AND f.del = 0 AND f.ok = 1 AND f.mid > 0 ORDER BY f.at DESC LIMIT 200`, cid);
      return [200, { files: rows.map(r => ({ id: r.id, n: r.name, s: r.size, t: r.type, k: r.kind, at: r.at, mid: r.mid, tk: r.tk, uid: r.uid, who: r.who || "", ref: r.ref || "", stars: r.stars || 0 })),
        mine: { used: this.fsz("u:" + me.uid), max: F_USER } }];
    }
    if (op === "board") {
      const per = b.per === "sem" ? semKey(now) : "all", deg = clip(b.deg, 60);
      const rows = this.q(`SELECT t.uid, t.pts, u.name, u.deg, u.yr, u.camp, (SELECT pts FROM tot a WHERE a.uid = t.uid AND a.cid = '' AND a.per = 'all') AS total
        FROM tot t JOIN users u ON u.uid = t.uid WHERE t.cid = ? AND t.per = ? AND t.pts > 0 ${deg ? "AND u.deg = ?" : ""} ORDER BY t.pts DESC, t.uid LIMIT 20`, cid, per, ...(deg ? [deg] : []));
      const mine = this.one("SELECT pts FROM tot WHERE uid = ? AND cid = ? AND per = ?", me.uid, cid, per);
      const pos = mine && mine.pts > 0 ? this.one(`SELECT COUNT(*) AS n FROM tot t ${deg ? "JOIN users u ON u.uid = t.uid" : ""} WHERE t.cid = ? AND t.per = ? AND t.pts > ? ${deg ? "AND u.deg = ?" : ""}`, cid, per, mine.pts, ...(deg ? [deg] : [])).n + 1 : 0;
      const cn = cid ? this.one("SELECT name FROM courses WHERE cid = ?", cid) : null;
      return [200, { rows: rows.map(r => ({ uid: r.uid, pts: r.pts, total: r.total || 0, name: r.name, deg: r.deg, yr: r.yr, camp: r.camp || "" })), me: { pts: mine ? mine.pts : 0, pos }, cname: cn ? cn.name : "" }];
    }
    /* ---------- community management (admins only; every call is checked here, on the server) ---------- */
    if (op === "admin/claim") {
      // a one-time code: only its SHA-256 is in the config, it works once, and 5 wrong tries a day per account are allowed
      const tries = this.one("SELECT COUNT(*) AS n FROM adtries WHERE uid = ? AND at > ?", me.uid, now - 864e5).n;
      if (tries >= 5) return [429, { error: "tries" }];
      const want = String((this.env && this.env.ADMIN_CLAIM_H) || ""), h = [...new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode("admin:" + clip(b.code, 100))))].map(x => x.toString(16).padStart(2, "0")).join("");
      if (!/^[0-9a-f]{64}$/.test(want) || h !== want || this.one("SELECT h FROM adclaims WHERE h = ?", h)) { this.sql.exec("INSERT INTO adtries (uid, at) VALUES (?, ?)", me.uid, now); return [403, { error: "code" }]; }
      this.sql.exec("INSERT INTO adclaims (h, uid, at) VALUES (?, ?, ?)", h, me.uid, now);
      this.sql.exec("INSERT OR IGNORE INTO admins (uid, at) VALUES (?, ?)", me.uid, now);
      this.sql.exec("DELETE FROM adkeys WHERE uid = ?", me.uid); this.sql.exec("DELETE FROM adsess WHERE uid = ?", me.uid);   // a new code from the owner also starts the passkeys over (recovery)
      this.adlog(me.uid, "claim", "");
      return [200, { admin: true }];
    }
    if (op.startsWith("admin/")) {
      if (!this.isAdmin(me.uid)) return [403, { error: "not admin" }];
      /* a passkey session is needed for everything below; these three make one */
      const origin = String(b.__o || ""), rp = /^https?:\/\/[^/]+$/.test(origin) ? new URL(origin).hostname : "";
      const sess = async () => { const h = hex(await crypto.subtle.digest("SHA-256", enc.encode("s:" + clip(b.at, 100)))); const r = b.at ? this.one("SELECT uid FROM adsess WHERE h = ? AND exp > ?", h, now) : null; return !!r && r.uid === me.uid; };
      const newSess = async () => { const at = b64u(crypto.getRandomValues(new Uint8Array(32))), ttl = 30 * 60e3;
        this.sql.exec("DELETE FROM adsess WHERE exp < ?", now); this.sql.exec("INSERT INTO adsess (h, uid, exp) VALUES (?, ?, ?)", hex(await crypto.subtle.digest("SHA-256", enc.encode("s:" + at))), me.uid, now + ttl); return [200, { at, ttl }]; };
      const fail = () => { this.sql.exec("INSERT INTO adtries (uid, at) VALUES (?, ?)", me.uid, now); return [403, { error: "passkey" }]; };
      const keys = () => this.q("SELECT cid FROM adkeys WHERE uid = ?", me.uid).map(r => r.cid);
      if (op === "admin/pk/begin" || op === "admin/pk/reg" || op === "admin/pk/auth") {
        if (!rp) return [403, { error: "origin" }];
        if (this.one("SELECT COUNT(*) AS n FROM adtries WHERE uid = ? AND at > ?", me.uid, now - 864e5).n >= 10) return [429, { error: "tries" }];
        if (op === "admin/pk/begin") {
          const ch = b64u(crypto.getRandomValues(new Uint8Array(32))), ids = keys();
          this.sql.exec("INSERT OR REPLACE INTO adch (uid, ch, adding, at) VALUES (?, ?, ?, ?)", me.uid, ch, ids.length && (await sess()) ? 1 : 0, now);
          return [200, { ch, has: ids.length > 0, ids, rp, uh: b64u((await crypto.subtle.digest("SHA-256", enc.encode("adm:" + me.uid))).slice(0, 16)) }];
        }
        const c = this.one("SELECT ch, adding, at FROM adch WHERE uid = ?", me.uid); this.sql.exec("DELETE FROM adch WHERE uid = ?", me.uid);   // a challenge works once, for 3 minutes
        if (!c || now - c.at > 3 * 60e3) return fail();
        let cd; try { cd = JSON.parse(new TextDecoder().decode(unb64u(clip(b.cd, 4000)))); } catch (e) { return fail(); }
        if (!cd || cd.challenge !== c.ch || cd.origin !== origin || cd.type !== (op === "admin/pk/reg" ? "webauthn.create" : "webauthn.get")) return fail();
        const rph = new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(rp)));
        const okAd = (ad, flagsNeed) => ad.length >= 37 && rph.every((x, k) => ad[k] === x) && (ad[32] & flagsNeed) === flagsNeed;   // the site's hash, UP (0x01) + UV (0x04)
        try {
          if (op === "admin/pk/reg") {
            const have = keys(); if (have.length && !c.adding) return fail();            // the first key needs only the admin account; any more need a passkey session
            if (have.length >= 6) return [400, { error: "too many keys" }];
            const [ao] = cbor(unb64u(clip(b.ao, 6000))), ad = ao instanceof Map ? ao.get("authData") : null;
            if (!(ad instanceof Uint8Array) || !okAd(ad, 0x45)) return fail();          // + AT (0x40): it carries the new key
            const dv = new DataView(ad.buffer, ad.byteOffset, ad.byteLength), n = dv.getUint16(53), cid = b64u(ad.slice(55, 55 + n));
            if (!n || n > 1023) return fail();
            const [cose] = cbor(ad.slice(55 + n)), [alg, jwk] = coseJwk(cose);
            await crypto.subtle.importKey("jwk", jwk, PK_ALG[alg].imp, false, ["verify"]);
            if (this.one("SELECT cid FROM adkeys WHERE cid = ?", cid)) return fail();
            this.sql.exec("INSERT INTO adkeys (cid, uid, alg, jwk, cnt, at) VALUES (?, ?, ?, ?, ?, ?)", cid, me.uid, alg, JSON.stringify(jwk), dv.getUint32(33), now);
            this.adlog(me.uid, "pkadd", "");
            return await newSess();
          }
          const k = this.one("SELECT * FROM adkeys WHERE cid = ? AND uid = ?", clip(b.id, 1400), me.uid); if (!k) return fail();
          const ad = unb64u(clip(b.ad, 2000)); if (!okAd(ad, 0x05)) return fail();
          const data = new Uint8Array(ad.length + 32); data.set(ad); data.set(new Uint8Array(await crypto.subtle.digest("SHA-256", unb64u(clip(b.cd, 4000)))), ad.length);
          const key = await crypto.subtle.importKey("jwk", JSON.parse(k.jwk), PK_ALG[k.alg].imp, false, ["verify"]);
          let sig = unb64u(clip(b.sig, 1200)); if (k.alg === -7) sig = der2raw(sig);
          if (!(await crypto.subtle.verify(PK_ALG[k.alg].ver, key, sig, data))) return fail();
          const cnt = new DataView(ad.buffer, ad.byteOffset, ad.byteLength).getUint32(33);
          if ((cnt || k.cnt) && cnt <= k.cnt) return fail();                              // a counter that went back = a cloned key
          this.sql.exec("UPDATE adkeys SET cnt = ? WHERE cid = ?", cnt, k.cid);
          this.adlog(me.uid, "pkin", "");
          return await newSess();
        } catch (e) { return fail(); }
      }
      if (!(await sess())) return [401, { error: "pk" }];
      const D = 864e5, nm = uid => (this.one("SELECT name FROM users WHERE uid = ?", uid) || {}).name || "";
      const cname = cid => (this.one("SELECT name FROM courses WHERE cid = ?", cid) || {}).name || "";
      const tname = (cid, tk) => tk === "c" ? "" : ((this.one("SELECT ref FROM thr WHERE cid = ? AND tk = ?", cid, tk) || {}).ref || tk);
      const msg = m => ({ id: m.id, cid: m.cid, cn: m.cname || cname(m.cid), tk: m.tk, tn: tname(m.cid, m.tk), uid: m.uid, name: m.name || nm(m.uid), body: m.del ? "" : m.body, del: !!m.del, at: m.at, stars: m.stars || 0 });
      if (op === "admin/ov") {
        const n = (sql, ...a) => this.one(sql, ...a).n || 0;
        const days = []; for (let i = 13; i >= 0; i--) { const a = new Date(now - i * D); a.setUTCHours(0, 0, 0, 0); const s0 = a.getTime(); days.push({ d: new Date(s0).toISOString().slice(0, 10), n: n("SELECT COUNT(*) AS n FROM msgs WHERE at >= ? AND at < ?", s0, s0 + D) }); }
        const courses = this.q(`SELECT m.cid, c.name, COUNT(*) AS msgs, MAX(m.at) AS last, COUNT(DISTINCT m.uid) AS people, SUM(CASE WHEN m.at > ? THEN 1 ELSE 0 END) AS week
          FROM msgs m LEFT JOIN courses c ON c.cid = m.cid WHERE m.del = 0 GROUP BY m.cid ORDER BY last DESC LIMIT 200`, now - 7 * D);
        const recent = this.q("SELECT m.*, u.name, c.name AS cname FROM msgs m LEFT JOIN users u ON u.uid = m.uid LEFT JOIN courses c ON c.cid = m.cid ORDER BY m.id DESC LIMIT 80").map(msg);
        const top = this.q("SELECT t.uid, t.pts, u.name, u.deg, u.yr, u.camp FROM tot t JOIN users u ON u.uid = t.uid WHERE t.cid = '' AND t.per = 'all' ORDER BY t.pts DESC LIMIT 15");
        return [200, { stats: { users: n("SELECT COUNT(*) AS n FROM users"), active7: n("SELECT COUNT(*) AS n FROM users WHERE seen > ?", now - 7 * D), active1: n("SELECT COUNT(*) AS n FROM users WHERE seen > ?", now - D),
          msgs: n("SELECT COUNT(*) AS n FROM msgs WHERE del = 0"), msgs1: n("SELECT COUNT(*) AS n FROM msgs WHERE at > ?", now - D), msgs7: n("SELECT COUNT(*) AS n FROM msgs WHERE at > ?", now - 7 * D),
          posters7: n("SELECT COUNT(DISTINCT uid) AS n FROM msgs WHERE at > ?", now - 7 * D), files: n("SELECT COUNT(*) AS n FROM files WHERE ok = 1 AND del = 0"), shares: n("SELECT COUNT(*) AS n FROM shares WHERE del = 0"),
          times: n("SELECT COUNT(*) AS n FROM times"), stars: n("SELECT COUNT(*) AS n FROM stars") }, days, courses, recent, top }];
      }
      if (op === "admin/course") {          // a course's threads, newest first
        const cid = clip(b.cid, 20);
        return [200, { cid, name: cname(cid), thr: this.q("SELECT tk, n, last, ref FROM thr WHERE cid = ? ORDER BY last DESC LIMIT 100", cid) }];
      }
      if (op === "admin/thread") {
        const cid = clip(b.cid, 20), tk = clip(b.tk, 60);
        const L = this.q("SELECT m.*, u.name FROM msgs m LEFT JOIN users u ON u.uid = m.uid WHERE m.cid = ? AND m.tk = ? ORDER BY m.id DESC LIMIT 300", cid, tk).reverse();
        return [200, { cid, tk, name: cname(cid), tn: tname(cid, tk), msgs: L.map(msg) }];
      }
      if (op === "admin/users") {
        const q = clip(b.q, 40).trim();
        const L = this.q(`SELECT u.uid, u.name, u.deg, u.yr, u.camp, u.seen, (SELECT pts FROM tot t WHERE t.uid = u.uid AND t.cid = '' AND t.per = 'all') AS pts,
          (SELECT COUNT(*) FROM msgs m WHERE m.uid = u.uid) AS msgs FROM users u ${q ? "WHERE u.name LIKE ?" : ""} ORDER BY u.seen DESC LIMIT 60`, ...(q ? ["%" + q.replace(/[%_]/g, "") + "%"] : []));
        return [200, { users: L.map(u => ({ ...u, pts: u.pts || 0, admin: this.isAdmin(u.uid) })) }];
      }
      if (op === "admin/grant") {         // points by hand (beta testers, steady feedback givers): a reason, -500..500, shown in their points log
        const to = okId(b.to) ? b.to : "", pts = Math.trunc(Number(b.pts)), why = clip(b.why, 80).trim();
        if (!to || !this.one("SELECT uid FROM users WHERE uid = ?", to)) return [404, { error: "no such user" }];
        if (!pts || Math.abs(pts) > 500 || why.length < 2) return [400, { error: "bad grant" }];
        if (this.one("SELECT COUNT(*) AS n FROM adlog WHERE uid = ? AND act = 'grant' AND at > ?", me.uid, now - 60e3).n >= 20) return [429, { error: "slow down" }];
        this.award(to, pts, "admin", me.uid, "", why);
        this.adlog(me.uid, "grant", JSON.stringify({ to, name: nm(to), pts, why }));
        return [200, { ok: true, total: this.pts(to) }];
      }
      if (op === "admin/log") return [200, { log: this.q("SELECT a.*, u.name FROM adlog a LEFT JOIN users u ON u.uid = a.uid ORDER BY a.id DESC LIMIT 100") }];
      return [404, { error: "not found" }];
    }
    if (op === "ranks") {            // how many people are at each rank (all-time points; the thresholds match RANKS in social.js)
      const th = [0, 30, 80, 150, 350, 800, 2000], all = this.one("SELECT COUNT(*) AS n FROM users").n || 0;
      const n = th.map((lo, i) => i === 0 ? 0 : this.one("SELECT COUNT(*) AS n FROM tot WHERE cid = '' AND per = 'all' AND pts >= ?" + (i < th.length - 1 ? " AND pts < ?" : ""), lo, ...(i < th.length - 1 ? [th[i + 1]] : [])).n);
      n[0] = Math.max(0, all - n.reduce((a, x) => a + x, 0));
      return [200, { n, all }];
    }
    if (op === "user") {
      const who = okId(b.who) ? b.who : me.uid, u = this.one("SELECT uid, name, deg, yr, camp FROM users WHERE uid = ?", who);
      if (!u) return [404, { error: "no such user" }];
      const p = this.pts(who), pos = p.all > 0 ? this.one("SELECT COUNT(*) AS n FROM tot WHERE cid = '' AND per = 'all' AND pts > ?", p.all).n + 1 : 0;
      const log = this.q(`SELECT l.pts, l.kind, l.ref, l.at, l.cid, f.name AS fname, f.uid AS fuid, c.name AS cname FROM ledger l LEFT JOIN users f ON f.uid = l.from_uid AND l.from_uid != ''
        LEFT JOIN courses c ON c.cid = l.cid WHERE l.uid = ? ORDER BY l.at DESC LIMIT 100`, who);
      const by = this.q("SELECT cid, pts FROM tot WHERE uid = ? AND cid != '' AND per = 'all' ORDER BY pts DESC LIMIT 12", who)
        .map(r => ({ cid: r.cid, pts: r.pts, name: (this.one("SELECT name FROM courses WHERE cid = ?", r.cid) || {}).name || "" }));
      return [200, { u: { uid: u.uid, name: u.name, deg: u.deg, yr: u.yr, camp: u.camp || "", ...p, pos }, log, by }];
    }
    return [404, { error: "not found" }];
  }
}
const community = env => env.COMMUNITY.get(env.COMMUNITY.idFromName("main"));

/* ---------- the HTTP side the app talks to ---------- */
export default {
  async fetch(req, env) {
    const origin = req.headers.get("Origin") || "";
    // DEV_ORIGIN is set only on the test copy of this server (moodle-task-push-dev, its own empty data): "*.github.io" lets a helper's fork use it
    const allowed = ORIGINS.includes(origin) || (env.DEV_ORIGIN && (origin === env.DEV_ORIGIN || (env.DEV_ORIGIN === "*.github.io" && /^https:\/\/[a-z0-9-]+\.github\.io$/i.test(origin))));
    const H = { "Access-Control-Allow-Origin": allowed ? origin : ORIGINS[0], "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, X-Soc", "Access-Control-Max-Age": "86400", Vary: "Origin" };
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
    { const m = /^\/sfile\/([0-9a-f]{36})(?:\/[^/]*)?$/.exec(path);       // a shared summary / solution: behind a link nobody can guess (only community members see it in a chat)
      if (m && req.method === "GET") {
        const f = await community(env).fileMeta(m[1]); if (!f) return new Response("not found", { status: 404 });
        const data = await filesOf(env, f.cid).get(m[1]); if (!data) return new Response("not found", { status: 404 });
        const inline = f.type === "application/pdf" || f.type.startsWith("image/"), dl = new URL(req.url).searchParams.has("dl");
        return new Response(data, { headers: { "Content-Type": f.type, "Content-Length": String(data.byteLength), "Cache-Control": "private, max-age=604800",
          "Content-Disposition": (inline && !dl ? "inline" : "attachment") + "; filename*=UTF-8''" + encodeURIComponent(f.name), "X-Content-Type-Options": "nosniff",
          // a PDF opens in the browser's own viewer (a strict policy can block it there); everything else may not run anything
          ...(f.type === "application/pdf" ? {} : { "Content-Security-Policy": "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox" }), "Referrer-Policy": "no-referrer" } });
      } }
    if (req.method !== "POST") return out({ error: "not found" }, 404);
    if (!allowed) return out({ error: "origin" }, 403);
    if (path === "/sfile") {            // upload: the bytes as the body, who and what in the X-Soc header (JSON, URI-encoded)
      let b; try { b = JSON.parse(decodeURIComponent(req.headers.get("X-Soc") || "")); } catch (e) { return out({ error: "json" }, 400); }
      const len = Number(req.headers.get("Content-Length") || 0); if (len > F_MAX + 1024) return out({ error: "size", max: F_MAX }, 413);
      b.type = (req.headers.get("Content-Type") || "").split(";")[0].trim().toLowerCase();
      const buf = await req.arrayBuffer(); if (buf.byteLength > F_MAX) return out({ error: "size", max: F_MAX }, 413);
      const C = community(env), [st, o] = await C.fileBegin(b, buf.byteLength); if (st !== 200) return out(o, st);
      try { await filesOf(env, o.cid).put(o.id, buf); } catch (e) { await C.fileAbort(o.id); return out({ error: "store" }, 500); }
      await C.fileDone(o.id);
      return out({ id: o.id, n: o.name, s: o.size, t: o.type, k: o.kind, url: new URL(req.url).origin + "/sfile/" + o.id });
    }
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
      const [st, o] = await community(env).handle(path.slice(8), Object.assign(b && typeof b === "object" ? b : {}, { __o: origin }));   // the real Origin (checked above), for passkeys
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
    if (path === "/drop") {        // the app's service worker found a task already submitted: its later reminders go too (Michal)
      const pre = clip(b.prefix, 80); if (!/^t:[^:]+:\d+:$/.test(pre)) return out({ error: "bad request" }, 400);
      return out(await dev.drop(pre));
    }
    if (path === "/test") return out({ status: await dev.test({ title: clip(b.title, 120) || "🔔", body: clip(b.body, 240), tag: "test" }, Math.min(Math.max(Number(b.delay) || 0, 0), 120)) });
    return out({ error: "not found" }, 404);
  },
};
