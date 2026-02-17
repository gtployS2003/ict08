// assets/js/api/organizations.api.js
// ใช้งานผ่าน window.organizationsApi.*

(() => {
  // base url: ใช้จาก config.js.php ก่อน ถ้าไม่มีค่อย fallback
  const API_BASE =
    window.API_BASE_URL ||
    window.__API_BASE__ ||
    "/ict8/backend/public"; // fallback

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

    if (!res.ok || json?.success === false) {
      const msg = json?.message || `Request failed (${res.status})`;
      const extra = json?.data ? `: ${JSON.stringify(json.data)}` : "";
      throw new Error(msg + extra);
    }

    return json;
  }

  const BASE_PATH = "/organizations";

  window.organizationsApi = {
    /**
     * GET /organizations?q=&province_id=&organization_type_id=&page=&limit=
     */
    list({ q = "", province_id = "", organization_type_id = "", page = 1, limit = 50 } = {}) {
      return apiFetch(
        `${BASE_PATH}${toQuery({ q, province_id, organization_type_id, page, limit })}`,
        { method: "GET" }
      );
    },

    /**
     * POST /organizations
     */
    create({ code, name, location, province_id, organization_type_id }) {
      return apiFetch(BASE_PATH, {
        method: "POST",
        body: { code, name, location, province_id, organization_type_id },
      });
    },

    /**
     * PUT /organizations/{id}
     */
    update(id, { code, name, location, province_id, organization_type_id }) {
      return apiFetch(`${BASE_PATH}/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: { code, name, location, province_id, organization_type_id },
      });
    },

    /**
     * DELETE /organizations/{id}
     */
    delete(id) {
      return apiFetch(`${BASE_PATH}/${encodeURIComponent(id)}`, { method: "DELETE" });
    },
  };
})();
