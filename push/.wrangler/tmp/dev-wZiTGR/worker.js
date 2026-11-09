var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// worker.js
import { DurableObject } from "cloudflare:workers";
var ORIGINS = ["https://aorizoro.github.io"];
var PUSH_HOSTS = /^(fcm\.googleapis\.com|android\.googleapis\.com|updates\.push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9-]+\.push\.apple\.com|[a-z0-9.-]+\.notify\.windows\.com)$/;
var MAX_ITEMS = 500;
var MAX_BODY = 256 * 1024;
var SUBJECT = "https://aorizoro.github.io/moodle-task/";
var enc = new TextEncoder();
var b64u = /* @__PURE__ */ __name((buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""), "b64u");
var unb64u = /* @__PURE__ */ __name((s) => Uint8Array.from(atob(String(s).replace(/-/g, "+").replace(/_/g, "/") + "===".slice((String(s).length + 3) % 4)), (c) => c.charCodeAt(0)), "unb64u");
var cat = /* @__PURE__ */ __name((...a) => {
  const out = new Uint8Array(a.reduce((n, x) => n + x.length, 0));
  let o = 0;
  for (const x of a) {
    out.set(x, o);
    o += x.length;
  }
  return out;
}, "cat");
var sha256 = /* @__PURE__ */ __name(async (s) => b64u(await crypto.subtle.digest("SHA-256", enc.encode(s))), "sha256");
var hmac = /* @__PURE__ */ __name(async (key, data) => new Uint8Array(await crypto.subtle.sign("HMAC", await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]), data)), "hmac");
var clip = /* @__PURE__ */ __name((s, n) => String(s == null ? "" : s).slice(0, n), "clip");
function okEndpoint(ep, env) {
  let u;
  try {
    u = new URL(ep);
  } catch (e) {
    return false;
  }
  if (env.TEST_PUSH === "1" && u.protocol === "http:" && u.hostname === "127.0.0.1") return true;
  return u.protocol === "https:" && PUSH_HOSTS.test(u.hostname);
}
__name(okEndpoint, "okEndpoint");
function okSub(s, env) {
  if (!s || typeof s.endpoint !== "string" || !s.keys || !okEndpoint(s.endpoint, env)) return false;
  try {
    return unb64u(s.keys.p256dh).length === 65 && unb64u(s.keys.auth).length === 16;
  } catch (e) {
    return false;
  }
}
__name(okSub, "okSub");
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
  return cat(salt, new Uint8Array([0, 0, 16, 0]), new Uint8Array([65]), asPub, ct);
}
__name(encrypt, "encrypt");
async function vapidHeader(endpoint, vk) {
  const aud = new URL(endpoint).origin, now = Math.floor(Date.now() / 1e3);
  const head = b64u(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" }))), claims = b64u(enc.encode(JSON.stringify({ aud, exp: now + 12 * 3600, sub: SUBJECT })));
  const key = await crypto.subtle.importKey("jwk", vk.jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, enc.encode(head + "." + claims));
  return "vapid t=" + head + "." + claims + "." + b64u(sig) + ", k=" + vk.pub;
}
__name(vapidHeader, "vapidHeader");
async function sendPush(sub, msg, vk, ttl) {
  const body = await encrypt(sub, JSON.stringify(msg));
  const r = await fetch(sub.endpoint, { method: "POST", body, headers: {
    "Content-Encoding": "aes128gcm",
    "Content-Type": "application/octet-stream",
    TTL: String(ttl || 6 * 3600),
    Urgency: "high",
    Authorization: await vapidHeader(sub.endpoint, vk)
  } });
  return r.status;
}
__name(sendPush, "sendPush");
var Keys = class extends DurableObject {
  static {
    __name(this, "Keys");
  }
  async get() {
    let k = await this.ctx.storage.get("vapid");
    if (!k) {
      const p = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
      k = { jwk: await crypto.subtle.exportKey("jwk", p.privateKey), pub: b64u(await crypto.subtle.exportKey("raw", p.publicKey)) };
      await this.ctx.storage.put("vapid", k);
    }
    return k;
  }
};
var vapid = /* @__PURE__ */ __name((env) => env.KEYS.get(env.KEYS.idFromName("vapid-v1")).get(), "vapid");
var Device = class extends DurableObject {
  static {
    __name(this, "Device");
  }
  constructor(ctx, env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.sql.exec("CREATE TABLE IF NOT EXISTS items (at INTEGER, title TEXT, body TEXT, tag TEXT)");
  }
  async rearm() {
    const r = this.sql.exec("SELECT MIN(at) AS t FROM items").one();
    if (r.t == null) await this.ctx.storage.deleteAlarm();
    else await this.ctx.storage.setAlarm(Math.max(r.t, Date.now() + 1e3));
    return r.t;
  }
  async sync(sub, items, lang) {
    const now = Date.now();
    await this.ctx.storage.put("sub", sub);
    await this.ctx.storage.put("lang", lang);
    await this.ctx.storage.put("seen", now);
    this.sql.exec("DELETE FROM items");
    const keep = items.filter((x) => x && Number.isFinite(x.at) && x.at > now - 6e4 && x.at < now + 400 * 864e5).sort((a, b) => a.at - b.at).slice(0, MAX_ITEMS);
    for (const x of keep) this.sql.exec("INSERT INTO items VALUES (?, ?, ?, ?)", Math.round(x.at), clip(x.title, 120), clip(x.body, 240), clip(x.tag, 80));
    return { count: keep.length, next: await this.rearm() };
  }
  async forget() {
    this.sql.exec("DELETE FROM items");
    await this.ctx.storage.delete(["sub", "lang", "seen"]);
    await this.ctx.storage.deleteAlarm();
  }
  async test(msg) {
    const sub = await this.ctx.storage.get("sub");
    if (!sub) return 404;
    const st = await sendPush(sub, msg, await vapid(this.env), 600);
    if (st === 404 || st === 410) await this.forget();
    return st;
  }
  async alarm() {
    const sub = await this.ctx.storage.get("sub");
    if (!sub) return this.forget();
    const now = Date.now(), due = this.sql.exec("SELECT rowid AS id, at, title, body, tag FROM items WHERE at <= ? ORDER BY at", now + 1e3).toArray();
    const vk = await vapid(this.env);
    let retry = false;
    for (const x of due) {
      if (x.at < now - 3 * 36e5) {
        this.sql.exec("DELETE FROM items WHERE rowid = ?", x.id);
        continue;
      }
      let st = 0;
      try {
        st = await sendPush(sub, { title: x.title, body: x.body, tag: x.tag, at: x.at }, vk);
      } catch (e) {
        st = 0;
      }
      if (st === 404 || st === 410) return this.forget();
      if (st >= 200 && st < 300 || st === 400 || st === 413) this.sql.exec("DELETE FROM items WHERE rowid = ?", x.id);
      else retry = true;
    }
    if (retry) await this.ctx.storage.setAlarm(Date.now() + 5 * 6e4);
    else await this.rearm();
    if (now - (await this.ctx.storage.get("seen") || now) > 60 * 864e5) await this.forget();
  }
};
var worker_default = {
  async fetch(req, env) {
    const origin = req.headers.get("Origin") || "";
    const allowed = ORIGINS.includes(origin) || env.DEV_ORIGIN && origin === env.DEV_ORIGIN;
    const H = { "Access-Control-Allow-Origin": allowed ? origin : ORIGINS[0], "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Max-Age": "86400", Vary: "Origin" };
    const out = /* @__PURE__ */ __name((o, st) => new Response(JSON.stringify(o), { status: st || 200, headers: { ...H, "Content-Type": "application/json" } }), "out");
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: H });
    const path = new URL(req.url).pathname;
    if (req.method === "GET" && path === "/key") return out({ key: (await vapid(env)).pub });
    if (req.method === "GET" && path === "/") return out({ ok: true });
    if (req.method !== "POST") return out({ error: "not found" }, 404);
    if (!allowed) return out({ error: "origin" }, 403);
    const raw = await req.text();
    if (raw.length > MAX_BODY) return out({ error: "too big" }, 413);
    let b;
    try {
      b = JSON.parse(raw);
    } catch (e) {
      return out({ error: "json" }, 400);
    }
    const ep = b && (b.sub ? b.sub.endpoint : b.endpoint);
    if (typeof ep !== "string" || !okEndpoint(ep, env)) return out({ error: "endpoint" }, 400);
    const dev = env.DEVICES.get(env.DEVICES.idFromName(await sha256(ep)));
    if (path === "/sync") {
      if (!okSub(b.sub, env) || !Array.isArray(b.items)) return out({ error: "bad request" }, 400);
      return out(await dev.sync({ endpoint: b.sub.endpoint, keys: { p256dh: b.sub.keys.p256dh, auth: b.sub.keys.auth } }, b.items, clip(b.lang, 5)));
    }
    if (path === "/unsub") {
      await dev.forget();
      return out({ ok: true });
    }
    if (path === "/test") return out({ status: await dev.test({ title: clip(b.title, 120) || "\u{1F514}", body: clip(b.body, 240), tag: "test" }) });
    return out({ error: "not found" }, 404);
  }
};

// ../../pushdev/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../pushdev/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    const body = JSON.stringify(error);
    const headers = {
      "Content-Type": "application/json",
      "MF-Experimental-Error-Stack": "true"
    };
    const encoded = encodeURIComponent(body);
    if (encoded.length <= 8192) {
      headers["MF-Experimental-Error-Stack-Payload"] = encoded;
    }
    return new Response(body, { status: 500, headers });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-9m61yg/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = worker_default;

// ../../pushdev/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-9m61yg/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  scheduledTime;
  cron;
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  Device,
  Keys,
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=worker.js.map
