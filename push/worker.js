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

/* ---------- one device: its reminders, and an alarm set to the next one ---------- */
export class Device extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.sql.exec("CREATE TABLE IF NOT EXISTS items (at INTEGER, title TEXT, body TEXT, tag TEXT)");
  }
  async rearm() {
    const r = this.sql.exec("SELECT MIN(at) AS t FROM items").one();
    if (r.t == null) await this.ctx.storage.deleteAlarm(); else await this.ctx.storage.setAlarm(Math.max(r.t, Date.now() + 1000));
    return r.t;
  }
  async sync(sub, items, lang) {
    const now = Date.now();
    await this.ctx.storage.put("sub", sub); await this.ctx.storage.put("lang", lang); await this.ctx.storage.put("seen", now);
    this.sql.exec("DELETE FROM items WHERE tag != 'test'");          // a test notification on its way survives a new upload
    const keep = items.filter(x => x && Number.isFinite(x.at) && x.at > now - 60000 && x.at < now + 400 * 86400000).sort((a, b) => a.at - b.at).slice(0, MAX_ITEMS);
    for (const x of keep) this.sql.exec("INSERT INTO items VALUES (?, ?, ?, ?)", Math.round(x.at), clip(x.title, 120), clip(x.body, 240), clip(x.tag, 80));
    return { count: keep.length, next: await this.rearm() };
  }
  async forget() { this.sql.exec("DELETE FROM items"); await this.ctx.storage.delete(["sub", "lang", "seen"]); await this.ctx.storage.deleteAlarm(); }
  async test(msg, delay) {
    const sub = await this.ctx.storage.get("sub"); if (!sub) return 404;
    if (delay > 0) {                                                       // later, so the app can be closed meanwhile
      this.sql.exec("DELETE FROM items WHERE tag = 'test'");
      this.sql.exec("INSERT INTO items VALUES (?, ?, ?, 'test')", Date.now() + delay * 1000, msg.title, msg.body);
      await this.rearm(); return 202;
    }
    const st = await sendPush(sub, msg, await vapid(this.env), 600);
    if (st === 404 || st === 410) await this.forget();
    return st;
  }
  async alarm() {
    const sub = await this.ctx.storage.get("sub"); if (!sub) return this.forget();
    const now = Date.now(), due = this.sql.exec("SELECT rowid AS id, at, title, body, tag FROM items WHERE at <= ? ORDER BY at", now + 1000).toArray();
    const vk = await vapid(this.env);
    let retry = false;
    for (const x of due) {
      if (x.at < now - 3 * 3600000) { this.sql.exec("DELETE FROM items WHERE rowid = ?", x.id); continue; }      // far too late to be useful
      let st = 0; try { st = await sendPush(sub, { title: x.title, body: x.body, tag: x.tag, at: x.at }, vk); } catch (e) { st = 0; }
      if (st === 404 || st === 410) return this.forget();                    // the browser dropped this subscription
      if (st >= 200 && st < 300 || st === 400 || st === 413) this.sql.exec("DELETE FROM items WHERE rowid = ?", x.id);
      else retry = true;
    }
    if (retry) await this.ctx.storage.setAlarm(Date.now() + 5 * 60000); else await this.rearm();
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
    if (req.method !== "POST") return out({ error: "not found" }, 404);
    if (!allowed) return out({ error: "origin" }, 403);
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
