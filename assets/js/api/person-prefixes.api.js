// assets/js/api/person-prefixes.api.js
// ใช้งานผ่าน window.personPrefixesApi.*

(() => {
  // base url: ใช้จาก config.js.php ก่อน ถ้าไม่มีค่อย fallback
  const API_BASE =
    window.API_BASE_URL ||
    window.__API_BASE__ ||
    "/ict8/backend/public";

  function toQuery(params = {}) {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v === undefined || v === null || v === "") return;
      qs.set(k, String(v));
    });
    const s = qs.toString();
    return s ? `?${s}` : "";
  }

  async function apiFetch(path, { method = "GET", body, headers = {} } = {}) {
    const url = `${API_BASE}${path}`;
    const opts = { method, headers: { ...headers } };

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

    // backend ใช้ ok / fail
    if (!res.ok || json?.ok === false) {
      const msg = json?.message || `Request failed (${res.status})`;
      const extra = json?.errors ? `: ${JSON.stringify(json.errors)}` : "";
      throw new Error(msg + extra);
    }

    return json;
  }

  const BASE_PATH = "/person-prefixes";

  window.personPrefixesApi = {
    /**
     * GET /person-prefixes?q=&page=&limit=
     */
    list({ q = "", page = 1, limit = 50 } = {}) {
      return apiFetch(
        `${BASE_PATH}${toQuery({ q, page, limit })}`,
        { method: "GET" }
      );
    },

    /**
     * POST /person-prefixes
     * body: { prefix_en, prefix_th }
     */
    create({ prefix_en, prefix_th }) {
      return apiFetch(BASE_PATH, {
        method: "POST",
        body: { prefix_en, prefix_th },
      });
    },

    /**
     * PUT /person-prefixes/{id}
     */
    update(id, { prefix_en, prefix_th }) {
      return apiFetch(`${BASE_PATH}/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: { prefix_en, prefix_th },
      });
    },

    /**
     * DELETE /person-prefixes/{id}
     */
    delete(id) {
      return apiFetch(`${BASE_PATH}/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
    },
  };
})();
