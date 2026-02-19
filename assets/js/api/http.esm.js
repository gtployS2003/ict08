// assets/js/api/http.esm.js
// ES Module wrapper for API requests (works with <script type="module">).
// Keeps the existing classic script `assets/js/api/http.js` untouched.

const APP_CONFIG = globalThis.__APP_CONFIG__ || {};

const API_BASE = String(APP_CONFIG.API_BASE || "http://127.0.0.1/ict8/backend/public").replace(/\/+$/, "");
const APP_ENV = String(APP_CONFIG.APP_ENV || "dev");
const DEV_API_KEY = String(APP_CONFIG.DEV_API_KEY || "");

function pickToken() {
  return (
    localStorage.getItem("auth_token") ||
    sessionStorage.getItem("auth_token") ||
    localStorage.getItem("token") ||
    sessionStorage.getItem("token") ||
    localStorage.getItem("access_token") ||
    sessionStorage.getItem("access_token") ||
    ""
  );
}

function getAuthHeaders({ skipAuth = false } = {}) {
  /** @type {Record<string,string>} */
  const headers = { "Content-Type": "application/json" };

  if (APP_ENV === "dev" && DEV_API_KEY) {
    headers["X-Dev-Api-Key"] = DEV_API_KEY;
  }

  if (skipAuth) return headers;

  const token = pickToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return headers;
}

function joinUrl(base, path) {
  const p = String(path || "");
  if (!p) return base;
  if (/^https?:\/\//i.test(p)) return p;

  // path might be "/devices" or "devices"
  if (p.startsWith("/")) return `${base}${p}`;
  return `${base}/${p}`;
}

async function parseJson(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { error: true, message: "Non-JSON response", raw: text, status: res.status };
  }
}

async function request(method, path, body, { headers = {}, skipAuth = false } = {}) {
  const url = joinUrl(API_BASE, path);

  /** @type {RequestInit} */
  const opts = {
    method,
    headers: {
      ...getAuthHeaders({ skipAuth }),
      ...headers,
    },
  };

  if (body instanceof FormData) {
    // Let the browser set boundary.
    delete opts.headers["Content-Type"];
    opts.body = body;
  } else if (body !== undefined) {
    opts.body = JSON.stringify(body ?? {});
  }

  const res = await fetch(url, opts);
  const json = await parseJson(res);

  if (!res.ok || json?.error === true || json?.success === false || json?.ok === false) {
    const msg = json?.message || json?.error || `Request failed (${res.status})`;
    const err = new Error(msg);
    err.status = res.status;
    err.payload = json;
    throw err;
  }

  return json;
}

export const http = {
  get(path, options) {
    return request("GET", path, undefined, options);
  },
  post(path, body, options) {
    return request("POST", path, body, options);
  },
  put(path, body, options) {
    return request("PUT", path, body, options);
  },
  delete(path, options) {
    return request("DELETE", path, undefined, options);
  },
};
