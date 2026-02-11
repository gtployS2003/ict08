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

  // base url: ใช้จาก config.js.php ก่อน ถ้าไม่มีค่อย fallback
  const API_BASE =
    window.API_BASE_URL ||
    window.__API_BASE__ ||
    "/ict/backend/public"; // fallback (ปรับได้)

  async function apiFetch(path, { method = "GET", body, headers = {} } = {}) {
    const url = `${API_BASE}${path}`;
    const opts = {
      method,
      headers: {
        ...headers,
      },
    };

    if (body !== undefined) {
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

    if (!res.ok || json?.success === false) {
      const msg = json?.message || `Request failed (${res.status})`;
      const extra = json?.data ? `: ${JSON.stringify(json.data)}` : "";
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

  function setTitle(text) {
    const title = $("#setting-title");
    if (title) title.textContent = text;
  }

  function activateSection(sectionKey) {
    // ซ่อนทุก section ก่อน
    $$(".setting-section").forEach((sec) => hide(sec));

    // ซ่อน action buttons 
    hide($("#btn-add-province"));
    hide($("#btn-add-org-type"));
    hide($("#btn-add-organization"));
    hide($("#btn-add-person-prefix"));
    hide($("#btn-add-department"));
    hide($("#btn-add-position-title"));
    hide($("#btn-add-user-role"));
    hide($("#btn-add-request-type"));
    hide($("#btn-add-request-status"))

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

      default:
        show($("#section-default"));
        setTitle("การตั้งค่าข้อมูล");
        break;
    }

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

    const { page, totalPages } = orgTypeState;

    if (totalPages <= 1) {
      orgTypeEls.pagination.innerHTML = "";
      return;
    }

    const pages = [];
    const push = (p) => pages.push(p);

    push(1);
    if (page - 2 > 2) push("…");
    for (let p = Math.max(2, page - 2); p <= Math.min(totalPages - 1, page + 2); p++) {
      push(p);
    }
    if (page + 2 < totalPages - 1) push("…");
    if (totalPages > 1) push(totalPages);

    orgTypeEls.pagination.innerHTML = `
    <button class="btn btn-ghost btn-sm" data-page="${page - 1}" ${page <= 1 ? "disabled" : ""}>ก่อนหน้า</button>
    ${pages.map((p) => {
      if (p === "…") return `<span class="muted" style="padding:0 8px;">…</span>`;
      const active = p === page ? "is-active" : "";
      return `<button class="btn btn-ghost btn-sm ${active}" data-page="${p}">${p}</button>`;
    }).join("")}
    <button class="btn btn-ghost btn-sm" data-page="${page + 1}" ${page >= totalPages ? "disabled" : ""}>ถัดไป</button>
  `;
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

    const { page, totalPages } = provinceState;

    if (totalPages <= 1) {
      provinceEls.pagination.innerHTML = "";
      return;
    }

    // แสดงเลขหน้าแบบกระชับ
    const pages = [];
    const push = (p) => pages.push(p);

    push(1);
    if (page - 2 > 2) push("…");
    for (let p = Math.max(2, page - 2); p <= Math.min(totalPages - 1, page + 2); p++) {
      push(p);
    }
    if (page + 2 < totalPages - 1) push("…");
    if (totalPages > 1) push(totalPages);

    provinceEls.pagination.innerHTML = `
      <button class="btn btn-ghost btn-sm" data-page="${page - 1}" ${page <= 1 ? "disabled" : ""}>ก่อนหน้า</button>
      ${pages
        .map((p) => {
          if (p === "…") return `<span class="muted" style="padding:0 8px;">…</span>`;
          const active = p === page ? "is-active" : "";
          return `<button class="btn btn-ghost btn-sm ${active}" data-page="${p}">${p}</button>`;
        })
        .join("")}
      <button class="btn btn-ghost btn-sm" data-page="${page + 1}" ${page >= totalPages ? "disabled" : ""}>ถัดไป</button>
    `;
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

      // รองรับหลายรูปแบบ response
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

        // backend model ส่งชื่อจังหวัด/ประเภทมาด้วย (จาก JOIN)
        const provinceName = row.province_name_th || "";
        const typeName = row.organization_type_name_th || row.organization_type_name || "";

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
              <button class="btn btn-ghost btn-sm" type="button" data-action="edit"
                data-id="${escapeHtml(id)}"
                data-code="${escapeHtml(row.code)}"
                data-name="${escapeHtml(row.name)}"
                data-location="${escapeHtml(row.location)}"
                data-province_id="${escapeHtml(row.province_id)}"
                data-organization_type_id="${escapeHtml(row.organization_type_id)}">
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

  function renderOrgPagination() {
    if (!orgEls.pagination) return;

    const { page, totalPages } = orgState;
    if (totalPages <= 1) {
      orgEls.pagination.innerHTML = "";
      return;
    }

    const pages = [];
    const push = (p) => pages.push(p);

    push(1);
    if (page - 2 > 2) push("…");
    for (let p = Math.max(2, page - 2); p <= Math.min(totalPages - 1, page + 2); p++) push(p);
    if (page + 2 < totalPages - 1) push("…");
    if (totalPages > 1) push(totalPages);

    orgEls.pagination.innerHTML = `
    <button class="btn btn-ghost btn-sm" data-page="${page - 1}" ${page <= 1 ? "disabled" : ""}>ก่อนหน้า</button>
    ${pages
        .map((p) => {
          if (p === "…") return `<span class="muted" style="padding:0 8px;">…</span>`;
          const active = p === page ? "is-active" : "";
          return `<button class="btn btn-ghost btn-sm ${active}" data-page="${p}">${p}</button>`;
        })
        .join("")}
    <button class="btn btn-ghost btn-sm" data-page="${page + 1}" ${page >= totalPages ? "disabled" : ""}>ถัดไป</button>
  `;
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

    const { page, totalPages } = personPrefixState;

    if (totalPages <= 1) {
      personPrefixEls.pagination.innerHTML = "";
      return;
    }

    const pages = [];
    const push = (p) => pages.push(p);

    push(1);
    if (page - 2 > 2) push("…");
    for (let p = Math.max(2, page - 2); p <= Math.min(totalPages - 1, page + 2); p++) {
      push(p);
    }
    if (page + 2 < totalPages - 1) push("…");
    if (totalPages > 1) push(totalPages);

    personPrefixEls.pagination.innerHTML = `
    <button class="btn btn-ghost btn-sm" data-page="${page - 1}" ${page <= 1 ? "disabled" : ""}>ก่อนหน้า</button>
    ${pages.map((p) => {
      if (p === "…") return `<span class="muted" style="padding:0 8px;">…</span>`;
      const active = p === page ? "is-active" : "";
      return `<button class="btn btn-ghost btn-sm ${active}" data-page="${p}">${p}</button>`;
    }).join("")}
    <button class="btn btn-ghost btn-sm" data-page="${page + 1}" ${page >= totalPages ? "disabled" : ""}>ถัดไป</button>
  `;
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

    const { page, totalPages } = departmentState;

    if (totalPages <= 1) {
      departmentEls.pagination.innerHTML = "";
      return;
    }

    const pages = [];
    const push = (p) => pages.push(p);

    push(1);
    if (page - 2 > 2) push("…");
    for (let p = Math.max(2, page - 2); p <= Math.min(totalPages - 1, page + 2); p++) {
      push(p);
    }
    if (page + 2 < totalPages - 1) push("…");
    if (totalPages > 1) push(totalPages);

    departmentEls.pagination.innerHTML = `
    <button class="btn btn-ghost btn-sm" data-page="${page - 1}" ${page <= 1 ? "disabled" : ""}>ก่อนหน้า</button>
    ${pages.map((p) => {
      if (p === "…") return `<span class="muted" style="padding:0 8px;">…</span>`;
      const active = p === page ? "is-active" : "";
      return `<button class="btn btn-ghost btn-sm ${active}" data-page="${p}">${p}</button>`;
    }).join("")}
    <button class="btn btn-ghost btn-sm" data-page="${page + 1}" ${page >= totalPages ? "disabled" : ""}>ถัดไป</button>
  `;
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

    const { page, totalPages } = positionTitleState;

    if (totalPages <= 1) {
      positionTitleEls.pagination.innerHTML = "";
      return;
    }

    const pages = [];
    const push = (p) => pages.push(p);

    push(1);
    if (page - 2 > 2) push("…");
    for (let p = Math.max(2, page - 2); p <= Math.min(totalPages - 1, page + 2); p++) {
      push(p);
    }
    if (page + 2 < totalPages - 1) push("…");
    if (totalPages > 1) push(totalPages);

    positionTitleEls.pagination.innerHTML = `
    <button class="btn btn-ghost btn-sm" data-page="${page - 1}" ${page <= 1 ? "disabled" : ""}>ก่อนหน้า</button>
    ${pages
        .map((p) => {
          if (p === "…") return `<span class="muted" style="padding:0 8px;">…</span>`;
          const active = p === page ? "is-active" : "";
          return `<button class="btn btn-ghost btn-sm ${active}" data-page="${p}">${p}</button>`;
        })
        .join("")}
    <button class="btn btn-ghost btn-sm" data-page="${page + 1}" ${page >= totalPages ? "disabled" : ""}>ถัดไป</button>
  `;
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

    const { page, totalPages } = userRoleState;
    if (totalPages <= 1) {
      userRoleEls.pagination.innerHTML = "";
      return;
    }

    const pages = [];
    const push = (p) => pages.push(p);

    push(1);
    if (page - 2 > 2) push("…");
    for (let p = Math.max(2, page - 2); p <= Math.min(totalPages - 1, page + 2); p++) push(p);
    if (page + 2 < totalPages - 1) push("…");
    if (totalPages > 1) push(totalPages);

    userRoleEls.pagination.innerHTML = `
    <button class="btn btn-ghost btn-sm" data-page="${page - 1}" ${page <= 1 ? "disabled" : ""}>ก่อนหน้า</button>
    ${pages.map((p) => {
      if (p === "…") return `<span class="muted" style="padding:0 8px;">…</span>`;
      const active = p === page ? "is-active" : "";
      return `<button class="btn btn-ghost btn-sm ${active}" data-page="${p}">${p}</button>`;
    }).join("")}
    <button class="btn btn-ghost btn-sm" data-page="${page + 1}" ${page >= totalPages ? "disabled" : ""}>ถัดไป</button>
  `;
  }

  function renderUserRoleTotal() {
    if (!userRoleEls.total) return;
    userRoleEls.total.textContent = `ทั้งหมด ${userRoleState.total} รายการ`;
  }

  async function loadUserRoles() {
    const tbody = document.querySelector("#user-role-tbody");
    const totalEl = document.querySelector("#user-role-total");
    const pagerEl = document.querySelector("#user-role-pagination");

    const q = (document.querySelector("#user-role-search")?.value || "").trim();
    const limit = parseInt(document.querySelector("#user-role-limit")?.value || "50", 10);
    const page = 1; // เริ่มง่ายๆก่อน เดี๋ยวค่อยทำ pagination

    tbody.innerHTML = `<tr><td colspan="4" class="muted">กำลังโหลด...</td></tr>`;

    const api = window.userRolesApi || window.UserRolesAPI;
    const { items, pagination } = await api.list({ q, page, limit });

    if (!items || items.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" class="muted">ไม่พบข้อมูล</td></tr>`;
      if (totalEl) totalEl.textContent = `ทั้งหมด 0 รายการ`;
      if (pagerEl) pagerEl.innerHTML = "";
      return;
    }

    tbody.innerHTML = items.map((r) => `
  <tr>
    <td>${r.user_role_id ?? ""}</td>
    <td>${escapeHtml(r.code ?? "")}</td>
    <td>${escapeHtml(r.role ?? "")}</td>
    <td>
      <button
        type="button"
        class="btn btn-ghost btn-sm"
        data-action="edit"
        data-id="${r.user_role_id}"
        data-code="${escapeHtml(r.code ?? "")}"
        data-role="${escapeHtml(r.role ?? "")}"
      >แก้ไข</button>

      <button
        type="button"
        class="btn btn-danger btn-sm"
        data-action="delete"
        data-id="${r.user_role_id}"
      >ลบ</button>
    </td>
  </tr>
`).join("");


    if (totalEl) totalEl.textContent = `ทั้งหมด ${pagination?.total ?? items.length} รายการ`;
    if (pagerEl) pagerEl.innerHTML = ""; // ค่อยทำทีหลัง
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


      const data = res?.data || {};
      const items = data.items || [];

      settingUserState.total = data.pagination?.total || items.length || 0;
      settingUserState.totalPages = data.pagination?.total_pages || 1;

      renderSettingUserRows(items);

      if (settingUserEls.total) {
        settingUserEls.total.textContent = `ทั้งหมด ${settingUserState.total} รายการ`;
      }
    } catch (err) {
      settingUserEls.tbody.innerHTML =
        `<tr><td colspan="9" class="muted">${escapeHtml(err.message)}</td></tr>`;
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

    const { page, totalPages } = usersState;

    if (totalPages <= 1) {
      usersEls.pagination.innerHTML = "";
      return;
    }

    const pages = [];
    const push = (p) => pages.push(p);

    push(1);
    if (page - 2 > 2) push("…");
    for (let p = Math.max(2, page - 2); p <= Math.min(totalPages - 1, page + 2); p++) push(p);
    if (page + 2 < totalPages - 1) push("…");
    if (totalPages > 1) push(totalPages);

    usersEls.pagination.innerHTML = `
    <button class="btn btn-ghost btn-sm" data-page="${page - 1}" ${page <= 1 ? "disabled" : ""}>ก่อนหน้า</button>
    ${pages.map((p) => {
      if (p === "…") return `<span class="muted" style="padding:0 8px;">…</span>`;
      const active = p === page ? "is-active" : "";
      return `<button class="btn btn-ghost btn-sm ${active}" data-page="${p}">${p}</button>`;
    }).join("")}
    <button class="btn btn-ghost btn-sm" data-page="${page + 1}" ${page >= totalPages ? "disabled" : ""}>ถัดไป</button>
  `;
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

    const { page, totalPages } = requestTypeState;
    if (totalPages <= 1) {
      requestTypeEls.pagination.innerHTML = "";
      return;
    }

    const pages = [];
    const push = (p) => pages.push(p);

    push(1);
    if (page - 2 > 2) push("…");
    for (let p = Math.max(2, page - 2); p <= Math.min(totalPages - 1, page + 2); p++) push(p);
    if (page + 2 < totalPages - 1) push("…");
    if (totalPages > 1) push(totalPages);

    requestTypeEls.pagination.innerHTML = `
    <button class="btn btn-ghost btn-sm" data-page="${page - 1}" ${page <= 1 ? "disabled" : ""}>ก่อนหน้า</button>
    ${pages.map((p) => {
      if (p === "…") return `<span class="muted" style="padding:0 8px;">…</span>`;
      const active = p === page ? "is-active" : "";
      return `<button class="btn btn-ghost btn-sm ${active}" data-page="${p}">${p}</button>`;
    }).join("")}
    <button class="btn btn-ghost btn-sm" data-page="${page + 1}" ${page >= totalPages ? "disabled" : ""}>ถัดไป</button>
  `;
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

    const { page, totalPages } = requestSubTypeState;
    if (totalPages <= 1) {
      requestSubTypeEls.pagination.innerHTML = "";
      return;
    }

    const pages = [];
    const push = (p) => pages.push(p);

    push(1);
    if (page - 2 > 2) push("…");
    for (let p = Math.max(2, page - 2); p <= Math.min(totalPages - 1, page + 2); p++) push(p);
    if (page + 2 < totalPages - 1) push("…");
    if (totalPages > 1) push(totalPages);

    requestSubTypeEls.pagination.innerHTML = `
    <button class="btn btn-ghost btn-sm" data-page="${page - 1}" ${page <= 1 ? "disabled" : ""}>ก่อนหน้า</button>
    ${pages.map((p) => {
      if (p === "…") return `<span class="muted" style="padding:0 8px;">…</span>`;
      const active = p === page ? "is-active" : "";
      return `<button class="btn btn-ghost btn-sm ${active}" data-page="${p}">${p}</button>`;
    }).join("")}
    <button class="btn btn-ghost btn-sm" data-page="${page + 1}" ${page >= totalPages ? "disabled" : ""}>ถัดไป</button>
  `;
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

    const { page, totalPages } = requestStatusState;
    if (totalPages <= 1) {
      requestStatusEls.pagination.innerHTML = "";
      return;
    }

    const pages = [];
    const push = (p) => pages.push(p);

    push(1);
    if (page - 2 > 2) push("…");
    for (let p = Math.max(2, page - 2); p <= Math.min(totalPages - 1, page + 2); p++) push(p);
    if (page + 2 < totalPages - 1) push("…");
    if (totalPages > 1) push(totalPages);

    requestStatusEls.pagination.innerHTML = `
    <button class="btn btn-ghost btn-sm" data-page="${page - 1}" ${page <= 1 ? "disabled" : ""}>ก่อนหน้า</button>
    ${pages.map((p) => {
      if (p === "…") return `<span class="muted" style="padding:0 8px;">…</span>`;
      const active = p === page ? "is-active" : "";
      return `<button class="btn btn-ghost btn-sm ${active}" data-page="${p}">${p}</button>`;
    }).join("")}
    <button class="btn btn-ghost btn-sm" data-page="${page + 1}" ${page >= totalPages ? "disabled" : ""}>ถัดไป</button>
  `;
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
    orgTypeEls.modalTitle.textContent =
      mode === "edit" ? "แก้ไขประเภทหน่วยงาน" : "เพิ่มประเภทหน่วยงาน";
    orgTypeEls.submitText.textContent =
      mode === "edit" ? "บันทึกการแก้ไข" : "บันทึก";

    orgTypeEls.inputId.value = id;
    orgTypeEls.inputEN.value = en;
    orgTypeEls.inputTH.value = th;

    show(orgTypeEls.modal);
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
    personPrefixEls.modalTitle.textContent =
      mode === "edit" ? "แก้ไขคำนำหน้าชื่อ" : "เพิ่มคำนำหน้าชื่อ";
    personPrefixEls.submitText.textContent =
      mode === "edit" ? "บันทึกการแก้ไข" : "บันทึก";

    personPrefixEls.inputId.value = id;
    personPrefixEls.inputEN.value = en;
    personPrefixEls.inputTH.value = th;

    show(personPrefixEls.modal);
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

  // คลิกเมนูซ้ายที่มี data-section
  document.addEventListener("click", async (e) => {
    const a = e.target.closest("a[data-section]");
    if (!a) return;

    e.preventDefault();
    const sectionKey = a.getAttribute("data-section");

    activateSection(sectionKey);

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

    if (action === "edit") {
      const row = {
        organization_id: id,
        code: actionBtn.getAttribute("data-code") || "",
        name: actionBtn.getAttribute("data-name") || "",
        location: actionBtn.getAttribute("data-location") || "",
        province_id: actionBtn.getAttribute("data-province_id") || "",
        organization_type_id: actionBtn.getAttribute("data-organization_type_id") || "",
      };
      openOrganizationModal({ mode: "edit", row });
      return;
    }

    if (action === "delete") {
      const ok = confirm(`ต้องการลบหน่วยงาน ID ${id} ใช่ไหม?`);
      if (!ok) return;

      try {
        await apiFetch(`/organizations/${encodeURIComponent(id)}`, { method: "DELETE" });

        // ถ้าหน้าสุดท้ายลบจนหมด ให้ถอยหน้ากลับ
        if (orgState.page > 1) {
          // reload แล้วเช็คว่ามีรายการเหลือไหมด้วยการลด page แบบปลอดภัย
          // (ง่ายสุด: reload ปัจจุบันก่อน ถ้า totalPages ลด ให้ปรับ)
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
      await window.UserApprovalsAPI.approve({
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

  activateSection("default");

  console.log("gcms-settings-data.js loaded");
})();