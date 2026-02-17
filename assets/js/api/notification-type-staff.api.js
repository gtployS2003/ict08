// assets/js/api/notification-type-staff.api.js
// ใช้ร่วมกับ backend/routes/notification_type_staff.routes.php
// และ controller/model ของ notification_type_staff

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

  const NotificationTypeStaffAPI = {
    /**
     * GET /notification-type-staff?notification_type_id=&q=&page=&limit=
     */
    async list({
      notification_type_id = 0,
      q = "",
      page = 1,
      limit = 50,
    } = {}) {
      const qs = new URLSearchParams();

      if (notification_type_id) qs.set("notification_type_id", String(notification_type_id));

      if (q) qs.set("q", String(q));

      qs.set("page", String(page));
      qs.set("limit", String(limit));

      return apiFetch(
        `/notification-type-staff?${qs.toString()}`,
        { method: "GET" }
      );
    },

    /**
     * POST /notification-type-staff
     * body: { notification_type_id, user_id, is_enabled }
     */
    async upsert(payload) {
      if (!payload?.notification_type_id)
        throw new Error("Missing notification_type_id");
      if (!payload?.user_id)
        throw new Error("Missing user_id");

      return apiFetch(`/notification-type-staff`, {
        method: "POST",
        body: payload,
      });
    },

    /**
     * PATCH /notification-type-staff/{id}
     * body: { is_enabled }
     */
    async setEnabled(id, is_enabled) {
      if (!id && id !== 0) throw new Error("Missing id");

      return apiFetch(
        `/notification-type-staff/${encodeURIComponent(id)}`,
        {
          method: "PATCH",
          body: { is_enabled },
        }
      );
    },

    /**
     * DELETE /notification-type-staff/{id}
     */
    async remove(id) {
      if (!id && id !== 0) throw new Error("Missing id");

      return apiFetch(
        `/notification-type-staff/${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );
    },

    /**
     * GET /notification-type-staff/users?q=&page=&limit=
     * ใช้ค้นหา staff จาก user table
     */
    async searchUsers({ q = "", page = 1, limit = 20 } = {}) {
      const qs = new URLSearchParams();

      if (q) qs.set("q", String(q));

      qs.set("page", String(page));
      qs.set("limit", String(limit));

      return apiFetch(
        `/notification-type-staff/users?${qs.toString()}`,
        { method: "GET" }
      );
    },
  };

  // ✅ export แบบเดียวกับไฟล์อื่น
  window.NotificationTypeStaffAPI = NotificationTypeStaffAPI;

  // ✅ alias กันโค้ดเก่าพัง / เรียกสั้น
  window.notificationTypeStaffApi = {
    list: NotificationTypeStaffAPI.list,
    upsert: NotificationTypeStaffAPI.upsert,
    setEnabled: NotificationTypeStaffAPI.setEnabled,
    remove: NotificationTypeStaffAPI.remove,
    searchUsers: NotificationTypeStaffAPI.searchUsers,
  };
})();
