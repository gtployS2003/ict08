// assets/js/report-news.js
// UI + API wiring for report-event/report-news.html

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
    createTitle: null,
    createContent: null,
    createUrl: null,
    createSubmit: null,

    docsOpenBtn: null,
    docsList: null,
    docsOverlay: null,
    docsSearch: null,
    docsTbody: null,
    docsHint: null,
  };

  const state = {
    news: [],
    newsFiltered: [],
    loading: false,

    creating: false,

    // create form attachments
    createDocSelected: new Map(), // document_id -> row
    docsPickerRows: [],
    docsPickerLoading: false,
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

  async function api(path, { method = "GET", body } = {}) {
    if (typeof window.apiFetch === "function") {
      return window.apiFetch(path, { method, body });
    }
    throw new Error("Missing apiFetch");
  }

  function docToPublicUrl(path) {
    const apiBase = (window.__APP_CONFIG__ && window.__APP_CONFIG__.API_BASE) || "/ict8/backend/public";
    const p0 = String(path || "").trim();
    if (!p0) return "";
    if (/^https?:\/\//i.test(p0)) return p0;
    if (p0.startsWith("/uploads/")) return `${apiBase}${p0}`;
    if (p0.startsWith("uploads/")) return `${apiBase}/${p0}`;
    if (p0.startsWith("./uploads/")) return `${apiBase}/${p0.replace(/^\.\//, "")}`;
    return p0;
  }

  function openDocsModal() {
    if (!els.docsOverlay) return;
    els.docsOverlay.classList.add("open");
    els.docsOverlay.setAttribute("aria-hidden", "false");
    setBodyModalOpen(true);
  }

  function closeDocsModal() {
    if (!els.docsOverlay) return;
    els.docsOverlay.classList.remove("open");
    els.docsOverlay.setAttribute("aria-hidden", "true");
    setBodyModalOpen(false);
  }

  function renderCreateSelectedDocs() {
    if (!els.docsList) return;
    const items = Array.from(state.createDocSelected.values());
    if (items.length === 0) {
      els.docsList.innerHTML = '<div class="muted">ยังไม่ได้เลือกเอกสารแนบ</div>';
      return;
    }

    els.docsList.innerHTML = items
      .map((d) => {
        const id = d?.document_id;
        const title = fmt(d?.original_filename);
        const fp = fmt(d?.filepath);
        const href = fp && fp !== "-" ? docToPublicUrl(fp) : "";
        const fileLine = fp && fp !== "-"
          ? `<a href="${escapeHtml(href)}" title="${escapeHtml(fp)}" target="_blank" rel="noopener noreferrer">${escapeHtml(fp)}</a>`
          : '<span class="muted">-</span>';
        return `
          <div class="rn-doc-item">
            <div>
              <div><b>#${escapeHtml(String(id ?? ""))}</b> ${escapeHtml(title)}</div>
              <div class="muted">${fileLine}</div>
            </div>
            <button type="button" class="btn btn-danger btn-sm" data-doc-remove="1" data-doc-id="${escapeHtml(String(id ?? ""))}">
              <i class="fa-solid fa-trash"></i> เอาออก
            </button>
          </div>
        `;
      })
      .join("");
  }

  function renderDocsPicker() {
    if (!els.docsTbody) return;
    const rows = Array.isArray(state.docsPickerRows) ? state.docsPickerRows : [];
    const selectedIds = new Set(Array.from(state.createDocSelected.keys()).map((k) => Number(k)));

    if (rows.length === 0) {
      els.docsTbody.innerHTML = '<tr><td colspan="5" class="muted">ไม่พบเอกสาร</td></tr>';
      return;
    }

    els.docsTbody.innerHTML = rows
      .map((r) => {
        const id = r?.document_id;
        const idNum = Number(id);
        const title = fmt(r?.original_filename);
        const fp = fmt(r?.filepath);
        const href = fp && fp !== "-" ? docToPublicUrl(fp) : "";
        const selected = selectedIds.has(idNum);

        const fileCell = fp && fp !== "-"
          ? `<a href="${escapeHtml(href)}" title="${escapeHtml(fp)}" target="_blank" rel="noopener noreferrer">${escapeHtml(fp)}</a>`
          : '<span class="muted">-</span>';

        const statusText = selected ? "เลือกแล้ว" : "ยังไม่เลือก";
        const btn = selected
          ? `<button type="button" class="btn btn-danger btn-sm" data-pick-action="remove" data-doc-id="${escapeHtml(String(id ?? ""))}">
              <i class="fa-solid fa-xmark"></i> เอาออก
            </button>`
          : `<button type="button" class="btn btn-primary btn-sm" data-pick-action="add" data-doc-id="${escapeHtml(String(id ?? ""))}">
              <i class="fa-solid fa-paperclip"></i> แนบ
            </button>`;

        return `
          <tr>
            <td>${escapeHtml(fmt(id))}</td>
            <td>${escapeHtml(title)}</td>
            <td>${fileCell}</td>
            <td>${escapeHtml(statusText)}</td>
            <td>${btn}</td>
          </tr>
        `;
      })
      .join("");
  }

  async function loadDocsPicker() {
    if (state.docsPickerLoading) return;
    state.docsPickerLoading = true;
    try {
      if (els.docsTbody) {
        els.docsTbody.innerHTML = '<tr><td colspan="5" class="muted">กำลังโหลด...</td></tr>';
      }

      const q = String(els.docsSearch?.value || "").trim();
      const qs = new URLSearchParams();
      if (q) qs.set("q", q);
      qs.set("page", "1");
      qs.set("limit", "50");

      const json = await api(`/documents?${qs.toString()}`, { method: "GET" });
      const items = Array.isArray(json?.data?.items) ? json.data.items : [];

      state.docsPickerRows = items;
      renderDocsPicker();

      if (els.docsHint) {
        els.docsHint.textContent = `แสดง ${items.length} รายการ`;
      }
    } catch (err) {
      console.error(err);
      if (els.docsTbody) {
        els.docsTbody.innerHTML = '<tr><td colspan="5" class="muted" style="color:#b91c1c;">โหลดเอกสารไม่สำเร็จ</td></tr>';
      }
    } finally {
      state.docsPickerLoading = false;
    }
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
    const n = Array.isArray(state.newsFiltered) ? state.newsFiltered.length : 0;
    els.count.textContent = `ทั้งหมด ${n} รายการ`;
  }

  function buildHaystack(row) {
    return `${row?.news_id ?? ""} ${row?.title ?? ""}`.toLowerCase().trim();
  }

  function applySearch() {
    const q = (els.search ? els.search.value : "").trim().toLowerCase();
    if (!q) state.newsFiltered = [...state.news];
    else state.newsFiltered = state.news.filter((r) => buildHaystack(r).includes(q));

    renderRows(state.newsFiltered);
    setCountText();
  }

  function renderRows(rows) {
    if (!els.tbody) return;

    if (!Array.isArray(rows) || rows.length === 0) {
      els.tbody.innerHTML = `
        <tr>
          <td colspan="4" style="text-align:center; color:#6b7280;">ยังไม่มีข่าวสาร</td>
        </tr>
      `;
      return;
    }

    els.tbody.innerHTML = rows
      .map((row) => {
        const id = row?.news_id;
        const title = fmt(row?.title);
        const isBanner = Number(row?.is_banner ?? 0) === 1;

        const webUrl = `/ict8/report-event/news-web-post.html?news_id=${encodeURIComponent(id ?? "")}`;

        return `
          <tr>
            <td><span>${escapeHtml(fmt(id))}</span></td>
            <td>${escapeHtml(title)}</td>
            <td>
              <div class="row-actions">
                <a class="btn btn-sm btn-ghost" href="${webUrl}">
                  <i class="fa-regular fa-pen-to-square"></i> แก้ไขโพสต์
                </a>
              </div>
            </td>
            <td>
              <label style="display:flex; gap:10px; align-items:center;">
                <input
                  class="rn-banner-toggle"
                  type="checkbox"
                  data-news-id="${escapeHtml(String(id ?? ""))}"
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

  async function loadNews() {
    if (state.loading) return;
    state.loading = true;

    try {
      if (els.tbody) {
        els.tbody.innerHTML = `
          <tr>
            <td colspan="4" style="text-align:center; color:#6b7280;">กำลังโหลดข้อมูล...</td>
          </tr>
        `;
      }

      const qs = new URLSearchParams();
      qs.set("limit", "500");

      const json = await api(`/news?${qs.toString()}`, { method: "GET" });
      const rows = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];

      state.news = rows;
      applySearch();
    } catch (err) {
      console.error(err);
      if (els.tbody) {
        els.tbody.innerHTML = `
          <tr>
            <td colspan="4" style="text-align:center; color:#b91c1c;">โหลดข่าวสารไม่สำเร็จ</td>
          </tr>
        `;
      }
      alert(err?.message || "โหลดข่าวสารไม่สำเร็จ");
    } finally {
      state.loading = false;
    }
  }

  async function createNews() {
    if (state.creating) return;

    const title = String(els.createTitle?.value || "").trim();
    const content = String(els.createContent?.value || "").trim();
    const linkUrl = String(els.createUrl?.value || "").trim();

    if (!title || !content) {
      alert("กรุณากรอกชื่อข่าวสาร และเนื้อหา");
      return;
    }

    state.creating = true;
    if (els.createSubmit) els.createSubmit.disabled = true;

    try {
      const created = await api("/news", {
        method: "POST",
        body: {
          title,
          content,
          link_url: linkUrl || null,
        },
      });

      const newId =
        created?.data?.news_id ??
        created?.data?.id ??
        created?.news_id ??
        created?.id ??
        null;

      // Attach selected documents (if any)
      const docIds = Array.from(state.createDocSelected.keys())
        .map((x) => Number(x))
        .filter((n) => Number.isFinite(n) && n > 0);

      if (newId && docIds.length > 0) {
        for (const docId of docIds) {
          await api(`/news/${encodeURIComponent(String(newId))}/documents`, {
            method: "POST",
            body: { document_id: docId },
          });
        }
      }

      // reset form
      if (els.createForm) els.createForm.reset();
      state.createDocSelected.clear();
      renderCreateSelectedDocs();
      closeCreateModal();
      await loadNews();
    } catch (err) {
      console.error(err);
      alert(err?.message || "เพิ่มข่าวประชาสัมพันธ์ไม่สำเร็จ");
    } finally {
      state.creating = false;
      if (els.createSubmit) els.createSubmit.disabled = false;
    }
  }

  function bindCreateModalEvents() {
    if (!els.openCreateBtn || !els.overlay) return;

    els.openCreateBtn.addEventListener("click", () => {
      openCreateModal();
      try {
        els.createTitle?.focus?.();
      } catch {}
    });

    // close buttons
    els.overlay.querySelectorAll("[data-rn-close='1'], [data-rn-close]").forEach((btn) => {
      btn.addEventListener("click", () => closeCreateModal());
    });

    // click outside to close
    els.overlay.addEventListener("click", (e) => {
      if (e.target === els.overlay) closeCreateModal();
    });

    // esc to close
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      if (els.overlay.classList.contains("open")) closeCreateModal();
    });

    if (els.createForm) {
      els.createForm.addEventListener("submit", (e) => {
        e.preventDefault();
        createNews();
      });
    }
  }

  function bindCreateDocsEvents() {
    if (els.docsOpenBtn) {
      els.docsOpenBtn.addEventListener("click", async () => {
        openDocsModal();
        await loadDocsPicker();
        try {
          els.docsSearch?.focus?.();
        } catch {}
      });
    }

    if (els.docsOverlay) {
      els.docsOverlay.querySelectorAll("[data-rn-docs-close='1'], [data-rn-docs-close]").forEach((btn) => {
        btn.addEventListener("click", () => closeDocsModal());
      });
      els.docsOverlay.addEventListener("click", (e) => {
        if (e.target === els.docsOverlay) closeDocsModal();
      });
    }

    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      if (els.docsOverlay?.classList?.contains("open")) closeDocsModal();
    });

    if (els.docsSearch) {
      let t = null;
      els.docsSearch.addEventListener("input", () => {
        if (t) clearTimeout(t);
        t = setTimeout(() => loadDocsPicker(), 250);
      });
    }

    if (els.docsTbody) {
      els.docsTbody.addEventListener("click", (e) => {
        const btn = e.target?.closest?.("[data-pick-action]");
        if (!btn) return;
        const action = btn.getAttribute("data-pick-action");
        const docId = Number(btn.getAttribute("data-doc-id"));
        if (!Number.isFinite(docId) || docId <= 0) return;

        const row = (Array.isArray(state.docsPickerRows) ? state.docsPickerRows : []).find(
          (x) => Number(x?.document_id) === docId
        );

        if (action === "add") {
          if (row) state.createDocSelected.set(docId, row);
          else state.createDocSelected.set(docId, { document_id: docId });
        } else if (action === "remove") {
          state.createDocSelected.delete(docId);
        }

        renderCreateSelectedDocs();
        renderDocsPicker();
      });
    }

    if (els.docsList) {
      els.docsList.addEventListener("click", (e) => {
        const btn = e.target?.closest?.("[data-doc-remove='1']");
        if (!btn) return;
        const docId = Number(btn.getAttribute("data-doc-id"));
        if (!Number.isFinite(docId) || docId <= 0) return;
        state.createDocSelected.delete(docId);
        renderCreateSelectedDocs();
        renderDocsPicker();
      });
    }
  }

  function bindTableEvents() {
    if (!els.tbody) return;

    els.tbody.addEventListener("change", async (e) => {
      const cb = e.target?.closest?.(".rn-banner-toggle");
      if (!cb) return;

      const newsId = cb.getAttribute("data-news-id");
      const isBanner = cb.checked ? 1 : 0;

      cb.disabled = true;
      try {
        await api(`/news/${encodeURIComponent(newsId)}`, {
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

  function init() {
    els.tbody = $("#rn-table-body");
    els.count = $("#rn-count");
    els.search = $("#rn-search");
    els.refreshBtn = $("#rn-refresh");

    els.openCreateBtn = $("#rn-open-create");
    els.overlay = $("#rn-create-overlay");
    els.createForm = $("#rn-create-form");
    els.createTitle = $("#rn-create-title-input");
    els.createContent = $("#rn-create-content-input");
    els.createUrl = $("#rn-create-url-input");
    els.createSubmit = $("#rn-create-submit");

    els.docsOpenBtn = $("#rn-docs-open");
    els.docsList = $("#rn-docs-list");
    els.docsOverlay = $("#rn-docs-overlay");
    els.docsSearch = $("#rn-docs-search");
    els.docsTbody = $("#rn-docs-tbody");
    els.docsHint = $("#rn-docs-hint");

    renderCreateSelectedDocs();

    if (els.search) {
      els.search.addEventListener("input", () => applySearch());
    }

    if (els.refreshBtn) {
      els.refreshBtn.addEventListener("click", () => loadNews());
    }

    bindTableEvents();
    bindCreateModalEvents();
    bindCreateDocsEvents();
    loadNews();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
