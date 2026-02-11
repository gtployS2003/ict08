// assets/js/api/request-status.api.js
// ใช้ร่วมกับ backend/routes/request_status.routes.php
// และ controller/model ของ request_status

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

  const RequestStatusAPI = {
    /**
     * GET /request-status?q=&request_type_id=&page=&limit=
     */
    async list({ q = "", request_type_id = 0, page = 1, limit = 50 } = {}) {
      const qs = new URLSearchParams();

      if (q) qs.set("q", String(q));
      if (request_type_id) qs.set("request_type_id", String(request_type_id));

      qs.set("page", String(page));
      qs.set("limit", String(limit));

      return apiFetch(`/request-status?${qs.toString()}`, {
        method: "GET",
      });
    },

    /**
     * GET /request-status/{id}
     */
    async getById(id) {
      if (!id && id !== 0) throw new Error("Missing id");

      return apiFetch(
        `/request-status/${encodeURIComponent(id)}`,
        { method: "GET" }
      );
    },

    /**
     * POST /request-status
     * body: { status_code, status_name, meaning?, request_type_id, sort_order? }
     */
    async create(payload) {
      return apiFetch(`/request-status`, {
        method: "POST",
        body: payload,
      });
    },

    /**
     * PUT /request-status/{id}
     * body: { status_code, status_name, meaning?, request_type_id, sort_order? }
     */
    async update(id, payload) {
      if (!id && id !== 0) throw new Error("Missing id");

      return apiFetch(
        `/request-status/${encodeURIComponent(id)}`,
        {
          method: "PUT",
          body: payload,
        }
      );
    },

    /**
     * DELETE /request-status/{id}
     */
    async remove(id) {
      if (!id && id !== 0) throw new Error("Missing id");

      return apiFetch(
        `/request-status/${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );
    },
  };

  // ✅ export แบบเดียวกับไฟล์อื่น
  window.RequestStatusAPI = RequestStatusAPI;

  // ✅ (แนะนำ) ทำ alias กันโค้ดเก่าพัง ถ้าเคยเรียก requestStatusApi / requestStatusApi.get(...)
  // - list/create/update/remove -> แมพชื่อเดิม
  // - get -> ชื่อเดิมใช้ get() แต่โครงใหม่ใช้ getById()
  window.requestStatusApi = {
    list: RequestStatusAPI.list,
    get: RequestStatusAPI.getById,
    create: RequestStatusAPI.create,
    update: RequestStatusAPI.update,
    remove: RequestStatusAPI.remove,
  };
})();
