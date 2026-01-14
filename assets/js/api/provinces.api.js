// assets/js/api/provinces.api.js

import * as http from "./http.js";

/**
 * พยายามเลือก method จาก http.js ให้เข้ากับของโปรเจกต์
 * รองรับชื่อฟังก์ชันหลายแบบเพื่อไม่ให้พัง
 */
function pick(methodNames) {
  for (const name of methodNames) {
    if (typeof http[name] === "function") return http[name];
  }
  return null;
}

const GET = pick(["get", "apiGet", "requestGet", "httpGet"]);
const POST = pick(["post", "apiPost", "requestPost", "httpPost"]);
const PUT = pick(["put", "apiPut", "requestPut", "httpPut"]);
const DEL = pick(["del", "delete", "apiDelete", "requestDelete", "httpDelete"]);
const REQUEST = pick(["request", "fetchJSON", "send"]); // fallback แบบ generic

const BASE_PATH = "/provinces";

/**
 * helper สร้าง query string
 */
function toQuery(params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    qs.set(k, String(v));
  });
  const s = qs.toString();
  return s ? `?${s}` : "";
}

/**
 * helper call แบบ fallback (กรณี http.js ไม่มี get/post/put/delete แยก)
 */
async function request(method, path, body) {
  if (REQUEST) {
    // พยายามเดาว่า REQUEST รับรูปแบบไหน:
    // - request(method, url, body)
    // - request({ method, url, body })
    try {
      return await REQUEST(method, path, body);
    } catch (_) {
      return await REQUEST({ method, url: path, body });
    }
  }

  // ถ้าไม่มีอะไรเลย ให้ throw เพื่อให้รู้ว่าต้องปรับ http.js
  throw new Error(
    "http.js does not export get/post/put/delete or request(). Please check assets/js/api/http.js"
  );
}

/**
 * GET /provinces?q=&page=&limit=
 */
export async function listProvinces({ q = "", page = 1, limit = 50 } = {}) {
  const url = `${BASE_PATH}${toQuery({ q, page, limit })}`;

  if (GET) return await GET(url);
  return await request("GET", url);
}

/**
 * POST /provinces
 * body: { nameEN, nameTH }
 */
export async function createProvince({ nameEN, nameTH }) {
  const payload = { nameEN, nameTH };

  if (POST) return await POST(BASE_PATH, payload);
  return await request("POST", BASE_PATH, payload);
}

/**
 * PUT /provinces/{id}
 * body: { nameEN, nameTH }
 */
export async function updateProvince(id, { nameEN, nameTH }) {
  const url = `${BASE_PATH}/${encodeURIComponent(id)}`;
  const payload = { nameEN, nameTH };

  if (PUT) return await PUT(url, payload);
  return await request("PUT", url, payload);
}

/**
 * DELETE /provinces/{id}
 */
export async function deleteProvince(id) {
  const url = `${BASE_PATH}/${encodeURIComponent(id)}`;

  if (DEL) return await DEL(url);
  return await request("DELETE", url);
}
