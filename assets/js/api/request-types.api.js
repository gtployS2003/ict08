// assets/js/api/request-types.api.js
// ใช้ร่วมกับ backend/routes/request_types.routes.php
// และ controller/model ของ request_type

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

  const RequestTypesAPI = {
    /**
     * GET /request-types?q=&page=&limit=
     */
    async list({ q = "", page = 1, limit = 50 } = {}) {
      const qs = new URLSearchParams();
      if (q) qs.set("q", String(q));
      qs.set("page", String(page));
      qs.set("limit", String(limit));

      return apiFetch(`/request-types?${qs.toString()}`, {
        method: "GET",
      });
    },

    /**
     * GET /request-types/{id}
     */
    async getById(id) {
      if (!id && id !== 0) throw new Error("Missing id");
      return apiFetch(`/request-types/${encodeURIComponent(id)}`, {
        method: "GET",
      });
    },

    /**
     * POST /request-types
     * body: { type_name, discription?, url_link? }
     */
    async create(payload) {
      return apiFetch(`/request-types`, {
        method: "POST",
        body: payload,
      });
    },

    /**
     * PUT /request-types/{id}
     * body: { type_name, discription?, url_link? }
     */
    async update(id, payload) {
      if (!id) throw new Error("Missing id");
      return apiFetch(`/request-types/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: payload,
      });
    },

    /**
     * DELETE /request-types/{id}
     */
    async remove(id) {
      if (!id) throw new Error("Missing id");
      return apiFetch(`/request-types/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
    },
  };

  window.RequestTypesAPI = RequestTypesAPI;
})();
