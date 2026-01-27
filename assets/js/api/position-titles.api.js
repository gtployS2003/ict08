// assets/js/api/position-titles.api.js
// ใช้ร่วมกับ backend/routes/position_titles.routes.php
// และ controller/model ของ position_titles

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

    if (!res.ok || json?.success === false) {
      const msg = json?.message || `Request failed (${res.status})`;
      const extra = json?.data ? `: ${JSON.stringify(json.data)}` : "";
      throw new Error(msg + extra);
    }

    return json;
  }

  const PositionTitlesAPI = {
    /**
     * GET /position-titles?q=&page=&limit=&organization_id=&department_id=
     */
    async list({
      q = "",
      page = 1,
      limit = 50,
      organization_id = "",
      department_id = "",
    } = {}) {
      const qs = new URLSearchParams();
      if (q) qs.set("q", String(q));
      qs.set("page", String(page));
      qs.set("limit", String(limit));
      if (organization_id) qs.set("organization_id", String(organization_id));
      if (department_id) qs.set("department_id", String(department_id));

      return apiFetch(`/position-titles?${qs.toString()}`, { method: "GET" });
    },

    /**
     * ✅ GET /position-titles/dropdown?organization_id=&department_id=
     * return: [ ... ]
     */
    async dropdown({ organization_id, department_id = "" } = {}) {
      if (!organization_id) return [];
      return apiFetch(
        `${BASE_PATH}/dropdown${toQuery({ organization_id, department_id })}`,
        { method: "GET" }
      );
    },

    /**
     * POST /position-titles
     * body: { position_code, position_title, department_id }
     */
    async create(payload) {
      return apiFetch(`/position-titles`, { method: "POST", body: payload });
    },

    /**
     * PUT /position-titles/{id}
     * body: { position_code, position_title, department_id }
     */
    async update(id, payload) {
      if (!id) throw new Error("Missing id");
      return apiFetch(`/position-titles/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: payload,
      });
    },

    /**
     * DELETE /position-titles/{id}
     */
    async remove(id) {
      if (!id) throw new Error("Missing id");
      return apiFetch(`/position-titles/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
    },
  };

  window.PositionTitlesAPI = PositionTitlesAPI;
})();
