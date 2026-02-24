// assets/js/report-event-poster.js
// Placeholder page (poster generator can be implemented later)

(() => {
  const $ = (sel) => document.querySelector(sel);

  function getEventId() {
    const qs = new URLSearchParams(window.location.search);
    const id = Number(qs.get("event_id") || 0);
    return Number.isFinite(id) ? id : 0;
  }

  async function api(path, { method = "GET" } = {}) {
    if (typeof window.apiFetch === "function") {
      return window.apiFetch(path, { method });
    }
    throw new Error("missing apiFetch");
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const meta = $("#poster-meta");
    const eventId = getEventId();
    if (!meta) return;

    if (!eventId) {
      meta.textContent = "ไม่พบ event_id ใน URL";
      return;
    }

    meta.textContent = `event_id: ${eventId}`;

    // Try to load the post title to show context (optional)
    try {
      const json = await api(`/publicity-posts/${encodeURIComponent(eventId)}`, { method: "GET" });
      const row = json?.data;
      if (row?.title) {
        meta.textContent = `event_id: ${eventId} • ${row.title}`;
      }
    } catch {
      // ignore
    }
  });
})();
