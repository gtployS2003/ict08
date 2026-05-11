(function initRequestsMenu() {
  const grid = document.getElementById("request-type-grid");

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function normalizeHref(url) {
    const raw = String(url || "").trim();
    if (!raw) return "";
    if (/^https?:\/\//i.test(raw)) return raw;
    if (raw.startsWith("/")) return raw;
    return `/ict8/${raw.replace(/^\/+/, "")}`;
  }

  function renderEmpty(message) {
    if (!grid) return;
    grid.innerHTML = `<div class="request-type-status">${escapeHtml(message)}</div>`;
  }

  function renderItems(items) {
    if (!grid) return;

    if (items.length === 0) {
      renderEmpty("ยังไม่มีประเภทคำขอ");
      return;
    }

    grid.innerHTML = items.map((item) => {
      const title = escapeHtml(item.type_name || "ประเภทคำขอ");
      const desc = escapeHtml(item.discription || "");
      const hrefRaw = normalizeHref(item.url_link);
      const href = escapeHtml(hrefRaw || "#");
      const disabledClass = hrefRaw ? "" : " is-disabled";
      const disabledAttrs = hrefRaw ? "" : ' aria-disabled="true" tabindex="-1"';

      return `
        <a class="request-type-card${disabledClass}" href="${href}"${disabledAttrs}>
          <span class="request-type-icon">
            <i class="fa-solid fa-handshake" aria-hidden="true"></i>
          </span>
          <span class="request-type-name">${title}</span>
          ${desc ? `<span class="request-type-desc">${desc}</span>` : ""}
        </a>
      `;
    }).join("");
  }

  async function loadRequestTypes() {
    if (!grid) return;

    try {
      if (!window.RequestTypesAPI) {
        throw new Error("RequestTypesAPI not found");
      }

      const json = await window.RequestTypesAPI.list({ page: 1, limit: 200 });
      const items = json?.data?.items || [];
      renderItems(Array.isArray(items) ? items : []);
    } catch (err) {
      console.error("Failed to load request types:", err);
      renderEmpty("ไม่สามารถโหลดข้อมูลประเภทคำขอได้");
    }
  }

  document.addEventListener("DOMContentLoaded", loadRequestTypes);
})();
