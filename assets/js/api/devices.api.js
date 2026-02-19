// assets/js/api/devices.api.js
import { http } from "./http.esm.js";

/**
 * Devices API
 * Base: /devices
 */

// GET /devices?q=&page=&limit=&province_id=
export async function listDevices({
  q = "",
  page = 1,
  limit = 50,
  province_id = "",
  organization_id = "",
  main_type_of_device_id = "",
  type_of_device_id = "",
} = {}) {
  const params = new URLSearchParams();
  if (q && String(q).trim() !== "") params.set("q", String(q).trim());
  if (page) params.set("page", String(page));
  if (limit) params.set("limit", String(limit));
  if (province_id !== "" && province_id !== null && province_id !== undefined) {
    const pid = String(province_id).trim();
    if (pid !== "") params.set("province_id", pid);
  }

  if (organization_id !== "" && organization_id !== null && organization_id !== undefined) {
    const oid = String(organization_id).trim();
    if (oid !== "") params.set("organization_id", oid);
  }

  if (main_type_of_device_id !== "" && main_type_of_device_id !== null && main_type_of_device_id !== undefined) {
    const mid = String(main_type_of_device_id).trim();
    if (mid !== "") params.set("main_type_of_device_id", mid);
  }

  if (type_of_device_id !== "" && type_of_device_id !== null && type_of_device_id !== undefined) {
    const tid = String(type_of_device_id).trim();
    if (tid !== "") params.set("type_of_device_id", tid);
  }

  const qs = params.toString();
  const url = "/devices" + (qs ? `?${qs}` : "");
  return http.get(url);
}

// GET /devices/{id}
export async function getDevice(id) {
  if (!id) throw new Error("device id is required");
  return http.get(`/devices/${id}`);
}

// POST /devices
// payload: { device_name, main_type_of_device_id, type_of_device_id, ip?, contact_info_id, detail? }
export async function createDevice(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("payload is required");
  }
  return http.post("/devices", payload);
}

// PUT /devices/{id}
export async function updateDevice(id, payload) {
  if (!id) throw new Error("device id is required");
  if (!payload || typeof payload !== "object") {
    throw new Error("payload is required");
  }
  return http.put(`/devices/${id}`, payload);
}

// DELETE /devices/{id}
export async function deleteDevice(id) {
  if (!id) throw new Error("device id is required");
  return http.delete(`/devices/${id}`);
}
