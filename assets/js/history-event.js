// assets/js/history-event.js

(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", () => {
    init().catch((err) => {
      console.error("history-event init error:", err);
      setInfo(err?.message || "เกิดข้อผิดพลาด", { isError: true });
    });
  });

  function pickToken() {
    return (
      localStorage.getItem("auth_token") ||
      sessionStorage.getItem("auth_token") ||
      localStorage.getItem("token") ||
      sessionStorage.getItem("token") ||
      localStorage.getItem("access_token") ||
      sessionStorage.getItem("access_token") ||
      ""
    ).trim();
  }

  async function api(path, { method = "GET", body, headers = {}, skipAuth = false } = {}) {
    if (typeof window.apiFetch !== "function") {
      throw new Error("apiFetch not available");
    }
    return window.apiFetch(path, { method, body, headers, skipAuth });
  }

  function normalizeRows(json) {
    const d = json?.data;
    if (Array.isArray(d)) return d;
    if (d && typeof d === "object") {
      if (Array.isArray(d.items)) return d.items;
      if (Array.isArray(d.rows)) return d.rows;
    }
    return [];
  }

  function escapeHtml(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function setInfo(msg, { isError = false } = {}) {
    const el = document.getElementById("he-info");
    if (!el) return;

    el.textContent = msg || "";
    el.style.display = msg ? "block" : "none";

    el.classList.toggle("ts-info-error", !!isError);
    el.classList.toggle("ts-info-ok", !isError && !!msg);
  }

  function setTbody(html) {
    const body = document.getElementById("he-tbody");
    if (!body) return;
    body.innerHTML = html;
  }

  function buildTypeLabel(row) {
    const main = row?.request_type_name || row?.request_type || "-";
    const sub = row?.request_sub_type_name || row?.request_sub_type || "-";
    return `${main} / ${sub}`;
  }

  function fmtDate(v) {
    const s = String(v || "").trim();
    if (!s) return "-";
    return s.replace("T", " ");
  }

  function buildRow(row) {
    const id = row?.event_id || "-";
    const title = row?.title || "-";
    const type = buildTypeLabel(row);
    const end = fmtDate(row?.end_datetime || row?.start_datetime);

    return `
      <tr class="ts-row" data-id="${escapeHtml(id)}">
        <td class="ts-mono" data-label="ID">${escapeHtml(id)}</td>
        <td data-label="ชื่อ">${escapeHtml(title)}</td>
        <td data-label="ประเภทคำร้อง">${escapeHtml(type)}</td>
        <td data-label="เวลา">${escapeHtml(end)}</td>
      </tr>
    `;
  }

  async function init() {
    const token = pickToken();
    if (!token) {
      setInfo("กรุณาเข้าสู่ระบบก่อนใช้งานหน้า ‘ประวัติ’", { isError: true });
      setTbody(`<tr><td colspan="4" class="ts-empty">กรุณาเข้าสู่ระบบ</td></tr>`);
      setTimeout(() => {
        window.location.href = "/ict8/login.html";
      }, 800);
      return;
    }

    setInfo("", { isError: false });
    setTbody(`<tr><td colspan="4" class="ts-loading">กำลังโหลด...</td></tr>`);

    const json = await api("/events/my/completed?limit=200", { method: "GET" });
    const rows = normalizeRows(json);

    if (!rows.length) {
      setTbody(`<tr><td colspan="4" class="ts-empty">ยังไม่มีประวัติ (เสร็จสิ้น)</td></tr>`);
      return;
    }

    const html = rows.map(buildRow).join("");
    setTbody(html);

    // Optional click: just show hint (no deep link requirement)
    const tbody = document.getElementById("he-tbody");
    tbody?.addEventListener("click", (e) => {
      const tr = e.target && e.target.closest ? e.target.closest("tr.ts-row") : null;
      if (!tr) return;
      const id = tr.getAttribute("data-id");
      if (!id) return;
      setInfo(`งาน #${id} เสร็จสิ้นแล้ว`, { isError: false });
    });
  }
})();
