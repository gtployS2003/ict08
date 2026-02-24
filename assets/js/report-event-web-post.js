// assets/js/report-event-web-post.js
// Edit title/content for publicity_post used in website posting

(() => {
  const $ = (sel) => document.querySelector(sel);

  function getEventId() {
    const qs = new URLSearchParams(window.location.search);
    const id = Number(qs.get("event_id") || 0);
    return Number.isFinite(id) ? id : 0;
  }

  async function api(path, { method = "GET", body } = {}) {
    if (typeof window.apiFetch === "function") {
      return window.apiFetch(path, { method, body });
    }
    throw new Error("missing apiFetch");
  }

  function setMeta(text) {
    const el = $("#wep-meta");
    if (el) el.textContent = text || "";
  }

  async function load() {
    const eventId = getEventId();
    if (!eventId) {
      setMeta("ไม่พบ event_id ใน URL");
      return;
    }

    setMeta(`กำลังโหลดข้อมูล (event_id: ${eventId})...`);

    const json = await api(`/publicity-posts/${encodeURIComponent(eventId)}`, { method: "GET" });
    const row = json?.data;

    if (!row) {
      setMeta(`ไม่พบข้อมูลประชาสัมพันธ์สำหรับ event_id: ${eventId}`);
      return;
    }

    $("#wep-title").value = String(row.title ?? "");
    $("#wep-content").value = String(row.content ?? "");

    const updated = row.update_at ? ` • อัปเดตล่าสุด: ${row.update_at}` : "";
    setMeta(`event_id: ${eventId}${updated}`);
  }

  async function save(e) {
    e?.preventDefault?.();

    const eventId = getEventId();
    if (!eventId) {
      alert("ไม่พบ event_id");
      return;
    }

    const title = String($("#wep-title")?.value ?? "").trim();
    const content = String($("#wep-content")?.value ?? "");

    if (!title) {
      alert("กรุณากรอกชื่อกิจกรรม");
      return;
    }

    const btn = $("#wep-save");
    if (btn) btn.disabled = true;

    try {
      await api(`/publicity-posts/${encodeURIComponent(eventId)}`, {
        method: "PUT",
        body: { title, content },
      });

      alert("บันทึกเรียบร้อย");
      await load();
    } catch (err) {
      console.error(err);
      alert(err?.message || "บันทึกไม่สำเร็จ");
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  document.addEventListener("DOMContentLoaded", async () => {
    $("#wep-reload")?.addEventListener("click", () => load().catch(console.error));
    $("#wep-form")?.addEventListener("submit", save);

    try {
      await load();
    } catch (err) {
      console.error(err);
      setMeta("โหลดข้อมูลไม่สำเร็จ");
    }
  });
})();
