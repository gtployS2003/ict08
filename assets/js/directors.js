// assets/js/directors.js
// Render directors from backend (table: site_diractor) into site/directors.html
(() => {
  function getBasePath() {
    const bp = typeof window.BASE_PATH === "string" ? window.BASE_PATH : "";
    if (bp) return bp;

    const p = window.location.pathname || "";
    const m = p.match(/^(\/[^\/]+)\//);
    return m ? m[1] : "";
  }

  function joinUrl(base, path) {
    const b = String(base || "").replace(/\/$/, "");
    const p = String(path || "");
    if (!p) return b;
    if (/^https?:\/\//i.test(p)) return p;
    if (p.startsWith("/")) return b + p;
    return b + "/" + p;
  }

  function toBEYear(dateStr) {
    const s = String(dateStr || "").trim();
    if (!s) return null;

    // Expect YYYY-MM-DD (or YYYY/MM/DD)
    const m = s.match(/^(\d{4})[-/]/);
    if (!m) {
      // year only
      const y = parseInt(s, 10);
      if (!Number.isFinite(y)) return null;
      // AD years are < 2400, BE years are >= 2400
      return y < 2400 ? y + 543 : y;
    }

    const y = parseInt(m[1], 10);
    if (!Number.isFinite(y)) return null;
    return y + 543;
  }

  function escapeHtml(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  async function fetchAllDiractors(apiBase) {
    const all = [];
    let page = 1;
    let totalPages = 1;

    // backend max limit is 200
    const limit = 200;

    for (let guard = 0; guard < 50; guard++) {
      const qs = new URLSearchParams();
      qs.set("public", "1");
      qs.set("page", String(page));
      qs.set("limit", String(limit));

      const res = await fetch(joinUrl(apiBase, `/site-diractors?${qs.toString()}`));
      const json = await res.json().catch(() => null);
      if (!res.ok || !json || json.ok === false) throw new Error(json?.message || `Request failed (${res.status})`);

      const data = json.data || {};
      const items = Array.isArray(data.items) ? data.items : [];
      const pag = data.pagination || {};

      all.push(...items);

      totalPages = Number(pag.total_pages || 1);
      if (!Number.isFinite(totalPages) || totalPages < 1) totalPages = 1;

      if (page >= totalPages) break;
      page += 1;
    }

    return all;
  }

  function render(grid, apiBase, items) {
    const basePath = getBasePath();
    const placeholder = `${basePath}/assets/image/director-none.png`;

    if (!items.length) {
      grid.innerHTML = `<div class="muted" style="grid-column:1/-1; padding:12px 0;">ยังไม่มีข้อมูลผู้อำนวยการ</div>`;
      return;
    }

    grid.innerHTML = items
      .map((r) => {
        const firstname = String(r.firstname || "").trim();
        const lastname = String(r.lastname || "").trim();
        const full = `${firstname} ${lastname}`.trim() || "-";

        const startBE = toBEYear(r.start);
        const endBE = toBEYear(r.end);

        const yearLabel = startBE
          ? `พ.ศ.${startBE}-${endBE ? endBE : "ปัจจุบัน"}`
          : "";

        const photoPath = String(r.photo_path || "").trim();
        const photoUrl = photoPath ? joinUrl(apiBase, photoPath) : placeholder;

        return `
          <div class="director-card">
            <div class="directors-photo-wrap">
              <img src="${escapeHtml(photoUrl)}" alt="${escapeHtml(full)}" onerror="this.onerror=null;this.src='${escapeHtml(placeholder)}';">
            </div>
            <div class="director-label">
              <p class="director-name">${escapeHtml(full)}</p>
              ${yearLabel ? `<p class="director-year">${escapeHtml(yearLabel)}</p>` : ""}
            </div>
          </div>
        `;
      })
      .join("");
  }

  async function init() {
    const grid = document.querySelector(".directors-grid");
    if (!grid) return;

    const basePath = getBasePath();
    const apiBase = (window.__APP_CONFIG__ && window.__APP_CONFIG__.API_BASE) || `${basePath}/backend/public`;

    try {
      grid.innerHTML = `<div class="muted" style="grid-column:1/-1; padding:12px 0;">กำลังโหลด...</div>`;
      const items = await fetchAllDiractors(apiBase);
      render(grid, apiBase, items);
    } catch (e) {
      grid.innerHTML = `<div class="muted" style="grid-column:1/-1; padding:12px 0;">โหลดข้อมูลไม่สำเร็จ</div>`;
      // keep console detail for debugging
      console.warn("[directors] load failed", e);
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
