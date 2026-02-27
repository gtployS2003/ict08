// assets/js/api/site-mission.api.js
(() => {
  const API_BASE = window.API_BASE_URL || window.__API_BASE__ || "/ict8/backend/public";

  async function apiFetchCompat(path, { method = "GET", body, headers = {}, skipAuth = false } = {}) {
    if (typeof window.apiFetch === "function") {
      return window.apiFetch(path, { method, body, headers, skipAuth });
    }

    const url = `${API_BASE}${path}`;
    const opts = { method, headers: { ...headers } };

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

    const res = await fetch(url, opts);
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

  async function list({ q = "", page = 1, limit = 50, isPublic = false } = {}) {
    const qs = new URLSearchParams();
    if (q) qs.set("q", String(q));
    if (page) qs.set("page", String(page));
    if (limit) qs.set("limit", String(limit));
    if (isPublic) qs.set("public", "1");

    return apiFetchCompat(`/site-missions${qs.toString() ? `?${qs.toString()}` : ""}`, {
      method: "GET",
      skipAuth: !!isPublic,
    });
  }

  async function create(payload) {
    if (!(payload instanceof FormData)) throw new Error("payload must be FormData");
    return apiFetchCompat("/site-missions", { method: "POST", body: payload });
  }

  async function update(id, payload) {
    if (id === undefined || id === null || id === "") throw new Error("id is required");
    if (!(payload instanceof FormData)) throw new Error("payload must be FormData");

    // POST + method override for multipart
    try {
      if (!payload.has("_method")) payload.append("_method", "PUT");
    } catch (_) {
      // ignore
    }

    return apiFetchCompat(`/site-missions/${Number(id)}`, {
      method: "POST",
      headers: { "X-HTTP-Method-Override": "PUT" },
      body: payload,
    });
  }

  async function remove(id) {
    if (id === undefined || id === null || id === "") throw new Error("id is required");
    return apiFetchCompat(`/site-missions/${Number(id)}`, { method: "DELETE" });
  }

  async function reorder(ids = []) {
    if (!Array.isArray(ids) || ids.length === 0) throw new Error("ids is required");
    return apiFetchCompat(`/site-missions/reorder`, {
      method: "PATCH",
      body: { ids },
    });
  }

  window.SiteMissionAPI = {
    list,
    create,
    update,
    remove,
    reorder,
  };
})();
