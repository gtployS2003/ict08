// assets/js/devices-list.js
// ต้องเรียกผ่าน <script type="module" ...>

import { listDevices, getDevice, createDevice, updateDevice, deleteDevice } from "./api/devices.api.js";
import { http } from "./api/http.esm.js";

const $ = (sel) => document.querySelector(sel);

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function toInt(v, fallback = 0) {
  const n = parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) ? n : fallback;
}

function isTruthyOnline(v) {
  return String(v) === "1" || v === 1 || v === true;
}

/** =========================
 *  DOM refs (ตาม monitor/devices.html เวอร์ชันล่าสุด)
 *  ========================= */
const els = {
  // toolbar
  btnAdd: $("#btn-device-add"),
  search: $("#device-search"),
  searchClear: $("#device-search-clear"),
  filterProvince: $("#device-filter-province"),
  filterOrg: $("#device-filter-org"),
  filterMainType: $("#device-filter-main-type"),
  filterType: $("#device-filter-type"),
  limit: $("#device-limit"),
  refresh: $("#device-refresh"),

  // table
  tbody: $("#device-tbody"),
  total: $("#device-total"),
  pagination: $("#device-pagination"),

  // modal
  modal: $("#device-modal"),
  modalTitle: $("#device-modal-title"),
  modalClose: $("#device-modal-close"),
  form: $("#device-form"),
  formError: $("#device-form-error"),
  submitBtn: $("#device-submit"),

  // form inputs
  inputId: $("#device-id"),
  inputName: $("#device-name"),
  selectMainType: $("#device-main-type"),
  selectType: $("#device-type"),
  inputIp: $("#device-ip"),
  selectOrg: $("#device-org"),
  inputDetail: $("#device-detail"),
};

const state = {
  q: "",
  provinceId: "",
  organizationId: "",
  mainTypeId: "",
  typeId: "",
  page: 1,
  limit: 50,
  total: 0,
  loading: false,

  // lookup maps
  provincesById: new Map(), // province_id -> {nameEN, nameTH}
  // org dropdown items: {contact_info_id, organization_name, province_id, province_name}
  orgItems: [],
};

function setLoading(v) {
  state.loading = !!v;
  if (els.refresh) els.refresh.disabled = state.loading;
  if (els.btnAdd) els.btnAdd.disabled = state.loading;
  if (els.submitBtn) els.submitBtn.disabled = state.loading;
}

/** =========================
 *  Data loaders for dropdowns
 *  ========================= */

function pickItems(res) {
  // รองรับ response หลายรูปแบบในโปรเจกต์นี้
  // 1) ok(): { ok:true, data:{ items:[...] } }
  // 2) json_response: { error:false, data:[...] }
  // 3) provinces: { success:true, data:{ items:[...] } }
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res.data)) return res.data;
  if (Array.isArray(res?.data?.items)) return res.data.items;
  if (Array.isArray(res?.data?.data)) return res.data.data;
  if (Array.isArray(res?.data?.data?.items)) return res.data.data.items;
  if (Array.isArray(res?.items)) return res.items;
  return [];
}

// โหลดจังหวัดสำหรับ filter และไว้หา nameEN ทำ device_name
async function loadProvincesDropdown() {
  // backend ปัจจุบันมี GET /provinces (ไม่มี /provinces/dropdown)
  const res = await http.get("/provinces?limit=200&page=1");
  const items = pickItems(res);
  // items ที่คาดหวัง (อาจต่างชื่อฟิลด์นิดหน่อย)
  // - province_id
  // - nameTH / nameEN หรือ name_th / name_en
  const normalized = (Array.isArray(items) ? items : []).map((p) => ({
    province_id: toInt(p.province_id ?? p.id),
    nameTH: String(p.nameTH ?? p.name_th ?? p.province_nameTH ?? p.province_name_th ?? ""),
    nameEN: String(p.nameEN ?? p.name_en ?? p.province_nameEN ?? p.province_name_en ?? ""),
  })).filter((p) => p.province_id > 0);

  state.provincesById.clear();
  for (const p of normalized) {
    state.provincesById.set(p.province_id, p);
  }

  // render filter dropdown
  if (els.filterProvince) {
    const cur = String(state.provinceId ?? "");
    els.filterProvince.innerHTML = `<option value="">ทุกจังหวัด</option>` + normalized
      .map((p) => {
        const label = p.nameTH || p.nameEN || `จังหวัด#${p.province_id}`;
        return `<option value="${p.province_id}" ${cur === String(p.province_id) ? "selected" : ""}>${escapeHtml(label)}</option>`;
      })
      .join("");
  }
}

