// assets/js/api/http.js

// NOTE:
// - This file is sometimes included more than once (via different templates).
// - Top-level `const` declarations would crash on the second load:
//   "Identifier 'API_BASE' has already been declared".
// Wrap everything in an IIFE and expose only the intended globals.
(function initIct8HttpJs() {
  if (window.__ICT8_HTTP_JS_LOADED__) return;
  window.__ICT8_HTTP_JS_LOADED__ = true;

  // อ่านค่าจาก backend/public/config.js.php
  const APP_CONFIG = window.__APP_CONFIG__ || {};

  function normalizeApiBase(raw) {
    const fallback = "/ict8/backend/public";
    let base = (raw == null ? "" : String(raw)).trim();
    if (!base) base = fallback;

    // Remove trailing slashes for consistent joins
    base = base.replace(/\/+$/, "");

    // If the page is https but API_BASE is http, upgrade to https to avoid mixed-content blocking
    try {
      if (typeof location !== "undefined" && location.protocol === "https:" && base.startsWith("http://")) {
        base = "https://" + base.slice("http://".length);
      }
    } catch {}

    return base;
  }

  function joinUrl(base, path) {
    const b = (base == null ? "" : String(base)).replace(/\/+$/, "");
    const p = (path == null ? "" : String(path));
    if (!p) return b;
    if (p.startsWith("/")) return b + p;
    return b + "/" + p;
  }

  const API_BASE = normalizeApiBase(
    APP_CONFIG.API_BASE || window.API_BASE_URL || window.__API_BASE__ || ""
  );
  const APP_ENV = APP_CONFIG.APP_ENV || "dev";
  const DEV_API_KEY = APP_CONFIG.DEV_API_KEY || "";

  // Expose normalized base for legacy scripts (prevents mixed-content on HTTPS pages)
  window.__API_BASE__ = API_BASE;
  window.API_BASE = API_BASE;
  window.API_BASE_URL = API_BASE;
  try {
    if (window.__APP_CONFIG__) window.__APP_CONFIG__.API_BASE = API_BASE;
  } catch {}

// ✅ Global safeguard: tunnel PUT/PATCH/DELETE as POST + X-HTTP-Method-Override
// Some servers/proxies block non-GET/POST methods and return 405 before PHP routing.
// This keeps existing code (even legacy fetch calls) working.
  (function patchFetchMethodOverrideOnce() {
    if (window.__ICT8_FETCH_METHOD_OVERRIDE_PATCHED__) return;
    window.__ICT8_FETCH_METHOD_OVERRIDE_PATCHED__ = true;

  const origFetch = window.fetch;
  if (typeof origFetch !== "function") return;

  window.fetch = function patchedFetch(input, init) {
    try {
      // Mixed-content guard: if we're on HTTPS and someone tries to fetch http://, upgrade to https://
      // (especially common with tunnels like ngrok).
      try {
        if (typeof location !== "undefined" && location.protocol === "https:") {
          if (typeof input === "string" && input.startsWith("http://")) {
            input = "https://" + input.slice("http://".length);
          } else if (typeof URL !== "undefined" && input instanceof URL && String(input.href).startsWith("http://")) {
            input = new URL("https://" + String(input.href).slice("http://".length));
          } else if (typeof Request !== "undefined" && input instanceof Request && String(input.url || "").startsWith("http://")) {
            const nextUrl = "https://" + String(input.url).slice("http://".length);
            input = new Request(nextUrl, input);
          }
        }
      } catch {}

      const methodFromInit = init && init.method ? String(init.method) : "";
      const methodFromReq = (typeof Request !== "undefined" && input instanceof Request)
        ? String(input.method || "")
        : "";

      const method = (methodFromInit || methodFromReq || "GET").toUpperCase();
      if (!["PUT", "PATCH", "DELETE"].includes(method)) {
        return origFetch.call(this, input, init);
      }

      // Build headers (support object, array, or Headers)
      const baseHeaders = init && init.headers !== undefined
        ? init.headers
        : (typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined);
      const headers = new Headers(baseHeaders || undefined);

      // If someone already set override, do not modify again.
      if (headers.has("X-HTTP-Method-Override")) {
        return origFetch.call(this, input, init);
      }

      headers.set("X-HTTP-Method-Override", method);

      /** @type {RequestInit} */
      const nextInit = {
        ...(init || {}),
        method: "POST",
        headers,
      };

      // If input is a Request, create a new Request to ensure method/headers apply.
      if (typeof Request !== "undefined" && input instanceof Request) {
        const nextReq = new Request(input, nextInit);
        return origFetch.call(this, nextReq);
      }

      return origFetch.call(this, input, nextInit);
    } catch {
      return origFetch.call(this, input, init);
    }
  };
  })();

  function getAuthHeaders({ skipAuth = false } = {}) {
    const headers = { "Content-Type": "application/json" };

  if (APP_ENV === "dev" && DEV_API_KEY) {
    headers["X-Dev-Api-Key"] = DEV_API_KEY;
  }

  // ✅ ถ้าบอกว่าไม่ต้อง auth ก็ไม่ต้องหา token และไม่ต้อง warn
  if (skipAuth) {
    return headers;
  }

  const token =
    localStorage.getItem("auth_token") ||
    sessionStorage.getItem("auth_token") ||
    localStorage.getItem("token") ||
    sessionStorage.getItem("token") ||
    localStorage.getItem("access_token") ||
    sessionStorage.getItem("access_token");

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
    console.log("[auth] token found:", token.slice(0, 20) + "...");
  } else {
    console.warn("[auth] No token found in storage");
  }

    return headers;
  }



  async function handleJson(res) {
    // กันเคส response ไม่ใช่ json
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      return { ok: false, message: "Non-JSON response", raw: text, status: res.status };
    }
  }

  async function httpGet(path) {
    const res = await fetch(joinUrl(API_BASE, path), { headers: getAuthHeaders() });
    return handleJson(res);
  }

  async function httpPost(path, body) {
    const res = await fetch(joinUrl(API_BASE, path), {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(body ?? {}),
    });
    return handleJson(res);
  }

  async function httpPut(path, body) {
    const res = await fetch(joinUrl(API_BASE, path), {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(body ?? {}),
    });
    return handleJson(res);
  }

  async function httpDelete(path) {
    const res = await fetch(joinUrl(API_BASE, path), {
      method: "POST",
      headers: {
        ...getAuthHeaders(),
        "X-HTTP-Method-Override": "DELETE"
      }
    });
    return handleJson(res);
  }
  // ✅ เพิ่ม: apiFetch ให้เข้ากับ auth.api.js และไฟล์ api อื่น ๆ
  window.apiFetch = async function apiFetch(
    path,
    { method = "GET", body, headers = {}, skipAuth = false } = {}
  ) {
    const url = joinUrl(API_BASE, path);

    const baseHeaders = getAuthHeaders({ skipAuth });

    let realMethod = method.toUpperCase();
    let overrideMethod = null;

    // DirectAdmin ไม่ยอม PUT / PATCH / DELETE
    if (["PUT", "PATCH", "DELETE"].includes(realMethod)) {
      overrideMethod = realMethod;
      realMethod = "POST";
    }

    const opts = {
      method: realMethod,
      headers: {
        ...baseHeaders,
        ...headers,
        ...(overrideMethod ? { "X-HTTP-Method-Override": overrideMethod } : {})
      },
    };

    // ✅ ถ้าเป็น FormData
    if (body instanceof FormData) {
      delete opts.headers["Content-Type"]; // browser set boundary เอง
      opts.body = body;
    } else if (body !== undefined) {
      opts.body = JSON.stringify(body);
    }

    const res = await fetch(url, opts);
    const json = await handleJson(res);

    if (!res.ok || json?.success === false || json?.ok === false || json?.error === true) {
      const msg = json?.message || json?.error || `Request failed (${res.status})`;
      const err = new Error(msg);
      err.status = res.status;
      err.payload = json;
      throw err;
    }

    return json;
  };




// (optional) export helper เดิม เผื่อใช้ที่อื่น
  window.httpGet = httpGet;
  window.httpPost = httpPost;
  window.httpPut = httpPut;
  window.httpDelete = httpDelete;
})();

