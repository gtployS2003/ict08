// assets/js/api/auth.api.js

/**
 * Auth API
 * ใช้เรียก backend /auth/*
 *
 * ต้องมี http.js โหลดก่อน (apiFetch)
 * และ API_BASE ถูกตั้งจาก config.js.php
 */
(() => {
  if (!window.apiFetch) {
    console.error("apiFetch not found. Make sure http.js is loaded first.");
    return;
  }

  const AUTH_BASE = "/auth";

  /**
   * POST /auth/login (เดิม)
   * @param {Object} data { username, password }
   */
  async function login(data) {
    return apiFetch(`${AUTH_BASE}/login`, {
      method: "POST",
      body: data,
    });
  }

  /**
   * POST /auth/line-login
   * ใช้หลังจาก liff.getProfile()
   *
   * @param {Object} data
   * {
   *   line_user_id,
   *   line_user_name
   * }
   *
   * Response:
   * - { status: "active", token, user, person }
   * - { status: "pending" }
   * - { status: "register" }
   */
  async function lineLogin(data) {
    return apiFetch(`${AUTH_BASE}/line-login`, {
      method: "POST",
      body: data,
    });
  }

  /**
   * POST /auth/register
   * ใช้ตอนสมัครสมาชิกใหม่
   *
   * @param {Object} data
   * {
   *   line_user_id,
   *   line_user_name,
   *   first_name_th,
   *   last_name_th,
   *   position_title_id,
   *   department_id,
   *   organization_id (optional)
   * }
   */
  async function register(data) {
    return apiFetch(`${AUTH_BASE}/register`, {
      method: "POST",
      body: data,
    });
  }

  /**
   * เก็บ token หลัง login สำเร็จ
   */
  function saveToken(token) {
    if (!token) return;
    localStorage.setItem("auth_token", token);
  }

  /**
   * ดึง token
   */
  function getToken() {
    return localStorage.getItem("auth_token");
  }

  /**
   * ลบ token (logout)
   */
  function clearToken() {
    localStorage.removeItem("auth_token");
  }

  // export ไปใช้ทั่วระบบ
  window.AuthAPI = {
    login,
    lineLogin,
    register,
    saveToken,
    getToken,
    clearToken,
  };
})();
