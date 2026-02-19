// assets/js/devices-map.js

const $ = (sel) => document.querySelector(sel);

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function isTruthyOnline(v) {
  return String(v) === "1" || v === 1 || v === true;
}

function toInt(v, fallback = 0) {
  const n = parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) ? n : fallback;
}

function toFloatOrNull(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function joinUrl(base, path) {
  const b = String(base ?? "").replace(/\/+$/, "");
  const p = String(path ?? "").replace(/^\/+/, "");
  return b ? `${b}/${p}` : `/${p}`;
}

function getApiBase() {
  return window.API_BASE_URL || (window.__APP_CONFIG__ && window.__APP_CONFIG__.API_BASE) || "/ict8/backend/public";
}

function pickToken() {
  return (
    localStorage.getItem("auth_token") ||
    sessionStorage.getItem("auth_token") ||
    localStorage.getItem("token") ||
    sessionStorage.getItem("token") ||
    localStorage.getItem("access_token") ||
    sessionStorage.getItem("access_token") ||
    ""
  );
}

function getAuthHeaders() {
  const cfg = window.__APP_CONFIG__ || {};
  const headers = {};

  if (String(cfg.APP_ENV || "").toLowerCase() === "dev" && cfg.DEV_API_KEY) {
    headers["X-Dev-Api-Key"] = String(cfg.DEV_API_KEY);
  }

  const token = pickToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  return headers;
}

function getBasePath() {
  return (window.__APP_CONFIG__ && window.__APP_CONFIG__.BASE_PATH) || "/ict8";
}

function normalizeIconPath(p) {
  const s = String(p ?? "").trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s;
  // ไฟล์ upload ในโปรเจกต์นี้ถูกเสิร์ฟจาก backend/public/uploads
  // แต่ใน DB มักเก็บเป็น "/uploads/..." (absolute จาก root) ซึ่งจะพาไปผิด path
  if (s.startsWith("/uploads/") || s.startsWith("uploads/")) {
    return joinUrl(getApiBase(), s.replace(/^\/+/, ""));
  }
  if (s.startsWith("/")) return s;
  const basePath = String(getBasePath()).replace(/\/+$/, "");
  return `${basePath}/${s.replace(/^\/+/, "")}`;
}

function pickItems(res) {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res.data)) return res.data;
  if (Array.isArray(res?.data?.items)) return res.data.items;
  if (Array.isArray(res?.data?.data)) return res.data.data;
  if (Array.isArray(res?.data?.data?.items)) return res.data.data.items;
  if (Array.isArray(res?.items)) return res.items;
  return [];
}

function buildQuery(params) {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params || {})) {
    if (v === undefined || v === null) continue;
    const s = String(v);
    if (s === "" || s === "all") continue;
    usp.set(k, s);
  }
  const qs = usp.toString();
  return qs ? `?${qs}` : "";
}

