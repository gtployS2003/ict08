// assets/js/structure.js
// Render staff structure from backend (table: site_structure) into site/structure.html
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

  function groupBy(arr, keyFn) {
    const map = new Map();
    for (const it of arr) {
      const k = String(keyFn(it) ?? "").trim();
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(it);
    }
    return map;
  }

  async function fetchAllStructures(apiBase) {
    const all = [];
    let page = 1;
    let totalPages = 1;

    const limit = 200;

    for (let guard = 0; guard < 50; guard++) {
      const qs = new URLSearchParams();
      qs.set("public", "1");
      qs.set("page", String(page));
      qs.set("limit", String(limit));

      const res = await fetch(joinUrl(apiBase, `/site-structures?${qs.toString()}`));
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

  function renderCard({ apiBase, basePath, item, isLarge = false }) {
    const placeholder = `${basePath}/assets/image/director-none.png`;

    const prefix = String(item.prefix_th || "").trim();
    const first = String(item.fristname || "").trim();
    const last = String(item.lastname || "").trim();

    const full = `${prefix}${first}${last ? " " + last : ""}`.trim() || "-";

    const role = String(item.position_title || "").trim() || "-";

    const photoPath = String(item.pic_path || "").trim();
    const photoUrl = photoPath ? joinUrl(apiBase, photoPath) : placeholder;

    return `
      <div class="person-card${isLarge ? " large" : ""}">
        <div class="img-background">
          <div class="img-shadow-wrap">
            <img src="${escapeHtml(photoUrl)}" alt="${escapeHtml(full)}" onerror="this.onerror=null;this.src='${escapeHtml(placeholder)}';">
          </div>
        </div>
        <p class="person-name">${escapeHtml(full)}</p>
        <p class="person-role">${escapeHtml(role)}</p>
      </div>
    `;
  }

  function render(container, apiBase, items) {
    const basePath = getBasePath();

    if (!items.length) {
      container.innerHTML = `<div class="muted" style="padding:12px 0;">ยังไม่มีข้อมูลโครงสร้างบุคลากร</div>`;
      return;
    }

    // pick a head card (director) if any
    let head = null;
    for (const it of items) {
      const t = String(it.position_title || "");
      if (t.includes("ผู้อำนวยการ")) {
        head = it;
        break;
      }
    }

    const rest = head ? items.filter((x) => x !== head) : items.slice();

    const byDept = groupBy(rest, (it) => it.department_title || "");

    const sections = [];

    if (head) {
      sections.push(`<div class="structure-head">${renderCard({ apiBase, basePath, item: head, isLarge: true })}</div>`);
    }

    for (const [deptTitle, list] of byDept.entries()) {
      const title = deptTitle || "(ไม่ระบุฝ่าย)";
      const gridClass = list.length === 1 ? "person-grid one-center" : "person-grid";

      sections.push(`<h3 class="department-title">${escapeHtml(title)}</h3>`);
      sections.push(
        `<div class="${gridClass}">${list
          .map((it) => renderCard({ apiBase, basePath, item: it, isLarge: false }))
          .join("")}</div>`
      );
    }

    container.innerHTML = sections.join("\n");
  }

  async function init() {
    const container = document.getElementById("structure-content");
    if (!container) return;

    const basePath = getBasePath();
    const apiBase = (window.__APP_CONFIG__ && window.__APP_CONFIG__.API_BASE) || `${basePath}/backend/public`;

    try {
      container.innerHTML = `<div class="muted" style="padding:12px 0;">กำลังโหลด...</div>`;
      const items = await fetchAllStructures(apiBase);
      render(container, apiBase, items);
    } catch (e) {
      container.innerHTML = `<div class="muted" style="padding:12px 0;">โหลดข้อมูลไม่สำเร็จ</div>`;
      console.warn("[structure] load failed", e);
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
