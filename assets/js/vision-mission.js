// assets/js/vision-mission.js
// Render missions from backend (table: site_mission) into site/vision-mission.html
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

  function escapeHtml(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  async function fetchAllMissions(apiBase) {
    const all = [];
    let page = 1;
    let totalPages = 1;

    const limit = 200;

    for (let guard = 0; guard < 50; guard++) {
      const qs = new URLSearchParams();
      qs.set("public", "1");
      qs.set("page", String(page));
      qs.set("limit", String(limit));

      const res = await fetch(joinUrl(apiBase, `/site-missions?${qs.toString()}`));
      const json = await res.json().catch(() => null);
      if (!res.ok || !json || json.ok === false) {
        throw new Error(json?.message || `Request failed (${res.status})`);
      }

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

  function render(container, apiBase, items) {
    const basePath = getBasePath();
    const placeholder = `${basePath}/assets/image/activity-1.png`;

    if (!items.length) {
      container.innerHTML = `<div class="muted" style="padding:12px 0; text-align:center;">ยังไม่มีข้อมูลภารกิจ</div>`;
      return;
    }

    container.innerHTML = items
      .map((it) => {
        const title = String(it.title || "").trim() || "-";
        const desc = String(it.discription || "").trim() || "";
        const imgPath = String(it.img_path || "").trim();
        const imgUrl = imgPath ? joinUrl(apiBase, imgPath) : placeholder;

        return `
          <div class="mission-card" role="article" aria-label="${escapeHtml(title)}">
            <h4>${escapeHtml(title)}</h4>
            <img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(title)}" onerror="this.onerror=null;this.src='${escapeHtml(placeholder)}';">
            <div class="mission-card-body">
              <p class="mission-card-text">${escapeHtml(desc)}</p>
            </div>
          </div>
        `;
      })
      .join("\n");
  }

  async function init() {
    const container = document.getElementById("mission-grid");
    if (!container) return;

    const basePath = getBasePath();
    const apiBase = (window.__APP_CONFIG__ && window.__APP_CONFIG__.API_BASE) || `${basePath}/backend/public`;

    try {
      container.innerHTML = `<div class="muted" style="padding:12px 0; text-align:center;">กำลังโหลด...</div>`;
      const items = await fetchAllMissions(apiBase);
      render(container, apiBase, items);
    } catch (e) {
      container.innerHTML = `<div class="muted" style="padding:12px 0; text-align:center;">โหลดข้อมูลไม่สำเร็จ</div>`;
      console.warn("[vision-mission] load failed", e);
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
