// assets/js/api/departments.api.js
// ใช้งานผ่าน window.departmentsApi.*

(() => {
  const API_BASE = window.API_BASE_URL || window.__API_BASE__ || "/ict/backend/public";
  const BASE_PATH = "/departments";

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
    const opts = {
      method,
      headers: {
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

    // รองรับทั้งแบบ {ok:true,data:...} และ {ok:true, items/pagination:...}
    if (!res.ok || json?.ok === false) {
      const msg = json?.message || `Request failed (${res.status})`;
      throw new Error(msg);
    }

    return json?.data ?? json;
  }

  window.departmentsApi = {
    /**
     * GET /departments?q=&page=&limit=&organization_id=
     * return: { items: [...], pagination: {...} }
     */
    list({ q = "", page = 1, limit = 50, organization_id = null } = {}) {
      return apiFetch(
        `${BASE_PATH}${toQuery({ q, page, limit, organization_id })}`
      );
    },

    /**
     * POST /departments
     * body: { department_code, department_title, organization_id }
     */
    create({ department_code, department_title, organization_id }) {
      return apiFetch(BASE_PATH, {
        method: "POST",
        body: { department_code, department_title, organization_id },
      });
    },

    /**
     * PUT /departments/{id}
     * body: { department_code, department_title, organization_id }
     */
    update(id, { department_code, department_title, organization_id }) {
      return apiFetch(`${BASE_PATH}/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: { department_code, department_title, organization_id },
      });
    },

    /**
     * DELETE /departments/{id}
     */
    remove(id) {
      return apiFetch(`${BASE_PATH}/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
    },
  };
})();
