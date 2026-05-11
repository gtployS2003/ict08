// assets/js/api/popups.api.js
(() => {
  const API_BASE = window.API_BASE_URL || window.__API_BASE__ || "/ict8/backend/public";

  async function apiFetchCompat(path, { method = "GET", body, headers = {}, skipAuth = false } = {}) {
    if (typeof window.apiFetch === "function") {
      return window.apiFetch(path, { method, body, headers, skipAuth });
    }

    let realMethod = String(method || "GET").toUpperCase();
    const opts = { method: realMethod, headers: { ...headers } };

    if (["PUT", "PATCH", "DELETE"].includes(realMethod)) {
      opts.headers["X-HTTP-Method-Override"] = realMethod;
      realMethod = "POST";
      opts.method = realMethod;
    }

    if (!skipAuth) {
      const token =
        localStorage.getItem("auth_token") ||
        sessionStorage.getItem("auth_token") ||
        localStorage.getItem("token") ||
        sessionStorage.getItem("token") ||
        localStorage.getItem("access_token") ||
        sessionStorage.getItem("access_token");
      if (token) opts.headers["Authorization"] = `Bearer ${token}`;
    }

    if (body instanceof FormData) {
      opts.body = body;
    } else if (body !== undefined) {
      opts.headers["Content-Type"] = "application/json; charset=utf-8";
      opts.body = typeof body === "string" ? body : JSON.stringify(body);
    }

    const res = await fetch(`${API_BASE}${path}`, opts);
    const data = await res.json().catch(() => ({}));

    if (!res.ok || data?.ok === false || data?.error === true || data?.success === false) {
      const msg = data?.message || data?.error || `Request failed (${res.status})`;
      const err = new Error(msg);
      err.status = res.status;
      err.payload = data;
      throw err;
    }

    return data;
  }

  async function list({ q = "", page = 1, limit = 50 } = {}) {
    const qs = new URLSearchParams();
    if (q) qs.set("q", String(q));
    qs.set("page", String(page));
    qs.set("limit", String(limit));
    return apiFetchCompat(`/popups?${qs.toString()}`, { method: "GET" });
  }

  async function listPublic({ limit = 20 } = {}) {
    const qs = new URLSearchParams();
    qs.set("public", "1");
    if (limit) qs.set("limit", String(limit));
    return apiFetchCompat(`/popups?${qs.toString()}`, { method: "GET", skipAuth: true });
  }

  async function latestPublic() {
    return listPublic({ limit: 20 });
  }

  async function get(id) {
    if (id === undefined || id === null || id === "") throw new Error("id is required");
    return apiFetchCompat(`/popups/${Number(id)}`, { method: "GET" });
  }

  async function create(payload) {
    if (!(payload instanceof FormData)) throw new Error("payload must be FormData");
    return apiFetchCompat(`/popups`, { method: "POST", body: payload });
  }

  async function update(id, payload) {
    if (id === undefined || id === null || id === "") throw new Error("id is required");
    if (!(payload instanceof FormData)) throw new Error("payload must be FormData");
    return apiFetchCompat(`/popups/${Number(id)}`, { method: "PUT", body: payload });
  }

  async function remove(id) {
    if (id === undefined || id === null || id === "") throw new Error("id is required");
    return apiFetchCompat(`/popups/${Number(id)}`, { method: "DELETE" });
  }

  function toPublicUrl(path) {
    const p = String(path || "").trim();
    if (!p) return "";
    if (/^https?:\/\//i.test(p)) return p;
    if (p.startsWith("/uploads/")) return `${API_BASE}${p}`;
    if (p.startsWith("uploads/")) return `${API_BASE}/${p}`;
    if (p.startsWith("./uploads/")) return `${API_BASE}/${p.replace(/^\.\//, "")}`;
    if (p.startsWith("/")) return p;
    return `/${p}`;
  }

  window.PopupAPI = {
    list,
    listPublic,
    latestPublic,
    get,
    create,
    update,
    remove,
    toPublicUrl,
  };
})();