// โหลด dropdown หน่วยงาน: /contact-info/dropdown
async function loadOrgDropdown() {
  const res = await http.get("/contact-info/dropdown");
  const items = res?.data?.data ?? res?.data ?? [];
  state.orgItems = Array.isArray(items) ? items : [];

  if (els.selectOrg) {
    const cur = String(els.selectOrg.value || "");
    els.selectOrg.innerHTML =
      `<option value="">เลือกหน่วยงาน</option>` +
      state.orgItems
        .map((x) => {
          const id = toInt(x.contact_info_id);
          const orgName = String(x.organization_name ?? "");
          const provName = String(x.province_name ?? "");
          const label = provName ? `${orgName} (${provName})` : orgName;
          return `<option value="${id}" ${cur === String(id) ? "selected" : ""} data-province-id="${escapeHtml(x.province_id)}">${escapeHtml(label)}</option>`;
        })
        .join("");
  }

  // render org filter dropdown (unique by organization_id)
  if (els.filterOrg) {
    const cur = String(state.organizationId ?? "");
    const seen = new Set();
    const orgs = [];
    for (const x of state.orgItems) {
      const oid = toInt(x.organization_id ?? x.organizationId ?? 0);
      if (!oid || seen.has(oid)) continue;
      seen.add(oid);
      orgs.push({
        organization_id: oid,
        organization_name: String(x.organization_name ?? x.organizationName ?? ""),
        province_name: String(x.province_name ?? ""),
      });
    }

    els.filterOrg.innerHTML =
      `<option value="">ทุกหน่วยงาน</option>` +
      orgs
        .map((o) => {
          const label = o.province_name ? `${o.organization_name} (${o.province_name})` : o.organization_name;
          return `<option value="${o.organization_id}" ${cur === String(o.organization_id) ? "selected" : ""}>${escapeHtml(label)}</option>`;
        })
        .join("");
  }
}

// โหลด dropdown ประเภทหลัก: /main-type-of-device/dropdown
async function loadMainTypeDropdown() {
  // backend route ปัจจุบัน: GET /api/main-type-of-device
  // (ไม่มี /main-type-of-device/dropdown)
  const res = await http.get("/api/main-type-of-device?limit=200&page=1");
  const arr = pickItems(res);

  if (els.selectMainType) {
    const cur = String(els.selectMainType.value || "");
    els.selectMainType.innerHTML =
      `<option value="">เลือกประเภทหลัก</option>` +
      arr
        .map((x) => {
          const id = toInt(x.main_type_of_device_id ?? x.id);
          const title = String(x.main_type_of_device_title ?? x.title ?? "");
          return `<option value="${id}" ${cur === String(id) ? "selected" : ""}>${escapeHtml(title)}</option>`;
        })
        .join("");
  }

  // render main-type filter dropdown
  if (els.filterMainType) {
    const cur = String(state.mainTypeId ?? "");
    els.filterMainType.innerHTML =
      `<option value="">ทุกประเภทหลัก</option>` +
      arr
        .map((x) => {
          const id = toInt(x.main_type_of_device_id ?? x.id);
          const title = String(x.main_type_of_device_title ?? x.title ?? "");
          return `<option value="${id}" ${cur === String(id) ? "selected" : ""}>${escapeHtml(title)}</option>`;
        })
        .join("");
  }
}

