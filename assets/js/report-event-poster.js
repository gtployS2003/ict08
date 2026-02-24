// assets/js/report-event-poster.js
// Poster editor (left controls + right preview) + save + export PDF

(() => {
  const $ = (sel) => document.querySelector(sel);

  const els = {
    meta: null,
    status: null,
    pageTitle: null,
    previewSize: null,
    previewWrap: null,
    previewScale: null,
    preview: null,
    bg: null,
    cover: null,
    img2: null,
    img3: null,
    img4: null,
    img5: null,
    img6: null,
    txtTitle: null,
    txtContent: null,
    txtDate: null,
    txtIssue: null,

    templateType: null,
    title: null,
    content: null,
    date: null,
    issue: null,

    imageSearch: null,
    images: null,
    imagesHint: null,

    btnSave: null,
    btnExportJpg: null,
    btnReset: null,

    // editor tools
    editTarget: null,
    editX: null,
    editY: null,
    editW: null,
    editH: null,
    editWWrap: null,
    editHWrap: null,
    editFontSize: null,
    editFontSizeWrap: null,
    editColor: null,
    editColorWrap: null,
    editFontFamily: null,
    editFontFamilyWrap: null,
    editAlign: null,
    editAlignWrap: null,
    editReset: null,

    selection: null,
  };

  const state = {
    eventId: 0,
    publicityPost: null,
    publicityPostId: 0,

    templateTypes: [],
    templateTypeId: 0,
    savedTemplate: null, // from event_templates
    eventTemplateId: 0,

    canvasWidth: 1080,
    canvasHeight: 1350,

    media: [],
    mediaFiltered: [],
    selectedMediaIds: [], // ordered; index+1 => slot_no

    // poster-specific fields stored in layout_json
    posterDate: "",
    issueNo: "",

    // event fields (for default issue)
    eventRoundNo: 0,
    eventYear: 0,

    // layout elements (position/style)
    elements: {},
    selectedKey: "title",
  };

  const KEY_TO_NODE_ID = {
    title: "pe-txt-title",
    content: "pe-txt-content",
    date: "pe-txt-date",
    issue: "pe-txt-issue",
    cover: "pe-cover",
    img2: "pe-img-2",
    img3: "pe-img-3",
    img4: "pe-img-4",
    img5: "pe-img-5",
    img6: "pe-img-6",
  };

  function isImageKey(key) {
    return key === "cover" || String(key || "").startsWith("img");
  }

  function getEventId() {
    const qs = new URLSearchParams(window.location.search);
    const id = Number(qs.get("event_id") || 0);
    return Number.isFinite(id) ? id : 0;
  }

  function setStatus(msg, { isError = false } = {}) {
    if (!els.status) return;
    els.status.textContent = msg || "";
    els.status.style.color = isError ? "#b91c1c" : "";
  }

  function setPageTitle(text) {
    if (!els.pageTitle) return;
    const t = (text || "").trim();
    els.pageTitle.textContent = t || "หัวข้อ";
  }

  function syncHeaderOffset() {
    // Header is fixed and can wrap into multiple lines on small screens.
    // We set a CSS variable so the page padding-top and sticky preview offset stay correct.
    const header = document.querySelector(".header");
    const h = header ? Math.ceil(header.getBoundingClientRect().height || 0) : 0;
    const px = h > 0 ? `${h}px` : "160px";
    document.documentElement.style.setProperty("--poster-header-h", px);
  }

  function escapeHtml(s) {
    return String(s || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function safeFilename(name) {
    return String(name || "poster")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9\u0E00-\u0E7F._-]+/g, "")
      .slice(0, 80);
  }

  async function api(path, { method = "GET", body, headers = {} } = {}) {
    if (typeof window.apiFetch !== "function") throw new Error("missing apiFetch");
    return window.apiFetch(path, { method, body, headers });
  }

  function buildFileUrl(filepath) {
    const rawBasePath = String(window.__APP_CONFIG__?.BASE_PATH || "").trim();
    const basePath = rawBasePath.replace(/\/+$/, "");
    const staticBase = basePath ? `${basePath}/backend/public` : "/backend/public";
    const fp = String(filepath || "").trim();
    if (!fp) return "";
    if (fp.startsWith("http://") || fp.startsWith("https://")) return fp;

    // DB usually stores: "uploads/..." (relative) or "/uploads/..." (absolute-from-vhost-root)
    // Physical location: backend/public/uploads/...
    if (fp.startsWith("/uploads/")) {
      return `${staticBase}${fp}`;
    }
    if (fp.startsWith("uploads/")) {
      return `${staticBase}/${fp}`;
    }

    // Already absolute (e.g., /ict8/backend/public/uploads/...)
    if (fp.startsWith("/")) return fp;

    // Fallback for any other relative path
    return `${staticBase}/${fp}`;
  }

  function formatDateThai(isoDate) {
    // isoDate: YYYY-MM-DD
    if (!isoDate) return "";
    const [y, m, d] = String(isoDate).split("-").map((x) => parseInt(x, 10));
    if (!y || !m || !d) return String(isoDate);
    const dt = new Date(y, m - 1, d);
    try {
      return new Intl.DateTimeFormat("th-TH", { year: "numeric", month: "long", day: "numeric" }).format(dt);
    } catch {
      return `${d}/${m}/${y}`;
    }
  }

  function toIsoDateOnly(dtStr) {
    // Accept 'YYYY-MM-DD' or 'YYYY-MM-DD HH:MM:SS'
    const s = String(dtStr || "").trim();
    if (!s) return "";
    const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
    return m ? m[1] : "";
  }

  function clamp(n, min, max) {
    const x = Number(n);
    if (!Number.isFinite(x)) return min;
    return Math.min(max, Math.max(min, x));
  }

  function getScale() {
    if (!els.previewScale) return 1;
    const tr = window.getComputedStyle(els.previewScale).transform;
    if (!tr || tr === "none") return 1;
    // matrix(a,b,c,d,tx,ty)
    const m = tr.match(/matrix\(([^)]+)\)/);
    if (!m) return 1;
    const parts = m[1].split(",").map((x) => parseFloat(x.trim()));
    const a = parts[0];
    return Number.isFinite(a) && a > 0 ? a : 1;
  }

  function getDefaultElements() {
    const w = Number(state.canvasWidth || 1080);
    const h = Number(state.canvasHeight || 1350);
    const padX = Math.round(w * 0.074); // ~80 @1080
    const titleY = Math.round(h * 0.089); // ~120 @1350
    const contentY = Math.round(h * 0.163); // ~220 @1350
    const coverX = Math.round(w * 0.065);
    const coverY = Math.round(h * 0.267);
    const coverW = Math.round(w * 0.87);
    const coverH = Math.round(h * 0.385);

    // Defaults for extra images (2-up thumbnails under the cover)
    const thumbGap = Math.round(w * 0.012);
    const thumbW = Math.round((coverW - thumbGap) / 2);
    const thumbH = Math.round(h * 0.12);
    const thumbsY1 = clamp(Math.round(h * 0.675), 0, h - thumbH);
    const thumbsY2 = clamp(Math.round(thumbsY1 + thumbH + thumbGap), 0, h - thumbH);
    const x1 = coverX;
    const x2 = coverX + thumbW + thumbGap;

    return {
      title: {
        x: padX,
        y: titleY,
        w: w - padX * 2,
        h: 0,
        fontSize: clamp(Math.round(h * 0.047), 18, 96),
        fontWeight: 800,
        color: "#111827",
        fontFamily: "'Noto Sans Thai', sans-serif",
        align: "left",
      },
      content: {
        x: padX,
        y: contentY,
        w: w - padX * 2,
        h: 0,
        fontSize: clamp(Math.round(h * 0.025), 12, 60),
        fontWeight: 500,
        color: "#111827",
        fontFamily: "'Noto Sans Thai', sans-serif",
        align: "left",
      },
      date: {
        x: padX,
        y: Math.round(h * 0.82),
        w: w - padX * 2,
        h: 0,
        fontSize: clamp(Math.round(h * 0.022), 12, 48),
        fontWeight: 600,
        color: "#111827",
        fontFamily: "'Noto Sans Thai', sans-serif",
        align: "left",
      },
      issue: {
        x: padX,
        y: Math.round(h * 0.87),
        w: w - padX * 2,
        h: 0,
        fontSize: clamp(Math.round(h * 0.02), 12, 44),
        fontWeight: 600,
        color: "#111827",
        fontFamily: "'Noto Sans Thai', sans-serif",
        align: "left",
      },
      cover: {
        x: coverX,
        y: coverY,
        w: coverW,
        h: coverH,
      },
      img2: { x: x1, y: thumbsY1, w: thumbW, h: thumbH },
      img3: { x: x2, y: thumbsY1, w: thumbW, h: thumbH },
      img4: { x: x1, y: thumbsY2, w: thumbW, h: thumbH },
      img5: { x: x2, y: thumbsY2, w: thumbW, h: thumbH },
      img6: { x: x1, y: clamp(Math.round(thumbsY2 + thumbH + thumbGap), 0, h - thumbH), w: thumbW, h: thumbH },
    };
  }

  function ensureElementsDefaults() {
    const def = getDefaultElements();
    const cur = state.elements && typeof state.elements === "object" ? state.elements : {};
    const next = { ...def, ...cur };
    // merge nested keys
    Object.keys(def).forEach((k) => {
      next[k] = { ...(def[k] || {}), ...(cur[k] || {}) };
    });
    state.elements = next;
  }

  function applyElementStyles() {
    ensureElementsDefaults();

    const t = state.elements.title;
    const c = state.elements.content;
    const d = state.elements.date;
    const i = state.elements.issue;
    const cover = state.elements.cover;
    const img2 = state.elements.img2;
    const img3 = state.elements.img3;
    const img4 = state.elements.img4;
    const img5 = state.elements.img5;
    const img6 = state.elements.img6;

    const applyText = (node, cfg) => {
      if (!node || !cfg) return;
      node.classList.add("pe-editable");
      node.style.left = `${Math.round(cfg.x || 0)}px`;
      node.style.top = `${Math.round(cfg.y || 0)}px`;
      node.style.width = cfg.w ? `${Math.round(cfg.w)}px` : "auto";
      if (cfg.fontSize) node.style.fontSize = `${Math.round(cfg.fontSize)}px`;
      if (cfg.fontWeight) node.style.fontWeight = String(cfg.fontWeight);
      if (cfg.color) node.style.color = String(cfg.color);
      if (cfg.fontFamily) node.style.fontFamily = String(cfg.fontFamily);
      if (cfg.align) node.style.textAlign = String(cfg.align);
    };

    applyText(els.txtTitle, t);
    applyText(els.txtContent, c);
    applyText(els.txtDate, d);
    applyText(els.txtIssue, i);

    if (els.cover && cover) {
      els.cover.classList.add("pe-editable");
      els.cover.style.left = `${Math.round(cover.x || 0)}px`;
      els.cover.style.top = `${Math.round(cover.y || 0)}px`;
      if (cover.w) els.cover.style.width = `${Math.round(cover.w)}px`;
      if (cover.h) els.cover.style.height = `${Math.round(cover.h)}px`;
    }

    const applyImg = (node, cfg) => {
      if (!node || !cfg) return;
      node.classList.add("pe-editable");
      node.style.left = `${Math.round(cfg.x || 0)}px`;
      node.style.top = `${Math.round(cfg.y || 0)}px`;
      if (cfg.w) node.style.width = `${Math.round(cfg.w)}px`;
      if (cfg.h) node.style.height = `${Math.round(cfg.h)}px`;
    };

    applyImg(els.img2, img2);
    applyImg(els.img3, img3);
    applyImg(els.img4, img4);
    applyImg(els.img5, img5);
    applyImg(els.img6, img6);
  }

  function selectKey(key) {
    const k = KEY_TO_NODE_ID[key] ? key : "title";
    state.selectedKey = k;

    // toggle selected class
    [els.txtTitle, els.txtContent, els.txtDate, els.txtIssue, els.cover, els.img2, els.img3, els.img4, els.img5, els.img6].forEach((n) =>
      n?.classList?.remove("pe-selected")
    );
    const nodeId = KEY_TO_NODE_ID[k];
    const node = nodeId ? document.getElementById(nodeId) : null;
    node?.classList?.add("pe-selected");

    // show selection box
    updateSelectionBox();

    // sync editor fields
    syncEditorFromState();
  }

  function updateSelectionBox() {
    if (!els.selection) return;
    const key = state.selectedKey;
    const cfg = state.elements?.[key];
    const nodeId = KEY_TO_NODE_ID[key];
    const node = nodeId ? document.getElementById(nodeId) : null;
    if (!cfg || !node) {
      els.selection.hidden = true;
      return;
    }

    const img = isImageKey(key);
    const w = Number(cfg.w || node.offsetWidth || 0);
    const h = img ? Number(cfg.h || node.offsetHeight || 0) : Number(node.offsetHeight || 0);

    els.selection.hidden = false;
    els.selection.style.left = `${Math.round(cfg.x || 0)}px`;
    els.selection.style.top = `${Math.round(cfg.y || 0)}px`;
    els.selection.style.width = `${Math.round(w)}px`;
    els.selection.style.height = `${Math.round(h)}px`;

    // For text, hide corner/vertical handles (we allow resizing width only)
    const isCover = isImageKey(key);
    els.selection.querySelectorAll(".pe-handle").forEach((hnd) => {
      const h = String(hnd.getAttribute("data-handle") || "");
      if (isCover) {
        hnd.style.display = "block";
      } else {
        hnd.style.display = h === "e" || h === "w" ? "block" : "none";
      }
    });
  }

  function syncEditorFromState() {
    const key = state.selectedKey;
    const cfg = state.elements?.[key] || {};
    if (els.editTarget) els.editTarget.value = key;
    if (els.editX) els.editX.value = String(Math.round(cfg.x || 0));
    if (els.editY) els.editY.value = String(Math.round(cfg.y || 0));

    const isCover = isImageKey(key);
    if (els.editWWrap) els.editWWrap.style.display = "";
    if (els.editHWrap) els.editHWrap.style.display = isCover ? "" : "none";
    if (els.editW) els.editW.value = String(Math.round(cfg.w || 0));
    if (els.editH) els.editH.value = String(Math.round(cfg.h || 0));

    if (els.editFontSizeWrap) els.editFontSizeWrap.style.display = isCover ? "none" : "";
    if (els.editColorWrap) els.editColorWrap.style.display = isCover ? "none" : "";
    if (els.editFontFamilyWrap) els.editFontFamilyWrap.style.display = isCover ? "none" : "";
    if (els.editAlignWrap) els.editAlignWrap.style.display = isCover ? "none" : "";

    if (!isCover) {
      if (els.editFontSize) els.editFontSize.value = String(Math.round(cfg.fontSize || 24));
      if (els.editColor) els.editColor.value = String(cfg.color || "#111827");
      if (els.editFontFamily) els.editFontFamily.value = String(cfg.fontFamily || "'Noto Sans Thai', sans-serif");
      if (els.editAlign) els.editAlign.value = String(cfg.align || "left");
    }
  }

  function applyEditorToState() {
    const key = state.selectedKey;
    const cfg = { ...(state.elements?.[key] || {}) };
    cfg.x = clamp(Number(els.editX?.value || 0), 0, state.canvasWidth);
    cfg.y = clamp(Number(els.editY?.value || 0), 0, state.canvasHeight);

    const w = Number(els.editW?.value || cfg.w || 0);
    if (Number.isFinite(w) && w > 0) cfg.w = clamp(w, 10, state.canvasWidth);

    if (isImageKey(key)) {
      const h = Number(els.editH?.value || cfg.h || 0);
      if (Number.isFinite(h) && h > 0) cfg.h = clamp(h, 10, state.canvasHeight);
    } else {
      const fs = Number(els.editFontSize?.value || cfg.fontSize || 24);
      if (Number.isFinite(fs) && fs > 0) cfg.fontSize = clamp(fs, 8, 200);
      cfg.color = String(els.editColor?.value || cfg.color || "#111827");
      cfg.fontFamily = String(els.editFontFamily?.value || cfg.fontFamily || "'Noto Sans Thai', sans-serif");
      cfg.align = String(els.editAlign?.value || cfg.align || "left");
    }

    state.elements[key] = cfg;
    applyElementStyles();
    updateSelectionBox();
  }

  function getSelectedTemplateType() {
    return state.templateTypes.find((t) => Number(t.template_type_id) === Number(state.templateTypeId)) || null;
  }

  function applyCanvasSize(w, h) {
    const width = Math.max(320, Number(w) || 1080);
    const height = Math.max(320, Number(h) || 1080);
    state.canvasWidth = width;
    state.canvasHeight = height;
    if (els.preview) {
      els.preview.style.width = `${width}px`;
      els.preview.style.height = `${height}px`;
    }
    if (els.previewSize) {
      els.previewSize.textContent = `${width}×${height}px`;
    }
    requestAnimationFrame(rescalePreview);
  }

  function rescalePreview() {
    if (!els.previewWrap || !els.previewScale) return;
    const wrapW = els.previewWrap.clientWidth || 0;
    const wrapH = els.previewWrap.clientHeight || 0;
    const w = state.canvasWidth || 1080;
    const h = state.canvasHeight || 1350;

    const sx = wrapW > 0 ? wrapW / w : 1;
    const sy = wrapH > 0 ? wrapH / h : 1;
    const scale = Math.min(1, sx, sy);
    els.previewScale.style.transform = `scale(${scale})`;
  }

  function applyTemplateBg() {
    const t = getSelectedTemplateType();
    const bg = String(t?.bg_filepath || "").trim();
    if (!els.bg) return;
    if (bg) {
      els.bg.src = buildFileUrl(bg);
      els.bg.style.display = "block";
    } else {
      els.bg.removeAttribute("src");
      els.bg.style.display = "none";
    }
  }

  function updatePreviewText() {
    if (els.txtTitle) els.txtTitle.textContent = String(els.title?.value || "");
    if (els.txtContent) els.txtContent.textContent = String(els.content?.value || "");
    const d = String(els.date?.value || "");
    const issue = String(els.issue?.value || "");
    if (els.txtDate) els.txtDate.textContent = d ? `วันที่ ${formatDateThai(d)}` : "";
    if (els.txtIssue) els.txtIssue.textContent = issue ? `ฉบับที่ ${issue}` : "";

    setPageTitle(els.title?.value || "");
  }

  function updateCoverPreview() {
    if (!els.cover) return;
    const mid = Number(state.selectedMediaIds?.[0] || 0);
    if (!mid) {
      els.cover.style.display = "none";
      els.cover.removeAttribute("src");
      return;
    }
    const row = state.media.find((m) => Number(m.event_media_id) === mid);
    const fp = row?.filepath;
    const url = buildFileUrl(fp);
    if (!url) {
      els.cover.style.display = "none";
      els.cover.removeAttribute("src");
      return;
    }
    els.cover.crossOrigin = "anonymous";
    els.cover.src = url;
    els.cover.style.display = "block";
  }

  function updateSlotImages() {
    const setSlot = (node, idx) => {
      if (!node) return;
      const mid = Number(state.selectedMediaIds?.[idx] || 0);
      if (!mid) {
        node.style.display = "none";
        node.removeAttribute("src");
        return;
      }
      const row = state.media.find((m) => Number(m.event_media_id) === mid);
      const url = buildFileUrl(row?.filepath);
      if (!url) {
        node.style.display = "none";
        node.removeAttribute("src");
        return;
      }
      node.crossOrigin = "anonymous";
      node.src = url;
      node.style.display = "block";
    };

    setSlot(els.img2, 1);
    setSlot(els.img3, 2);
    setSlot(els.img4, 3);
    setSlot(els.img5, 4);
    setSlot(els.img6, 5);
  }

  function withSelectionHidden(fn) {
    const selectionWasHidden = Boolean(els.selection?.hidden);
    const selectedNodes = Array.from(document.querySelectorAll(".pe-selected"));

    if (els.selection) els.selection.hidden = true;
    selectedNodes.forEach((n) => n.classList.remove("pe-selected"));
    try {
      return fn();
    } finally {
      selectedNodes.forEach((n) => n.classList.add("pe-selected"));
      if (els.selection) els.selection.hidden = selectionWasHidden;
    }
  }

  async function renderPosterCanvas({ scale = 2, backgroundColor = "#ffffff" } = {}) {
    if (!els.preview) throw new Error("missing preview element");
    if (typeof window.html2canvas !== "function") throw new Error("missing html2canvas");

    const w = Number(state.canvasWidth || 1080);
    const h = Number(state.canvasHeight || 1350);

    // Clone the poster node offscreen so export is NOT affected by #pe-preview-scale transform.
    const wrap = document.createElement("div");
    wrap.style.position = "fixed";
    wrap.style.left = "-10000px";
    wrap.style.top = "0";
    wrap.style.width = `${w}px`;
    wrap.style.height = `${h}px`;
    wrap.style.background = backgroundColor;
    wrap.style.zIndex = "-1";

    const clone = els.preview.cloneNode(true);
    clone.id = "pe-preview-export";
    clone.style.width = `${w}px`;
    clone.style.height = `${h}px`;
    clone.style.transform = "none";
    clone.style.transformOrigin = "top left";
    clone.querySelector("#pe-selection")?.remove();
    clone.querySelectorAll(".pe-selected").forEach((n) => n.classList.remove("pe-selected"));

    wrap.appendChild(clone);
    document.body.appendChild(wrap);

    // Give the browser a tick to apply layout/styles.
    await new Promise((r) => setTimeout(r, 30));

    const hiCanvas = await window.html2canvas(clone, {
      backgroundColor,
      useCORS: true,
      scale: Math.max(1, Number(scale || 1)),
    });

    wrap.remove();

    // Downsample to EXACT template canvas size (pixel-perfect to template_type)
    const out = document.createElement("canvas");
    out.width = w;
    out.height = h;
    const ctx = out.getContext("2d");
    if (!ctx) return out;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(hiCanvas, 0, 0, out.width, out.height);
    return out;
  }

  function renderImages() {
    if (!els.images) return;
    const rows = state.mediaFiltered;
    els.images.innerHTML = rows
      .map((r) => {
        const id = Number(r.event_media_id || 0);
        const url = buildFileUrl(r.filepath);
        const slotIndex = state.selectedMediaIds.indexOf(id);
        const isSelected = slotIndex >= 0;
        const slotNo = isSelected ? slotIndex + 1 : 0;
        const isCover = slotNo === 1;
        const title = escapeHtml(r.original_filename || r.stored_filename || `media#${id}`);
        return `
          <button type="button" class="pe-img" data-id="${id}" title="${title}"
            style="position:relative; width:100%; padding:0; border:1px solid rgba(0,0,0,.12); border-radius:12px; overflow:hidden; background:#f9fafb; cursor:pointer;">
            <img src="${escapeHtml(url)}" alt="${title}" style="width:100%; height:92px; object-fit:cover; display:block;" />
            <div style="position:absolute; inset:0; border:2px solid ${isSelected ? "#7c3aed" : "transparent"}; border-radius:12px;"></div>
            ${
              isSelected
                ? `<div style="position:absolute; left:6px; top:6px; background:#7c3aed; color:#fff; font-size:12px; padding:2px 8px; border-radius:999px;">${isCover ? "ปก" : `#${slotNo}`}</div>`
                : ""
            }
          </button>
        `;
      })
      .join("");

    if (els.imagesHint) {
      els.imagesHint.textContent = rows.length ? `${rows.length} รูป` : "ไม่มีรูป";
    }

    els.images.querySelectorAll(".pe-img").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = Number(btn.getAttribute("data-id") || 0);
        if (!id) return;
        const idx = state.selectedMediaIds.indexOf(id);
        if (idx >= 0) {
          state.selectedMediaIds.splice(idx, 1);
        } else {
          // cap selection to 6 slots for now
          if (state.selectedMediaIds.length >= 6) {
            setStatus("เลือกได้สูงสุด 6 รูปในตอนนี้", { isError: true });
            return;
          }
          state.selectedMediaIds.push(id);
        }

        updateCoverPreview();
        updateSlotImages();
        renderImages();
      });
    });
  }

  function applyMediaFilter() {
    const q = String(els.imageSearch?.value || "").trim().toLowerCase();
    if (!q) {
      state.mediaFiltered = [...state.media];
    } else {
      state.mediaFiltered = state.media.filter((r) => {
        const s = `${r.original_filename || ""} ${r.stored_filename || ""} ${r.filepath || ""}`.toLowerCase();
        return s.includes(q);
      });
    }
    renderImages();
  }

  function getDefaultLayoutObject() {
    return {
      version: 1,
      fields: {
        poster_date: state.posterDate || "",
        issue_no: state.issueNo || "",
      },
      elements: state.elements || {},
      assets: {
        selected_event_media_ids: Array.isArray(state.selectedMediaIds) ? state.selectedMediaIds : [],
      },
      canvas: {
        width: state.canvasWidth,
        height: state.canvasHeight,
      },
    };
  }

  function mergeLayoutIntoState(layoutObj) {
    const fields = layoutObj?.fields || {};
    const assets = layoutObj?.assets || {};
    const elements = layoutObj?.elements || {};
    const pd = String(fields.poster_date || "").trim();
    const inNo = String(fields.issue_no || "").trim();
    if (pd) state.posterDate = pd;
    if (inNo) state.issueNo = inNo;
    if (elements && typeof elements === "object") {
      state.elements = elements;
    }
    const ids = Array.isArray(assets.selected_event_media_ids) ? assets.selected_event_media_ids : [];
    const cleaned = ids.map((x) => Number(x || 0)).filter((x) => Number.isFinite(x) && x > 0);
    if (cleaned.length) state.selectedMediaIds = cleaned;
  }

  async function loadTemplateTypes() {
    const json = await api(`/template-types?page=1&limit=200`, { method: "GET" });
    const rows = Array.isArray(json?.data) ? json.data : [];
    state.templateTypes = rows;
    if (!els.templateType) return;
    els.templateType.innerHTML = '<option value="">-- เลือกเทมเพลต --</option>';
    rows.forEach((r) => {
      const id = Number(r.template_type_id || 0);
      const name = String(r.template_name || `Template #${id}`);
      const opt = document.createElement("option");
      opt.value = String(id);
      opt.textContent = name;
      els.templateType.appendChild(opt);
    });

    // If no saved template selection, default to the first template for convenience
    if (!state.templateTypeId && rows.length) {
      state.templateTypeId = Number(rows[0].template_type_id || 0);
      if (state.templateTypeId && els.templateType) {
        els.templateType.value = String(state.templateTypeId);
      }
    }
  }

  async function loadPublicityPost() {
    const json = await api(`/publicity-posts/${encodeURIComponent(state.eventId)}`, { method: "GET" });
    const row = json?.data || null;
    state.publicityPost = row;
    state.publicityPostId = Number(row?.publicity_post_id || 0);

    // Default date from publicity_post.create_at (only if not already set by saved template)
    if (!state.posterDate) {
      const iso = toIsoDateOnly(row?.create_at || row?.created_at || "");
      if (iso) state.posterDate = iso;
    }

    if (els.meta) {
      els.meta.textContent = row?.title ? `event_id: ${state.eventId} • ${row.title}` : `event_id: ${state.eventId}`;
    }

    if (els.title && row?.title) els.title.value = String(row.title);
    if (els.content && row?.content !== undefined) els.content.value = String(row.content || "");

    setPageTitle(row?.title || "");
  }

  async function loadEventDetails() {
    const json = await api(`/events/${encodeURIComponent(state.eventId)}`, { method: "GET" });
    const row = json?.data || null;
    state.eventRoundNo = Number(row?.round_no || 0);
    state.eventYear = Number(row?.event_year || 0);

    // Default issue from round_no/event_year
    if (!state.issueNo && state.eventRoundNo > 0 && state.eventYear > 0) {
      state.issueNo = `${state.eventRoundNo}/${state.eventYear}`;
    }
  }

  async function loadSavedEventTemplateIfAny() {
    const pid = Number(state.publicityPostId || 0);
    if (!pid) return;
    const json = await api(`/event-templates/by-publicity-post/${encodeURIComponent(pid)}`, { method: "GET" });
    const data = json?.data || null;
    if (!data?.template) return;

    state.savedTemplate = data;
    const t = data.template;
    state.eventTemplateId = Number(t?.event_template_id || 0);
    const ttId = Number(t.template_type_id || 0);
    if (ttId > 0) state.templateTypeId = ttId;

    // parse layout_json
    const raw = t.layout_json;
    let obj = null;
    if (typeof raw === "string") {
      try {
        obj = JSON.parse(raw);
      } catch {
        obj = null;
      }
    } else if (raw && typeof raw === "object") {
      obj = raw;
    }
    if (obj) mergeLayoutIntoState(obj);

    // assets are stored as rows (slot_no)
    const assets = Array.isArray(data.assets) ? data.assets : [];
    const slots = assets
      .map((a) => ({
        slot_no: Number(a.slot_no || 0),
        event_media_id: Number(a.event_media_id || 0),
      }))
      .filter((a) => a.slot_no > 0 && a.event_media_id > 0)
      .sort((a, b) => a.slot_no - b.slot_no);
    if (slots.length) {
      state.selectedMediaIds = slots.map((s) => s.event_media_id);
    }
  }

  async function loadEventMedia() {
    const json = await api(`/events/${encodeURIComponent(state.eventId)}/media`, { method: "GET" });
    const rows = Array.isArray(json?.data) ? json.data : [];
    state.media = rows;
    state.mediaFiltered = [...rows];
    renderImages();
    updateCoverPreview();
    updateSlotImages();
  }

  function applyTemplateSelectionToPreview() {
    const t = getSelectedTemplateType();
    // Prefer canvas size from template_type; fallback to current state (possibly merged from layout_json)
    const cw = Number(t?.canvas_width || 0) || Number(state.canvasWidth || 0) || 1080;
    const ch = Number(t?.canvas_height || 0) || Number(state.canvasHeight || 0) || 1350;
    applyCanvasSize(cw, ch);
    applyTemplateBg();
    updatePreviewText();
    updateCoverPreview();
    updateSlotImages();
    applyElementStyles();
    selectKey(state.selectedKey || "title");
  }

  function wireInputs() {
    const onChange = () => {
      state.posterDate = String(els.date?.value || "");
      state.issueNo = String(els.issue?.value || "");
      updatePreviewText();
    };

    els.title?.addEventListener("input", () => {
      updatePreviewText();
    });
    els.content?.addEventListener("input", () => {
      updatePreviewText();
    });
    els.date?.addEventListener("input", onChange);
    els.issue?.addEventListener("input", onChange);

    els.templateType?.addEventListener("change", async () => {
      state.templateTypeId = Number(els.templateType.value || 0);
      state.savedTemplate = null; // switching template: treat as fresh
      applyTemplateSelectionToPreview();
    });

    els.imageSearch?.addEventListener("input", applyMediaFilter);

    els.btnReset?.addEventListener("click", () => {
      if (state.publicityPost?.title !== undefined) els.title.value = String(state.publicityPost.title || "");
      if (state.publicityPost?.content !== undefined) els.content.value = String(state.publicityPost.content || "");

      els.date.value = state.posterDate || "";
      els.issue.value = state.issueNo || "";
      state.selectedMediaIds = [];
      updateCoverPreview();
      updateSlotImages();
      updatePreviewText();
      renderImages();
      setStatus("รีเซ็ตแล้ว");
    });

    els.btnSave?.addEventListener("click", saveAll);
    els.btnExportJpg?.addEventListener("click", exportJpg);

    window.addEventListener("resize", rescalePreview);

    // Editor tool events
    els.editTarget?.addEventListener("change", () => selectKey(String(els.editTarget.value || "title")));
    [els.editX, els.editY, els.editW, els.editH, els.editFontSize, els.editColor, els.editFontFamily, els.editAlign].forEach((inp) => {
      inp?.addEventListener("input", applyEditorToState);
      inp?.addEventListener("change", applyEditorToState);
    });

    els.editReset?.addEventListener("click", () => {
      const def = getDefaultElements();
      const k = state.selectedKey;
      state.elements[k] = { ...(def[k] || {}) };
      applyElementStyles();
      updateSelectionBox();
      syncEditorFromState();
      setStatus("รีเซ็ตองค์ประกอบแล้ว");
    });

    // Drag / resize
    bindDragAndResize();
  }

  function bindDragAndResize() {
    const preview = els.preview;
    if (!preview) return;

    let mode = null; // 'move' | 'resize'
    let handle = "";
    let startX = 0;
    let startY = 0;
    let startCfg = null;

    const onPointerMove = (e) => {
      if (!mode) return;
      const scale = getScale();
      const dx = (e.clientX - startX) / scale;
      const dy = (e.clientY - startY) / scale;
      const key = state.selectedKey;
      const cfg0 = startCfg || {};
      const cfg = { ...(state.elements?.[key] || {}) };

      if (mode === "move") {
        cfg.x = clamp((cfg0.x || 0) + dx, 0, state.canvasWidth);
        cfg.y = clamp((cfg0.y || 0) + dy, 0, state.canvasHeight);
      } else if (mode === "resize") {
        const minW = 30;
        const minH = 30;
        if (isImageKey(key)) {
          let x = cfg0.x || 0;
          let y = cfg0.y || 0;
          let w = cfg0.w || 100;
          let h = cfg0.h || 100;

          if (handle.includes("e")) w = clamp(w + dx, minW, state.canvasWidth);
          if (handle.includes("s")) h = clamp(h + dy, minH, state.canvasHeight);
          if (handle.includes("w")) {
            const nw = clamp(w - dx, minW, state.canvasWidth);
            x = clamp(x + dx, 0, state.canvasWidth);
            w = nw;
          }
          if (handle.includes("n")) {
            const nh = clamp(h - dy, minH, state.canvasHeight);
            y = clamp(y + dy, 0, state.canvasHeight);
            h = nh;
          }
          cfg.x = x;
          cfg.y = y;
          cfg.w = w;
          cfg.h = h;
        } else {
          // text: resize width only
          let x = cfg0.x || 0;
          let w = cfg0.w || 200;
          if (handle === "e") w = clamp(w + dx, 80, state.canvasWidth);
          if (handle === "w") {
            const nw = clamp(w - dx, 80, state.canvasWidth);
            x = clamp(x + dx, 0, state.canvasWidth);
            w = nw;
          }
          cfg.x = x;
          cfg.w = w;
        }
      }

      state.elements[key] = cfg;
      applyElementStyles();
      updateSelectionBox();
      syncEditorFromState();
    };

    const stop = () => {
      mode = null;
      handle = "";
      startCfg = null;
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", stop);
    };

    // handles
    els.selection?.querySelectorAll(".pe-handle").forEach((hnd) => {
      hnd.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const key = state.selectedKey;
        selectKey(key);
        mode = "resize";
        handle = String(hnd.getAttribute("data-handle") || "");
        startX = e.clientX;
        startY = e.clientY;
        startCfg = { ...(state.elements?.[key] || {}) };
        window.addEventListener("pointermove", onPointerMove);
        window.addEventListener("pointerup", stop, { once: true });
      });
    });

    // element move
    const startMove = (e, key) => {
      if (e.button !== undefined && e.button !== 0) return;
      mode = "move";
      selectKey(key);
      startX = e.clientX;
      startY = e.clientY;
      startCfg = { ...(state.elements?.[key] || {}) };
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", stop, { once: true });
    };

    [
      [els.txtTitle, "title"],
      [els.txtContent, "content"],
      [els.txtDate, "date"],
      [els.txtIssue, "issue"],
      [els.cover, "cover"],
      [els.img2, "img2"],
      [els.img3, "img3"],
      [els.img4, "img4"],
      [els.img5, "img5"],
      [els.img6, "img6"],
    ].forEach(([node, key]) => {
      node?.addEventListener("pointerdown", (e) => startMove(e, key));
    });
  }

  async function saveAll() {
    try {
      setStatus("กำลังบันทึก...");

      if (!state.eventId || !state.publicityPostId) {
        setStatus("ไม่พบข้อมูล publicity_post ของ event นี้ (กรุณาสร้างประชาสัมพันธ์ก่อน)", { isError: true });
        return;
      }

      if (!Number(state.templateTypeId || 0)) {
        setStatus("กรุณาเลือก Template ก่อนบันทึก", { isError: true });
        els.templateType?.focus();
        return;
      }

      const title = String(els.title?.value || "").trim() || `กิจกรรม #${state.eventId}`;
      const content = String(els.content?.value || "");
      const dateVal = String(els.date?.value || "");
      const issueVal = String(els.issue?.value || "");

      // 1) Update publicity_post (title/content)
      await api(`/publicity-posts/${encodeURIComponent(state.eventId)}`, {
        method: "PUT",
        body: { title, content },
      });

      // 2) Save event_template + assets
      const layoutObj = getDefaultLayoutObject();
      layoutObj.fields.poster_date = dateVal;
      layoutObj.fields.issue_no = issueVal;
      layoutObj.assets.selected_event_media_ids = Array.isArray(state.selectedMediaIds) ? state.selectedMediaIds : [];

      const assets = [];
      (state.selectedMediaIds || []).forEach((mid, idx) => {
        const id = Number(mid || 0);
        if (!id) return;
        assets.push({ event_media_id: id, slot_no: idx + 1 });
      });

      const saved = await api(`/event-templates/by-publicity-post/${encodeURIComponent(state.publicityPostId)}`, {
        method: "PUT",
        body: {
          template_type_id: Number(state.templateTypeId || 0),
          layout_json: layoutObj,
          assets,
        },
      });

      // refresh local template id for exports
      const tpl = saved?.data?.template || null;
      if (tpl) {
        state.savedTemplate = saved?.data || state.savedTemplate;
        state.eventTemplateId = Number(tpl.event_template_id || 0);
      }

      setStatus("บันทึกสำเร็จ");
    } catch (err) {
      console.error(err);
      setStatus(`บันทึกไม่สำเร็จ: ${err?.message || err}`, { isError: true });
    }
  }

  async function ensureEventTemplateSavedForExport() {
    if (Number(state.eventTemplateId || 0) > 0) return;
    await saveAll();

    // If still missing (e.g. save failed), try load once
    if (Number(state.eventTemplateId || 0) <= 0 && Number(state.publicityPostId || 0) > 0) {
      await loadSavedEventTemplateIfAny();
    }

    if (Number(state.eventTemplateId || 0) <= 0) {
      throw new Error("ยังไม่มี event_template_id (กรุณากดบันทึกก่อน)");
    }
  }

  async function uploadExportJpg({ blob, filename }) {
    const tid = Number(state.eventTemplateId || 0);
    if (!tid) throw new Error("missing event_template_id");

    const fd = new FormData();
    fd.append("file", blob, filename);
    fd.append("original_filename", filename);

    // Backend will upsert into event_template_export and replace file if exists
    return api(`/event-template-exports/by-event-template/${encodeURIComponent(tid)}`, {
      method: "POST",
      body: fd,
    });
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    try {
      const a = document.createElement("a");
      a.href = url;
      a.download = filename || "export.jpg";
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } finally {
      // revoke a bit later to avoid race on some browsers
      setTimeout(() => URL.revokeObjectURL(url), 800);
    }
  }

  async function exportJpg() {
    try {
      if (!els.preview) return;

      setStatus("กำลัง export JPG...");

      if (typeof window.html2canvas !== "function") {
        setStatus("ไม่พบ html2canvas (โหลดไลบรารีไม่สำเร็จ)", { isError: true });
        return;
      }

      // Ensure images/fonts are loaded
      await new Promise((r) => setTimeout(r, 60));

      await ensureEventTemplateSavedForExport();

      const canvas = await withSelectionHidden(() => renderPosterCanvas({ scale: 2, backgroundColor: "#ffffff" }));
      const w = canvas.width;
      const h = canvas.height;

      const title = String(els.title?.value || "poster");
      const filename = safeFilename(title) || `poster-event-${state.eventId}`;

      const outName = `${filename}-${w}x${h}.jpg`;

      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob(
          (b) => {
            if (!b) reject(new Error("toBlob failed"));
            else resolve(b);
          },
          "image/jpeg",
          0.92
        );
      });

      // Download to user's computer
      downloadBlob(blob, outName);

      await uploadExportJpg({ blob, filename: outName });

      setStatus(`Export JPG สำเร็จ: ดาวน์โหลดแล้ว + บันทึกขึ้นระบบแล้ว (${w}×${h}px)`);
    } catch (err) {
      console.error(err);
      setStatus(`Export JPG ไม่สำเร็จ: ${err?.message || err}`, { isError: true });
    }
  }

  function cacheEls() {
    els.meta = $("#poster-meta");
    els.status = $("#pe-status");
    els.pageTitle = $("#pe-page-title");
    els.previewSize = $("#pe-preview-size");
    els.previewWrap = $("#pe-preview-wrap");
    els.previewScale = $("#pe-preview-scale");
    els.preview = $("#pe-preview");
    els.bg = $("#pe-bg");
    els.cover = $("#pe-cover");
    els.img2 = $("#pe-img-2");
    els.img3 = $("#pe-img-3");
    els.img4 = $("#pe-img-4");
    els.img5 = $("#pe-img-5");
    els.img6 = $("#pe-img-6");
    els.txtTitle = $("#pe-txt-title");
    els.txtContent = $("#pe-txt-content");
    els.txtDate = $("#pe-txt-date");
    els.txtIssue = $("#pe-txt-issue");

    els.selection = $("#pe-selection");

    els.templateType = $("#pe-template-type");
    els.title = $("#pe-title");
    els.content = $("#pe-content");
    els.date = $("#pe-date");
    els.issue = $("#pe-issue");

    els.imageSearch = $("#pe-image-search");
    els.images = $("#pe-images");
    els.imagesHint = $("#pe-images-hint");

    els.btnSave = $("#pe-btn-save");
    els.btnExportJpg = $("#pe-btn-export-jpg");
    els.btnReset = $("#pe-btn-reset");

    els.editTarget = $("#pe-edit-target");
    els.editX = $("#pe-edit-x");
    els.editY = $("#pe-edit-y");
    els.editW = $("#pe-edit-w");
    els.editH = $("#pe-edit-h");
    els.editWWrap = $("#pe-edit-w-wrap");
    els.editHWrap = $("#pe-edit-h-wrap");
    els.editFontSize = $("#pe-edit-fontsize");
    els.editFontSizeWrap = $("#pe-edit-fontsize-wrap");
    els.editColor = $("#pe-edit-color");
    els.editColorWrap = $("#pe-edit-color-wrap");
    els.editFontFamily = $("#pe-edit-fontfamily");
    els.editFontFamilyWrap = $("#pe-edit-fontfamily-wrap");
    els.editAlign = $("#pe-edit-align");
    els.editAlignWrap = $("#pe-edit-align-wrap");
    els.editReset = $("#pe-edit-reset");
  }

  document.addEventListener("DOMContentLoaded", async () => {
    cacheEls();
    syncHeaderOffset();
    window.addEventListener("resize", syncHeaderOffset);
    // Fonts may load after DOMContentLoaded and change header height.
    setTimeout(syncHeaderOffset, 50);
    setTimeout(syncHeaderOffset, 300);
    state.eventId = getEventId();

    if (!state.eventId) {
      setStatus("ไม่พบ event_id ใน URL", { isError: true });
      return;
    }

    try {
      setStatus("กำลังโหลดข้อมูล...");

      await loadPublicityPost();
      await loadEventDetails();
      await loadTemplateTypes();
      await loadSavedEventTemplateIfAny();

      // apply saved selection (if any)
      if (els.templateType && state.templateTypeId) {
        els.templateType.value = String(state.templateTypeId);
      }

      // load latest layout if not saved
      // Note: template_layout table removed; defaults come from getDefaultElements() and saved event_template.layout_json

      // apply poster field defaults
      if (els.date) {
        if (!String(els.date.value || "").trim()) els.date.value = state.posterDate || "";
      }
      if (els.issue) {
        if (!String(els.issue.value || "").trim()) els.issue.value = state.issueNo || "";
      }

      // ensure element defaults and apply
      ensureElementsDefaults();
      applyElementStyles();
      selectKey(state.selectedKey || "title");

      await loadEventMedia();
      applyTemplateSelectionToPreview();
      applyMediaFilter();
      wireInputs();

      setStatus("พร้อมใช้งาน");
    } catch (err) {
      console.error(err);
      setStatus(`โหลดข้อมูลไม่สำเร็จ: ${err?.message || err}`, { isError: true });
    }
  });
})();
