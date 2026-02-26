// assets/js/history-image-page.js
// Load active image for site/history.html (.history-img)
(() => {
  function getBasePath() {
    // include.js defines BASE_PATH in global scope
    const bp = typeof window.BASE_PATH === "string" ? window.BASE_PATH : "";
    if (bp) return bp;

    // fallback: infer from location (expects /ict8/...)
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

  async function loadActiveHistoryImage() {
    const img = document.querySelector("img.history-img");
    if (!img) return;

    const basePath = getBasePath();
    const apiBase =
      (window.__APP_CONFIG__ && window.__APP_CONFIG__.API_BASE) ||
      `${basePath}/backend/public`;

    try {
      const res = await fetch(joinUrl(apiBase, "/history-image-page/active?public=1"));
      const json = await res.json().catch(() => null);
      if (!res.ok || !json || json.ok === false) return;

      const row = json.data;
      const path = row && row.path ? String(row.path) : "";
      if (!path) return;

      img.src = joinUrl(apiBase, path);
    } catch (_) {
      // ignore (keep default src)
    }
  }

  document.addEventListener("DOMContentLoaded", loadActiveHistoryImage);
})();
