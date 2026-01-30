// assets/js/api/http.js

// อ่านค่าจาก backend/public/config.js.php
const APP_CONFIG = window.__APP_CONFIG__ || {};

const API_BASE = APP_CONFIG.API_BASE || "http://127.0.0.1/ict/backend/public";
const APP_ENV = APP_CONFIG.APP_ENV || "dev";
const DEV_API_KEY = APP_CONFIG.DEV_API_KEY || "";

function getAuthHeaders({ skipAuth = false } = {}) {
  const headers = { "Content-Type": "application/json" };

  if (APP_ENV === "dev" && DEV_API_KEY) {
    headers["X-Dev-Api-Key"] = DEV_API_KEY;
  }

  // ✅ ถ้าบอกว่าไม่ต้อง auth ก็ไม่ต้องหา token และไม่ต้อง warn
  if (skipAuth) {
    return headers;
  }

  const token =
    localStorage.getItem("auth_token") ||
    sessionStorage.getItem("auth_token") ||
    localStorage.getItem("token") ||
    sessionStorage.getItem("token") ||
    localStorage.getItem("access_token") ||
    sessionStorage.getItem("access_token");

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
    console.log("[auth] token found:", token.slice(0, 20) + "...");
  } else {
    console.warn("[auth] No token found in storage");
  }

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

// ✅ เพิ่ม: apiFetch ให้เข้ากับ auth.api.js และไฟล์ api อื่น ๆ
window.apiFetch = async function apiFetch(
  path,
  { method = "GET", body, headers = {}, skipAuth = false } = {}
) {
  const url = `${API_BASE}${path}`;

  const opts = {
    method,
    headers: {
      ...getAuthHeaders({ skipAuth }), // ✅ ส่ง flag เข้าไป
      ...headers,
    },
  };

  if (body !== undefined) {
    opts.body = JSON.stringify(body);
  }

  const res = await fetch(url, opts);
  const json = await handleJson(res);

  if (!res.ok || json?.success === false || json?.ok === false) {
    const msg = json?.message || json?.error || `Request failed (${res.status})`;
    const err = new Error(msg);
    err.status = res.status;
    err.payload = json;
    throw err;
  }

  return json;
};



// (optional) export helper เดิม เผื่อใช้ที่อื่น
window.httpGet = httpGet;
window.httpPost = httpPost;
window.httpPut = httpPut;
window.httpDelete = httpDelete;