// โหลด dropdown ประเภทอุปกรณ์: /type-of-device/dropdown
async function loadTypeDropdown() {
  // backend route ปัจจุบัน: GET /type-of-device
  // (ไม่มี /type-of-device/dropdown)
  const res = await http.get("/type-of-device?limit=200&page=1");
  const arr = pickItems(res);

  if (els.selectType) {
    const cur = String(els.selectType.value || "");
    els.selectType.innerHTML =
      `<option value="">เลือกประเภทอุปกรณ์</option>` +
      arr
        .map((x) => {
          const id = toInt(x.type_of_device_id ?? x.id);
          const title = String(x.type_of_device_title ?? x.title ?? "");
          return `<option value="${id}" ${cur === String(id) ? "selected" : ""}>${escapeHtml(title)}</option>`;
        })
        .join("");
  }

  // render type filter dropdown
  if (els.filterType) {
    const cur = String(state.typeId ?? "");
    els.filterType.innerHTML =
      `<option value="">ทุกประเภทอุปกรณ์</option>` +
      arr
        .map((x) => {
          const id = toInt(x.type_of_device_id ?? x.id);
          const title = String(x.type_of_device_title ?? x.title ?? "");
          return `<option value="${id}" ${cur === String(id) ? "selected" : ""}>${escapeHtml(title)}</option>`;
        })
        .join("");
  }
}

/** =========================
 *  Device name auto builder
 *  Format: (province.nameEN)_(main_type_title)_(type_title)
 *  ========================= */
function computeDeviceName() {
  // provinceEN from selected org -> province_id -> provincesById map
  const orgId = toInt(els.selectOrg?.value);
  let provinceId = 0;

  if (orgId > 0 && els.selectOrg) {
    const opt = els.selectOrg.querySelector(`option[value="${orgId}"]`);
    provinceId = toInt(opt?.getAttribute("data-province-id") ?? 0);
  }

  const province = provinceId ? state.provincesById.get(provinceId) : null;
  const provinceEN = (province?.nameEN || "").trim();

  const mainTitle = (els.selectMainType?.selectedOptions?.[0]?.textContent || "").trim();
  const typeTitle = (els.selectType?.selectedOptions?.[0]?.textContent || "").trim();

  if (!provinceEN || !mainTitle || !typeTitle) return "";

  // ทำให้ไม่มีช่องว่างยาว ๆ
  const clean = (s) => String(s).trim().replace(/\s+/g, "_");
  return `${clean(provinceEN)}_${clean(mainTitle)}_${clean(typeTitle)}`;
}

function syncDeviceName() {
  if (!els.inputName) return;
  const name = computeDeviceName();
  els.inputName.value = name;
}

/** =========================
 *  List + render
 *  ========================= */
function renderEmpty() {
  if (!els.tbody) return;
  els.tbody.innerHTML = `
    <tr>
      <td colspan="9" style="text-align:center; color:#777; padding:12px 0;">
        ไม่มีข้อมูลอุปกรณ์
      </td>
    </tr>
  `;
}

