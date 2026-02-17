// assets/js/api/type-of-device.api.js
(() => {
  // base url: ใช้จาก config.js.php ก่อน ถ้าไม่มีค่อย fallback
  const API_BASE =
    window.API_BASE_URL ||
    window.__API_BASE__ ||
    "/ict/backend/public"; // fallback (ปรับได้)

  /**
   * ใช้ http.js ถ้ามี (แนะนำ) เพราะรวม token/headers แล้ว
   * แต่เผื่อบางหน้าจะยังไม่ได้ include http.js เราเลยทำ fallback ให้
   */
  async function apiFetchCompat(path, { method = "GET", body, headers = {} } = {}) {
    // ถ้ามี apiFetch จาก assets/js/api/http.js ให้ใช้ตัวนั้น
    if (typeof window.apiFetch === "function") {
      return window.apiFetch(path, { method, body, headers });
    }

    // fallback fetch ตรง ๆ
    const url = `${API_BASE}${path}`;
    const opts = { method, headers: { ...headers } };

    // แนบ token (ถ้ามี)
    const token =
      localStorage.getItem("access_token") ||
      sessionStorage.getItem("access_token") ||
      localStorage.getItem("auth_token") ||
      sessionStorage.getItem("auth_token") ||
      localStorage.getItem("token") ||
      sessionStorage.getItem("token");

    if (token) {
      opts.headers["Authorization"] = `Bearer ${token}`;
    }

    if (body !== undefined) {
      opts.headers["Content-Type"] = "application/json; charset=utf-8";
      opts.body = typeof body === "string" ? body : JSON.stringify(body);
    }

    const res = await fetch(url, opts);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const msg = data?.message || data?.error || "Request failed";
      const err = new Error(msg);
      err.status = res.status;
      err.payload = data;
      throw err;
    }
    return data;
  }

  /**
   * GET /type-of-device?q=&page=&limit=
   */
  async function list({ q = "", page = 1, limit = 50 } = {}) {
    const qs = new URLSearchParams();
    if (q) qs.set("q", String(q));
    if (page) qs.set("page", String(page));
    if (limit) qs.set("limit", String(limit));

    const url = `/type-of-device${qs.toString() ? `?${qs.toString()}` : ""}`;
    return apiFetchCompat(url, { method: "GET" });
  }

  /**
   * GET /type-of-device/{id}
   */
  async function getById(id) {
    if (id === undefined || id === null || id === "") throw new Error("id is required");
    return apiFetchCompat(`/type-of-device/${Number(id)}`, { method: "GET" });
  }

  /**
   * POST /type-of-device
   * body: { type_of_device_title, has_network, icon_path_online, icon_path_offline }
   */
  async function create({
    type_of_device_title,
    has_network = 0,
    icon_path_online = "",
    icon_path_offline = "",
  } = {}) {
    if (!type_of_device_title) throw new Error("type_of_device_title is required");

    const body = {
      type_of_device_title: String(type_of_device_title).trim(),
      has_network: normalizeBool01(has_network),
      icon_path_online: icon_path_online ?? "",
      icon_path_offline: icon_path_offline ?? "",
    };

    return apiFetchCompat("/type-of-device", { method: "POST", body });
  }

  /**
   * PUT /type-of-device/{id}
   * body: { type_of_device_title, has_network, icon_path_online, icon_path_offline }
   */
  async function update(
    id,
    {
      type_of_device_title,
      has_network = 0,
      icon_path_online = "",
      icon_path_offline = "",
    } = {}
  ) {
    if (id === undefined || id === null || id === "") throw new Error("id is required");
    if (!type_of_device_title) throw new Error("type_of_device_title is required");

    const body = {
      type_of_device_title: String(type_of_device_title).trim(),
      has_network: normalizeBool01(has_network),
      icon_path_online: icon_path_online ?? "",
      icon_path_offline: icon_path_offline ?? "",
    };

    return apiFetchCompat(`/type-of-device/${Number(id)}`, { method: "PUT", body });
  }

  /**
   * DELETE /type-of-device/{id}
   */
  async function remove(id) {
    if (id === undefined || id === null || id === "") throw new Error("id is required");
    return apiFetchCompat(`/type-of-device/${Number(id)}`, { method: "DELETE" });
  }

  function normalizeBool01(v) {
    // รองรับ 1/"1"/true/"true"/"on"
    if (typeof v === "boolean") return v ? 1 : 0;
    const s = String(v ?? "").trim().toLowerCase();
    if (s === "1" || s === "true" || s === "on" || s === "yes") return 1;
    return 0;
  }

  // expose
  window.TypeOfDeviceAPI = {
    list,
    getById,
    create,
    update,
    remove,
  };
})();
