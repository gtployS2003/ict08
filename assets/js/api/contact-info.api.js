// assets/js/api/contact-info.api.js
// ใช้ร่วมกับ backend/routes/contact_info.routes.php
// และ controller/model ของ contact_info

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

  const ContactInfoAPI = {
    /**
     * GET /contact-info?q=&page=&limit=
     */
    async list({ q = "", page = 1, limit = 50 } = {}) {
      const qs = new URLSearchParams();

      if (q) qs.set("q", String(q));
      qs.set("page", String(page));
      qs.set("limit", String(limit));

      return apiFetch(`/contact-info?${qs.toString()}`, {
        method: "GET",
      });
    },

    /**
     * GET /contact-info/{id}
     */
    async getById(id) {
      if (!id && id !== 0) throw new Error("Missing id");

      return apiFetch(`/contact-info/${encodeURIComponent(id)}`, {
        method: "GET",
      });
    },

    /**
     * POST /contact-info
     * body: {
     *   organization_id,
     *   phone_number?, fax?, fax_extension?, email?,
     *   facebook_name?, facebook_url?, line_id?, line_url?,
     *   map_embed_url?, map_lat?, map_lng?
     * }
     */
    async create(payload) {
      return apiFetch(`/contact-info`, {
        method: "POST",
        body: payload,
      });
    },

    /**
     * PUT /contact-info/{id}
     * body: (fields same as create แต่โดยปกติไม่ต้องส่ง organization_id)
     */
    async update(id, payload) {
      if (!id && id !== 0) throw new Error("Missing id");

      return apiFetch(`/contact-info/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: payload,
      });
    },

    /**
     * DELETE /contact-info/{id}
     */
    async remove(id) {
      if (!id && id !== 0) throw new Error("Missing id");

      return apiFetch(`/contact-info/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
    },
  };

  // ✅ export แบบเดียวกับไฟล์อื่น
  window.ContactInfoAPI = ContactInfoAPI;

  // ✅ alias กันโค้ดเก่าพัง / เรียกสั้น
  window.contactInfoApi = {
    list: ContactInfoAPI.list,
    get: ContactInfoAPI.getById,
    create: ContactInfoAPI.create,
    update: ContactInfoAPI.update,
    remove: ContactInfoAPI.remove,
  };
})();
