// assets/js/tracking-status.js
// Tracking status (request/event) for requester side.

(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", () => {
    init().catch((err) => {
      console.error("tracking-status init error:", err);
      setInfo(err?.message || "เกิดข้อผิดพลาดในการโหลดข้อมูล", { isError: true });
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

  function getApiBase() {
    const cfg = window.__APP_CONFIG__ || {};
    const raw =
      (typeof window.API_BASE_URL === "string" && window.API_BASE_URL) ||
      cfg.API_BASE ||
      "/ict8/backend/public";
    return String(raw || "").replace(/\/+$/, "");
  }

  async function api(path, { method = "GET", body, headers = {}, skipAuth = false } = {}) {
    if (typeof window.apiFetch === "function") {
      return window.apiFetch(path, { method, body, headers, skipAuth });
    }

    // Fallback fetch (should be rare because we load http.js)
    const url = `${getApiBase()}${path}`;
    const opts = { method, headers: { ...headers } };

    if (!skipAuth) {
      const token = pickToken();
      if (token) opts.headers.Authorization = `Bearer ${token}`;
    }

    if (body instanceof FormData) {
      opts.body = body;
    } else if (body !== undefined) {
      opts.headers["Content-Type"] = "application/json; charset=utf-8";
      opts.body = typeof body === "string" ? body : JSON.stringify(body);
    }

    const res = await fetch(url, opts);
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json?.ok === false || json?.error === true) {
      throw new Error(json?.message || `Request failed (${res.status})`);
    }
    return json;
  }

  function setInfo(msg, { isError = false } = {}) {
    const el = document.getElementById("ts-info");
    if (!el) return;

    el.textContent = msg || "";
    el.style.display = msg ? "block" : "none";

    el.classList.toggle("ts-info-error", !!isError);
    el.classList.toggle("ts-info-ok", !isError && !!msg);
  }

  function escapeHtml(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
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

  function uniqNums(values) {
    const set = new Set();
    (Array.isArray(values) ? values : []).forEach((v) => {
      const n = Number(v);
      if (Number.isFinite(n) && n > 0) set.add(n);
    });
    return Array.from(set);
  }

  function buildTypeLabel(row) {
    const main = row?.request_type_name || row?.request_type || "-";
    const sub = row?.request_sub_type_name || row?.request_sub_type || "-";
    // requirement: ประเภทคำร้องหลัก/ย่อย
    return `${main} / ${sub}`;
  }

  function renderStepper({ steps, currentId, currentName }) {
    const safeSteps = Array.isArray(steps) ? steps : [];

    // If no steps definition found, fallback to a badge.
    if (!safeSteps.length) {
      const name = String(currentName || "-").trim() || "-";
      return `<span class="ts-badge">${escapeHtml(name)}</span>`;
    }

    const idx = safeSteps.findIndex((s) => String(s.id) === String(currentId));
    const currentIdx = idx >= 0 ? idx : -1;

    const parts = safeSteps.map((s, i) => {
      const done = currentIdx >= 0 && i < currentIdx;
      const active = currentIdx >= 0 && i === currentIdx;

      const cls = ["ts-step", done ? "is-done" : "", active ? "is-active" : ""]
        .filter(Boolean)
        .join(" ");

      const title = s.meaning ? ` title="${escapeHtml(s.meaning)}"` : "";
      return `<span class="${cls}"${title}>${escapeHtml(s.name)}</span>`;
    });

    // If we can't locate currentId in the steps list, still show currentName.
    if (currentIdx < 0) {
      const name = String(currentName || "-").trim() || "-";
      parts.push(`<span class="ts-step is-active">${escapeHtml(name)}</span>`);
    }

    return `<div class="ts-stepper">${parts.join("")}</div>`;
  }

  async function fetchStatusSteps({ kind, requestTypeId }) {
    const rt = Number(requestTypeId) || 0;
    if (rt <= 0) return [];

    const endpoint =
      kind === "event"
        ? `/event-status?request_type_id=${encodeURIComponent(rt)}&limit=200`
        : `/request-status?request_type_id=${encodeURIComponent(rt)}&limit=200`;

    const json = await api(endpoint, { method: "GET" });
    const rows = normalizeRows(json);

    // unify
    const mapped = rows
      .map((r) => {
        if (kind === "event") {
          return {
            id: r.event_status_id,
            name: r.status_name,
            meaning: r.meaning,
            sort: Number(r.sort_order) || 0,
          };
        }

        return {
          id: r.status_id,
          name: r.status_name,
          meaning: r.meaning,
          sort: Number(r.sort_order) || 0,
        };
      })
      .filter((x) => x.id);

    mapped.sort((a, b) => (a.sort || 0) - (b.sort || 0) || Number(a.id) - Number(b.id));
    return mapped;
  }

  function setTbody(html) {
    const body = document.getElementById("ts-tbody");
    if (!body) return;
    body.innerHTML = html;
  }

  function buildRow({ kind, row, stepsByTypeId }) {
    const id = kind === "event" ? row?.event_id : row?.request_id;
    const name = kind === "event" ? row?.title : row?.subject;

    const typeId = Number(row?.request_type) || 0;
    const steps = stepsByTypeId.get(typeId) || [];

    const staff = row?.staff_name || "-";

    const currentId = kind === "event" ? row?.event_status_id : row?.current_status_id;
    const currentName = kind === "event" ? row?.event_status_name : row?.status_name;

    const statusHtml = renderStepper({ steps, currentId, currentName });

    const trAttrs = `class="ts-row" data-id="${escapeHtml(id)}"`;

    return `
      <tr ${trAttrs}>
        <td class="ts-mono" data-label="ID">${escapeHtml(id)}</td>
        <td data-label="ชื่อ">${escapeHtml(name || "-")}</td>
        <td data-label="ประเภทคำร้อง">${escapeHtml(buildTypeLabel(row))}</td>
        <td data-label="ผู้รับผิดชอบ">${escapeHtml(staff)}</td>
        <td data-label="สถานะ">${statusHtml}</td>
      </tr>
    `;
  }

  async function handleRowClick({ kind, id }) {
    if (!id) return;

    if (kind === "event") {
      window.location.href = `/ict8/schedule/event-edit.html?id=${encodeURIComponent(id)}`;
      return;
    }

    // kind === request: try to open its related event
    try {
      setInfo("กำลังเปิดงานที่เกี่ยวข้อง...", { isError: false });
      const json = await api(`/events/by-request/${encodeURIComponent(id)}`, { method: "GET" });
      const ev = json?.data || null;
      const eventId = ev?.event_id || ev?.id;
      if (!eventId) throw new Error("Event not found");

      window.location.href = `/ict8/schedule/event-edit.html?id=${encodeURIComponent(eventId)}`;
    } catch (err) {
      console.warn("No event for request", id, err);
      setInfo("คำขอนี้ยังไม่มีการสร้างงาน (event) หรือไม่สามารถเปิดได้", { isError: true });
    }
  }

  async function init() {
    const kind = String(document.body?.dataset?.trackingKind || "request").toLowerCase();
    const token = pickToken();

    if (!token) {
      setInfo("กรุณาเข้าสู่ระบบก่อนใช้งานหน้า ‘ติดตามสถานะ’", { isError: true });
      setTbody(`<tr><td colspan="5" class="ts-empty">กรุณาเข้าสู่ระบบ</td></tr>`);
      // soft redirect (avoid instant redirect for better UX)
      setTimeout(() => {
        window.location.href = "/ict8/login.html";
      }, 900);
      return;
    }

    setInfo("", { isError: false });

    const listEndpoint = kind === "event" ? "/events/my?limit=200" : "/requests/my?limit=200";
    const json = await api(listEndpoint, { method: "GET" });
    const rows = normalizeRows(json);

    if (!rows.length) {
      setTbody(`<tr><td colspan="5" class="ts-empty">ยังไม่มีข้อมูล</td></tr>`);
      return;
    }

    const typeIds = uniqNums(rows.map((r) => r.request_type));
    const stepsByTypeId = new Map();

    await Promise.all(
      typeIds.map(async (rt) => {
        try {
          const steps = await fetchStatusSteps({ kind, requestTypeId: rt });
          stepsByTypeId.set(Number(rt), steps);
        } catch (err) {
          console.warn("Cannot load status steps", { kind, rt, err });
          stepsByTypeId.set(Number(rt), []);
        }
      })
    );

    const html = rows.map((r) => buildRow({ kind, row: r, stepsByTypeId })).join("");
    setTbody(html);

    const tbody = document.getElementById("ts-tbody");
    tbody?.addEventListener("click", (e) => {
      const tr = e.target && e.target.closest ? e.target.closest("tr.ts-row") : null;
      if (!tr) return;
      const id = tr.getAttribute("data-id");
      handleRowClick({ kind, id });
    });
  }
})();
