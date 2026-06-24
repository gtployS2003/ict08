(function () {
  "use strict";

  const ROLE_BY_ID = {
    1: "USER",
    2: "STAFF",
    3: "ADMIN",
  };

  document.addEventListener("DOMContentLoaded", () => {
    setCurrentYear();
    initIndexRoleUi().catch((err) => {
      console.error("[index] failed to apply role UI", err);
      applyRoleUi("USER");
    });
  });

  function getToken() {
    try {
      return (
        localStorage.getItem("auth_token") ||
        sessionStorage.getItem("auth_token") ||
        localStorage.getItem("token") ||
        sessionStorage.getItem("token") ||
        localStorage.getItem("access_token") ||
        sessionStorage.getItem("access_token") ||
        ""
      ).trim();
    } catch {
      return "";
    }
  }

  function setCurrentYear() {
    document.querySelectorAll("[data-current-year]").forEach((el) => {
      el.textContent = String(new Date().getFullYear());
    });
  }

  async function initIndexRoleUi() {
    const token = getToken();
    if (!token) {
      applyRoleUi("USER");
      return;
    }

    const profile = await loadCurrentProfile();
    const user = profile?.user || {};
    const person = profile?.person || profile?.detail || {};
    const role = normalizeRole(user.user_role_id, user.role_code || user.code);

    cacheCurrentProfile(user, person);
    applyRoleUi(role);
    setProfileImage(person.photo_path);
  }

  async function loadCurrentProfile() {
    if (typeof window.apiFetch !== "function") {
      return readCachedProfile();
    }

    try {
      const res = await window.apiFetch("/profile/me", { method: "GET" });
      return res?.data || {};
    } catch (err) {
      if (Number(err?.status || 0) === 401) {
        applyRoleUi("USER");
        return {};
      }
      const cached = readCachedProfile();
      if (cached.user || cached.person) return cached;
      throw err;
    }
  }

  function readCachedProfile() {
    try {
      return {
        user: JSON.parse(localStorage.getItem("ict8_current_user") || "null"),
        person: JSON.parse(localStorage.getItem("ict8_current_person") || "null"),
      };
    } catch {
      return {};
    }
  }

  function cacheCurrentProfile(user, person) {
    try {
      localStorage.setItem("ict8_current_user", JSON.stringify(user || {}));
      localStorage.setItem("ict8_current_person", JSON.stringify(person || {}));
    } catch {}
  }

  function normalizeRole(roleId, roleCode) {
    const code = String(roleCode || "").trim().toUpperCase();
    if (code === "USER" || code === "STAFF" || code === "ADMIN") return code;
    return ROLE_BY_ID[Number(roleId)] || "USER";
  }

  function applyRoleUi(role) {
    const normalizedRole = normalizeRole(null, role);
    document.documentElement.dataset.userRole = normalizedRole;

    document.querySelectorAll(".card[data-roles]").forEach((card) => {
      const roles = String(card.dataset.roles || "")
        .split(/\s+/)
        .filter(Boolean);
      card.hidden = !roles.includes(normalizedRole);
    });

    document.querySelectorAll(".admin-only").forEach((el) => {
      el.hidden = normalizedRole !== "ADMIN";
    });
  }

  function setProfileImage(photoPath) {
    const img = document.querySelector(".profile-image");
    if (!img) return;

    const src = toPublicUrl(photoPath);
    if (src) {
      img.src = src;
      return;
    }

    img.src = "/ict8/assets/image/director-none.png";
  }

  function toPublicUrl(value) {
    const path = String(value || "").trim();
    if (!path) return "";
    if (/^https?:\/\//i.test(path)) return path;
    if (path.startsWith("/ict8/")) return path;

    const apiBase = String(
      window.API_BASE_URL ||
      window.__API_BASE__ ||
      window.__APP_CONFIG__?.API_BASE ||
      "/ict8/backend/public"
    ).replace(/\/+$/, "");

    if (path.startsWith("/uploads/")) return `${apiBase}${path}`;
    if (path.startsWith("uploads/")) return `${apiBase}/${path}`;
    if (path.startsWith("./uploads/")) return `${apiBase}/${path.replace(/^\.\//, "")}`;
    if (path.startsWith("/")) return path;
    return `${apiBase}/${path}`;
  }
})();
