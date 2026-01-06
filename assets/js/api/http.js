// assets/js/api/http.js

// อ่านค่าจาก backend/public/config.js.php
const APP_CONFIG = window.__APP_CONFIG__ || {};

const API_BASE = APP_CONFIG.API_BASE || "http://127.0.0.1/ict/backend/public";
const APP_ENV = APP_CONFIG.APP_ENV || "dev";
const DEV_API_KEY = APP_CONFIG.DEV_API_KEY || "";

function getAuthHeaders() {
  const headers = { "Content-Type": "application/json" };

  if (APP_ENV === "dev" && DEV_API_KEY) {
    headers["X-Dev-Api-Key"] = DEV_API_KEY;
  }

  // (ถ้าภายหลังจะกลับมาใช้ token แบบเดิม ค่อยเปิดส่วนนี้)
  // const token = localStorage.getItem("token");
  // const userId = localStorage.getItem("user_id");
  // if (token && userId) {
  //   headers["Authorization"] = `Bearer ${token}`;
  //   headers["X-User-Id"] = userId;
  // }

  return headers;
}

async function handleJson(res) {
  // กันเคส response ไม่ใช่ json
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { ok: false, message: "Non-JSON response", raw: text, status: res.status };
  }
}

async function httpGet(path) {
  const res = await fetch(`${API_BASE}/${path}`, { headers: getAuthHeaders() });
  return handleJson(res);
}

async function httpPost(path, body) {
  const res = await fetch(`${API_BASE}/${path}`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(body ?? {}),
  });
  return handleJson(res);
}

async function httpPut(path, body) {
  const res = await fetch(`${API_BASE}/${path}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(body ?? {}),
  });
  return handleJson(res);
}

async function httpDelete(path) {
  const res = await fetch(`${API_BASE}/${path}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  return handleJson(res);
}
