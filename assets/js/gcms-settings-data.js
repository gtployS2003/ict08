// assets/js/gcms-settings-data.js

(() => {
  /* Helpers */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function escapeHtml(str) {
    return String(str ?? "")
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

  function clampInt(v, min, max) {
    const n = toInt(v, min);
    if (!Number.isFinite(n)) return min;
    if (n < min) return min;
    if (n > max) return max;
    return n;
  }

  function calcTotalPages({ total, limit, totalPages } = {}) {
    const tp = toInt(totalPages, 0);
    if (tp > 0) return tp;
    const t = Number(total ?? 0) || 0;
    const l = Math.max(1, toInt(limit, 50));
    return Math.max(1, Math.ceil(Math.max(0, t) / l));
  }

  function renderPager(container, { page, totalPages } = {}) {
    if (!container) return;

    const tp = Math.max(1, toInt(totalPages, 1));
    const p = clampInt(page, 1, tp);

    if (tp <= 1) {
      container.innerHTML = "";
      return;
    }

    const pages = [];
    const push = (x) => pages.push(x);

    push(1);
    if (p - 2 > 2) push("…");
    for (let i = Math.max(2, p - 2); i <= Math.min(tp - 1, p + 2); i++) {
      push(i);
    }
    if (p + 2 < tp - 1) push("…");
    if (tp > 1) push(tp);

    const pageBtn = ({ label, pageNum, disabled = false, active = false } = {}) => {
      const cls = ["btn", "btn-ghost", "btn-sm", active ? "is-active" : ""].filter(Boolean).join(" ");
      return `<button class="${cls}" data-page="${pageNum}" ${disabled ? "disabled" : ""}>${escapeHtml(label)}</button>`;
    };

    container.innerHTML = [
      pageBtn({ label: "ก่อนหน้า", pageNum: p - 1, disabled: p <= 1 }),
      ...pages.map((x) => {
        if (x === "…") return `<span class="muted" style="padding:0 8px;">…</span>`;
        return pageBtn({ label: String(x), pageNum: x, active: x === p });
      }),
      pageBtn({ label: "ถัดไป", pageNum: p + 1, disabled: p >= tp }),
    ].join("");
  }
 
  // base url: ใช้จาก config.js.php ก่อน ถ้าไม่มีค่อย fallback
  const API_BASE =
    window.API_BASE_URL ||
    window.__API_BASE__ ||
    "/ict8/backend/public"; // fallback (ปรับได้)

  async function apiFetch(path, { method = "GET", body, headers = {} } = {}) {
    const url = `${API_BASE}${path}`;
    const opts = {
      method,
      headers: {
        ...headers,
      },
    };

    // ✅ เพิ่ม Authorization token จาก localStorage
    const token = localStorage.getItem("auth_token");
    if (token) {
      opts.headers["Authorization"] = `Bearer ${token}`;
    }

    if (body instanceof FormData) {
      // browser will set multipart boundary automatically
      opts.body = body;
    } else if (body !== undefined) {
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

    const isFail =
      !res.ok ||
      json?.ok === false ||
      json?.error === true ||
      json?.success === false;

    if (isFail) {
      const msg = json?.message || `Request failed (${res.status})`;
      const extra = json?.errors?.detail
        ? `: ${json.errors.detail}`
        : json?.detail
        ? `: ${json.detail}`
        : json?.errors
        ? `: ${JSON.stringify(json.errors)}`
        : json?.data
        ? `: ${JSON.stringify(json.data)}`
        : "";
      throw new Error(msg + extra);
    }

    return json;
  }

  function show(el) {
    if (!el) return;
    el.hidden = false;
    el.removeAttribute("hidden");
    el.style.display = "";
  }

  function hide(el) {
    if (!el) return;
    el.hidden = true;
    el.setAttribute("hidden", "");
    el.style.display = "none";
  }

  // ===== Generic modal helpers (used by multiple sections) =====
  // NOTE: Some pages use "data-close" attributes. These helpers provide a
  // consistent open/close API and a global click/escape handler.
  function openModal(modalId) {
    const el = document.getElementById(String(modalId || ""));
    if (!el) return;
    show(el);
    document.body.style.overflow = "hidden";
  }

  function closeModal(modalId) {
    const el = document.getElementById(String(modalId || ""));
    if (!el) return;
    hide(el);

    // If there are no other visible modals, restore scroll
    const anyOpen = Array.from(document.querySelectorAll(".modal")).some((m) => !m.hidden);
    if (!anyOpen) document.body.style.overflow = "";
  }

  (function bindGlobalModalCloseOnce() {
    if (window.__GCMS_MODAL_CLOSE_BOUND__) return;
    window.__GCMS_MODAL_CLOSE_BOUND__ = true;

    document.addEventListener("click", (e) => {
      const closeId = e.target?.getAttribute?.("data-close");
      if (!closeId) return;
      closeModal(closeId);
    });

    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      const open = Array.from(document.querySelectorAll(".modal")).filter((m) => !m.hidden);
      const top = open[open.length - 1];
      if (top?.id) closeModal(top.id);
    });
  })();

  function setTitle(text) {
    const title = $("#setting-title");
    if (title) title.textContent = text;
  }

  function activateSection(sectionKey) {
    // ซ่อนทุก section ก่อน
    $$(".setting-section").forEach((sec) => hide(sec));

    // ซ่อน action buttons
    hide($("#btn-add-template-type"));
    hide($("#btn-add-province"));
    hide($("#btn-add-org-type"));
    hide($("#btn-add-organization"));
    hide($("#btn-add-person-prefix"));
    hide($("#btn-add-department"));
    hide($("#btn-add-position-title"));
    hide($("#btn-add-user-role"));
    hide($("#btn-add-request-type"));
    hide($("#btn-add-request-sub-type"));
    hide($("#btn-add-request-status"));
    hide($("#btn-add-event-status"));
    hide($("#btn-add-head-of-request"));
    hide($("#btn-add-urgency"));
    hide($("#btn-add-notification-type"));
    hide($("#btn-add-notification-type-staff"));
    hide($("#btn-add-channel"));
    hide($("#btn-add-type-of-device"));
    hide($("#btn-add-main-type-of-device"));

    hide($("#btn-add-link-url"));
    hide($("#btn-add-related-document"));
    hide($("#btn-add-history-image"));
    hide($("#btn-add-diractor"));
    hide($("#btn-add-mission"));
    hide($("#btn-add-structure"));

    // เปิด section ตาม key
    switch (sectionKey) {
      case "provinces":
        show($("#section-provinces"));
        show($("#btn-add-province"));
        setTitle("รายชื่อจังหวัด");
        break;

      case "organization-types":
        show($("#section-org-types"));
        show($("#btn-add-org-type"));
        setTitle("ประเภทหน่วยงาน");
        break;

      case "org-list":
        show($("#section-org-list"));
        show($("#btn-add-organization"));
        setTitle("รายชื่อหน่วยงาน");
        break;

      case "person-prefixes":
        show($("#section-person-prefixes"));
        show($("#btn-add-person-prefix"));
        setTitle("คำนำหน้าชื่อ");
        break;

      case "departments":
        show($("#section-departments"));
        show($("#btn-add-department"));
        setTitle("รายการฝ่ายผู้ใช้งาน");
        break;

      case "position-titles":
        show($("#section-position-titles"));
        show($("#btn-add-position-title"));
        setTitle("รายการตำแหน่งผู้ใช้งาน");
        break;

      case "user-roles":
        show($("#section-user-roles"));
        show($("#btn-add-user-role"));
        setTitle("รายการสิทธิ์ผู้ใช้งาน");
        break;

      case "user-setting":
        show($("#section-setting-user"));
        setTitle("รายการอนุมัติผู้ใช้งาน");
        break;

      case "users":
        show($("#section-users"));
        setTitle("รายการผู้ใช้งาน");
        break;

      case "request-types":
        show($("#section-request-types"));
        show($("#btn-add-request-type"));
        setTitle("ประเภทคำขอ");
        break;

      case "request-sub-types":
        show($("#section-request-sub-types"));
        show($("#btn-add-request-sub-type"));
        setTitle("ประเภทคำขอย่อย");
        break;

      case "request-status":
        show($("#section-request-status"));
        show($("#btn-add-request-status"));
        setTitle("ตั้งค่าสถานะคำขอ");
        break;

      case "event-status":
        show($("#section-event-status"));
        show($("#btn-add-event-status"));
        setTitle("ตั้งค่าสถานะกิจกรรม");
        break;

      case "head-of-request":
        show($("#section-head-of-request"));
        show($("#btn-add-head-of-request"));
        setTitle("ผู้รับผิดชอบตามประเภทย่อย");
        break;

      case "urgency":
        show($("#section-urgency"));
        show($("#btn-add-urgency"));
        setTitle("ความเร่งด่วน");
        loadUrgency();
        break;

      case "notification-type":
        show($("#section-notification-type"));
        show($("#btn-add-notification-type"));
        setTitle("ตั้งค่าประเภทการแจ้งเตือน");
        loadNotificationTypes();
        break;

      case "notification-type-staff":
        show($("#section-notification-type-staff"));
        show($("#btn-add-notification-type-staff"));
        setTitle("ตั้งค่าผู้รับการแจ้งเตือน");
        loadNotificationTypeStaffRefs();
        loadNotificationTypeStaff();
        break;

      case "channels":
        show($("#section-channels"));
        show($("#btn-add-channel"));
        setTitle("ช่องทางแจ้งเตือน (Channel)");
        loadChannels();
        break;

      case "user-notification-channels":
        show($("#section-user-notification-channels"));
        setTitle("ตั้งค่าช่องทางแจ้งเตือนของผู้ใช้");
        loadUserNotificationChannels();
        break;

      case "type-of-device":
        show($("#section-type-of-device"));
        show($("#btn-add-type-of-device"));
        setTitle("ประเภทอุปกรณ์");
        loadTypeOfDevice();
        break;

      case "main-type-of-device":
        setTitle("ประเภทหลักของอุปกรณ์");
        show($("#section-main-type-of-device"));
        show($("#btn-add-main-type-of-device"));
        // ensure handlers (open modal, close, submit) are bound
        initMainTypeOfDeviceSection();
        mainTypeOfDeviceLoad();
        break;

      case "template-types":
        setTitle("เทมเพลตโพสต์");
        show($("#section-template-types"));
        show($("#btn-add-template-type"));
        initTemplateTypesSection();
        loadTemplateTypes();
        break;

      case "image-history":
        show($("#section-image-history"));
        show($("#btn-add-history-image"));
        setTitle("ภาพหน้าประวัติหน่วยงาน");
        initHistoryImagePageSection();
        loadHistoryImagePage();
        break;

      case "structure":
        show($("#section-structure"));
        show($("#btn-add-structure"));
        setTitle("โครงสร้างบุคลากร");
        initStructureSection();
        loadStructures();
        break;

      case "mission":
        show($("#section-mission"));
        show($("#btn-add-mission"));
        setTitle("ตั้งค่าภารกิจบนเว็บไซต์");
        initMissionSection();
        loadMissions();
        break;

      case "directors":
        show($("#section-directors"));
        show($("#btn-add-diractor"));
        setTitle("รายชื่อผู้อำนวยการ");
        initDiractorSection();
        loadDiractors();
        break;

      case "link-url":
        show($("#section-link-url"));
        show($("#btn-add-link-url"));
        setTitle("ลิงก์ที่เกี่ยวข้อง");
        break;

      case "related-documents":
        show($("#section-related-documents"));
        show($("#btn-add-related-document"));
        setTitle("เอกสารที่เกี่ยวข้อง");
        break;

      default:
        show($("#section-default"));
        setTitle("การตั้งค่าข้อมูล");
        break;
    }
  }


  /* =========================
   STRUCTURE (SITE STRUCTURE)
   - Section: #section-structure
   - Action: #btn-add-structure
   - Modal: #structure-modal, #structure-form
   - Inputs: #structure-id, #structure-prefix, #structure-fristname, #structure-lastname,
             #structure-department, #structure-position
   - File: #structure-file
   - Remove: #structure-remove-photo
   - Preview: #structure-preview, #structure-preview-img, #structure-preview-name, #structure-clear
   - Toolbar: #structure-search, #structure-limit, #structure-refresh
   - Table: #structure-tbody
   - Footer: #structure-pagination, #structure-total
  ========================= */

  const strEls = {
    section: $("#section-structure"),
    tbody: $("#structure-tbody"),

    search: $("#structure-search"),
    limit: $("#structure-limit"),
    refreshBtn: $("#structure-refresh"),
    pagination: $("#structure-pagination"),
    total: $("#structure-total"),

    btnAdd: $("#btn-add-structure"),

    modal: $("#structure-modal"),
    form: $("#structure-form"),
    modalTitle: $("#structure-modal-title"),
    submitText: $("#structure-submit-text"),
    modalStatus: $("#structure-modal-status"),
    formError: $("#structure-form-error"),

    inputId: $("#structure-id"),
    inputPrefix: $("#structure-prefix"),
    inputFirstname: $("#structure-fristname"),
    inputLastname: $("#structure-lastname"),
    inputDepartment: $("#structure-department"),
    inputPosition: $("#structure-position"),

    file: $("#structure-file"),
    removePhoto: $("#structure-remove-photo"),

    previewWrap: $("#structure-preview"),
    previewImg: $("#structure-preview-img"),
    previewName: $("#structure-preview-name"),
    clearBtn: $("#structure-clear"),
  };

  const strState = {
    q: "",
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 1,
    inited: false,
    loading: false,
    refsLoaded: false,
  };

  const STRUCTURE_ORG_ID = 7;
  const STR_PLACEHOLDER = "/ict8/assets/image/director-none.png";

  // cache latest position dropdown items so we can infer department from position
  const strPosById = new Map();

  function strToPublicUrl(fp) {
    const p = String(fp || "").trim();
    if (!p) return "";
    if (/^https?:\/\//i.test(p)) return p;
    if (p.startsWith("/uploads/")) return `${API_BASE}${p}`;
    if (p.startsWith("uploads/")) return `${API_BASE}/${p}`;
    if (p.startsWith("/")) return p;
    return `/${p}`;
  }

  function strSetSectionStatus(msg, { isError = false } = {}) {
    if (!strEls.total) return;
    strEls.total.textContent = msg ? String(msg) : "";
    strEls.total.style.color = isError ? "#b42318" : "";
  }

  function strSetModalStatus(msg, { isError = false } = {}) {
    if (!strEls.modalStatus) return;
    strEls.modalStatus.textContent = msg ? String(msg) : "";
    strEls.modalStatus.style.color = isError ? "#b42318" : "";
  }

  function strSetError(msg) {
    if (!strEls.formError) return;
    if (!msg) {
      strEls.formError.hidden = true;
      strEls.formError.textContent = "";
      return;
    }
    strEls.formError.hidden = false;
    strEls.formError.textContent = String(msg);
  }

  function strHidePreview() {
    if (!strEls.previewWrap) return;
    strEls.previewWrap.hidden = true;
    if (strEls.previewImg) strEls.previewImg.removeAttribute("src");
    if (strEls.previewName) strEls.previewName.textContent = "-";
  }

  function strShowPreviewFromFile(file) {
    if (!strEls.previewWrap || !strEls.previewImg || !strEls.previewName) return;
    const url = URL.createObjectURL(file);
    strEls.previewImg.src = url;
    strEls.previewName.textContent = `${file.name} (${Math.round((file.size || 0) / 1024)} KB)`;
    strEls.previewWrap.hidden = false;
    strEls.previewImg.onload = () => {
      try {
        URL.revokeObjectURL(url);
      } catch (_) {
        // ignore
      }
    };
  }

  function strShowPreviewFromPath(path) {
    if (!strEls.previewWrap || !strEls.previewImg || !strEls.previewName) return;
    const url = path ? strToPublicUrl(path) : STR_PLACEHOLDER;
    strEls.previewImg.src = url;
    strEls.previewName.textContent = path ? String(path) : "(รูปเริ่มต้น)";
    strEls.previewWrap.hidden = false;
  }

  function strResetModal() {
    strSetError("");
    strSetModalStatus("");

    if (strEls.inputId) strEls.inputId.value = "";
    if (strEls.inputPrefix) strEls.inputPrefix.value = "";
    if (strEls.inputFirstname) strEls.inputFirstname.value = "";
    if (strEls.inputLastname) strEls.inputLastname.value = "";
    if (strEls.inputDepartment) strEls.inputDepartment.value = "";
    if (strEls.inputPosition) strEls.inputPosition.value = "";
    if (strEls.removePhoto) strEls.removePhoto.checked = false;

    try {
      if (strEls.file) strEls.file.value = "";
    } catch (_) {
      // ignore
    }

    strHidePreview();
  }

  function strRenderPagination() {
    if (!strEls.pagination) return;
    strState.totalPages = calcTotalPages({
      total: strState.total,
      limit: strState.limit,
      totalPages: strState.totalPages,
    });
    renderPager(strEls.pagination, { page: strState.page, totalPages: strState.totalPages });
  }

  function strRenderRows(items = []) {
    if (!strEls.tbody) return;
    if (!Array.isArray(items) || items.length === 0) {
      strEls.tbody.innerHTML = `<tr><td colspan="6" class="muted">ไม่พบข้อมูล</td></tr>`;
      return;
    }

    strEls.tbody.innerHTML = items
      .map((r) => {
        const id = r.structure_id ?? r.id ?? "";
        const prefixTh = String(r.prefix_th ?? "").trim();
        const firstname = String(r.fristname ?? "").trim();
        const lastname = String(r.lastname ?? "").trim();
        const deptTitle = String(r.department_title ?? "").trim();
        const posTitle = String(r.position_title ?? "").trim();
        const prefixId = r.prefix_person_id ?? "";
        const deptId = r.department_id ?? "";
        const posId = r.position_id ?? "";
        const photoPath = String(r.pic_path ?? "").trim();

        const full = `${prefixTh}${firstname}${lastname ? " " + lastname : ""}`.trim();
        const imgUrl = photoPath ? strToPublicUrl(photoPath) : STR_PLACEHOLDER;

        return `
          <tr>
            <td>${escapeHtml(id)}</td>
            <td>
              <img src="${escapeHtml(imgUrl)}" alt="person" style="width:56px; height:56px; object-fit:cover; border-radius:12px; border:1px solid #eee; background:#fafafa;" />
            </td>
            <td>
              <div style="font-weight:600;">${escapeHtml(full || "-")}</div>
              <div class="muted" style="margin-top:4px;">${escapeHtml(prefixTh)}${escapeHtml(firstname)} ${escapeHtml(lastname)}</div>
            </td>
            <td>${escapeHtml(deptTitle || "-")}</td>
            <td>${escapeHtml(posTitle || "-")}</td>
            <td>
              <div class="table-actions" style="display:flex; gap:8px; flex-wrap:wrap;">
                <button class="btn btn-outline btn-sm" type="button" data-action="edit"
                  data-id="${escapeHtml(id)}"
                  data-prefix_id="${escapeHtml(prefixId)}"
                  data-firstname="${escapeHtml(firstname)}"
                  data-lastname="${escapeHtml(lastname)}"
                  data-department_id="${escapeHtml(deptId)}"
                  data-position_id="${escapeHtml(posId)}"
                  data-photo="${escapeHtml(photoPath)}">
                  <i class="fa-solid fa-pen"></i> แก้ไข
                </button>
                <button class="btn btn-danger btn-sm" type="button" data-action="delete"
                  data-id="${escapeHtml(id)}"
                  data-title="${escapeHtml(full || id)}">
                  <i class="fa-solid fa-trash"></i> ลบ
                </button>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");
  }

  function strSetSelectOptions(selectEl, { placeholder = "-- เลือก --", items = [], valueKey, labelBuilder }) {
    if (!selectEl) return;
    const arr = Array.isArray(items) ? items : [];
    selectEl.innerHTML =
      `<option value="" selected>${escapeHtml(placeholder)}</option>` +
      arr
        .map((it) => {
          const v = it?.[valueKey];
          const label = typeof labelBuilder === "function" ? labelBuilder(it) : it?.label;
          return `<option value="${escapeHtml(v)}">${escapeHtml(label ?? "")}</option>`;
        })
        .join("");
  }

  async function strLoadPrefixOptions(selectedPrefixId = "") {
    if (!strEls.inputPrefix) return;
    try {
      const pj = await apiFetch(`/person-prefixes?page=1&limit=500`, { method: "GET" });
      const items = pj?.data?.items || [];
      strSetSelectOptions(strEls.inputPrefix, {
        placeholder: "-- เลือกคำนำหน้า --",
        items,
        valueKey: "person_prefix_id",
        labelBuilder: (it) => it?.prefix_th ?? "",
      });
      if (selectedPrefixId) strEls.inputPrefix.value = String(selectedPrefixId);
    } catch (e) {
      console.warn("[structure] load prefixes failed", e);
      strEls.inputPrefix.innerHTML = `<option value="">โหลดคำนำหน้าไม่สำเร็จ</option>`;
    }
  }

  async function strLoadDepartmentOptions(selectedDeptId = "") {
    if (!strEls.inputDepartment) return;
    try {
      const dj = await apiFetch(`/departments/dropdown?organization_id=${STRUCTURE_ORG_ID}`, { method: "GET" });
      const items = dj?.data || [];
      strSetSelectOptions(strEls.inputDepartment, {
        placeholder: "-- เลือกฝ่าย (ไม่บังคับ) --",
        items,
        valueKey: "department_id",
        labelBuilder: (it) => {
          const title = it?.department_title ?? "";
          const code = it?.department_code ?? "";
          return code ? `${title} (${code})` : title;
        },
      });
      if (selectedDeptId) strEls.inputDepartment.value = String(selectedDeptId);
      strEls.inputDepartment.disabled = false;
    } catch (e) {
      console.warn("[structure] load departments failed", e);
      strEls.inputDepartment.innerHTML = `<option value="">โหลดฝ่ายไม่สำเร็จ</option>`;
      strEls.inputDepartment.disabled = true;
    }
  }

  async function strLoadPositionOptions({ deptId = "", selectedPosId = "" } = {}) {
    if (!strEls.inputPosition) return;

    // reset cache
    strPosById.clear();

    strEls.inputPosition.disabled = true;
    strEls.inputPosition.innerHTML = `<option value="" selected>-- เลือกตำแหน่ง --</option>`;

    try {
      const qs = new URLSearchParams();
      qs.set("organization_id", String(STRUCTURE_ORG_ID));
      if (deptId) qs.set("department_id", String(deptId));

      const pj = await apiFetch(`/position-titles/dropdown?${qs.toString()}`, { method: "GET" });
      const items = pj?.data || [];

      // fill cache for department inference
      for (const it of items) {
        const id = it?.position_title_id;
        if (id == null) continue;
        strPosById.set(String(id), it);
      }

      strSetSelectOptions(strEls.inputPosition, {
        placeholder: "-- เลือกตำแหน่ง --",
        items,
        valueKey: "position_title_id",
        labelBuilder: (it) => {
          const title = it?.position_title ?? "";
          const code = it?.position_code ?? "";
          return code ? `${title} (${code})` : title;
        },
      });
      strEls.inputPosition.disabled = false;
      if (selectedPosId) strEls.inputPosition.value = String(selectedPosId);
    } catch (e) {
      console.warn("[structure] load positions failed", e);
      strEls.inputPosition.innerHTML = `<option value="">โหลดตำแหน่งไม่สำเร็จ</option>`;
      strEls.inputPosition.disabled = true;
    }
  }

  async function strEnsureRefsLoaded({ selectedPrefixId = "", selectedDeptId = "", selectedPosId = "" } = {}) {
    // load prefix + department once per session; positions depend on department
    if (!strState.refsLoaded) {
      strSetModalStatus("กำลังโหลดรายการ...", { isError: false });
      await Promise.all([
        strLoadPrefixOptions(selectedPrefixId),
        strLoadDepartmentOptions(selectedDeptId),
      ]);
      strState.refsLoaded = true;
    } else {
      // ensure selected values are applied
      if (selectedPrefixId && strEls.inputPrefix) strEls.inputPrefix.value = String(selectedPrefixId);
      if (selectedDeptId && strEls.inputDepartment) strEls.inputDepartment.value = String(selectedDeptId);
    }

    // positions: if no dept selected -> show all positions in org
    await strLoadPositionOptions({ deptId: selectedDeptId || strEls.inputDepartment?.value || "", selectedPosId });
    strSetModalStatus("");
  }

  async function strOpenModal({ mode = "create", row } = {}) {
    if (!strEls.modal) return;

    if (mode === "edit" && row) {
      if (strEls.modalTitle) strEls.modalTitle.textContent = "แก้ไขโครงสร้างบุคลากร";
      if (strEls.submitText) strEls.submitText.textContent = "บันทึกการแก้ไข";
      strResetModal();

      const structureId = row.structure_id ?? row.id ?? "";
      const prefixId = row.prefix_person_id ?? row.prefix_person_id ?? row.prefix_id ?? "";
      const deptId = row.department_id ?? "";
      const posId = row.position_id ?? "";
      const photoPath = String(row.pic_path ?? row.photo_path ?? "").trim();

      if (strEls.inputId) strEls.inputId.value = String(structureId);
      if (strEls.inputFirstname) strEls.inputFirstname.value = String(row.fristname ?? row.firstname ?? "");
      if (strEls.inputLastname) strEls.inputLastname.value = String(row.lastname ?? "");

      openModal("structure-modal");
      // load refs and set selected
      await strEnsureRefsLoaded({
        selectedPrefixId: String(prefixId || ""),
        selectedDeptId: String(deptId || ""),
        selectedPosId: String(posId || ""),
      });

      if (photoPath) strShowPreviewFromPath(photoPath);
      else strShowPreviewFromPath("");
    } else {
      if (strEls.modalTitle) strEls.modalTitle.textContent = "เพิ่มโครงสร้างบุคลากร";
      if (strEls.submitText) strEls.submitText.textContent = "บันทึก";
      strResetModal();
      openModal("structure-modal");
      await strEnsureRefsLoaded({ selectedPrefixId: "", selectedDeptId: "", selectedPosId: "" });
      // show placeholder by default
      strShowPreviewFromPath("");
    }

    setTimeout(() => strEls.inputFirstname?.focus?.(), 0);
  }

  function strCloseModal() {
    closeModal("structure-modal");
  }

  async function loadStructures() {
    if (!strEls.section) return;
    if (strState.loading) return;
    strState.loading = true;

    try {
      strSetSectionStatus("กำลังโหลด...");
      if (!window.SiteStructureAPI?.list) throw new Error("SiteStructureAPI.list not found");

      strState.q = String(strEls.search?.value || "").trim();
      strState.limit = toInt(strEls.limit?.value, strState.limit || 50) || 50;

      const res = await window.SiteStructureAPI.list({
        q: strState.q,
        page: strState.page,
        limit: strState.limit,
      });

      const data = res?.data || {};
      const items = data.items || [];
      const pag = data.pagination || {};

      strState.total = Number(pag.total ?? items.length ?? 0);
      strState.totalPages = Number(pag.total_pages ?? strState.totalPages ?? 1);
      strState.page = Number(pag.page ?? strState.page ?? 1);
      strState.limit = Number(pag.limit ?? strState.limit ?? 50);

      strRenderRows(items);
      strRenderPagination();
      strSetSectionStatus(`ทั้งหมด ${strState.total} รายการ`);
    } catch (err) {
      strSetSectionStatus(err?.message || String(err), { isError: true });
      if (strEls.tbody) strEls.tbody.innerHTML = `<tr><td colspan="6" class="muted">โหลดไม่สำเร็จ</td></tr>`;
    } finally {
      strState.loading = false;
    }
  }

  function initStructureSection() {
    if (strState.inited) return;
    strState.inited = true;

    // default limit
    if (strEls.limit && !strEls.limit.value) strEls.limit.value = String(strState.limit);

    strEls.btnAdd?.addEventListener("click", () => {
      strOpenModal({ mode: "create" });
    });

    strEls.refreshBtn?.addEventListener("click", () => {
      loadStructures();
    });

    // search debounce
    let t = null;
    strEls.search?.addEventListener("input", () => {
      clearTimeout(t);
      t = setTimeout(() => {
        strState.page = 1;
        loadStructures();
      }, 300);
    });

    strEls.limit?.addEventListener("change", () => {
      strState.page = 1;
      loadStructures();
    });

    strEls.pagination?.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-page]");
      if (!btn || btn.disabled) return;
      const next = toInt(btn.getAttribute("data-page"), 0);
      if (!next || next < 1 || next > (strState.totalPages || 1)) return;
      if (next === strState.page) return;
      strState.page = next;
      loadStructures();
    });

    // dependent dropdown: dept -> position
    strEls.inputDepartment?.addEventListener("change", async () => {
      const deptId = String(strEls.inputDepartment?.value || "").trim();
      if (strEls.inputPosition) strEls.inputPosition.value = "";
      await strLoadPositionOptions({ deptId, selectedPosId: "" });
    });

    // allow selecting position first; if department is empty and position belongs to a department, auto-set it
    strEls.inputPosition?.addEventListener("change", async () => {
      const posId = String(strEls.inputPosition?.value || "").trim();
      if (!posId) return;

      const deptId = String(strEls.inputDepartment?.value || "").trim();
      if (deptId) return; // already chosen, nothing to infer

      const it = strPosById.get(posId);
      const inferredDeptId = it?.department_id != null ? String(it.department_id) : "";

      // If the selected position has a department, set it and reload positions filtered by that department
      if (inferredDeptId) {
        if (strEls.inputDepartment) strEls.inputDepartment.value = inferredDeptId;
        await strLoadPositionOptions({ deptId: inferredDeptId, selectedPosId: posId });
      }
    });

    strEls.file?.addEventListener("change", () => {
      const f = strEls.file?.files?.[0];
      if (!f) {
        const currentSrc = String(strEls.previewImg?.getAttribute("src") || "").trim();
        if (!currentSrc) strShowPreviewFromPath("");
        return;
      }
      if (!/^image\//i.test(String(f.type || ""))) {
        strSetError("กรุณาเลือกไฟล์รูปภาพเท่านั้น");
        try {
          strEls.file.value = "";
        } catch (_) {
          // ignore
        }
        return;
      }

      // selecting a new photo should override remove-photo intent
      if (strEls.removePhoto) strEls.removePhoto.checked = false;

      strSetError("");
      strSetModalStatus("");
      strShowPreviewFromFile(f);
    });

    strEls.clearBtn?.addEventListener("click", () => {
      try {
        if (strEls.file) strEls.file.value = "";
      } catch (_) {
        // ignore
      }
      strSetError("");
      strSetModalStatus("");
      strShowPreviewFromPath("");
    });

    strEls.removePhoto?.addEventListener("change", () => {
      if (strEls.removePhoto.checked) {
        strShowPreviewFromPath("");
      }
    });

    strEls.tbody?.addEventListener("click", async (e) => {
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;
      const action = btn.getAttribute("data-action");
      const id = btn.getAttribute("data-id");
      if (!action || !id) return;

      if (action === "edit") {
        const row = {
          structure_id: id,
          prefix_person_id: btn.getAttribute("data-prefix_id") || "",
          fristname: btn.getAttribute("data-firstname") || "",
          lastname: btn.getAttribute("data-lastname") || "",
          department_id: btn.getAttribute("data-department_id") || "",
          position_id: btn.getAttribute("data-position_id") || "",
          pic_path: btn.getAttribute("data-photo") || "",
        };
        await strOpenModal({ mode: "edit", row });
        return;
      }

      if (action === "delete") {
        const title = btn.getAttribute("data-title") || id;
        const okDel = confirm(`ยืนยันลบโครงสร้างบุคลากร\n\n- ${title}`);
        if (!okDel) return;

        try {
          strSetSectionStatus("กำลังลบ...");
          await window.SiteStructureAPI.remove(id);
          strSetSectionStatus("ลบเรียบร้อย");

          const oldPage = strState.page;
          await loadStructures();
          if (strState.total === 0 && oldPage > 1) {
            strState.page = oldPage - 1;
            await loadStructures();
          }
        } catch (err) {
          strSetSectionStatus(err?.message || String(err), { isError: true });
        }
      }
    });

    strEls.form?.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!window.SiteStructureAPI) return;

      const idRaw = String(strEls.inputId?.value || "").trim();
      const prefixId = String(strEls.inputPrefix?.value || "").trim();
      const firstname = String(strEls.inputFirstname?.value || "").trim();
      const lastname = String(strEls.inputLastname?.value || "").trim();
      const deptId = String(strEls.inputDepartment?.value || "").trim();
      const posId = String(strEls.inputPosition?.value || "").trim();
      const file = strEls.file?.files?.[0];
      const removePhoto = !!strEls.removePhoto?.checked;

      if (!prefixId || !firstname || !lastname || !posId) {
        strSetError("กรุณากรอกข้อมูลให้ครบ: คำนำหน้า ชื่อ นามสกุล และตำแหน่ง");
        return;
      }

      const submitBtn = strEls.form?.querySelector?.("button[type='submit']");

      try {
        strSetError("");
        strSetModalStatus("กำลังบันทึก...");
        if (submitBtn) submitBtn.disabled = true;

        const fd = new FormData();
        fd.append("prefix_person_id", prefixId);
        fd.append("fristname", firstname);
        fd.append("lastname", lastname);
        // department optional: send only when selected
        if (deptId) fd.append("department_id", deptId);
        fd.append("position_id", posId);

        if (idRaw) {
          fd.append("remove_photo", removePhoto ? "1" : "0");
        }
        if (file) fd.append("file", file);

        if (idRaw) {
          await window.SiteStructureAPI.update(idRaw, fd);
        } else {
          await window.SiteStructureAPI.create(fd);
        }

        strSetModalStatus("บันทึกสำเร็จ");
        strCloseModal();
        await loadStructures();
      } catch (err) {
        strSetError(err?.message || String(err));
        strSetModalStatus("");
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  /* =========================
   MISSION (SITE MISSION)
   - Section: #section-mission
   - Action: #btn-add-mission
   - Modal: #mission-modal, #mission-form
   - Inputs: #mission-id, #mission-title, #mission-discription, #mission-sort-order
   - File: #mission-file
   - Remove: #mission-remove-photo
   - Preview: #mission-preview, #mission-preview-img, #mission-preview-name, #mission-clear
   - Toolbar: #mission-search, #mission-limit, #mission-refresh
   - Table: #mission-tbody (drag rows to reorder)
   - Footer: #mission-pagination, #mission-total
  ========================= */

  const msEls = {
    section: $("#section-mission"),
    tbody: $("#mission-tbody"),

    search: $("#mission-search"),
    limit: $("#mission-limit"),
    refreshBtn: $("#mission-refresh"),
    pagination: $("#mission-pagination"),
    total: $("#mission-total"),

    btnAdd: $("#btn-add-mission"),

    modal: $("#mission-modal"),
    form: $("#mission-form"),
    modalTitle: $("#mission-modal-title"),
    submitText: $("#mission-submit-text"),
    modalStatus: $("#mission-modal-status"),
    formError: $("#mission-form-error"),

    inputId: $("#mission-id"),
    inputTitle: $("#mission-title"),
    inputDesc: $("#mission-discription"),
    inputSort: $("#mission-sort-order"),

    file: $("#mission-file"),
    removePhoto: $("#mission-remove-photo"),

    previewWrap: $("#mission-preview"),
    previewImg: $("#mission-preview-img"),
    previewName: $("#mission-preview-name"),
    clearBtn: $("#mission-clear"),
  };

  const msState = {
    q: "",
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 1,
    inited: false,
    loading: false,
    draggingId: null,
    lastOrder: [],
  };

  const MS_PLACEHOLDER = "/ict8/assets/image/activity-1.png";

  function msToPublicUrl(fp) {
    const p = String(fp || "").trim();
    if (!p) return "";
    if (/^https?:\/\//i.test(p)) return p;
    if (p.startsWith("/uploads/")) return `${API_BASE}${p}`;
    if (p.startsWith("uploads/")) return `${API_BASE}/${p}`;
    if (p.startsWith("/")) return p;
    return `/${p}`;
  }

  function msSetSectionStatus(msg, { isError = false } = {}) {
    if (!msEls.total) return;
    msEls.total.textContent = msg ? String(msg) : "";
    msEls.total.style.color = isError ? "#b42318" : "";
  }

  function msSetModalStatus(msg, { isError = false } = {}) {
    if (!msEls.modalStatus) return;
    msEls.modalStatus.textContent = msg ? String(msg) : "";
    msEls.modalStatus.style.color = isError ? "#b42318" : "";
  }

  function msSetError(msg) {
    if (!msEls.formError) return;
    if (!msg) {
      msEls.formError.hidden = true;
      msEls.formError.textContent = "";
      return;
    }
    msEls.formError.hidden = false;
    msEls.formError.textContent = String(msg);
  }

  function msHidePreview() {
    if (!msEls.previewWrap) return;
    msEls.previewWrap.hidden = true;
    if (msEls.previewImg) msEls.previewImg.removeAttribute("src");
    if (msEls.previewName) msEls.previewName.textContent = "-";
  }

  function msShowPreviewFromPath(path) {
    if (!msEls.previewWrap || !msEls.previewImg || !msEls.previewName) return;
    const p = String(path || "").trim();
    if (!p) {
      msHidePreview();
      return;
    }

    const url = msToPublicUrl(p);
    msEls.previewImg.src = url;
    msEls.previewImg.onerror = () => {
      try {
        msEls.previewImg.onerror = null;
      } catch (_) {
        // ignore
      }
      msEls.previewImg.src = MS_PLACEHOLDER;
    };

    const filename = p.split("/").filter(Boolean).pop() || p;
    msEls.previewName.textContent = filename;
    msEls.previewWrap.hidden = false;
  }

  function msShowPreviewFromFile(file) {
    if (!msEls.previewWrap || !msEls.previewImg || !msEls.previewName) return;
    const url = URL.createObjectURL(file);
    msEls.previewImg.src = url;
    msEls.previewName.textContent = file?.name || "-";
    msEls.previewWrap.hidden = false;

    msEls.previewImg.onload = () => {
      try {
        URL.revokeObjectURL(url);
      } catch (_) {
        // ignore
      }
    };
  }

  function msResetModal() {
    msSetError("");
    msSetModalStatus("");
    if (msEls.form) msEls.form.reset();
    if (msEls.inputId) msEls.inputId.value = "";
    if (msEls.removePhoto) msEls.removePhoto.checked = false;
    msHidePreview();
  }

  async function msOpenModal({ mode = "create", row } = {}) {
    if (!msEls.modal) return;

    if (mode === "edit" && row) {
      if (msEls.modalTitle) msEls.modalTitle.textContent = "แก้ไขภารกิจบนเว็บไซต์";
      if (msEls.submitText) msEls.submitText.textContent = "บันทึกการแก้ไข";
      msResetModal();

      const id = row.site_mission_id ?? row.id ?? "";
      const title = row.title ?? "";
      const desc = row.discription ?? row.description ?? "";
      const sort = row.sort_order ?? "";
      const photo = String(row.img_path ?? "").trim();

      if (msEls.inputId) msEls.inputId.value = String(id);
      if (msEls.inputTitle) msEls.inputTitle.value = String(title);
      if (msEls.inputDesc) msEls.inputDesc.value = String(desc);
      if (msEls.inputSort) msEls.inputSort.value = sort === null || sort === undefined ? "" : String(sort);

      openModal("mission-modal");
      msShowPreviewFromPath(photo);
    } else {
      if (msEls.modalTitle) msEls.modalTitle.textContent = "เพิ่มภารกิจบนเว็บไซต์";
      if (msEls.submitText) msEls.submitText.textContent = "บันทึก";
      msResetModal();
      openModal("mission-modal");
      msShowPreviewFromPath("");
    }

    setTimeout(() => msEls.inputTitle?.focus?.(), 0);
  }

  function msCloseModal() {
    closeModal("mission-modal");
  }

  function msRenderRows(items) {
    if (!msEls.tbody) return;
    const rows = Array.isArray(items) ? items : [];
    if (!rows.length) {
      msEls.tbody.innerHTML = `<tr><td colspan="7" class="muted">ยังไม่มีข้อมูล</td></tr>`;
      msState.lastOrder = [];
      return;
    }

    msState.lastOrder = rows.map((x) => Number(x.site_mission_id));

    msEls.tbody.innerHTML = rows
      .map((r) => {
        const id = r.site_mission_id;
        const title = String(r.title || "");
        const desc = String(r.discription || "");
        const sort = r.sort_order ?? "";
        const photo = String(r.img_path || "").trim();
        const img = photo ? msToPublicUrl(photo) : MS_PLACEHOLDER;

        const descShort = desc.length > 120 ? desc.slice(0, 120) + "…" : desc;

        return `
          <tr class="mission-row" data-id="${escapeHtml(id)}" draggable="true">
            <td style="text-align:center;">
              <span class="drag-handle" title="ลากเพื่อเรียงลำดับ" aria-label="ลากเพื่อเรียงลำดับ">
                <i class="fa-solid fa-grip-vertical"></i>
              </span>
            </td>
            <td>${escapeHtml(id)}</td>
            <td>
              <img src="${escapeHtml(img)}" alt="" style="width:56px;height:56px;object-fit:cover;border-radius:10px;border:1px solid #eee;background:#fafafa" onerror="this.onerror=null;this.src='${escapeHtml(MS_PLACEHOLDER)}';" />
            </td>
            <td>${escapeHtml(sort === null ? "" : String(sort))}</td>
            <td>${escapeHtml(title)}</td>
            <td class="muted">${escapeHtml(descShort)}</td>
            <td>
              <div style="display:flex;gap:8px;flex-wrap:wrap;">
                <button class="btn btn-outline btn-sm" type="button" data-action="edit"
                  data-id="${escapeHtml(id)}"
                  data-title="${escapeHtml(title)}"
                  data-discription="${escapeHtml(desc)}"
                  data-sort_order="${escapeHtml(sort === null ? "" : String(sort))}"
                  data-photo="${escapeHtml(photo)}"
                >แก้ไข</button>
                <button class="btn btn-danger btn-sm" type="button" data-action="delete" data-id="${escapeHtml(id)}" data-title="${escapeHtml(title)}">ลบ</button>
              </div>
            </td>
          </tr>
        `;
      })
      .join("\n");
  }

  function msRenderPagination() {
    if (!msEls.pagination) return;
    renderPager(msEls.pagination, { page: msState.page, totalPages: msState.totalPages });
  }

  async function loadMissions() {
    if (!msEls.section) return;
    if (msState.loading) return;
    msState.loading = true;

    try {
      msSetSectionStatus("กำลังโหลด...");
      if (!window.SiteMissionAPI?.list) throw new Error("SiteMissionAPI.list not found");

      msState.q = String(msEls.search?.value || "").trim();
      msState.limit = toInt(msEls.limit?.value, msState.limit || 50) || 50;

      const res = await window.SiteMissionAPI.list({
        q: msState.q,
        page: msState.page,
        limit: msState.limit,
      });

      const data = res?.data || {};
      const items = data.items || [];
      const pag = data.pagination || {};

      msState.total = Number(pag.total ?? items.length ?? 0);
      msState.totalPages = Number(pag.total_pages ?? msState.totalPages ?? 1);
      msState.page = Number(pag.page ?? msState.page ?? 1);
      msState.limit = Number(pag.limit ?? msState.limit ?? 50);

      msRenderRows(items);
      msRenderPagination();
      msSetSectionStatus(`ทั้งหมด ${msState.total} รายการ`);
    } catch (err) {
      msSetSectionStatus(err?.message || String(err), { isError: true });
      if (msEls.tbody) msEls.tbody.innerHTML = `<tr><td colspan="7" class="muted">โหลดไม่สำเร็จ</td></tr>`;
    } finally {
      msState.loading = false;
    }
  }

  function msGetCurrentOrderIds() {
    if (!msEls.tbody) return [];
    return Array.from(msEls.tbody.querySelectorAll("tr[data-id]")).map((tr) => Number(tr.getAttribute("data-id")));
  }

  function msBindDragAndDropOnce() {
    if (!msEls.tbody || msEls.tbody.__MISSION_DND_BOUND__) return;
    msEls.tbody.__MISSION_DND_BOUND__ = true;

    let dragEl = null;

    msEls.tbody.addEventListener("dragstart", (e) => {
      const tr = e.target?.closest?.("tr[data-id]");
      if (!tr) return;
      // only start drag from handle
      if (!e.target?.closest?.(".drag-handle")) {
        e.preventDefault();
        return;
      }
      dragEl = tr;
      tr.classList.add("is-dragging");
      try {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", tr.getAttribute("data-id") || "");
      } catch (_) {
        // ignore
      }
    });

    msEls.tbody.addEventListener("dragend", () => {
      if (dragEl) dragEl.classList.remove("is-dragging");
      dragEl = null;
    });

    msEls.tbody.addEventListener("dragover", (e) => {
      if (!dragEl) return;
      e.preventDefault();

      const over = e.target?.closest?.("tr[data-id]");
      if (!over || over === dragEl) return;

      const rect = over.getBoundingClientRect();
      const isAfter = e.clientY > rect.top + rect.height / 2;
      if (isAfter) {
        over.after(dragEl);
      } else {
        over.before(dragEl);
      }
    });

    msEls.tbody.addEventListener("drop", async (e) => {
      if (!dragEl) return;
      e.preventDefault();

      // Reorder is only safe when all items are visible.
      if (msState.page !== 1 || msState.total > msState.limit) {
        msSetSectionStatus("การเรียงลำดับต้องอยู่หน้า 1 และตั้ง limit ให้แสดงทั้งหมด", { isError: true });
        // revert by reloading
        await loadMissions();
        return;
      }

      const ids = msGetCurrentOrderIds();
      const same = ids.length === msState.lastOrder.length && ids.every((x, i) => x === msState.lastOrder[i]);
      if (same) return;

      try {
        msSetSectionStatus("กำลังบันทึกลำดับ...");
        await window.SiteMissionAPI.reorder(ids);
        msSetSectionStatus("บันทึกลำดับสำเร็จ");
        await loadMissions();
      } catch (err) {
        msSetSectionStatus(err?.message || String(err), { isError: true });
        await loadMissions();
      }
    });
  }

  function initMissionSection() {
    if (msState.inited) return;
    msState.inited = true;

    if (msEls.limit && !msEls.limit.value) msEls.limit.value = String(msState.limit);

    msBindDragAndDropOnce();

    msEls.btnAdd?.addEventListener("click", () => msOpenModal({ mode: "create" }));
    msEls.refreshBtn?.addEventListener("click", () => loadMissions());

    let t = null;
    msEls.search?.addEventListener("input", () => {
      clearTimeout(t);
      t = setTimeout(() => {
        msState.page = 1;
        loadMissions();
      }, 300);
    });

    msEls.limit?.addEventListener("change", () => {
      msState.page = 1;
      loadMissions();
    });

    msEls.pagination?.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-page]");
      if (!btn || btn.disabled) return;
      const next = toInt(btn.getAttribute("data-page"), 0);
      if (!next || next < 1 || next > (msState.totalPages || 1)) return;
      if (next === msState.page) return;
      msState.page = next;
      loadMissions();
    });

    msEls.file?.addEventListener("change", () => {
      const f = msEls.file?.files?.[0];
      if (!f) {
        const currentSrc = String(msEls.previewImg?.getAttribute("src") || "").trim();
        if (!currentSrc) msShowPreviewFromPath("");
        return;
      }
      if (!/^image\//i.test(String(f.type || ""))) {
        msSetError("กรุณาเลือกไฟล์รูปภาพเท่านั้น");
        try {
          msEls.file.value = "";
        } catch (_) {
          // ignore
        }
        return;
      }
      if (msEls.removePhoto) msEls.removePhoto.checked = false;
      msSetError("");
      msSetModalStatus("");
      msShowPreviewFromFile(f);
    });

    msEls.clearBtn?.addEventListener("click", () => {
      try {
        if (msEls.file) msEls.file.value = "";
      } catch (_) {
        // ignore
      }
      msSetError("");
      msSetModalStatus("");
      msShowPreviewFromPath("");
    });

    msEls.removePhoto?.addEventListener("change", () => {
      if (msEls.removePhoto.checked) msShowPreviewFromPath("");
    });

    msEls.tbody?.addEventListener("click", async (e) => {
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;
      const action = btn.getAttribute("data-action");
      const id = btn.getAttribute("data-id");
      if (!action || !id) return;

      if (action === "edit") {
        const row = {
          site_mission_id: id,
          title: btn.getAttribute("data-title") || "",
          discription: btn.getAttribute("data-discription") || "",
          sort_order: btn.getAttribute("data-sort_order") || "",
          img_path: btn.getAttribute("data-photo") || "",
        };
        await msOpenModal({ mode: "edit", row });
        return;
      }

      if (action === "delete") {
        const title = btn.getAttribute("data-title") || id;
        const okDel = confirm(`ยืนยันลบภารกิจ\n\n- ${title}`);
        if (!okDel) return;

        try {
          msSetSectionStatus("กำลังลบ...");
          await window.SiteMissionAPI.remove(id);
          msSetSectionStatus("ลบเรียบร้อย");

          const oldPage = msState.page;
          await loadMissions();
          if (msState.total === 0 && oldPage > 1) {
            msState.page = oldPage - 1;
            await loadMissions();
          }
        } catch (err) {
          msSetSectionStatus(err?.message || String(err), { isError: true });
        }
      }
    });

    msEls.form?.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!window.SiteMissionAPI) return;

      const idRaw = String(msEls.inputId?.value || "").trim();
      const title = String(msEls.inputTitle?.value || "").trim();
      const discription = String(msEls.inputDesc?.value || "").trim();
      const sortOrder = String(msEls.inputSort?.value || "").trim();
      const file = msEls.file?.files?.[0];
      const removePhoto = !!msEls.removePhoto?.checked;

      if (!title || !discription) {
        msSetError("กรุณากรอกข้อมูลให้ครบ: หัวข้อ และรายละเอียด");
        return;
      }

      const submitBtn = msEls.form?.querySelector?.("button[type='submit']");

      try {
        msSetError("");
        msSetModalStatus("กำลังบันทึก...");
        if (submitBtn) submitBtn.disabled = true;

        const fd = new FormData();
        fd.append("title", title);
        fd.append("discription", discription);
        if (sortOrder) fd.append("sort_order", sortOrder);

        if (idRaw) {
          fd.append("remove_photo", removePhoto ? "1" : "0");
        }
        if (file) fd.append("file", file);

        if (idRaw) {
          await window.SiteMissionAPI.update(idRaw, fd);
        } else {
          await window.SiteMissionAPI.create(fd);
        }

        msSetModalStatus("บันทึกสำเร็จ");
        msCloseModal();
        await loadMissions();
      } catch (err) {
        msSetError(err?.message || String(err));
        msSetModalStatus("");
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  /* =========================
    Sidebar dropdown toggle (ของเดิม)
  ========================= */
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".menu-toggle");
    if (!btn) return;

    const menuId = btn.getAttribute("aria-controls");
    const menuEl = document.getElementById(menuId);
    if (!menuEl) return;

    const expanded = btn.getAttribute("aria-expanded") === "true";
    btn.setAttribute("aria-expanded", String(!expanded));

    // toggle hidden
    menuEl.hidden = expanded;
  });

  /* =========================
   MAIN TYPE OF DEVICE (NEW)
   - Section: #section-main-type-of-device
   - Toolbar: #main-type-of-device-search, #main-type-of-device-limit, #main-type-of-device-refresh
   - Table: #main-type-of-device-tbody, #main-type-of-device-pagination, #main-type-of-device-total
   - Action: #btn-add-main-type-of-device
   - Modal: #main-type-of-device-modal, #main-type-of-device-form
 ========================= */

  const mtdEls = {
    section: document.querySelector("#section-main-type-of-device"),
    tbody: document.querySelector("#main-type-of-device-tbody"),
    search: document.querySelector("#main-type-of-device-search"),
    limit: document.querySelector("#main-type-of-device-limit"),
    refresh: document.querySelector("#main-type-of-device-refresh"),
    pagination: document.querySelector("#main-type-of-device-pagination"),
    total: document.querySelector("#main-type-of-device-total"),

    btnAdd: document.querySelector("#btn-add-main-type-of-device"),

    modal: document.querySelector("#main-type-of-device-modal"),
    form: document.querySelector("#main-type-of-device-form"),
    modalTitle: document.querySelector("#main-type-of-device-modal-title"),
    submitText: document.querySelector("#main-type-of-device-submit-text"),

    inputId: document.querySelector("#main-type-of-device-id"),
    inputTitle: document.querySelector("#main-type-of-device-title"),

    formError: document.querySelector("#main-type-of-device-form-error"),
  };

  const mtdState = {
    q: "",
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 1,
    loading: false,
    inited: false,
  };

  // ---------- small helpers ----------
  function mtdSetError(msg) {
    if (!mtdEls.formError) return;
    if (!msg) {
      mtdEls.formError.hidden = true;
      mtdEls.formError.textContent = "";
      return;
    }
    mtdEls.formError.hidden = false;
    mtdEls.formError.textContent = msg;
  }

  function mtdOpenModal({ mode = "create", row } = {}) {
    if (!mtdEls.modal || !mtdEls.form) return;

    mtdSetError("");

    if (mode === "edit" && row) {
      mtdEls.modalTitle.textContent = "แก้ไขประเภทหลักของอุปกรณ์";
      mtdEls.submitText.textContent = "บันทึกการแก้ไข";
      mtdEls.inputId.value = row.id ?? "";
      mtdEls.inputTitle.value = row.title ?? "";
    } else {
      mtdEls.modalTitle.textContent = "เพิ่มประเภทหลักของอุปกรณ์";
      mtdEls.submitText.textContent = "บันทึก";
      mtdEls.inputId.value = "";
      mtdEls.inputTitle.value = "";
    }

    mtdEls.modal.hidden = false;
    // โฟกัสช่อง title
    setTimeout(() => mtdEls.inputTitle?.focus(), 0);
  }

  function mtdCloseModal() {
    if (!mtdEls.modal) return;
    mtdEls.modal.hidden = true;
  }

  function mtdEscapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function mtdRenderPagination() {
    if (!mtdEls.pagination) return;

    mtdState.totalPages = calcTotalPages({
      total: mtdState.total,
      limit: mtdState.limit,
      totalPages: mtdState.totalPages,
    });

    renderPager(mtdEls.pagination, {
      page: mtdState.page,
      totalPages: mtdState.totalPages,
    });
  }

  function mtdRenderRows(items) {
    if (!mtdEls.tbody) return;

    if (!items || items.length === 0) {
      mtdEls.tbody.innerHTML = `
      <tr><td colspan="3" class="muted">ไม่พบข้อมูล</td></tr>
    `;
      return;
    }

    mtdEls.tbody.innerHTML = items
      .map((r) => {
        const id = r.id ?? r.main_type_of_device ?? "";
        const title = r.title ?? r.main_type_of_device_title ?? "";
        return `
        <tr>
          <td>${mtdEscapeHtml(id)}</td>
          <td>${mtdEscapeHtml(title)}</td>
          <td>
            <div class="table-actions">
              <button class="btn btn-outline btn-sm" type="button" data-action="edit" data-id="${mtdEscapeHtml(id)}"
                data-title="${mtdEscapeHtml(title)}">
                <i class="fa-solid fa-pen"></i> แก้ไข
              </button>
              <button class="btn btn-danger btn-sm" type="button" data-action="delete" data-id="${mtdEscapeHtml(id)}"
                data-title="${mtdEscapeHtml(title)}">
                <i class="fa-solid fa-trash"></i> ลบ
              </button>
            </div>
          </td>
        </tr>
      `;
      })
      .join("");

    // bind actions
    mtdEls.tbody.querySelectorAll("[data-action='edit']").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        const title = btn.getAttribute("data-title");
        mtdOpenModal({ mode: "edit", row: { id, title } });
      });
    });

    mtdEls.tbody.querySelectorAll("[data-action='delete']").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        const title = btn.getAttribute("data-title") || "";
        if (!id) return;

        const ok = confirm(`ยืนยันลบประเภทหลักของอุปกรณ์\n\n- ${title}\n\n* การลบอาจกระทบข้อมูลอุปกรณ์ที่อ้างอิง`);
        if (!ok) return;

        try {
          await window.MainTypeOfDeviceAPI.remove(id);
          mainTypeOfDeviceLoad();
        } catch (e) {
          alert(e?.message || String(e));
        }
      });
    });
  }

  /* =========================
   IMAGE HISTORY PAGE
   - Section: #section-image-history
   - Action: #btn-add-history-image
   - Modal: #history-image-modal, #history-image-form
   - Upload: #history-image-modal-file, #history-image-modal-set-active
   - Preview: #history-image-modal-preview, #history-image-modal-preview-img, #history-image-modal-preview-name, #history-image-modal-clear
   - Toolbar: #history-image-search, #history-image-limit, #history-image-refresh
   - Table: #history-image-tbody
   - Footer: #history-image-pagination, #history-image-total
 ========================= */

  const hipEls = {
    section: $("#section-image-history"),
    tbody: $("#history-image-tbody"),

    search: $("#history-image-search"),
    limit: $("#history-image-limit"),
    refreshBtn: $("#history-image-refresh"),
    pagination: $("#history-image-pagination"),
    total: $("#history-image-total"),

    btnAdd: $("#btn-add-history-image"),

    modal: $("#history-image-modal"),
    form: $("#history-image-form"),
    file: $("#history-image-modal-file"),
    setActive: $("#history-image-modal-set-active"),
    modalStatus: $("#history-image-modal-status"),
    modalError: $("#history-image-modal-error"),
    submitText: $("#history-image-modal-submit-text"),

    previewWrap: $("#history-image-modal-preview"),
    previewImg: $("#history-image-modal-preview-img"),
    previewName: $("#history-image-modal-preview-name"),
    clearBtn: $("#history-image-modal-clear"),

  };

  const hipState = {
    q: "",
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 1,
    inited: false,
    loading: false,
  };

  function hipToPublicUrl(fp) {
    const p = String(fp || "").trim();
    if (!p) return "";
    if (/^https?:\/\//i.test(p)) return p;
    if (p.startsWith("/uploads/")) return `${API_BASE}${p}`;
    if (p.startsWith("/")) return p;
    return `/${p}`;
  }

  function hipSetSectionStatus(msg, { isError = false } = {}) {
    // Reuse #history-image-total as a lightweight status line (no separate status element in section)
    if (!hipEls.total) return;
    hipEls.total.textContent = msg ? String(msg) : "";
    hipEls.total.style.color = isError ? "#b42318" : "";
  }

  function hipSetModalStatus(msg, { isError = false } = {}) {
    if (!hipEls.modalStatus) return;
    hipEls.modalStatus.textContent = msg ? String(msg) : "";
    hipEls.modalStatus.style.color = isError ? "#b42318" : "";
  }

  function hipSetModalError(msg) {
    if (!hipEls.modalError) return;
    if (!msg) {
      hipEls.modalError.hidden = true;
      hipEls.modalError.textContent = "";
      return;
    }
    hipEls.modalError.hidden = false;
    hipEls.modalError.textContent = String(msg);
  }

  function hipResetModal() {
    hipSetModalError("");
    hipSetModalStatus("");

    try {
      if (hipEls.file) hipEls.file.value = "";
    } catch (_) {
      // ignore
    }

    if (hipEls.setActive) hipEls.setActive.checked = true;
    hipHidePreview();

    if (hipEls.submitText) hipEls.submitText.textContent = "อัปโหลด";
    if (hipEls.file) hipEls.file.disabled = false;
    // submit button lives inside the form; disable by querying
    const submitBtn = hipEls.form?.querySelector?.("button[type='submit']");
    if (submitBtn) submitBtn.disabled = false;
  }

  function hipOpenModal() {
    hipResetModal();
    openModal("history-image-modal");
    setTimeout(() => hipEls.file?.focus?.(), 0);
  }

  function hipCloseModal() {
    closeModal("history-image-modal");
  }

  function hipHidePreview() {
    if (!hipEls.previewWrap) return;
    hipEls.previewWrap.hidden = true;
    if (hipEls.previewImg) hipEls.previewImg.removeAttribute("src");
    if (hipEls.previewName) hipEls.previewName.textContent = "-";
  }

  function hipShowPreview(file) {
    if (!hipEls.previewWrap || !hipEls.previewImg || !hipEls.previewName) return;

    const url = URL.createObjectURL(file);
    hipEls.previewImg.src = url;
    hipEls.previewName.textContent = `${file.name} (${Math.round((file.size || 0) / 1024)} KB)`;
    hipEls.previewWrap.hidden = false;

    // revoke when image loads to avoid leaks
    hipEls.previewImg.onload = () => {
      try {
        URL.revokeObjectURL(url);
      } catch (_) {
        // ignore
      }
    };
  }

  function hipRenderRows(items = []) {
    if (!hipEls.tbody) return;

    if (!Array.isArray(items) || items.length === 0) {
      hipEls.tbody.innerHTML = `<tr><td colspan="5" class="muted">ไม่พบข้อมูล</td></tr>`;
      return;
    }

    hipEls.tbody.innerHTML = items
      .map((r) => {
        const id = r.history_image_page_id ?? r.id ?? "";
        const path = String(r.path || "").trim();
        const active = Number(r.is_active) === 1;

        const imgUrl = path ? hipToPublicUrl(path) : "";
        const imgCell = imgUrl
          ? `<img src="${escapeHtml(imgUrl)}" alt="history" style="width:120px; height:auto; border-radius:10px; border:1px solid #eee; background:#fafafa;" />`
          : `<span class="muted">-</span>`;

        const activeCell = active ? `<span class="badge badge--success">ใช้งาน</span>` : `<span class="muted">-</span>`;

        const btnActivate = active
          ? `<button class="btn btn-outline btn-sm" type="button" disabled>
              <i class="fa-solid fa-circle-check"></i> ใช้งานอยู่
            </button>`
          : `<button class="btn btn-primary btn-sm" type="button" data-action="activate" data-id="${escapeHtml(id)}">
              <i class="fa-solid fa-bolt"></i> ตั้งเป็นรูปหลัก
            </button>`;

        return `
          <tr>
            <td>${escapeHtml(id)}</td>
            <td>${imgCell}</td>
            <td style="word-break:break-all;">${path ? escapeHtml(path) : "-"}</td>
            <td>${activeCell}</td>
            <td>
              <div class="table-actions" style="display:flex; gap:8px; flex-wrap:wrap;">
                ${btnActivate}
                <button class="btn btn-danger btn-sm" type="button" data-action="delete" data-id="${escapeHtml(id)}" data-path="${escapeHtml(path)}">
                  <i class="fa-solid fa-trash"></i> ลบ
                </button>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");
  }

  function hipRenderPagination() {
    if (!hipEls.pagination) return;
    hipState.totalPages = calcTotalPages({
      total: hipState.total,
      limit: hipState.limit,
      totalPages: hipState.totalPages,
    });

    renderPager(hipEls.pagination, {
      page: hipState.page,
      totalPages: hipState.totalPages,
    });
  }

  async function loadHistoryImagePage() {
    if (!hipEls.section) return;
    if (hipState.loading) return;
    hipState.loading = true;

    try {
      hipSetSectionStatus("กำลังโหลด...");
      if (!window.HistoryImagePageAPI?.list) {
        throw new Error("HistoryImagePageAPI.list not found");
      }

      hipState.q = String(hipEls.search?.value || "").trim();
      hipState.limit = toInt(hipEls.limit?.value, hipState.limit || 50) || 50;

      const res = await window.HistoryImagePageAPI.list({
        q: hipState.q,
        page: hipState.page,
        limit: hipState.limit,
      });
      const data = res?.data || {};
      const items = data.items || [];
      const pag = data.pagination || {};

      hipState.total = Number(pag.total ?? items.length ?? 0);
      hipState.totalPages = Number(pag.total_pages ?? hipState.totalPages ?? 1);
      hipState.page = Number(pag.page ?? hipState.page ?? 1);
      hipState.limit = Number(pag.limit ?? hipState.limit ?? 50);

      hipRenderRows(items);
      hipRenderPagination();
      hipSetSectionStatus(`ทั้งหมด ${hipState.total} รายการ`);
    } catch (err) {
      hipSetSectionStatus(err?.message || String(err), { isError: true });
      if (hipEls.tbody) hipEls.tbody.innerHTML = `<tr><td colspan="5" class="muted">โหลดไม่สำเร็จ</td></tr>`;
    } finally {
      hipState.loading = false;
    }
  }

  function initHistoryImagePageSection() {
    if (hipState.inited) return;
    hipState.inited = true;

    hipHidePreview();

    hipEls.btnAdd?.addEventListener("click", () => {
      hipOpenModal();
    });

    hipEls.file?.addEventListener("change", () => {
      const f = hipEls.file?.files?.[0];
      if (!f) {
        hipHidePreview();
        return;
      }
      if (!/^image\//i.test(String(f.type || ""))) {
        hipSetModalError("กรุณาเลือกไฟล์รูปภาพเท่านั้น");
        try {
          hipEls.file.value = "";
        } catch (_) {
          // ignore
        }
        hipHidePreview();
        return;
      }
      hipSetModalError("");
      hipSetModalStatus("");
      hipShowPreview(f);
    });

    hipEls.clearBtn?.addEventListener("click", () => {
      hipSetModalError("");
      hipSetModalStatus("");
      try {
        if (hipEls.file) hipEls.file.value = "";
      } catch (_) {
        // ignore
      }
      hipHidePreview();
    });

    hipEls.refreshBtn?.addEventListener("click", () => {
      loadHistoryImagePage();
    });

    // search debounce
    let t = null;
    hipEls.search?.addEventListener("input", () => {
      clearTimeout(t);
      t = setTimeout(() => {
        hipState.page = 1;
        loadHistoryImagePage();
      }, 300);
    });

    hipEls.limit?.addEventListener("change", () => {
      hipState.page = 1;
      loadHistoryImagePage();
    });

    hipEls.pagination?.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-page]");
      if (!btn || btn.disabled) return;
      const next = toInt(btn.getAttribute("data-page"), 0);
      if (!next || next < 1 || next > (hipState.totalPages || 1)) return;
      if (next === hipState.page) return;
      hipState.page = next;
      loadHistoryImagePage();
    });

    hipEls.form?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const f = hipEls.file?.files?.[0];
      if (!f) {
        hipSetModalError("กรุณาแนบไฟล์ก่อนอัปโหลด");
        return;
      }

      const submitBtn = hipEls.form?.querySelector?.("button[type='submit']");

      try {
        hipSetModalError("");
        hipSetModalStatus("กำลังอัปโหลด...");
        if (hipEls.submitText) hipEls.submitText.textContent = "กำลังอัปโหลด...";
        if (submitBtn) submitBtn.disabled = true;
        if (hipEls.file) hipEls.file.disabled = true;

        if (!window.HistoryImagePageAPI?.upload) {
          throw new Error("HistoryImagePageAPI.upload not found");
        }

        const setActive = !!hipEls.setActive?.checked;
        await window.HistoryImagePageAPI.upload(f, { setActive });

        hipSetModalStatus("อัปโหลดสำเร็จ");
        hipCloseModal();
        await loadHistoryImagePage();
      } catch (err) {
        hipSetModalError(err?.message || String(err));
        hipSetModalStatus("", { isError: false });
      } finally {
        if (hipEls.submitText) hipEls.submitText.textContent = "อัปโหลด";
        if (submitBtn) submitBtn.disabled = false;
        if (hipEls.file) hipEls.file.disabled = false;
      }
    });

    hipEls.tbody?.addEventListener("click", async (e) => {
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;
      const action = btn.getAttribute("data-action");
      const id = btn.getAttribute("data-id");
      if (!action || !id) return;

      if (action === "activate") {
        const ok = confirm("ยืนยันตั้งรูปนี้เป็นรูปที่ใช้งานบนหน้าประวัติ?");
        if (!ok) return;
        try {
          hipSetSectionStatus("กำลังอัปเดต...");
          await window.HistoryImagePageAPI.activate(id);
          hipSetSectionStatus("ตั้งค่าเรียบร้อย");
          await loadHistoryImagePage();
        } catch (err) {
          hipSetSectionStatus(err?.message || String(err), { isError: true });
        }
      }

      if (action === "delete") {
        const path = btn.getAttribute("data-path") || "";
        const okDel = confirm(`ยืนยันลบรูปนี้?\n\n- ID: ${id}\n- ${path}`);
        if (!okDel) return;
        try {
          hipSetSectionStatus("กำลังลบ...");
          await window.HistoryImagePageAPI.remove(id);
          hipSetSectionStatus("ลบเรียบร้อย");
          await loadHistoryImagePage();
        } catch (err) {
          hipSetSectionStatus(err?.message || String(err), { isError: true });
        }
      }
    });
  }


  /* =========================
   DIRECTORS (SITE DIRACTOR)
   - Section: #section-directors
   - Action: #btn-add-diractor
   - Modal: #diractor-modal, #diractor-form
   - Inputs: #diractor-id, #diractor-firstname, #diractor-lastname, #diractor-start, #diractor-end
   - File: #diractor-file
   - Remove: #diractor-remove-photo
   - Preview: #diractor-preview, #diractor-preview-img, #diractor-preview-name, #diractor-clear
   - Toolbar: #diractor-search, #diractor-limit, #diractor-refresh
   - Table: #diractor-tbody
   - Footer: #diractor-pagination, #diractor-total
 ========================= */

  const dirEls = {
    section: $("#section-directors"),
    tbody: $("#diractor-tbody"),

    search: $("#diractor-search"),
    limit: $("#diractor-limit"),
    refreshBtn: $("#diractor-refresh"),
    pagination: $("#diractor-pagination"),
    total: $("#diractor-total"),

    btnAdd: $("#btn-add-diractor"),

    modal: $("#diractor-modal"),
    form: $("#diractor-form"),
    modalTitle: $("#diractor-modal-title"),
    submitText: $("#diractor-submit-text"),
    modalStatus: $("#diractor-modal-status"),
    formError: $("#diractor-form-error"),

    inputId: $("#diractor-id"),
    inputFirstname: $("#diractor-firstname"),
    inputLastname: $("#diractor-lastname"),
    inputStart: $("#diractor-start"),
    inputEnd: $("#diractor-end"),

    file: $("#diractor-file"),
    removePhoto: $("#diractor-remove-photo"),

    previewWrap: $("#diractor-preview"),
    previewImg: $("#diractor-preview-img"),
    previewName: $("#diractor-preview-name"),
    clearBtn: $("#diractor-clear"),
  };

  const dirState = {
    q: "",
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 1,
    inited: false,
    loading: false,
  };

  const DIR_PLACEHOLDER = "/ict8/assets/image/director-none.png";

  function dirToPublicUrl(fp) {
    const p = String(fp || "").trim();
    if (!p) return "";
    if (/^https?:\/\//i.test(p)) return p;
    if (p.startsWith("/uploads/")) return `${API_BASE}${p}`;
    if (p.startsWith("uploads/")) return `${API_BASE}/${p}`;
    if (p.startsWith("/")) return p;
    return `/${p}`;
  }

  function dirSetSectionStatus(msg, { isError = false } = {}) {
    if (!dirEls.total) return;
    dirEls.total.textContent = msg ? String(msg) : "";
    dirEls.total.style.color = isError ? "#b42318" : "";
  }

  function dirSetModalStatus(msg, { isError = false } = {}) {
    if (!dirEls.modalStatus) return;
    dirEls.modalStatus.textContent = msg ? String(msg) : "";
    dirEls.modalStatus.style.color = isError ? "#b42318" : "";
  }

  function dirSetError(msg) {
    if (!dirEls.formError) return;
    if (!msg) {
      dirEls.formError.hidden = true;
      dirEls.formError.textContent = "";
      return;
    }
    dirEls.formError.hidden = false;
    dirEls.formError.textContent = String(msg);
  }

  function dirHidePreview() {
    if (!dirEls.previewWrap) return;
    dirEls.previewWrap.hidden = true;
    if (dirEls.previewImg) dirEls.previewImg.removeAttribute("src");
    if (dirEls.previewName) dirEls.previewName.textContent = "-";
  }

  function dirShowPreviewFromFile(file) {
    if (!dirEls.previewWrap || !dirEls.previewImg || !dirEls.previewName) return;
    const url = URL.createObjectURL(file);
    dirEls.previewImg.src = url;
    dirEls.previewName.textContent = `${file.name} (${Math.round((file.size || 0) / 1024)} KB)`;
    dirEls.previewWrap.hidden = false;
    dirEls.previewImg.onload = () => {
      try {
        URL.revokeObjectURL(url);
      } catch (_) {
        // ignore
      }
    };
  }

  function dirShowPreviewFromPath(path) {
    if (!dirEls.previewWrap || !dirEls.previewImg || !dirEls.previewName) return;
    const url = path ? dirToPublicUrl(path) : DIR_PLACEHOLDER;
    dirEls.previewImg.src = url;
    dirEls.previewName.textContent = path ? String(path) : "(รูปเริ่มต้น)";
    dirEls.previewWrap.hidden = false;
  }

  function dirToBEYear(value) {
    const s = String(value || "").trim();
    if (!s) return null;

    // Support old format YYYY-MM-DD or YYYY/MM/DD
    const m = s.match(/^(\d{4})[-/]/);
    if (m) {
      const y = parseInt(m[1], 10);
      return Number.isFinite(y) ? y + 543 : null;
    }

    const y = parseInt(s, 10);
    if (!Number.isFinite(y)) return null;

    // Heuristic: AD years are < 2400, BE years are >= 2400
    return y < 2400 ? y + 543 : y;
  }

  function dirToADYear(value) {
    const s = String(value || "").trim();
    if (!s) return "";

    const m = s.match(/^(\d{4})[-/]/);
    const y0 = m ? parseInt(m[1], 10) : parseInt(s, 10);
    if (!Number.isFinite(y0)) return "";

    // if BE, convert to AD
    const y = y0 >= 2400 ? y0 - 543 : y0;
    return String(y);
  }

  function dirFormatPeriod(start, end) {
    const sBE = dirToBEYear(start);
    const eBE = dirToBEYear(end);
    if (!sBE) return "-";
    return `พ.ศ.${sBE}-${eBE ? eBE : "ปัจจุบัน"}`;
  }

  function dirResetModal() {
    dirSetError("");
    dirSetModalStatus("");

    if (dirEls.inputId) dirEls.inputId.value = "";
    if (dirEls.inputFirstname) dirEls.inputFirstname.value = "";
    if (dirEls.inputLastname) dirEls.inputLastname.value = "";
    if (dirEls.inputStart) dirEls.inputStart.value = "";
    if (dirEls.inputEnd) dirEls.inputEnd.value = "";
    if (dirEls.removePhoto) dirEls.removePhoto.checked = false;

    try {
      if (dirEls.file) dirEls.file.value = "";
    } catch (_) {
      // ignore
    }

    dirHidePreview();
  }

  function dirOpenModal({ mode = "create", row } = {}) {
    if (!dirEls.modal) return;

    if (mode === "edit" && row) {
      if (dirEls.modalTitle) dirEls.modalTitle.textContent = "แก้ไขรายชื่อผู้อำนวยการ";
      if (dirEls.submitText) dirEls.submitText.textContent = "บันทึกการแก้ไข";
      dirResetModal();

      if (dirEls.inputId) dirEls.inputId.value = String(row.diractor_id ?? row.id ?? "");
      if (dirEls.inputFirstname) dirEls.inputFirstname.value = String(row.firstname ?? "");
      if (dirEls.inputLastname) dirEls.inputLastname.value = String(row.lastname ?? "");
      if (dirEls.inputStart) {
        const be = dirToBEYear(row.start);
        dirEls.inputStart.value = be ? String(be) : "";
      }
      if (dirEls.inputEnd) {
        const be = dirToBEYear(row.end);
        dirEls.inputEnd.value = be ? String(be) : "";
      }

      const photoPath = String(row.photo_path || "").trim();
      if (photoPath) {
        dirShowPreviewFromPath(photoPath);
      } else {
        // show placeholder so admin sees what will be used
        dirShowPreviewFromPath("");
      }
    } else {
      if (dirEls.modalTitle) dirEls.modalTitle.textContent = "เพิ่มรายชื่อผู้อำนวยการ";
      if (dirEls.submitText) dirEls.submitText.textContent = "บันทึก";
      dirResetModal();
      // show placeholder by default
      dirShowPreviewFromPath("");
    }

    openModal("diractor-modal");
    setTimeout(() => dirEls.inputFirstname?.focus?.(), 0);
  }

  function dirCloseModal() {
    closeModal("diractor-modal");
  }

  function dirRenderPagination() {
    if (!dirEls.pagination) return;
    dirState.totalPages = calcTotalPages({
      total: dirState.total,
      limit: dirState.limit,
      totalPages: dirState.totalPages,
    });
    renderPager(dirEls.pagination, {
      page: dirState.page,
      totalPages: dirState.totalPages,
    });
  }

  function dirRenderRows(items = []) {
    if (!dirEls.tbody) return;
    if (!Array.isArray(items) || items.length === 0) {
      dirEls.tbody.innerHTML = `<tr><td colspan="5" class="muted">ไม่พบข้อมูล</td></tr>`;
      return;
    }

    dirEls.tbody.innerHTML = items
      .map((r) => {
        const id = r.diractor_id ?? r.id ?? "";
        const firstname = String(r.firstname ?? "");
        const lastname = String(r.lastname ?? "");
        const full = `${firstname} ${lastname}`.trim();
        const start = String(r.start ?? "");
        const end = String(r.end ?? "");
        const photoPath = String(r.photo_path ?? "").trim();
        const imgUrl = photoPath ? dirToPublicUrl(photoPath) : DIR_PLACEHOLDER;

        return `
          <tr>
            <td>${escapeHtml(id)}</td>
            <td>
              <img src="${escapeHtml(imgUrl)}" alt="director" style="width:56px; height:56px; object-fit:cover; border-radius:12px; border:1px solid #eee; background:#fafafa;" />
            </td>
            <td>
              <div style="font-weight:600;">${escapeHtml(full || "-")}</div>
              <div class="muted" style="margin-top:4px;">${escapeHtml(firstname)} ${escapeHtml(lastname)}</div>
            </td>
            <td>${escapeHtml(dirFormatPeriod(start, end))}</td>
            <td>
              <div class="table-actions" style="display:flex; gap:8px; flex-wrap:wrap;">
                <button class="btn btn-outline btn-sm" type="button" data-action="edit"
                  data-id="${escapeHtml(id)}"
                  data-firstname="${escapeHtml(firstname)}"
                  data-lastname="${escapeHtml(lastname)}"
                  data-start="${escapeHtml(start)}"
                  data-end="${escapeHtml(end)}"
                  data-photo="${escapeHtml(photoPath)}">
                  <i class="fa-solid fa-pen"></i> แก้ไข
                </button>
                <button class="btn btn-danger btn-sm" type="button" data-action="delete"
                  data-id="${escapeHtml(id)}"
                  data-title="${escapeHtml(full || id)}">
                  <i class="fa-solid fa-trash"></i> ลบ
                </button>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");
  }

  async function loadDiractors() {
    if (!dirEls.section) return;
    if (dirState.loading) return;
    dirState.loading = true;

    try {
      dirSetSectionStatus("กำลังโหลด...");
      if (!window.SiteDiractorAPI?.list) throw new Error("SiteDiractorAPI.list not found");

      dirState.q = String(dirEls.search?.value || "").trim();
      dirState.limit = toInt(dirEls.limit?.value, dirState.limit || 50) || 50;

      const res = await window.SiteDiractorAPI.list({
        q: dirState.q,
        page: dirState.page,
        limit: dirState.limit,
      });

      const data = res?.data || {};
      const items = data.items || [];
      const pag = data.pagination || {};

      dirState.total = Number(pag.total ?? items.length ?? 0);
      dirState.totalPages = Number(pag.total_pages ?? dirState.totalPages ?? 1);
      dirState.page = Number(pag.page ?? dirState.page ?? 1);
      dirState.limit = Number(pag.limit ?? dirState.limit ?? 50);

      dirRenderRows(items);
      dirRenderPagination();
      dirSetSectionStatus(`ทั้งหมด ${dirState.total} รายการ`);
    } catch (err) {
      dirSetSectionStatus(err?.message || String(err), { isError: true });
      if (dirEls.tbody) dirEls.tbody.innerHTML = `<tr><td colspan="5" class="muted">โหลดไม่สำเร็จ</td></tr>`;
    } finally {
      dirState.loading = false;
    }
  }

  function initDiractorSection() {
    if (dirState.inited) return;
    dirState.inited = true;

    // default limit
    if (dirEls.limit && !dirEls.limit.value) dirEls.limit.value = String(dirState.limit);

    dirEls.btnAdd?.addEventListener("click", () => {
      dirOpenModal({ mode: "create" });
    });

    dirEls.refreshBtn?.addEventListener("click", () => {
      loadDiractors();
    });

    // search debounce
    let t = null;
    dirEls.search?.addEventListener("input", () => {
      clearTimeout(t);
      t = setTimeout(() => {
        dirState.page = 1;
        loadDiractors();
      }, 300);
    });

    dirEls.limit?.addEventListener("change", () => {
      dirState.page = 1;
      loadDiractors();
    });

    dirEls.pagination?.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-page]");
      if (!btn || btn.disabled) return;
      const next = toInt(btn.getAttribute("data-page"), 0);
      if (!next || next < 1 || next > (dirState.totalPages || 1)) return;
      if (next === dirState.page) return;
      dirState.page = next;
      loadDiractors();
    });

    dirEls.file?.addEventListener("change", () => {
      const f = dirEls.file?.files?.[0];
      if (!f) {
        // if editing and there is existing photo, keep preview; otherwise placeholder
        const currentSrc = String(dirEls.previewImg?.getAttribute("src") || "").trim();
        if (!currentSrc) dirShowPreviewFromPath("");
        return;
      }
      if (!/^image\//i.test(String(f.type || ""))) {
        dirSetError("กรุณาเลือกไฟล์รูปภาพเท่านั้น");
        try {
          dirEls.file.value = "";
        } catch (_) {
          // ignore
        }
        return;
      }

      // selecting a new photo should override remove-photo intent
      if (dirEls.removePhoto) dirEls.removePhoto.checked = false;

      dirSetError("");
      dirSetModalStatus("");
      dirShowPreviewFromFile(f);
    });

    dirEls.clearBtn?.addEventListener("click", () => {
      try {
        if (dirEls.file) dirEls.file.value = "";
      } catch (_) {
        // ignore
      }
      dirSetError("");
      dirSetModalStatus("");
      // fallback to placeholder
      dirShowPreviewFromPath("");
    });

    dirEls.removePhoto?.addEventListener("change", () => {
      if (dirEls.removePhoto.checked) {
        // show placeholder preview
        dirShowPreviewFromPath("");
      }
    });

    dirEls.tbody?.addEventListener("click", async (e) => {
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;
      const action = btn.getAttribute("data-action");
      const id = btn.getAttribute("data-id");
      if (!action || !id) return;

      if (action === "edit") {
        const row = {
          diractor_id: id,
          firstname: btn.getAttribute("data-firstname") || "",
          lastname: btn.getAttribute("data-lastname") || "",
          start: btn.getAttribute("data-start") || "",
          end: btn.getAttribute("data-end") || "",
          photo_path: btn.getAttribute("data-photo") || "",
        };
        dirOpenModal({ mode: "edit", row });
        return;
      }

      if (action === "delete") {
        const title = btn.getAttribute("data-title") || id;
        const okDel = confirm(`ยืนยันลบรายชื่อผู้อำนวยการ\n\n- ${title}`);
        if (!okDel) return;

        try {
          dirSetSectionStatus("กำลังลบ...");
          await window.SiteDiractorAPI.remove(id);
          dirSetSectionStatus("ลบเรียบร้อย");

          // reload current page; if it becomes empty, jump back one page
          const oldPage = dirState.page;
          await loadDiractors();
          if (dirState.total === 0 && oldPage > 1) {
            dirState.page = oldPage - 1;
            await loadDiractors();
          }
        } catch (err) {
          dirSetSectionStatus(err?.message || String(err), { isError: true });
        }
      }
    });

    dirEls.form?.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!window.SiteDiractorAPI) return;

      const idRaw = String(dirEls.inputId?.value || "").trim();
      const firstname = String(dirEls.inputFirstname?.value || "").trim();
      const lastname = String(dirEls.inputLastname?.value || "").trim();
      const startRaw = String(dirEls.inputStart?.value || "").trim();
      const endRaw = String(dirEls.inputEnd?.value || "").trim();
      const start = dirToADYear(startRaw);
      const end = dirToADYear(endRaw);
      const file = dirEls.file?.files?.[0];
      const removePhoto = !!dirEls.removePhoto?.checked;

      if (!firstname || !lastname || !start) {
        dirSetError("กรุณากรอกชื่อ นามสกุล และปีที่เริ่มต้น");
        return;
      }

      if (!/^\d{4}$/.test(start)) {
        dirSetError("ปีที่เริ่มต้นไม่ถูกต้อง");
        return;
      }

      if (end && !/^\d{4}$/.test(end)) {
        dirSetError("ปีที่สิ้นสุดไม่ถูกต้อง");
        return;
      }

      const submitBtn = dirEls.form?.querySelector?.("button[type='submit']");

      try {
        dirSetError("");
        dirSetModalStatus("กำลังบันทึก...");
        if (submitBtn) submitBtn.disabled = true;

        const fd = new FormData();
        fd.append("firstname", firstname);
        fd.append("lastname", lastname);
        fd.append("start", start);
        fd.append("end", end);

        if (idRaw) {
          fd.append("remove_photo", removePhoto ? "1" : "0");
        }
        if (file) fd.append("file", file);

        if (idRaw) {
          await window.SiteDiractorAPI.update(idRaw, fd);
        } else {
          await window.SiteDiractorAPI.create(fd);
        }

        dirSetModalStatus("บันทึกสำเร็จ");
        dirCloseModal();
        await loadDiractors();
      } catch (err) {
        dirSetError(err?.message || String(err));
        dirSetModalStatus("");
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  // ---------- main loader ----------
  async function mainTypeOfDeviceLoad() {
    if (!window.MainTypeOfDeviceAPI) {
      console.warn("[main-type-of-device] Missing MainTypeOfDeviceAPI");
      return;
    }
    if (!mtdEls.section) return;

    try {
      mtdState.loading = true;

      const q = String(mtdEls.search?.value || "").trim();
      mtdState.q = q;
      mtdState.limit = parseInt(mtdEls.limit?.value || "50", 10) || 50;

      const res = await window.MainTypeOfDeviceAPI.list({
        q: mtdState.q,
        page: mtdState.page,
        limit: mtdState.limit,
      });

      // รองรับ response แบบ ok(): { ok:true, data:{ items,total,page,limit } }
      const data = res?.data || res;
      const items = data?.items || [];
      mtdState.total = Number(data?.total || 0);
      mtdState.page = Number(data?.page || mtdState.page);
      mtdState.limit = Number(data?.limit || mtdState.limit);

      mtdRenderRows(items);
      mtdRenderPagination();

      if (mtdEls.total) {
        const total = mtdState.total || 0;
        mtdEls.total.textContent = `ทั้งหมด ${total} รายการ`;
      }
    } catch (e) {
      if (mtdEls.tbody) {
        mtdEls.tbody.innerHTML = `
        <tr><td colspan="3" class="muted">โหลดข้อมูลไม่สำเร็จ: ${mtdEscapeHtml(e?.message || String(e))}</td></tr>
      `;
      }
    } finally {
      mtdState.loading = false;
    }
  }

  // ---------- init ----------
  function initMainTypeOfDeviceSection() {
    // กัน DOM ยังไม่มี section (เผื่อบางหน้าไม่ได้ include)
    if (!mtdEls.section) return;
    if (mtdState.inited) return;
    mtdState.inited = true;

    // default limit
    if (mtdEls.limit && !mtdEls.limit.value) mtdEls.limit.value = String(mtdState.limit);

    // search (debounce)
    let t = null;
    mtdEls.search?.addEventListener("input", () => {
      clearTimeout(t);
      t = setTimeout(() => {
        mtdState.page = 1;
        mainTypeOfDeviceLoad();
      }, 300);
    });

    // limit
    mtdEls.limit?.addEventListener("change", () => {
      mtdState.page = 1;
      mainTypeOfDeviceLoad();
    });

    // refresh
    mtdEls.refresh?.addEventListener("click", () => {
      mainTypeOfDeviceLoad();
    });

    // pagination (delegate)
    mtdEls.pagination?.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-page]");
      if (!btn || btn.disabled) return;
      const next = toInt(btn.getAttribute("data-page"), 0);
      if (!next || next < 1 || next > (mtdState.totalPages || 1)) return;
      if (next === mtdState.page) return;
      mtdState.page = next;
      mainTypeOfDeviceLoad();
    });

    // add button
    mtdEls.btnAdd?.addEventListener("click", () => {
      mtdOpenModal({ mode: "create" });
    });

    // modal close (overlay + close buttons)
    document.querySelectorAll('[data-close="main-type-of-device-modal"]').forEach((el) => {
      el.addEventListener("click", () => mtdCloseModal());
    });

    // submit form (create/update)
    mtdEls.form?.addEventListener("submit", async (e) => {
      e.preventDefault();

      const idRaw = String(mtdEls.inputId?.value || "").trim();
      const title = String(mtdEls.inputTitle?.value || "").trim();

      if (!title) {
        mtdSetError("กรุณากรอกชื่อประเภทหลักของอุปกรณ์");
        mtdEls.inputTitle?.focus();
        return;
      }

      try {
        mtdSetError("");

        if (idRaw) {
          await window.MainTypeOfDeviceAPI.update(idRaw, { title });
        } else {
          await window.MainTypeOfDeviceAPI.create({ title });
        }

        mtdCloseModal();
        mainTypeOfDeviceLoad();
      } catch (err) {
        mtdSetError(err?.message || String(err));
      }
    });

    // ✅ optional: expose loader for section switcher
    window.mainTypeOfDeviceLoad = mainTypeOfDeviceLoad;
    window.initMainTypeOfDeviceSection = initMainTypeOfDeviceSection;
  }


  /* =========================
    TEMPLATE TYPES (POST TEMPLATES)
    - Section: #section-template-types
    - Toolbar: #template-type-search, #template-type-limit, #template-type-refresh
    - Table: #template-type-tbody, #template-type-pagination, #template-type-total
    - Action: #btn-add-template-type
    - Modal: #template-type-modal, #template-type-form
   ========================= */

  const ttEls = {
    section: $("#section-template-types"),
    tbody: $("#template-type-tbody"),
    search: $("#template-type-search"),
    limit: $("#template-type-limit"),
    refresh: $("#template-type-refresh"),
    pagination: $("#template-type-pagination"),
    total: $("#template-type-total"),

    btnAdd: $("#btn-add-template-type"),

    modalId: "template-type-modal",
    modal: $("#template-type-modal"),
    form: $("#template-type-form"),
    modalTitle: $("#template-type-modal-title"),
    submitText: $("#template-type-submit-text"),
    formError: $("#template-type-form-error"),

    inputId: $("#template-type-id"),
    inputName: $("#template-type-name"),
    inputDetail: $("#template-type-detail"),

    fileBg: $("#template-type-bg-file"),
    bgPreview: $("#template-type-bg-preview"),
    bgFilename: $("#template-type-bg-filename"),
    bgDims: $("#template-type-bg-dims"),
    canvasLabel: $("#template-type-canvas-label"),

    // hidden upload meta
    inputBgFilepath: $("#template-type-bg-filepath"),
    inputBgOriginal: $("#template-type-bg-original"),
    inputBgStored: $("#template-type-bg-stored"),
    inputBgSize: $("#template-type-bg-size"),
    inputBgUploadedBy: $("#template-type-bg-uploaded-by"),
    inputBgUploadedAt: $("#template-type-bg-uploaded-at"),
    inputCanvasW: $("#template-type-canvas-width"),
    inputCanvasH: $("#template-type-canvas-height"),
  };

  const ttState = {
    q: "",
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 1,
    loading: false,
    inited: false,
  };

  function ttEscapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function ttSetError(msg) {
    if (!ttEls.formError) return;
    if (!msg) {
      ttEls.formError.hidden = true;
      ttEls.formError.textContent = "";
      return;
    }
    ttEls.formError.hidden = false;
    ttEls.formError.textContent = String(msg);
  }

  function ttToPublicUrl(path) {
    const p0 = String(path || "").trim();
    if (!p0) return "";
    if (/^https?:\/\//i.test(p0)) return p0;

    // รองรับทั้ง uploads/... และ /uploads/...
    if (p0.startsWith("/uploads/")) return `${API_BASE}${p0}`;
    if (p0.startsWith("uploads/")) return `${API_BASE}/${p0}`;
    if (p0.startsWith("./uploads/")) return `${API_BASE}/${p0.replace(/^\.\//, "")}`;

    return p0;
  }

  function ttFormatCanvas(w, h) {
    const cw = Number(w || 0);
    const ch = Number(h || 0);
    if (cw > 0 && ch > 0) return `${cw}×${ch}`;
    return "-";
  }

  function ttSyncPreviewFromHidden() {
    const bgPath = String(ttEls.inputBgFilepath?.value || "").trim();
    const original = String(ttEls.inputBgOriginal?.value || "").trim();
    const stored = String(ttEls.inputBgStored?.value || "").trim();
    const cw = toInt(ttEls.inputCanvasW?.value, 0);
    const ch = toInt(ttEls.inputCanvasH?.value, 0);

    if (ttEls.bgFilename) ttEls.bgFilename.textContent = original || stored || bgPath || "-";
    if (ttEls.bgDims) ttEls.bgDims.textContent = cw > 0 && ch > 0 ? `${cw} x ${ch}` : "-";
    if (ttEls.canvasLabel) ttEls.canvasLabel.textContent = ttFormatCanvas(cw, ch);

    if (ttEls.bgPreview) {
      if (bgPath) {
        ttEls.bgPreview.src = ttToPublicUrl(bgPath);
        ttEls.bgPreview.style.display = "block";
      } else {
        ttEls.bgPreview.removeAttribute("src");
        ttEls.bgPreview.style.display = "none";
      }
    }
  }

  function ttResetForm() {
    ttSetError("");
    if (ttEls.inputId) ttEls.inputId.value = "";
    if (ttEls.inputName) ttEls.inputName.value = "";
    if (ttEls.inputDetail) ttEls.inputDetail.value = "";

    if (ttEls.fileBg) ttEls.fileBg.value = "";

    if (ttEls.inputBgFilepath) ttEls.inputBgFilepath.value = "";
    if (ttEls.inputBgOriginal) ttEls.inputBgOriginal.value = "";
    if (ttEls.inputBgStored) ttEls.inputBgStored.value = "";
    if (ttEls.inputBgSize) ttEls.inputBgSize.value = "";
    if (ttEls.inputBgUploadedBy) ttEls.inputBgUploadedBy.value = "";
    if (ttEls.inputBgUploadedAt) ttEls.inputBgUploadedAt.value = "";
    if (ttEls.inputCanvasW) ttEls.inputCanvasW.value = "";
    if (ttEls.inputCanvasH) ttEls.inputCanvasH.value = "";

    ttSyncPreviewFromHidden();
  }

  function ttApplyRowToForm(row = {}) {
    ttSetError("");

    const id = row.template_type_id ?? row.id ?? "";
    if (ttEls.inputId) ttEls.inputId.value = id ?? "";
    if (ttEls.inputName) ttEls.inputName.value = row.template_name ?? "";
    if (ttEls.inputDetail) ttEls.inputDetail.value = row.detail ?? "";

    if (ttEls.fileBg) ttEls.fileBg.value = "";

    if (ttEls.inputBgFilepath) ttEls.inputBgFilepath.value = row.bg_filepath ?? "";
    if (ttEls.inputBgOriginal) ttEls.inputBgOriginal.value = row.bg_original_filename ?? "";
    if (ttEls.inputBgStored) ttEls.inputBgStored.value = row.bg_stored_filename ?? "";
    if (ttEls.inputBgSize) ttEls.inputBgSize.value = String(row.bg_file_size ?? "");
    if (ttEls.inputBgUploadedBy) ttEls.inputBgUploadedBy.value = String(row.bg_uploaded_by ?? "");
    if (ttEls.inputBgUploadedAt) ttEls.inputBgUploadedAt.value = String(row.bg_uploaded_at ?? "");
    if (ttEls.inputCanvasW) ttEls.inputCanvasW.value = String(row.canvas_width ?? "");
    if (ttEls.inputCanvasH) ttEls.inputCanvasH.value = String(row.canvas_height ?? "");

    ttSyncPreviewFromHidden();
  }

  function ttOpenModal({ mode = "create", row } = {}) {
    if (!ttEls.modalTitle || !ttEls.submitText) return;

    if (mode === "edit") {
      ttEls.modalTitle.textContent = "แก้ไขเทมเพลตโพสต์";
      ttEls.submitText.textContent = "บันทึกการแก้ไข";
      ttApplyRowToForm(row || {});
    } else {
      ttEls.modalTitle.textContent = "เพิ่มเทมเพลตโพสต์";
      ttEls.submitText.textContent = "บันทึก";
      ttResetForm();
    }

    openModal(ttEls.modalId);
    setTimeout(() => ttEls.inputName?.focus(), 0);
  }

  function ttCloseModal() {
    closeModal(ttEls.modalId);
  }

  function ttRenderRows(items = []) {
    if (!ttEls.tbody) return;

    if (!items.length) {
      ttEls.tbody.innerHTML = `<tr><td colspan="5" class="muted">ไม่พบข้อมูล</td></tr>`;
      return;
    }

    ttEls.tbody.innerHTML = items
      .map((r) => {
        const id = r.template_type_id ?? r.id ?? "";
        const bg = String(r.bg_filepath ?? "").trim();
        const bgUrl = bg ? ttToPublicUrl(bg) : "";
        const canvas = ttFormatCanvas(r.canvas_width, r.canvas_height);
        const name = r.template_name ?? "";

        const bgCell = bgUrl
          ? `<img src="${ttEscapeHtml(bgUrl)}" alt="bg" style="width:90px; height:auto; border-radius:8px; border:1px solid #eee; background:#fafafa;" />`
          : `<span class="muted">-</span>`;

        return `
        <tr>
          <td>${ttEscapeHtml(id)}</td>
          <td>${bgCell}</td>
          <td>
            <div style="font-weight:600;">${ttEscapeHtml(name)}</div>
            ${r.detail ? `<div class="muted" style="margin-top:4px;">${ttEscapeHtml(r.detail)}</div>` : ""}
          </td>
          <td>${ttEscapeHtml(canvas)}</td>
          <td>
            <div class="table-actions">
              <button class="btn btn-outline btn-sm" type="button" data-action="edit" data-id="${ttEscapeHtml(id)}">
                <i class="fa-solid fa-pen"></i> แก้ไข
              </button>
              <button class="btn btn-danger btn-sm" type="button" data-action="delete" data-id="${ttEscapeHtml(id)}" data-title="${ttEscapeHtml(name)}">
                <i class="fa-solid fa-trash"></i> ลบ
              </button>
            </div>
          </td>
        </tr>
      `;
      })
      .join("");
  }

  function ttRenderPagination() {
    if (!ttEls.pagination) return;
    ttState.totalPages = calcTotalPages({
      total: ttState.total,
      limit: ttState.limit,
      totalPages: ttState.totalPages,
    });

    renderPager(ttEls.pagination, {
      page: ttState.page,
      totalPages: ttState.totalPages,
    });
  }

  async function loadTemplateTypes() {
    if (ttState.loading) return;
    if (!ttEls.section) return;
    if (!window.TemplateTypesAPI) {
      console.warn("[template-types] Missing TemplateTypesAPI");
      return;
    }

    ttState.loading = true;
    try {
      if (ttEls.tbody) ttEls.tbody.innerHTML = `<tr><td colspan="5" class="muted">กำลังโหลด...</td></tr>`;

      ttState.q = String(ttEls.search?.value || "").trim();
      ttState.limit = parseInt(ttEls.limit?.value || String(ttState.limit), 10) || ttState.limit;

      const res = await window.TemplateTypesAPI.list({
        q: ttState.q,
        page: ttState.page,
        limit: ttState.limit,
      });

      const items = res?.data || [];
      const pg = res?.pagination || {};

      ttState.total = Number(pg?.total ?? items.length ?? 0);
      ttState.page = Number(pg?.page ?? ttState.page);
      ttState.limit = Number(pg?.limit ?? ttState.limit);
      ttState.totalPages = Number(pg?.totalPages ?? pg?.total_pages ?? ttState.totalPages);

      ttRenderRows(items);
      ttRenderPagination();

      if (ttEls.total) ttEls.total.textContent = `ทั้งหมด ${ttState.total} รายการ`;
    } catch (e) {
      if (ttEls.tbody) {
        ttEls.tbody.innerHTML = `<tr><td colspan="5" class="muted">โหลดข้อมูลไม่สำเร็จ: ${ttEscapeHtml(e?.message || String(e))}</td></tr>`;
      }
    } finally {
      ttState.loading = false;
    }
  }

  function initTemplateTypesSection() {
    if (!ttEls.section) return;
    if (ttState.inited) return;
    ttState.inited = true;

    // default limit
    if (ttEls.limit && !ttEls.limit.value) ttEls.limit.value = String(ttState.limit);

    // search debounce
    let t = null;
    ttEls.search?.addEventListener("input", () => {
      clearTimeout(t);
      t = setTimeout(() => {
        ttState.page = 1;
        loadTemplateTypes();
      }, 300);
    });

    // limit
    ttEls.limit?.addEventListener("change", () => {
      ttState.page = 1;
      loadTemplateTypes();
    });

    // refresh
    ttEls.refresh?.addEventListener("click", () => {
      loadTemplateTypes();
    });

    // pagination delegate
    ttEls.pagination?.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-page]");
      if (!btn || btn.disabled) return;
      const next = toInt(btn.getAttribute("data-page"), 0);
      if (!next || next < 1 || next > (ttState.totalPages || 1)) return;
      if (next === ttState.page) return;
      ttState.page = next;
      loadTemplateTypes();
    });

    // table actions delegate
    ttEls.tbody?.addEventListener("click", async (e) => {
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;

      const action = btn.getAttribute("data-action");
      const id = btn.getAttribute("data-id");
      if (!id) return;

      if (action === "edit") {
        try {
          ttSetError("");
          const res = await window.TemplateTypesAPI.getById(id);
          const row = res?.data || {};
          ttOpenModal({ mode: "edit", row });
        } catch (err) {
          alert(err?.message || String(err));
        }
        return;
      }

      if (action === "delete") {
        const title = btn.getAttribute("data-title") || "";
        const ok = confirm(`ยืนยันลบเทมเพลตโพสต์\n\n- ${title || id}`);
        if (!ok) return;

        try {
          await window.TemplateTypesAPI.remove(id);
          loadTemplateTypes();
        } catch (err) {
          alert(err?.message || String(err));
        }
      }
    });

    // add button
    ttEls.btnAdd?.addEventListener("click", () => {
      ttOpenModal({ mode: "create" });
    });

    // bg upload
    ttEls.fileBg?.addEventListener("change", async () => {
      const file = ttEls.fileBg?.files?.[0];
      if (!file) return;
      if (!window.TemplateTypesAPI?.uploadBg) {
        ttSetError("ระบบอัปโหลดพื้นหลังยังไม่พร้อมใช้งาน");
        return;
      }

      try {
        ttSetError("");
        if (ttEls.bgFilename) ttEls.bgFilename.textContent = "กำลังอัปโหลด...";
        if (ttEls.bgDims) ttEls.bgDims.textContent = "-";
        if (ttEls.canvasLabel) ttEls.canvasLabel.textContent = "-";

        const res = await window.TemplateTypesAPI.uploadBg(file);
        const info = res?.data || res || {};

        // API returns: { path, original_filename, stored_filename, file_size, uploaded_by, uploaded_at, canvas_width, canvas_height }
        if (ttEls.inputBgFilepath) ttEls.inputBgFilepath.value = String(info.path || "");
        if (ttEls.inputBgOriginal) ttEls.inputBgOriginal.value = String(info.original_filename || "");
        if (ttEls.inputBgStored) ttEls.inputBgStored.value = String(info.stored_filename || "");
        if (ttEls.inputBgSize) ttEls.inputBgSize.value = String(info.file_size || "");
        if (ttEls.inputBgUploadedBy) ttEls.inputBgUploadedBy.value = String(info.uploaded_by || "");
        if (ttEls.inputBgUploadedAt) ttEls.inputBgUploadedAt.value = String(info.uploaded_at || "");
        if (ttEls.inputCanvasW) ttEls.inputCanvasW.value = String(info.canvas_width || "");
        if (ttEls.inputCanvasH) ttEls.inputCanvasH.value = String(info.canvas_height || "");

        ttSyncPreviewFromHidden();
      } catch (err) {
        ttSetError(err?.message || String(err));
      }
    });

    // submit create/update
    ttEls.form?.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!window.TemplateTypesAPI) return;

      const idRaw = String(ttEls.inputId?.value || "").trim();
      const name = String(ttEls.inputName?.value || "").trim();
      const detail = String(ttEls.inputDetail?.value || "");

      if (!name) {
        ttSetError("กรุณากรอกชื่อเทมเพลต");
        ttEls.inputName?.focus();
        return;
      }

      const payload = {
        template_name: name,
        detail,

        bg_filepath: String(ttEls.inputBgFilepath?.value || "").trim(),
        bg_original_filename: String(ttEls.inputBgOriginal?.value || "").trim(),
        bg_stored_filename: String(ttEls.inputBgStored?.value || "").trim(),
        bg_file_size: toInt(ttEls.inputBgSize?.value, 0),
        bg_uploaded_by: toInt(ttEls.inputBgUploadedBy?.value, 0),
        bg_uploaded_at: String(ttEls.inputBgUploadedAt?.value || "").trim(),
        canvas_width: toInt(ttEls.inputCanvasW?.value, 0),
        canvas_height: toInt(ttEls.inputCanvasH?.value, 0),
      };

      try {
        ttSetError("");
        if (idRaw) {
          await window.TemplateTypesAPI.update(idRaw, payload);
        } else {
          await window.TemplateTypesAPI.create(payload);
        }
        ttCloseModal();
        loadTemplateTypes();
      } catch (err) {
        ttSetError(err?.message || String(err));
      }
    });

    // expose for section switcher
    window.loadTemplateTypes = loadTemplateTypes;
    window.initTemplateTypesSection = initTemplateTypesSection;
  }


  /* =========================
    Organization Types UI
  ========================= */
  const orgTypeEls = {
    section: $("#section-org-types"),
    tbody: $("#org-type-tbody"),
    search: $("#org-type-search"),
    limit: $("#org-type-limit"),
    refresh: $("#org-type-refresh"),
    pagination: $("#org-type-pagination"),
    total: $("#org-type-total"),

    btnAdd: $("#btn-add-org-type"),

    modal: $("#org-type-modal"),
    form: $("#org-type-form"),
    modalTitle: $("#org-type-modal-title"),
    submitText: $("#org-type-submit-text"),
    inputId: $("#org-type-id"),
    inputEN: $("#org-type-name-en"),
    inputTH: $("#org-type-name-th"),
    formError: $("#org-type-form-error"),
  };

  const orgTypeState = {
    page: 1,
    limit: 50,
    q: "",
    total: 0,
    totalPages: 1,
    loading: false,
  };

  function renderOrgTypeRows(items = []) {
    if (!orgTypeEls.tbody) return;

    if (!items.length) {
      orgTypeEls.tbody.innerHTML = `
      <tr><td colspan="4" class="muted">ไม่พบข้อมูล</td></tr>
    `;
      return;
    }

    orgTypeEls.tbody.innerHTML = items.map((row) => {
      const id = row.organization_type_id;
      return `
      <tr data-id="${escapeHtml(id)}">
        <td>${escapeHtml(id)}</td>
        <td>${escapeHtml(row.type_name)}</td>
        <td>${escapeHtml(row.type_name_th)}</td>
        <td>
          <button class="btn btn-ghost btn-sm"
            data-action="edit"
            data-id="${id}"
            data-en="${escapeHtml(row.type_name)}"
            data-th="${escapeHtml(row.type_name_th)}">
            แก้ไข
          </button>
          <button class="btn btn-danger btn-sm"
            data-action="delete"
            data-id="${id}">
            ลบ
          </button>
        </td>
      </tr>
    `;
    }).join("");
  }

  function renderOrgTypePagination() {
    if (!orgTypeEls.pagination) return;

    renderPager(orgTypeEls.pagination, {
      page: orgTypeState.page,
      totalPages: orgTypeState.totalPages,
    });
  }

  function renderOrgTypeTotal() {
    if (!orgTypeEls.total) return;
    orgTypeEls.total.textContent = `ทั้งหมด ${orgTypeState.total} รายการ`;
  }

  async function loadOrgTypes() {
    if (orgTypeState.loading) return;
    orgTypeState.loading = true;

    try {
      orgTypeEls.tbody.innerHTML =
        `<tr><td colspan="4" class="muted">กำลังโหลด...</td></tr>`;

      const qs = new URLSearchParams();
      if (orgTypeState.q) qs.set("q", orgTypeState.q);
      qs.set("page", String(orgTypeState.page));
      qs.set("limit", String(orgTypeState.limit));

      const json = await apiFetch(`/organization-types?${qs.toString()}`, { method: "GET" });
      const { items = [], pagination = {} } = json.data || {};

      orgTypeState.total = pagination.total || items.length;
      orgTypeState.totalPages = pagination.total_pages || 1;

      renderOrgTypeRows(items);
      renderOrgTypePagination();
      renderOrgTypeTotal();
      orgTypeEls.total.textContent = `ทั้งหมด ${orgTypeState.total} รายการ`;
    } catch (err) {
      orgTypeEls.tbody.innerHTML =
        `<tr><td colspan="4" class="muted">${err.message}</td></tr>`;
    } finally {
      orgTypeState.loading = false;
    }
  }

  /* =========================
    Provinces UI
  ========================= */
  const provinceEls = {
    section: $("#section-provinces"),
    tbody: $("#province-tbody"),
    search: $("#province-search"),
    limit: $("#province-limit"),
    refresh: $("#province-refresh"),
    pagination: $("#province-pagination"),
    total: $("#province-total"),

    btnAdd: $("#btn-add-province"),

    modal: $("#province-modal"),
    form: $("#province-form"),
    modalTitle: $("#province-modal-title"),
    submitText: $("#province-submit-text"),
    inputId: $("#province-id"),
    inputEN: $("#province-nameEN"),
    inputTH: $("#province-nameTH"),
    formError: $("#province-form-error"),
  };

  const provinceState = {
    page: 1,
    limit: 50,
    q: "",
    total: 0,
    totalPages: 1,
    loading: false,
  };

  function renderProvinceRows(items = []) {
    if (!provinceEls.tbody) return;

    if (!items.length) {
      provinceEls.tbody.innerHTML = `
        <tr>
          <td colspan="4" class="muted">ไม่พบข้อมูล</td>
        </tr>
      `;
      return;
    }

    provinceEls.tbody.innerHTML = items
      .map((row) => {
        const id = row.province_id;
        return `
          <tr data-id="${escapeHtml(id)}">
            <td>${escapeHtml(id)}</td>
            <td>${escapeHtml(row.nameEN)}</td>
            <td>${escapeHtml(row.nameTH)}</td>
            <td>
              <div class="row-actions">
                <button class="btn btn-ghost btn-sm" type="button" data-action="edit"
                  data-id="${escapeHtml(id)}"
                  data-nameen="${escapeHtml(row.nameEN)}"
                  data-nameth="${escapeHtml(row.nameTH)}">
                  แก้ไข
                </button>
                <button class="btn btn-danger btn-sm" type="button" data-action="delete" data-id="${escapeHtml(id)}">
                  ลบ
                </button>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");
  }

  function renderProvincePagination() {
    if (!provinceEls.pagination) return;
    renderPager(provinceEls.pagination, {
      page: provinceState.page,
      totalPages: provinceState.totalPages,
    });
  }

  function renderProvinceTotal() {
    if (!provinceEls.total) return;
    provinceEls.total.textContent = `ทั้งหมด ${provinceState.total} รายการ`;
  }

  async function loadProvinces() {
    if (provinceState.loading) return;
    provinceState.loading = true;

    try {
      if (provinceEls.tbody) {
        provinceEls.tbody.innerHTML = `
          <tr><td colspan="4" class="muted">กำลังโหลด...</td></tr>
        `;
      }

      const qs = new URLSearchParams();
      if (provinceState.q) qs.set("q", provinceState.q);
      qs.set("page", String(provinceState.page));
      qs.set("limit", String(provinceState.limit));

      const json = await apiFetch(`/provinces?${qs.toString()}`, { method: "GET" });
      const data = json?.data ?? {};

      const items =
        data.items ??
        (Array.isArray(data) ? data : null) ??
        json.items ??
        [];

      const pagination =
        data.pagination ??
        json.pagination ??
        {};

      provinceState.total = Number(pagination.total || items.length || 0);
      provinceState.totalPages = Number(pagination.total_pages || 1);

      renderProvinceRows(items);
      renderProvincePagination();
      renderProvinceTotal();
    } catch (err) {
      console.error(err);
      if (provinceEls.tbody) {
        provinceEls.tbody.innerHTML = `
          <tr><td colspan="4" class="muted">โหลดข้อมูลไม่สำเร็จ: ${escapeHtml(err.message)}</td></tr>
        `;
      }
    } finally {
      provinceState.loading = false;
    }
  }

  /* =========================
  Organizations UI (org-list)
========================= */
  const orgEls = {
    section: $("#section-org-list"),
    tbody: $("#org-tbody"),
    search: $("#org-search"),
    limit: $("#org-limit"),
    refresh: $("#org-refresh"),
    pagination: $("#org-pagination"),
    total: $("#org-total"),

    filterProvince: $("#org-filter-province"),
    filterType: $("#org-filter-type"),

    btnAdd: $("#btn-add-organization"),

    modal: $("#organization-modal"),
    form: $("#organization-form"),
    modalTitle: $("#organization-modal-title"),
    submitText: $("#organization-submit-text"),
    inputId: $("#organization-id"),

    inputCode: $("#org-code"),
    inputName: $("#org-name"),
    inputLocation: $("#org-location"),
    selectProvince: $("#org-province"),
    selectType: $("#org-type"),

    formError: $("#organization-form-error"),
  };

  const orgState = {
    page: 1,
    limit: 50,
    q: "",
    province_id: "",
    organization_type_id: "",
    total: 0,
    totalPages: 1,
    loading: false,
    inited: false,
  };

  /** เติม option ให้ select */
  function setSelectOptions(selectEl, items, { valueKey, labelKey, placeholder = "" } = {}) {
    if (!selectEl) return;

    const opts = [];
    if (placeholder) opts.push(`<option value="">${escapeHtml(placeholder)}</option>`);

    opts.push(
      ...items.map((it) => {
        const v = it[valueKey];
        const label = it[labelKey];
        return `<option value="${escapeHtml(v)}">${escapeHtml(label)}</option>`;
      })
    );

    selectEl.innerHTML = opts.join("");
  }

  /** โหลด dropdown สำหรับ filter + modal (จังหวัด/ประเภทหน่วยงาน) */
  async function loadOrgRefs() {
    // provinces
    try {
      const pj = await apiFetch(`/provinces?page=1&limit=200`, { method: "GET" });
      const pItems = pj?.data?.items || [];

      // filter จังหวัด
      setSelectOptions(orgEls.filterProvince, pItems, {
        valueKey: "province_id",
        labelKey: "nameTH",
        placeholder: "ทุกจังหวัด",
      });

      // select ใน modal
      setSelectOptions(orgEls.selectProvince, pItems, {
        valueKey: "province_id",
        labelKey: "nameTH",
        placeholder: "เลือกจังหวัด",
      });
    } catch (e) {
      // ไม่ต้อง throw ให้หน้าใช้ได้ต่อ
      console.warn("load provinces for org failed:", e);
    }

    // organization types
    try {
      const tj = await apiFetch(`/organization-types?page=1&limit=200`, { method: "GET" });
      const tItems = tj?.data?.items || [];

      // filter ประเภท
      setSelectOptions(orgEls.filterType, tItems, {
        valueKey: "organization_type_id",
        labelKey: "type_name_th",
        placeholder: "ทุกประเภท",
      });

      // select ใน modal
      setSelectOptions(orgEls.selectType, tItems, {
        valueKey: "organization_type_id",
        labelKey: "type_name_th",
        placeholder: "เลือกประเภทหน่วยงาน",
      });
    } catch (e) {
      console.warn("load org types for org failed:", e);
    }
  }

  /** render rows */
  function renderOrgRows(items = []) {
  if (!orgEls.tbody) return;

  if (!items.length) {
    orgEls.tbody.innerHTML = `<tr><td colspan="7" class="muted">ไม่พบข้อมูล</td></tr>`;
    return;
  }

  orgEls.tbody.innerHTML = items
    .map((row) => {
      const id = row.organization_id;

      const provinceName = row.province_name_th || "";
      const typeName = row.organization_type_name_th || row.organization_type_name || "";

      // ✅ เอาไว้ส่งเข้า modal detail/edit-contact
      const payloadAttrs = `
        data-id="${escapeHtml(id)}"
        data-code="${escapeHtml(row.code)}"
        data-name="${escapeHtml(row.name)}"
        data-location="${escapeHtml(row.location)}"
        data-province_name="${escapeHtml(provinceName)}"
        data-type_name="${escapeHtml(typeName)}"
        data-province_id="${escapeHtml(row.province_id)}"
        data-organization_type_id="${escapeHtml(row.organization_type_id)}"
      `;

      return `
        <tr data-id="${escapeHtml(id)}">
          <td>${escapeHtml(id)}</td>
          <td>${escapeHtml(row.code)}</td>
          <td>${escapeHtml(row.name)}</td>
          <td>${escapeHtml(provinceName)}</td>
          <td>${escapeHtml(typeName)}</td>
          <td>${escapeHtml(row.location)}</td>
          <td>
            <div class="row-actions">
              <!-- ✅ ใหม่: ดูรายละเอียด (เปิด Organization Detail Modal) -->
              <button class="btn btn-outline btn-sm" type="button"
                data-action="detail"
                ${payloadAttrs}>
                รายละเอียด
              </button>

              <!-- เดิม: แก้ไขข้อมูล organization -->
              <button class="btn btn-ghost btn-sm" type="button"
                data-action="edit"
                data-id="${escapeHtml(id)}"
                data-code="${escapeHtml(row.code)}"
                data-name="${escapeHtml(row.name)}"
                data-location="${escapeHtml(row.location)}"
                data-province_id="${escapeHtml(row.province_id)}"
                data-organization_type_id="${escapeHtml(row.organization_type_id)}">
                แก้ไข
              </button>

              <!-- เดิม: ลบ -->
              <button class="btn btn-danger btn-sm" type="button"
                data-action="delete"
                data-id="${escapeHtml(id)}">
                ลบ
              </button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}


  function renderOrgPagination() {
    if (!orgEls.pagination) return;

    renderPager(orgEls.pagination, {
      page: orgState.page,
      totalPages: orgState.totalPages,
    });
  }

  function renderOrgTotal() {
    if (!orgEls.total) return;
    orgEls.total.textContent = `ทั้งหมด ${orgState.total} รายการ`;
  }

  async function loadOrganizations() {
    if (orgState.loading) return;
    orgState.loading = true;

    try {
      if (orgEls.tbody) {
        orgEls.tbody.innerHTML = `<tr><td colspan="7" class="muted">กำลังโหลด...</td></tr>`;
      }

      const qs = new URLSearchParams();
      if (orgState.q) qs.set("q", orgState.q);
      if (orgState.province_id) qs.set("province_id", orgState.province_id);
      if (orgState.organization_type_id) qs.set("organization_type_id", orgState.organization_type_id);
      qs.set("page", String(orgState.page));
      qs.set("limit", String(orgState.limit));

      const json = await apiFetch(`/organizations?${qs.toString()}`, { method: "GET" });
      const data = json.data || {};
      const items = data.items || [];
      const pagination = data.pagination || {};

      orgState.total = Number(pagination.total || items.length || 0);
      orgState.totalPages = Number(pagination.total_pages || 1);

      renderOrgRows(items);
      renderOrgPagination();
      renderOrgTotal();
    } catch (err) {
      console.error(err);
      if (orgEls.tbody) {
        orgEls.tbody.innerHTML = `<tr><td colspan="7" class="muted">โหลดข้อมูลไม่สำเร็จ: ${escapeHtml(err.message)}</td></tr>`;
      }
    } finally {
      orgState.loading = false;
    }
  }


  /* =========================
     Person Prefixes UI
  ========================= */
  const personPrefixEls = {
    section: $("#section-person-prefixes"),
    tbody: $("#person-prefix-tbody"),
    search: $("#person-prefix-search"),
    limit: $("#person-prefix-limit"),
    refresh: $("#person-prefix-refresh"),
    pagination: $("#person-prefix-pagination"),
    total: $("#person-prefix-total"),

    btnAdd: $("#btn-add-person-prefix"),

    modal: $("#person-prefix-modal"),
    form: $("#person-prefix-form"),
    modalTitle: $("#person-prefix-modal-title"),
    submitText: $("#person-prefix-submit-text"),
    inputId: $("#person-prefix-id"),
    inputEN: $("#person-prefix-name-en"),
    inputTH: $("#person-prefix-name-th"),
    formError: $("#person-prefix-form-error"),
  };

  const personPrefixState = {
    page: 1,
    limit: 50,
    q: "",
    total: 0,
    totalPages: 1,
    loading: false,
  };

  function renderPersonPrefixRows(items = []) {
    if (!personPrefixEls.tbody) return;

    if (!items.length) {
      personPrefixEls.tbody.innerHTML = `
      <tr><td colspan="4" class="muted">ไม่พบข้อมูล</td></tr>
    `;
      return;
    }

    personPrefixEls.tbody.innerHTML = items.map((row) => {
      const id = row.person_prefix_id;
      return `
      <tr data-id="${escapeHtml(id)}">
        <td>${escapeHtml(id)}</td>
        <td>${escapeHtml(row.prefix_en)}</td>
        <td>${escapeHtml(row.prefix_th)}</td>
        <td>
          <button class="btn btn-ghost btn-sm"
            data-action="edit"
            data-id="${id}"
            data-en="${escapeHtml(row.prefix_en)}"
            data-th="${escapeHtml(row.prefix_th)}">
            แก้ไข
          </button>
          <button class="btn btn-danger btn-sm"
            data-action="delete"
            data-id="${id}">
            ลบ
          </button>
        </td>
      </tr>
    `;
    }).join("");
  }

  function renderPersonPrefixPagination() {
    if (!personPrefixEls.pagination) return;

    renderPager(personPrefixEls.pagination, {
      page: personPrefixState.page,
      totalPages: personPrefixState.totalPages,
    });
  }

  function renderPersonPrefixTotal() {
    if (!personPrefixEls.total) return;
    personPrefixEls.total.textContent = `ทั้งหมด ${personPrefixState.total} รายการ`;
  }

  async function loadPersonPrefixes() {
    if (personPrefixState.loading) return;
    personPrefixState.loading = true;

    try {
      personPrefixEls.tbody.innerHTML =
        `<tr><td colspan="4" class="muted">กำลังโหลด...</td></tr>`;

      const qs = new URLSearchParams();
      if (personPrefixState.q) qs.set("q", personPrefixState.q);
      qs.set("page", String(personPrefixState.page));
      qs.set("limit", String(personPrefixState.limit));

      const json = await apiFetch(`/person-prefixes?${qs.toString()}`, { method: "GET" });
      const { items = [], pagination = {} } = json.data || {};

      personPrefixState.total = pagination.total || items.length;
      personPrefixState.totalPages = pagination.total_pages || 1;

      renderPersonPrefixRows(items);
      renderPersonPrefixPagination();
      renderPersonPrefixTotal();
      personPrefixEls.total.textContent = `ทั้งหมด ${personPrefixState.total} รายการ`;
    } catch (err) {
      personPrefixEls.tbody.innerHTML =
        `<tr><td colspan="4" class="muted">${err.message}</td></tr>`;
    } finally {
      personPrefixState.loading = false;
    }
  }

  /* =========================
    departments UI
  ========================= */
  const departmentEls = {
    section: $("#section-departments"),
    tbody: $("#department-tbody"),
    search: $("#department-search"),
    limit: $("#department-limit"),
    refresh: $("#department-refresh"),
    pagination: $("#department-pagination"),
    total: $("#department-total"),

    filterOrg: $("#department-filter-organization"),

    btnAdd: $("#btn-add-department"),

    modal: $("#department-modal"),
    form: $("#department-form"),
    modalTitle: $("#department-modal-title"),
    submitText: $("#department-submit-text"),

    inputId: $("#department-id"),
    inputCode: $("#department-code"),
    inputTitle: $("#department-title"),
    selectOrg: $("#department-organization"),

    formError: $("#department-form-error"),
  };


  const departmentState = {
    page: 1,
    limit: 50,
    q: "",
    organization_id: "",
    total: 0,
    totalPages: 1,
    loading: false,
    refsLoaded: false,
  };

  function renderDepartmentRows(items = []) {
    if (!departmentEls.tbody) return;

    if (!items.length) {
      departmentEls.tbody.innerHTML = `
      <tr><td colspan="5" class="muted">ไม่พบข้อมูล</td></tr>
    `;
      return;
    }

    const startNo =
      ((departmentState.page || 1) - 1) * (departmentState.limit || 50);

    departmentEls.tbody.innerHTML = items.map((row, idx) => {
      const id = row.department_id;

      // ถ้า backend ยังไม่ส่งชื่อองค์กรมา ก็แสดงแค่ id ไปก่อน
      const orgText = row.organization_name || row.organization_title || row.organization_id || "";
      const no = startNo + idx + 1;


      return `
      <tr data-id="${escapeHtml(id)}">
        <td>${escapeHtml(no)}</td>
        <td>${escapeHtml(row.department_code ?? "")}</td>
        <td>${escapeHtml(row.department_title ?? "")}</td>
        <td>${escapeHtml(orgText)}</td>
        <td>
          <button class="btn btn-ghost btn-sm"
            data-action="edit"
            data-id="${escapeHtml(id)}"
            data-code="${escapeHtml(row.department_code ?? "")}"
            data-title="${escapeHtml(row.department_title ?? "")}"
            data-org="${escapeHtml(row.organization_id ?? "")}">
            แก้ไข
          </button>
          <button class="btn btn-danger btn-sm"
            data-action="delete"
            data-id="${escapeHtml(id)}">
            ลบ
          </button>
        </td>
      </tr>
    `;
    }).join("");
  }


  function renderDepartmentPagination() {
    if (!departmentEls.pagination) return;

    renderPager(departmentEls.pagination, {
      page: departmentState.page,
      totalPages: departmentState.totalPages,
    });
  }

  function renderDepartmentTotal() {
    if (!departmentEls.total) return;
    departmentEls.total.textContent = `ทั้งหมด ${departmentState.total} รายการ`;
  }

  async function loadDepartments() {
    if (departmentState.loading) return;
    departmentState.loading = true;

    try {
      departmentEls.tbody.innerHTML =
        `<tr><td colspan="5" class="muted">กำลังโหลด...</td></tr>`;

      const qs = new URLSearchParams();
      if (departmentState.q) qs.set("q", departmentState.q);
      if (departmentState.organization_id) qs.set("organization_id", departmentState.organization_id);
      qs.set("page", String(departmentState.page));
      qs.set("limit", String(departmentState.limit));

      const json = await apiFetch(`/departments?${qs.toString()}`, { method: "GET" });
      const { items = [], pagination = {} } = json.data || {};

      departmentState.total = pagination.total || items.length;
      departmentState.totalPages = pagination.total_pages || 1;

      renderDepartmentRows(items);
      renderDepartmentPagination();
      renderDepartmentTotal();
    } catch (err) {
      departmentEls.tbody.innerHTML =
        `<tr><td colspan="5" class="muted">${escapeHtml(err.message)}</td></tr>`;
    } finally {
      departmentState.loading = false;
    }
  }


  async function loadDepartmentOrgRefs() {
    if (departmentState.refsLoaded) return;
    departmentState.refsLoaded = true;

    // ดึงหน่วยงานมาเป็น dropdown
    try {
      const json = await apiFetch(`/organizations?page=1&limit=500`, { method: "GET" });
      const data = json.data || {};
      const items = data.items || [];

      // dropdown filter (ด้านบนตาราง)
      if (departmentEls.filterOrg) {
        const opts = [
          `<option value="">ทุกหน่วยงาน</option>`,
          ...items.map((o) => `<option value="${escapeHtml(o.organization_id)}">${escapeHtml(o.name)}</option>`)
        ];
        departmentEls.filterOrg.innerHTML = opts.join("");
      }

      // dropdown ใน modal
      if (departmentEls.selectOrg) {
        const opts = [
          `<option value="">เลือกหน่วยงาน</option>`,
          ...items.map((o) => `<option value="${escapeHtml(o.organization_id)}">${escapeHtml(o.name)}</option>`)
        ];
        departmentEls.selectOrg.innerHTML = opts.join("");
      }
    } catch (e) {
      console.warn("load organizations for departments failed:", e);
    }
  }

  async function loadDepartmentOrgOptions() {
    if (!departmentEls.selectOrg) return;

    // ใส่ placeholder ระหว่างโหลด
    departmentEls.selectOrg.innerHTML = `<option value="">กำลังโหลด...</option>`;

    try {
      const json = await apiFetch(`/organizations?page=1&limit=500`, { method: "GET" });
      const items = json?.data?.items || [];

      const opts = [
        `<option value="">เลือกหน่วยงาน</option>`,
        ...items.map((o) =>
          `<option value="${escapeHtml(o.organization_id)}">${escapeHtml(o.name)} (${escapeHtml(o.code)})</option>`
        ),
      ];

      departmentEls.selectOrg.innerHTML = opts.join("");
    } catch (err) {
      departmentEls.selectOrg.innerHTML = `<option value="">โหลดหน่วยงานไม่สำเร็จ</option>`;
      console.error("loadDepartmentOrgOptions failed:", err);
    }
  }

  /* =========================
  Position Titles UI
========================= */
  const positionTitleEls = {
    section: $("#section-position-titles"),
    tbody: $("#position-title-tbody"),
    search: $("#position-title-search"),
    limit: $("#position-title-limit"),
    refresh: $("#position-title-refresh"),
    pagination: $("#position-title-pagination"),
    total: $("#position-title-total"),

    filterDepartment: $("#position-title-filter-department"),
    filterOrganization: $("#position-title-filter-organization"),

    btnAdd: $("#btn-add-position-title"),

    modal: $("#position-title-modal"),
    form: $("#position-title-form"),
    modalTitle: $("#position-title-modal-title"),
    submitText: $("#position-title-submit-text"),
    inputId: $("#position-title-id"),
    inputCode: $("#position-title-code"),
    inputTitle: $("#position-title-name"),

    selectOrg: $("#position-title-organization"),
    selectDept: $("#position-title-department"),

    formError: $("#position-title-form-error"),
  };

  const positionTitleState = {
    page: 1,
    limit: 50,
    q: "",
    organization_id: "",
    department_id: "",
    total: 0,
    totalPages: 1,
    loading: false,
    refsLoaded: false,
  };

  function renderPositionTitleRows(items = []) {
    if (!positionTitleEls.tbody) return;

    if (!items.length) {
      positionTitleEls.tbody.innerHTML = `
      <tr><td colspan="6" class="muted">ไม่พบข้อมูล</td></tr>
    `;
      return;
    }

    positionTitleEls.tbody.innerHTML = items
      .map((row) => {
        const id = row.position_title_id;

        const deptName =
          row.department_title ||
          row.department_name ||
          row.department_code ||
          row.department_id ||
          "";

        const orgName =
          row.organization_name ||
          row.organization_title ||
          row.organization_code ||
          row.organization_id ||
          "";

        return `
        <tr data-id="${escapeHtml(id)}">
          <td>${escapeHtml(id)}</td>
          <td>${escapeHtml(row.position_code ?? "")}</td>
          <td>${escapeHtml(row.position_title ?? "")}</td>
          <td>${escapeHtml(deptName)}</td>
          <td>${escapeHtml(orgName)}</td>
          <td>
            <button class="btn btn-ghost btn-sm"
              data-action="edit"
              data-id="${escapeHtml(id)}"
              data-code="${escapeHtml(row.position_code ?? "")}"
              data-title="${escapeHtml(row.position_title ?? "")}"
              data-department_id="${escapeHtml(row.department_id ?? "")}"
              data-organization_id="${escapeHtml(row.organization_id ?? "")}">
              แก้ไข
            </button>
            <button class="btn btn-danger btn-sm"
              data-action="delete"
              data-id="${escapeHtml(id)}">
              ลบ
            </button>
          </td>
        </tr>
      `;
      })
      .join("");
  }

  function renderPositionTitlePagination() {
    if (!positionTitleEls.pagination) return;

    renderPager(positionTitleEls.pagination, {
      page: positionTitleState.page,
      totalPages: positionTitleState.totalPages,
    });
  }

  function renderPositionTitleTotal() {
    if (!positionTitleEls.total) return;
    positionTitleEls.total.textContent = `ทั้งหมด ${positionTitleState.total} รายการ`;
  }

  async function loadPositionTitles() {
    if (positionTitleState.loading) return;
    positionTitleState.loading = true;

    try {
      if (positionTitleEls.tbody) {
        positionTitleEls.tbody.innerHTML = `
        <tr><td colspan="6" class="muted">กำลังโหลด...</td></tr>
      `;
      }

      const json = await window.PositionTitlesAPI.list({
        q: positionTitleState.q,
        page: positionTitleState.page,
        limit: positionTitleState.limit,
        organization_id: positionTitleState.organization_id,
        department_id: positionTitleState.department_id,
      });

      const data = json.data || {};
      const items = data.items || [];
      const pagination = data.pagination || {};

      positionTitleState.total = Number(pagination.total || items.length || 0);
      positionTitleState.totalPages = Number(pagination.total_pages || 1);

      renderPositionTitleRows(items);
      renderPositionTitlePagination();
      renderPositionTitleTotal();
    } catch (err) {
      console.error(err);
      if (positionTitleEls.tbody) {
        positionTitleEls.tbody.innerHTML = `
        <tr><td colspan="6" class="muted">โหลดข้อมูลไม่สำเร็จ: ${escapeHtml(err.message)}</td></tr>
      `;
      }
    } finally {
      positionTitleState.loading = false;
    }
  }

  /**
   * โหลด dropdown refs:
   * - organization list -> filter + modal org
   * - department list -> filter + modal dept (ตาม org ถ้าเลือก)
   */
  async function loadPositionTitleRefs() {
    if (positionTitleState.refsLoaded) return;
    positionTitleState.refsLoaded = true;

    // organizations
    try {
      const orgJson = await apiFetch(`/organizations?page=1&limit=500`, { method: "GET" });
      const orgItems = orgJson?.data?.items || [];

      if (positionTitleEls.filterOrganization) {
        const opts = [
          `<option value="">ทุกหน่วยงาน</option>`,
          ...orgItems.map(
            (o) => `<option value="${escapeHtml(o.organization_id)}">${escapeHtml(o.name)} (${escapeHtml(o.code)})</option>`
          ),
        ];
        positionTitleEls.filterOrganization.innerHTML = opts.join("");
      }

      if (positionTitleEls.selectOrg) {
        const opts = [
          `<option value="">เลือกหน่วยงาน</option>`,
          ...orgItems.map(
            (o) => `<option value="${escapeHtml(o.organization_id)}">${escapeHtml(o.name)} (${escapeHtml(o.code)})</option>`
          ),
        ];
        positionTitleEls.selectOrg.innerHTML = opts.join("");
      }
    } catch (e) {
      console.warn("load organizations for position titles failed:", e);
    }

    // departments (initial = all)
    await loadPositionTitleDepartmentsByOrg("", { target: "both" });
  }

  /** โหลด departments ตาม org (ถ้า org ว่าง = เอาทั้งหมด) */
  async function loadPositionTitleDepartmentsByOrg(orgId = "", { target = "both" } = {}) {
    const targets = [];
    if (target === "filter" || target === "both") targets.push(positionTitleEls.filterDepartment);
    if (target === "modal" || target === "both") targets.push(positionTitleEls.selectDept);

    const targetEls = targets.filter(Boolean);

    targetEls.forEach((el) => {
      const isFilter = el === positionTitleEls.filterDepartment;
      el.innerHTML = isFilter
        ? `<option value="">ทุกฝ่าย</option>`
        : `<option value="">เลือกฝ่าย</option>`;
    });

    // ถ้า orgId ว่าง และ target เป็น modal -> ไม่ต้องโหลดอะไร (ให้คงแค่ "เลือกฝ่าย")
    if (!orgId && target === "modal") return;


    try {
      const qs = new URLSearchParams();
      qs.set("page", "1");
      qs.set("limit", "500");
      if (orgId) qs.set("organization_id", String(orgId));

      const depJson = await apiFetch(`/departments?${qs.toString()}`, { method: "GET" });
      const depItems = depJson?.data?.items || [];

      if (positionTitleEls.filterDepartment && (target === "filter" || target === "both")) {
        const opts = [
          `<option value="">ทุกฝ่าย</option>`,
          ...depItems.map(
            (d) => `<option value="${escapeHtml(d.department_id)}">${escapeHtml(d.department_title)} (${escapeHtml(d.department_code)})</option>`
          ),
        ];
        positionTitleEls.filterDepartment.innerHTML = opts.join("");
      }

      if (positionTitleEls.selectDept && (target === "modal" || target === "both")) {
        const opts = [
          `<option value="">เลือกฝ่าย</option>`,
          ...depItems.map(
            (d) => `<option value="${escapeHtml(d.department_id)}">${escapeHtml(d.department_title)} (${escapeHtml(d.department_code)})</option>`
          ),
        ];
        positionTitleEls.selectDept.innerHTML = opts.join("");
      }

    } catch (e) {
      console.warn("load departments for position titles failed:", e);
      targetEls.forEach((el) => {
        el.innerHTML = `<option value="">โหลดฝ่ายไม่สำเร็จ</option>`;
      });
    }
  }

  /* =========================
   User Roles UI
========================= */
  const userRoleEls = {
    section: $("#section-user-roles"),
    tbody: $("#user-role-tbody"),
    search: $("#user-role-search"),
    limit: $("#user-role-limit"),
    refresh: $("#user-role-refresh"),
    pagination: $("#user-role-pagination"),
    total: $("#user-role-total"),

    btnAdd: $("#btn-add-user-role"),

    modal: $("#user-role-modal"),
    form: $("#user-role-form"),
    modalTitle: $("#user-role-modal-title"),
    submitText: $("#user-role-submit-text"),
    inputId: $("#user-role-id"),
    inputCode: $("#user-role-code"),
    inputRole: $("#user-role-name"),
    formError: $("#user-role-form-error"),
  };

  const userRoleState = {
    page: 1,
    limit: 50,
    q: "",
    total: 0,
    totalPages: 1,
    loading: false,
  };

  function renderUserRoleRows(items = []) {
    if (!userRoleEls.tbody) return;

    if (!items.length) {
      userRoleEls.tbody.innerHTML = `<tr><td colspan="4" class="muted">ไม่พบข้อมูล</td></tr>`;
      return;
    }

    userRoleEls.tbody.innerHTML = items.map((row) => {
      const id = row.user_role_id;
      return `
      <tr data-id="${escapeHtml(id)}">
        <td>${escapeHtml(id)}</td>
        <td>${escapeHtml(row.code ?? "")}</td>
        <td>${escapeHtml(row.role ?? "")}</td>
        <td>
          <button class="btn btn-ghost btn-sm"
            data-action="edit"
            data-id="${escapeHtml(id)}"
            data-code="${escapeHtml(row.code ?? "")}"
            data-role="${escapeHtml(row.role ?? "")}">
            แก้ไข
          </button>
          <button class="btn btn-danger btn-sm"
            data-action="delete"
            data-id="${escapeHtml(id)}">
            ลบ
          </button>
        </td>
      </tr>
    `;
    }).join("");
  }

  function renderUserRolePagination() {
    if (!userRoleEls.pagination) return;

    renderPager(userRoleEls.pagination, {
      page: userRoleState.page,
      totalPages: userRoleState.totalPages,
    });
  }

  function renderUserRoleTotal() {
    if (!userRoleEls.total) return;
    userRoleEls.total.textContent = `ทั้งหมด ${userRoleState.total} รายการ`;
  }

  async function loadUserRoles() {
    if (userRoleState.loading) return;
    userRoleState.loading = true;

    try {
      if (!userRoleEls.tbody) return;

      userRoleEls.tbody.innerHTML = `<tr><td colspan="4" class="muted">กำลังโหลด...</td></tr>`;

      const api = window.userRolesApi || window.UserRolesAPI;
      if (!api?.list) throw new Error("UserRolesAPI.list not found (check include user-roles.api.js)");

      const res = await api.list({
        q: userRoleState.q,
        page: userRoleState.page,
        limit: userRoleState.limit,
      });

      const items = Array.isArray(res?.items) ? res.items : [];
      const pg = res?.pagination ?? {};

      userRoleState.total = Number(pg.total ?? items.length ?? 0);
      userRoleState.totalPages = calcTotalPages({
        total: userRoleState.total,
        limit: userRoleState.limit,
        totalPages: pg.total_pages ?? pg.totalPages ?? 0,
      });
      userRoleState.page = clampInt(Number(pg.page ?? userRoleState.page), 1, userRoleState.totalPages);

      renderUserRoleRows(items);
      renderUserRolePagination();
      renderUserRoleTotal();
    } catch (err) {
      console.error("[user-roles] load failed:", err);
      if (userRoleEls.tbody) {
        userRoleEls.tbody.innerHTML = `<tr><td colspan="4" class="muted">โหลดข้อมูลไม่สำเร็จ</td></tr>`;
      }
      userRoleState.total = 0;
      userRoleState.totalPages = 1;
      renderUserRolePagination();
      renderUserRoleTotal();
    } finally {
      userRoleState.loading = false;
    }
  }

  /* =========================
   User Approvals (Setting User)
========================= */
  const settingUserEls = {
    section: $("#section-setting-user"),
    tbody: $("#setting-user-tbody"),
    search: $("#setting-user-search"),
    limit: $("#setting-user-limit"),
    refresh: $("#setting-user-refresh"),
    pagination: $("#setting-user-pagination"),
    total: $("#setting-user-total"),
  };

  const settingUserState = {
    page: 1,
    limit: 50,
    q: "",
    total: 0,
    totalPages: 1,
    loading: false,
  };

  function renderSettingUserRows(items = []) {
    if (!settingUserEls.tbody) return;

    if (!items.length) {
      settingUserEls.tbody.innerHTML = `
      <tr>
        <td colspan="9" class="muted">ไม่มีผู้ใช้งานรออนุมัติ</td>
      </tr>`;
      return;
    }

    settingUserEls.tbody.innerHTML = items.map((u) => `
    <tr>
      <td>${escapeHtml(u.user_id)}</td>
      <td>${escapeHtml(u.line_user_id ?? "")}</td>
      <td>${escapeHtml(u.line_user_name ?? "")}</td>
      <td>${escapeHtml(u.display_name ?? "")}</td>
      <td>${escapeHtml(u.organization_name ?? "-")}</td>
      <td>${escapeHtml(u.department_title ?? "-")}</td>
      <td>${escapeHtml(u.position_title ?? "-")}</td>
      <td>${escapeHtml(u.role ?? "")}</td>
      <td>
        <button class="btn btn-primary btn-sm"
          data-action="approve"
          data-user-id="${u.user_id}"
          data-role-id="${u.user_role_id}">
          อนุมัติ
        </button>
      </td>
    </tr>
  `).join("");
  }

  function renderSettingUserPagination() {
    if (!settingUserEls.pagination) return;
    renderPager(settingUserEls.pagination, {
      page: settingUserState.page,
      totalPages: settingUserState.totalPages,
    });
  }

  function renderSettingUserTotal() {
    if (!settingUserEls.total) return;
    settingUserEls.total.textContent = `ทั้งหมด ${settingUserState.total} รายการ`;
  }

  async function loadPendingUsers() {
    if (settingUserState.loading) return;
    settingUserState.loading = true;

    try {
      settingUserEls.tbody.innerHTML =
        `<tr><td colspan="9" class="muted">กำลังโหลด...</td></tr>`;

      if (!window.UserApprovalsAPI?.getPendingApprovals) {
        throw new Error("UserApprovalsAPI.getPendingApprovals not found (check include user-approvals.api.js)");
      }

      const res = await window.UserApprovalsAPI.getPendingApprovals({
        q: settingUserState.q,
        page: settingUserState.page,
        limit: settingUserState.limit,
      });

      const data = res?.data ?? res ?? {};
      const items = Array.isArray(data.items) ? data.items : [];

      settingUserState.total = Number(data.total ?? items.length ?? 0);
      settingUserState.totalPages = calcTotalPages({
        total: settingUserState.total,
        limit: settingUserState.limit,
        totalPages: data.total_pages ?? data.totalPages ?? 0,
      });
      settingUserState.page = clampInt(Number(data.page ?? settingUserState.page), 1, settingUserState.totalPages);

      renderSettingUserRows(items);
      renderSettingUserPagination();
      renderSettingUserTotal();
    } catch (err) {
      settingUserEls.tbody.innerHTML =
        `<tr><td colspan="9" class="muted">${escapeHtml(err.message)}</td></tr>`;
      settingUserState.total = 0;
      settingUserState.totalPages = 1;
      renderSettingUserPagination();
      renderSettingUserTotal();
    } finally {
      settingUserState.loading = false;
    }
  }

  /* =========================
  Users UI
========================= */
  const usersEls = {
    section: $("#section-users"),
    tbody: $("#user-tbody"),
    search: $("#user-search"),
    limit: $("#user-limit"),
    refresh: $("#user-refresh"),
    pagination: $("#user-pagination"),
    total: $("#user-total"),

    filterOrg: $("#user-filter-organization"),
    filterDept: $("#user-filter-department"),
    filterPos: $("#user-filter-position-title"),

  };

  const usersState = {
    page: 1,
    limit: 50,
    q: "",
    organization_id: "",
    department_id: "",
    position_title_id: "",
    total: 0,
    totalPages: 1,
    loading: false,
    refsLoaded: false,
  };


  function getUsersApi() {
    return window.UsersAPI || window.usersApi; // รองรับ 2 ชื่อ
  }

  function renderUsersRows(items = []) {
    if (!items.length) {
      usersEls.tbody.innerHTML = `<tr><td colspan="7" class="muted">ไม่พบข้อมูล</td></tr>`;
      return;
    }

    usersEls.tbody.innerHTML = items.map((u) => {
      const id = u.person_id ?? "-";
      const fullName = [u.first_name_th, u.last_name_th].filter(Boolean).join(" ") || (u.display_name || "-");
      const orgName = u.organization_name || "-";
      const posName = u.position_title || "-";
      const roleName = u.role_name || "-";
      const statusText = Number(u.is_active) === 1 ? "ใช้งาน" : "รออนุมัติ/ปิดใช้งาน";

      return `
      <tr>
        <td>${escapeHtml(id)}</td>
        <td>${escapeHtml(fullName)}</td>
        <td>${escapeHtml(orgName)}</td>
        <td>${escapeHtml(posName)}</td>
        <td>${escapeHtml(roleName)}</td>
        <td>${escapeHtml(statusText)}</td>
        <td>
          <button class="btn btn-ghost btn-sm" data-action="detail" data-id="${escapeHtml(id)}">รายละเอียด</button>
          <button class="btn btn-ghost btn-sm" data-action="edit" data-id="${escapeHtml(id)}">แก้ไข</button>
          <button class="btn btn-danger btn-sm" data-action="delete" data-id="${escapeHtml(id)}">ลบ</button>
        </td>
      </tr>
    `;
    }).join("");
  }

  function renderUsersPagination() {
    if (!usersEls.pagination) return;

    renderPager(usersEls.pagination, {
      page: usersState.page,
      totalPages: usersState.totalPages,
    });
  }

  function renderUsersTotal() {
    if (!usersEls.total) return;
    usersEls.total.textContent = `ทั้งหมด ${usersState.total} รายการ`;
  }

  /**
   * โหลด refs สำหรับ filter cascading:
   * - orgs -> filterOrg
   * - depts -> filterDept (ตาม org)
   * - positions -> filterPos (ตาม org+dept)
   */
  async function loadUsersRefs() {
    if (usersState.refsLoaded) return;
    usersState.refsLoaded = true;

    // organizations
    try {
      const orgJson = await apiFetch(`/organizations?page=1&limit=500`, { method: "GET" });
      const orgItems = orgJson?.data?.items || [];

      if (usersEls.filterOrg) {
        usersEls.filterOrg.innerHTML = [
          `<option value="">ทุกหน่วยงาน</option>`,
          ...orgItems.map(o =>
            `<option value="${escapeHtml(o.organization_id)}">${escapeHtml(o.name)} (${escapeHtml(o.code)})</option>`
          ),
        ].join("");
      }
    } catch (e) {
      console.warn("load orgs for users failed:", e);
    }

    // init empty dept/pos
    if (usersEls.filterDept) usersEls.filterDept.innerHTML = `<option value="">ทุกฝ่าย</option>`;
    if (usersEls.filterPos) usersEls.filterPos.innerHTML = `<option value="">ทุกตำแหน่ง</option>`;
  }

  async function loadUsersDepartmentsByOrg(orgId = "") {
    if (!usersEls.filterDept) return;

    usersEls.filterDept.innerHTML = `<option value="">ทุกฝ่าย</option>`;

    // org ว่าง -> ไม่ต้องโหลด dept (คงไว้เป็นทุกฝ่าย)
    if (!orgId) return;

    try {
      const qs = new URLSearchParams({ page: "1", limit: "500", organization_id: String(orgId) });
      const depJson = await apiFetch(`/departments?${qs.toString()}`, { method: "GET" });
      const depItems = depJson?.data?.items || [];

      usersEls.filterDept.innerHTML = [
        `<option value="">ทุกฝ่าย</option>`,
        ...depItems.map(d =>
          `<option value="${escapeHtml(d.department_id)}">${escapeHtml(d.department_title)} (${escapeHtml(d.department_code)})</option>`
        ),
      ].join("");
    } catch (e) {
      console.warn("load departments for users failed:", e);
      usersEls.filterDept.innerHTML = `<option value="">โหลดฝ่ายไม่สำเร็จ</option>`;
    }
  }

  async function loadUsersPositions({ orgId = "", deptId = "" } = {}) {
    if (!usersEls.filterPos) return;

    usersEls.filterPos.innerHTML = `<option value="">ทุกตำแหน่ง</option>`;

    // ถ้าไม่เลือก org -> ไม่โหลด (ถือว่า all)
    if (!orgId) return;

    try {
      const qs = new URLSearchParams({ page: "1", limit: "500", organization_id: String(orgId) });
      if (deptId) qs.set("department_id", String(deptId));

      const posJson = await apiFetch(`/position-titles?${qs.toString()}`, { method: "GET" });
      const posItems = posJson?.data?.items || [];

      usersEls.filterPos.innerHTML = [
        `<option value="">ทุกตำแหน่ง</option>`,
        ...posItems.map(p =>
          `<option value="${escapeHtml(p.position_title_id)}">${escapeHtml(p.position_title)} (${escapeHtml(p.position_code)})</option>`
        ),
      ].join("");
    } catch (e) {
      console.warn("load position titles for users failed:", e);
      usersEls.filterPos.innerHTML = `<option value="">โหลดตำแหน่งไม่สำเร็จ</option>`;
    }
  }

  /** load list จาก listUsers() */
  async function loadUsers() {
    if (usersState.loading) return;
    usersState.loading = true;

    try {
      usersEls.tbody.innerHTML = `<tr><td colspan="7" class="muted">กำลังโหลด...</td></tr>`;

      const res = await window.UsersAPI.listUsers({
        q: usersState.q,
        page: usersState.page,
        limit: usersState.limit,
        organization_id: usersState.organization_id,
        department_id: usersState.department_id,
        position_title_id: usersState.position_title_id,
      });

      // ✅ รูปแบบจริงของคุณ: { items, page, limit, total, total_pages }
      const items = Array.isArray(res?.items) ? res.items : [];
      usersState.total = Number(res?.total || 0);
      usersState.totalPages = Number(res?.total_pages || 1);

      renderUsersRows(items);
      renderUsersPagination();
      renderUsersTotal();
    } catch (err) {
      console.error("[users] load failed:", err);
      usersEls.tbody.innerHTML = `<tr><td colspan="7" class="muted">โหลดข้อมูลไม่สำเร็จ</td></tr>`;
    } finally {
      usersState.loading = false;
    }
  }


  /* =========================
    Modal (open/close)
  ========================= */

  const usersDetailEls = {
    modal: document.getElementById("user-detail-modal"),

    // person table fields
    person_id: document.getElementById("ud-person-id"),
    person_user_id: document.getElementById("ud-person-user-id"),
    person_prefix_id: document.getElementById("ud-person-prefix-id"),

    first_name_th: document.getElementById("ud-first-name-th"),
    first_name_en: document.getElementById("ud-first-name-en"),
    last_name_th: document.getElementById("ud-last-name-th"),
    last_name_en: document.getElementById("ud-last-name-en"),

    display_name: document.getElementById("ud-display-name"),

    organization_id: document.getElementById("ud-organization-id"),
    department_id: document.getElementById("ud-department-id"),
    position_title_id: document.getElementById("ud-position-title-id"),

    photo_path: document.getElementById("ud-photo-path"),
    is_active: document.getElementById("ud-is-active"),

    start_date: document.getElementById("ud-start-date"),
    end_date: document.getElementById("ud-end-date"),
    create_at: document.getElementById("ud-create-at"),
    update_at: document.getElementById("ud-update-at"),
    user_role: document.getElementById("ud-user-role"),

    btnEdit: document.getElementById("user-detail-edit"),
  };

  let usersDetailCurrentId = null;

  function openUserDetailModal(row) {
    if (!usersDetailEls.modal) return;

    usersDetailCurrentId = row?.person_id ?? null;

    const set = (el, val) => { if (el) el.textContent = (val ?? val === 0) ? String(val) : "-"; };

    set(usersDetailEls.person_id, row?.person_id);
    set(usersDetailEls.person_user_id, row?.person_user_id);
    set(usersDetailEls.person_prefix_id, row?.prefix_name ?? row?.person_prefix_id);

    set(usersDetailEls.first_name_th, row?.first_name_th);
    set(usersDetailEls.first_name_en, row?.first_name_en);
    set(usersDetailEls.last_name_th, row?.last_name_th);
    set(usersDetailEls.last_name_en, row?.last_name_en);

    set(usersDetailEls.display_name, row?.display_name);

    set(usersDetailEls.organization_id, row?.organization_name ?? row?.organization_id);
    set(usersDetailEls.department_id, row?.department_name ?? row?.department_id);
    set(usersDetailEls.position_title_id, row?.position_title_name ?? row?.position_title_id);

    set(usersDetailEls.photo_path, row?.photo_path);
    // แสดง is_active ให้เป็นอ่านง่าย
    set(usersDetailEls.is_active, Number(row?.is_active) === 1 ? "ใช้งาน (1)" : "ไม่ใช้งาน/รออนุมัติ (0)");

    set(usersDetailEls.start_date, row?.start_date);
    set(usersDetailEls.end_date, row?.end_date);
    set(usersDetailEls.create_at, row?.create_at);

    set(usersDetailEls.user_role, row?.user_role_name ?? row?.role ?? "-");

    show(usersDetailEls.modal);
    document.body.style.overflow = "hidden";
  }

  function closeUserDetailModal() {
    if (!usersDetailEls.modal) return;
    hide(usersDetailEls.modal);
    document.body.style.overflow = "";
    usersDetailCurrentId = null;
  }

  /* =========================
   User Edit Modal (Full fields)
========================= */

  const userEditEls = {
    modal: document.getElementById("user-edit-modal"),
    form: document.getElementById("user-edit-form"),
    formError: document.getElementById("user-edit-form-error"),

    // hidden ids
    userId: document.getElementById("ue-user-id"),
    personId: document.getElementById("ue-person-id"),

    // fields
    prefix: document.getElementById("ue-person-prefix-id"),
    displayName: document.getElementById("ue-display-name"),

    firstTh: document.getElementById("ue-first-name-th"),
    lastTh: document.getElementById("ue-last-name-th"),
    firstEn: document.getElementById("ue-first-name-en"),
    lastEn: document.getElementById("ue-last-name-en"),

    org: document.getElementById("ue-organization-id"),
    dept: document.getElementById("ue-department-id"),
    pos: document.getElementById("ue-position-title-id"),

    isActive: document.getElementById("ue-is-active"),
    startDate: document.getElementById("ue-start-date"),
    endDate: document.getElementById("ue-end-date"),

    role: document.getElementById("ue-user-role-id"),

    // photo (optional)
    photoFile: document.getElementById("ue-photo-file"),
    photoPath: document.getElementById("ue-photo-path"),
    photoPreviewWrap: document.getElementById("ue-photo-preview"),
    photoPreviewImg: document.getElementById("ue-photo-preview-img"),
    photoPreviewName: document.getElementById("ue-photo-preview-name"),
    photoClear: document.getElementById("ue-photo-clear"),

    btnSave: document.getElementById("user-edit-save"),
  };

  function isUserEditReady() {
    return !!(userEditEls.modal && userEditEls.form);
  }

  function showEditError(msg) {
    if (!userEditEls.formError) return;
    userEditEls.formError.textContent = msg || "";
    if (msg) show(userEditEls.formError);
    else hide(userEditEls.formError);
  }

  function resetUserEditForm() {
    if (!isUserEditReady()) return;

    showEditError("");
    userEditEls.form.reset();

    if (userEditEls.userId) userEditEls.userId.value = "";
    if (userEditEls.personId) userEditEls.personId.value = "";

    if (userEditEls.dept) {
      userEditEls.dept.innerHTML = `<option value="">- เลือกฝ่าย -</option>`;
      userEditEls.dept.disabled = true;
    }
    if (userEditEls.pos) {
      userEditEls.pos.innerHTML = `<option value="">- เลือกตำแหน่ง -</option>`;
      userEditEls.pos.disabled = true;
    }

    if (userEditEls.photoFile) userEditEls.photoFile.value = "";
    if (userEditEls.photoPath) userEditEls.photoPath.textContent = "-";
    if (userEditEls.photoPreviewWrap) hide(userEditEls.photoPreviewWrap);
    if (userEditEls.photoPreviewImg) userEditEls.photoPreviewImg.src = "";
    if (userEditEls.photoPreviewName) userEditEls.photoPreviewName.textContent = "-";
    if (userEditEls.photoClear) userEditEls.photoClear.dataset.clear = "0";

  }

  function openUserEditModal() {
    if (!userEditEls.modal) return;
    show(userEditEls.modal);
    document.body.style.overflow = "hidden";
  }

  function closeUserEditModal() {
    if (!userEditEls.modal) return;
    hide(userEditEls.modal);
    document.body.style.overflow = "";
  }

  /** helper: set option list */
  function setOptions(selectEl, items, { valueKey, labelKey, placeholder }) {
    if (!selectEl) return;
    const ph = placeholder || "- เลือก -";
    const arr = Array.isArray(items) ? items : [];
    selectEl.innerHTML =
      `<option value="">${escapeHtml(ph)}</option>` +
      arr
        .map((it) => {
          const v = it?.[valueKey];
          const t = it?.[labelKey];
          return `<option value="${escapeHtml(v)}">${escapeHtml(t ?? "")}</option>`;
        })
        .join("");
  }

  function toDateValue(v) {
    if (!v) return "";
    const s = String(v).slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : "";
  }

  /** load dropdown refs for edit modal */
  async function loadUserEditRefs({
    selectedPrefixId = "",
    selectedOrgId = "",
    selectedDeptId = "",
    selectedPosId = "",
    selectedRoleId = "",
  } = {}) {
    // prefix list (endpoint ของคุณคือ /person-prefixes)
    try {
      const pj = await apiFetch(`/person-prefixes?page=1&limit=500`, { method: "GET" });
      const items = pj?.data?.items || [];
      setOptions(userEditEls.prefix, items, {
        valueKey: "person_prefix_id",
        labelKey: "prefix_th",
        placeholder: "- เลือกคำนำหน้า -",
      });
      if (selectedPrefixId) userEditEls.prefix.value = String(selectedPrefixId);
    } catch (e) {
      console.warn("load prefix refs failed:", e);
    }

    // organizations list
    try {
      const oj = await apiFetch(`/organizations?page=1&limit=500`, { method: "GET" });
      const items = oj?.data?.items || [];
      setOptions(userEditEls.org, items, {
        valueKey: "organization_id",
        labelKey: "name",
        placeholder: "- เลือกหน่วยงาน -",
      });
      if (selectedOrgId) userEditEls.org.value = String(selectedOrgId);
    } catch (e) {
      console.warn("load org refs failed:", e);
    }

    // user roles list (คุณมี api อยู่แล้ว)
    try {
      const api = window.userRolesApi || window.UserRolesAPI;
      const rj = await api.list({ q: "", page: 1, limit: 500 });
      const items = rj?.items || rj?.data?.items || [];
      setOptions(userEditEls.role, items, {
        valueKey: "user_role_id",
        labelKey: "role",
        placeholder: "- เลือกสิทธิ์ผู้ใช้งาน -",
      });
      if (selectedRoleId) userEditEls.role.value = String(selectedRoleId);
    } catch (e) {
      console.warn("load role refs failed:", e);
    }

    // cascading: departments -> positions
    await reloadUserEditDepartments(selectedOrgId, selectedDeptId);
    await reloadUserEditPositions({ orgId: selectedOrgId, deptId: selectedDeptId, selectedPosId });
  }

  async function reloadUserEditDepartments(orgId, selectedDeptId = "") {
    if (!userEditEls.dept) return;

    userEditEls.dept.disabled = true;
    userEditEls.dept.innerHTML = `<option value="">- เลือกฝ่าย -</option>`;

    if (!orgId) return;

    try {
      const qs = new URLSearchParams({ page: "1", limit: "500", organization_id: String(orgId) });
      const dj = await apiFetch(`/departments?${qs.toString()}`, { method: "GET" });
      const items = dj?.data?.items || [];

      setOptions(userEditEls.dept, items, {
        valueKey: "department_id",
        labelKey: "department_title",
        placeholder: "- เลือกฝ่าย -",
      });

      userEditEls.dept.disabled = false;
      if (selectedDeptId) userEditEls.dept.value = String(selectedDeptId);
    } catch (e) {
      console.warn("reload departments failed:", e);
      userEditEls.dept.innerHTML = `<option value="">โหลดฝ่ายไม่สำเร็จ</option>`;
    }
  }

  async function reloadUserEditPositions({ orgId = "", deptId = "", selectedPosId = "" } = {}) {
    if (!userEditEls.pos) return;

    userEditEls.pos.disabled = true;
    userEditEls.pos.innerHTML = `<option value="">- เลือกตำแหน่ง -</option>`;

    if (!orgId) return;

    try {
      const qs = new URLSearchParams({ page: "1", limit: "500", organization_id: String(orgId) });
      if (deptId) qs.set("department_id", String(deptId));

      const pj = await apiFetch(`/position-titles?${qs.toString()}`, { method: "GET" });
      const items = pj?.data?.items || [];

      setOptions(userEditEls.pos, items, {
        valueKey: "position_title_id",
        labelKey: "position_title",
        placeholder: "- เลือกตำแหน่ง -",
      });

      userEditEls.pos.disabled = false;
      if (selectedPosId) userEditEls.pos.value = String(selectedPosId);
    } catch (e) {
      console.warn("reload positions failed:", e);
      userEditEls.pos.innerHTML = `<option value="">โหลดตำแหน่งไม่สำเร็จ</option>`;
    }
  }

  /** open edit modal and fill data */
  async function openUserEditByPersonId(personId) {
    if (!isUserEditReady()) return;

    resetUserEditForm();
    openUserEditModal();

    try {
      const api = getUsersApi();
      if (!api?.getUser) throw new Error("UsersAPI.getUser not found");

      const res = await api.getUser(Number(personId));
      const row = res?.data ?? res;

      // map fields (อิงจาก row ที่คุณใช้ใน detail modal)
      const userId = row?.person_user_id ?? row?.user_id ?? "";
      const prefixId = row?.person_prefix_id ?? "";
      const orgId = row?.organization_id ?? "";
      const deptId = row?.department_id ?? "";
      const posId = row?.position_title_id ?? "";
      const roleId = row?.user_role_id ?? "";

      if (userEditEls.userId) userEditEls.userId.value = String(userId);
      if (userEditEls.personId) userEditEls.personId.value = String(row?.person_id ?? personId);

      if (userEditEls.displayName) userEditEls.displayName.value = row?.display_name ?? "";

      if (userEditEls.firstTh) userEditEls.firstTh.value = row?.first_name_th ?? "";
      if (userEditEls.lastTh) userEditEls.lastTh.value = row?.last_name_th ?? "";
      if (userEditEls.firstEn) userEditEls.firstEn.value = row?.first_name_en ?? "";
      if (userEditEls.lastEn) userEditEls.lastEn.value = row?.last_name_en ?? "";

      if (userEditEls.isActive) userEditEls.isActive.value = String(Number(row?.is_active ?? 0));
      if (userEditEls.startDate) userEditEls.startDate.value = toDateValue(row?.start_date);
      if (userEditEls.endDate) userEditEls.endDate.value = toDateValue(row?.end_date);

      if (userEditEls.photoPath) userEditEls.photoPath.textContent = row?.photo_path || "-";

      await loadUserEditRefs({
        selectedPrefixId: prefixId,
        selectedOrgId: orgId,
        selectedDeptId: deptId,
        selectedPosId: posId,
        selectedRoleId: roleId,
      });
    } catch (err) {
      console.error(err);
      showEditError(err?.message || "โหลดข้อมูลแก้ไขไม่สำเร็จ");
    }
  }

  /** submit edit */
  async function submitUserEditForm(e) {
    e.preventDefault();
    showEditError("");

    const api = getUsersApi();
    if (!api) return showEditError("UsersAPI not found");

    const payload = {
      // user
      user_id: userEditEls.userId?.value ? Number(userEditEls.userId.value) : null,
      user_role_id: userEditEls.role?.value ? Number(userEditEls.role.value) : null,
      display_name: userEditEls.displayName?.value?.trim() || "",

      // person
      person_id: userEditEls.personId?.value ? Number(userEditEls.personId.value) : null,
      person_prefix_id: userEditEls.prefix?.value ? Number(userEditEls.prefix.value) : null,
      first_name_th: userEditEls.firstTh?.value?.trim() || "",
      last_name_th: userEditEls.lastTh?.value?.trim() || "",
      first_name_en: userEditEls.firstEn?.value?.trim() || "",
      last_name_en: userEditEls.lastEn?.value?.trim() || "",

      organization_id: userEditEls.org?.value ? Number(userEditEls.org.value) : null,
      department_id: userEditEls.dept?.value ? Number(userEditEls.dept.value) : null,
      position_title_id: userEditEls.pos?.value ? Number(userEditEls.pos.value) : null,

      is_active: userEditEls.isActive?.value ? Number(userEditEls.isActive.value) : 0,
      start_date: userEditEls.startDate?.value || null,
      end_date: userEditEls.endDate?.value || null,
    };

    try {
      if (userEditEls.btnSave) {
        userEditEls.btnSave.disabled = true;
        userEditEls.btnSave.textContent = "กำลังบันทึก...";
      }

      const personId = payload.person_id;
      if (!personId) throw new Error("ไม่พบ person_id");

      // ✅ ตัดสินใจว่าจะส่งแบบ multipart หรือ json
      const hasFile = !!userEditEls.photoFile?.files?.[0];
      const wantClear = userEditEls.photoClear?.dataset?.clear === "1";

      if (hasFile || wantClear) {
        if (!api.updateUserFormData) {
          throw new Error("UsersAPI.updateUserFormData not found (ต้องเพิ่มใน users.api.js)");
        }
        const fd = buildUserEditFormData(payload);
        await api.updateUserFormData(personId, fd);
      } else {
        if (!api.updateUser) {
          throw new Error("UsersAPI.updateUser not found");
        }
        await api.updateUser(personId, payload);
      }

      closeUserEditModal();
      await loadUsers();

      if (usersDetailEls?.modal && !usersDetailEls.modal.hidden && usersDetailCurrentId === personId) {
        const res = await api.getUser(personId);
        const row = res?.data ?? res;
        openUserDetailModal(row);
      }
    } catch (err) {
      console.error(err);
      showEditError(err?.message || "บันทึกไม่สำเร็จ");
    } finally {
      if (userEditEls.btnSave) {
        userEditEls.btnSave.disabled = false;
        userEditEls.btnSave.textContent = "บันทึก";
      }
    }
  }


  /** bind interactions */
  function bindUserEditModalEvents() {
    if (!isUserEditReady()) return;

    // close by overlay / button data-close
    document.addEventListener("click", (e) => {
      const closeId = e.target?.getAttribute?.("data-close");
      if (closeId === "user-edit-modal") closeUserEditModal();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && userEditEls.modal && !userEditEls.modal.hidden) {
        closeUserEditModal();
      }
    });

    // cascading org -> dept/pos
    userEditEls.org?.addEventListener("change", async () => {
      const orgId = userEditEls.org.value || "";

      // reset dept/pos
      if (userEditEls.dept) userEditEls.dept.value = "";
      if (userEditEls.pos) userEditEls.pos.value = "";

      await reloadUserEditDepartments(orgId, "");
      await reloadUserEditPositions({ orgId, deptId: "", selectedPosId: "" });
    });

    userEditEls.dept?.addEventListener("change", async () => {
      const orgId = userEditEls.org?.value || "";
      const deptId = userEditEls.dept?.value || "";
      if (userEditEls.pos) userEditEls.pos.value = "";
      await reloadUserEditPositions({ orgId, deptId, selectedPosId: "" });
    });

    // photo preview (optional)
    userEditEls.photoFile?.addEventListener("change", () => {
      const f = userEditEls.photoFile.files?.[0];
      if (!f) {
        if (userEditEls.photoPreviewWrap) hide(userEditEls.photoPreviewWrap);
        return;
      }

      // ✅ เลือกไฟล์ใหม่ = ไม่ล้างรูปแล้ว
      if (userEditEls.photoClear) userEditEls.photoClear.dataset.clear = "0";

      const url = URL.createObjectURL(f);
      if (userEditEls.photoPreviewImg) userEditEls.photoPreviewImg.src = url;
      if (userEditEls.photoPreviewName) userEditEls.photoPreviewName.textContent = f.name;
      if (userEditEls.photoPreviewWrap) show(userEditEls.photoPreviewWrap);
    });


    userEditEls.photoClear?.addEventListener("click", () => {
      if (userEditEls.photoFile) userEditEls.photoFile.value = "";
      if (userEditEls.photoPreviewImg) userEditEls.photoPreviewImg.src = "";
      if (userEditEls.photoPreviewName) userEditEls.photoPreviewName.textContent = "-";
      if (userEditEls.photoPreviewWrap) hide(userEditEls.photoPreviewWrap);

      // ✅ ตั้ง flag ว่าต้องการล้างรูปจริงตอนกดบันทึก
      userEditEls.photoClear.dataset.clear = "1";
    });


    // submit
    userEditEls.form.addEventListener("submit", submitUserEditForm);
  }

  // init bind (safe)
  bindUserEditModalEvents();

  function buildUserEditFormData(payload) {
    const fd = new FormData();

    // ส่งทุก field ที่เป็น primitive
    Object.entries(payload).forEach(([k, v]) => {
      if (v === undefined) return;
      if (v === null) {
        fd.append(k, ""); // ให้ backend ตีความว่า null/empty ได้
        return;
      }
      fd.append(k, String(v));
    });

    // แนบไฟล์รูป (ถ้ามีเลือก)
    const file = userEditEls.photoFile?.files?.[0];
    if (file) {
      fd.append("photo_file", file); // ✅ ชื่อ field ไฟล์ (ให้ backend รับ $_FILES['photo_file'])
    }

    // กรณีกด “ล้างรูป” แล้วต้องการให้ backend ลบรูปเดิม
    // (เราจะ set flag ตอนกดล้างรูป)
    if (userEditEls.photoClear?.dataset?.clear === "1") {
      fd.append("photo_clear", "1");
    }

    return fd;
  }

  /* =========================
  Request Types UI
========================= */
  const requestTypeEls = {
    section: $("#section-request-types"),
    tbody: $("#request-type-tbody"),
    search: $("#request-type-search"),
    limit: $("#request-type-limit"),
    refresh: $("#request-type-refresh"),
    pagination: $("#request-type-pagination"),
    total: $("#request-type-total"),

    btnAdd: $("#btn-add-request-type"),

    modal: $("#request-type-modal"),
    form: $("#request-type-form"),
    modalTitle: $("#request-type-modal-title"),
    submitText: $("#request-type-submit-text"),

    inputId: $("#request-type-id"),
    inputName: $("#request-type-name"),
    inputDesc: $("#request-type-desc"),
    inputUrl: $("#request-type-url"),

    formError: $("#request-type-form-error"),
  };

  const requestTypeState = {
    page: 1,
    limit: 50,
    q: "",
    total: 0,
    totalPages: 1,
    loading: false,
  };

  function renderRequestTypeRows(items = []) {
    if (!requestTypeEls.tbody) return;

    if (!items.length) {
      requestTypeEls.tbody.innerHTML = `<tr><td colspan="5" class="muted">ไม่พบข้อมูล</td></tr>`;
      return;
    }

    requestTypeEls.tbody.innerHTML = items.map((row) => {
      const id = row.request_type_id ?? row.id ?? "";
      const name = row.type_name ?? row.name ?? "";
      const desc = row.discription ?? row.description ?? "";
      const url = row.url_link ?? row.url ?? "";

      return `
      <tr data-id="${escapeHtml(id)}">
        <td>${escapeHtml(id)}</td>
        <td>${escapeHtml(name)}</td>
        <td class="muted">${escapeHtml(desc)}</td>
        <td>${url ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener">${escapeHtml(url)}</a>` : "-"}</td>
        <td>
          <button class="btn btn-ghost btn-sm"
            data-action="edit"
            data-id="${escapeHtml(id)}"
            data-name="${escapeHtml(name)}"
            data-desc="${escapeHtml(desc)}"
            data-url="${escapeHtml(url)}">แก้ไข</button>
          <button class="btn btn-danger btn-sm"
            data-action="delete"
            data-id="${escapeHtml(id)}">ลบ</button>
        </td>
      </tr>
    `;
    }).join("");
  }

  function renderRequestTypePagination() {
    if (!requestTypeEls.pagination) return;

    renderPager(requestTypeEls.pagination, {
      page: requestTypeState.page,
      totalPages: requestTypeState.totalPages,
    });
  }

  function renderRequestTypeTotal() {
    if (!requestTypeEls.total) return;
    requestTypeEls.total.textContent = `ทั้งหมด ${requestTypeState.total} รายการ`;
  }

  async function loadRequestTypes() {
    if (requestTypeState.loading) return;
    requestTypeState.loading = true;

    try {
      requestTypeEls.tbody.innerHTML = `<tr><td colspan="5" class="muted">กำลังโหลด...</td></tr>`;

      if (!window.RequestTypesAPI?.list) {
        throw new Error("RequestTypesAPI.list not found (check include request-types.api.js)");
      }

      const res = await window.RequestTypesAPI.list({
        q: requestTypeState.q,
        page: requestTypeState.page,
        limit: requestTypeState.limit,
      });

      // รองรับได้หลายรูปแบบ
      const data = res?.data ?? res ?? {};
      const items =
        data.items ??
        res.items ??
        [];

      const pagination =
        data.pagination ??
        res.pagination ??
        {
          total: data.total ?? res.total ?? items.length,
          total_pages: data.total_pages ?? res.total_pages ?? 1,
        };

      requestTypeState.total = Number(pagination.total || items.length || 0);
      requestTypeState.totalPages = Number(pagination.total_pages || 1);

      renderRequestTypeRows(items);
      renderRequestTypePagination();
      renderRequestTypeTotal();
    } catch (err) {
      requestTypeEls.tbody.innerHTML = `<tr><td colspan="5" class="muted">${escapeHtml(err.message)}</td></tr>`;
    } finally {
      requestTypeState.loading = false;
    }
  }

  /* =========================
  Request Sub Types UI
========================= */
  const requestSubTypeEls = {
    section: $("#section-request-sub-types"),
    tbody: $("#request-sub-type-tbody"),
    search: $("#request-sub-type-search"),
    limit: $("#request-sub-type-limit"),
    refresh: $("#request-sub-type-refresh"),
    pagination: $("#request-sub-type-pagination"),
    total: $("#request-sub-type-total"),

    btnAdd: $("#btn-add-request-sub-type"),

    modal: $("#request-sub-type-modal"),
    form: $("#request-sub-type-form"),
    modalTitle: $("#request-sub-type-modal-title"),
    submitText: $("#request-sub-type-submit-text"),

    inputId: $("#request-sub-type-id"),
    inputName: $("#request-sub-type-name"),
    selectType: $("#request-sub-type-of"),
    inputDesc: $("#request-sub-type-desc"),
    filterType: $("#request-sub-type-filter-type"),

    formError: $("#request-sub-type-form-error"),
  };

  const requestSubTypeState = {
    page: 1,
    limit: 50,
    q: "",
    subtype_of: 0,
    total: 0,
    totalPages: 1,
    loading: false,
    refsLoaded: false,
  };

  function renderRequestSubTypeRows(items = []) {
    if (!requestSubTypeEls.tbody) return;

    if (!items.length) {
      requestSubTypeEls.tbody.innerHTML = `<tr><td colspan="5" class="muted">ไม่พบข้อมูล</td></tr>`;
      return;
    }

    requestSubTypeEls.tbody.innerHTML = items.map((row) => {
      const id = row.request_sub_type_id ?? row.id ?? "";
      const name = row.name ?? row.sub_type_name ?? "";
      const desc = row.discription ?? row.description ?? ""; // ✅ ยึด discription
      const parentName = row.request_type_name ?? "-";


      const parentId = row.subtype_of ?? row.request_type_id ?? "";

      return `
      <tr data-id="${escapeHtml(id)}">
        <td>${escapeHtml(id)}</td>
        <td>${escapeHtml(name)}</td>
        <td>${escapeHtml(parentName)}</td>
        <td class="muted">${escapeHtml(desc)}</td>
        <td>
          <button class="btn btn-ghost btn-sm"
            data-action="edit"
            data-id="${escapeHtml(id)}"
            data-name="${escapeHtml(name)}"
            data-desc="${escapeHtml(desc)}"
            data-parent="${escapeHtml(parentId)}">
            แก้ไข
          </button>
          <button class="btn btn-danger btn-sm"
            data-action="delete"
            data-id="${escapeHtml(id)}">
            ลบ
          </button>
        </td>
      </tr>
    `;
    }).join("");
  }

  function renderRequestSubTypePagination() {
    if (!requestSubTypeEls.pagination) return;

    renderPager(requestSubTypeEls.pagination, {
      page: requestSubTypeState.page,
      totalPages: requestSubTypeState.totalPages,
    });
  }

  function renderRequestSubTypeTotal() {
    if (!requestSubTypeEls.total) return;
    requestSubTypeEls.total.textContent = `ทั้งหมด ${requestSubTypeState.total} รายการ`;
  }

  async function loadRequestSubTypeRefs({ force = false } = {}) {
    refreshRequestSubTypeEls();

    const selectEl = requestSubTypeEls.selectType;   // modal: #request-sub-type-of
    const filterEl = requestSubTypeEls.filterType;   // list filter: #request-sub-type-filter-type

    // ถ้าไม่มี element อะไรเลย ก็ไม่ต้องทำ
    if (!selectEl && !filterEl) return;

    // ถ้าโหลดแล้ว และไม่ force และ element ทั้งสองมีอยู่ -> ข้ามได้
    if (!force && requestSubTypeState.refsLoaded && selectEl && filterEl) return;

    if (selectEl) selectEl.innerHTML = `<option value="">กำลังโหลด...</option>`;
    if (filterEl) filterEl.innerHTML = `<option value="">กำลังโหลด...</option>`;

    try {
      const api = window.RequestTypesAPI || window.requestTypesApi;
      if (!api?.list) throw new Error("RequestTypesAPI.list not found");

      const res = await api.list({ q: "", page: 1, limit: 500 });

      // รองรับหลาย format
      const items =
        Array.isArray(res?.data) ? res.data :
          Array.isArray(res?.data?.data) ? res.data.data :
            Array.isArray(res?.data?.items) ? res.data.items :
              Array.isArray(res?.items) ? res.items :
                [];

      // ---- สร้าง options สำหรับ FILTER (ทุกประเภท) ----
      const filterOptions = [
        `<option value="">ทุกประเภทคำขอหลัก</option>`,
        ...items.map((it) => {
          const id = it.request_type_id ?? it.id ?? "";
          const label = it.type_name ?? it.name ?? "-";
          return `<option value="${escapeHtml(String(id))}">${escapeHtml(String(label))}</option>`;
        }),
      ].join("");

      // ---- สร้าง options สำหรับ MODAL (เลือก) ----
      const modalOptions = [
        `<option value="">เลือกประเภทคำขอหลัก</option>`,
        ...items.map((it) => {
          const id = it.request_type_id ?? it.id ?? "";
          const label = it.type_name ?? it.name ?? "-";
          return `<option value="${escapeHtml(String(id))}">${escapeHtml(String(label))}</option>`;
        }),
      ].join("");

      if (filterEl) filterEl.innerHTML = filterOptions;
      if (selectEl) selectEl.innerHTML = modalOptions;

      requestSubTypeState.refsLoaded = true;
    } catch (e) {
      console.warn("load request types refs failed:", e);
      if (selectEl) selectEl.innerHTML = `<option value="">โหลดไม่สำเร็จ</option>`;
      if (filterEl) filterEl.innerHTML = `<option value="">โหลดไม่สำเร็จ</option>`;
    }
  }

  async function loadRequestSubTypes() {
    refreshRequestSubTypeEls(); // ✅ สำคัญมาก

    if (requestSubTypeState.loading) return;
    requestSubTypeState.loading = true;

    try {
      if (!requestSubTypeEls.tbody) {
        console.warn("[request-sub-types] tbody not found (DOM not ready yet)");
        return;
      }

      requestSubTypeEls.tbody.innerHTML = `<tr><td colspan="5" class="muted">กำลังโหลด...</td></tr>`;

      const api = window.RequestSubTypesAPI || window.requestSubTypesApi;
      if (!api?.list) throw new Error("RequestSubTypesAPI.list not found (check include request-sub-types.api.js)");

      const res = await api.list({
        q: requestSubTypeState.q,
        page: requestSubTypeState.page,
        limit: requestSubTypeState.limit,
        subtype_of: requestSubTypeState.subtype_of,
      });

      // ✅ รองรับหลายรูปแบบ (กัน api.list คืนมาเป็น data ตรงๆ)
      const items =
        Array.isArray(res) ? res :
          Array.isArray(res?.data) ? res.data :
            Array.isArray(res?.data?.items) ? res.data.items :
              Array.isArray(res?.items) ? res.items :
                [];

      const pg = res?.pagination ?? res?.data?.pagination ?? {};
      requestSubTypeState.total = Number(pg.total ?? items.length ?? 0);
      requestSubTypeState.totalPages =
        Number(pg.total_pages ?? pg.totalPages ?? 0) ||
        Math.max(1, Math.ceil(requestSubTypeState.total / Math.max(1, requestSubTypeState.limit)));

      renderRequestSubTypeRows(items);
      renderRequestSubTypePagination();
      renderRequestSubTypeTotal();
    } catch (err) {
      console.error(err);
      if (requestSubTypeEls.tbody) {
        requestSubTypeEls.tbody.innerHTML =
          `<tr><td colspan="5" class="muted">${escapeHtml(err.message || err)}</td></tr>`;
      }
    } finally {
      requestSubTypeState.loading = false;
    }
  }

  function refreshRequestSubTypeEls() {
    requestSubTypeEls.section = $("#section-request-sub-types");
    requestSubTypeEls.tbody = $("#request-sub-type-tbody");
    requestSubTypeEls.search = $("#request-sub-type-search");
    requestSubTypeEls.limit = $("#request-sub-type-limit");
    requestSubTypeEls.refresh = $("#request-sub-type-refresh");
    requestSubTypeEls.pagination = $("#request-sub-type-pagination");
    requestSubTypeEls.total = $("#request-sub-type-total");

    requestSubTypeEls.modal = $("#request-sub-type-modal");
    requestSubTypeEls.form = $("#request-sub-type-form");
    requestSubTypeEls.modalTitle = $("#request-sub-type-modal-title");
    requestSubTypeEls.submitText = $("#request-sub-type-submit-text");

    requestSubTypeEls.inputId = $("#request-sub-type-id");
    requestSubTypeEls.inputName = $("#request-sub-type-name");
    requestSubTypeEls.selectType = $("#request-sub-type-of");
    requestSubTypeEls.inputDesc = $("#request-sub-type-desc");

    requestSubTypeEls.filterType = $("#request-sub-type-filter-type");
    requestSubTypeEls.formError = $("#request-sub-type-form-error");
  }

  /* =========================
    Head Of Request UI (ผู้รับผิดชอบตามประเภทย่อย)
    - Section: #section-head-of-request
    - Table: #head-of-request-tbody
    - Toolbar: #head-of-request-search, #head-of-request-filter-type, #head-of-request-limit, #head-of-request-refresh
    - Modal: #head-of-request-modal + #head-of-request-form
  ========================= */
  const horEls = {
    section: $("#section-head-of-request"),
    tbody: $("#head-of-request-tbody"),
    search: $("#head-of-request-search"),
    filterType: $("#head-of-request-filter-type"),
    limit: $("#head-of-request-limit"),
    refresh: $("#head-of-request-refresh"),
    pagination: $("#head-of-request-pagination"),
    total: $("#head-of-request-total"),

    btnAdd: $("#btn-add-head-of-request"),

    modal: $("#head-of-request-modal"),
    form: $("#head-of-request-form"),
    modalTitle: $("#head-of-request-modal-title"),
    submitText: $("#head-of-request-submit-text"),
    selectSubType: $("#head-of-request-sub-type"),
    selectStaff: $("#head-of-request-staff-ids"),
    formError: $("#head-of-request-form-error"),
  };

  const horState = {
    page: 1,
    limit: 50,
    q: "",
    subtype_of: 0,
    total: 0,
    totalPages: 1,
    loading: false,
    refsLoaded: false,
    usersLoaded: false,
    subTypesLoaded: false,
    mode: "create", // create | edit
  };

  function refreshHorEls() {
    horEls.section = $("#section-head-of-request");
    horEls.tbody = $("#head-of-request-tbody");
    horEls.search = $("#head-of-request-search");
    horEls.filterType = $("#head-of-request-filter-type");
    horEls.limit = $("#head-of-request-limit");
    horEls.refresh = $("#head-of-request-refresh");
    horEls.pagination = $("#head-of-request-pagination");
    horEls.total = $("#head-of-request-total");

    horEls.btnAdd = $("#btn-add-head-of-request");

    horEls.modal = $("#head-of-request-modal");
    horEls.form = $("#head-of-request-form");
    horEls.modalTitle = $("#head-of-request-modal-title");
    horEls.submitText = $("#head-of-request-submit-text");
    horEls.selectSubType = $("#head-of-request-sub-type");
    horEls.selectStaff = $("#head-of-request-staff-ids");
    horEls.formError = $("#head-of-request-form-error");
  }

  function renderHorRows(items = []) {
    if (!horEls.tbody) return;
    if (!items.length) {
      horEls.tbody.innerHTML = `<tr><td colspan="5" class="muted">ไม่พบข้อมูล</td></tr>`;
      return;
    }

    horEls.tbody.innerHTML = items
      .map((row) => {
        const id = row.request_sub_type_id ?? "";
        const subName = row.request_sub_type_name ?? row.name ?? "";
        const typeName = row.request_type_name ?? "-";
        const staff = Array.isArray(row.staff) ? row.staff : [];
        const staffNames = staff
          .map((s) => s.display_name || s.line_user_name || "")
          .filter(Boolean)
          .join(", ");

        return `
          <tr data-id="${escapeHtml(String(id))}">
            <td>${escapeHtml(String(id))}</td>
            <td>${escapeHtml(String(subName))}</td>
            <td>${escapeHtml(String(typeName))}</td>
            <td>${staffNames ? escapeHtml(staffNames) : '<span class="muted">-</span>'}</td>
            <td>
              <button class="btn btn-ghost btn-sm" type="button"
                data-action="edit"
                data-id="${escapeHtml(String(id))}">
                แก้ไข
              </button>
              <button class="btn btn-danger btn-sm" type="button"
                data-action="delete"
                data-id="${escapeHtml(String(id))}">
                ลบ
              </button>
            </td>
          </tr>
        `;
      })
      .join("");
  }

  function renderHorPagination() {
    if (!horEls.pagination) return;
    renderPager(horEls.pagination, {
      page: horState.page,
      totalPages: horState.totalPages,
    });
  }

  function renderHorTotal() {
    if (!horEls.total) return;
    horEls.total.textContent = `ทั้งหมด ${horState.total} รายการ`;
  }

  async function loadHorTypeRefs({ force = false } = {}) {
    refreshHorEls();
    if (!horEls.filterType) return;
    if (!force && horState.refsLoaded) return;

    horEls.filterType.innerHTML = `<option value="">กำลังโหลด...</option>`;
    try {
      const api = window.RequestTypesAPI || window.requestTypesApi;
      if (!api?.list) throw new Error("RequestTypesAPI.list not found");
      const res = await api.list({ q: "", page: 1, limit: 500 });

      const items =
        Array.isArray(res?.data) ? res.data :
          Array.isArray(res?.data?.items) ? res.data.items :
            Array.isArray(res?.items) ? res.items :
              [];

      horEls.filterType.innerHTML = [
        `<option value="">ทุกประเภทคำขอหลัก</option>`,
        ...items.map((it) => {
          const id = it.request_type_id ?? it.id ?? "";
          const label = it.type_name ?? it.name ?? "-";
          return `<option value="${escapeHtml(String(id))}">${escapeHtml(String(label))}</option>`;
        }),
      ].join("");

      horState.refsLoaded = true;
    } catch (e) {
      console.warn("[head-of-request] load type refs failed:", e);
      horEls.filterType.innerHTML = `<option value="">โหลดไม่สำเร็จ</option>`;
    }
  }

  async function loadHorSubTypeOptions({ force = false } = {}) {
    refreshHorEls();
    if (!horEls.selectSubType) return;
    if (!force && horState.subTypesLoaded) return;

    horEls.selectSubType.innerHTML = `<option value="">กำลังโหลด...</option>`;
    try {
      const api = window.RequestSubTypesAPI || window.requestSubTypesApi;
      if (!api?.list) throw new Error("RequestSubTypesAPI.list not found");
      const res = await api.list({ q: "", subtype_of: 0, page: 1, limit: 500 });

      const items =
        Array.isArray(res) ? res :
          Array.isArray(res?.data) ? res.data :
            Array.isArray(res?.data?.items) ? res.data.items :
              Array.isArray(res?.items) ? res.items :
                [];

      horEls.selectSubType.innerHTML = [
        `<option value="">เลือกประเภทคำขอย่อย</option>`,
        ...items.map((it) => {
          const id = it.request_sub_type_id ?? it.id ?? "";
          const name = it.name ?? it.sub_type_name ?? "-";
          const parent = it.request_type_name ?? "";
          const label = parent ? `${parent} — ${name}` : name;
          return `<option value="${escapeHtml(String(id))}">${escapeHtml(String(label))}</option>`;
        }),
      ].join("");

      horState.subTypesLoaded = true;
    } catch (e) {
      console.warn("[head-of-request] load sub types failed:", e);
      horEls.selectSubType.innerHTML = `<option value="">โหลดไม่สำเร็จ</option>`;
    }
  }

  async function loadHorEligibleUsers({ force = false } = {}) {
    refreshHorEls();
    if (!horEls.selectStaff) return;
    if (!force && horState.usersLoaded) return;

    horEls.selectStaff.innerHTML = "";
    try {
      const api = window.HeadOfRequestAPI;
      if (!api?.eligibleUsers) throw new Error("HeadOfRequestAPI.eligibleUsers not found");

      const res = await api.eligibleUsers({ q: "", page: 1, limit: 500 });
      const items = Array.isArray(res?.data) ? res.data : [];

      horEls.selectStaff.innerHTML = items
        .map((u) => {
          const id = u.user_id ?? u.id ?? "";
          const label = u.display_name || u.line_user_name || `User ${id}`;
          return `<option value="${escapeHtml(String(id))}">${escapeHtml(String(label))}</option>`;
        })
        .join("");

      horState.usersLoaded = true;
    } catch (e) {
      console.warn("[head-of-request] load eligible users failed:", e);
      horEls.selectStaff.innerHTML = "";
    }
  }

  async function loadHeadOfRequest() {
    refreshHorEls();
    if (horState.loading) return;
    horState.loading = true;

    try {
      if (!horEls.tbody) return;
      horEls.tbody.innerHTML = `<tr><td colspan="5" class="muted">กำลังโหลด...</td></tr>`;

      const api = window.HeadOfRequestAPI;
      if (!api?.list) throw new Error("HeadOfRequestAPI.list not found (check include head-of-request.api.js)");

      const res = await api.list({
        q: horState.q,
        subtype_of: horState.subtype_of,
        page: horState.page,
        limit: horState.limit,
      });

      const items = Array.isArray(res?.data) ? res.data : [];
      const pg = res?.pagination ?? {};

      horState.total = Number(pg.total ?? items.length ?? 0);
      horState.totalPages =
        Number(pg.totalPages ?? pg.total_pages ?? 0) ||
        Math.max(1, Math.ceil(horState.total / Math.max(1, horState.limit)));

      renderHorRows(items);
      renderHorPagination();
      renderHorTotal();
    } catch (err) {
      console.error(err);
      if (horEls.tbody) {
        horEls.tbody.innerHTML = `<tr><td colspan="5" class="muted">${escapeHtml(err.message || err)}</td></tr>`;
      }
    } finally {
      horState.loading = false;
    }
  }

  function horSetError(msg) {
    if (!horEls.formError) return;
    horEls.formError.textContent = msg || "";
    if (!msg) hide(horEls.formError);
    else show(horEls.formError);
  }

  async function openHorModal({ mode = "create", row } = {}) {
    refreshHorEls();
    horState.mode = mode;

    await loadHorSubTypeOptions();
    await loadHorEligibleUsers();

    if (horEls.modalTitle) {
      horEls.modalTitle.textContent = mode === "edit" ? "แก้ไขผู้รับผิดชอบตามประเภทย่อย" : "เพิ่มผู้รับผิดชอบตามประเภทย่อย";
    }
    if (horEls.submitText) {
      horEls.submitText.textContent = mode === "edit" ? "บันทึก" : "บันทึก";
    }

    // reset
    horSetError("");

    const subTypeId = row?.request_sub_type_id ?? row?.id ?? "";
    if (horEls.selectSubType) {
      horEls.selectSubType.disabled = mode === "edit";
      horEls.selectSubType.value = subTypeId ? String(subTypeId) : "";
    }

    // select staff
    const staffIds = new Set(
      (Array.isArray(row?.staff) ? row.staff : [])
        .map((s) => String(s.user_id ?? s.staff_id ?? ""))
        .filter(Boolean)
    );

    if (horEls.selectStaff) {
      Array.from(horEls.selectStaff.options).forEach((opt) => {
        opt.selected = staffIds.has(String(opt.value));
      });
    }

    openModal("head-of-request-modal");
  }

  function closeHorModal() {
    closeModal("head-of-request-modal");
  }

  /* =========================
    Request Status UI
    - filter ตามประเภทคำขอหลัก (request_type_id)
  ========================= */
  const requestStatusEls = {
    section: $("#section-request-status"),
    tbody: $("#request-status-tbody"),
    search: $("#request-status-search"),
    limit: $("#request-status-limit"),
    refresh: $("#request-status-refresh"),
    pagination: $("#request-status-pagination"),
    total: $("#request-status-total"),

    filterType: $("#request-status-filter-type"), // ✅ filter ประเภทคำขอหลัก

    btnAdd: $("#btn-add-request-status"), // optional
    // modal/form (optional ถ้าคุณมี CRUD)
    modal: $("#request-status-modal"),
    form: $("#request-status-form"),
    modalTitle: $("#request-status-modal-title"),
    submitText: $("#request-status-submit-text"),

    inputId: $("#request-status-id"),
    inputName: $("#request-status-name"),
    inputCode: $("#request-status-code"),
    inputDesc: $("#request-status-desc"),
    inputSort: $("#request-status-sort"),
    selectType: $("#request-status-request-type"), // dropdown ใน modal (optional)

    formError: $("#request-status-form-error"),
  };

  const requestStatusState = {
    page: 1,
    limit: 50,
    q: "",
    request_type_id: 0, // ✅ filter หลัก
    total: 0,
    totalPages: 1,
    loading: false,
    refsLoaded: false,
  };

  function refreshRequestStatusEls() {
    requestStatusEls.section = $("#section-request-status");
    requestStatusEls.tbody = $("#request-status-tbody");
    requestStatusEls.search = $("#request-status-search");
    requestStatusEls.limit = $("#request-status-limit");
    requestStatusEls.refresh = $("#request-status-refresh");
    requestStatusEls.pagination = $("#request-status-pagination");
    requestStatusEls.total = $("#request-status-total");

    requestStatusEls.filterType = $("#request-status-filter-type");

    requestStatusEls.btnAdd = $("#btn-add-request-status");

    requestStatusEls.modal = $("#request-status-modal");
    requestStatusEls.form = $("#request-status-form");
    requestStatusEls.modalTitle = $("#request-status-modal-title");
    requestStatusEls.submitText = $("#request-status-submit-text");

    requestStatusEls.inputId = $("#request-status-id");
    requestStatusEls.inputName = $("#request-status-name");
    requestStatusEls.inputCode = $("#request-status-code");
    requestStatusEls.inputDesc = $("#request-status-desc");
    requestStatusEls.inputSort = $("#request-status-sort");
    requestStatusEls.selectType = $("#request-status-request-type");

    requestStatusEls.formError = $("#request-status-form-error");
  }

  function renderRequestStatusRows(items = []) {
    if (!requestStatusEls.tbody) return;

    if (!items.length) {
      requestStatusEls.tbody.innerHTML = `<tr><td colspan="7" class="muted">ไม่พบข้อมูล</td></tr>`;
      return;
    }

    requestStatusEls.tbody.innerHTML = items.map((row) => {
      const id = row.status_id ?? row.request_status_id ?? row.id ?? "";
      const typeName = row.type_name ?? row.request_type_name ?? "-";
      const sortOrder = row.sort_order ?? row.order_no ?? "-";
      const code = row.status_code ?? row.request_status_code ?? "-";
      const name = row.status_name ?? row.request_status_name ?? "-";
      const meaning = row.meaning ?? row.description ?? row.discription ?? "-";

      const typeId = row.request_type_id ?? row.type_id ?? "";

      return `
      <tr data-id="${escapeHtml(String(id))}">
        <td>${escapeHtml(String(id))}</td>
        <td>${escapeHtml(String(typeName))}</td>
        <td>${escapeHtml(String(sortOrder))}</td>
        <td>${escapeHtml(String(code))}</td>
        <td>${escapeHtml(String(name))}</td>
        <td class="muted">${escapeHtml(String(meaning))}</td>
        <td>
          <button class="btn btn-ghost btn-sm" type="button"
            data-action="edit"
            data-id="${escapeHtml(String(id))}"
            data-type="${escapeHtml(String(typeId))}"
            data-sort="${escapeHtml(String(sortOrder))}"
            data-code="${escapeHtml(String(code))}"
            data-name="${escapeHtml(String(name))}"
            data-meaning="${escapeHtml(String(meaning))}"
          >แก้ไข</button>
          <button class="btn btn-danger btn-sm" type="button"
            data-action="delete"
            data-id="${escapeHtml(String(id))}"
          >ลบ</button>
        </td>
      </tr>
    `;
    }).join("");
  }


  function renderRequestStatusPagination() {
    if (!requestStatusEls.pagination) return;

    renderPager(requestStatusEls.pagination, {
      page: requestStatusState.page,
      totalPages: requestStatusState.totalPages,
    });
  }

  function renderRequestStatusTotal() {
    if (!requestStatusEls.total) return;
    requestStatusEls.total.textContent = `ทั้งหมด ${requestStatusState.total} รายการ`;
  }

  /** โหลด dropdown ประเภทคำขอหลัก ให้ filter + modal (ถ้ามี) */
  async function loadRequestStatusTypeRefs({ force = false } = {}) {
    refreshRequestStatusEls();

    const filterEl = requestStatusEls.filterType; // บนตาราง
    const modalEl = requestStatusEls.selectType;  // ใน modal (optional)

    if (!filterEl && !modalEl) return;
    if (!force && requestStatusState.refsLoaded && filterEl && modalEl) return;

    if (filterEl) filterEl.innerHTML = `<option value="">กำลังโหลด...</option>`;
    if (modalEl) modalEl.innerHTML = `<option value="">กำลังโหลด...</option>`;

    try {
      const api = window.RequestTypesAPI || window.requestTypesApi;
      if (!api?.list) throw new Error("RequestTypesAPI.list not found");

      const res = await api.list({ q: "", page: 1, limit: 500 });

      const items =
        Array.isArray(res?.data) ? res.data :
          Array.isArray(res?.data?.items) ? res.data.items :
            Array.isArray(res?.items) ? res.items :
              [];

      const optAll = [`<option value="">ทุกประเภทคำขอหลัก</option>`]
        .concat(items.map((it) => {
          const id = it.request_type_id ?? it.id ?? "";
          const label = it.type_name ?? it.name ?? "-";
          return `<option value="${escapeHtml(String(id))}">${escapeHtml(String(label))}</option>`;
        }))
        .join("");

      const optPick = [`<option value="">เลือกประเภทคำขอหลัก</option>`]
        .concat(items.map((it) => {
          const id = it.request_type_id ?? it.id ?? "";
          const label = it.type_name ?? it.name ?? "-";
          return `<option value="${escapeHtml(String(id))}">${escapeHtml(String(label))}</option>`;
        }))
        .join("");

      if (filterEl) filterEl.innerHTML = optAll;
      if (modalEl) modalEl.innerHTML = optPick;

      requestStatusState.refsLoaded = true;
    } catch (e) {
      console.warn("load request type refs for status failed:", e);
      if (filterEl) filterEl.innerHTML = `<option value="">โหลดไม่สำเร็จ</option>`;
      if (modalEl) modalEl.innerHTML = `<option value="">โหลดไม่สำเร็จ</option>`;
    }
  }

  /** โหลดรายการสถานะ */
  async function loadRequestStatuses() {
    refreshRequestStatusEls();
    if (requestStatusState.loading) return;
    requestStatusState.loading = true;

    try {
      if (!requestStatusEls.tbody) return;

      requestStatusEls.tbody.innerHTML = `<tr><td colspan="7" class="muted">กำลังโหลด...</td></tr>`;

      const api = window.RequestStatusAPI || window.requestStatusApi;
      if (!api?.list) throw new Error("RequestStatusAPI.list not found (check include request-status.api.js)");


      const res = await api.list({
        q: requestStatusState.q,
        page: requestStatusState.page,
        limit: requestStatusState.limit,
        request_type_id: requestStatusState.request_type_id, // ✅ filter ตามประเภทหลัก
        // ถ้า backend ใช้ชื่ออื่น เช่น request_type / type_id ให้เปลี่ยนตรงนี้
      });

      const items =
        Array.isArray(res) ? res :
          Array.isArray(res?.data) ? res.data :
            Array.isArray(res?.data?.items) ? res.data.items :
              Array.isArray(res?.items) ? res.items :
                [];

      const pg = res?.pagination ?? res?.data?.pagination ?? {};
      requestStatusState.total = Number(pg.total ?? res?.total ?? items.length ?? 0);
      requestStatusState.totalPages =
        Number(pg.total_pages ?? pg.totalPages ?? res?.total_pages ?? 0) ||
        Math.max(1, Math.ceil(requestStatusState.total / Math.max(1, requestStatusState.limit)));

      renderRequestStatusRows(items);
      renderRequestStatusPagination();
      renderRequestStatusTotal();
    } catch (err) {
      console.error(err);
      if (requestStatusEls.tbody) {
        requestStatusEls.tbody.innerHTML = `<tr><td colspan="7" class="muted">กำลังโหลด...</td></tr>`;

      }
    } finally {
      requestStatusState.loading = false;
    }
  }

  /* =========================
    Event Status UI (สถานะกิจกรรม)
    - CRUD + search + filter ตามประเภทคำขอหลัก (request_type_id)
  ========================= */
  const eventStatusEls = {
    section: $("#section-event-status"),
    tbody: $("#event-status-tbody"),
    search: $("#event-status-search"),
    limit: $("#event-status-limit"),
    refresh: $("#event-status-refresh"),
    pagination: $("#event-status-pagination"),
    total: $("#event-status-total"),

    filterType: $("#event-status-filter-type"),

    btnAdd: $("#btn-add-event-status"),

    modal: $("#event-status-modal"),
    form: $("#event-status-form"),
    modalTitle: $("#event-status-modal-title"),
    submitText: $("#event-status-submit-text"),

    inputId: $("#event-status-id"),
    inputName: $("#event-status-name"),
    inputCode: $("#event-status-code"),
    inputDesc: $("#event-status-desc"),
    inputSort: $("#event-status-sort"),
    selectType: $("#event-status-request-type"),

    formError: $("#event-status-form-error"),
  };

  const eventStatusState = {
    page: 1,
    limit: 50,
    q: "",
    request_type_id: 0,
    total: 0,
    totalPages: 1,
    loading: false,
    refsLoaded: false,
  };

  function refreshEventStatusEls() {
    eventStatusEls.section = $("#section-event-status");
    eventStatusEls.tbody = $("#event-status-tbody");
    eventStatusEls.search = $("#event-status-search");
    eventStatusEls.limit = $("#event-status-limit");
    eventStatusEls.refresh = $("#event-status-refresh");
    eventStatusEls.pagination = $("#event-status-pagination");
    eventStatusEls.total = $("#event-status-total");

    eventStatusEls.filterType = $("#event-status-filter-type");
    eventStatusEls.btnAdd = $("#btn-add-event-status");

    eventStatusEls.modal = $("#event-status-modal");
    eventStatusEls.form = $("#event-status-form");
    eventStatusEls.modalTitle = $("#event-status-modal-title");
    eventStatusEls.submitText = $("#event-status-submit-text");

    eventStatusEls.inputId = $("#event-status-id");
    eventStatusEls.inputName = $("#event-status-name");
    eventStatusEls.inputCode = $("#event-status-code");
    eventStatusEls.inputDesc = $("#event-status-desc");
    eventStatusEls.inputSort = $("#event-status-sort");
    eventStatusEls.selectType = $("#event-status-request-type");

    eventStatusEls.formError = $("#event-status-form-error");
  }

  function renderEventStatusRows(items = []) {
    if (!eventStatusEls.tbody) return;

    if (!items.length) {
      eventStatusEls.tbody.innerHTML = `<tr><td colspan="7" class="muted">ไม่พบข้อมูล</td></tr>`;
      return;
    }

    eventStatusEls.tbody.innerHTML = items
      .map((row) => {
        const id = row.event_status_id ?? row.id ?? "";
        const typeName = row.type_name ?? row.request_type_name ?? "-";
        const sortOrder = row.sort_order ?? "-";
        const code = row.status_code ?? "-";
        const name = row.status_name ?? "-";
        const meaning = row.meaning ?? "-";
        const typeId = row.request_type_id ?? "";

        return `
        <tr data-id="${escapeHtml(String(id))}">
          <td>${escapeHtml(String(id))}</td>
          <td>${escapeHtml(String(typeName))}</td>
          <td>${escapeHtml(String(sortOrder))}</td>
          <td>${escapeHtml(String(code))}</td>
          <td>${escapeHtml(String(name))}</td>
          <td class="muted">${escapeHtml(String(meaning))}</td>
          <td>
            <button class="btn btn-ghost btn-sm" type="button"
              data-action="edit"
              data-id="${escapeHtml(String(id))}"
              data-type="${escapeHtml(String(typeId))}"
              data-sort="${escapeHtml(String(sortOrder))}"
              data-code="${escapeHtml(String(code))}"
              data-name="${escapeHtml(String(name))}"
              data-meaning="${escapeHtml(String(meaning))}"
            >แก้ไข</button>
            <button class="btn btn-danger btn-sm" type="button"
              data-action="delete"
              data-id="${escapeHtml(String(id))}"
            >ลบ</button>
          </td>
        </tr>
      `;
      })
      .join("");
  }

  function renderEventStatusPagination() {
    if (!eventStatusEls.pagination) return;
    renderPager(eventStatusEls.pagination, {
      page: eventStatusState.page,
      totalPages: eventStatusState.totalPages,
    });
  }

  function renderEventStatusTotal() {
    if (!eventStatusEls.total) return;
    eventStatusEls.total.textContent = `ทั้งหมด ${eventStatusState.total} รายการ`;
  }

  async function loadEventStatusTypeRefs({ force = false } = {}) {
    refreshEventStatusEls();

    const filterEl = eventStatusEls.filterType;
    const modalEl = eventStatusEls.selectType;

    if (!filterEl && !modalEl) return;
    if (!force && eventStatusState.refsLoaded && filterEl && modalEl) return;

    if (filterEl) filterEl.innerHTML = `<option value="">กำลังโหลด...</option>`;
    if (modalEl) modalEl.innerHTML = `<option value="">กำลังโหลด...</option>`;

    try {
      const api = window.RequestTypesAPI || window.requestTypesApi;
      if (!api?.list) throw new Error("RequestTypesAPI.list not found");

      const res = await api.list({ q: "", page: 1, limit: 500 });

      const items =
        Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res?.data?.items)
            ? res.data.items
            : Array.isArray(res?.items)
              ? res.items
              : [];

      const optAll = [`<option value="">ทุกประเภทคำขอหลัก</option>`]
        .concat(
          items.map((it) => {
            const id = it.request_type_id ?? it.id ?? "";
            const label = it.type_name ?? it.name ?? "-";
            return `<option value="${escapeHtml(String(id))}">${escapeHtml(String(label))}</option>`;
          })
        )
        .join("");

      const optPick = [`<option value="">เลือกประเภทคำขอหลัก</option>`]
        .concat(
          items.map((it) => {
            const id = it.request_type_id ?? it.id ?? "";
            const label = it.type_name ?? it.name ?? "-";
            return `<option value="${escapeHtml(String(id))}">${escapeHtml(String(label))}</option>`;
          })
        )
        .join("");

      if (filterEl) filterEl.innerHTML = optAll;
      if (modalEl) modalEl.innerHTML = optPick;

      eventStatusState.refsLoaded = true;
    } catch (e) {
      console.warn("load request type refs for event status failed:", e);
      if (filterEl) filterEl.innerHTML = `<option value="">โหลดไม่สำเร็จ</option>`;
      if (modalEl) modalEl.innerHTML = `<option value="">โหลดไม่สำเร็จ</option>`;
    }
  }

  async function loadEventStatuses() {
    refreshEventStatusEls();
    if (eventStatusState.loading) return;
    eventStatusState.loading = true;

    try {
      if (!eventStatusEls.tbody) return;
      eventStatusEls.tbody.innerHTML = `<tr><td colspan="7" class="muted">กำลังโหลด...</td></tr>`;

      const api = window.EventStatusAPI || window.eventStatusApi;
      if (!api?.list) throw new Error("EventStatusAPI.list not found (check include event-status.api.js)");

      const res = await api.list({
        q: eventStatusState.q,
        page: eventStatusState.page,
        limit: eventStatusState.limit,
        request_type_id: eventStatusState.request_type_id,
      });

      const items =
        Array.isArray(res)
          ? res
          : Array.isArray(res?.data)
            ? res.data
            : Array.isArray(res?.data?.items)
              ? res.data.items
              : Array.isArray(res?.items)
                ? res.items
                : [];

      const pg = res?.pagination ?? res?.data?.pagination ?? {};
      eventStatusState.total = Number(pg.total ?? res?.total ?? items.length ?? 0);
      eventStatusState.totalPages =
        Number(pg.total_pages ?? pg.totalPages ?? res?.total_pages ?? 0) ||
        Math.max(1, Math.ceil(eventStatusState.total / Math.max(1, eventStatusState.limit)));

      renderEventStatusRows(items);
      renderEventStatusPagination();
      renderEventStatusTotal();
    } catch (err) {
      console.error(err);
      if (eventStatusEls.tbody) {
        eventStatusEls.tbody.innerHTML = `<tr><td colspan="7" class="muted">${escapeHtml(err.message || err)}</td></tr>`;
      }
    } finally {
      eventStatusState.loading = false;
    }
  }

  /* =========================
    Urgency UI (ความเร่งด่วน) - CRUD urgency
  ========================= */
  const urgencyEls = {
    section: $("#section-urgency"),
    tbody: $("#urgency-tbody"),
    search: $("#urgency-search"),
    limit: $("#urgency-limit"),
    refresh: $("#urgency-refresh"),
    pagination: $("#urgency-pagination"),
    total: $("#urgency-total"),

    btnAdd: $("#btn-add-urgency"),

    modal: $("#urgency-modal"),
    form: $("#urgency-form"),
    modalTitle: $("#urgency-modal-title"),
    submitText: $("#urgency-submit-text"),

    inputId: $("#urgency-id"),
    inputCode: $("#urgency-code"),
    inputTitle: $("#urgency-title"),
    inputLevel: $("#urgency-level"),

    formError: $("#urgency-form-error"),
  };

  const urgencyState = {
    page: 1,
    limit: 50,
    q: "",
    total: 0,
    totalPages: 1,
    loading: false,
  };

  function setUrgencyError(msg) {
    if (!urgencyEls.formError) return;
    if (!msg) {
      urgencyEls.formError.hidden = true;
      urgencyEls.formError.textContent = "";
      return;
    }
    urgencyEls.formError.hidden = false;
    urgencyEls.formError.textContent = msg;
  }

  function openUrgencyModal({ mode = "create", row } = {}) {
    setUrgencyError("");

    if (mode === "edit" && row) {
      if (urgencyEls.modalTitle) urgencyEls.modalTitle.textContent = "แก้ไขความเร่งด่วน";
      if (urgencyEls.submitText) urgencyEls.submitText.textContent = "บันทึกการแก้ไข";
      if (urgencyEls.inputId) urgencyEls.inputId.value = String(row.urgency_id ?? "");
      if (urgencyEls.inputCode) urgencyEls.inputCode.value = String(row.urgency_code ?? "");
      if (urgencyEls.inputTitle) urgencyEls.inputTitle.value = String(row.urgency_title ?? "");
      if (urgencyEls.inputLevel) urgencyEls.inputLevel.value = String(row.urgency_level ?? 0);
    } else {
      if (urgencyEls.modalTitle) urgencyEls.modalTitle.textContent = "เพิ่มความเร่งด่วน";
      if (urgencyEls.submitText) urgencyEls.submitText.textContent = "บันทึก";
      if (urgencyEls.inputId) urgencyEls.inputId.value = "";
      if (urgencyEls.inputCode) urgencyEls.inputCode.value = "";
      if (urgencyEls.inputTitle) urgencyEls.inputTitle.value = "";
      if (urgencyEls.inputLevel) urgencyEls.inputLevel.value = "0";
    }

    openModal("urgency-modal");
    setTimeout(() => urgencyEls.inputCode?.focus(), 0);
  }

  function closeUrgencyModal() {
    setUrgencyError("");
    closeModal("urgency-modal");
  }

  function renderUrgencyRows(items = []) {
    if (!urgencyEls.tbody) return;

    if (!items.length) {
      urgencyEls.tbody.innerHTML = `<tr><td colspan="5" class="muted">ไม่พบข้อมูล</td></tr>`;
      return;
    }

    urgencyEls.tbody.innerHTML = items
      .map((row) => {
        const id = row.urgency_id ?? "";
        const code = row.urgency_code ?? "";
        const title = row.urgency_title ?? "";
        const level = row.urgency_level ?? 0;

        return `
        <tr data-id="${escapeHtml(String(id))}">
          <td>${escapeHtml(String(id))}</td>
          <td>${escapeHtml(String(level))}</td>
          <td>${escapeHtml(String(code))}</td>
          <td>${escapeHtml(String(title))}</td>
          <td>
            <button class="btn btn-ghost btn-sm" type="button"
              data-action="edit"
              data-id="${escapeHtml(String(id))}"
              data-code="${escapeHtml(String(code))}"
              data-title="${escapeHtml(String(title))}"
              data-level="${escapeHtml(String(level))}">
              แก้ไข
            </button>
            <button class="btn btn-danger btn-sm" type="button"
              data-action="delete"
              data-id="${escapeHtml(String(id))}">
              ลบ
            </button>
          </td>
        </tr>
      `;
      })
      .join("");
  }

  function renderUrgencyPagination() {
    if (!urgencyEls.pagination) return;
    renderPager(urgencyEls.pagination, {
      page: urgencyState.page,
      totalPages: urgencyState.totalPages,
    });
  }

  function renderUrgencyTotal() {
    if (!urgencyEls.total) return;
    urgencyEls.total.textContent = `ทั้งหมด ${urgencyState.total} รายการ`;
  }

  async function loadUrgency() {
    if (urgencyState.loading) return;
    urgencyState.loading = true;

    try {
      if (!urgencyEls.tbody) return;

      urgencyEls.tbody.innerHTML = `<tr><td colspan="5" class="muted">กำลังโหลด...</td></tr>`;

      const api = window.UrgencyAPI || window.urgencyApi;
      if (!api?.list) throw new Error("UrgencyAPI.list not found (check include urgency.api.js)");

      const res = await api.list({
        q: urgencyState.q,
        page: urgencyState.page,
        limit: urgencyState.limit,
      });

      const items =
        Array.isArray(res?.data) ? res.data :
        Array.isArray(res) ? res :
        [];

      const pg = res?.pagination ?? {};

      urgencyState.total = Number(pg.total ?? res?.total ?? items.length ?? 0);
      urgencyState.totalPages = calcTotalPages({
        total: urgencyState.total,
        limit: urgencyState.limit,
        totalPages: pg.totalPages ?? pg.total_pages ?? res?.totalPages ?? res?.total_pages ?? 0,
      });
      urgencyState.page = clampInt(Number(pg.page ?? urgencyState.page), 1, urgencyState.totalPages);

      renderUrgencyRows(items);
      renderUrgencyPagination();
      renderUrgencyTotal();
    } catch (err) {
      console.error(err);
      if (urgencyEls.tbody) {
        urgencyEls.tbody.innerHTML = `<tr><td colspan="5" class="muted">โหลดข้อมูลไม่สำเร็จ: ${escapeHtml(err?.message || String(err))}</td></tr>`;
      }
      urgencyState.total = 0;
      urgencyState.totalPages = 1;
      renderUrgencyPagination();
      renderUrgencyTotal();
    } finally {
      urgencyState.loading = false;
    }
  }

  /* ========================= Notification Type UI - CRUD notification_type ========================= */
  const notificationTypeEls = {
    section: $("#section-notification-type"),
    tbody: $("#notification-type-tbody"),
    search: $("#notification-type-search"),
    limit: $("#notification-type-limit"),
    refresh: $("#notification-type-refresh"),
    pagination: $("#notification-type-pagination"),
    total: $("#notification-type-total"),
    btnAdd: $("#btn-add-notification-type"),

    modal: $("#notification-type-modal"),
    form: $("#notification-type-form"),
    modalTitle: $("#notification-type-modal-title"),
    submitText: $("#notification-type-submit-text"),

    inputId: $("#notification-type-id"),
    inputName: $("#notification-type-name"),
    inputDesc: $("#notification-type-desc"),

    formError: $("#notification-type-form-error"),
  };

  const notificationTypeState = {
    page: 1,
    limit: 50,
    q: "",
    total: 0,
    totalPages: 1,
    loading: false,
  };

  function renderNotificationTypePagination() {
    if (!notificationTypeEls.pagination) return;
    renderPager(notificationTypeEls.pagination, {
      page: notificationTypeState.page,
      totalPages: notificationTypeState.totalPages,
    });
  }

  function renderNotificationTypeTotal() {
    if (!notificationTypeEls.total) return;
    notificationTypeEls.total.textContent = `ทั้งหมด ${notificationTypeState.total} รายการ`;
  }

  async function loadNotificationTypes() {
    if (notificationTypeState.loading) return;
    notificationTypeState.loading = true;

    try {
      if (!notificationTypeEls.tbody) {
        console.warn("[notification-types] tbody not found");
        return;
      }

      notificationTypeEls.tbody.innerHTML =
        `<tr><td colspan="4" class="muted">กำลังโหลด...</td></tr>`;

      const api = window.NotificationTypesAPI || window.notificationTypesApi;
      if (!api) throw new Error("NotificationTypesAPI not found");

      const res = await api.list({
        q: notificationTypeState.q,
        page: notificationTypeState.page,
        limit: notificationTypeState.limit,
      });

      const items =
        Array.isArray(res?.data) ? res.data :
          Array.isArray(res?.data?.items) ? res.data.items :
            Array.isArray(res?.items) ? res.items :
              [];

      const pg = res?.pagination ?? res?.data?.pagination ?? {};

      notificationTypeState.total = Number(pg.total ?? res?.total ?? items.length ?? 0);
      notificationTypeState.totalPages = calcTotalPages({
        total: notificationTypeState.total,
        limit: notificationTypeState.limit,
        totalPages: pg.total_pages ?? pg.totalPages ?? res?.total_pages ?? 0,
      });
      notificationTypeState.page = clampInt(Number(pg.page ?? notificationTypeState.page), 1, notificationTypeState.totalPages);

      renderNotificationTypeRows(items);
      renderNotificationTypePagination();
      renderNotificationTypeTotal();

    } catch (err) {
      console.error(err);
      if (notificationTypeEls.tbody) {
        notificationTypeEls.tbody.innerHTML =
          `<tr><td colspan="4" class="muted">โหลดข้อมูลไม่สำเร็จ</td></tr>`;
      }

      notificationTypeState.total = 0;
      notificationTypeState.totalPages = 1;
      renderNotificationTypePagination();
      renderNotificationTypeTotal();
    } finally {
      notificationTypeState.loading = false;
    }
  }

  function renderNotificationTypeRows(items = []) {
    if (!notificationTypeEls.tbody) return;

    if (!items.length) {
      notificationTypeEls.tbody.innerHTML =
        `<tr><td colspan="4" class="muted">ไม่พบข้อมูล</td></tr>`;
      return;
    }

    notificationTypeEls.tbody.innerHTML = items.map((row) => {
      const id = row.notification_type_id ?? "";
      const name = row.notification_type ?? "";
      const desc = row.meaning ?? "";

      return `
      <tr>
        <td>${escapeHtml(id)}</td>
        <td>${escapeHtml(name)}</td>
        <td class="muted">${escapeHtml(desc || "-")}</td>
        <td>
          <button class="btn btn-ghost btn-sm"
            data-action="edit"
            data-id="${id}"
            data-name="${escapeHtml(name)}"
            data-desc="${escapeHtml(desc)}">
            แก้ไข
          </button>
          <button class="btn btn-danger btn-sm"
            data-action="delete"
            data-id="${id}">
            ลบ
          </button>
        </td>
      </tr>
    `;
    }).join("");
  }

  /* =========================
   Notification Type Staff UI
========================= */

  const notificationTypeStaffEls = {
    section: document.querySelector("#section-notification-type-staff"),
    tbody: document.querySelector("#notification-type-staff-tbody"),

    search: document.querySelector("#notification-type-staff-search"),
    filterType: document.querySelector("#notification-type-staff-filter-type"),
    limit: document.querySelector("#notification-type-staff-limit"),
    refresh: document.querySelector("#notification-type-staff-refresh"),
    pagination: document.querySelector("#notification-type-staff-pagination"),
    total: document.querySelector("#notification-type-staff-total"),

    btnAdd: document.querySelector("#btn-add-notification-type-staff"),

    modal: document.querySelector("#notification-type-staff"),
    form: document.querySelector("#notification-type-staff-form"),
    modalTitle: document.querySelector("#notification-type-staff-title"),
    formError: document.querySelector("#notification-type-staff-form-error"),

    inputId: document.querySelector("#notification-type-staff-id"),
    selectType: document.querySelector("#notification-type-staff-type"),
    selectPerson: document.querySelector("#notification-type-staff-person"),

    toggleEnabled: document.querySelector("#nts-enabled"),
    toggleText: document.querySelector("#nts-enabled-text"),
  };

  const notificationTypeStaffState = {
    page: 1,
    limit: 50,
    q: "",
    notification_type_id: 0,
    total: 0,
    totalPages: 1,
    loading: false,
    refsLoaded: false,
  };

  function refreshNotificationTypeStaffEls() {
    notificationTypeStaffEls.section = document.querySelector("#section-notification-type-staff");
    notificationTypeStaffEls.tbody = document.querySelector("#notification-type-staff-tbody");

    notificationTypeStaffEls.search = document.querySelector("#notification-type-staff-search");
    notificationTypeStaffEls.filterType = document.querySelector("#notification-type-staff-filter-type");
    notificationTypeStaffEls.limit = document.querySelector("#notification-type-staff-limit");
    notificationTypeStaffEls.refresh = document.querySelector("#notification-type-staff-refresh");
    notificationTypeStaffEls.pagination = document.querySelector("#notification-type-staff-pagination");
    notificationTypeStaffEls.total = document.querySelector("#notification-type-staff-total");

    notificationTypeStaffEls.btnAdd = document.querySelector("#btn-add-notification-type-staff");

    notificationTypeStaffEls.modal = document.querySelector("#notification-type-staff");
    notificationTypeStaffEls.form = document.querySelector("#notification-type-staff-form");
    notificationTypeStaffEls.modalTitle = document.querySelector("#notification-type-staff-title");
    notificationTypeStaffEls.formError = document.querySelector("#notification-type-staff-form-error");

    notificationTypeStaffEls.inputId = document.querySelector("#notification-type-staff-id");
    notificationTypeStaffEls.selectType = document.querySelector("#notification-type-staff-type");
    notificationTypeStaffEls.selectPerson = document.querySelector("#notification-type-staff-person");

    notificationTypeStaffEls.toggleEnabled = document.querySelector("#nts-enabled");
    notificationTypeStaffEls.toggleText = document.querySelector("#nts-enabled-text");
  }

  function renderNotificationTypeStaffRows(items = []) {
    if (!notificationTypeStaffEls.tbody) return;

    if (!items.length) {
      notificationTypeStaffEls.tbody.innerHTML = `<tr><td colspan="4" class="muted">ไม่พบข้อมูล</td></tr>`;
      return;
    }

    notificationTypeStaffEls.tbody.innerHTML = items.map((row) => {
      const id = row.id ?? row.notification_type_staff_id ?? "";
      const typeName = row.notification_type ?? "-";
      const personName = row.display_name ?? "-";
      const isEnabled = Number(row.is_enabled) === 1;
      const statusText = row.is_enabled ? "เปิดการใช้งาน" : "ปิดการใช้งาน";
      const statusClass = isEnabled ? "status-badge--on" : "status-badge--off";


      return `
      <tr data-id="${escapeHtml(String(id))}">
        <td>${escapeHtml(String(id))}</td>
        <td>${escapeHtml(String(typeName))}</td>
        <td>${escapeHtml(String(personName))}</td>
        <td class="status-cell">
          <span class="status-badge ${statusClass}">
            ${escapeHtml(statusText)}
          </span>
        </td>
        <td>
          <button class="btn btn-ghost btn-sm" type="button"
            data-action="edit"
            data-id="${escapeHtml(String(id))}"
            data-type="${escapeHtml(String(row.notification_type_id ?? ""))}"
            data-user-id="${escapeHtml(String(row.user_id ?? ""))}"
            data-person-name="${escapeHtml(String(row.display_name ?? "-"))}"
            data-enabled="${isEnabled ? "1" : "0"}"
          >แก้ไข</button>
          <button class="btn btn-danger btn-sm" type="button"
            data-action="delete"
            data-id="${escapeHtml(String(id))}"
          >ลบ</button>
        </td>
      </tr>
    `;
    }).join("");
  }

  function renderNotificationTypeStaffPagination() {
    if (!notificationTypeStaffEls.pagination) return;

    renderPager(notificationTypeStaffEls.pagination, {
      page: notificationTypeStaffState.page,
      totalPages: notificationTypeStaffState.totalPages,
    });
  }

  function renderNotificationTypeStaffTotal() {
    if (!notificationTypeStaffEls.total) return;
    notificationTypeStaffEls.total.textContent = `ทั้งหมด ${notificationTypeStaffState.total} รายการ`;
  }

  async function loadNotificationRef({ force = false } = {}) {
    refreshNotificationTypeStaffEls();

    const filterEl = notificationTypeStaffEls.filterType; // บนตาราง
    const modalEl = notificationTypeStaffEls.selectType;  // ใน modal

    if (!filterEl && !modalEl) return;
    if (!force && notificationTypeStaffState.refsLoaded && filterEl && modalEl) return;

    if (filterEl) filterEl.innerHTML = `<option value="">กำลังโหลด...</option>`;
    if (modalEl) modalEl.innerHTML = `<option value="">กำลังโหลด...</option>`;

    try {
      const api = window.NotificationTypesAPI || window.notificationTypesApi;
      if (!api?.list) throw new Error("NotificationTypesAPI.list not found");

      const res = await api.list({ q: "", page: 1, limit: 500 });

      const items =
        Array.isArray(res?.data) ? res.data :
          Array.isArray(res?.data?.items) ? res.data.items :
            Array.isArray(res?.items) ? res.items :
              [];

      const optAll = [`<option value="">ทุกประเภทการแจ้งเตือน</option>`]
        .concat(items.map((it) => {
          const id = it.notification_type_id ?? it.id ?? "";
          const label = it.notification_type ?? "-";
          return `<option value="${escapeHtml(String(id))}">${escapeHtml(String(label))}</option>`;
        }))
        .join("");

      const optPick = [`<option value="">เลือกประเภทการแจ้งเตือน</option>`]
        .concat(items.map((it) => {
          const id = it.notification_type_id ?? it.id ?? "";
          const label = it.notification_type ?? "-";
          return `<option value="${escapeHtml(String(id))}">${escapeHtml(String(label))}</option>`;
        }))
        .join("");

      if (filterEl) filterEl.innerHTML = optAll;
      if (modalEl) modalEl.innerHTML = optPick;

      notificationTypeStaffState.refsLoaded = true;
    } catch (e) {
      console.warn("load notification type refs for staff failed:", e);
      if (filterEl) filterEl.innerHTML = `<option value="">โหลดไม่สำเร็จ</option>`;
      if (modalEl) modalEl.innerHTML = `<option value="">โหลดไม่สำเร็จ</option>`;
    }
  }

  /**
   * Alias for loadNotificationRef (for compatibility with callers)
   * Also loads user/person dropdown
   */
  async function loadNotificationTypeStaffRefs() {
    // First load notification types
    await loadNotificationRef({ force: false });

    // Then load persons (users) for the modal
    refreshNotificationTypeStaffEls();

    try {
      const api = window.NotificationTypeStaffAPI || window.notificationTypeStaffApi;
      if (!api?.searchUsers) throw new Error("NotificationTypeStaffAPI.searchUsers not found");

      const res = await api.searchUsers({ q: "", page: 1, limit: 500 });

      const items =
        Array.isArray(res?.data) ? res.data :
          Array.isArray(res?.data?.items) ? res.data.items :
            Array.isArray(res?.items) ? res.items :
              [];

      // Initialize checkbox multi-select with loaded users
      window.ntsMultiSelectInstance = initNtsMultiSelectCheckbox(items);
    } catch (e) {
      console.warn("load user/person list for staff notification failed:", e);
      const menu = document.getElementById("nts-person-menu");
      if (menu) {
        menu.innerHTML = `<div class="muted" style="padding: 10px;">โหลดไม่สำเร็จ</div>`;
      }
    }
  }

  /**
   * Load notification type staff data with pagination
   */
  async function loadNotificationTypeStaff() {
    refreshNotificationTypeStaffEls();
    if (notificationTypeStaffState.loading) return;
    notificationTypeStaffState.loading = true;

    try {
      if (!notificationTypeStaffEls.tbody) {
        console.warn("[notification-type-staff] tbody not found");
        return;
      }

      notificationTypeStaffEls.tbody.innerHTML =
        `<tr><td colspan="4" class="muted">กำลังโหลด...</td></tr>`;

      const api = window.NotificationTypeStaffAPI || window.notificationTypeStaffApi;
      if (!api?.list) throw new Error("NotificationTypeStaffAPI.list not found");

      const res = await api.list({
        notification_type_id: Number(notificationTypeStaffState.notification_type_id || 0),
        q: notificationTypeStaffState.q,
        page: notificationTypeStaffState.page,
        limit: notificationTypeStaffState.limit,
      });

      const items =
        Array.isArray(res?.data) ? res.data :
          Array.isArray(res?.data?.items) ? res.data.items :
            Array.isArray(res?.items) ? res.items :
              [];

      const pg = res?.pagination ?? res?.data?.pagination ?? {};
      notificationTypeStaffState.total = Number(pg.total ?? res?.total ?? items.length ?? 0);
      notificationTypeStaffState.totalPages =
        Number(pg.total_pages ?? pg.totalPages ?? res?.total_pages ?? 0) ||
        Math.max(1, Math.ceil(notificationTypeStaffState.total / Math.max(1, notificationTypeStaffState.limit)));

      renderNotificationTypeStaffRows(items);
      renderNotificationTypeStaffPagination();
      renderNotificationTypeStaffTotal();

    } catch (err) {
      console.error(err);
      if (notificationTypeStaffEls.tbody) {
        notificationTypeStaffEls.tbody.innerHTML =
          `<tr><td colspan="4" class="muted">โหลดข้อมูลไม่สำเร็จ: ${escapeHtml(err.message)}</td></tr>`;
      }
    } finally {
      notificationTypeStaffState.loading = false;
    }
  }

  /* =========================
   User Notification Channels UI (NEW)
   - ใช้ section ที่มีจริงใน HTML:
     #section-user-notification-channels
     #unc-user-select, #unc-refresh, #unc-tbody, #unc-total
   - Flow:
     1) admin: เลือก user จาก dropdown -> bootstrap(user_id) -> list(user_id)
     2) user: หา user_id จาก auth -> bootstrap(user_id) -> list(user_id)
 ========================= */

  const uncEls = {
    section: document.querySelector("#section-user-notification-channels"),
    userSelect: document.querySelector("#unc-user-select"),
    refresh: document.querySelector("#unc-refresh"),
    tbody: document.querySelector("#unc-tbody"),
    total: document.querySelector("#unc-total"),
  };

  const uncState = {
    userId: "",
    isAdmin: false,
    loading: false,
  };

  function refreshUncEls() {
    uncEls.section = document.querySelector("#section-user-notification-channels");
    uncEls.userSelect = document.querySelector("#unc-user-select");
    uncEls.refresh = document.querySelector("#unc-refresh");
    uncEls.tbody = document.querySelector("#unc-tbody");
    uncEls.total = document.querySelector("#unc-total");
  }

  function getAuthSnapshot() {
    // ✅ ปรับจุดนี้ให้ตรงกับระบบ auth ของคุณถ้าคุณมี global ชัดเจน
    const fromWin = window.__AUTH__ || window.AUTH || null;
    if (fromWin?.user) return fromWin.user;

    try {
      const raw = localStorage.getItem("auth_user") || localStorage.getItem("user") || "";
      if (raw) return JSON.parse(raw);
    } catch (_) { }

    return null;
  }

  function detectRole() {
    const u = getAuthSnapshot();
    const roleId = Number(u?.user_role_id ?? u?.role_id ?? 0);
    const userId = Number(u?.user_id ?? u?.id ?? 0);
    return { roleId, userId, isAdmin: roleId === 1 };
  }

  async function uncBootstrap(userId) {
    // POST /user-notification-channels/bootstrap
    // controller ของคุณรองรับ user_id ว่าง (จะ resolve จาก auth)
    if (!userId) {
      console.warn("[unc] userId is empty, skipping bootstrap");
      return { success: true };
    }

    return apiFetch(`/user-notification-channels/bootstrap`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: Number(userId) }),
    });
  }

  async function uncFetchUsersForDropdown() {
    // GET /user-notification-channels/users?q=&limit=
    return apiFetch(`/user-notification-channels/users?limit=200`, { method: "GET" });
  }

  async function uncFetchList(userId) {
    const qs = new URLSearchParams();
    qs.set("user_id", String(userId));
    qs.set("page", "1");
    qs.set("limit", "200");
    return apiFetch(`/user-notification-channels?${qs.toString()}`, { method: "GET" });
  }

  async function loadUncForUser(userId) {
    refreshUncEls();
    if (uncState.loading) return;
    uncState.loading = true;

    try {
      if (uncEls.tbody) uncEls.tbody.innerHTML = `<tr><td colspan="5" class="muted">กำลังโหลด...</td></tr>`;

      // ✅ 1) bootstrap อัตโนมัติ (สร้าง line/web ให้ครบตาม role)
      const boot = await uncBootstrap(userId);
      if (boot?.error) {
        // ถ้า bootstrap พัง ก็ยังพยายาม list ต่อ (เผื่อมีข้อมูลอยู่แล้ว)
        console.warn("[unc] bootstrap error:", boot?.message || boot);
      }

      // ✅ 2) list
      const res = await uncFetchList(userId);
      if (res?.error) throw new Error(res?.message || "Failed to load UNC");

      const items = res?.data ?? [];
      renderUncRows(items);

      if (uncEls.total) uncEls.total.textContent = `ทั้งหมด ${items.length} รายการ`;
    } catch (e) {
      console.error("[unc] load error:", e);
      if (uncEls.tbody) uncEls.tbody.innerHTML = `<tr><td colspan="5" class="muted">โหลดไม่สำเร็จ</td></tr>`;
      if (uncEls.total) uncEls.total.textContent = "";
    } finally {
      uncState.loading = false;
    }
  }

  // ✅ เรียก initUncSection() ใน init หลักของไฟล์ gcms-settings-data.js ของคุณ

  /* =========================
    Channels (Master)
    - GET /channels?q=&page=&limit=
    - CRUD (ของคุณมีปุ่ม add แต่ถ้ายังไม่ทำ modal ก็ปล่อยไว้ได้)
  ========================= */

  const channelsEls = {
    section: document.querySelector("#section-channels"),
    tbody: document.querySelector("#channel-tbody"),
    search: document.querySelector("#channel-search"),
    limit: document.querySelector("#channel-limit"),
    refresh: document.querySelector("#channel-refresh"),
    pagination: document.querySelector("#channel-pagination"),
    total: document.querySelector("#channel-total"),
    btnAdd: document.querySelector("#btn-add-channel"),
    modal: document.querySelector("#channel-modal"),
    form: document.querySelector("#channel-form"),
    modalTitle: document.querySelector("#channel-modal-title"),
    submitText: document.querySelector("#channel-submit-text"),
    inputId: document.querySelector("#channel-id"),
    inputName: document.querySelector("#channel-name"),
    formError: document.querySelector("#channel-form-error"),
  };

  const channelState = {
    q: "",
    page: 1,
    limit: 50,
    total: 0,
    loading: false,
  };

  function debounce(fn, ms = 250) {
    let t = null;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  }

  function renderPagination(container, { page, totalPages }, onPage) {
    if (!container) return;

    const tp = Math.max(1, Number(totalPages) || 1);
    const p = clampInt(page || 1, 1, tp);

    renderPager(container, { page: p, totalPages: tp });
    container.querySelectorAll("button[data-page]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.disabled) return;
        const next = toInt(btn.getAttribute("data-page"), 0);
        if (!next || next < 1 || next > tp) return;
        if (next === p) return;
        onPage(next);
      });
    });
  }

  async function channelsFetchList() {
    const qs = new URLSearchParams();
    if (channelState.q) qs.set("q", channelState.q);
    qs.set("page", String(channelState.page));
    qs.set("limit", String(channelState.limit));

    // ใช้ apiFetch จาก http.js (คุณ include แล้ว)
    return apiFetch(`/channels?${qs.toString()}`, { method: "GET" });
  }

  function renderChannelsRows(items = []) {
    if (!channelsEls.tbody) return;

    if (!items.length) {
      channelsEls.tbody.innerHTML = `<tr><td colspan="3" class="muted">ไม่พบข้อมูล</td></tr>`;
      return;
    }

    channelsEls.tbody.innerHTML = items
      .map((it) => {
        const id = it.channel_id ?? it.id ?? "-";
        const name = it.channel ?? it.channel_name ?? "-";

        return `
        <tr>
          <td>${escapeHtml(id)}</td>
          <td>${escapeHtml(name)}</td>
          <td>
            <button class="btn btn-ghost btn-sm"
              data-action="edit"
              data-id="${escapeHtml(id)}"
              data-name="${escapeHtml(name)}">
              แก้ไข
            </button>
            <button class="btn btn-danger btn-sm"
              data-action="delete"
              data-id="${escapeHtml(id)}">
              ลบ
            </button>
          </td>
        </tr>
      `;
      })
      .join("");
  }

  async function loadChannels() {
    if (channelState.loading) return;
    channelState.loading = true;

    try {
      if (channelsEls.tbody) {
        channelsEls.tbody.innerHTML = `<tr><td colspan="3" class="muted">กำลังโหลด...</td></tr>`;
      }

      const res = await channelsFetchList();
      if (res?.error) throw new Error(res?.message || "Failed to load channels");

      const items = res?.data ?? res?.items ?? [];
      const pg = res?.pagination ?? {};
      const page = Number(pg.page ?? channelState.page);
      const limit = Number(pg.limit ?? channelState.limit);
      const total = Number(pg.total ?? items.length);
      const totalPages = Number(pg.total_pages ?? pg.totalPages ?? Math.ceil(total / Math.max(1, limit)));

      channelState.total = total;

      renderChannelsRows(items);

      if (channelsEls.total) channelsEls.total.textContent = `ทั้งหมด ${total} รายการ`;
      renderPagination(channelsEls.pagination, { page, totalPages }, (p) => {
        channelState.page = p;
        loadChannels();
      });
    } catch (e) {
      if (channelsEls.tbody) {
        channelsEls.tbody.innerHTML = `<tr><td colspan="3" class="muted">โหลดข้อมูลไม่สำเร็จ</td></tr>`;
      }
      if (channelsEls.total) channelsEls.total.textContent = "";
      console.error("[channels] load error:", e);
    } finally {
      channelState.loading = false;
    }
  }

  function initChannelsSection() {
    if (!channelsEls.section) return;

    channelsEls.limit?.addEventListener("change", () => {
      channelState.limit = Number(channelsEls.limit.value || 50);
      channelState.page = 1;
      loadChannels();
    });

    channelsEls.search?.addEventListener(
      "input",
      debounce(() => {
        channelState.q = String(channelsEls.search.value || "").trim();
        channelState.page = 1;
        loadChannels();
      }, 250)
    );

    channelsEls.refresh?.addEventListener("click", () => {
      loadChannels();
    });
  }


  function openChannelModal({ mode, row = null } = {}) {
    if (!channelsEls.modal) return;

    if (channelsEls.formError) {
      channelsEls.formError.textContent = "";
      hide(channelsEls.formError);
    }

    const isEdit = mode === "edit";
    if (channelsEls.modalTitle) channelsEls.modalTitle.textContent = isEdit ? "แก้ไขช่องทางแจ้งเตือน" : "เพิ่มช่องทางแจ้งเตือน";
    if (channelsEls.submitText) channelsEls.submitText.textContent = isEdit ? "บันทึกการแก้ไข" : "บันทึก";

    if (channelsEls.inputId) channelsEls.inputId.value = isEdit ? String(row?.channel_id ?? "") : "";
    if (channelsEls.inputName) channelsEls.inputName.value = isEdit ? String(row?.channel ?? "") : "";

    show(channelsEls.modal);
    document.body.style.overflow = "hidden";
  }

  function closeChannelModal() {
    if (!channelsEls.modal) return;
    hide(channelsEls.modal);
    document.body.style.overflow = "";
  }

  // helper: พยายามหา role ของคนที่ล็อกอิน (ถ้าหาไม่ได้ ให้ถือว่า admin=false)
  function getAuthSnapshot() {
    // ปรับตามของโปรเจกต์คุณได้ ถ้าคุณมี global ที่ชัดเจน
    const fromWin = window.__AUTH__ || window.AUTH || null;
    if (fromWin?.user) return fromWin.user;

    // เผื่อคุณเก็บใน localStorage
    try {
      const raw = localStorage.getItem("auth_user") || localStorage.getItem("user") || "";
      if (raw) return JSON.parse(raw);
    } catch (_) { }

    return null;
  }

  function detectIsAdmin() {
    const u = getAuthSnapshot();
    const roleId = Number(u?.user_role_id ?? u?.role_id ?? 0);
    return roleId === 1;
  }

  async function uncFetchUsersForDropdown(q = "") {
    const qs = new URLSearchParams();
    if (q) qs.set("q", q);
    qs.set("limit", "200");
    return apiFetch(`/user-notification-channels/users?${qs.toString()}`, { method: "GET" });
  }

  async function uncFetchList(userId = "") {
    const qs = new URLSearchParams();
    // ถ้า backend ยังบังคับ user_id ต้องส่ง → ส่งไป
    // ถ้า backend รองรับ me แล้ว → userId ว่างก็ไม่เป็นไร
    if (userId) qs.set("user_id", String(userId));
    qs.set("page", "1");
    qs.set("limit", "200");
    return apiFetch(`/user-notification-channels?${qs.toString()}`, { method: "GET" });
  }

  async function uncUpdateEnable(id, enable) {
    const payload = { enable: enable ? 1 : 0 };
    console.log("[unc] Sending update payload:", payload);

    return UserNotificationChannelsAPI.update(id, { enable: enable ? 1 : 0 });
  }


  function renderUncRows(items = []) {
    if (!uncEls.tbody) return;

    if (!items.length) {
      uncEls.tbody.innerHTML = `<tr><td colspan="5" class="muted">ไม่พบข้อมูล</td></tr>`;
      return;
    }

    uncEls.tbody.innerHTML = items
      .map((it) => {
        const id = it.user_notification_channel_id ?? "-";
        const name = it.display_name ?? "-";
        const channelName = it.channel_name ?? it.channel ?? "-";
        // Support both `enable` and `is_enabled` field names from API
        const enable = Number(it.enable ?? it.is_enabled ?? 0) === 1;

        // ถ้าคุณต้องการ "line ห้ามปิด" ให้ disable checkbox เมื่อเป็น line
        const isLine = String(channelName).toLowerCase() === "line";
        const disabled = isLine ? "disabled" : "";

        return `
      <tr data-unc-id="${escapeHtml(id)}">
        <td>${escapeHtml(id)}</td>
        <td>${escapeHtml(name)}</td>
        <td>${escapeHtml(channelName)}</td>
        <td class="status-cell">
          <span class="status-badge status-badge--${enable ? "on" : "off"}">
            ${enable ? "เปิดการใช้งาน" : "ปิดการใช้งาน"}
          </span>
        </td>
        <td>
          <label class="toggle-inline">
            <span class="toggle toggle--gcms">
              <input class="unc-toggle" type="checkbox" ${enable ? "checked" : ""} ${disabled} />
              <span class="toggle__track"><span class="toggle__thumb"></span></span>
            </span>
          </label>
        </td>
      </tr>
      `;
      })
      .join("");

    // bind toggle
    uncEls.tbody.querySelectorAll(".unc-toggle").forEach((chk) => {
      chk.addEventListener("change", async (e) => {
        const tr = e.target.closest("tr");
        const id = tr?.getAttribute("data-unc-id");
        if (!id) return;

        const nextEnable = e.target.checked;

        // optimistic UI badge
        const badge = tr.querySelector(".status-badge");
        const baseClass = "status-badge " + Array.from(badge.classList).filter(c => !c.startsWith("status-badge--")).join(" ");
        if (badge) {
          badge.className = baseClass + " status-badge--" + (nextEnable ? "on" : "off");
          badge.textContent = nextEnable ? "เปิดการใช้งาน" : "ปิดการใช้งาน";
        }

        try {
          const res = await uncUpdateEnable(id, nextEnable);
          if (res?.error) throw new Error(res?.message || "update failed");
        } catch (err) {
          // revert
          e.target.checked = !nextEnable;
          const badge = tr.querySelector(".status-badge");
          const baseClass = "status-badge " + Array.from(badge.classList).filter(c => !c.startsWith("status-badge--")).join(" ");
          if (badge) {
            badge.className = baseClass + " status-badge--" + (!nextEnable ? "on" : "off");
            badge.textContent = (!nextEnable) ? "เปิดการใช้งาน" : "ปิดการใช้งาน";
          }
          console.error("[unc] update error:", err);
          alert("บันทึกสถานะไม่สำเร็จ");
        }
      });
    });
  }

  async function loadUserNotificationChannels() {
    if (uncState.loading) return;
    uncState.loading = true;

    try {
      if (uncEls.tbody) {
        uncEls.tbody.innerHTML = `<tr><td colspan="5" class="muted">กำลังโหลด...</td></tr>`;
      }

      // ✅ 1) bootstrap อัตโนมัติ (สร้าง line/web ให้ครบตาม role)
      if (uncState.userId) {
        const boot = await uncBootstrap(uncState.userId);
        if (boot?.error) {
          // ถ้า bootstrap พัง ก็ยังพยายาม list ต่อ (เผื่อมีข้อมูลอยู่แล้ว)
          console.warn("[unc] bootstrap error:", boot?.message || boot);
        }
      }

      // ✅ 2) list
      const res = await uncFetchList(uncState.userId);
      if (res?.error) throw new Error(res?.message || "Failed to load user notification channels");

      let items = res?.data ?? res?.items ?? [];

      // ✅ 3) filter by search
      if (uncState.q) {
        const q = String(uncState.q || "").toLowerCase();
        items = items.filter((it) =>
          String(it.display_name || "").toLowerCase().includes(q) ||
          String(it.channel_name || it.channel || "").toLowerCase().includes(q)
        );
      }

      renderUncRows(items);

      if (uncEls.total) uncEls.total.textContent = `ทั้งหมด ${items.length} รายการ`;
    } catch (e) {
      if (uncEls.tbody) {
        uncEls.tbody.innerHTML = `<tr><td colspan="5" class="muted">โหลดข้อมูลไม่สำเร็จ: ${escapeHtml(e.message)}</td></tr>`;
      }
      if (uncEls.total) uncEls.total.textContent = "";
      console.error("[unc] load error:", e);
    } finally {
      uncState.loading = false;
    }
  }

  async function initUncSection() {
    if (!uncEls.section) return;

    // detect role
    uncState.isAdmin = detectIsAdmin();

    // ถ้าไม่ใช่ admin: ซ่อน dropdown เลือกผู้ใช้ แล้วให้ backend ใช้ "me"
    if (!uncState.isAdmin) {
      if (uncEls.userSelect) {
        uncEls.userSelect.closest(".search-box")?.classList.add("muted");
        uncEls.userSelect.style.display = "none";
      }
      uncState.userId = ""; // ให้ backend resolve me
      await loadUserNotificationChannels();
    } else {
      // admin: โหลดรายชื่อ user เข้า dropdown
      if (uncEls.userSelect) {
        uncEls.userSelect.innerHTML = `<option value="">เลือกผู้ใช้งาน...</option>`;
        try {
          const res = await uncFetchUsersForDropdown("");
          if (!res?.error) {
            const items = res?.data ?? [];
            uncEls.userSelect.innerHTML =
              `<option value="">เลือกผู้ใช้งาน...</option>` +
              items
                .map((u) => `<option value="${escapeHtml(u.user_id)}">${escapeHtml(u.display_name)}</option>`)
                .join("");
          }
        } catch (e) {
          console.error("[unc] load users error:", e);
        }

        uncEls.userSelect.addEventListener("change", () => {
          uncState.userId = String(uncEls.userSelect.value || "");
          if (!uncState.userId) {
            uncEls.tbody.innerHTML = `<tr><td colspan="5" class="muted">เลือกผู้ใช้งานเพื่อแสดงรายการช่องทาง</td></tr>`;
            if (uncEls.total) uncEls.total.textContent = "";
            return;
          }
          loadUserNotificationChannels();
        });
      }
    }

    uncEls.refresh?.addEventListener("click", () => {
      loadUserNotificationChannels();
    });

    // ✅ search
    const searchInput = document.querySelector("#unc-search");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        uncState.q = String(e.target.value || "").trim();
        if (uncState.userId) {
          loadUserNotificationChannels();
        }
      });
    }
  }

  /* =========================
    Hook เข้า init หลักของหน้า
    - คุณมี init ของ gcms-settings-data.js อยู่แล้ว ให้เรียก 2 ตัวนี้เพิ่ม
  ========================= */

  // ถ้าไฟล์คุณมี DOMContentLoaded อยู่แล้ว ให้ "ไม่ต้อง" ซ้ำ
  // แต่ถ้าไม่มี ให้ใส่ไว้ท้ายไฟล์ได้เลย:
  document.addEventListener("DOMContentLoaded", () => {
    initChannelsSection();
    initUncSection();
    initTypeOfDeviceSection();
    initMainTypeOfDeviceSection();
  });

  // Organization Detail + Contact Modals
  // NOTE: the modal HTML may be injected/changed, so keep refs refreshable.
  const orgDetailEls = {
    modal: document.querySelector("#organization-detail-modal"),
    btnEdit: document.querySelector("#organization-detail-edit"),

    orgId: document.querySelector("#od-org-id"),
    orgCode: document.querySelector("#od-org-code"),
    orgName: document.querySelector("#od-org-name"),
    orgLocation: document.querySelector("#od-org-location"),
    province: document.querySelector("#od-province"),

    phone: document.querySelector("#od-phone"),
    fax: document.querySelector("#od-fax"),
    faxExt: document.querySelector("#od-fax-ext"),
    email: document.querySelector("#od-email"),
    facebook: document.querySelector("#od-facebook"),
    line: document.querySelector("#od-line"),
    map: document.querySelector("#od-map"),
    latlng: document.querySelector("#od-latlng"),
  };

  const orgContactEls = {
    modal: document.querySelector("#organization-contact-modal"),
    form: document.querySelector("#organization-contact-form"),
    err: document.querySelector("#organization-contact-form-error"),
    submitText: document.querySelector("#organization-contact-submit-text"),

    contactInfoId: document.querySelector("#oc-contact-info-id"),
    organizationId: document.querySelector("#oc-organization-id"),
    orgDisplay: document.querySelector("#oc-org-display"),

    phone: document.querySelector("#oc-phone"),
    email: document.querySelector("#oc-email"),
    fax: document.querySelector("#oc-fax"),
    faxExt: document.querySelector("#oc-fax-ext"),
    fbName: document.querySelector("#oc-facebook-name"),
    fbUrl: document.querySelector("#oc-facebook-url"),
    lineId: document.querySelector("#oc-line-id"),
    lineUrl: document.querySelector("#oc-line-url"),
    mapEmbed: document.querySelector("#oc-map-embed"),
    lat: document.querySelector("#oc-lat"),
    lng: document.querySelector("#oc-lng"),
  };

  function refreshOrgModalEls() {
    orgDetailEls.modal = document.querySelector("#organization-detail-modal");
    orgDetailEls.btnEdit = document.querySelector("#organization-detail-edit");
    orgDetailEls.orgId = document.querySelector("#od-org-id");
    orgDetailEls.orgCode = document.querySelector("#od-org-code");
    orgDetailEls.orgName = document.querySelector("#od-org-name");
    orgDetailEls.orgLocation = document.querySelector("#od-org-location");
    orgDetailEls.province = document.querySelector("#od-province");
    orgDetailEls.phone = document.querySelector("#od-phone");
    orgDetailEls.fax = document.querySelector("#od-fax");
    orgDetailEls.faxExt = document.querySelector("#od-fax-ext");
    orgDetailEls.email = document.querySelector("#od-email");
    orgDetailEls.facebook = document.querySelector("#od-facebook");
    orgDetailEls.line = document.querySelector("#od-line");
    orgDetailEls.map = document.querySelector("#od-map");
    orgDetailEls.latlng = document.querySelector("#od-latlng");

    orgContactEls.modal = document.querySelector("#organization-contact-modal");
    orgContactEls.form = document.querySelector("#organization-contact-form");
    orgContactEls.err = document.querySelector("#organization-contact-form-error");
    orgContactEls.submitText = document.querySelector("#organization-contact-submit-text");
    orgContactEls.contactInfoId = document.querySelector("#oc-contact-info-id");
    orgContactEls.organizationId = document.querySelector("#oc-organization-id");
    orgContactEls.orgDisplay = document.querySelector("#oc-org-display");
    orgContactEls.phone = document.querySelector("#oc-phone");
    orgContactEls.email = document.querySelector("#oc-email");
    orgContactEls.fax = document.querySelector("#oc-fax");
    orgContactEls.faxExt = document.querySelector("#oc-fax-ext");
    orgContactEls.fbName = document.querySelector("#oc-facebook-name");
    orgContactEls.fbUrl = document.querySelector("#oc-facebook-url");
    orgContactEls.lineId = document.querySelector("#oc-line-id");
    orgContactEls.lineUrl = document.querySelector("#oc-line-url");
    orgContactEls.mapEmbed = document.querySelector("#oc-map-embed");
    orgContactEls.lat = document.querySelector("#oc-lat");
    orgContactEls.lng = document.querySelector("#oc-lng");
  }

let _orgDetailCurrent = null; // เก็บ row ปัจจุบันที่เปิด detail
let _orgContactCurrent = null; // เก็บ row ปัจจุบันที่กำลังแก้ไข


async function loadContactInfoByOrganization(organizationId, orgFallbackQuery = "") {
  // ใช้ q เพื่อให้ได้ข้อมูลเร็วขึ้น (optional)
  const q = orgFallbackQuery ? String(orgFallbackQuery) : "";
  const res = await contactInfoApi.list({ q, page: 1, limit: 200 });

  const items = res?.data || res?.items || [];
  const found = items.find(x => Number(x.organization_id) === Number(organizationId));
  return found || null;
}

async function openOrgDetailModal(orgRow) {
  refreshOrgModalEls();
  _orgDetailCurrent = orgRow;

  if (!orgDetailEls.modal) {
    console.warn("[org] organization-detail-modal not found in DOM");
    return;
  }

  // เติมข้อมูลจาก organization ก่อน
  if (orgDetailEls.orgId) orgDetailEls.orgId.textContent = orgRow.organization_id ?? "-";
  if (orgDetailEls.orgCode) orgDetailEls.orgCode.textContent = orgRow.code ?? "-";
  if (orgDetailEls.orgName) orgDetailEls.orgName.textContent = orgRow.name ?? "-";
  if (orgDetailEls.orgLocation) orgDetailEls.orgLocation.textContent = orgRow.location ?? "-";
  if (orgDetailEls.province) {
    // NOTE: orgRow มาจาก dataset ของปุ่มในตาราง (province_name)
    // และบางครั้งมาจาก API (province_name_th / nameTH / nameEN)
    const direct =
      orgRow.province_nameTH ||
      orgRow.province_nameEN ||
      orgRow.province_name_th ||
      orgRow.province_name_en ||
      orgRow.province_name ||
      "";

    let label = String(direct || "").trim();

    // fallback: lookup label จาก <select> ที่โหลดไว้ (ใช้สำหรับกรณีมีแต่ province_id)
    if (!label) {
      const pid = String(orgRow.province_id || "").trim();
      if (pid) {
        try {
          const opt = orgEls?.selectProvince?.querySelector(`option[value="${CSS.escape(pid)}"]`);
          const optText = opt?.textContent || "";
          label = String(optText).trim();
        } catch (_) {
          // ignore
        }
      }
    }

    orgDetailEls.province.textContent = label || "-";
  }

  // ล้างค่าติดต่อก่อน
  if (orgDetailEls.phone) orgDetailEls.phone.textContent = "-";
  if (orgDetailEls.fax) orgDetailEls.fax.textContent = "-";
  if (orgDetailEls.faxExt) orgDetailEls.faxExt.textContent = "-";
  if (orgDetailEls.email) orgDetailEls.email.textContent = "-";
  if (orgDetailEls.facebook) orgDetailEls.facebook.textContent = "-";
  if (orgDetailEls.line) orgDetailEls.line.textContent = "-";
  if (orgDetailEls.map) orgDetailEls.map.textContent = "-";
  if (orgDetailEls.latlng) orgDetailEls.latlng.textContent = "-";

  // โหลด contact_info
  let ci = null;
  try {
    ci = await loadContactInfoByOrganization(orgRow.organization_id, orgRow.name || orgRow.code || "");
  } catch (e) {
    // ไม่ให้พัง แค่โชว์ไม่มีข้อมูล
    console.warn(e);
  }

  if (ci) {
    if (orgDetailEls.phone) orgDetailEls.phone.textContent = ci.phone_number || "-";
    if (orgDetailEls.fax) orgDetailEls.fax.textContent = ci.fax || "-";
    if (orgDetailEls.faxExt) orgDetailEls.faxExt.textContent = ci.fax_extension || "-";
    if (orgDetailEls.email) orgDetailEls.email.textContent = ci.email || "-";

    const fb = [ci.facebook_name, ci.facebook_url].filter(Boolean).join(" | ");
    if (orgDetailEls.facebook) orgDetailEls.facebook.textContent = fb || "-";

    const line = [ci.line_id, ci.line_url].filter(Boolean).join(" | ");
    if (orgDetailEls.line) orgDetailEls.line.textContent = line || "-";

    if (orgDetailEls.map) orgDetailEls.map.textContent = ci.map_embed_url ? "มี" : "-";
    const latlng = [ci.map_lat, ci.map_lng].filter(Boolean).join(", ");
    if (orgDetailEls.latlng) orgDetailEls.latlng.textContent = latlng || "-";
  }

  // ปุ่มแก้ไขใน detail -> เปิด modal edit
  if (orgDetailEls.btnEdit) {
    orgDetailEls.btnEdit.onclick = () => {
      closeModal("organization-detail-modal");
      openOrgContactModal(orgRow);
    };
  }

  openModal("organization-detail-modal");
}

async function openOrgContactModal(orgRow) {
  refreshOrgModalEls();
  _orgContactCurrent = orgRow;

  if (!orgContactEls.modal) {
    console.warn("[org] organization-contact-modal not found in DOM");
    return;
  }

  // reset error
  if (orgContactEls.err) {
    orgContactEls.err.hidden = true;
    orgContactEls.err.textContent = "";
  }

  // ใส่ org display
  if (orgContactEls.organizationId) orgContactEls.organizationId.value = orgRow.organization_id || "";
  if (orgContactEls.orgDisplay) orgContactEls.orgDisplay.value = `${orgRow.code || ""} ${orgRow.name || ""}`.trim();

  // ล้าง form ก่อน
  if (orgContactEls.contactInfoId) orgContactEls.contactInfoId.value = "";
  if (orgContactEls.phone) orgContactEls.phone.value = "";
  if (orgContactEls.email) orgContactEls.email.value = "";
  if (orgContactEls.fax) orgContactEls.fax.value = "";
  if (orgContactEls.faxExt) orgContactEls.faxExt.value = "";
  if (orgContactEls.fbName) orgContactEls.fbName.value = "";
  if (orgContactEls.fbUrl) orgContactEls.fbUrl.value = "";
  if (orgContactEls.lineId) orgContactEls.lineId.value = "";
  if (orgContactEls.lineUrl) orgContactEls.lineUrl.value = "";
  if (orgContactEls.mapEmbed) orgContactEls.mapEmbed.value = "";
  if (orgContactEls.lat) orgContactEls.lat.value = "";
  if (orgContactEls.lng) orgContactEls.lng.value = "";

  // โหลด contact_info ถ้ามี -> เติมค่า
  let ci = null;
  try {
    ci = await loadContactInfoByOrganization(orgRow.organization_id, orgRow.name || orgRow.code || "");
  } catch (e) {
    console.warn(e);
  }

  if (ci) {
    if (orgContactEls.contactInfoId) orgContactEls.contactInfoId.value = ci.contact_info_id || "";
    if (orgContactEls.phone) orgContactEls.phone.value = ci.phone_number || "";
    if (orgContactEls.email) orgContactEls.email.value = ci.email || "";
    if (orgContactEls.fax) orgContactEls.fax.value = ci.fax || "";
    if (orgContactEls.faxExt) orgContactEls.faxExt.value = ci.fax_extension || "";
    if (orgContactEls.fbName) orgContactEls.fbName.value = ci.facebook_name || "";
    if (orgContactEls.fbUrl) orgContactEls.fbUrl.value = ci.facebook_url || "";
    if (orgContactEls.lineId) orgContactEls.lineId.value = ci.line_id || "";
    if (orgContactEls.lineUrl) orgContactEls.lineUrl.value = ci.line_url || "";
    if (orgContactEls.mapEmbed) orgContactEls.mapEmbed.value = ci.map_embed_url || "";
    if (orgContactEls.lat) orgContactEls.lat.value = ci.map_lat || "";
    if (orgContactEls.lng) orgContactEls.lng.value = ci.map_lng || "";
  }

  openModal("organization-contact-modal");
}

if (orgContactEls.form) orgContactEls.form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const organization_id = Number(orgContactEls.organizationId?.value || 0);
  const contact_info_id = orgContactEls.contactInfoId?.value ? Number(orgContactEls.contactInfoId.value) : 0;

  const payload = {
    organization_id, // ใช้ตอน create
    phone_number: orgContactEls.phone?.value?.trim?.() || "",
    email: orgContactEls.email?.value?.trim?.() || "",
    fax: orgContactEls.fax?.value?.trim?.() || "",
    fax_extension: orgContactEls.faxExt?.value?.trim?.() || "",
    facebook_name: orgContactEls.fbName?.value?.trim?.() || "",
    facebook_url: orgContactEls.fbUrl?.value?.trim?.() || "",
    line_id: orgContactEls.lineId?.value?.trim?.() || "",
    line_url: orgContactEls.lineUrl?.value?.trim?.() || "",
    map_embed_url: orgContactEls.mapEmbed?.value?.trim?.() || "",
    map_lat: orgContactEls.lat?.value?.trim?.() || "",
    map_lng: orgContactEls.lng?.value?.trim?.() || "",
  };

  // แปลงค่าว่างเป็น null (กัน DB เก็บ "" )
  Object.keys(payload).forEach((k) => {
    if (k === "organization_id") return;
    if (payload[k] === "") payload[k] = null;
  });

  try {
    if (orgContactEls.submitText) orgContactEls.submitText.textContent = "กำลังบันทึก...";
    if (!contact_info_id) {
      await contactInfoApi.create(payload);
    } else {
      // update ไม่จำเป็นต้องส่ง organization_id (แต่ส่งไปก็ไม่เป็นไรถ้า backend ignore)
      const { organization_id: _, ...upd } = payload;
      await contactInfoApi.update(contact_info_id, upd);
    }

    closeModal("organization-contact-modal");
    // refresh org list เพื่อให้ข้อมูลใน UI อัพเดต (ถ้าคุณโชว์ข้อมูลติดต่อในตารางด้วย)
    // await loadOrganizations();
  } catch (err) {
    if (orgContactEls.err) {
      orgContactEls.err.hidden = false;
      orgContactEls.err.textContent = err?.message || String(err);
    }
  } finally {
    if (orgContactEls.submitText) orgContactEls.submitText.textContent = "บันทึก";
  }
});


  /* =========================
    TYPE OF DEVICE
  ========================= */

  const todEls = {
    section: $("#section-type-of-device"),
    tbody: $("#type-of-device-tbody"),
    search: $("#type-of-device-search"),
    limit: $("#type-of-device-limit"),
    refresh: $("#type-of-device-refresh"),
    pagination: $("#type-of-device-pagination"),
    total: $("#type-of-device-total"),

    btnAdd: $("#btn-add-type-of-device"),

    modal: $("#type-of-device-modal"),
    form: $("#type-of-device-form"),
    modalTitle: $("#type-of-device-modal-title"),
    submitText: $("#type-of-device-submit-text"),

    inputId: $("#type-of-device-id"),
    inputTitle: $("#type-of-device-title"),
    inputHasNetwork: $("#type-of-device-has-network"),
    hasNetworkText: $("#type-of-device-has-network-text"),
    inputIconOnline: $("#type-of-device-icon-online"),
    inputIconOffline: $("#type-of-device-icon-offline"),
    fileIconOnline: $("#type-of-device-icon-online-file"),
    fileIconOffline: $("#type-of-device-icon-offline-file"),

    // previews (selected file)
    previewOnlineWrap: $("#tod-icon-online-preview"),
    previewOnlineImg: $("#tod-icon-online-preview-img"),
    previewOnlineName: $("#tod-icon-online-preview-name"),
    previewOnlineClear: $("#tod-icon-online-clear"),

    previewOfflineWrap: $("#tod-icon-offline-preview"),
    previewOfflineImg: $("#tod-icon-offline-preview-img"),
    previewOfflineName: $("#tod-icon-offline-preview-name"),
    previewOfflineClear: $("#tod-icon-offline-clear"),
    linkIconOnline: $("#type-of-device-icon-online-link"),
    linkIconOffline: $("#type-of-device-icon-offline-link"),
    formError: $("#type-of-device-form-error"),
  };

  const todState = {
    q: "",
    page: 1,
    limit: 50,
    total: 0,
    loading: false,
  };

  async function todFetchList() {
    return TypeOfDeviceAPI.list({
      q: todState.q,
      page: todState.page,
      limit: todState.limit,
    });
  }

  function renderTodIconCell(path, { alt = "" } = {}) {
    const raw = String(path || "").trim();
    if (!raw) {
      return `<div class="gcms-icon-wrap is-empty"><span class="gcms-icon-fallback">-</span></div>`;
    }

    const url = todToPublicUrl(raw);
    const safeUrl = escapeHtml(url);
    const safeRaw = escapeHtml(raw);
    const safeAlt = escapeHtml(alt);

    return `
      <div class="gcms-icon-wrap" title="${safeRaw}">
        <a class="gcms-icon-link" href="${safeUrl}" target="_blank" rel="noopener">
          <img class="gcms-icon-thumb" src="${safeUrl}" alt="${safeAlt}"
            onerror="this.style.display='none'; if(this.parentNode){ this.parentNode.classList.add('is-broken'); }" />
          <span class="gcms-icon-fallback">ไม่พบรูป</span>
        </a>
        <div class="gcms-icon-path muted">${safeRaw}</div>
      </div>
    `;
  }

  function renderTypeOfDeviceRows(items = []) {
    if (!todEls.tbody) return;

    if (!items.length) {
      todEls.tbody.innerHTML = `<tr><td colspan="6" class="muted">ไม่พบข้อมูล</td></tr>`;
      return;
    }

    todEls.tbody.innerHTML = items.map((it) => {
      const id = it.type_of_device_id ?? "-";
      const title = it.type_of_device_title ?? "-";
      const hasNetwork = Number(it.has_network) === 1;

      const iconOnline = it.icon_path_online ?? "";
      const iconOffline = it.icon_path_offline ?? "";

      return `
      <tr>
        <td>${escapeHtml(id)}</td>
        <td>${escapeHtml(title)}</td>
        <td>
          <span class="status-badge status-badge--${hasNetwork ? "on" : "off"}">
            ${hasNetwork ? "มีเครือข่าย" : "ไม่มีเครือข่าย"}
          </span>
        </td>
        <td>${renderTodIconCell(iconOnline, { alt: "Icon Online" })}</td>
        <td>${renderTodIconCell(iconOffline, { alt: "Icon Offline" })}</td>
        <td>
          <button class="btn btn-ghost btn-sm"
            data-action="edit"
            data-id="${escapeHtml(id)}">
            แก้ไข
          </button>
          <button class="btn btn-danger btn-sm"
            data-action="delete"
            data-id="${escapeHtml(id)}">
            ลบ
          </button>
        </td>
      </tr>
    `;
    }).join("");
  }

  async function loadTypeOfDevice() {
    if (todState.loading) return;
    todState.loading = true;

    try {
      todEls.tbody.innerHTML = `<tr><td colspan="6" class="muted">กำลังโหลด...</td></tr>`;

      const res = await todFetchList();

      const items = res?.data ?? [];
      const pg = res?.pagination ?? {};

      const page = Number(pg.page ?? todState.page);
      const limit = Number(pg.limit ?? todState.limit);
      const total = Number(pg.total ?? items.length);
      const totalPages = Number(pg.total_pages ?? pg.totalPages ?? Math.ceil(total / Math.max(1, limit)));

      todState.total = total;

      renderTypeOfDeviceRows(items);

      todEls.total.textContent = `ทั้งหมด ${total} รายการ`;

      renderPagination(todEls.pagination, { page, totalPages }, (p) => {
        todState.page = p;
        loadTypeOfDevice();
      });

    } catch (e) {
      todEls.tbody.innerHTML = `<tr><td colspan="6" class="muted">โหลดข้อมูลไม่สำเร็จ</td></tr>`;
      console.error("[type-of-device] load error:", e);
    } finally {
      todState.loading = false;
    }
  }

  function initTypeOfDeviceSection() {
    if (!todEls.section) return;

    todEls.limit?.addEventListener("change", () => {
      todState.limit = Number(todEls.limit.value || 50);
      todState.page = 1;
      loadTypeOfDevice();
    });

    todEls.search?.addEventListener("input",
      debounce(() => {
        todState.q = String(todEls.search.value || "").trim();
        todState.page = 1;
        loadTypeOfDevice();
      }, 250)
    );

    todEls.refresh?.addEventListener("click", loadTypeOfDevice);

    todEls.inputHasNetwork?.addEventListener("change", () => {
      if (!todEls.hasNetworkText) return;
      todEls.hasNetworkText.textContent = todEls.inputHasNetwork.checked ? "รองรับเครือข่าย" : "ไม่รองรับเครือข่าย";
    });

    // previews for icon uploads (selected file)
    todEls._onlinePreviewCtl = todBindFilePreview({
      fileInput: todEls.fileIconOnline,
      wrap: todEls.previewOnlineWrap,
      img: todEls.previewOnlineImg,
      nameEl: todEls.previewOnlineName,
      clearBtn: todEls.previewOnlineClear,
    });

    todEls._offlinePreviewCtl = todBindFilePreview({
      fileInput: todEls.fileIconOffline,
      wrap: todEls.previewOfflineWrap,
      img: todEls.previewOfflineImg,
      nameEl: todEls.previewOfflineName,
      clearBtn: todEls.previewOfflineClear,
    });
  }

  function todToPublicUrl(path) {
    const p = String(path || "").trim();
    if (!p) return "";
    if (/^https?:\/\//i.test(p)) return p;
    // ถ้าเป็น path ที่ upload (เก็บเป็น /uploads/...) ให้ prefix ด้วย API_BASE (/ict8/backend/public)
    if (p.startsWith("/uploads/")) return `${API_BASE}${p}`;
    // อย่างอื่นถือว่าเป็น path/URL ที่เข้าถึงได้จากเว็บอยู่แล้ว
    return p;
  }

  function todSyncIconLinks() {
    const onlinePath = String(todEls.inputIconOnline?.value || "").trim();
    const offlinePath = String(todEls.inputIconOffline?.value || "").trim();

    if (todEls.linkIconOnline) {
      if (onlinePath) {
        todEls.linkIconOnline.hidden = false;
        todEls.linkIconOnline.href = todToPublicUrl(onlinePath);
        todEls.linkIconOnline.textContent = onlinePath;
      } else {
        todEls.linkIconOnline.hidden = true;
        todEls.linkIconOnline.href = "#";
        todEls.linkIconOnline.textContent = "";
      }
    }

    if (todEls.linkIconOffline) {
      if (offlinePath) {
        todEls.linkIconOffline.hidden = false;
        todEls.linkIconOffline.href = todToPublicUrl(offlinePath);
        todEls.linkIconOffline.textContent = offlinePath;
      } else {
        todEls.linkIconOffline.hidden = true;
        todEls.linkIconOffline.href = "#";
        todEls.linkIconOffline.textContent = "";
      }
    }
  }

  function todBindFilePreview({ fileInput, wrap, img, nameEl, clearBtn }) {
    if (!fileInput || !wrap || !img || !nameEl) return null;

    let objectUrl = "";

    const clearObjectUrl = () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        objectUrl = "";
      }
    };

    const hideWrap = () => wrap.setAttribute("hidden", "");
    const showWrap = () => wrap.removeAttribute("hidden");

    const clear = () => {
      clearObjectUrl();
      img.removeAttribute("src");
      nameEl.textContent = "";
      try {
        fileInput.value = "";
      } catch (_) {
        // ignore
      }
      hideWrap();
    };

    const showFile = (file) => {
      clearObjectUrl();
      objectUrl = URL.createObjectURL(file);
      img.src = objectUrl;
      nameEl.textContent = `${file.name} (${Math.round((file.size || 0) / 1024)} KB)`;
      showWrap();
    };

    fileInput.addEventListener("change", () => {
      const file = fileInput.files?.[0];
      if (!file) return clear();
      if (!/^image\//i.test(String(file.type || ""))) return clear();
      showFile(file);
    });

    clearBtn?.addEventListener("click", clear);

    // initial state
    hideWrap();

    return { clear, showFile };
  }


  /* ===== Modal helpers ===== */

  function openRequestSubTypeModal({ mode, row = null } = {}) {
    if (!requestSubTypeEls.modal) return;

    if (requestSubTypeEls.formError) {
      requestSubTypeEls.formError.textContent = "";
      hide(requestSubTypeEls.formError);
    }

    const isEdit = mode === "edit";
    if (requestSubTypeEls.modalTitle) requestSubTypeEls.modalTitle.textContent = isEdit ? "แก้ไขประเภทคำขอย่อย" : "เพิ่มประเภทคำขอย่อย";
    if (requestSubTypeEls.submitText) requestSubTypeEls.submitText.textContent = isEdit ? "บันทึกการแก้ไข" : "บันทึก";

    const id = row?.request_sub_type_id ?? row?.id ?? "";
    const name = row?.name ?? row?.sub_type_name ?? "";
    const desc = row?.discription ?? row?.description ?? ""; // ✅ ยึด discription
    const parent = row?.subtype_of ?? row?.request_type_id ?? "";

    if (requestSubTypeEls.inputId) requestSubTypeEls.inputId.value = isEdit ? String(id) : "";
    if (requestSubTypeEls.inputName) requestSubTypeEls.inputName.value = String(name || "");
    if (requestSubTypeEls.inputDesc) requestSubTypeEls.inputDesc.value = String(desc || "");

    // dropdown refs ก่อนค่อย set ค่า
    loadRequestSubTypeRefs().then(() => {
      if (requestSubTypeEls.selectType) requestSubTypeEls.selectType.value = parent ? String(parent) : "";
    });

    show(requestSubTypeEls.modal);
    document.body.style.overflow = "hidden";
  }

  function closeRequestSubTypeModal() {
    if (!requestSubTypeEls.modal) return;
    hide(requestSubTypeEls.modal);
    document.body.style.overflow = "";
  }


  function openRequestTypeModal({ mode, row = null } = {}) {
    if (!requestTypeEls.modal) return;

    if (requestTypeEls.formError) {
      requestTypeEls.formError.textContent = "";
      hide(requestTypeEls.formError);
    }

    const isEdit = mode === "edit";
    if (requestTypeEls.modalTitle) requestTypeEls.modalTitle.textContent = isEdit ? "แก้ไขประเภทคำขอ" : "เพิ่มประเภทคำขอ";
    if (requestTypeEls.submitText) requestTypeEls.submitText.textContent = isEdit ? "บันทึกการแก้ไข" : "บันทึก";

    const id = row?.request_type_id ?? row?.id ?? "";
    const name = row?.type_name ?? row?.name ?? "";
    const desc = row?.discription ?? row?.description ?? "";
    const url = row?.url_link ?? row?.url ?? "";

    if (requestTypeEls.inputId) requestTypeEls.inputId.value = isEdit ? String(id) : "";
    if (requestTypeEls.inputName) requestTypeEls.inputName.value = String(name || "");
    if (requestTypeEls.inputDesc) requestTypeEls.inputDesc.value = String(desc || "");
    if (requestTypeEls.inputUrl) requestTypeEls.inputUrl.value = String(url || "");

    show(requestTypeEls.modal);
    document.body.style.overflow = "hidden";
  }

  function closeRequestTypeModal() {
    if (!requestTypeEls.modal) return;
    hide(requestTypeEls.modal);
    document.body.style.overflow = "";
  }

  function openOrganizationModal({ mode, row = null } = {}) {
    if (!orgEls.modal) return;

    if (orgEls.formError) {
      orgEls.formError.textContent = "";
      hide(orgEls.formError);
    }

    const isEdit = mode === "edit";
    if (orgEls.modalTitle) orgEls.modalTitle.textContent = isEdit ? "แก้ไขหน่วยงาน" : "เพิ่มหน่วยงาน";
    if (orgEls.submitText) orgEls.submitText.textContent = isEdit ? "บันทึกการแก้ไข" : "บันทึก";

    if (orgEls.inputId) orgEls.inputId.value = isEdit ? String(row?.organization_id ?? "") : "";
    if (orgEls.inputCode) orgEls.inputCode.value = isEdit ? String(row?.code ?? "") : "";
    if (orgEls.inputName) orgEls.inputName.value = isEdit ? String(row?.name ?? "") : "";
    if (orgEls.inputLocation) orgEls.inputLocation.value = isEdit ? String(row?.location ?? "") : "";

    // set select
    if (orgEls.selectProvince) orgEls.selectProvince.value = isEdit ? String(row?.province_id ?? "") : "";
    if (orgEls.selectType) orgEls.selectType.value = isEdit ? String(row?.organization_type_id ?? "") : "";

    show(orgEls.modal);
    document.body.style.overflow = "hidden";
  }

  function closeOrganizationModal() {
    if (!orgEls.modal) return;
    hide(orgEls.modal);
    document.body.style.overflow = "";
  }

  function openOrgTypeModal({ mode, id = "", en = "", th = "" }) {
    if (!orgTypeEls.modal) return;

    const isEdit = mode === "edit";
    if (orgTypeEls.modalTitle) {
      orgTypeEls.modalTitle.textContent = isEdit ? "แก้ไขประเภทหน่วยงาน" : "เพิ่มประเภทหน่วยงาน";
    }
    if (orgTypeEls.submitText) {
      orgTypeEls.submitText.textContent = isEdit ? "บันทึกการแก้ไข" : "บันทึก";
    }

    if (orgTypeEls.inputId) orgTypeEls.inputId.value = String(id ?? "");
    if (orgTypeEls.inputEN) orgTypeEls.inputEN.value = String(en ?? "");
    if (orgTypeEls.inputTH) orgTypeEls.inputTH.value = String(th ?? "");

    show(orgTypeEls.modal);
    document.body.style.overflow = "hidden";
  }

  function closeOrgTypeModal() {
    if (!orgTypeEls.modal) return;
    hide(orgTypeEls.modal);
    document.body.style.overflow = "";
  }

  function openProvinceModal({ mode, id = "", nameEN = "", nameTH = "" }) {
    if (!provinceEls.modal) return;

    // reset error
    if (provinceEls.formError) {
      provinceEls.formError.textContent = "";
      hide(provinceEls.formError);
    }

    const isEdit = mode === "edit";
    if (provinceEls.modalTitle) provinceEls.modalTitle.textContent = isEdit ? "แก้ไขจังหวัด" : "เพิ่มจังหวัด";
    if (provinceEls.submitText) provinceEls.submitText.textContent = isEdit ? "บันทึกการแก้ไข" : "บันทึก";

    if (provinceEls.inputId) provinceEls.inputId.value = isEdit ? String(id) : "";
    if (provinceEls.inputEN) provinceEls.inputEN.value = nameEN || "";
    if (provinceEls.inputTH) provinceEls.inputTH.value = nameTH || "";

    show(provinceEls.modal);
    document.body.style.overflow = "hidden";
  }

  function closeProvinceModal() {
    if (!provinceEls.modal) return;
    hide(provinceEls.modal);
    document.body.style.overflow = "";
  }

  function openPersonPrefixModal({ mode, id = "", en = "", th = "" }) {
    if (!personPrefixEls.modal) return;

    const isEdit = mode === "edit";
    if (personPrefixEls.modalTitle) {
      personPrefixEls.modalTitle.textContent = isEdit ? "แก้ไขคำนำหน้าชื่อ" : "เพิ่มคำนำหน้าชื่อ";
    }
    if (personPrefixEls.submitText) {
      personPrefixEls.submitText.textContent = isEdit ? "บันทึกการแก้ไข" : "บันทึก";
    }

    if (personPrefixEls.inputId) personPrefixEls.inputId.value = String(id ?? "");
    if (personPrefixEls.inputEN) personPrefixEls.inputEN.value = String(en ?? "");
    if (personPrefixEls.inputTH) personPrefixEls.inputTH.value = String(th ?? "");

    show(personPrefixEls.modal);
    document.body.style.overflow = "hidden";
  }

  function closePersonPrefixModal() {
    if (!personPrefixEls.modal) return;
    hide(personPrefixEls.modal);
    document.body.style.overflow = "";
  }

  async function openDepartmentModal({ mode, id = "", code = "", title = "", organization_id = "" }) {
    if (departmentEls.formError) {
      departmentEls.formError.textContent = "";
      hide(departmentEls.formError);
    }

    departmentEls.modalTitle.textContent =
      mode === "edit" ? "แก้ไขฝ่ายผู้ใช้งาน" : "เพิ่มฝ่ายผู้ใช้งาน";
    departmentEls.submitText.textContent =
      mode === "edit" ? "บันทึกการแก้ไข" : "บันทึก";

    departmentEls.inputId.value = id || "";
    if (departmentEls.inputCode) departmentEls.inputCode.value = code || "";
    if (departmentEls.inputTitle) departmentEls.inputTitle.value = title || "";
    if (departmentEls.selectOrg) departmentEls.selectOrg.value = organization_id ? String(organization_id) : "";

    await loadDepartmentOrgOptions();

    if (departmentEls.selectOrg) {
      departmentEls.selectOrg.value = mode === "edit" && organization_id ? String(organization_id) : "";
    }

    show(departmentEls.modal);
    document.body.style.overflow = "hidden";
  }

  function closeDepartmentModal() {
    if (!departmentEls.modal) return;
    hide(departmentEls.modal);
    document.body.style.overflow = "";
  }

  function openPositionTitleModal({ mode, row = null } = {}) {
    if (!positionTitleEls.modal) return;

    if (positionTitleEls.formError) {
      positionTitleEls.formError.textContent = "";
      hide(positionTitleEls.formError);
    }

    const isEdit = mode === "edit";
    if (positionTitleEls.modalTitle) positionTitleEls.modalTitle.textContent = isEdit ? "แก้ไขตำแหน่ง" : "เพิ่มตำแหน่ง";
    if (positionTitleEls.submitText) positionTitleEls.submitText.textContent = isEdit ? "บันทึกการแก้ไข" : "บันทึก";

    if (positionTitleEls.inputId) positionTitleEls.inputId.value = isEdit ? String(row?.position_title_id ?? "") : "";
    if (positionTitleEls.inputCode) positionTitleEls.inputCode.value = isEdit ? String(row?.position_code ?? "") : "";
    if (positionTitleEls.inputTitle) positionTitleEls.inputTitle.value = isEdit ? String(row?.position_title ?? "") : "";

    // set select (org -> dept)
    const orgId = isEdit ? String(row?.organization_id ?? "") : "";
    const deptId = isEdit ? String(row?.department_id ?? "") : "";

    if (positionTitleEls.selectOrg) positionTitleEls.selectOrg.value = orgId;

    // โหลด dept ตาม org แล้วค่อย set ค่า
    loadPositionTitleDepartmentsByOrg(orgId, { target: "modal" }).then(() => {
      if (positionTitleEls.selectDept) positionTitleEls.selectDept.value = deptId;
    });


    show(positionTitleEls.modal);
    document.body.style.overflow = "hidden";
  }

  function closePositionTitleModal() {
    if (!positionTitleEls.modal) return;
    hide(positionTitleEls.modal);
    document.body.style.overflow = "";
  }

  function openUserRoleModal({ mode, id = "", code = "", role = "" }) {
    if (!userRoleEls.modal) return;

    // clear error
    if (userRoleEls.formError) {
      userRoleEls.formError.textContent = "";
      hide(userRoleEls.formError);
    }

    const isEdit = mode === "edit";
    if (userRoleEls.modalTitle) userRoleEls.modalTitle.textContent = isEdit ? "แก้ไขบทบาทผู้ใช้งาน" : "เพิ่มบทบาทผู้ใช้งาน";
    if (userRoleEls.submitText) userRoleEls.submitText.textContent = isEdit ? "บันทึกการแก้ไข" : "บันทึก";

    if (userRoleEls.inputId) userRoleEls.inputId.value = isEdit ? String(id) : "";
    if (userRoleEls.inputCode) userRoleEls.inputCode.value = code || "";
    if (userRoleEls.inputRole) userRoleEls.inputRole.value = role || "";

    show(userRoleEls.modal);
    document.body.style.overflow = "hidden";
  }

  function closeUserRoleModal() {
    if (!userRoleEls.modal) return;
    hide(userRoleEls.modal);
    document.body.style.overflow = "";
  }

  function openRequestStatusModal({ mode, row = null } = {}) {
    if (!requestStatusEls.modal) return;

    if (requestStatusEls.formError) {
      requestStatusEls.formError.textContent = "";
      hide(requestStatusEls.formError);
    }

    const isEdit = mode === "edit";
    if (requestStatusEls.modalTitle) requestStatusEls.modalTitle.textContent = isEdit ? "แก้ไขสถานะคำขอ" : "เพิ่มสถานะคำขอ";
    if (requestStatusEls.submitText) requestStatusEls.submitText.textContent = isEdit ? "บันทึกการแก้ไข" : "บันทึก";

    if (requestStatusEls.inputId)
      requestStatusEls.inputId.value = isEdit ? String(row?.status_id ?? "") : "";

    if (requestStatusEls.inputCode)
      requestStatusEls.inputCode.value = isEdit ? String(row?.status_code ?? "") : "";

    if (requestStatusEls.inputName)
      requestStatusEls.inputName.value = isEdit ? String(row?.status_name ?? "") : "";

    if (requestStatusEls.inputDesc)
      requestStatusEls.inputDesc.value = isEdit ? String(row?.meaning ?? "") : "";

    if (requestStatusEls.selectType)
      requestStatusEls.selectType.value = isEdit
        ? String(row?.request_type_id ?? "")
        : "";

    if (requestStatusEls.inputSort)
      requestStatusEls.inputSort.value = isEdit
        ? String(row?.sort_order ?? 1)
        : "1";


    show(requestStatusEls.modal);
    document.body.style.overflow = "hidden";
  }

  function closeRequestStatusModal() {
    if (!requestStatusEls.modal) return;
    hide(requestStatusEls.modal);
    document.body.style.overflow = "";
  }

  function openEventStatusModal({ mode, row = null } = {}) {
    refreshEventStatusEls();
    if (!eventStatusEls.modal) return;

    if (eventStatusEls.formError) {
      eventStatusEls.formError.textContent = "";
      hide(eventStatusEls.formError);
    }

    const isEdit = mode === "edit";
    if (eventStatusEls.modalTitle) eventStatusEls.modalTitle.textContent = isEdit ? "แก้ไขสถานะกิจกรรม" : "เพิ่มสถานะกิจกรรม";
    if (eventStatusEls.submitText) eventStatusEls.submitText.textContent = isEdit ? "บันทึกการแก้ไข" : "บันทึก";

    if (eventStatusEls.inputId) eventStatusEls.inputId.value = isEdit ? String(row?.event_status_id ?? "") : "";
    if (eventStatusEls.inputCode) eventStatusEls.inputCode.value = isEdit ? String(row?.status_code ?? "") : "";
    if (eventStatusEls.inputName) eventStatusEls.inputName.value = isEdit ? String(row?.status_name ?? "") : "";
    if (eventStatusEls.inputDesc) eventStatusEls.inputDesc.value = isEdit ? String(row?.meaning ?? "") : "";
    if (eventStatusEls.selectType) eventStatusEls.selectType.value = isEdit ? String(row?.request_type_id ?? "") : "";
    if (eventStatusEls.inputSort) eventStatusEls.inputSort.value = isEdit ? String(row?.sort_order ?? 1) : "1";

    show(eventStatusEls.modal);
    document.body.style.overflow = "hidden";
  }

  function closeEventStatusModal() {
    refreshEventStatusEls();
    if (!eventStatusEls.modal) return;
    hide(eventStatusEls.modal);
    document.body.style.overflow = "";
  }

  function openNotificationTypeModal(mode, row = null) {
    if (notificationTypeEls.formError) notificationTypeEls.formError.hidden = true;
    if (notificationTypeEls.form) notificationTypeEls.form.reset();

    const isEdit = mode === "edit";

    if (notificationTypeEls.modalTitle) {
      notificationTypeEls.modalTitle.textContent =
        isEdit ? "แก้ไขประเภทการแจ้งเตือน" : "เพิ่มประเภทการแจ้งเตือน";
    }

    if (notificationTypeEls.submitText) {
      notificationTypeEls.submitText.textContent =
        isEdit ? "บันทึกการแก้ไข" : "บันทึก";
    }

    if (notificationTypeEls.inputId) {
      notificationTypeEls.inputId.value =
        isEdit ? (row?.notification_type_id ?? row?.id ?? "") : "";
    }

    if (notificationTypeEls.inputName) {
      notificationTypeEls.inputName.value =
        isEdit ? (row?.notification_type ?? row?.name ?? "") : "";
    }

    if (notificationTypeEls.inputDesc) {
      notificationTypeEls.inputDesc.value =
        isEdit ? (row?.meaning ?? row?.description ?? row?.desc ?? "") : "";
    }

    if (notificationTypeEls.modal) {
      notificationTypeEls.modal.hidden = false;
      document.body.style.overflow = "hidden";
    }
  }

  function closeNotificationTypeModal() {
    if (notificationTypeEls.modal) {
      notificationTypeEls.modal.hidden = true;
      document.body.style.overflow = "";
    }
  }

  function openNotificationTypeStaffModal({ mode, row = null } = {}) {
    if (!notificationTypeStaffEls.modal) return;

    // Store current row for edit mode
    notificationTypeStaffEls.currentEditRow = row;

    if (notificationTypeStaffEls.formError) {
      notificationTypeStaffEls.formError.textContent = "";
      hide(notificationTypeStaffEls.formError);
    }

    const isEdit = mode === "edit";
    if (notificationTypeStaffEls.modalTitle)
      notificationTypeStaffEls.modalTitle.textContent = isEdit
        ? "แก้ไขการตั้งค่าการแจ้งเตือนสำหรับพนักงาน"
        : "เพิ่มการตั้งค่าการแจ้งเตือนสำหรับพนักงาน";

    if (notificationTypeStaffEls.inputId)
      notificationTypeStaffEls.inputId.value = isEdit
        ? String(row?.id ?? row?.notification_type_staff_id ?? "")
        : "";

    // ✅ เปิด modal ก่อน (optional แต่ช่วยให้ element มีอยู่แน่ ๆ)
    show(notificationTypeStaffEls.modal);
    document.body.style.overflow = "hidden";

    // Mode selection: create = show checkbox, edit = show display only
    const selectPersonUi = document.getElementById("notification-type-staff-person-ui");
    const displayPersonDiv = document.getElementById("nts-person-display");
    const displayPersonName = document.getElementById("nts-person-display-name");

    if (isEdit) {
      // Edit mode: show display only, hide select
      if (selectPersonUi) hide(selectPersonUi);
      if (displayPersonDiv) {
        show(displayPersonDiv);
        // Get person name from row object
        const personName = row?.display_name || "-";
        if (displayPersonName) displayPersonName.textContent = personName;
      }
    } else {
      // Create mode: show select, hide display
      if (selectPersonUi) show(selectPersonUi);
      if (displayPersonDiv) hide(displayPersonDiv);
    }

    // ✅ โหลด refs ก่อนค่อย set ค่า
    if (!isEdit) {
      // Only load checkbox list for create mode
      loadNotificationTypeStaffRefs().then(async () => {
        // 1) set notification type
        if (notificationTypeStaffEls.selectType) {
          notificationTypeStaffEls.selectType.value = "";
          notificationTypeStaffEls.selectType.disabled = false; // ✅ enable for create
        }
      });
    } else {
      // For edit mode, just set the notification type (read-only)
      if (notificationTypeStaffEls.selectType) {
        notificationTypeStaffEls.selectType.value = String(row?.notification_type_id ?? "");
        notificationTypeStaffEls.selectType.disabled = true;
      }
    }

    // toggle
    if (notificationTypeStaffEls.toggleEnabled) {
      const enabled = isEdit ? Boolean(row?.is_enabled || row?.enabled) : true;
      notificationTypeStaffEls.toggleEnabled.checked = enabled;
      if (notificationTypeStaffEls.toggleText)
        notificationTypeStaffEls.toggleText.textContent = enabled ? "เปิดการใช้งาน" : "ปิดการใช้งาน";
    }
  }


  function closeNotificationTypeStaffModal() {
    if (!notificationTypeStaffEls.modal) return;
    hide(notificationTypeStaffEls.modal);
    document.body.style.overflow = "";

    // Clear checkbox selection when closing modal
    window.ntsMultiSelectInstance?.clearSelection();
  }

  function openTypeOfDeviceModal({ mode, row = null } = {}) {
    if (!todEls.modal) return;

    if (todEls.formError) {
      todEls.formError.textContent = "";
      hide(todEls.formError);
    }

    const isEdit = mode === "edit";
    if (todEls.modalTitle) todEls.modalTitle.textContent = isEdit ? "แก้ไขประเภทอุปกรณ์" : "เพิ่มประเภทอุปกรณ์";
    if (todEls.submitText) todEls.submitText.textContent = isEdit ? "บันทึกการแก้ไข" : "บันทึก";

    if (todEls.inputId) todEls.inputId.value = isEdit ? String(row?.type_of_device_id ?? "") : "";
    if (todEls.inputTitle) todEls.inputTitle.value = isEdit ? String(row?.type_of_device_title ?? "") : "";
    if (todEls.inputHasNetwork) todEls.inputHasNetwork.checked = isEdit ? Boolean(row?.has_network) : false;

    if (todEls.inputIconOnline) todEls.inputIconOnline.value = isEdit ? String(row?.icon_path_online ?? "") : "";
    if (todEls.inputIconOffline) todEls.inputIconOffline.value = isEdit ? String(row?.icon_path_offline ?? "") : "";

    // reset file inputs (ให้เลือกไฟล์เดิมซ้ำได้)
    if (todEls.fileIconOnline) todEls.fileIconOnline.value = "";
    if (todEls.fileIconOffline) todEls.fileIconOffline.value = "";

    // reset previews
    todEls._onlinePreviewCtl?.clear?.();
    todEls._offlinePreviewCtl?.clear?.();

    if (todEls.hasNetworkText) {
      todEls.hasNetworkText.textContent = todEls.inputHasNetwork?.checked ? "รองรับเครือข่าย" : "ไม่รองรับเครือข่าย";
    }

    todSyncIconLinks();

    // edit mode: show existing icons as preview (optional but helpful)
    if (isEdit) {
      const onlinePath = String(row?.icon_path_online ?? "").trim();
      if (onlinePath && todEls.previewOnlineWrap && todEls.previewOnlineImg && todEls.previewOnlineName) {
        todEls.previewOnlineImg.src = todToPublicUrl(onlinePath);
        todEls.previewOnlineName.textContent = onlinePath;
        todEls.previewOnlineWrap.removeAttribute("hidden");
      }

      const offlinePath = String(row?.icon_path_offline ?? "").trim();
      if (offlinePath && todEls.previewOfflineWrap && todEls.previewOfflineImg && todEls.previewOfflineName) {
        todEls.previewOfflineImg.src = todToPublicUrl(offlinePath);
        todEls.previewOfflineName.textContent = offlinePath;
        todEls.previewOfflineWrap.removeAttribute("hidden");
      }
    }

    show(todEls.modal);
    document.body.style.overflow = "hidden";
  }

  function closeTypeOfDeviceModal() {
    if (!todEls.modal) return;
    hide(todEls.modal);
    document.body.style.overflow = "";

    // cleanup previews to avoid leaking object URLs
    todEls._onlinePreviewCtl?.clear?.();
    todEls._offlinePreviewCtl?.clear?.();
  }

  // ปิด modal เมื่อคลิกที่ overlay 
  document.addEventListener("click", (e) => {
    const closeId = e.target?.getAttribute?.("data-close");
    if (closeId === "org-type-modal") closeOrgTypeModal();
  });

  document.addEventListener("click", (e) => {
    const closeId = e.target?.getAttribute?.("data-close");
    if (closeId === "province-modal") {
      closeProvinceModal();
    }
  });

  document.addEventListener("click", (e) => {
    const closeId = e.target?.getAttribute?.("data-close");
    if (closeId === "organization-modal") closeOrganizationModal();
  });

  document.addEventListener("click", (e) => {
    const closeId = e.target?.getAttribute?.("data-close");
    if (closeId === "person-prefix-modal") closePersonPrefixModal();
  });

  document.addEventListener("click", (e) => {
    const closeId = e.target?.getAttribute?.("data-close");
    if (closeId === "department-modal") closeDepartmentModal();
  });

  document.addEventListener("click", (e) => {
    const closeId = e.target?.getAttribute?.("data-close");
    if (closeId === "position-title-modal") closePositionTitleModal();
  });

  document.addEventListener("click", (e) => {
    const closeId = e.target?.getAttribute?.("data-close");
    if (closeId === "user-role-modal") closeUserRoleModal();
  });

  document.addEventListener("click", (e) => {
    const closeId = e.target?.getAttribute?.("data-close");
    if (closeId === "user-detail-modal") closeUserDetailModal();
  });

  document.addEventListener("click", (e) => {
    const closeId = e.target?.getAttribute?.("data-close");
    if (closeId === "request-type-modal") closeRequestTypeModal();
  });

  document.addEventListener("click", (e) => {
    const closeId = e.target?.getAttribute?.("data-close");
    if (closeId === "request-sub-type-modal") closeRequestSubTypeModal();
  });

  document.addEventListener("click", (e) => {
    const closeId = e.target?.getAttribute?.("data-close");
    if (closeId === "request-status-modal") closeRequestStatusModal();
  });

  document.addEventListener("click", (e) => {
    const closeId = e.target?.getAttribute?.("data-close");
    if (closeId === "notification-type-modal") closeNotificationTypeModal();
  });

  document.addEventListener("click", (e) => {
    const closeId = e.target?.getAttribute?.("data-close");
    if (closeId === "notification-type-staff") closeNotificationTypeStaffModal();
  });

  document.addEventListener("click", (e) => {
    const closeId = e.target?.getAttribute?.("data-close");
    if (closeId === "channel-modal") closeChannelModal();
  });

  document.addEventListener("click", (e) => {
    const closeId = e.target?.getAttribute?.("data-close");
    if (closeId === "type-of-device-modal") closeTypeOfDeviceModal();
  });


  // กด ESC ปิด
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && orgTypeEls.modal && !orgTypeEls.modal.hidden) {
      closeOrgTypeModal();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && provinceEls.modal && !provinceEls.modal.hidden) {
      closeProvinceModal();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && orgEls.modal && !orgEls.modal.hidden) {
      closeOrganizationModal();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && personPrefixEls.modal && !personPrefixEls.modal.hidden) {
      closePersonPrefixModal();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && departmentEls.modal && !departmentEls.modal.hidden) {
      closeDepartmentModal();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && positionTitleEls.modal && !positionTitleEls.modal.hidden) {
      closePositionTitleModal();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && userRoleEls.modal && !userRoleEls.modal.hidden) {
      closeUserRoleModal();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && usersDetailEls.modal && !usersDetailEls.modal.hidden) {
      closeUserDetailModal();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && requestTypeEls.modal && !requestTypeEls.modal.hidden) {
      closeRequestTypeModal();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && requestSubTypeEls.modal && !requestSubTypeEls.modal.hidden) {
      closeRequestSubTypeModal();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && requestStatusEls.modal && !requestStatusEls.modal.hidden) {
      closeRequestStatusModal();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && notificationTypeEls.modal && !notificationTypeEls.modal.hidden) {
      closeNotificationTypeModal();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && notificationTypeStaffEls.modal && !notificationTypeStaffEls.modal.hidden) {
      closeNotificationTypeStaffModal();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && todEls.modal && !todEls.modal.hidden) {
      closeTypeOfDeviceModal();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && channelsEls.modal && !channelsEls.modal.hidden) {
      closeChannelModal();
    }
  });


  /* =========================
    LINK URL (RELATED WEBSITES)
  ========================= */
  const linkUrlEls = {
    section: $("#section-link-url"),
    tbody: $("#link-url-tbody"),
    search: $("#link-url-search"),
    limit: $("#link-url-limit"),
    refresh: $("#link-url-refresh"),
    pagination: $("#link-url-pagination"),
    total: $("#link-url-total"),

    btnAdd: $("#btn-add-link-url"),

    modalId: "link-url-modal",
    modalTitle: $("#link-url-modal-title"),
    submitText: $("#link-url-submit-text"),
    form: $("#link-url-form"),
    formError: $("#link-url-form-error"),

    inputId: $("#link-url-id"),
    inputTitle: $("#link-url-title"),
    inputUrl: $("#link-url-url"),
    inputContent: $("#link-url-content"),
    inputIsBanner: $("#link-url-is-banner"),
    isBannerText: $("#link-url-is-banner-text"),
  };

  const linkUrlState = {
    page: 1,
    limit: 50,
    q: "",
    total: 0,
    totalPages: 1,
    loading: false,
    inited: false,
  };

  function linkUrlSetError(msg) {
    if (!linkUrlEls.formError) return;
    if (!msg) {
      linkUrlEls.formError.hidden = true;
      linkUrlEls.formError.textContent = "";
      return;
    }
    linkUrlEls.formError.hidden = false;
    linkUrlEls.formError.textContent = String(msg);
  }

  function linkUrlSyncBannerText() {
    if (!linkUrlEls.inputIsBanner || !linkUrlEls.isBannerText) return;
    linkUrlEls.isBannerText.textContent = linkUrlEls.inputIsBanner.checked ? "เป็น Banner" : "ไม่เป็น Banner";
  }

  function linkUrlResetForm() {
    linkUrlSetError("");
    if (linkUrlEls.inputId) linkUrlEls.inputId.value = "";
    if (linkUrlEls.inputTitle) linkUrlEls.inputTitle.value = "";
    if (linkUrlEls.inputUrl) linkUrlEls.inputUrl.value = "";
    if (linkUrlEls.inputContent) linkUrlEls.inputContent.value = "";
    if (linkUrlEls.inputIsBanner) linkUrlEls.inputIsBanner.checked = false;
    linkUrlSyncBannerText();
  }

  function linkUrlOpenModal({ mode = "create", row } = {}) {
    if (!linkUrlEls.form) return;
    linkUrlSetError("");

    if (mode === "edit" && row) {
      if (linkUrlEls.modalTitle) linkUrlEls.modalTitle.textContent = "แก้ไขลิงก์ที่เกี่ยวข้อง";
      if (linkUrlEls.submitText) linkUrlEls.submitText.textContent = "บันทึกการแก้ไข";

      if (linkUrlEls.inputId) linkUrlEls.inputId.value = String(row.url_id ?? "");
      if (linkUrlEls.inputTitle) linkUrlEls.inputTitle.value = String(row.title ?? "");
      if (linkUrlEls.inputUrl) linkUrlEls.inputUrl.value = String(row.link_url ?? "");
      if (linkUrlEls.inputContent) linkUrlEls.inputContent.value = String(row.content ?? "");
      if (linkUrlEls.inputIsBanner) linkUrlEls.inputIsBanner.checked = Number(row.is_banner ?? 0) === 1;
    } else {
      if (linkUrlEls.modalTitle) linkUrlEls.modalTitle.textContent = "เพิ่มลิงก์ที่เกี่ยวข้อง";
      if (linkUrlEls.submitText) linkUrlEls.submitText.textContent = "บันทึก";
      linkUrlResetForm();
    }

    linkUrlSyncBannerText();
    openModal(linkUrlEls.modalId);
    setTimeout(() => linkUrlEls.inputTitle?.focus(), 0);
  }

  function linkUrlRenderPagination() {
    if (!linkUrlEls.pagination) return;
    linkUrlState.totalPages = calcTotalPages({
      total: linkUrlState.total,
      limit: linkUrlState.limit,
      totalPages: linkUrlState.totalPages,
    });
    renderPager(linkUrlEls.pagination, {
      page: linkUrlState.page,
      totalPages: linkUrlState.totalPages,
    });
  }

  function linkUrlRenderRows(items = []) {
    if (!linkUrlEls.tbody) return;
    if (!items.length) {
      linkUrlEls.tbody.innerHTML = `<tr><td colspan="5" class="muted">ไม่พบข้อมูล</td></tr>`;
      return;
    }

    linkUrlEls.tbody.innerHTML = items
      .map((r) => {
        const id = r.url_id ?? "";
        const title = r.title ?? "";
        const url = r.link_url ?? "";
        const isBanner = Number(r.is_banner ?? 0) === 1;

        const urlCell = url
          ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(url)}</a>`
          : `<span class="muted">-</span>`;

        return `
          <tr>
            <td>${escapeHtml(id)}</td>
            <td>${escapeHtml(title)}</td>
            <td>${urlCell}</td>
            <td>${isBanner ? "ใช่" : "ไม่"}</td>
            <td>
              <div class="table-actions">
                <button class="btn btn-outline btn-sm" type="button" data-action="edit"
                  data-id="${escapeHtml(id)}"
                  data-title="${escapeHtml(title)}"
                  data-url="${escapeHtml(url)}"
                  data-content="${escapeHtml(r.content ?? "") }"
                  data-is_banner="${isBanner ? "1" : "0"}">
                  <i class="fa-solid fa-pen"></i> แก้ไข
                </button>
                <button class="btn btn-danger btn-sm" type="button" data-action="delete" data-id="${escapeHtml(id)}" data-title="${escapeHtml(title)}">
                  <i class="fa-solid fa-trash"></i> ลบ
                </button>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");
  }

  async function loadLinkUrls() {
    if (linkUrlState.loading) return;
    if (!linkUrlEls.section) return;

    linkUrlState.loading = true;
    try {
      if (linkUrlEls.tbody) linkUrlEls.tbody.innerHTML = `<tr><td colspan="5" class="muted">กำลังโหลด...</td></tr>`;

      linkUrlState.q = String(linkUrlEls.search?.value || "").trim();
      linkUrlState.limit = Number(linkUrlEls.limit?.value || 50) || 50;

      const qs = new URLSearchParams();
      if (linkUrlState.q) qs.set("q", linkUrlState.q);
      qs.set("page", String(linkUrlState.page));
      qs.set("limit", String(linkUrlState.limit));

      const json = await apiFetch(`/link-urls?${qs.toString()}`, { method: "GET" });
      const data = json?.data || {};
      const items = data.items || [];
      const pg = data.pagination || {};

      linkUrlState.total = Number(pg.total || items.length || 0);
      linkUrlState.totalPages = Number(pg.total_pages || 1);
      linkUrlState.page = Number(pg.page || linkUrlState.page);
      linkUrlState.limit = Number(pg.limit || linkUrlState.limit);

      linkUrlRenderRows(items);
      linkUrlRenderPagination();
      if (linkUrlEls.total) linkUrlEls.total.textContent = `ทั้งหมด ${linkUrlState.total} รายการ`;
    } catch (err) {
      if (linkUrlEls.tbody) {
        linkUrlEls.tbody.innerHTML = `<tr><td colspan="5" class="muted">โหลดข้อมูลไม่สำเร็จ: ${escapeHtml(err?.message || String(err))}</td></tr>`;
      }
    } finally {
      linkUrlState.loading = false;
    }
  }

  function initLinkUrlSection() {
    if (!linkUrlEls.section) return;
    if (linkUrlState.inited) return;
    linkUrlState.inited = true;

    // search debounce
    let t = null;
    linkUrlEls.search?.addEventListener("input", () => {
      clearTimeout(t);
      t = setTimeout(() => {
        linkUrlState.page = 1;
        loadLinkUrls();
      }, 300);
    });

    linkUrlEls.limit?.addEventListener("change", () => {
      linkUrlState.page = 1;
      loadLinkUrls();
    });

    linkUrlEls.refresh?.addEventListener("click", () => {
      loadLinkUrls();
    });

    linkUrlEls.pagination?.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-page]");
      if (!btn || btn.disabled) return;
      const next = toInt(btn.getAttribute("data-page"), 0);
      if (!next || next < 1 || next > (linkUrlState.totalPages || 1)) return;
      if (next === linkUrlState.page) return;
      linkUrlState.page = next;
      loadLinkUrls();
    });

    linkUrlEls.btnAdd?.addEventListener("click", () => {
      linkUrlOpenModal({ mode: "create" });
    });

    linkUrlEls.inputIsBanner?.addEventListener("change", () => {
      linkUrlSyncBannerText();
    });

    // table actions
    linkUrlEls.tbody?.addEventListener("click", async (e) => {
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;
      const action = btn.getAttribute("data-action");
      const id = btn.getAttribute("data-id");
      if (!id) return;

      if (action === "edit") {
        linkUrlOpenModal({
          mode: "edit",
          row: {
            url_id: id,
            title: btn.getAttribute("data-title") || "",
            link_url: btn.getAttribute("data-url") || "",
            content: btn.getAttribute("data-content") || "",
            is_banner: btn.getAttribute("data-is_banner") || "0",
          },
        });
        return;
      }

      if (action === "delete") {
        const title = btn.getAttribute("data-title") || id;
        const okDel = confirm(`ยืนยันลบลิงก์ที่เกี่ยวข้อง\n\n- ${title}`);
        if (!okDel) return;

        try {
          await apiFetch(`/link-urls/${encodeURIComponent(id)}`, { method: "DELETE" });
          loadLinkUrls();
        } catch (err) {
          alert(err?.message || String(err));
        }
      }
    });

    // submit
    linkUrlEls.form?.addEventListener("submit", async (e) => {
      e.preventDefault();

      const id = String(linkUrlEls.inputId?.value || "").trim();
      const title = String(linkUrlEls.inputTitle?.value || "").trim();
      const link_url = String(linkUrlEls.inputUrl?.value || "").trim();
      const content = String(linkUrlEls.inputContent?.value || "");
      const is_banner = linkUrlEls.inputIsBanner?.checked ? 1 : 0;

      if (!title || !link_url) {
        linkUrlSetError("กรุณากรอกชื่อและ URL");
        return;
      }

      try {
        linkUrlSetError("");

        const payload = { title, link_url, content, is_banner };

        if (id) {
          await apiFetch(`/link-urls/${encodeURIComponent(id)}`, { method: "PUT", body: payload });
        } else {
          await apiFetch(`/link-urls`, { method: "POST", body: payload });
        }

        closeModal(linkUrlEls.modalId);
        loadLinkUrls();
      } catch (err) {
        linkUrlSetError(err?.message || String(err));
      }
    });
  }


  /* =========================
    DOCUMENTS (DOWNLOAD)
  ========================= */
  const docEls = {
    section: $("#section-related-documents"),
    tbody: $("#related-documents-tbody"),
    search: $("#related-documents-search"),
    limit: $("#related-documents-limit"),
    refresh: $("#related-documents-refresh"),
    pagination: $("#related-documents-pagination"),
    total: $("#related-documents-total"),

    btnAdd: $("#btn-add-related-document"),

    modalId: "related-documents-modal",
    modalTitle: $("#related-documents-modal-title"),
    submitText: $("#related-documents-submit-text"),
    form: $("#related-documents-form"),
    formError: $("#related-documents-form-error"),

    inputId: $("#related-documents-id"),
    inputTitle: $("#related-documents-title"),
    inputUrl: $("#related-documents-url"),
    fileUpload: $("#related-documents-file"),
    btnUpload: $("#related-documents-upload-btn"),
    uploadStatus: $("#related-documents-upload-status"),
    inputFilepath: $("#related-documents-filepath"),
    inputPrivate: $("#related-documents-private"),
    privateText: $("#related-documents-private-text"),
    inputActive: $("#related-documents-active"),
    activeText: $("#related-documents-active-text"),
  };

  const docState = {
    page: 1,
    limit: 50,
    q: "",
    total: 0,
    totalPages: 1,
    loading: false,
    inited: false,
  };

  function docSetError(msg) {
    if (!docEls.formError) return;
    if (!msg) {
      docEls.formError.hidden = true;
      docEls.formError.textContent = "";
      return;
    }
    docEls.formError.hidden = false;
    docEls.formError.textContent = String(msg);
  }

  function docSyncToggleText() {
    if (docEls.inputPrivate && docEls.privateText) {
      docEls.privateText.textContent = docEls.inputPrivate.checked ? "Private" : "Public";
    }
    if (docEls.inputActive && docEls.activeText) {
      docEls.activeText.textContent = docEls.inputActive.checked ? "ใช้งาน" : "ไม่ใช้งาน";
    }
  }

  function docResetForm() {
    docSetError("");
    if (docEls.inputId) docEls.inputId.value = "";
    if (docEls.inputTitle) docEls.inputTitle.value = "";
    if (docEls.inputUrl) docEls.inputUrl.value = "";
    if (docEls.inputFilepath) docEls.inputFilepath.value = "";
    if (docEls.fileUpload) docEls.fileUpload.value = "";
    if (docEls.uploadStatus) docEls.uploadStatus.textContent = "";
    if (docEls.inputPrivate) docEls.inputPrivate.checked = false;
    if (docEls.inputActive) docEls.inputActive.checked = true;
    docSyncToggleText();
  }

  function docToPublicUrl(path) {
    const p0 = String(path || "").trim();
    if (!p0) return "";
    if (/^https?:\/\//i.test(p0)) return p0;
    if (p0.startsWith("/uploads/")) return `${API_BASE}${p0}`;
    if (p0.startsWith("uploads/")) return `${API_BASE}/${p0}`;
    if (p0.startsWith("./uploads/")) return `${API_BASE}/${p0.replace(/^\.\//, "")}`;
    return p0;
  }

  function docSyncFilepathFromUrl() {
    const url = String(docEls.inputUrl?.value || "").trim();
    if (!docEls.inputFilepath) return;
    if (url) {
      docEls.inputFilepath.value = url;
      if (docEls.uploadStatus) docEls.uploadStatus.textContent = "";
      if (docEls.fileUpload) docEls.fileUpload.value = "";
    }
  }

  function docOpenModal({ mode = "create", row } = {}) {
    if (!docEls.form) return;
    docSetError("");

    if (mode === "edit" && row) {
      if (docEls.modalTitle) docEls.modalTitle.textContent = "แก้ไขเอกสารที่เกี่ยวข้อง";
      if (docEls.submitText) docEls.submitText.textContent = "บันทึกการแก้ไข";

      if (docEls.inputId) docEls.inputId.value = String(row.document_id ?? "");
      if (docEls.inputTitle) docEls.inputTitle.value = String(row.original_filename ?? "");
      if (docEls.inputFilepath) docEls.inputFilepath.value = String(row.filepath ?? "");
      if (docEls.inputUrl) {
        const fp = String(row.filepath ?? "").trim();
        docEls.inputUrl.value = /^https?:\/\//i.test(fp) ? fp : "";
      }
      if (docEls.fileUpload) docEls.fileUpload.value = "";
      if (docEls.uploadStatus) docEls.uploadStatus.textContent = "";
      if (docEls.inputPrivate) docEls.inputPrivate.checked = Number(row.is_private ?? 0) === 1;
      if (docEls.inputActive) docEls.inputActive.checked = Number(row.is_active ?? 1) === 1;
    } else {
      if (docEls.modalTitle) docEls.modalTitle.textContent = "เพิ่มเอกสารที่เกี่ยวข้อง";
      if (docEls.submitText) docEls.submitText.textContent = "บันทึก";
      docResetForm();
    }

    docSyncToggleText();
    openModal(docEls.modalId);
    setTimeout(() => docEls.inputTitle?.focus(), 0);
  }

  function docRenderPagination() {
    if (!docEls.pagination) return;
    docState.totalPages = calcTotalPages({
      total: docState.total,
      limit: docState.limit,
      totalPages: docState.totalPages,
    });

    renderPager(docEls.pagination, {
      page: docState.page,
      totalPages: docState.totalPages,
    });
  }

  function docRenderRows(items = []) {
    if (!docEls.tbody) return;
    if (!items.length) {
      docEls.tbody.innerHTML = `<tr><td colspan="6" class="muted">ไม่พบข้อมูล</td></tr>`;
      return;
    }

    docEls.tbody.innerHTML = items
      .map((r) => {
        const id = r.document_id ?? "";
        const title = r.original_filename ?? "";
        const filepath = r.filepath ?? "";
        const isPrivate = Number(r.is_private ?? 0) === 1;
        const isActive = Number(r.is_active ?? 1) === 1;

        const fileCell = filepath
          ? `<a href="${escapeHtml(docToPublicUrl(filepath))}" target="_blank" rel="noopener noreferrer">${escapeHtml(filepath)}</a>`
          : `<span class="muted">-</span>`;

        return `
          <tr>
            <td>${escapeHtml(id)}</td>
            <td>${escapeHtml(title)}</td>
            <td>${fileCell}</td>
            <td>${isPrivate ? "ใช่" : "ไม่"}</td>
            <td>${isActive ? "ใช่" : "ไม่"}</td>
            <td>
              <div class="table-actions">
                <button class="btn btn-outline btn-sm" type="button" data-action="edit"
                  data-id="${escapeHtml(id)}"
                  data-title="${escapeHtml(title)}"
                  data-filepath="${escapeHtml(filepath)}"
                  data-private="${isPrivate ? "1" : "0"}"
                  data-active="${isActive ? "1" : "0"}">
                  <i class="fa-solid fa-pen"></i> แก้ไข
                </button>
                <button class="btn btn-danger btn-sm" type="button" data-action="delete" data-id="${escapeHtml(id)}" data-title="${escapeHtml(title)}">
                  <i class="fa-solid fa-trash"></i> ลบ
                </button>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");
  }

  async function loadDocuments() {
    if (docState.loading) return;
    if (!docEls.section) return;

    docState.loading = true;
    try {
      if (docEls.tbody) docEls.tbody.innerHTML = `<tr><td colspan="6" class="muted">กำลังโหลด...</td></tr>`;

      docState.q = String(docEls.search?.value || "").trim();
      docState.limit = Number(docEls.limit?.value || 50) || 50;

      const qs = new URLSearchParams();
      if (docState.q) qs.set("q", docState.q);
      qs.set("page", String(docState.page));
      qs.set("limit", String(docState.limit));

      const json = await apiFetch(`/documents?${qs.toString()}`, { method: "GET" });
      const data = json?.data || {};
      const items = data.items || [];
      const pg = data.pagination || {};

      docState.total = Number(pg.total || items.length || 0);
      docState.totalPages = Number(pg.total_pages || 1);
      docState.page = Number(pg.page || docState.page);
      docState.limit = Number(pg.limit || docState.limit);

      docRenderRows(items);
      docRenderPagination();
      if (docEls.total) docEls.total.textContent = `ทั้งหมด ${docState.total} รายการ`;
    } catch (err) {
      if (docEls.tbody) {
        docEls.tbody.innerHTML = `<tr><td colspan="6" class="muted">โหลดข้อมูลไม่สำเร็จ: ${escapeHtml(err?.message || String(err))}</td></tr>`;
      }
    } finally {
      docState.loading = false;
    }
  }

  function initDocumentsSection() {
    if (!docEls.section) return;
    if (docState.inited) return;
    docState.inited = true;

    let t = null;
    docEls.search?.addEventListener("input", () => {
      clearTimeout(t);
      t = setTimeout(() => {
        docState.page = 1;
        loadDocuments();
      }, 300);
    });

    docEls.limit?.addEventListener("change", () => {
      docState.page = 1;
      loadDocuments();
    });

    docEls.refresh?.addEventListener("click", () => {
      loadDocuments();
    });

    docEls.pagination?.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-page]");
      if (!btn || btn.disabled) return;
      const next = toInt(btn.getAttribute("data-page"), 0);
      if (!next || next < 1 || next > (docState.totalPages || 1)) return;
      if (next === docState.page) return;
      docState.page = next;
      loadDocuments();
    });

    docEls.btnAdd?.addEventListener("click", () => {
      docOpenModal({ mode: "create" });
    });

    docEls.inputUrl?.addEventListener("input", () => {
      docSyncFilepathFromUrl();
    });

    docEls.btnUpload?.addEventListener("click", async () => {
      const file = docEls.fileUpload?.files?.[0];
      if (!file) {
        docSetError("กรุณาเลือกไฟล์ก่อนอัปโหลด");
        return;
      }

      try {
        docSetError("");
        if (docEls.uploadStatus) docEls.uploadStatus.textContent = "กำลังอัปโหลด...";

        const fd = new FormData();
        fd.append("file", file);

        const res = await apiFetch(`/documents/upload`, { method: "POST", body: fd });
        const info = res?.data || {};
        const path = String(info.path || "").trim();

        if (!path) throw new Error("อัปโหลดไม่สำเร็จ (ไม่พบ path)");

        if (docEls.inputFilepath) docEls.inputFilepath.value = path;
        if (docEls.inputUrl) docEls.inputUrl.value = "";

        if (docEls.inputTitle && !String(docEls.inputTitle.value || "").trim()) {
          docEls.inputTitle.value = String(info.original_filename || file.name || "").trim();
        }

        if (docEls.uploadStatus) {
          docEls.uploadStatus.textContent = `อัปโหลดแล้ว: ${String(info.original_filename || file.name || "")}`;
        }
      } catch (err) {
        if (docEls.uploadStatus) docEls.uploadStatus.textContent = "";
        docSetError(err?.message || String(err));
      }
    });

    docEls.inputPrivate?.addEventListener("change", docSyncToggleText);
    docEls.inputActive?.addEventListener("change", docSyncToggleText);

    docEls.tbody?.addEventListener("click", async (e) => {
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;
      const action = btn.getAttribute("data-action");
      const id = btn.getAttribute("data-id");
      if (!id) return;

      if (action === "edit") {
        docOpenModal({
          mode: "edit",
          row: {
            document_id: id,
            original_filename: btn.getAttribute("data-title") || "",
            filepath: btn.getAttribute("data-filepath") || "",
            is_private: btn.getAttribute("data-private") || "0",
            is_active: btn.getAttribute("data-active") || "1",
          },
        });
        return;
      }

      if (action === "delete") {
        const title = btn.getAttribute("data-title") || id;
        const okDel = confirm(`ยืนยันลบเอกสารที่เกี่ยวข้อง\n\n- ${title}`);
        if (!okDel) return;

        try {
          await apiFetch(`/documents/${encodeURIComponent(id)}`, { method: "DELETE" });
          loadDocuments();
        } catch (err) {
          alert(err?.message || String(err));
        }
      }
    });

    docEls.form?.addEventListener("submit", async (e) => {
      e.preventDefault();

      const id = String(docEls.inputId?.value || "").trim();
      const original_filename = String(docEls.inputTitle?.value || "").trim();
      const url = String(docEls.inputUrl?.value || "").trim();
      const filepath = url || String(docEls.inputFilepath?.value || "").trim();

      if (!original_filename || !filepath) {
        docSetError("กรุณากรอกชื่อไฟล์ และกรอก URL หรืออัปโหลดไฟล์");
        return;
      }

      const payload = {
        original_filename,
        filepath,
        is_private: docEls.inputPrivate?.checked ? 1 : 0,
        is_active: docEls.inputActive?.checked ? 1 : 0,
      };

      try {
        docSetError("");
        if (id) {
          await apiFetch(`/documents/${encodeURIComponent(id)}`, { method: "PUT", body: payload });
        } else {
          await apiFetch(`/documents`, { method: "POST", body: payload });
        }

        closeModal(docEls.modalId);
        loadDocuments();
      } catch (err) {
        docSetError(err?.message || String(err));
      }
    });
  }

  // init new sections (safe even if sections not present)
  initLinkUrlSection();
  initDocumentsSection();


  // คลิกเมนูซ้ายที่มี data-section
  document.addEventListener("click", async (e) => {
    const a = e.target.closest("a[data-section]");
    if (!a) return;

    e.preventDefault();
    const sectionKey = a.getAttribute("data-section");

    activateSection(sectionKey);

    if (sectionKey === "link-url") {
      linkUrlState.page = 1;
      linkUrlState.q = (linkUrlEls.search?.value || "").trim();
      linkUrlState.limit = Number(linkUrlEls.limit?.value || 50);
      loadLinkUrls();
    }

    if (sectionKey === "related-documents") {
      docState.page = 1;
      docState.q = (docEls.search?.value || "").trim();
      docState.limit = Number(docEls.limit?.value || 50);
      loadDocuments();
    }

    if (sectionKey === "organization-types") {
      orgTypeState.page = 1;
      orgTypeState.q = orgTypeEls.search?.value || "";
      orgTypeState.limit = Number(orgTypeEls.limit?.value || 50);
      loadOrgTypes();
    }

    if (sectionKey === "provinces") {
      // init state from controls
      provinceState.page = 1;
      provinceState.q = (provinceEls.search?.value || "").trim();
      provinceState.limit = Number(provinceEls.limit?.value || 50);
      loadProvinces();
    }

    if (sectionKey === "org-list") {
      // init state from controls
      orgState.page = 1;
      orgState.q = (orgEls.search?.value || "").trim();
      orgState.limit = Number(orgEls.limit?.value || 50);
      orgState.province_id = orgEls.filterProvince?.value || "";
      orgState.organization_type_id = orgEls.filterType?.value || "";

      await loadOrgRefs();
      await loadOrganizations();
    }

    if (sectionKey === "person-prefixes") {
      personPrefixState.page = 1;
      personPrefixState.q = (personPrefixEls.search?.value || "").trim();
      personPrefixState.limit = Number(personPrefixEls.limit?.value || 50);
      loadPersonPrefixes();
    }

    if (sectionKey === "departments") {
      departmentState.page = 1;
      departmentState.q = (departmentEls.search?.value || "").trim();
      departmentState.limit = Number(departmentEls.limit?.value || 50);
      departmentState.organization_id = departmentEls.filterOrg?.value || "";

      await loadDepartmentOrgRefs();
      await loadDepartments();
    }

    if (sectionKey === "position-titles") {
      positionTitleState.page = 1;
      positionTitleState.q = (positionTitleEls.search?.value || "").trim();
      positionTitleState.limit = Number(positionTitleEls.limit?.value || 50);
      positionTitleState.organization_id = positionTitleEls.filterOrganization?.value || "";
      positionTitleState.department_id = positionTitleEls.filterDepartment?.value || "";

      await loadPositionTitleRefs();
      await loadPositionTitles();
    }

    if (sectionKey === "user-roles") {
      userRoleState.page = 1;
      userRoleState.q = (userRoleEls.search?.value || "").trim();
      userRoleState.limit = Number(userRoleEls.limit?.value || 50);
      await loadUserRoles();
    }

    if (sectionKey === "user-setting") {
      settingUserState.page = 1;
      settingUserState.q = (settingUserEls.search?.value || "").trim();
      settingUserState.limit = Number(settingUserEls.limit?.value || 50);
      show(settingUserEls.section);

      await loadPendingUsers();
    }

    if (sectionKey === "users") {
      usersState.page = 1;
      usersState.q = (usersEls.search?.value || "").trim();
      usersState.limit = Number(usersEls.limit?.value || 50);
      usersState.organization_id = usersEls.filterOrg?.value || "";
      usersState.department_id = usersEls.filterDept?.value || "";
      usersState.position_title_id = usersEls.filterPos?.value || "";

      await loadUsersRefs();
      await loadUsers();
    }

    if (sectionKey === "request-types") {
      requestTypeState.page = 1;
      requestTypeState.q = (requestTypeEls.search?.value || "").trim();
      requestTypeState.limit = Number(requestTypeEls.limit?.value || 50);
      await loadRequestTypes();
    }

    if (sectionKey === "request-sub-types") {
      requestSubTypeState.page = 1;
      requestSubTypeState.q = (requestSubTypeEls.search?.value || "").trim();
      requestSubTypeState.limit = Number(requestSubTypeEls.limit?.value || 50);

      await loadRequestSubTypeRefs({ force: true });
      requestSubTypeState.subtype_of = Number(requestSubTypeEls.filterType?.value || 0);

      await loadRequestSubTypes();
    }

    if (sectionKey === "request-status") {
      requestStatusState.page = 1;
      requestStatusState.q = (requestStatusEls.search?.value || "").trim();
      requestStatusState.limit = Number(requestStatusEls.limit?.value || 50);

      await loadRequestStatusTypeRefs({ force: true });
      requestStatusState.request_type_id = Number(requestStatusEls.filterType?.value || 0);

      await loadRequestStatuses();
    }

    if (sectionKey === "event-status") {
      refreshEventStatusEls();

      eventStatusState.page = 1;
      eventStatusState.q = (eventStatusEls.search?.value || "").trim();
      eventStatusState.limit = Number(eventStatusEls.limit?.value || 50);

      await loadEventStatusTypeRefs({ force: true });
      eventStatusState.request_type_id = Number(eventStatusEls.filterType?.value || 0);

      await loadEventStatuses();
    }

    if (sectionKey === "head-of-request") {
      refreshHorEls();

      horState.page = 1;
      horState.q = (horEls.search?.value || "").trim();
      horState.limit = Number(horEls.limit?.value || 50);

      await loadHorTypeRefs({ force: true });
      horState.subtype_of = Number(horEls.filterType?.value || 0);

      await loadHeadOfRequest();
    }

    if (sectionKey === "urgency") {
      urgencyState.page = 1;
      urgencyState.q = (urgencyEls.search?.value || "").trim();
      urgencyState.limit = Number(urgencyEls.limit?.value || 50);

      await loadUrgency();
    }

    if (sectionKey === "notification-type") {
      notificationTypeState.page = 1;
      notificationTypeState.q = (notificationTypeEls.search?.value || "").trim();
      notificationTypeState.limit = Number(notificationTypeEls.limit?.value || 50);
      loadNotificationTypes();
    }

    if (sectionKey === "notification-type-staff") {
      notificationTypeStaffState.page = 1;
      notificationTypeStaffState.q = (notificationTypeStaffEls.search?.value || "").trim();
      notificationTypeStaffState.limit = Number(notificationTypeStaffEls.limit?.value || 50);
      notificationTypeStaffState.notification_type_id = Number(notificationTypeStaffEls.filterType?.value || 0);

      loadNotificationTypeStaff();
    }

    if (sectionKey === "channels") {
      channelState.page = 1;
      channelState.q = (channelsEls.search?.value || "").trim();
      channelState.limit = Number(channelsEls.limit?.value || 50);

      await loadChannels(); // ต้องมีฟังก์ชันนี้อยู่แล้วในไฟล์คุณ
    }

    if (sectionKey === "user-notification-channels") {
      // ให้ init section นี้ครั้งแรกตอนเปิดเมนู
      await initUncSection();

      // ถ้าเป็น user (ไม่ใช่ admin) initUncSection() จะโหลดของตัวเองให้แล้ว
      // ถ้าเป็น admin จะรอให้เลือกผู้ใช้งานใน dropdown (#unc-user-select)
    }

    if (sectionKey === "type-of-device") {
      todState.page = 1;
      todState.q = (todEls.search?.value || "").trim();
      todState.limit = Number(todEls.limit?.value || 50);
      loadTypeOfDevice();
    }

    if (sectionKey === "main-type-of-device") {
      // ใช้ state/els ของ section main-type-of-device (mtd*) ที่ประกาศไว้ด้านบน
      mtdState.page = 1;
      mtdState.q = (mtdEls.search?.value || "").trim();
      mtdState.limit = Number(mtdEls.limit?.value || 50);
      mainTypeOfDeviceLoad();
    }


  });

  // ปุ่มเพิ่มประเภทหน่วยงาน
  orgTypeEls.btnAdd?.addEventListener("click", () => {
    openOrgTypeModal({ mode: "create" });
  });

  // ปุ่มเพิ่มจังหวัด
  provinceEls.btnAdd?.addEventListener("click", () => {
    openProvinceModal({ mode: "create" });
  });

  // ปุ่มเพิ่มหน่วยงาน
  orgEls.btnAdd?.addEventListener("click", () => {
    openOrganizationModal({ mode: "create" });
  });

  // ปุ่มเพิ่มคำนำหน้าชื่อ
  personPrefixEls.btnAdd?.addEventListener("click", () => {
    openPersonPrefixModal({ mode: "create" });
  });

  // ปุ่มเพิ่มฝ่ายผู้ใช้งาน
  departmentEls.btnAdd?.addEventListener("click", async () => {
    await openDepartmentModal({ mode: "create" });
  });

  // ปุ่มเพิ่มตำแหน่ง
  positionTitleEls.btnAdd?.addEventListener("click", async () => {
    await openPositionTitleModal({ mode: "create" });
  });

  userRoleEls.btnAdd?.addEventListener("click", () => {
    openUserRoleModal({ mode: "create" });
  });

  requestTypeEls.btnAdd?.addEventListener("click", () => {
    openRequestTypeModal({ mode: "create" });
  });

  requestSubTypeEls.btnAdd?.addEventListener("click", async () => {
    await loadRequestSubTypeRefs();
    openRequestSubTypeModal({ mode: "create" });
  });

  requestStatusEls.btnAdd?.addEventListener("click", async () => {
    await loadRequestStatusTypeRefs();
    openRequestStatusModal({ mode: "create" });
  });

  eventStatusEls.btnAdd?.addEventListener("click", async () => {
    await loadEventStatusTypeRefs();
    openEventStatusModal({ mode: "create" });
  });

  urgencyEls.btnAdd?.addEventListener("click", () => {
    openUrgencyModal({ mode: "create" });
  });

  horEls.btnAdd?.addEventListener("click", async () => {
    await openHorModal({ mode: "create" });
  });

  notificationTypeEls.btnAdd?.addEventListener("click", () => {
    openNotificationTypeModal("create");
  });

  notificationTypeStaffEls.btnAdd?.addEventListener("click", async () => {
    await loadNotificationTypeStaffRefs();
    openNotificationTypeStaffModal({ mode: "create" });
  });

  channelsEls.btnAdd?.addEventListener("click", () => {
    openChannelModal({ mode: "create" });
  });

  // ปุ่มเพิ่มประเภทอุปกรณ์
  todEls.btnAdd?.addEventListener("click", () => {
    openTypeOfDeviceModal({ mode: "create" });
  });




  // ค้นหา
  orgTypeEls.search?.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    orgTypeState.page = 1;
    orgTypeState.q = (orgTypeEls.search.value || "").trim();
    loadOrgTypes();
  });

  provinceEls.search?.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    provinceState.page = 1;
    provinceState.q = (provinceEls.search.value || "").trim();
    loadProvinces();
  });

  orgEls.search?.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    orgState.page = 1;
    orgState.q = (orgEls.search.value || "").trim();
    loadOrganizations();
  });

  personPrefixEls.search?.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    personPrefixState.page = 1;
    personPrefixState.q = (personPrefixEls.search.value || "").trim();
    loadPersonPrefixes();
  });

  departmentEls.search?.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    departmentState.page = 1;
    departmentState.q = (departmentEls.search.value || "").trim();
    loadDepartments();
  });

  positionTitleEls.search?.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    positionTitleState.page = 1;
    positionTitleState.q = (positionTitleEls.search.value || "").trim();
    loadPositionTitles();
  });

  userRoleEls.search?.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    userRoleState.page = 1;
    userRoleState.q = (userRoleEls.search.value || "").trim();
    loadUserRoles();
  });

  settingUserEls.search?.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    settingUserState.page = 1;
    settingUserState.q = (settingUserEls.search.value || "").trim();
    loadPendingUsers();
  });

  usersEls.search?.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    usersState.page = 1;
    usersState.q = (usersEls.search.value || "").trim();
    loadUsers();
  });

  requestTypeEls.search?.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    requestTypeState.page = 1;
    requestTypeState.q = (requestTypeEls.search.value || "").trim();
    loadRequestTypes();
  });

  requestSubTypeEls.search?.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    requestSubTypeState.page = 1;
    requestSubTypeState.q = (requestSubTypeEls.search.value || "").trim();
    loadRequestSubTypes();
  });

  requestStatusEls.search?.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    requestStatusState.page = 1;
    requestStatusState.q = (requestStatusEls.search.value || "").trim();
    loadRequestStatuses();
  });

  eventStatusEls.search?.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    eventStatusState.page = 1;
    eventStatusState.q = (eventStatusEls.search.value || "").trim();
    loadEventStatuses();
  });

  urgencyEls.search?.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    urgencyState.page = 1;
    urgencyState.q = (urgencyEls.search.value || "").trim();
    loadUrgency();
  });

  horEls.search?.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    horState.page = 1;
    horState.q = (horEls.search.value || "").trim();
    loadHeadOfRequest();
  });

  notificationTypeEls.search?.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    notificationTypeState.page = 1;
    notificationTypeState.q = (notificationTypeEls.search.value || "").trim();
    loadNotificationTypes();
  });

  notificationTypeStaffEls.search?.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    notificationTypeStaffState.page = 1;
    notificationTypeStaffState.q = (notificationTypeStaffEls.search.value || "").trim();
    loadNotificationTypeStaff();
  });



  // เปลี่ยน limit
  orgTypeEls.limit?.addEventListener("change", () => {
    orgTypeState.page = 1;
    orgTypeState.limit = Number(orgTypeEls.limit.value || 50);
    loadOrgTypes();
  });

  provinceEls.limit?.addEventListener("change", () => {
    provinceState.page = 1;
    provinceState.limit = Number(provinceEls.limit.value || 50);
    loadProvinces();
  });

  orgEls.limit?.addEventListener("change", () => {
    orgState.page = 1;
    orgState.limit = Number(orgEls.limit.value || 50);
    loadOrganizations();
  });

  personPrefixEls.limit?.addEventListener("change", () => {
    personPrefixState.page = 1;
    personPrefixState.limit = Number(personPrefixEls.limit.value || 50);
    loadPersonPrefixes();
  });

  departmentEls.limit?.addEventListener("change", () => {
    departmentState.page = 1;
    departmentState.limit = Number(departmentEls.limit.value || 50);
    loadDepartments();
  });

  positionTitleEls.limit?.addEventListener("change", () => {
    positionTitleState.page = 1;
    positionTitleState.limit = Number(positionTitleEls.limit.value || 50);
    loadPositionTitles();
  });

  userRoleEls.limit?.addEventListener("change", () => {
    userRoleState.page = 1;
    userRoleState.limit = Number(userRoleEls.limit.value || 50);
    loadUserRoles();
  });

  settingUserEls.limit?.addEventListener("change", () => {
    settingUserState.page = 1;
    settingUserState.limit = Number(settingUserEls.limit.value || 50);
    loadPendingUsers();
  });

  usersEls.limit?.addEventListener("change", () => {
    usersState.page = 1;
    usersState.limit = Number(usersEls.limit.value || 50);
    loadUsers();
  });

  requestTypeEls.limit?.addEventListener("change", () => {
    requestTypeState.page = 1;
    requestTypeState.limit = Number(requestTypeEls.limit.value || 50);
    loadRequestTypes();
  });

  requestSubTypeEls.limit?.addEventListener("change", () => {
    requestSubTypeState.page = 1;
    requestSubTypeState.limit = Number(requestSubTypeEls.limit.value || 50);
    loadRequestSubTypes();
  });

  requestStatusEls.limit?.addEventListener("change", () => {
    requestStatusState.page = 1;
    requestStatusState.limit = Number(requestStatusEls.limit.value || 50);
    loadRequestStatuses();
  });

  eventStatusEls.limit?.addEventListener("change", () => {
    eventStatusState.page = 1;
    eventStatusState.limit = Number(eventStatusEls.limit.value || 50);
    loadEventStatuses();
  });

  urgencyEls.limit?.addEventListener("change", () => {
    urgencyState.page = 1;
    urgencyState.limit = Number(urgencyEls.limit.value || 50);
    loadUrgency();
  });

  horEls.limit?.addEventListener("change", () => {
    horState.page = 1;
    horState.limit = Number(horEls.limit.value || 50);
    loadHeadOfRequest();
  });

  notificationTypeEls.limit?.addEventListener("change", () => {
    notificationTypeState.page = 1;
    notificationTypeState.limit = Number(notificationTypeEls.limit.value || 50);
    loadNotificationTypes();
  });

  notificationTypeStaffEls.limit?.addEventListener("change", () => {
    notificationTypeStaffState.page = 1;
    notificationTypeStaffState.limit = Number(notificationTypeStaffEls.limit.value || 50);
    loadNotificationTypeStaff();
  });

  // รีเฟรช
  orgTypeEls.refresh?.addEventListener("click", () => {
    loadOrgTypes();
  });

  provinceEls.refresh?.addEventListener("click", () => {
    loadProvinces();
  });

  orgEls.refresh?.addEventListener("click", () => {
    loadOrganizations();
  });

  personPrefixEls.refresh?.addEventListener("click", () => {
    loadPersonPrefixes();
  });

  departmentEls.refresh?.addEventListener("click", () => {
    loadDepartments();
  });

  positionTitleEls.refresh?.addEventListener("click", () => {
    loadPositionTitles();
  });

  userRoleEls.refresh?.addEventListener("click", () => {
    loadUserRoles();
  });

  settingUserEls.refresh?.addEventListener("click", () => {
    loadPendingUsers();
  });

  usersEls.refresh?.addEventListener("click", () => {
    loadUsers();
  });

  requestTypeEls.refresh?.addEventListener("click", () => {
    loadRequestTypes();
  });

  requestSubTypeEls.refresh?.addEventListener("click", () => {
    loadRequestSubTypes();
  });

  requestStatusEls.refresh?.addEventListener("click", () => {
    loadRequestStatuses();
  });

  eventStatusEls.refresh?.addEventListener("click", () => {
    loadEventStatuses();
  });

  urgencyEls.refresh?.addEventListener("click", () => {
    loadUrgency();
  });

  horEls.refresh?.addEventListener("click", () => {
    loadHeadOfRequest();
  });

  notificationTypeEls.refresh?.addEventListener("click", () => {
    loadNotificationTypes();
  });

  notificationTypeStaffEls.refresh?.addEventListener("click", () => {
    loadNotificationTypeStaff();
  });




  // คลิก pagination
  orgTypeEls.pagination?.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-page]");
    if (!btn || btn.disabled) return;

    const next = Number(btn.getAttribute("data-page"));
    if (!next || next < 1 || next > orgTypeState.totalPages) return;

    orgTypeState.page = next;
    loadOrgTypes();
  });

  provinceEls.pagination?.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-page]");
    if (!btn || btn.disabled) return;

    const next = Number(btn.getAttribute("data-page"));
    if (!next || next < 1 || next > provinceState.totalPages) return;

    provinceState.page = next;
    loadProvinces();
  });

  orgEls.pagination?.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-page]");
    if (!btn || btn.disabled) return;

    const next = Number(btn.getAttribute("data-page"));
    if (!next || next < 1 || next > orgState.totalPages) return;

    orgState.page = next;
    loadOrganizations();
  });

  personPrefixEls.pagination?.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-page]");
    if (!btn || btn.disabled) return;

    const next = Number(btn.getAttribute("data-page"));
    if (!next || next < 1 || next > personPrefixState.totalPages) return;

    personPrefixState.page = next;
    loadPersonPrefixes();
  });

  departmentEls.pagination?.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-page]");
    if (!btn || btn.disabled) return;

    const next = Number(btn.getAttribute("data-page"));
    if (!next || next < 1 || next > departmentState.totalPages) return;

    departmentState.page = next;
    loadDepartments();
  });

  positionTitleEls.pagination?.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-page]");
    if (!btn || btn.disabled) return;

    const next = Number(btn.getAttribute("data-page"));
    if (!next || next < 1 || next > positionTitleState.totalPages) return;

    positionTitleState.page = next;
    loadPositionTitles();
  });

  usersEls.pagination?.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-page]");
    if (!btn || btn.disabled) return;

    const next = Number(btn.getAttribute("data-page"));
    if (!next || next < 1 || next > usersState.totalPages) return;

    usersState.page = next;
    loadUsers();
  });

  userRoleEls.pagination?.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-page]");
    if (!btn || btn.disabled) return;

    const next = Number(btn.getAttribute("data-page"));
    if (!next || next < 1 || next > userRoleState.totalPages) return;

    userRoleState.page = next;
    loadUserRoles();
  });

  settingUserEls.pagination?.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-page]");
    if (!btn || btn.disabled) return;

    const next = Number(btn.getAttribute("data-page"));
    if (!next || next < 1 || next > settingUserState.totalPages) return;

    settingUserState.page = next;
    loadPendingUsers();
  });

  requestTypeEls.pagination?.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-page]");
    if (!btn || btn.disabled) return;

    const next = Number(btn.getAttribute("data-page"));
    if (!next || next < 1 || next > requestTypeState.totalPages) return;

    requestTypeState.page = next;
    loadRequestTypes();
  });

  requestSubTypeEls.pagination?.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-page]");
    if (!btn || btn.disabled) return;

    const next = Number(btn.getAttribute("data-page"));
    if (!next || next < 1 || next > requestSubTypeState.totalPages) return;

    requestSubTypeState.page = next;
    loadRequestSubTypes();
  });

  requestStatusEls.pagination?.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-page]");
    if (!btn || btn.disabled) return;

    const next = Number(btn.getAttribute("data-page"));
    if (!next || next < 1 || next > requestStatusState.totalPages) return;

    requestStatusState.page = next;
    loadRequestStatuses();
  });

  eventStatusEls.pagination?.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-page]");
    if (!btn || btn.disabled) return;

    const next = Number(btn.getAttribute("data-page"));
    if (!next || next < 1 || next > eventStatusState.totalPages) return;

    eventStatusState.page = next;
    loadEventStatuses();
  });

  urgencyEls.pagination?.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-page]");
    if (!btn || btn.disabled) return;

    const next = Number(btn.getAttribute("data-page"));
    if (!next || next < 1 || next > urgencyState.totalPages) return;

    urgencyState.page = next;
    loadUrgency();
  });

  urgencyEls.tbody?.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;

    const action = btn.getAttribute("data-action");
    const id = btn.getAttribute("data-id");

    if (action === "edit") {
      openUrgencyModal({
        mode: "edit",
        row: {
          urgency_id: id,
          urgency_code: btn.getAttribute("data-code"),
          urgency_title: btn.getAttribute("data-title"),
          urgency_level: btn.getAttribute("data-level"),
        },
      });
      return;
    }

    if (action === "delete") {
      if (!id) return;
      const ok = confirm("ยืนยันลบความเร่งด่วน?\n\n* การลบอาจกระทบคำขอที่อ้างอิง");
      if (!ok) return;

      try {
        const api = window.UrgencyAPI || window.urgencyApi;
        if (!api?.remove) throw new Error("UrgencyAPI.remove not found");
        await api.remove(id);
        loadUrgency();
      } catch (err) {
        alert(err?.message || String(err));
      }
    }
  });

  urgencyEls.form?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const idRaw = String(urgencyEls.inputId?.value || "").trim();
    const code = String(urgencyEls.inputCode?.value || "").trim();
    const title = String(urgencyEls.inputTitle?.value || "").trim();
    const level = toInt(urgencyEls.inputLevel?.value, 0);

    if (!code) {
      setUrgencyError("กรุณากรอกรหัสความเร่งด่วน");
      urgencyEls.inputCode?.focus();
      return;
    }
    if (!title) {
      setUrgencyError("กรุณากรอกชื่อความเร่งด่วน");
      urgencyEls.inputTitle?.focus();
      return;
    }

    try {
      setUrgencyError("");
      const api = window.UrgencyAPI || window.urgencyApi;
      if (!api) throw new Error("UrgencyAPI not found");

      const payload = {
        urgency_code: code,
        urgency_title: title,
        urgency_level: level,
      };

      if (idRaw) {
        if (!api.update) throw new Error("UrgencyAPI.update not found");
        await api.update(idRaw, payload);
      } else {
        if (!api.create) throw new Error("UrgencyAPI.create not found");
        await api.create(payload);
      }

      closeUrgencyModal();
      loadUrgency();
    } catch (err) {
      setUrgencyError(err?.message || String(err));
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && urgencyEls.modal && !urgencyEls.modal.hidden) {
      closeUrgencyModal();
    }
  });

  horEls.pagination?.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-page]");
    if (!btn || btn.disabled) return;

    const next = Number(btn.getAttribute("data-page"));
    if (!next || next < 1 || next > horState.totalPages) return;

    horState.page = next;
    loadHeadOfRequest();
  });

  notificationTypeEls.pagination?.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-page]");
    if (!btn || btn.disabled) return;

    const next = Number(btn.getAttribute("data-page"));
    if (!next || next < 1 || next > notificationTypeState.totalPages) return;

    notificationTypeState.page = next;
    loadNotificationTypes();
  });

  notificationTypeStaffEls.pagination?.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-page]");
    if (!btn || btn.disabled) return;

    const next = Number(btn.getAttribute("data-page"));
    if (!next || next < 1 || next > notificationTypeStaffState.totalPages) return;

    notificationTypeStaffState.page = next;
    loadNotificationTypeStaff();
  });


  // คลิก edit/delete ในตาราง
  orgTypeEls.tbody?.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;

    const action = btn.getAttribute("data-action");
    const id = btn.getAttribute("data-id");

    if (action === "edit") {
      const en = btn.getAttribute("data-en") || "";
      const th = btn.getAttribute("data-th") || "";
      openOrgTypeModal({ mode: "edit", id, en, th });
      return;
    }

    if (action === "delete") {
      const ok = confirm(`ต้องการลบประเภทหน่วยงาน ID ${id} ใช่ไหม?`);
      if (!ok) return;

      try {
        await apiFetch(`/organization-types/${encodeURIComponent(id)}`, { method: "DELETE" });

        if (orgTypeState.page > 1) {
          // reload แล้วเช็คว่ามีรายการเหลือไหมด้วยการลด page แบบปลอดภัย
          // (ง่ายสุด: reload ปัจจุบันก่อน ถ้า totalPages ลด ให้ปรับ)
          await loadOrgTypes();
          if (orgTypeState.page > orgTypeState.totalPages) {
            orgTypeState.page = orgTypeState.totalPages;
            await loadOrgTypes();
          }
        } else {
          await loadOrgTypes();
        }
      } catch (err) {
        alert(`ลบไม่สำเร็จ: ${err.message}`);
      }
    }
  });

  provinceEls.tbody?.addEventListener("click", async (e) => {
    const actionBtn = e.target.closest("button[data-action]");
    if (!actionBtn) return;

    const action = actionBtn.getAttribute("data-action");
    const id = actionBtn.getAttribute("data-id");

    if (action === "edit") {
      const nameEN = actionBtn.getAttribute("data-nameen") || "";
      const nameTH = actionBtn.getAttribute("data-nameth") || "";
      openProvinceModal({ mode: "edit", id, nameEN, nameTH });
      return;
    }

    if (action === "delete") {
      const ok = confirm(`ต้องการลบจังหวัด ID ${id} ใช่ไหม?`);
      if (!ok) return;

      try {
        await apiFetch(`/provinces/${encodeURIComponent(id)}`, { method: "DELETE" });
        // ถ้าหน้าสุดท้ายลบจนหมด ให้ถอยหน้ากลับ
        if (provinceState.page > 1) {
          // reload แล้วเช็คว่ามีรายการเหลือไหมด้วยการลด page แบบปลอดภัย
          // (ง่ายสุด: reload ปัจจุบันก่อน ถ้า totalPages ลด ให้ปรับ)
          await loadProvinces();
          if (provinceState.page > provinceState.totalPages) {
            provinceState.page = provinceState.totalPages;
            await loadProvinces();
          }
        } else {
          await loadProvinces();
        }
      } catch (err) {
        alert(`ลบไม่สำเร็จ: ${err.message}`);
      }
    }
  });

orgEls.tbody?.addEventListener("click", async (e) => {
  const actionBtn = e.target.closest("button[data-action]");
  if (!actionBtn) return;

  const action = actionBtn.getAttribute("data-action");
  const id = actionBtn.getAttribute("data-id");

  // ✅ helper: อ่าน row จาก dataset ของปุ่ม (ใช้ร่วมกันทุก action)
  const rowFromBtn = () => ({
    organization_id: id,
    code: actionBtn.getAttribute("data-code") || "",
    name: actionBtn.getAttribute("data-name") || "",
    location: actionBtn.getAttribute("data-location") || "",
    province_id: actionBtn.getAttribute("data-province_id") || "",
    organization_type_id: actionBtn.getAttribute("data-organization_type_id") || "",

    // ✅ เพิ่มสำหรับ modal รายละเอียด
    province_name: actionBtn.getAttribute("data-province_name") || "",
    type_name: actionBtn.getAttribute("data-type_name") || "",
  });

  // ✅ ใหม่: รายละเอียดหน่วยงาน (Organization Detail Modal)
  if (action === "detail") {
    const row = rowFromBtn();
    // คุณต้องมีฟังก์ชันนี้ในไฟล์ (เดี๋ยวทำต่อให้ได้)
    openOrgDetailModal(row);
    return;
  }

  // ✅ ใหม่: แก้ไขรายละเอียด (Contact Info Modal)
  if (action === "contact") {
    const row = rowFromBtn();
    // คุณต้องมีฟังก์ชันนี้ในไฟล์ (เดี๋ยวทำต่อให้ได้)
    openOrgContactModal(row);
    return;
  }

  // เดิม: แก้ไข organization
  if (action === "edit") {
    const row = rowFromBtn();
    openOrganizationModal({ mode: "edit", row });
    return;
  }

  // เดิม: ลบ organization
  if (action === "delete") {
    const ok = confirm(`ต้องการลบหน่วยงาน ID ${id} ใช่ไหม?`);
    if (!ok) return;

    try {
      await apiFetch(`/organizations/${encodeURIComponent(id)}`, { method: "DELETE" });

      // ถ้าหน้าสุดท้ายลบจนหมด ให้ถอยหน้ากลับ
      if (orgState.page > 1) {
        await loadOrganizations();
        if (orgState.page > orgState.totalPages) {
          orgState.page = orgState.totalPages;
          await loadOrganizations();
        }
      } else {
        await loadOrganizations();
      }
    } catch (err) {
      alert(`ลบไม่สำเร็จ: ${err.message}`);
    }
  }
});

  personPrefixEls.tbody?.addEventListener("click", async (e) => {
    const actionBtn = e.target.closest("button[data-action]");
    if (!actionBtn) return;

    const action = actionBtn.getAttribute("data-action");
    const id = actionBtn.getAttribute("data-id");

    if (action === "edit") {
      const en = actionBtn.getAttribute("data-en") || "";
      const th = actionBtn.getAttribute("data-th") || "";
      openPersonPrefixModal({ mode: "edit", id, en, th });
      return;
    }

    if (action === "delete") {
      const ok = confirm(`ต้องการลบคำนำหน้าชื่อ ID ${id} ใช่ไหม?`);
      if (!ok) return;

      try {
        await apiFetch(`/person-prefixes/${encodeURIComponent(id)}`, { method: "DELETE" });

        // ถ้าหน้าสุดท้ายลบจนหมด ให้ถอยหน้ากลับ
        if (personPrefixState.page > 1) {
          // reload แล้วเช็คว่ามีรายการเหลือไหมด้วยการลด page แบบปลอดภัย
          // (ง่ายสุด: reload ปัจจุบันก่อน ถ้า totalPages ลด ให้ปรับ )
          await loadPersonPrefixes();
          if (personPrefixState.page > personPrefixState.totalPages) {
            personPrefixState.page = personPrefixState.totalPages;
            await loadPersonPrefixes();
          }
        } else {
          await loadPersonPrefixes();
        }
      } catch (err) {
        alert(`ลบไม่สำเร็จ: ${err.message}`);
      }
    }
  });

  departmentEls.tbody?.addEventListener("click", async (e) => {
    const actionBtn = e.target.closest("button[data-action]");
    if (!actionBtn) return;

    const action = actionBtn.getAttribute("data-action");
    const id = actionBtn.getAttribute("data-id");

    if (action === "edit") {
      const code = actionBtn.getAttribute("data-code") || "";
      const title = actionBtn.getAttribute("data-title") || "";
      const organization_id = actionBtn.getAttribute("data-org") || "";
      openDepartmentModal({ mode: "edit", id, code, title, organization_id });
      return;
    }

    if (action === "delete") {
      const ok = confirm(`ต้องการลบฝ่ายผู้ใช้งาน ID ${id} ใช่ไหม?`);
      if (!ok) return;

      try {
        await apiFetch(`/departments/${encodeURIComponent(id)}`, { method: "DELETE" });

        await loadDepartments();
        if (departmentState.page > departmentState.totalPages) {
          departmentState.page = departmentState.totalPages;
          await loadDepartments();
        }
      } catch (err) {
        alert(`ลบไม่สำเร็จ: ${err.message}`);
      }
    }
  });

  positionTitleEls.tbody?.addEventListener("click", async (e) => {
    const actionBtn = e.target.closest("button[data-action]");
    if (!actionBtn) return;

    const action = actionBtn.getAttribute("data-action");
    const id = actionBtn.getAttribute("data-id");

    if (action === "edit") {
      const row = {
        position_title_id: id,
        position_code: actionBtn.getAttribute("data-code") || "",
        position_title: actionBtn.getAttribute("data-title") || "",
        organization_id: actionBtn.getAttribute("data-organization_id") || "",
        department_id: actionBtn.getAttribute("data-department_id") || "",
      };
      openPositionTitleModal({ mode: "edit", row });
      return;
    }

    if (action === "delete") {
      const ok = confirm(`ต้องการลบตำแหน่ง ID ${id} ใช่ไหม?`);
      if (!ok) return;

      try {
        await apiFetch(`/position-titles/${encodeURIComponent(id)}`, { method: "DELETE" });

        await loadPositionTitles();
        if (positionTitleState.page > positionTitleState.totalPages) {
          positionTitleState.page = positionTitleState.totalPages;
          await loadPositionTitles();
        }
      } catch (err) {
        alert(`ลบไม่สำเร็จ: ${err.message}`);
      }
    }
  });

  userRoleEls.tbody?.addEventListener("click", async (e) => {
    const actionBtn = e.target.closest("button[data-action]");
    if (!actionBtn) return;

    const action = actionBtn.getAttribute("data-action");
    const id = parseInt(actionBtn.getAttribute("data-id") || "0", 10);
    if (!id) return;

    const api = window.userRolesApi || window.UserRolesAPI;

    if (action === "edit") {
      const code = actionBtn.getAttribute("data-code") || "";
      const role = actionBtn.getAttribute("data-role") || "";
      openUserRoleModal({ mode: "edit", id, code, role });
      return;
    }

    if (action === "delete") {
      if (!confirm(`ต้องการลบบทบาทผู้ใช้งาน ID ${id} ใช่ไหม?`)) return;

      try {
        await api.remove(id);
        await loadUserRoles();
      } catch (err) {
        alert(`ลบไม่สำเร็จ: ${err.message || err}`);
      }
    }
  });

  settingUserEls.tbody?.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-action='approve']");
    if (!btn) return;

    const userId = Number(btn.getAttribute("data-user-id"));
    const roleId = Number(btn.getAttribute("data-role-id"));

    if (!confirm("ยืนยันการอนุมัติผู้ใช้งานนี้?")) return;

    try {
      await window.UserApprovalsAPI.approveUser({
        user_id: userId,
        role_id: roleId,
      });

      await loadPendingUsers();
    } catch (err) {
      alert(err.message || "อนุมัติไม่สำเร็จ");
    }
  });

  usersEls.tbody?.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;

    const action = btn.getAttribute("data-action");
    const id = Number(btn.getAttribute("data-id") || "0");
    if (!id) return;

    const api = getUsersApi();
    if (!api) return alert("UsersAPI not found");

    if (action === "detail") {
      try {
        // ใช้ api ที่คุณได้จาก getUsersApi()
        if (typeof api.getUser !== "function") {
          throw new Error("UsersAPI.getUser not found");
        }

        const res = await api.getUser(id);
        const row = res?.data ?? res;

        openUserDetailModal(row);
      } catch (err) {
        alert(err.message || "โหลดรายละเอียดไม่สำเร็จ");
      }
      return;
    }


    if (action === "edit") {
      await openUserEditByPersonId(id);
      return;
    }


    if (action === "delete") {
      if (!confirm(`ต้องการลบผู้ใช้งาน ID ${id} ใช่ไหม?`)) return;

      try {
        if (!api.remove) throw new Error("UsersAPI.remove not found");
        await api.remove(id);

        await loadUsers();
        if (usersState.page > usersState.totalPages) {
          usersState.page = usersState.totalPages;
          await loadUsers();
        }
      } catch (err) {
        alert(`ลบไม่สำเร็จ: ${err.message || err}`);
      }
    }
  });

  requestTypeEls.tbody?.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;

    const action = btn.getAttribute("data-action");
    const id = btn.getAttribute("data-id") || "";

    const api = window.RequestTypesAPI || window.requestTypesApi;
    if (!api) return alert("RequestTypesAPI not found");

    if (action === "edit") {
      const row = {
        request_type_id: id,
        type_name: btn.getAttribute("data-name") || "",
        discription: btn.getAttribute("data-desc") || "",
        url_link: btn.getAttribute("data-url") || "",
      };
      openRequestTypeModal({ mode: "edit", row });
      return;
    }

    if (action === "delete") {
      if (!confirm(`ต้องการลบประเภทคำขอ ID ${id} ใช่ไหม?`)) return;

      try {
        if (!api.remove) throw new Error("RequestTypesAPI.remove not found");
        await api.remove(id);

        await loadRequestTypes();
        if (requestTypeState.page > requestTypeState.totalPages) {
          requestTypeState.page = requestTypeState.totalPages;
          await loadRequestTypes();
        }
      } catch (err) {
        alert(`ลบไม่สำเร็จ: ${err.message || err}`);
      }
    }
  });

  requestSubTypeEls.tbody?.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;

    const action = btn.getAttribute("data-action");
    const id = btn.getAttribute("data-id") || "";

    const api = window.RequestSubTypesAPI || window.requestSubTypesApi;
    if (!api) return alert("RequestSubTypesAPI not found");

    if (action === "edit") {
      const row = {
        request_sub_type_id: id,
        name: btn.getAttribute("data-name") || "",
        discription: btn.getAttribute("data-desc") || "", // ✅ discription
        subtype_of: btn.getAttribute("data-parent") || "",
      };
      await loadRequestSubTypeRefs();
      openRequestSubTypeModal({ mode: "edit", row });
      return;
    }

    if (action === "delete") {
      if (!confirm(`ต้องการลบประเภทคำขอย่อย ID ${id} ใช่ไหม?`)) return;

      try {
        if (!api.remove) throw new Error("RequestSubTypesAPI.remove not found");
        await api.remove(id);

        await loadRequestSubTypes();
        if (requestSubTypeState.page > requestSubTypeState.totalPages) {
          requestSubTypeState.page = requestSubTypeState.totalPages;
          await loadRequestSubTypes();
        }
      } catch (err) {
        alert(`ลบไม่สำเร็จ: ${err.message || err}`);
      }
    }
  });

  requestStatusEls.tbody?.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;

    const action = btn.getAttribute("data-action");
    const id = btn.getAttribute("data-id") || "";

    const api = window.RequestStatusAPI || window.requestStatusApi;
    if (!api) return alert("RequestStatusAPI not found");


    if (action === "edit") {
      await loadRequestStatusTypeRefs(); // ให้ dropdown ใน modal มี option ก่อน

      const row = {
        status_id: Number(btn.getAttribute("data-id") || 0),
        request_type_id: Number(btn.getAttribute("data-type") || 0),
        sort_order: Number(btn.getAttribute("data-sort") || 1),
        status_code: btn.getAttribute("data-code") || "",
        status_name: btn.getAttribute("data-name") || "",
        meaning: btn.getAttribute("data-meaning") || "",
      };

      openRequestStatusModal({ mode: "edit", row });
      return;
    }


    if (action === "delete") {
      if (!confirm(`ต้องการลบสถานะคำขอ ID ${id} ใช่ไหม?`)) return;

      try {
        if (!api.remove) throw new Error("RequestStatusAPI.remove not found");
        await api.remove(id);

        await loadRequestStatuses();
        if (requestStatusState.page > requestStatusState.totalPages) {
          requestStatusState.page = requestStatusState.totalPages;
          await loadRequestStatuses();
        }
      } catch (err) {
        alert(`ลบไม่สำเร็จ: ${err.message || err}`);
      }
    }
  });

  eventStatusEls.tbody?.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;

    const action = btn.getAttribute("data-action");
    const id = btn.getAttribute("data-id") || "";

    const api = window.EventStatusAPI || window.eventStatusApi;
    if (!api) return alert("EventStatusAPI not found");

    if (action === "edit") {
      await loadEventStatusTypeRefs();

      const row = {
        event_status_id: Number(btn.getAttribute("data-id") || 0),
        request_type_id: Number(btn.getAttribute("data-type") || 0),
        sort_order: Number(btn.getAttribute("data-sort") || 1),
        status_code: btn.getAttribute("data-code") || "",
        status_name: btn.getAttribute("data-name") || "",
        meaning: btn.getAttribute("data-meaning") || "",
      };

      openEventStatusModal({ mode: "edit", row });
      return;
    }

    if (action === "delete") {
      if (!confirm(`ต้องการลบสถานะกิจกรรม ID ${id} ใช่ไหม?`)) return;

      try {
        if (!api.remove) throw new Error("EventStatusAPI.remove not found");
        await api.remove(id);

        await loadEventStatuses();
        if (eventStatusState.page > eventStatusState.totalPages) {
          eventStatusState.page = eventStatusState.totalPages;
          await loadEventStatuses();
        }
      } catch (err) {
        alert(`ลบไม่สำเร็จ: ${err.message || err}`);
      }
    }
  });

  horEls.tbody?.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;

    const action = btn.getAttribute("data-action");
    const id = btn.getAttribute("data-id") || "";
    const subTypeId = Number(id || 0);
    if (!subTypeId) return;

    const api = window.HeadOfRequestAPI;
    if (!api) return alert("HeadOfRequestAPI not found");

    if (action === "edit") {
      // Find current row data from the last loaded table to pre-select staff
      // (fallback: reload list and then open modal with empty selection)
      try {
        // Ensure we have up-to-date data in DOM (read from rendered dataset isn't enough)
        const res = await api.list({
          q: horState.q,
          subtype_of: horState.subtype_of,
          page: horState.page,
          limit: horState.limit,
        });
        const items = Array.isArray(res?.data) ? res.data : [];
        const row = items.find((r) => Number(r.request_sub_type_id) === subTypeId) || { request_sub_type_id: subTypeId, staff: [] };
        await openHorModal({ mode: "edit", row });
      } catch (err) {
        console.error(err);
        await openHorModal({ mode: "edit", row: { request_sub_type_id: subTypeId, staff: [] } });
      }
      return;
    }

    if (action === "delete") {
      if (!confirm(`ต้องการลบผู้รับผิดชอบของประเภทย่อย ID ${subTypeId} ใช่ไหม?`)) return;

      try {
        if (!api.removeBySubType) throw new Error("HeadOfRequestAPI.removeBySubType not found");
        await api.removeBySubType(subTypeId);

        await loadHeadOfRequest();
      } catch (err) {
        alert(`ลบไม่สำเร็จ: ${err.message || err}`);
      }
    }
  });

  notificationTypeEls.tbody?.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;

    const action = btn.getAttribute("data-action");
    const id = btn.getAttribute("data-id") || "";

    if (action === "edit") {
      const name = btn.getAttribute("data-name") || "";
      const description = btn.getAttribute("data-desc") || "";
      openNotificationTypeModal("edit", { id, name, description });
      return;
    }

    if (action === "delete") {
      if (!confirm(`ต้องการลบประเภทการแจ้งเตือน ID ${id} ใช่ไหม?`)) return;

      try {
        await apiFetch(`/notification-types/${encodeURIComponent(id)}`, { method: "DELETE" });

        await loadNotificationTypes();
        if (notificationTypeState.page > notificationTypeState.totalPages) {
          notificationTypeState.page = notificationTypeState.totalPages;
          await loadNotificationTypes();
        }
      } catch (err) {
        alert(`ลบไม่สำเร็จ: ${err.message || err}`);
      }
    }
  });

  notificationTypeStaffEls.tbody?.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;

    const action = btn.getAttribute("data-action");
    const id = btn.getAttribute("data-id") || "";

    if (action === "edit") {
      const type = btn.getAttribute("data-type") || "";
      const userId = btn.getAttribute("data-user-id") || "";
      const personName = btn.getAttribute("data-person-name") || "-";
      const enabled = btn.getAttribute("data-enabled") || "1";
      openNotificationTypeStaffModal({
        mode: "edit",
        row: {
          id,
          notification_type_id: type,
          user_id: userId,
          display_name: personName,
          is_enabled: enabled === "1",
        }
      });
      return;
    }

    if (action === "delete") {
      if (!confirm(`ต้องการลบการตั้งค่า ID ${id} ใช่ไหม?`)) return;

      try {
        const api = window.NotificationTypeStaffAPI || window.notificationTypeStaffApi;
        if (!api?.remove) throw new Error("NotificationTypeStaffAPI.remove not found");

        await api.remove(Number(id));

        await loadNotificationTypeStaff();
        if (notificationTypeStaffState.page > notificationTypeStaffState.totalPages) {
          notificationTypeStaffState.page = notificationTypeStaffState.totalPages;
          await loadNotificationTypeStaff();
        }
      } catch (err) {
        alert(`ลบไม่สำเร็จ: ${err.message || err}`);
      }
    }
  });

  channelsEls.tbody?.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;

    const action = btn.getAttribute("data-action");
    const id = btn.getAttribute("data-id") || "";

    if (action === "edit") {
      const name = btn.getAttribute("data-name") || "";
      openChannelModal({ mode: "edit", row: { channel_id: id, channel: name } });
      return;
    }

    if (action === "delete") {
      if (!confirm(`ต้องการลบช่องทางแจ้งเตือน ID ${id} ใช่ไหม?`)) return;

      try {
        await apiFetch(`/channels/${encodeURIComponent(id)}`, { method: "DELETE" });

        await loadChannels();
        if (channelState.page > channelState.totalPages) {
          channelState.page = channelState.totalPages;
          await loadChannels();
        }
      } catch (err) {
        alert(`ลบไม่สำเร็จ: ${err.message || err}`);
      }
    }
  });

  todEls.tbody?.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;

    const action = btn.getAttribute("data-action");
    const id = btn.getAttribute("data-id") || "";
    if (!id) return;

    const api = window.TypeOfDeviceAPI;
    if (!api) return alert("TypeOfDeviceAPI not found");

    if (action === "edit") {
      try {
        const res = await api.getById(id);
        const row = res?.data ?? res;
        openTypeOfDeviceModal({ mode: "edit", row });
      } catch (err) {
        alert(err.message || "โหลดข้อมูลไม่สำเร็จ");
      }
      return;
    }

    if (action === "delete") {
      if (!confirm(`ต้องการลบประเภทอุปกรณ์ ID ${id} ใช่ไหม?`)) return;
      try {
        await api.remove(id);
        await loadTypeOfDevice();
      } catch (err) {
        alert(`ลบไม่สำเร็จ: ${err.message || err}`);
      }
    }
  });


  // submit form (create/update)
  orgTypeEls.form?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const id = (orgTypeEls.inputId?.value || "").trim();
    const type_name = (orgTypeEls.inputEN?.value || "").trim();
    const type_name_th = (orgTypeEls.inputTH?.value || "").trim();

    if (!type_name || !type_name_th) {
      if (orgTypeEls.formError) {
        orgTypeEls.formError.textContent = "กรุณากรอกชื่อประเภทหน่วยงานทั้ง EN และ TH";
        show(orgTypeEls.formError);
      }
      return;
    }

    try {
      if (orgTypeEls.formError) hide(orgTypeEls.formError);

      if (id) {
        await apiFetch(`/organization-types/${encodeURIComponent(id)}`, {
          method: "PUT",
          body: { type_name, type_name_th },
        });
      } else {
        await apiFetch(`/organization-types`, {
          method: "POST",
          body: { type_name, type_name_th },
        });
      }

      closeOrgTypeModal();
      await loadOrgTypes();
    } catch (err) {
      if (orgTypeEls.formError) {
        orgTypeEls.formError.textContent = err.message || "บันทึกไม่สำเร็จ";
        show(orgTypeEls.formError);
      } else {
        alert(err.message || "บันทึกไม่สำเร็จ");
      }
    }
  });

  provinceEls.form?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const id = (provinceEls.inputId?.value || "").trim();
    const nameEN = (provinceEls.inputEN?.value || "").trim();
    const nameTH = (provinceEls.inputTH?.value || "").trim();

    if (!nameEN || !nameTH) {
      if (provinceEls.formError) {
        provinceEls.formError.textContent = "กรุณากรอกชื่อจังหวัดทั้ง EN และ TH";
        show(provinceEls.formError);
      }
      return;
    }

    try {
      if (provinceEls.formError) hide(provinceEls.formError);

      if (id) {
        await apiFetch(`/provinces/${encodeURIComponent(id)}`, {
          method: "PUT",
          body: { nameEN, nameTH },
        });
      } else {
        await apiFetch(`/provinces`, {
          method: "POST",
          body: { nameEN, nameTH },
        });
      }

      closeProvinceModal();
      await loadProvinces();
    } catch (err) {
      if (provinceEls.formError) {
        provinceEls.formError.textContent = err.message || "บันทึกไม่สำเร็จ";
        show(provinceEls.formError);
      } else {
        alert(err.message || "บันทึกไม่สำเร็จ");
      }
    }
  });

  orgEls.form?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const id = (orgEls.inputId?.value || "").trim();
    const code = (orgEls.inputCode?.value || "").trim();
    const name = (orgEls.inputName?.value || "").trim();
    const location = (orgEls.inputLocation?.value || "").trim();
    const province_id = (orgEls.selectProvince?.value || "").trim();
    const organization_type_id = (orgEls.selectType?.value || "").trim();

    if (!code || !name || !location || !province_id || !organization_type_id) {
      if (orgEls.formError) {
        orgEls.formError.textContent = "กรุณากรอกข้อมูลให้ครบ (รหัส, ชื่อ, ที่ตั้ง, จังหวัด, ประเภทหน่วยงาน)";
        show(orgEls.formError);
      }
      return;
    }

    try {
      if (orgEls.formError) hide(orgEls.formError);

      const payload = {
        code,
        name,
        location,
        province_id: Number(province_id),
        organization_type_id: Number(organization_type_id),
      };

      if (id) {
        await apiFetch(`/organizations/${encodeURIComponent(id)}`, {
          method: "PUT",
          body: payload,
        });
      } else {
        await apiFetch(`/organizations`, {
          method: "POST",
          body: payload,
        });
      }

      closeOrganizationModal();
      await loadOrganizations();
    } catch (err) {
      if (orgEls.formError) {
        orgEls.formError.textContent = err.message || "บันทึกไม่สำเร็จ";
        show(orgEls.formError);
      } else {
        alert(err.message || "บันทึกไม่สำเร็จ");
      }
    }
  });

  personPrefixEls.form?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const id = (personPrefixEls.inputId?.value || "").trim();
    const prefix_en = (personPrefixEls.inputEN?.value || "").trim();
    const prefix_th = (personPrefixEls.inputTH?.value || "").trim();

    if (!prefix_en || !prefix_th) {
      if (personPrefixEls.formError) {
        personPrefixEls.formError.textContent = "กรุณากรอกคำนำหน้าชื่อทั้ง EN และ TH";
        show(personPrefixEls.formError);
      }
      return;
    }

    try {
      if (personPrefixEls.formError) hide(personPrefixEls.formError);

      if (id) {
        await apiFetch(`/person-prefixes/${encodeURIComponent(id)}`, {
          method: "PUT",
          body: { prefix_en, prefix_th },
        });
      } else {
        await apiFetch(`/person-prefixes`, {
          method: "POST",
          body: { prefix_en, prefix_th },
        });
      }

      closePersonPrefixModal();
      await loadPersonPrefixes();
    } catch (err) {
      if (personPrefixEls.formError) {
        personPrefixEls.formError.textContent = err.message || "บันทึกไม่สำเร็จ";
        show(personPrefixEls.formError);
      } else {
        alert(err.message || "บันทึกไม่สำเร็จ");
      }
    }
  });

  departmentEls.form?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const id = (departmentEls.inputId?.value || "").trim();
    const department_code = (departmentEls.inputCode?.value || "").trim();
    const department_title = (departmentEls.inputTitle?.value || "").trim();
    const organization_id = (departmentEls.selectOrg?.value || "").trim();

    if (!department_code || !department_title || !organization_id) {
      if (departmentEls.formError) {
        departmentEls.formError.textContent = "กรุณากรอก รหัสฝ่าย, ชื่อฝ่าย และเลือกหน่วยงาน";
        show(departmentEls.formError);
      }
      return;
    }

    try {
      if (departmentEls.formError) hide(departmentEls.formError);

      const payload = {
        department_code,
        department_title,
        organization_id: Number(organization_id),
      };

      if (id) {
        await apiFetch(`/departments/${encodeURIComponent(id)}`, {
          method: "PUT",
          body: payload,
        });
      } else {
        await apiFetch(`/departments`, {
          method: "POST",
          body: payload,
        });
      }

      closeDepartmentModal();
      await loadDepartments();
    } catch (err) {
      if (departmentEls.formError) {
        departmentEls.formError.textContent = err.message || "บันทึกไม่สำเร็จ";
        show(departmentEls.formError);
      } else {
        alert(err.message || "บันทึกไม่สำเร็จ");
      }
    }
  });

  positionTitleEls.form?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const id = (positionTitleEls.inputId?.value || "").trim();
    const position_code = (positionTitleEls.inputCode?.value || "").trim();
    const position_title = (positionTitleEls.inputTitle?.value || "").trim();
    const organization_id = (positionTitleEls.selectOrg?.value || "").trim();
    const department_id = (positionTitleEls.selectDept?.value || "").trim();

    if (!position_code || !position_title || !organization_id) {
      if (positionTitleEls.formError) {
        positionTitleEls.formError.textContent = "กรุณากรอก รหัสตำแหน่ง, ชื่อตำแหน่ง, หน่วยงาน และ ฝ่ายผู้ใช้งาน";
        show(positionTitleEls.formError);
      }
      return;
    }

    try {
      if (positionTitleEls.formError) hide(positionTitleEls.formError);

      const payload = {
        position_code,
        position_title,
        organization_id: Number(organization_id),
        department_id: department_id ? Number(department_id) : null,
      };

      if (id) {
        await apiFetch(`/position-titles/${encodeURIComponent(id)}`, {
          method: "PUT",
          body: payload,
        });
      } else {
        await apiFetch(`/position-titles`, {
          method: "POST",
          body: payload,
        });
      }

      closePositionTitleModal();
      await loadPositionTitles();
    } catch (err) {
      if (positionTitleEls.formError) {
        positionTitleEls.formError.textContent = err.message || "บันทึกไม่สำเร็จ";
        show(positionTitleEls.formError);
      } else {
        alert(err.message || "บันทึกไม่สำเร็จ");
      }
    }
  });

  userRoleEls.form?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const id = parseInt((userRoleEls.inputId?.value || "").trim() || "0", 10);

    const code = (userRoleEls.inputCode?.value || "").trim();
    const role = (userRoleEls.inputRole?.value || "").trim();

    if (!code || !role) {
      userRoleEls.formError.textContent = "กรุณากรอก รหัสบทบาท และ ชื่อบทบาท";
      show(userRoleEls.formError);
      return;
    }

    try {
      hide(userRoleEls.formError);

      const api = window.userRolesApi || window.UserRolesAPI;

      if (id) await api.update(id, { code, role });
      else await api.create({ code, role });

      closeUserRoleModal();
      await loadUserRoles();
    } catch (err) {
      userRoleEls.formError.textContent = err.message || "บันทึกไม่สำเร็จ";
      show(userRoleEls.formError);
    }
  });

  requestTypeEls.form?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const id = (requestTypeEls.inputId?.value || "").trim();
    const type_name = (requestTypeEls.inputName?.value || "").trim();
    const url_link = (requestTypeEls.inputUrl?.value || "").trim();
    const discription = (requestTypeEls.inputDesc?.value || "").trim();

    if (!type_name) {
      if (requestTypeEls.formError) {
        requestTypeEls.formError.textContent = "กรุณากรอกชื่อประเภทคำขอ";
        show(requestTypeEls.formError);
      }
      return;
    }

    try {
      if (requestTypeEls.formError) hide(requestTypeEls.formError);

      const api = window.RequestTypesAPI || window.requestTypesApi;
      if (!api) throw new Error("RequestTypesAPI not found");

      const payload = { type_name, url_link, discription };

      if (id) {
        if (!api.update) throw new Error("RequestTypesAPI.update not found");
        await api.update(id, payload);
      } else {
        if (!api.create) throw new Error("RequestTypesAPI.create not found");
        await api.create(payload);
      }

      closeRequestTypeModal();
      await loadRequestTypes();
    } catch (err) {
      if (requestTypeEls.formError) {
        requestTypeEls.formError.textContent = err.message || "บันทึกไม่สำเร็จ";
        show(requestTypeEls.formError);
      } else {
        alert(err.message || "บันทึกไม่สำเร็จ");
      }
    }
  });

  requestSubTypeEls.form?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const id = (requestSubTypeEls.inputId?.value || "").trim();
    const name = (requestSubTypeEls.inputName?.value || "").trim();
    const subtype_of = (requestSubTypeEls.selectType?.value || "").trim();
    const discription = (requestSubTypeEls.inputDesc?.value || "").trim(); // ✅ discription

    if (!name || !subtype_of) {
      if (requestSubTypeEls.formError) {
        requestSubTypeEls.formError.textContent = "กรุณากรอกชื่อประเภทคำขอย่อย และเลือกประเภทคำขอหลัก";
        show(requestSubTypeEls.formError);
      }
      return;
    }

    try {
      if (requestSubTypeEls.formError) hide(requestSubTypeEls.formError);

      const api = window.RequestSubTypesAPI || window.requestSubTypesApi;
      if (!api) throw new Error("RequestSubTypesAPI not found");

      const payload = {
        name,
        subtype_of: Number(subtype_of),
        discription, // ✅ ส่งชื่อ discription
      };

      if (id) {
        if (!api.update) throw new Error("RequestSubTypesAPI.update not found");
        await api.update(id, payload);
      } else {
        if (!api.create) throw new Error("RequestSubTypesAPI.create not found");
        await api.create(payload);
      }

      closeRequestSubTypeModal();
      await loadRequestSubTypes();
    } catch (err) {
      if (requestSubTypeEls.formError) {
        requestSubTypeEls.formError.textContent = err.message || "บันทึกไม่สำเร็จ";
        show(requestSubTypeEls.formError);
      } else {
        alert(err.message || "บันทึกไม่สำเร็จ");
      }
    }
  });

  horEls.form?.addEventListener("submit", async (e) => {
    e.preventDefault();

    try {
      const api = window.HeadOfRequestAPI;
      if (!api?.save) throw new Error("HeadOfRequestAPI.save not found");

      const request_sub_type_id = Number(horEls.selectSubType?.value || 0);
      if (!request_sub_type_id) throw new Error("กรุณาเลือกประเภทคำขอย่อย");

      const staff_ids = Array.from(horEls.selectStaff?.selectedOptions || [])
        .map((o) => Number(o.value || 0))
        .filter((n) => Number.isFinite(n) && n > 0);

      // allow empty = clear
      horSetError("");
      await api.save({ request_sub_type_id, staff_ids });

      closeHorModal();
      await loadHeadOfRequest();
    } catch (err) {
      console.error(err);
      horSetError(err.message || String(err));
    }
  });

  requestStatusEls.form?.addEventListener("submit", async (e) => {
    e.preventDefault();

    try {
      const api = window.RequestStatusAPI || window.requestStatusApi;
      if (!api) throw new Error("RequestStatusAPI not found");

      const isEdit = String(requestStatusEls.inputId?.value || "").trim() !== "";
      const id = String(requestStatusEls.inputId?.value || "").trim();

      // ✅ อ่านค่าจากฟอร์ม
      const payload = {
        status_name: String(requestStatusEls.inputName?.value || "").trim(),
        status_code: String(requestStatusEls.inputCode?.value || "").trim(),
        meaning: String(requestStatusEls.inputDesc?.value || "").trim(),
        request_type_id: Number(requestStatusEls.selectType?.value || 0),
        sort_order: Number(requestStatusEls.inputSort?.value || 1),
      };

      // ✅ validate ขั้นต่ำ
      if (!payload.status_name) throw new Error("กรุณากรอกชื่อสถานะ");
      if (!payload.status_code) throw new Error("กรุณากรอกรหัสสถานะ");
      if (!payload.request_type_id) throw new Error("กรุณาเลือกประเภทคำขอหลัก");

      // ✅ ยิง API
      if (isEdit) {
        await api.update(id, payload);
      } else {
        await api.create(payload);
      }

      closeRequestStatusModal();
      await loadRequestStatuses();
    } catch (err) {
      console.error(err);
      if (requestStatusEls.formError) {
        requestStatusEls.formError.textContent = err.message || String(err);
        show(requestStatusEls.formError);
      } else {
        alert(err.message || err);
      }
    }
  });

  eventStatusEls.form?.addEventListener("submit", async (e) => {
    e.preventDefault();

    try {
      const api = window.EventStatusAPI || window.eventStatusApi;
      if (!api) throw new Error("EventStatusAPI not found");

      const isEdit = String(eventStatusEls.inputId?.value || "").trim() !== "";
      const id = String(eventStatusEls.inputId?.value || "").trim();

      const payload = {
        status_name: String(eventStatusEls.inputName?.value || "").trim(),
        status_code: String(eventStatusEls.inputCode?.value || "").trim(),
        meaning: String(eventStatusEls.inputDesc?.value || "").trim(),
        request_type_id: Number(eventStatusEls.selectType?.value || 0),
        sort_order: Number(eventStatusEls.inputSort?.value || 1),
      };

      if (!payload.status_name) throw new Error("กรุณากรอกชื่อสถานะกิจกรรม");
      if (!payload.status_code) throw new Error("กรุณากรอกรหัสสถานะ");
      if (!payload.request_type_id) throw new Error("กรุณาเลือกประเภทคำขอหลัก");

      if (isEdit) await api.update(id, payload);
      else await api.create(payload);

      closeEventStatusModal();
      await loadEventStatuses();
    } catch (err) {
      console.error(err);
      if (eventStatusEls.formError) {
        eventStatusEls.formError.textContent = err.message || String(err);
        show(eventStatusEls.formError);
      } else {
        alert(err.message || err);
      }
    }
  });

  notificationTypeEls.form?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const id = (notificationTypeEls.inputId?.value || "").trim();
    const name = (notificationTypeEls.inputName?.value || "").trim();
    const description = (notificationTypeEls.inputDesc?.value || "").trim();

    if (!name) {
      if (notificationTypeEls.formError) {
        notificationTypeEls.formError.textContent = "กรุณากรอกชื่อประเภทการแจ้งเตือน";
        show(notificationTypeEls.formError);
      }
      return;
    }

    try {
      if (notificationTypeEls.formError) hide(notificationTypeEls.formError);

      const payload = { notification_type: name, meaning: description };

      if (id) {
        await apiFetch(`/notification-types/${encodeURIComponent(id)}`, {
          method: "PUT",
          body: payload,
        });
      } else {
        await apiFetch(`/notification-types`, {
          method: "POST",
          body: payload,
        });
      }

      closeNotificationTypeModal();
      await loadNotificationTypes();
    } catch (err) {
      if (notificationTypeEls.formError) {
        notificationTypeEls.formError.textContent = err.message || "บันทึกไม่สำเร็จ";
        show(notificationTypeEls.formError);
      } else {
        alert(err.message || "บันทึกไม่สำเร็จ");
      }
    }
  });

  notificationTypeStaffEls.form?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const id = (notificationTypeStaffEls.inputId?.value || "").trim();
    const notification_type_id = (notificationTypeStaffEls.selectType?.value || "").trim();
    const is_enabled = notificationTypeStaffEls.toggleEnabled?.checked ? 1 : 0;

    const isEdit = Boolean(id);

    // Get selected user IDs from checkbox multi-select (only for create mode)
    const multiSelectInstance = window.ntsMultiSelectInstance;
    const user_ids = isEdit ? [] : (multiSelectInstance?.getSelectedValues?.() || []);

    // Validation: create mode needs type + users, edit mode needs type only
    if (!notification_type_id) {
      if (notificationTypeStaffEls.formError) {
        notificationTypeStaffEls.formError.textContent = "กรุณาเลือกประเภทการแจ้งเตือน";
        show(notificationTypeStaffEls.formError);
      }
      return;
    }

    if (!isEdit && user_ids.length === 0) {
      if (notificationTypeStaffEls.formError) {
        notificationTypeStaffEls.formError.textContent = "กรุณาเลือกเจ้าหน้าที่อย่างน้อย 1 คน";
        show(notificationTypeStaffEls.formError);
      }
      return;
    }

    try {
      if (notificationTypeStaffEls.formError) hide(notificationTypeStaffEls.formError);

      const api = window.NotificationTypeStaffAPI || window.notificationTypeStaffApi;
      if (!api?.upsert) throw new Error("NotificationTypeStaffAPI.upsert not found");

      if (isEdit) {
        // Edit mode: just update the is_enabled flag for the existing record
        const row = notificationTypeStaffEls.currentEditRow;
        if (row?.user_id) {
          await api.upsert({
            notification_type_id: Number(notification_type_id),
            user_id: Number(row.user_id),
            is_enabled: Number(is_enabled),
          });
        }
      } else {
        // Create mode: save for each selected user
        for (const user_id of user_ids) {
          await api.upsert({
            notification_type_id: Number(notification_type_id),
            user_id: Number(user_id),
            is_enabled: Number(is_enabled),
          });
        }
      }

      closeNotificationTypeStaffModal();
      await loadNotificationTypeStaff();
    } catch (err) {
      if (notificationTypeStaffEls.formError) {
        notificationTypeStaffEls.formError.textContent = err.message || "บันทึกไม่สำเร็จ";
        show(notificationTypeStaffEls.formError);
      } else {
        alert(err.message || "บันทึกไม่สำเร็จ");
      }
    }
  });

  channelsEls.form?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const id = (channelsEls.inputId?.value || "").trim();
    const channel = (channelsEls.inputName?.value || "").trim();

    if (!channel) {
      if (channelsEls.formError) {
        channelsEls.formError.textContent = "กรุณากรอกชื่อช่องทางแจ้งเตือน";
        show(channelsEls.formError);
      }
      return;
    }

    try {
      if (channelsEls.formError) hide(channelsEls.formError);

      if (id) {
        await apiFetch(`/channels/${encodeURIComponent(id)}`, {
          method: "PUT",
          body: { channel },
        });
      } else {
        await apiFetch(`/channels`, {
          method: "POST",
          body: { channel },
        });
      }

      closeChannelModal();
      await loadChannels();
    } catch (err) {
      if (channelsEls.formError) {
        channelsEls.formError.textContent = err.message || "บันทึกไม่สำเร็จ";
        show(channelsEls.formError);
      } else {
        alert(err.message || "บันทึกไม่สำเร็จ");
      }
    }
  });

  todEls.form?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const id = String(todEls.inputId?.value || "").trim();
    const type_of_device_title = String(todEls.inputTitle?.value || "").trim();
    const has_network = todEls.inputHasNetwork?.checked ? 1 : 0;

    if (!type_of_device_title) {
      if (todEls.formError) {
        todEls.formError.textContent = "กรุณากรอกชื่อประเภทอุปกรณ์";
        show(todEls.formError);
      }
      return;
    }

    const api = window.TypeOfDeviceAPI;
    if (!api) return alert("TypeOfDeviceAPI not found");

    try {
      if (todEls.formError) hide(todEls.formError);

      // ค่าเดิมจาก hidden inputs
      let icon_path_online = String(todEls.inputIconOnline?.value || "").trim();
      let icon_path_offline = String(todEls.inputIconOffline?.value || "").trim();

      // ถ้ามีการเลือกไฟล์ใหม่ -> upload ก่อน
      const onlineFile = todEls.fileIconOnline?.files?.[0];
      if (onlineFile) {
        const up = await api.uploadIcon(onlineFile);
        const path = up?.data?.path;
        if (!path) throw new Error("Upload online icon failed");
        icon_path_online = String(path);
        if (todEls.inputIconOnline) todEls.inputIconOnline.value = icon_path_online;
      }

      const offlineFile = todEls.fileIconOffline?.files?.[0];
      if (offlineFile) {
        const up = await api.uploadIcon(offlineFile);
        const path = up?.data?.path;
        if (!path) throw new Error("Upload offline icon failed");
        icon_path_offline = String(path);
        if (todEls.inputIconOffline) todEls.inputIconOffline.value = icon_path_offline;
      }

      // sync link UI
      todSyncIconLinks();

      if (id) {
        await api.update(id, {
          type_of_device_title,
          has_network,
          icon_path_online,
          icon_path_offline,
        });
      } else {
        await api.create({
          type_of_device_title,
          has_network,
          icon_path_online,
          icon_path_offline,
        });
      }

      closeTypeOfDeviceModal();
      await loadTypeOfDevice();
    } catch (err) {
      if (todEls.formError) {
        todEls.formError.textContent = err.message || "บันทึกไม่สำเร็จ";
        show(todEls.formError);
      } else {
        alert(err.message || "บันทึกไม่สำเร็จ");
      }
    }
  });

  // FILTER: หน่วยงาน
  departmentEls.filterOrg?.addEventListener("change", async () => {
    departmentState.page = 1;
    departmentState.organization_id = departmentEls.filterOrg.value || "";
    await loadDepartments();
  });

  // FILTER: จังหวัด
  orgEls.filterProvince?.addEventListener("change", async () => {
    orgState.page = 1;
    orgState.province_id = orgEls.filterProvince.value || "";
    await loadOrganizations();
  });

  // FILTER: ประเภทหน่วยงาน
  orgEls.filterType?.addEventListener("change", async () => {
    orgState.page = 1;
    orgState.organization_type_id = orgEls.filterType.value || "";
    await loadOrganizations();
  });

  // FILTER: หน่วยงาน (ตำแหน่ง)
  positionTitleEls.filterOrganization?.addEventListener("change", async () => {
    positionTitleState.page = 1;
    positionTitleState.organization_id = positionTitleEls.filterOrganization.value || "";

    // เคลียร์ dept filter
    positionTitleState.department_id = "";
    if (positionTitleEls.filterDepartment) positionTitleEls.filterDepartment.value = "";

    // โหลดฝ่ายให้ตรงกับ org ที่เลือก (อัปเดตเฉพาะ filter)
    await loadPositionTitleDepartmentsByOrg(positionTitleState.organization_id, { target: "filter" });

    await loadPositionTitles();
  });

  requestSubTypeEls.filterType?.addEventListener("change", async () => {
    requestSubTypeState.page = 1;
    requestSubTypeState.subtype_of = Number(requestSubTypeEls.filterType.value || 0);
    await loadRequestSubTypes();
  });

  horEls.filterType?.addEventListener("change", async () => {
    horState.page = 1;
    horState.subtype_of = Number(horEls.filterType.value || 0);
    await loadHeadOfRequest();
  });


  // FILTER: ฝ่าย (ตำแหน่ง)
  positionTitleEls.filterDepartment?.addEventListener("change", async () => {
    positionTitleState.page = 1;
    positionTitleState.department_id = positionTitleEls.filterDepartment.value || "";
    await loadPositionTitles();
  });


  usersEls.filterOrg?.addEventListener("change", async () => {
    usersState.page = 1;
    usersState.organization_id = usersEls.filterOrg.value || "";

    // reset dept/pos
    usersState.department_id = "";
    usersState.position_title_id = "";
    if (usersEls.filterDept) usersEls.filterDept.value = "";
    if (usersEls.filterPos) usersEls.filterPos.value = "";

    await loadUsersDepartmentsByOrg(usersState.organization_id);
    await loadUsersPositions({ orgId: usersState.organization_id, deptId: "" });

    await loadUsers();
  });

  usersEls.filterDept?.addEventListener("change", async () => {
    usersState.page = 1;
    usersState.department_id = usersEls.filterDept.value || "";

    // reset pos
    usersState.position_title_id = "";
    if (usersEls.filterPos) usersEls.filterPos.value = "";

    await loadUsersPositions({ orgId: usersState.organization_id, deptId: usersState.department_id });

    await loadUsers();
  });

  usersEls.filterPos?.addEventListener("change", async () => {
    usersState.page = 1;
    usersState.position_title_id = usersEls.filterPos.value || "";
    await loadUsers();
  });

  requestStatusEls.filterType?.addEventListener("change", () => {
    requestStatusState.page = 1;
    requestStatusState.request_type_id = Number(requestStatusEls.filterType.value || 0);
    loadRequestStatuses();
  });

  eventStatusEls.filterType?.addEventListener("change", () => {
    eventStatusState.page = 1;
    eventStatusState.request_type_id = Number(eventStatusEls.filterType.value || 0);
    loadEventStatuses();
  });

  notificationTypeStaffEls.filterType?.addEventListener("change", () => {
    notificationTypeStaffState.page = 1;
    notificationTypeStaffState.notification_type_id = notificationTypeStaffEls.filterType.value || "";
    loadNotificationTypeStaff();
  });




  // MODAL: เปลี่ยนหน่วยงาน -> โหลดฝ่ายใหม่ตามหน่วยงาน
  positionTitleEls.selectOrg?.addEventListener("change", async () => {
    const orgId = positionTitleEls.selectOrg.value || "";

    // reset ฝ่าย
    if (positionTitleEls.selectDept) {
      positionTitleEls.selectDept.value = "";
      positionTitleEls.selectDept.innerHTML = `<option value="">เลือกฝ่าย</option>`;
    }

    await loadPositionTitleDepartmentsByOrg(orgId, { target: "modal" });
  });

  usersDetailEls.btnEdit?.addEventListener("click", async () => {
    const id = usersDetailCurrentId;
    if (!id) return;

    closeUserDetailModal();
    await openUserEditByPersonId(id);
  });



  /* =========================
    Init
  ========================= */
  // เปิด default section ไว้ก่อน

  hide(document.getElementById("btn-add-org-type"));
  hide(document.getElementById("btn-add-province"));
  hide(document.getElementById("btn-add-organization"));
  hide(document.getElementById("btn-add-person-prefix"));
  hide(document.getElementById("btn-add-department"));
  hide(document.getElementById("btn-add-position-title"));
  hide(document.getElementById("btn-add-user-role"));
  hide(document.getElementById("btn-add-request-type"));
  hide(document.getElementById("btn-add-request-sub-type"));
  hide(document.getElementById("btn-add-request-status"));
  hide(document.getElementById("btn-add-event-status"));
  hide(document.getElementById("btn-add-notification-type"));
  hide(document.getElementById("btn-add-notification-type-staff"));
  hide(document.getElementById("btn-add-channel"));
  hide(document.getElementById("btn-add-type-of-device"));

  activateSection("default");

  console.log("gcms-settings-data.js loaded");

  // ย้าย initNtsMultiSelectCheckbox เข้า IIFE เพื่อให้ access escapeHtml
  window.initNtsMultiSelectCheckbox = function (users = []) {
    const root = document.getElementById("notification-type-staff-person-ui");
    const btn = root?.querySelector(".ms-dd__btn");
    const labelEl = document.getElementById("nts-person-label");
    const menu = document.getElementById("nts-person-menu");
    const sel = document.getElementById("notification-type-staff-person");

    if (!root || !btn || !labelEl || !menu || !sel) return;

    // เติม option ให้ hidden select (ใช้ user_id เพราะเป็นตัวที่บันทึกในDB)
    sel.innerHTML = "";
    users.forEach(u => {
      const opt = document.createElement("option");
      opt.value = String(u.user_id ?? u.id ?? "");
      opt.textContent = u.display_name || u.full_name || u.name || `ID ${u.user_id ?? u.id}`;
      sel.appendChild(opt);
    });

    function getSelectedValues() {
      return Array.from(sel.selectedOptions).map(o => o.value);
    }

    function setSelectedValues(values) {
      const set = new Set(values.map(String));
      Array.from(sel.options).forEach(o => (o.selected = set.has(o.value)));
      renderLabel();
      renderMenu(); // sync check state
    }

    function clearSelection() {
      setSelectedValues([]);
    }

    function openMenu() {
      menu.hidden = false;
      btn.setAttribute("aria-expanded", "true");
      positionMenu(); // set position ให้ตรง button
    }
    function closeMenu() {
      menu.hidden = true;
      btn.setAttribute("aria-expanded", "false");
    }
    function toggleMenu() {
      if (menu.hidden) openMenu();
      else closeMenu();
    }

    function positionMenu() {
      // Calculate button position
      const btnRect = btn.getBoundingClientRect();
      menu.style.left = btnRect.left + "px";
      menu.style.top = (btnRect.bottom + 6) + "px";
      menu.style.width = btnRect.width + "px";
    }

    function renderLabel() {
      const selected = getSelectedValues();
      if (!selected.length) {
        labelEl.textContent = "เลือกเจ้าหน้าที่";
        return;
      }
      // แสดงสรุปแบบ "เลือกแล้ว X คน" (ไม่ยาวเกิน)
      labelEl.textContent = `เลือกแล้ว ${selected.length} คน`;
    }

    function renderMenu() {
      const selectedSet = new Set(getSelectedValues());
      menu.innerHTML = "";

      if (!sel.options.length) {
        const empty = document.createElement("div");
        empty.className = "muted";
        empty.style.padding = "10px";
        empty.textContent = "ไม่พบข้อมูล";
        menu.appendChild(empty);
        return;
      }

      Array.from(sel.options).forEach(opt => {
        const row = document.createElement("label");
        row.className = "ms-dd__item";
        row.innerHTML = `
          <input type="checkbox" value="${escapeHtml(opt.value)}" />
          <span class="ms-dd__name">${escapeHtml(opt.textContent || "")}</span>
        `;

        const cb = row.querySelector("input");
        cb.checked = selectedSet.has(opt.value);

        // click checkbox -> sync to hidden select
        cb.addEventListener("change", () => {
          const current = new Set(getSelectedValues());
          if (cb.checked) current.add(opt.value);
          else current.delete(opt.value);

          setSelectedValues([...current]);
          renderLabel(); // ✅ explicitly call renderLabel after selection change
        });

        menu.appendChild(row);
      });
    }

    // events
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      toggleMenu();
      if (!menu.hidden) {
        setTimeout(() => positionMenu(), 0); // position after menu is shown
      }
      renderMenu();
    });

    // reposition on window resize
    window.addEventListener("resize", () => {
      if (!menu.hidden) positionMenu();
    });

    // close outside
    document.addEventListener("click", (e) => {
      if (!root.contains(e.target)) closeMenu();
    });

    // init
    renderLabel();
    renderMenu();
    closeMenu();

    // public API (เวลา edit record)
    return { setSelectedValues, getSelectedValues, openMenu, closeMenu, renderMenu, renderLabel, clearSelection };
  };
})();

function syncNtsToggle() {
  const cb = document.getElementById("nts-enabled");
  const txt = document.getElementById("nts-enabled-text");
  if (!cb || !txt) return;

  txt.textContent = cb.checked ? "เปิดการใช้งาน" : "ปิดการใช้งาน";
}

document.getElementById("nts-enabled")
  ?.addEventListener("change", syncNtsToggle);

syncNtsToggle();
