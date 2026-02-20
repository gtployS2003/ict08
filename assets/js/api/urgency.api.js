// assets/js/api/urgency.api.js
// ใช้ร่วมกับ backend/routes/urgency.routes.php และ controller/model ของ urgency

(() => {
  const API_BASE =
    window.API_BASE_URL ||
    window.__API_BASE__ ||
    "/ict8/backend/public";

  function getAuthToken() {
    return String(
      localStorage.getItem("auth_token") ||
        sessionStorage.getItem("auth_token") ||
        ""
    ).trim();
  }

  function getAuthHeaders() {
    const token = getAuthToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async function apiFetch(path, { method = "GET", body, headers = {} } = {}) {
    const url = `${API_BASE}${path}`;
    const opts = {
      method,
      headers: {
        ...getAuthHeaders(),
        ...headers,
      },
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

    const isFail =
      !res.ok ||
      json?.ok === false ||
      json?.error === true ||
      json?.success === false;

    if (isFail) {
      const msg = json?.message || `Request failed (${res.status})`;
      const extra = json?.errors?.detail
        ? `: ${json.errors.detail}`
        : json?.detail
        ? `: ${json.detail}`
        : json?.errors
        ? `: ${JSON.stringify(json.errors)}`
        : json?.data
        ? `: ${JSON.stringify(json.data)}`
        : "";
      throw new Error(msg + extra);
    }

    return json;
  }

  const UrgencyAPI = {
    /**
     * GET /urgency?q=&page=&limit=
     */
    async list({ q = "", page = 1, limit = 50 } = {}) {
      const qs = new URLSearchParams();
      if (q) qs.set("q", String(q));
      qs.set("page", String(page));
      qs.set("limit", String(limit));

      return apiFetch(`/urgency?${qs.toString()}`, { method: "GET" });
    },

    /**
     * GET /urgency/{id}
     */
    async getById(id) {
      if (!id && id !== 0) throw new Error("Missing id");
      return apiFetch(`/urgency/${encodeURIComponent(id)}`, { method: "GET" });
    },

    /**
     * POST /urgency
     * body: { urgency_code, urgency_title, urgency_level }
     */
    async create(payload) {
      return apiFetch(`/urgency`, {
        method: "POST",
        body: payload,
      });
    },

    /**
     * PUT /urgency/{id}
     * body: { urgency_code, urgency_title, urgency_level }
     */
    async update(id, payload) {
      if (!id && id !== 0) throw new Error("Missing id");
      return apiFetch(`/urgency/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: payload,
      });
    },

    /**
     * DELETE /urgency/{id}
     */
    async remove(id) {
      if (!id && id !== 0) throw new Error("Missing id");
      return apiFetch(`/urgency/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
    },
  };

  window.UrgencyAPI = UrgencyAPI;
  window.urgencyApi = {
    list: UrgencyAPI.list,
    get: UrgencyAPI.getById,
    create: UrgencyAPI.create,
    update: UrgencyAPI.update,
    remove: UrgencyAPI.remove,
  };
})();