async function apiGet(path) {
  const url = joinUrl(getApiBase(), path);
  const res = await fetch(url, {
    method: "GET",
    credentials: "include",
    headers: {
      ...getAuthHeaders(),
    },
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  if (!res.ok) {
    const detail = json?.detail || json?.message || text || `HTTP ${res.status}`;
    throw new Error(detail);
  }
  return json;
}

function debounce(fn, ms = 300) {
  let t = null;
  return (...args) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

document.addEventListener("DOMContentLoaded", () => {
  const mapEl = document.getElementById("device-map");
  if (!mapEl) return;

  const els = {
    search: $("#device-search"),
    searchClear: $("#device-search-clear"),
    refresh: $("#device-map-refresh"),
    filterProvince: $("#device-filter-province"),
    filterOrg: $("#device-filter-org"),
    filterMainType: $("#device-filter-main-type"),
    filterType: $("#device-filter-type"),
    filterStatus: $("#device-status-filter"),
    summaryTotal: $("#summary-total"),
    summaryOnline: $("#summary-online"),
    summaryOffline: $("#summary-offline"),
  };

  // กันเคส script ถูกโหลดซ้ำแล้ว Leaflet บ่นว่า container ถูก init ไปแล้ว
  if (mapEl._leaflet_id) mapEl._leaflet_id = null;

  const map = L.map("device-map").setView([16.8, 100.0], 7);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);

  // marker ศูนย์ ICT (optional)
  L.marker([16.821, 100.265])
    .addTo(map)
    .bindPopup("<b>ศูนย์ ICT เขต 8</b><br>อุปกรณ์เครือข่ายหลัก");

  const markersLayer = L.layerGroup().addTo(map);
  let didFitOnce = false;

  const state = {
    q: "",
    provinceId: "",
    organizationId: "",
    mainTypeId: "",
    typeId: "",
    status: "all",
    loading: false,
  };

  function setLoading(v) {
    state.loading = !!v;
    if (els.refresh) els.refresh.disabled = state.loading;
  }

  function setSummary(items) {
    const arr = Array.isArray(items) ? items : [];
    const total = arr.length;
    const online = arr.filter((x) => isTruthyOnline(x.is_online)).length;
    const offline = total - online;

    if (els.summaryTotal) els.summaryTotal.textContent = String(total);
    if (els.summaryOnline) els.summaryOnline.textContent = String(online);
    if (els.summaryOffline) els.summaryOffline.textContent = String(offline);
  }

  function renderMarkers(items, { fit = false } = {}) {
    markersLayer.clearLayers();

    const bounds = [];

    for (const d of Array.isArray(items) ? items : []) {
      const lat = toFloatOrNull(d.map_lat);
      const lng = toFloatOrNull(d.map_lng);
      if (lat === null || lng === null) continue;

      const online = isTruthyOnline(d.is_online);
      const iconPath = online ? d.icon_path_online : d.icon_path_offline;
      const iconUrl = normalizeIconPath(iconPath) || `${getBasePath()}/assets/image/status-device/Unknown device.png`;

      const icon = L.icon({
        iconUrl,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [1, -28],
      });

      const marker = L.marker([lat, lng], { icon }).addTo(markersLayer);

      const statusLabel = online ? "Online" : "Offline";
      marker.bindPopup(
        `
          <div style="min-width:220px">
            <div style="font-weight:700;margin-bottom:6px">${escapeHtml(d.device_name || "-")}</div>
            <div><b>ประเภทหลัก:</b> ${escapeHtml(d.main_type_of_device_title || "-")}</div>
            <div><b>ประเภทอุปกรณ์:</b> ${escapeHtml(d.type_of_device_title || "-")}</div>
            <div><b>หน่วยงาน:</b> ${escapeHtml(d.organization_name || "-")}</div>
            <div><b>จังหวัด:</b> ${escapeHtml(d.province_name_th || d.province_name_en || "-")}</div>
            <div><b>สถานะ:</b> ${escapeHtml(statusLabel)}</div>
          </div>
        `.trim()
      );

      bounds.push([lat, lng]);
    }

    if (fit && bounds.length > 0) {
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }

  async function loadDropdowns() {
    // Provinces
    try {
      const res = await apiGet("provinces?limit=200&page=1");
      const items = pickItems(res)
        .map((p) => ({
          province_id: toInt(p.province_id ?? p.id),
          nameTH: String(p.nameTH ?? p.name_th ?? p.province_nameTH ?? p.province_name_th ?? ""),
          nameEN: String(p.nameEN ?? p.name_en ?? p.province_nameEN ?? p.province_name_en ?? ""),
        }))
        .filter((p) => p.province_id > 0);

      if (els.filterProvince) {
        els.filterProvince.innerHTML =
          `<option value="">ทุกจังหวัด</option>` +
          items
            .map((p) => {
              const label = p.nameTH || p.nameEN || `จังหวัด#${p.province_id}`;
              return `<option value="${p.province_id}">${escapeHtml(label)}</option>`;
            })
            .join("");
      }
    } catch (e) {
      console.warn("[map] load provinces failed", e);
    }

    // Orgs (unique by organization_id)
    try {
      const res = await apiGet("contact-info/dropdown");
      const arr = res?.data?.data ?? res?.data ?? [];
      const seen = new Set();
      const orgs = [];
      for (const x of Array.isArray(arr) ? arr : []) {
        const oid = toInt(x.organization_id ?? x.organizationId ?? 0);
        if (!oid || seen.has(oid)) continue;
        seen.add(oid);
        orgs.push({
          organization_id: oid,
          organization_name: String(x.organization_name ?? x.organizationName ?? ""),
          province_name: String(x.province_name ?? ""),
        });
      }

      if (els.filterOrg) {
        els.filterOrg.innerHTML =
          `<option value="">ทุกหน่วยงาน</option>` +
          orgs
            .map((o) => {
              const label = o.province_name ? `${o.organization_name} (${o.province_name})` : o.organization_name;
              return `<option value="${o.organization_id}">${escapeHtml(label)}</option>`;
            })
            .join("");
      }
    } catch (e) {
      console.warn("[map] load orgs failed", e);
    }

    // Main types
    try {
      const res = await apiGet("api/main-type-of-device?limit=200&page=1");
      const arr = pickItems(res);
      if (els.filterMainType) {
        els.filterMainType.innerHTML =
          `<option value="">ทุกประเภทหลัก</option>` +
          arr
            .map((x) => {
              const id = toInt(x.main_type_of_device_id ?? x.id);
              const title = String(x.main_type_of_device_title ?? x.title ?? "");
              return `<option value="${id}">${escapeHtml(title)}</option>`;
            })
            .join("");
      }
    } catch (e) {
      console.warn("[map] load main types failed", e);
    }

    // Types
    try {
      const res = await apiGet("type-of-device?limit=200&page=1");
      const arr = pickItems(res);
      if (els.filterType) {
        els.filterType.innerHTML =
          `<option value="">ทุกประเภทอุปกรณ์</option>` +
          arr
            .map((x) => {
              const id = toInt(x.type_of_device_id ?? x.id);
              const title = String(x.type_of_device_title ?? x.title ?? "");
              return `<option value="${id}">${escapeHtml(title)}</option>`;
            })
            .join("");
      }
    } catch (e) {
      console.warn("[map] load types failed", e);
    }
  }

  async function loadDevices({ fit = false } = {}) {
    setLoading(true);
    try {
      const qs = buildQuery({
        q: state.q,
        province_id: state.provinceId,
        organization_id: state.organizationId,
        main_type_of_device_id: state.mainTypeId,
        type_of_device_id: state.typeId,
        status: state.status,
      });
      const res = await apiGet(`devices/map${qs}`);
      const items = res?.data?.items || [];
      setSummary(items);
      renderMarkers(items, { fit });
    } catch (e) {
      console.error("❌ โหลดข้อมูลอุปกรณ์สำหรับแผนที่ไม่สำเร็จ:", e);
      setSummary([]);
      renderMarkers([], { fit: false });
    } finally {
      setLoading(false);
    }
  }

  const loadDevicesDebounced = debounce(() => loadDevices({ fit: false }), 350);

  // Events
  if (els.search) {
    els.search.addEventListener("input", () => {
      state.q = String(els.search.value || "").trim();
      loadDevicesDebounced();
    });
  }

  if (els.searchClear) {
    els.searchClear.addEventListener("click", () => {
      if (els.search) els.search.value = "";
      state.q = "";
      loadDevices({ fit: false });
    });
  }

  if (els.filterProvince) {
    els.filterProvince.addEventListener("change", () => {
      state.provinceId = String(els.filterProvince.value || "");
      loadDevices({ fit: false });
    });
  }

  if (els.filterOrg) {
    els.filterOrg.addEventListener("change", () => {
      state.organizationId = String(els.filterOrg.value || "");
      loadDevices({ fit: false });
    });
  }

  if (els.filterMainType) {
    els.filterMainType.addEventListener("change", () => {
      state.mainTypeId = String(els.filterMainType.value || "");
      loadDevices({ fit: false });
    });
  }

  if (els.filterType) {
    els.filterType.addEventListener("change", () => {
      state.typeId = String(els.filterType.value || "");
      loadDevices({ fit: false });
    });
  }

  if (els.filterStatus) {
    els.filterStatus.addEventListener("change", () => {
      state.status = String(els.filterStatus.value || "all");
      loadDevices({ fit: false });
    });
  }

  if (els.refresh) {
    els.refresh.addEventListener("click", () => {
      // ให้ fitBounds ใหม่เมื่อกดรีเฟรช
      didFitOnce = false;
      loadDevices({ fit: true });
    });
  }

  // Initial load
  (async () => {
    await loadDropdowns();
    await loadDevices({ fit: !didFitOnce });
    didFitOnce = true;
  })();
});
