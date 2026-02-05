// assets/js/api/request-sub-types.api.js
// ใช้ร่วมกับ backend/routes/request_sub_types.routes.php
// และ controller/model ของ request_sub_type

(() => {
  const API_BASE =
    window.API_BASE_URL ||
    window.__API_BASE__ ||
    "/ict/backend/public";

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

  const RequestSubTypesAPI = {
    /**
     * GET /request-sub-types?q=&subtype_of=&page=&limit=
     */
    async list({ q = "", subtype_of = 0, page = 1, limit = 50 } = {}) {
      const qs = new URLSearchParams();

      if (q) qs.set("q", String(q));
      if (subtype_of) qs.set("subtype_of", String(subtype_of));

      qs.set("page", String(page));
      qs.set("limit", String(limit));

      return apiFetch(`/request-sub-types?${qs.toString()}`, {
        method: "GET",
      });
    },

    /**
     * GET /request-sub-types/{id}
     */
    async getById(id) {
      if (!id && id !== 0) throw new Error("Missing id");

      return apiFetch(
        `/request-sub-types/${encodeURIComponent(id)}`,
        { method: "GET" }
      );
    },

    /**
     * POST /request-sub-types
     * body: { name, discription?, subtype_of }
     */
    async create(payload) {
      return apiFetch(`/request-sub-types`, {
        method: "POST",
        body: payload,
      });
    },

    /**
     * PUT /request-sub-types/{id}
     * body: {name, discription?, subtype_of }
     */
    async update(id, payload) {
      if (!id) throw new Error("Missing id");

      return apiFetch(
        `/request-sub-types/${encodeURIComponent(id)}`,
        {
          method: "PUT",
          body: payload,
        }
      );
    },

    /**
     * DELETE /request-sub-types/{id}
     */
    async remove(id) {
      if (!id) throw new Error("Missing id");

      return apiFetch(
        `/request-sub-types/${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );
    },
  };

  window.RequestSubTypesAPI = RequestSubTypesAPI;
})();
