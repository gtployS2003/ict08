// assets/js/report-news-web-post.js
// Simple editor for news website post

(() => {
  const $ = (sel) => document.querySelector(sel);

  const API_BASE = (window.__APP_CONFIG__ && window.__APP_CONFIG__.API_BASE) || "/ict8/backend/public";

  const els = {
    meta: null,
    form: null,
    title: null,
    content: null,
    linkUrl: null,
    reloadBtn: null,
    previewBtn: null,
    saveBtn: null,

    docsOpenBtn: null,
    docsList: null,
    docsOverlay: null,
    docsSearch: null,
    docsTbody: null,
    docsHint: null,
  };

  const state = {
    newsId: null,
    loading: false,
    saving: false,
    current: null,

    docsAttached: [],
    docsPickerRows: [],
    docsLoading: false,
    docsLoadingPromise: null,
    docsPickerLoading: false,
    docsPickerQ: "",
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

  async function api(path, { method = "GET", body } = {}) {
    if (typeof window.apiFetch === "function") {
      return window.apiFetch(path, { method, body });
    }
    throw new Error("Missing apiFetch");
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

  function parseNewsId() {
    const u = new URL(window.location.href);
    const idParam = u.searchParams.get("news_id");
    const n = idParam ? Number(idParam) : NaN;
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  function setMeta(text, { isError = false } = {}) {
    if (!els.meta) return;
    els.meta.style.color = isError ? "#b91c1c" : "";
    els.meta.innerHTML = escapeHtml(text || "");
  }

  function syncLinks() {
    // Preview always goes to the public news detail page
    if (els.previewBtn) {
      els.previewBtn.href = `/ict8/site/news-detail.html?id=${encodeURIComponent(String(state.newsId ?? ""))}`;
      els.previewBtn.removeAttribute("aria-disabled");
      els.previewBtn.classList.remove("is-disabled");
    }
  }

  function setBodyModalOpen(isOpen) {
    document.body.classList.toggle("modal-open", Boolean(isOpen));
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

  function renderAttachedDocs() {
    if (!els.docsList) return;

    const items = Array.isArray(state.docsAttached) ? state.docsAttached : [];
    if (items.length === 0) {
      els.docsList.innerHTML = '<div class="muted">ยังไม่มีเอกสารแนบ</div>';
      return;
    }

    els.docsList.innerHTML = items
      .map((d) => {
        const id = d?.document_id;
        const title = String(d?.original_filename ?? "").trim() || "-";
        const fp = String(d?.filepath ?? "").trim();
        const href = fp ? docToPublicUrl(fp) : "";
        const fileLine = fp
          ? `<a href="${escapeHtml(href)}" title="${escapeHtml(fp)}" target="_blank" rel="noopener noreferrer">${escapeHtml(fp)}</a>`
          : '<span class="muted">-</span>';

        return `
          <div class="rnp-doc-item">
            <div>
              <div><b>#${escapeHtml(String(id ?? ""))}</b> ${escapeHtml(title)}</div>
              <div class="muted">${fileLine}</div>
            </div>
            <button type="button" class="btn btn-danger btn-sm" data-doc-action="detach" data-doc-id="${escapeHtml(String(id ?? ""))}">
              <i class="fa-solid fa-trash"></i> เอาออก
            </button>
          </div>
        `;
      })
      .join("");
  }

  async function loadAttachedDocs() {
    if (!state.newsId) return;

    // If a load is already in-flight, share it (prevents stale status after clicking attach while initial load is running)
    if (state.docsLoadingPromise) {
      return state.docsLoadingPromise;
    }

    state.docsLoading = true;

    state.docsLoadingPromise = (async () => {
      try {
      if (els.docsList) {
        els.docsList.innerHTML = '<div class="muted">กำลังโหลดเอกสารแนบ...</div>';
      }

      const json = await api(`/news/${encodeURIComponent(state.newsId)}/documents`, { method: "GET" });
      const items = Array.isArray(json?.data?.items)
        ? json.data.items
        : Array.isArray(json?.data)
        ? json.data
        : Array.isArray(json)
        ? json
        : [];

      state.docsAttached = items;
      renderAttachedDocs();
      } catch (err) {
      console.error(err);
      if (els.docsList) {
        els.docsList.innerHTML = '<div class="muted" style="color:#b91c1c;">โหลดเอกสารแนบไม่สำเร็จ</div>';
      }
      } finally {
        state.docsLoading = false;
        state.docsLoadingPromise = null;
      }
    })();

    return state.docsLoadingPromise;
  }

  function renderDocsPickerRows() {
    if (!els.docsTbody) return;
    const rows = Array.isArray(state.docsPickerRows) ? state.docsPickerRows : [];

    if (rows.length === 0) {
      els.docsTbody.innerHTML = '<tr><td colspan="5" class="muted">ไม่พบเอกสาร</td></tr>';
      return;
    }

    const attachedSet = new Set(
      (Array.isArray(state.docsAttached) ? state.docsAttached : [])
        .map((d) => Number(d?.document_id))
        .filter((n) => Number.isFinite(n) && n > 0)
    );

    els.docsTbody.innerHTML = rows
      .map((r) => {
        const id = r?.document_id;
        const title = String(r?.original_filename ?? "").trim() || "-";
        const fp = String(r?.filepath ?? "").trim();
        const href = fp ? docToPublicUrl(fp) : "";

        const idNum = Number(id);
        const attachedHere = attachedSet.has(idNum);

        const statusText = attachedHere ? "แนบแล้ว" : "ยังไม่แนบ";

        const fileCell = fp
          ? `<a href="${escapeHtml(href)}" title="${escapeHtml(fp)}" target="_blank" rel="noopener noreferrer">${escapeHtml(fp)}</a>`
          : '<span class="muted">-</span>';

        const actionBtn = attachedHere
          ? `<button type="button" class="btn btn-danger btn-sm" data-pick-action="detach" data-doc-id="${escapeHtml(String(id ?? ""))}">
              <i class="fa-solid fa-xmark"></i> เอาออก
            </button>`
          : `<button type="button" class="btn btn-primary btn-sm" data-pick-action="attach" data-doc-id="${escapeHtml(String(id ?? ""))}">
              <i class="fa-solid fa-paperclip"></i> แนบ
            </button>`;

        return `
          <tr>
            <td>${escapeHtml(String(id ?? ""))}</td>
            <td>${escapeHtml(title)}</td>
            <td>${fileCell}</td>
            <td>${escapeHtml(statusText)}</td>
            <td>${actionBtn}</td>
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
      state.docsPickerQ = q;

      const qs = new URLSearchParams();
      if (q) qs.set("q", q);
      qs.set("page", "1");
      qs.set("limit", "50");

      const json = await api(`/documents?${qs.toString()}`, { method: "GET" });
      const items = Array.isArray(json?.data?.items) ? json.data.items : [];

      state.docsPickerRows = items;
      renderDocsPickerRows();

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

  async function attachDocToNews(documentId) {
    const docId = Number(documentId);
    if (!Number.isFinite(docId) || docId <= 0) return;

    await api(`/news/${encodeURIComponent(String(state.newsId))}/documents`, {
      method: "POST",
      body: { document_id: docId },
    });
  }

  async function detachDocFromNews(documentId) {
    const docId = Number(documentId);
    if (!Number.isFinite(docId) || docId <= 0) return;

    await api(`/news/${encodeURIComponent(String(state.newsId))}/documents/${encodeURIComponent(String(docId))}`, {
      method: "DELETE",
    });
  }

  async function loadNews() {
    if (!state.newsId || state.loading) return;
    state.loading = true;

    try {
      setMeta("กำลังโหลดข้อมูล...");
      const json = await api(`/news/${encodeURIComponent(state.newsId)}`, { method: "GET" });
      const row = json?.data ?? json;
      state.current = row;

      if (els.title) els.title.value = row?.title ?? "";
      if (els.content) els.content.value = row?.content ?? "";
      if (els.linkUrl) els.linkUrl.value = row?.link_url ?? "";

      const created = row?.create_at ? ` • สร้างเมื่อ ${row.create_at}` : "";
      setMeta(`รหัสข่าวสาร #${state.newsId}${created}`);
      syncLinks();

      // attachments
      await loadAttachedDocs();
    } catch (err) {
      console.error(err);
      setMeta(err?.message || "โหลดข้อมูลไม่สำเร็จ", { isError: true });
      alert(err?.message || "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      state.loading = false;
    }
  }

  async function saveNews() {
    if (!state.newsId || state.saving) return;

    const title = String(els.title?.value || "").trim();
    const content = String(els.content?.value || "").trim();
    const linkUrl = String(els.linkUrl?.value || "").trim();

    if (!title || !content) {
      alert("กรุณากรอกชื่อข่าวสาร และรายละเอียด");
      return;
    }

    state.saving = true;
    if (els.saveBtn) els.saveBtn.disabled = true;

    try {
      await api(`/news/${encodeURIComponent(state.newsId)}`, {
        method: "PUT",
        body: {
          title,
          content,
          link_url: linkUrl || null,
        },
      });

      setMeta(`บันทึกแล้ว • รหัสข่าวสาร #${state.newsId}`);
      syncLinks();
    } catch (err) {
      console.error(err);
      alert(err?.message || "บันทึกไม่สำเร็จ");
    } finally {
      state.saving = false;
      if (els.saveBtn) els.saveBtn.disabled = false;
    }
  }

  function init() {
    state.newsId = parseNewsId();

    els.meta = $("#rnp-meta");
    els.form = $("#rnp-form");
    els.title = $("#rnp-title");
    els.content = $("#rnp-content");
    els.linkUrl = $("#rnp-link-url");
    els.reloadBtn = $("#rnp-reload");
    els.previewBtn = $("#rnp-preview");
    els.saveBtn = $("#rnp-save");

    els.docsOpenBtn = $("#rnp-docs-open");
    els.docsList = $("#rnp-docs-list");
    els.docsOverlay = $("#rnp-docs-overlay");
    els.docsSearch = $("#rnp-docs-search");
    els.docsTbody = $("#rnp-docs-tbody");
    els.docsHint = $("#rnp-docs-hint");

    if (!state.newsId) {
      setMeta("ไม่พบ news_id ใน URL", { isError: true });
      return;
    }

    if (els.linkUrl) {
      // keep preview in sync (link_url field no longer has a dedicated open-link button)
      els.linkUrl.addEventListener("input", () => syncLinks());
    }

    // attached docs remove button
    if (els.docsList) {
      els.docsList.addEventListener("click", async (e) => {
        const btn = e.target?.closest?.("[data-doc-action='detach']");
        if (!btn) return;
        const docId = btn.getAttribute("data-doc-id");
        if (!docId) return;

        try {
          await detachDocFromNews(docId);
          await loadAttachedDocs();
          await loadDocsPicker();
        } catch (err) {
          console.error(err);
          alert(err?.message || "เอาเอกสารแนบออกไม่สำเร็จ");
        }
      });
    }

    // docs modal open/close
    if (els.docsOpenBtn) {
      els.docsOpenBtn.addEventListener("click", async () => {
        openDocsModal();
        await loadAttachedDocs();
        await loadDocsPicker();
        try {
          els.docsSearch?.focus?.();
        } catch {}
      });
    }

    if (els.docsOverlay) {
      els.docsOverlay.querySelectorAll("[data-rnp-docs-close='1'], [data-rnp-docs-close]").forEach((btn) => {
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

    // picker actions
    if (els.docsTbody) {
      els.docsTbody.addEventListener("click", async (e) => {
        const btn = e.target?.closest?.("[data-pick-action]");
        if (!btn) return;
        const action = btn.getAttribute("data-pick-action");
        const docId = btn.getAttribute("data-doc-id");
        if (!action || !docId) return;

        btn.disabled = true;
        try {
          if (action === "attach") {
            await attachDocToNews(docId);
          } else if (action === "detach") {
            await detachDocFromNews(docId);
          }

          await loadAttachedDocs();
          await loadDocsPicker();
        } catch (err) {
          console.error(err);
          alert(err?.message || "อัปเดตเอกสารแนบไม่สำเร็จ");
        } finally {
          btn.disabled = false;
        }
      });
    }

    if (els.reloadBtn) {
      els.reloadBtn.addEventListener("click", () => loadNews());
    }

    if (els.form) {
      els.form.addEventListener("submit", (e) => {
        e.preventDefault();
        saveNews();
      });
    }

    loadNews();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
