// assets/js/event-edit.js

(function () {
  function getParam(name) {
    const u = new URL(window.location.href);
    return u.searchParams.get(name);
  }

  function toDatetimeLocal(v) {
    if (!v) return "";
    // expect "YYYY-MM-DD HH:MM:SS" -> "YYYY-MM-DDTHH:MM"
    if (typeof v !== "string") return "";
    const s = v.trim();
    if (!s) return "";
    const parts = s.split(" ");
    if (parts.length < 2) return "";
    return parts[0] + "T" + parts[1].slice(0, 5);
  }

  function fromDatetimeLocal(v) {
    if (!v) return null;
    // "YYYY-MM-DDTHH:MM" -> "YYYY-MM-DD HH:MM:00"
    const s = String(v).trim();
    if (!s) return null;
    const [d, t] = s.split("T");
    if (!d || !t) return null;
    return `${d} ${t}:00`;
  }

  function setInfo(msg, { isError = false } = {}) {
    const el = document.getElementById("ee-info");
    if (!el) return;
    el.textContent = msg || "";
    el.classList.toggle("error", !!isError);
    el.style.display = msg ? "block" : "none";
  }

  async function loadProvinces(selectedId) {
    const sel = document.getElementById("ee-province");
    if (!sel) return;

    const json = await window.apiFetch(`/provinces?page=1&limit=200`, { method: "GET" });
    const rows = json?.data || [];

    // keep first option
    while (sel.options.length > 1) sel.remove(1);

    rows.forEach((p) => {
      const opt = document.createElement("option");
      opt.value = String(p.province_id);
      opt.textContent = String(p.nameTH || p.name_th || p.name || p.province_name || p.province_id);
      sel.appendChild(opt);
    });

    if (selectedId) sel.value = String(selectedId);
  }

  async function loadEventStatuses(requestTypeId, selectedId) {
    const sel = document.getElementById("ee-status");
    if (!sel) return;

    if (!requestTypeId) {
      // allow blank
      return;
    }

    const qs = new URLSearchParams({ page: "1", limit: "200", request_type_id: String(requestTypeId) });
    const json = await window.apiFetch(`/event-status?${qs.toString()}`, { method: "GET" });
    const rows = json?.data || [];

    while (sel.options.length > 1) sel.remove(1);

    rows.forEach((s) => {
      const opt = document.createElement("option");
      opt.value = String(s.event_status_id);
      opt.textContent = String(s.status_name || s.status_code || s.event_status_id);
      sel.appendChild(opt);
    });

    if (selectedId) sel.value = String(selectedId);
  }

  async function loadEvent(eventId) {
    const json = await window.apiFetch(`/events/${encodeURIComponent(eventId)}`, { method: "GET" });
    const e = json?.data;
    if (!e) throw new Error("ไม่พบข้อมูล event");

    // Fill form
    document.getElementById("ee-event-id").value = e.event_id ?? "";
    document.getElementById("ee-request-id").value = e.request_id ?? "";
    document.getElementById("ee-title").value = e.title ?? "";
    document.getElementById("ee-detail").value = e.detail ?? "";
    document.getElementById("ee-location").value = e.location ?? "";
    document.getElementById("ee-meeting-link").value = e.meeting_link ?? "";
    document.getElementById("ee-note").value = e.note ?? "";
    document.getElementById("ee-start").value = toDatetimeLocal(e.start_datetime);
    document.getElementById("ee-end").value = toDatetimeLocal(e.end_datetime);

    await loadProvinces(e.province_id);

    // request_type needed to filter event_status
    let requestTypeId = null;
    if (e.request_id) {
      try {
        const r = await window.apiFetch(`/requests/${encodeURIComponent(e.request_id)}`, { method: "GET" });
        requestTypeId = r?.data?.request?.request_type ?? null;
      } catch (err) {
        console.warn("Cannot load request for event_status filter", err);
      }
    }

    await loadEventStatuses(requestTypeId, e.event_status_id);

    // show form
    const form = document.getElementById("event-edit-form");
    if (form) form.style.display = "block";

    // store for later
    window.__eventEdit = { event: e, requestTypeId };
  }

  function bindHandlers(eventId) {
    const backBtn = document.getElementById("ee-back-btn");
    backBtn?.addEventListener("click", () => {
      window.location.href = "/ict8/schedule/calendar.html";
    });

    const delBtn = document.getElementById("ee-delete-btn");
    delBtn?.addEventListener("click", async () => {
      if (!confirm("ยืนยันลบงานนี้? การลบอาจทำให้ประวัติการแจ้งเตือนหายไป")) return;
      delBtn.disabled = true;
      setInfo("กำลังลบ...", { isError: false });
      try {
        await window.apiFetch(`/events/${encodeURIComponent(eventId)}`, { method: "DELETE" });
        setInfo("ลบสำเร็จ", { isError: false });
        setTimeout(() => (window.location.href = "/ict8/schedule/calendar.html"), 600);
      } catch (err) {
        console.error(err);
        setInfo(err?.message || "ลบไม่สำเร็จ", { isError: true });
      } finally {
        delBtn.disabled = false;
      }
    });

    const form = document.getElementById("event-edit-form");
    form?.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      setInfo("", { isError: false });

      const payload = {
        title: document.getElementById("ee-title").value,
        detail: document.getElementById("ee-detail").value,
        location: document.getElementById("ee-location").value,
        province_id: document.getElementById("ee-province").value || null,
        start_datetime: fromDatetimeLocal(document.getElementById("ee-start").value),
        end_datetime: fromDatetimeLocal(document.getElementById("ee-end").value),
        event_status_id: document.getElementById("ee-status").value || null,
        meeting_link: document.getElementById("ee-meeting-link").value,
        note: document.getElementById("ee-note").value,
      };

      const btn = document.getElementById("ee-save-btn");
      btn.disabled = true;
      setInfo("กำลังบันทึก...", { isError: false });

      try {
        await window.apiFetch(`/events/${encodeURIComponent(eventId)}`, { method: "PUT", body: payload });
        setInfo("บันทึกสำเร็จ", { isError: false });
      } catch (err) {
        console.error(err);
        setInfo(err?.message || "บันทึกไม่สำเร็จ", { isError: true });
      } finally {
        btn.disabled = false;
      }
    });
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const eventId = getParam("event_id");
    if (!eventId) {
      setInfo("ไม่พบ event_id ใน URL เช่น ?event_id=1", { isError: true });
      return;
    }

    try {
      setInfo("กำลังโหลด...", { isError: false });
      bindHandlers(eventId);
      await loadEvent(eventId);
      setInfo("");
    } catch (err) {
      console.error(err);
      setInfo(err?.message || "โหลดข้อมูลไม่สำเร็จ", { isError: true });
    }
  });
})();
