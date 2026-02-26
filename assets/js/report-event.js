// assets/js/report-event.js
// UI + API wiring for report-event/report-event.html

(() => {
  const $ = (sel) => document.querySelector(sel);

  const els = {
    tbody: null,
    count: null,
    search: null,
    refreshBtn: null,
    openCreateBtn: null,

    overlay: null,
    createForm: null,
    createSubmit: null,

    filterProvince: null,
    filterRequestType: null,
    filterRequestSubType: null,
    filterQ: null,

    eventSelect: null,
    eventPreview: null,
  };

  const state = {
    posts: [],
    postsFiltered: [],

    provinces: null,
    requestTypes: null,
    requestSubTypes: null,

    eligibleEvents: [],
    eligibleEventsById: new Map(),

    loadingEligible: false,
    loadingPosts: false,
  };

  function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function fmt(v) {
    const s = (v == null ? "" : String(v)).trim();
    return s || "-";
  }

  function isTruthy(v) {
    if (v === true) return true;
    if (v === false) return false;
    const n = Number(v);
    if (Number.isFinite(n)) return n === 1;
    const s = String(v ?? "").trim().toLowerCase();
    return s === "true" || s === "yes" || s === "y";
  }

  function compareMysqlDateTime(a, b) {
    // MySQL DATETIME usually comes as "YYYY-MM-DD HH:MM:SS".
    // Lexicographic compare works for this format.
    const as = String(a ?? "").trim();
    const bs = String(b ?? "").trim();
    if (!as || !bs) return 0;
    if (as === bs) return 0;
    return as > bs ? 1 : -1;
  }

  function renderBadge({ variant, icon, text, title }) {
    const v = variant ? ` pe-badge--${variant}` : "";
    const t = title ? ` title="${escapeHtml(title)}"` : "";
    return `<span class="pe-badge${v}"${t}><i class="${escapeHtml(icon)}"></i><span>${escapeHtml(text)}</span></span>`;
  }

  async function api(path, { method = "GET", body } = {}) {
    if (typeof window.apiFetch === "function") {
      return window.apiFetch(path, { method, body });
    }

    // fallback to http helpers (older pages)
    const p = String(path || "").replace(/^\//, "");
    if (method === "GET" && typeof window.httpGet === "function") return window.httpGet(p);
    if (method === "POST" && typeof window.httpPost === "function") return window.httpPost(p, body);
    if (method === "PUT" && typeof window.httpPut === "function") return window.httpPut(p, body);
    throw new Error("Missing apiFetch/http helpers");
  }

  function setBodyModalOpen(isOpen) {
    document.body.classList.toggle("modal-open", Boolean(isOpen));
  }

  function openCreateModal() {
    if (!els.overlay) return;
    els.overlay.classList.add("open");
    els.overlay.setAttribute("aria-hidden", "false");
    setBodyModalOpen(true);
  }

  function closeCreateModal() {
    if (!els.overlay) return;
    els.overlay.classList.remove("open");
    els.overlay.setAttribute("aria-hidden", "true");
    setBodyModalOpen(false);
  }

  function setCountText() {
    if (!els.count) return;
    const n = Array.isArray(state.postsFiltered) ? state.postsFiltered.length : 0;
    els.count.textContent = `ทั้งหมด ${n} รายการ`;
  }

  function buildPostHaystack(row) {
    return (
      `${row?.event_id ?? ""} ` +
      `${row?.title ?? ""} ` +
      `${row?.content ?? ""}`
    )
      .toLowerCase()
      .trim();
  }

  function applyPostSearch() {
    const q = (els.search ? els.search.value : "").trim().toLowerCase();
    if (!q) {
      state.postsFiltered = [...state.posts];
    } else {
      state.postsFiltered = state.posts.filter((p) => buildPostHaystack(p).includes(q));
    }
    renderPosts(state.postsFiltered);
    setCountText();
  }

  function renderPosts(rows) {
    if (!els.tbody) return;

    if (!Array.isArray(rows) || rows.length === 0) {
      els.tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align:center; color:#6b7280;">ยังไม่มีรายการประชาสัมพันธ์</td>
        </tr>
      `;
      return;
    }

    els.tbody.innerHTML = rows
      .map((row) => {
        const eventId = row?.event_id;
        const title = fmt(row?.title);
        const isBanner = Number(row?.is_banner ?? 0) === 1;

        // Poster status
        const hasPosterExport = isTruthy(row?.has_poster_export);
        const hasPosterDraft = Number(row?.event_template_id ?? 0) > 0;
        const posterExportPath = String(row?.poster_export_filepath ?? "").trim();
        const posterViewUrl = posterExportPath ? `/ict8/backend/public${posterExportPath}` : "";

        // Website status: update_at is only touched when title/content is edited (not banner toggle)
        const webEdited = compareMysqlDateTime(row?.update_at, row?.create_at) === 1;
        const activityId = Number(row?.activity_id ?? 0);
        const isPosted = activityId > 0;

        const posterUrl = `/ict8/report-event/poster.html?event_id=${encodeURIComponent(eventId ?? "")}`;
        const webUrl = `/ict8/report-event/web-post.html?event_id=${encodeURIComponent(eventId ?? "")}`;

        const posterBadge = hasPosterExport
          ? renderBadge({
              variant: "ok",
              icon: "fa-solid fa-circle-check",
              text: "ส่งออกแล้ว",
              title: "มีไฟล์โปสเตอร์ (JPG) แล้ว",
            })
          : hasPosterDraft
          ? renderBadge({
              variant: "warn",
              icon: "fa-solid fa-pen-ruler",
              text: "มีแบบร่าง",
              title: "มีแบบร่างโปสเตอร์แล้ว แต่ยังไม่ได้ส่งออกไฟล์",
            })
          : renderBadge({
              variant: "todo",
              icon: "fa-regular fa-circle",
              text: "ยังไม่ทำ",
              title: "ยังไม่ได้ทำ/บันทึกโปสเตอร์",
            });

        const webEditedBadge = webEdited
          ? renderBadge({
              variant: "ok",
              icon: "fa-solid fa-circle-check",
              text: "บันทึกแล้ว",
              title: "มีการบันทึกโพสต์เว็บไซต์แล้ว",
            })
          : renderBadge({
              variant: "todo",
              icon: "fa-regular fa-circle",
              text: "ยังไม่บันทึก",
              title: "ยังไม่เคยบันทึกการแก้ไขโพสต์เว็บไซต์",
            });

        const webPostedBadge = isPosted
          ? renderBadge({
              variant: "ok",
              icon: "fa-solid fa-globe",
              text: "โพสต์แล้ว",
              title: "เผยแพร่ขึ้นหน้าเว็บไซต์แล้ว (มี activity_id)",
            })
          : renderBadge({
              variant: "todo",
              icon: "fa-regular fa-circle",
              text: "ยังไม่โพสต์",
              title: "ยังไม่ได้กดโพสต์ขึ้นเว็บไซต์",
            });

        return `
          <tr>
            <td><span>${escapeHtml(fmt(eventId))}</span></td>
            <td>${escapeHtml(title)}</td>
            <td>
              <div class="row-actions">
                <a class="btn btn-sm btn-ghost" href="${posterUrl}">
                  <i class="fa-regular fa-image"></i> ทำโปสเตอร์
                </a>
                <div class="pe-badges">
                  ${posterBadge}
                  ${posterViewUrl ? `<a class="pe-link" href="${escapeHtml(posterViewUrl)}" target="_blank" rel="noopener" title="เปิดไฟล์โปสเตอร์ล่าสุด"><i class="fa-solid fa-arrow-up-right-from-square"></i></a>` : ""}
                </div>
              </div>
            </td>
            <td>
              <div class="row-actions">
                <a class="btn btn-sm btn-ghost" href="${webUrl}">
                  <i class="fa-regular fa-pen-to-square"></i> แก้ไขโพสต์
                </a>
                <div class="pe-badges">
                  ${webEditedBadge}
                  ${webPostedBadge}
                  ${isPosted ? `<a class="pe-link" href="/ict8/site/activity-detail.html?id=${encodeURIComponent(String(activityId))}" target="_blank" rel="noopener" title="เปิดหน้ากิจกรรมบนเว็บไซต์"><i class="fa-solid fa-arrow-up-right-from-square"></i></a>` : ""}
                </div>
              </div>
            </td>
            <td>
              <label style="display:flex; gap:10px; align-items:center;">
                <input
                  class="pe-banner-toggle"
                  type="checkbox"
                  data-event-id="${escapeHtml(String(eventId ?? ""))}"
                  ${isBanner ? "checked" : ""}
                />
                <span class="muted">banner</span>
              </label>
            </td>
          </tr>
        `;
      })
      .join("");
  }

  async function loadPosts() {
    state.loadingPosts = true;

    try {
      const qs = new URLSearchParams();
      qs.set("page", "1");
      qs.set("limit", "500");

      const json = await api(`/publicity-posts?${qs.toString()}`, { method: "GET" });
      const rows = Array.isArray(json?.data) ? json.data : Array.isArray(json?.data?.items) ? json.data.items : [];

      state.posts = rows;
      applyPostSearch();
    } finally {
      state.loadingPosts = false;
    }
  }

  function bindPostTableEvents() {
    if (!els.tbody) return;

    // banner checkbox (event delegation)
    els.tbody.addEventListener("change", async (e) => {
      const cb = e.target?.closest?.(".pe-banner-toggle");
      if (!cb) return;

      const eventId = cb.getAttribute("data-event-id");
      const isBanner = cb.checked ? 1 : 0;

      // optimistic UI, revert on error
      cb.disabled = true;

      try {
        await api(`/publicity-posts/${encodeURIComponent(eventId)}`, {
          method: "PUT",
          body: { is_banner: isBanner },
        });
      } catch (err) {
        console.error(err);
        cb.checked = !cb.checked;
        alert(err?.message || "อัปเดตสถานะหน้าแรกไม่สำเร็จ");
      } finally {
        cb.disabled = false;
      }
    });
  }

  async function ensureLookupsLoaded() {
    // Provinces
    if (!state.provinces) {
      const res = await api("/provinces?limit=200", { method: "GET" });
      state.provinces = Array.isArray(res?.data?.items)
        ? res.data.items
        : Array.isArray(res?.data)
        ? res.data
        : [];
    }

    // Request types
    if (!state.requestTypes) {
      const res = await api("/request-types?page=1&limit=200", { method: "GET" });
      state.requestTypes = Array.isArray(res?.data) ? res.data : Array.isArray(res?.data?.items) ? res.data.items : [];
    }

    // Request sub types
    if (!state.requestSubTypes) {
      const res = await api("/request-sub-types?page=1&limit=200", { method: "GET" });
      state.requestSubTypes = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.data?.items)
        ? res.data.items
        : [];
    }
  }

  function fillSelectOptions(select, items, { getValue, getLabel, placeholderLabel } = {}) {
    if (!select) return;
    const keep = Array.from(select.querySelectorAll("option")).filter((o) => o.value === "");
    select.innerHTML = "";

    // placeholder
    const ph = document.createElement("option");
    ph.value = "";
    ph.textContent = placeholderLabel || "-- ทั้งหมด --";
    select.appendChild(ph);

    (items || []).forEach((it) => {
      const opt = document.createElement("option");
      opt.value = String(getValue(it));
      opt.textContent = String(getLabel(it));
      select.appendChild(opt);
    });

    // restore if any
    keep.forEach((o) => {
      if (!Array.from(select.options).some((x) => x.value === o.value)) select.appendChild(o);
    });
  }

  function refreshSubTypeOptions() {
    if (!els.filterRequestSubType) return;
    const typeId = Number(els.filterRequestType?.value || 0);

    const list = Array.isArray(state.requestSubTypes) ? state.requestSubTypes : [];
    const filtered = typeId > 0 ? list.filter((x) => Number(x?.subtype_of ?? 0) === typeId) : list;

    const current = els.filterRequestSubType.value;
    fillSelectOptions(els.filterRequestSubType, filtered, {
      getValue: (x) => x.request_sub_type_id,
      getLabel: (x) => x.name ?? x.request_sub_type_id,
      placeholderLabel: "-- ทุกประเภทย่อย --",
    });

    // keep current if still valid
    if (current && Array.from(els.filterRequestSubType.options).some((o) => o.value === current)) {
      els.filterRequestSubType.value = current;
    }
  }

  function buildEligibleEventLabel(ev) {
    const id = ev?.event_id;
    const title = (ev?.title || "").trim();
    const prov = ev?.province_name_th || ev?.province_name_en || "";
    const rt = ev?.request_type_name || "";
    const rst = ev?.request_sub_type_name || "";

    const parts = [];
    parts.push(`#${id}`);
    if (title) parts.push(title);
    const meta = [prov, rst, rt].filter((x) => String(x || "").trim() !== "").join(" • ");
    if (meta) parts.push(`(${meta})`);

    return parts.join(" ");
  }

  function renderEligibleEventsOptions(rows) {
    if (!els.eventSelect) return;

    els.eventSelect.innerHTML = "";

    if (!Array.isArray(rows) || rows.length === 0) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "ไม่พบกิจกรรมที่ตรงกับตัวกรอง";
      els.eventSelect.appendChild(opt);
      return;
    }

    const frag = document.createDocumentFragment();
    rows.forEach((ev) => {
      const opt = document.createElement("option");
      opt.value = String(ev.event_id);
      opt.textContent = buildEligibleEventLabel(ev);
      frag.appendChild(opt);
    });

    els.eventSelect.appendChild(frag);
  }

  function syncEligibleEventPreview() {
    if (!els.eventPreview) return;

    const id = Number(els.eventSelect?.value || 0);
    if (!id) {
      els.eventPreview.textContent = "";
      return;
    }

    const ev = state.eligibleEventsById.get(id);
    if (!ev) {
      els.eventPreview.textContent = "";
      return;
    }

    const lines = [];
    const status = ev?.event_status_name || ev?.event_status_code;
    if (status) lines.push(`สถานะ: ${status}`);
    if (ev?.end_datetime) lines.push(`สิ้นสุด: ${ev.end_datetime}`);

    els.eventPreview.innerHTML = lines.map((x) => escapeHtml(x)).join("<br>");
  }

  async function loadEligibleEvents() {
    if (state.loadingEligible) return;
    state.loadingEligible = true;

    try {
      const qs = new URLSearchParams();
      qs.set("limit", "500");

      const provinceId = String(els.filterProvince?.value || "").trim();
      const requestTypeId = String(els.filterRequestType?.value || "").trim();
      const requestSubTypeId = String(els.filterRequestSubType?.value || "").trim();
      const q = String(els.filterQ?.value || "").trim();

      if (provinceId) qs.set("province_id", provinceId);
      if (requestTypeId) qs.set("request_type_id", requestTypeId);
      if (requestSubTypeId) qs.set("request_sub_type_id", requestSubTypeId);
      if (q) qs.set("q", q);

      // Show loading in select
      if (els.eventSelect) {
        els.eventSelect.innerHTML = '<option value="">กำลังโหลดรายการ...</option>';
      }

      const json = await api(`/publicity-posts/eligible-events?${qs.toString()}`, { method: "GET" });
      const rows = Array.isArray(json?.data) ? json.data : Array.isArray(json?.data?.items) ? json.data.items : [];

      state.eligibleEvents = rows;
      state.eligibleEventsById = new Map(rows.map((x) => [Number(x.event_id), x]));

      renderEligibleEventsOptions(rows);
      syncEligibleEventPreview();
    } catch (err) {
      console.error(err);
      if (els.eventSelect) {
        els.eventSelect.innerHTML = '<option value="">โหลดรายการกิจกรรมไม่สำเร็จ</option>';
      }
    } finally {
      state.loadingEligible = false;
    }
  }

  async function setupCreateModal() {
    if (!els.openCreateBtn || !els.overlay) return;

    // close buttons
    els.overlay.querySelectorAll("[data-pe-close='1'], [data-pe-close]").forEach((btn) => {
      btn.addEventListener("click", () => closeCreateModal());
    });

    // click overlay to close
    els.overlay.addEventListener("click", (e) => {
      if (e.target === els.overlay) closeCreateModal();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      if (els.overlay.classList.contains("open")) closeCreateModal();
    });

    // open
    els.openCreateBtn.addEventListener("click", async () => {
      try {
        openCreateModal();

        await ensureLookupsLoaded();

        fillSelectOptions(els.filterProvince, state.provinces, {
          getValue: (x) => x.province_id,
          getLabel: (x) => x.nameTH ?? x.nameEN ?? x.province_id,
          placeholderLabel: "-- ทุกจังหวัด --",
        });

        fillSelectOptions(els.filterRequestType, state.requestTypes, {
          getValue: (x) => x.request_type_id,
          getLabel: (x) => x.type_name ?? x.request_type_id,
          placeholderLabel: "-- ทุกประเภทคำขอ --",
        });

        // sub types depends on request type
        refreshSubTypeOptions();

        // initial load
        await loadEligibleEvents();
      } catch (err) {
        console.error(err);
        alert(err?.message || "ไม่สามารถเปิดหน้าต่างเพิ่มการประชาสัมพันธ์ได้");
      }
    });

    // filter handlers
    const onFilterChange = async () => {
      refreshSubTypeOptions();
      await loadEligibleEvents();
    };

    els.filterProvince?.addEventListener("change", () => loadEligibleEvents());
    els.filterRequestType?.addEventListener("change", onFilterChange);
    els.filterRequestSubType?.addEventListener("change", () => loadEligibleEvents());

    // debounce text search
    let t = null;
    els.filterQ?.addEventListener("input", () => {
      clearTimeout(t);
      t = setTimeout(() => loadEligibleEvents(), 250);
    });

    els.eventSelect?.addEventListener("change", () => syncEligibleEventPreview());

    // submit create
    els.createForm?.addEventListener("submit", async (e) => {
      e.preventDefault();

      const eventId = Number(els.eventSelect?.value || 0);
      if (!eventId) {
        alert("กรุณาเลือกกิจกรรม");
        return;
      }

      els.createSubmit && (els.createSubmit.disabled = true);

      try {
        await api("/publicity-posts", { method: "POST", body: { event_id: eventId } });
        closeCreateModal();
        await loadPosts();
        alert("สร้างรายการประชาสัมพันธ์เรียบร้อย");
      } catch (err) {
        console.error(err);
        alert(err?.message || "สร้างรายการประชาสัมพันธ์ไม่สำเร็จ");
      } finally {
        els.createSubmit && (els.createSubmit.disabled = false);
      }
    });
  }

  function setupPostSearchUi() {
    els.search?.addEventListener("input", applyPostSearch);
  }

  document.addEventListener("DOMContentLoaded", async () => {
    els.tbody = $("#pe-table-body");
    els.count = $("#pe-count");
    els.search = $("#pe-search");
    els.refreshBtn = $("#pe-refresh");
    els.openCreateBtn = $("#pe-open-create");

    els.overlay = $("#pe-create-overlay");
    els.createForm = $("#pe-create-form");
    els.createSubmit = $("#pe-create-submit");

    els.filterProvince = $("#pe-filter-province");
    els.filterRequestType = $("#pe-filter-request-type");
    els.filterRequestSubType = $("#pe-filter-request-sub-type");
    els.filterQ = $("#pe-filter-q");

    els.eventSelect = $("#pe-event-select");
    els.eventPreview = $("#pe-event-preview");

    setupPostSearchUi();
    bindPostTableEvents();
    await setupCreateModal();

    els.refreshBtn?.addEventListener("click", async () => {
      try {
        await loadPosts();
      } catch (err) {
        console.error(err);
        alert("รีเฟรชไม่สำเร็จ");
      }
    });

    try {
      await loadPosts();
      setCountText();
    } catch (err) {
      console.error(err);
      if (els.tbody) {
        els.tbody.innerHTML = `
          <tr>
            <td colspan="5" style="text-align:center; color:#b91c1c;">โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่</td>
          </tr>
        `;
      }
    }
  });
})();
