// assets/js/api/notification-types.api.js
// ใช้ร่วมกับ backend/routes/notification_types.routes.php
// และ controller/model ของ notification_type

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

  const NotificationTypesAPI = {
    /**
     * GET /notification-types?q=&page=&limit=
     */
    async list({ q = "", page = 1, limit = 50 } = {}) {
      const qs = new URLSearchParams();

      if (q) qs.set("q", String(q));

      qs.set("page", String(page));
      qs.set("limit", String(limit));

      return apiFetch(`/notification-types?${qs.toString()}`, {
        method: "GET",
      });
    },

    /**
     * GET /notification-types/{id}
     */
    async getById(id) {
      if (!id && id !== 0) throw new Error("Missing id");

      return apiFetch(
        `/notification-types/${encodeURIComponent(id)}`,
        { method: "GET" }
      );
    },

    /**
     * POST /notification-types
     * body: { notification_type, meaning? }
     */
    async create(payload) {
      return apiFetch(`/notification-types`, {
        method: "POST",
        body: payload,
      });
    },

    /**
     * PUT /notification-types/{id}
     * body: { notification_type, meaning? }
     */
    async update(id, payload) {
      if (!id && id !== 0) throw new Error("Missing id");

      return apiFetch(
        `/notification-types/${encodeURIComponent(id)}`,
        {
          method: "PUT",
          body: payload,
        }
      );
    },

    /**
     * DELETE /notification-types/{id}
     */
    async remove(id) {
      if (!id && id !== 0) throw new Error("Missing id");

      return apiFetch(
        `/notification-types/${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );
    },
  };

  // ✅ export แบบเดียวกับไฟล์อื่น
  window.NotificationTypesAPI = NotificationTypesAPI;

  // ✅ alias กันโค้ดเก่าพัง / เรียกสั้น
  window.notificationTypesApi = {
    list: NotificationTypesAPI.list,
    get: NotificationTypesAPI.getById,
    create: NotificationTypesAPI.create,
    update: NotificationTypesAPI.update,
    remove: NotificationTypesAPI.remove,
  };
})();
