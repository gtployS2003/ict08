// assets/js/api/history-image-page.api.js
(() => {
  const API_BASE =
    window.API_BASE_URL ||
    window.__API_BASE__ ||
    "/ict8/backend/public"; // fallback

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

  async function list({ q = "", page = 1, limit = 50 } = {}) {
    const qs = new URLSearchParams();
    if (q) qs.set("q", String(q));
    if (page) qs.set("page", String(page));
    if (limit) qs.set("limit", String(limit));
    return apiFetchCompat(`/history-image-page${qs.toString() ? `?${qs.toString()}` : ""}`, { method: "GET" });
  }

  async function getActivePublic() {
    return apiFetchCompat("/history-image-page/active?public=1", { method: "GET", skipAuth: true });
  }

  async function upload(file, { setActive = true } = {}) {
    if (!file) throw new Error("file is required");
    const fd = new FormData();
    fd.append("file", file);
    if (setActive) fd.append("set_active", "1");
    return apiFetchCompat("/history-image-page/upload", { method: "POST", body: fd });
  }

  async function activate(id) {
    if (id === undefined || id === null || id === "") throw new Error("id is required");
    return apiFetchCompat(`/history-image-page/${Number(id)}/activate`, { method: "PUT" });
  }

  async function remove(id) {
    if (id === undefined || id === null || id === "") throw new Error("id is required");
    return apiFetchCompat(`/history-image-page/${Number(id)}`, { method: "DELETE" });
  }

  window.HistoryImagePageAPI = {
    list,
    getActivePublic,
    upload,
    activate,
    remove,
  };
})();
