// assets/js/api/user-notification-channels.api.js
// ใช้ร่วมกับ backend/routes/user_notification_channel.routes.php
// และ controller/model ของ user_notification_channel (join กับ channel + person.display_name)

(() => {
  const API_BASE =
    window.API_BASE_URL ||
    window.__API_BASE__ ||
    "/ict8/backend/public";

  function getAuthToken() {
  return String(
    localStorage.getItem("auth_token") ||
    sessionStorage.getItem("auth_token") ||
    ""
  ).trim();
}


  async function apiFetch(path, { method = "GET", body, headers = {} } = {}) {
    const url = `${API_BASE}${path}`;
    const opts = {
      method,
      headers: { ...getAuthHeaders(), ...headers },
    };

    if (body !== undefined) {
      opts.headers["Content-Type"] = "application/json; charset=utf-8";
      opts.body = JSON.stringify(body);
    }

    const res = await fetch(url, {
      ...opts,
      credentials: "include",
    });
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

  const UserNotificationChannelsAPI = {
    /**
     * ✅ GET /user-notification-channels/users?q=&limit=
     * ใช้ทำ dropdown "รายชื่อผู้ใช้" (user_id + display_name)
     */
    async listUsers({ q = "", limit = 200 } = {}) {
      const qs = new URLSearchParams();
      if (q) qs.set("q", String(q));
      qs.set("limit", String(limit));

      return apiFetch(`/user-notification-channels/users?${qs.toString()}`, {
        method: "GET",
      });
    },

    /**
     * GET /user-notification-channels?user_id=&page=&limit=
     * ได้รายการช่องทางของ user (มี channel_name, enable, display_name)
     */
    async list({ user_id, page = 1, limit = 50 } = {}) {
      const uid = Number(user_id || 0);
      if (!Number.isFinite(uid) || uid <= 0) {
        throw new Error("Missing user_id");
      }

      const qs = new URLSearchParams();
      qs.set("user_id", String(uid));
      qs.set("page", String(page));
      qs.set("limit", String(limit));

      return apiFetch(`/user-notification-channels?${qs.toString()}`, {
        method: "GET",
      });
    },

    /**
     * PUT /user-notification-channels/{id}
     * body: { enable }  (backend รองรับ enable หรือ is_enabled)
     */
    async update(id, payload = {}) {
      if (!id && id !== 0) throw new Error("Missing id");

      // normalize: ถ้า caller ส่ง is_enabled มา ให้ map เป็น enable
      const body =
        payload && typeof payload === "object"
          ? {
            ...payload,
            enable:
              payload.enable !== undefined
                ? payload.enable
                : payload.is_enabled,
          }
          : payload;

      return apiFetch(`/user-notification-channels/${encodeURIComponent(id)}`, {
        method: "PUT",
        body,
      });
    },

    /**
     * POST /user-notification-channels/bootstrap
     * body: { user_id, role_id? }
     */
    async bootstrap(payload) {
      return apiFetch(`/user-notification-channels/bootstrap`, {
        method: "POST",
        body: payload,
      });
    },
  };

  window.UserNotificationChannelsAPI = UserNotificationChannelsAPI;
})();
