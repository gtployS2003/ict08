// assets/js/api/channels.api.js
// ใช้ร่วมกับ backend/routes/channels.routes.php
// และ controller/model ของ channel

(() => {
  const API_BASE =
    window.API_BASE_URL ||
    window.__API_BASE__ ||
    "/ict8/backend/public";

  async function apiFetch(path, { method = "GET", body, headers = {} } = {}) {
    const url = `${API_BASE}${path}`;
    const opts = {
      method,
      headers: { ...headers },
    };

    if (body !== undefined) {
      opts.headers["Content-Type"] = "application/json; charset=utf-8";
      opts.body = JSON.stringify(body);
    }

    const res = await fetch(url, opts);
    const text = await res.text();

    let json;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error(text || `Request failed (${res.status})`);
    }

    if (!res.ok || json?.error === true || json?.success === false) {
      const msg = json?.message || `Request failed (${res.status})`;
      const extra = json?.detail
        ? `: ${json.detail}`
        : json?.data
        ? `: ${JSON.stringify(json.data)}`
        : "";
      throw new Error(msg + extra);
    }

    return json;
  }

  const ChannelsAPI = {
    /**
     * GET /channels?q=&page=&limit=
     */
    async list({ q = "", page = 1, limit = 50 } = {}) {
      const qs = new URLSearchParams();

      if (q) qs.set("q", String(q));
      qs.set("page", String(page));
      qs.set("limit", String(limit));

      return apiFetch(`/channels?${qs.toString()}`, { method: "GET" });
    },

    /**
     * GET /channels/{id}
     */
    async getById(id) {
      if (!id && id !== 0) throw new Error("Missing id");

      return apiFetch(`/channels/${encodeURIComponent(id)}`, {
        method: "GET",
      });
    },

    /**
     * POST /channels
     * body: { channel }
     */
    async create(payload) {
      return apiFetch(`/channels`, {
        method: "POST",
        body: payload,
      });
    },

    /**
     * PUT /channels/{id}
     * body: { channel }
     */
    async update(id, payload) {
      if (!id && id !== 0) throw new Error("Missing id");

      return apiFetch(`/channels/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: payload,
      });
    },

    /**
     * DELETE /channels/{id}
     */
    async remove(id) {
      if (!id && id !== 0) throw new Error("Missing id");

      return apiFetch(`/channels/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
    },
  };

  window.ChannelsAPI = ChannelsAPI;
})();
