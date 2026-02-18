// assets/js/api/main-type-of-device.api.js
// ใช้ร่วมกับ backend/routes/main_type_of_device.routes.php
// และ controller/model ของ main_type_of_device

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

    // ✅ รองรับ 3 แบบ: ok/fail (ok:false), error:true, success:false
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

  const MainTypeOfDeviceAPI = {
    /**
     * GET /api/main-type-of-device?q=&page=&limit=
     */
    async list({ q = "", page = 1, limit = 50 } = {}) {
      const qs = new URLSearchParams();

      if (q) qs.set("q", String(q));

      qs.set("page", String(page));
      qs.set("limit", String(limit));

      return apiFetch(`/api/main-type-of-device?${qs.toString()}`, {
        method: "GET",
      });
    },

    /**
     * POST /api/main-type-of-device
     * body: { title }
     */
    async create(payload) {
      return apiFetch(`/api/main-type-of-device`, {
        method: "POST",
        body: payload,
      });
    },

    /**
     * PUT /api/main-type-of-device/{id}
     * body: { title }
     */
    async update(id, payload) {
      if (!id && id !== 0) throw new Error("Missing id");

      return apiFetch(
        `/api/main-type-of-device/${encodeURIComponent(id)}`,
        {
          method: "PUT",
          body: payload,
        }
      );
    },

    /**
     * DELETE /api/main-type-of-device/{id}
     */
    async remove(id) {
      if (!id && id !== 0) throw new Error("Missing id");

      return apiFetch(
        `/api/main-type-of-device/${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );
    },
  };

  // ✅ export แบบเดียวกับไฟล์อื่น
  window.MainTypeOfDeviceAPI = MainTypeOfDeviceAPI;

  // ✅ alias กันโค้ดเก่าพัง / เรียกสั้น
  window.mainTypeOfDeviceApi = {
    list: MainTypeOfDeviceAPI.list,
    create: MainTypeOfDeviceAPI.create,
    update: MainTypeOfDeviceAPI.update,
    remove: MainTypeOfDeviceAPI.remove,
  };
})();
