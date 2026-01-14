// assets/js/gcms-settings-data.js

(() => {
  /* =========================
    Helpers
  ========================= */
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
      // กรณี server ตอบ html error
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
  el.style.display = ""; // คืนค่า default
}

function hide(el) {
  if (!el) return;
  el.hidden = true;
  el.setAttribute("hidden", "");
  el.style.display = "none"; // บังคับซ่อน เผื่อ CSS ทับ [hidden]
}

  function setTitle(text) {
    const title = $("#setting-title");
    if (title) title.textContent = text;
  }

  function activateSection(sectionKey) {
    // ซ่อนทุก section ก่อน
    $$(".setting-section").forEach((sec) => hide(sec));

    // ซ่อน action buttons ก่อน
    hide($("#btn-add-province"));

    // เปิด section ตาม key
    if (sectionKey === "provinces") {
      show($("#section-provinces"));
      show($("#btn-add-province"));
      setTitle("รายชื่อจังหวัด");
    } else {
      show($("#section-default"));
      setTitle("การตั้งค่าข้อมูล");
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
      const data = json.data || {};
      const items = data.items || [];
      const pagination = data.pagination || {};

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
    Modal (open/close)
  ========================= */
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

  // ปุ่มปิด modal (overlay / X / cancel)
  document.addEventListener("click", (e) => {
    const closeId = e.target?.getAttribute?.("data-close");
    if (closeId === "province-modal") {
      closeProvinceModal();
    }
  });

  // กด ESC ปิด
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && provinceEls.modal && !provinceEls.modal.hidden) {
      closeProvinceModal();
    }
  });

  /* =========================
    Provinces actions
  ========================= */

  // คลิกเมนูซ้ายที่มี data-section
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[data-section]");
    if (!a) return;

    e.preventDefault();
    const sectionKey = a.getAttribute("data-section");

    activateSection(sectionKey);

    if (sectionKey === "provinces") {
      // init state from controls
      provinceState.page = 1;
      provinceState.q = (provinceEls.search?.value || "").trim();
      provinceState.limit = Number(provinceEls.limit?.value || 50);
      loadProvinces();
    }
  });

  // ปุ่มเพิ่มจังหวัด
  provinceEls.btnAdd?.addEventListener("click", () => {
    openProvinceModal({ mode: "create" });
  });

  // ค้นหา (กด Enter)
  provinceEls.search?.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    provinceState.page = 1;
    provinceState.q = (provinceEls.search.value || "").trim();
    loadProvinces();
  });

  // เปลี่ยน limit
  provinceEls.limit?.addEventListener("change", () => {
    provinceState.page = 1;
    provinceState.limit = Number(provinceEls.limit.value || 50);
    loadProvinces();
  });

  // รีเฟรช
  provinceEls.refresh?.addEventListener("click", () => {
    loadProvinces();
  });

  // คลิก pagination
  provinceEls.pagination?.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-page]");
    if (!btn || btn.disabled) return;

    const next = Number(btn.getAttribute("data-page"));
    if (!next || next < 1 || next > provinceState.totalPages) return;

    provinceState.page = next;
    loadProvinces();
  });

  // คลิก edit/delete ในตาราง
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

  // submit form (create/update)
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

  /* =========================
    Init
  ========================= */
  // เปิด default section ไว้ก่อน
hide(document.getElementById("btn-add-province"));

// เปิด default section ไว้ก่อน
activateSection("default");

console.log("gcms-settings-data.js loaded");
})();