function renderTable(items) {
  if (!els.tbody) return;

  if (!Array.isArray(items) || items.length === 0) {
    renderEmpty();
    return;
  }

  els.tbody.innerHTML = items
    .map((row) => {
      const id = toInt(row.device_id);
      const statusOnline = isTruthyOnline(row.is_online);
      const statusText = statusOnline ? "ออนไลน์" : "ออฟไลน์";

      const mainTitle = row.main_type_of_device_title ?? "";
      const typeTitle = row.type_of_device_title ?? "";
      const ip = row.ip ?? "-";
      const orgName = row.organization_name ?? "";
      const province = row.province_name_th ?? row.province_nameEN ?? row.province_name_en ?? row.province_nameTH ?? row.province_name ?? "";

      return `
        <tr>
          <td>${id}</td>
          <td>${escapeHtml(row.device_name ?? "")}</td>
          <td>${escapeHtml(mainTitle)}</td>
          <td>${escapeHtml(typeTitle)}</td>
          <td>${escapeHtml(ip || "-")}</td>
          <td>${escapeHtml(orgName)}</td>
          <td>${escapeHtml(province)}</td>
          <td>
            <span class="status-pill ${statusOnline ? "status-online" : "status-offline"}">
              ${statusText}
            </span>
          </td>
          <td>
            <div class="row-actions">
              <button class="btn btn-ghost btn-sm" data-action="edit" data-id="${id}">แก้ไข</button>
              <button class="btn btn-danger btn-sm" data-action="delete" data-id="${id}">ลบ</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

function renderMeta() {
  if (els.total) {
    const start = state.total === 0 ? 0 : (state.page - 1) * state.limit + 1;
    const end = Math.min(state.total, state.page * state.limit);
    els.total.textContent = `แสดง ${start}-${end} จาก ${state.total} รายการ`;
  }
}

function renderPagination() {
  if (!els.pagination) return;

  const totalPages = Math.max(1, Math.ceil(state.total / state.limit));
  const cur = state.page;

  // limit page buttons (simple)
  const pages = [];
  const from = Math.max(1, cur - 2);
  const to = Math.min(totalPages, cur + 2);
  for (let p = from; p <= to; p++) pages.push(p);

  els.pagination.innerHTML = `
    <button class="btn btn-ghost btn-sm" data-page="1" ${cur === 1 ? "disabled" : ""}>⟪</button>
    <button class="btn btn-ghost btn-sm" data-page="${cur - 1}" ${cur === 1 ? "disabled" : ""}>ก่อนหน้า</button>
    ${pages
      .map(
        (p) =>
          `<button class="btn btn-ghost btn-sm ${p === cur ? "is-active" : ""}" data-page="${p}">${p}</button>`
      )
      .join("")}
    <button class="btn btn-ghost btn-sm" data-page="${cur + 1}" ${cur === totalPages ? "disabled" : ""}>ถัดไป</button>
    <button class="btn btn-ghost btn-sm" data-page="${totalPages}" ${cur === totalPages ? "disabled" : ""}>⟫</button>
  `;
}

async function fetchAndRender() {
  setLoading(true);
  try {
    const res = await listDevices({
      q: state.q,
      page: state.page,
      limit: state.limit,
      province_id: state.provinceId,
      organization_id: state.organizationId,
      main_type_of_device_id: state.mainTypeId,
      type_of_device_id: state.typeId,
    });

    // จาก backend DeviceModel: {error:false, data:{items,total,page,limit}}
    const payload = res?.data?.data ?? res?.data ?? {};
    const items = payload.items ?? payload.data ?? [];
    state.total = toInt(payload.total, 0);
    state.page = toInt(payload.page, state.page);
    state.limit = toInt(payload.limit, state.limit);

    renderTable(items);
    renderMeta();
    renderPagination();
  } catch (e) {
    console.error("[devices] fetch error:", e);
    renderEmpty();
    if (els.total) els.total.textContent = "โหลดข้อมูลไม่สำเร็จ";
  } finally {
    setLoading(false);
  }
}

/** =========================
 *  Modal helpers
 *  ========================= */
function openModal(mode = "create") {
  if (!els.modal) return;
  els.formError.hidden = true;
  els.formError.textContent = "";

  if (mode === "create") {
    els.modalTitle.textContent = "เพิ่มอุปกรณ์";
    els.inputId.value = "";
    els.inputIp.value = "";
    els.inputDetail.value = "";
    // reset selects
    els.selectMainType.value = "";
    els.selectType.value = "";
    els.selectOrg.value = "";
    els.inputName.value = "";
    els.submitBtn.textContent = "บันทึก";
  } else {
    els.modalTitle.textContent = "แก้ไขอุปกรณ์";
    els.submitBtn.textContent = "บันทึกการแก้ไข";
  }

  els.modal.hidden = false;
  document.body.classList.add("modal-open");
}

function closeModal() {
  if (!els.modal) return;
  els.modal.hidden = true;
  document.body.classList.remove("modal-open");
}

function showFormError(msg) {
  if (!els.formError) return;
  els.formError.hidden = false;
  els.formError.textContent = msg;
}

/** =========================
 *  CRUD actions
 *  ========================= */
async function handleAdd() {
  setLoading(true);
  try {
    // ensure dropdowns loaded
    await Promise.all([loadMainTypeDropdown(), loadTypeDropdown(), loadOrgDropdown()]);
    syncDeviceName();
    openModal("create");
  } catch (e) {
    console.error(e);
    alert("โหลดข้อมูลสำหรับฟอร์มไม่สำเร็จ");
  } finally {
    setLoading(false);
  }
}

async function handleEdit(id) {
  setLoading(true);
  try {
    await Promise.all([loadMainTypeDropdown(), loadTypeDropdown(), loadOrgDropdown()]);
    const res = await getDevice(id);
    const row = res?.data?.data ?? res?.data ?? null;
    if (!row) {
      alert("ไม่พบข้อมูลอุปกรณ์");
      return;
    }

    openModal("edit");

    els.inputId.value = String(row.device_id ?? id);
    els.selectMainType.value = String(row.main_type_of_device_id ?? "");
    els.selectType.value = String(row.type_of_device_id ?? "");
    els.selectOrg.value = String(row.contact_info_id ?? "");
    els.inputIp.value = String(row.ip ?? "");
    els.inputDetail.value = String(row.detail ?? "");

    syncDeviceName();
  } catch (e) {
    console.error(e);
    alert("โหลดข้อมูลแก้ไขไม่สำเร็จ");
  } finally {
    setLoading(false);
  }
}

async function handleDelete(id) {
  const ok = confirm(`ต้องการลบอุปกรณ์ ID ${id} ใช่หรือไม่?`);
  if (!ok) return;

  setLoading(true);
  try {
    await deleteDevice(id);
    await fetchAndRender();
  } catch (e) {
    console.error(e);
    alert("ลบไม่สำเร็จ");
  } finally {
    setLoading(false);
  }
}

async function handleSubmit(e) {
  e.preventDefault();

  const id = toInt(els.inputId.value, 0);
  const payload = {
    device_name: String(els.inputName.value || "").trim(),
    main_type_of_device_id: toInt(els.selectMainType.value, 0),
    type_of_device_id: toInt(els.selectType.value, 0),
    ip: String(els.inputIp.value || "").trim(),
    contact_info_id: toInt(els.selectOrg.value, 0),
    detail: String(els.inputDetail.value || "").trim(),
  };

  // validate required
  if (!payload.main_type_of_device_id) return showFormError("กรุณาเลือกประเภทหลักของอุปกรณ์");
  if (!payload.type_of_device_id) return showFormError("กรุณาเลือกประเภทอุปกรณ์");
  if (!payload.contact_info_id) return showFormError("กรุณาเลือกหน่วยงาน");

  // auto device_name must be computed
  if (!payload.device_name) {
    syncDeviceName();
    payload.device_name = String(els.inputName.value || "").trim();
  }
  if (!payload.device_name) return showFormError("ชื่ออุปกรณ์ยังสร้างไม่ครบ (ต้องเลือก หน่วยงาน + ประเภทหลัก + ประเภทอุปกรณ์)");

  setLoading(true);
  try {
    if (id > 0) {
      await updateDevice(id, payload);
    } else {
      await createDevice(payload);
    }
    closeModal();
    await fetchAndRender();
  } catch (err) {
    console.error(err);
    const msg =
      err?.response?.data?.message ||
      err?.message ||
      "บันทึกไม่สำเร็จ";
    showFormError(msg);
  } finally {
    setLoading(false);
  }
}

/** =========================
 *  Events wiring
 *  ========================= */
function bindEvents() {
  // search input
  els.search?.addEventListener("input", () => {
    state.q = String(els.search.value || "").trim();
    state.page = 1;
    fetchAndRender();
  });

  els.searchClear?.addEventListener("click", () => {
    els.search.value = "";
    state.q = "";
    state.page = 1;
    fetchAndRender();
    els.search.focus();
  });

  // filter province
  els.filterProvince?.addEventListener("change", () => {
    state.provinceId = String(els.filterProvince.value || "").trim();
    state.page = 1;
    fetchAndRender();
  });

  // filter organization
  els.filterOrg?.addEventListener("change", () => {
    state.organizationId = String(els.filterOrg.value || "").trim();
    state.page = 1;
    fetchAndRender();
  });

  // filter main type
  els.filterMainType?.addEventListener("change", () => {
    state.mainTypeId = String(els.filterMainType.value || "").trim();
    state.page = 1;
    fetchAndRender();
  });

  // filter type
  els.filterType?.addEventListener("change", () => {
    state.typeId = String(els.filterType.value || "").trim();
    state.page = 1;
    fetchAndRender();
  });

  // limit
  els.limit?.addEventListener("change", () => {
    state.limit = toInt(els.limit.value, 50);
    state.page = 1;
    fetchAndRender();
  });

  // refresh
  els.refresh?.addEventListener("click", () => {
    fetchAndRender();
  });

  // pagination clicks (event delegation)
  els.pagination?.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-page]");
    if (!btn) return;
    const p = toInt(btn.getAttribute("data-page"), state.page);
    const totalPages = Math.max(1, Math.ceil(state.total / state.limit));
    if (p < 1 || p > totalPages) return;
    state.page = p;
    fetchAndRender();
  });

  // table actions
  els.tbody?.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const action = btn.getAttribute("data-action");
    const id = toInt(btn.getAttribute("data-id"), 0);
    if (!id) return;

    if (action === "edit") handleEdit(id);
    if (action === "delete") handleDelete(id);
  });

  // modal open
  els.btnAdd?.addEventListener("click", handleAdd);

  // modal close
  els.modal?.addEventListener("click", (e) => {
    const t = e.target;
    if (t?.getAttribute?.("data-close") === "1") closeModal();
  });
  els.modalClose?.addEventListener("click", closeModal);
  $("#device-cancel")?.addEventListener("click", closeModal);

  // form submit
  els.form?.addEventListener("submit", handleSubmit);

  // auto name when selects change
  els.selectOrg?.addEventListener("change", syncDeviceName);
  els.selectMainType?.addEventListener("change", syncDeviceName);
  els.selectType?.addEventListener("change", syncDeviceName);

  // esc close
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && els.modal && !els.modal.hidden) closeModal();
  });
}

/** =========================
 *  Init
 *  ========================= */
document.addEventListener("DOMContentLoaded", async () => {
  // กันกรณีเอาไฟล์นี้ไปใช้กับหน้าอื่น
  if (!els.tbody) return;

  // init state from UI default
  state.limit = toInt(els.limit?.value, 50);

  setLoading(true);

  // bind events ก่อน เพื่อให้ปุ่ม/ค้นหายังใช้ได้ แม้ dropdown บางอันโหลดพลาด
  bindEvents();

  try {
    // dropdowns: ให้พังแยกกัน ไม่ล้มทั้งหน้า
    const tasks = [
      loadProvincesDropdown(),
      loadOrgDropdown(),
      loadMainTypeDropdown(),
      loadTypeDropdown(),
    ];
    await Promise.allSettled(tasks);

    await fetchAndRender();
  } catch (e) {
    console.error(e);
    renderEmpty();
    if (els.total) els.total.textContent = "โหลดหน้าไม่สำเร็จ";
  } finally {
    setLoading(false);
  }
});
