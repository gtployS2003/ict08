// assets/js/event-edit.js

(function () {
  const REQUEST_TYPE_CONFERENCE = 2;
  const REQUEST_TYPE_REPAIR = 3;

  function getParam(name) {
    const u = new URL(window.location.href);
    return u.searchParams.get(name);
  }

  function getApiBase() {
    const cfg = window.__APP_CONFIG__ || {};
    const base = String(cfg.API_BASE || "http://127.0.0.1/ict8/backend/public");
    return base.replace(/\/+$/, "");
  }

  function buildFileUrl(filepath) {
    const fp = String(filepath || "").trim();
    if (!fp) return "";
    if (/^https?:\/\//i.test(fp)) return fp;
    return `${getApiBase()}/${fp.replace(/^\/+/, "")}`;
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

  function setSubtitle(msg) {
    const el = document.getElementById("ee-subtitle");
    if (!el) return;
    el.textContent = msg || "";
  }

  function setPageTitle(msg) {
    const el = document.getElementById("ee-page-title");
    if (!el) return;
    el.textContent = msg || "";
  }

  function normalizeRows(json) {
    // Supports different API shapes:
    // - { data: [...] }
    // - { data: { items: [...] } }
    // - { data: { rows: [...] } }
    const d = json?.data;
    if (Array.isArray(d)) return d;
    if (d && typeof d === "object") {
      if (Array.isArray(d.items)) return d.items;
      if (Array.isArray(d.rows)) return d.rows;
    }
    return [];
  }

  function isArrayOfObjects(v) {
    return Array.isArray(v) && v.every((x) => x && typeof x === "object");
  }

  function escapeHtml(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function setLogSubtitle(msg) {
    const el = document.getElementById("ee-log-subtitle");
    if (!el) return;
    el.textContent = msg || "";
  }

  function isLogOpen() {
    return document.body.classList.contains("ee-log-open");
  }

  function setLogOpen(open) {
    const willOpen = !!open;
    document.body.classList.toggle("ee-log-open", willOpen);

    const toggleBtn = document.getElementById("ee-log-toggle");
    if (toggleBtn) toggleBtn.setAttribute("aria-expanded", willOpen ? "true" : "false");

    const overlay = document.getElementById("ee-log-overlay");
    if (overlay) overlay.setAttribute("aria-hidden", willOpen ? "false" : "true");

    const drawer = document.getElementById("ee-log-drawer");
    if (drawer) drawer.setAttribute("aria-hidden", willOpen ? "false" : "true");
  }

  function wireLogDrawer() {
    const toggleBtn = document.getElementById("ee-log-toggle");
    const closeBtn = document.getElementById("ee-log-close");
    const overlay = document.getElementById("ee-log-overlay");

    toggleBtn?.addEventListener("click", () => {
      setLogOpen(!isLogOpen());
    });
    closeBtn?.addEventListener("click", () => setLogOpen(false));
    overlay?.addEventListener("click", () => setLogOpen(false));

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && isLogOpen()) {
        setLogOpen(false);
      }
    });

    // initial state
    setLogOpen(false);
  }

  async function fetchEventLogs(eventId) {
    const json = await window.apiFetch(`/events/${encodeURIComponent(eventId)}/logs`, { method: "GET" });
    return normalizeRows(json);
  }

  async function refreshSidebarAttachments(eventId) {
    const box = document.getElementById("ee-log-attachments");
    const src = document.getElementById("ee-log-attachments-source");
    if (box) box.textContent = "กำลังโหลด...";
    if (src) src.textContent = "";

    try {
      const ctx = window.__eventEdit || {};
      const e = ctx.event || {};
      const isInternal = !!ctx.isInternal;

      if (isInternal) {
        if (src) src.textContent = "แหล่งข้อมูล: event_report_picture";
        const rep = await fetchEventReport(eventId);
        const pics = Array.isArray(rep?.pictures) ? rep.pictures : [];
        renderAttachments({ containerId: "ee-log-attachments", atts: pics });
        return;
      }

      const requestId = e.request_id ? Number(e.request_id) : 0;
      if (requestId > 0) {
        if (src) src.textContent = "แหล่งข้อมูล: request_attachment";
        const r = await window.apiFetch(`/requests/${encodeURIComponent(requestId)}`, { method: "GET" });
        const atts = Array.isArray(r?.data?.attachments) ? r.data.attachments : [];
        // keep ctx in sync (best effort)
        try {
          const c2 = window.__eventEdit || {};
          c2.requestAttachments = atts;
          window.__eventEdit = c2;
        } catch (_) {}
        renderAttachments({ containerId: "ee-log-attachments", atts });
        return;
      }

      if (src) src.textContent = "-";
      if (box) box.textContent = "-";
    } catch (err) {
      console.warn("Cannot load sidebar attachments", err);
      if (src) src.textContent = "โหลดไฟล์แนบไม่สำเร็จ";
      if (box) box.textContent = "-";
    }
  }

  function normText(v) {
    return String(v ?? "").replace(/\r\n/g, "\n").trim();
  }

  function displayValue(v) {
    const s = normText(v);
    return s === "" ? "(ว่าง)" : s;
  }

  function buildChangeBlock({ label, before, after }) {
    const wrap = document.createElement("div");
    wrap.className = "ee-change";

    const lab = document.createElement("div");
    lab.className = "ee-change-label";
    lab.textContent = label;
    wrap.appendChild(lab);

    if (before !== null) {
      const b = document.createElement("div");
      b.className = "ee-change-before";
      b.textContent = `ก่อน: ${displayValue(before)}`;
      wrap.appendChild(b);
    }

    const a = document.createElement("div");
    a.className = "ee-change-after";
    a.textContent = before === null
      ? `ค่า: ${displayValue(after)}`
      : `หลัง: ${displayValue(after)}`;
    wrap.appendChild(a);

    return wrap;
  }

  function renderEventLogs({ containerId, logs }) {
    const el = document.getElementById(containerId);
    if (!el) return 0;

    const rows = Array.isArray(logs) ? logs : [];
    if (!rows.length) {
      el.className = "ee-empty";
      el.textContent = "ยังไม่มีประวัติการแก้ไข";
      return 0;
    }

    el.className = "";
    el.innerHTML = "";

    const fields = [
      { key: "title", label: "ชื่องาน" },
      { key: "detail", label: "รายละเอียด" },
      { key: "location", label: "สถานที่" },
      { key: "note", label: "หมายเหตุ" },
    ];

    const ctx = window.__eventEdit || {};
    const userMap = ctx.userMap instanceof Map ? ctx.userMap : new Map();

    let renderedCount = 0;

    rows.forEach((r, idx) => {
      const bubble = document.createElement("div");
      bubble.className = "ee-bubble";

      const top = document.createElement("div");
      top.className = "ee-bubble-top";

      const name = document.createElement("div");
      name.className = "ee-bubble-name";
      name.textContent = String(r.updated_by_name || r.updated_by || "-");
      top.appendChild(name);

      const sub = document.createElement("div");
      sub.className = "ee-bubble-sub";
      const logId = r.event_log_id ?? r.id ?? "";
      sub.textContent = logId ? `log#${logId}` : "";
      top.appendChild(sub);

      bubble.appendChild(top);

      const content = document.createElement("div");
      content.className = "ee-bubble-content";

      if (idx === 0) {
        // first snapshot
        fields.forEach((f) => {
          content.appendChild(buildChangeBlock({
            label: f.label,
            before: null,
            after: r[f.key] ?? "",
          }));
        });

        // participant snapshot
        const curIds = parseParticipantUserIds(r.participant_user_ids);
        content.appendChild(buildChangeBlock({
          label: "ผู้เข้าร่วม",
          before: null,
          after: formatParticipantNames(curIds, userMap),
        }));
      } else {
        const prev = rows[idx - 1] || {};
        const changes = [];
        fields.forEach((f) => {
          const a = normText(r[f.key]);
          const b = normText(prev[f.key]);
          if (a !== b) {
            changes.push({ label: f.label, before: prev[f.key] ?? "", after: r[f.key] ?? "" });
          }
        });

        // participants diff
        const prevIds = parseParticipantUserIds(prev.participant_user_ids);
        const curIds = parseParticipantUserIds(r.participant_user_ids);
        if (participantKey(prevIds) !== participantKey(curIds)) {
          changes.push({
            label: "ผู้เข้าร่วม",
            before: formatParticipantNames(prevIds, userMap),
            after: formatParticipantNames(curIds, userMap),
          });
        }

        // If no changes, skip rendering this log row to keep the sidebar tidy.
        if (!changes.length) return;

        changes.forEach((c) => content.appendChild(buildChangeBlock(c)));
      }

      bubble.appendChild(content);
      el.appendChild(bubble);
      renderedCount++;
    });

    if (renderedCount <= 0) {
      el.className = "ee-empty";
      el.textContent = "ยังไม่มีประวัติการแก้ไข";
      return 0;
    }

    // scroll to latest
    try {
      el.parentElement?.scrollTo({ top: el.parentElement.scrollHeight, behavior: "smooth" });
    } catch (_) {}

    return renderedCount;
  }

  async function refreshEventLogs(eventId) {
    const listEl = document.getElementById("ee-log-list");
    if (listEl) {
      listEl.className = "ee-empty";
      listEl.textContent = "กำลังโหลด...";
    }
    setLogSubtitle(eventId ? `event_id=${eventId}` : "");

    try {
      const logs = await fetchEventLogs(eventId);
      const shown = renderEventLogs({ containerId: "ee-log-list", logs });
      setLogSubtitle(`event_id=${eventId} • ${Number(shown || 0)} รายการ`);
    } catch (err) {
      console.warn("Cannot load event logs", err);
      if (listEl) {
        listEl.className = "ee-empty";
        listEl.textContent = "โหลดประวัติไม่สำเร็จ";
      }
      setLogSubtitle(eventId ? `event_id=${eventId}` : "");
    }

    // attachments in sidebar (best effort)
    try {
      await refreshSidebarAttachments(eventId);
    } catch (_) {}
  }

  async function loadProvinces(selectedId) {
    const sel = document.getElementById("ee-province");
    if (!sel) return;

    const json = await window.apiFetch(`/provinces?page=1&limit=200`, { method: "GET" });
    const rows = normalizeRows(json);

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

  async function fetchEventStatuses(requestTypeId) {
    if (!requestTypeId) return [];
    const qs = new URLSearchParams({ page: "1", limit: "200", request_type_id: String(requestTypeId) });
    const json = await window.apiFetch(`/event-status?${qs.toString()}`, { method: "GET" });
    return normalizeRows(json);
  }

  function pickMilestoneStatuses(statusRows) {
    // Prefer Thai names if present, else fallback to first 4 by sort_order.
    const rows = Array.isArray(statusRows) ? statusRows : [];

    const wanted = ["รอรับงาน", "รับงานแล้ว", "กำลังดำเนินการ", "เสร็จสิ้น"];
    const picked = [];

    wanted.forEach((w) => {
      const found = rows.find((r) => String(r.status_name || "").includes(w))
        || rows.find((r) => String(r.status_code || "").toLowerCase() === w);
      if (found) picked.push(found);
    });

    if (picked.length === 4) return picked;

    // fallback: first 4
    const sorted = rows.slice().sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
    return sorted.slice(0, 4);
  }

  function mapStatusToStageIndex(statusRow, milestones) {
    const name = String(statusRow?.status_name || "");
    const id = Number(statusRow?.event_status_id || 0);

    // exact milestone id match
    const byId = milestones.findIndex((m) => Number(m.event_status_id || 0) === id);
    if (byId >= 0) return byId;

    // heuristic mapping for repair sub-statuses
    if (name.includes("เสร็จสิ้น")) return 3;
    if (name.includes("รับงานแล้ว")) return 1;
    if (name.includes("รอรับงาน")) return 0;

    if (
      name.includes("กำลังดำเนินการ") ||
      name.includes("รออะไหล่") ||
      name.includes("ส่งซ่อมภายนอก") ||
      name.includes("ดำเนินการแก้ไขแล้ว")
    ) {
      return 2;
    }

    return 0;
  }

  function renderStepper({ containerId, milestones, currentStageIndex, currentStatusName }) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = "";

    const labels = milestones.map((m) => String(m.status_name || m.status_code || m.event_status_id || "-"));
    labels.forEach((label, idx) => {
      const step = document.createElement("div");
      step.className = "ee-step";
      if (idx < currentStageIndex) step.classList.add("completed");
      if (idx === currentStageIndex) step.classList.add("active");

      const t = document.createElement("div");
      t.className = "ee-step-label";
      t.textContent = label;
      step.appendChild(t);

      const sub = document.createElement("div");
      sub.className = "ee-step-sub";
      sub.textContent = idx === currentStageIndex
        ? (currentStatusName ? `สถานะปัจจุบัน: ${currentStatusName}` : "สถานะปัจจุบัน")
        : (idx < currentStageIndex ? "ผ่านแล้ว" : "");
      step.appendChild(sub);

      el.appendChild(step);
    });
  }

  async function loadUserOptions() {
    const json = await window.apiFetch(`/users/options`, { method: "GET" });
    const rows = normalizeRows(json);
    return Array.isArray(rows) ? rows : [];
  }

  async function loadParticipantUsers23() {
    const json = await window.apiFetch(`/users/participants`, { method: "GET" });
    const rows = normalizeRows(json);
    return Array.isArray(rows) ? rows : [];
  }

  function getDisplayName(u) {
    const dn = String(u.display_name || "").trim();
    if (dn) return dn;
    const ln = String(u.line_user_name || "").trim();
    if (ln) return ln;
    const fn = String(u.first_name_th || "").trim();
    const l2 = String(u.last_name_th || "").trim();
    const full = `${fn} ${l2}`.trim();
    if (full) return full;
    return `user#${u.user_id}`;
  }

  function buildUserMap(users) {
    const rows = Array.isArray(users) ? users : [];
    const m = new Map();
    rows.forEach((u) => {
      const id = Number(u?.user_id || 0);
      if (!Number.isFinite(id) || id <= 0) return;
      m.set(id, getDisplayName(u));
    });
    return m;
  }

  function parseParticipantUserIds(v) {
    if (Array.isArray(v)) {
      return v
        .map((x) => Number(x))
        .filter((x) => Number.isFinite(x) && x > 0);
    }
    const s = String(v ?? "").trim();
    if (!s) return [];
    return s
      .split(",")
      .map((x) => Number(String(x).trim()))
      .filter((x) => Number.isFinite(x) && x > 0);
  }

  function participantKey(ids) {
    const arr = Array.isArray(ids) ? ids.slice() : [];
    arr.sort((a, b) => Number(a) - Number(b));
    return arr.join(",");
  }

  function formatParticipantNames(ids, userMap) {
    const m = userMap instanceof Map ? userMap : new Map();
    const clean = Array.isArray(ids) ? ids.slice() : [];
    clean.sort((a, b) => Number(a) - Number(b));
    const names = clean.map((id) => m.get(Number(id)) || `user#${id}`);
    return names.join(", ");
  }

  function renderParticipants({ containerId, users, selectedUserIds }) {
    const el = document.getElementById(containerId);
    if (!el) return;

    if (!Array.isArray(users) || !users.length) {
      el.innerHTML = `<div class="ee-muted">ไม่พบรายชื่อผู้ใช้</div>`;
      return;
    }

    const selected = new Set((Array.isArray(selectedUserIds) ? selectedUserIds : []).map((x) => Number(x)));

    const grid = document.createElement("div");
    grid.className = "ee-checklist-grid";

    users.forEach((u) => {
      const uid = Number(u.user_id || 0);
      if (!uid) return;

      const wrap = document.createElement("label");
      wrap.className = "ee-check-item";

      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.value = String(uid);
      cb.checked = selected.has(uid);
      cb.setAttribute("data-ee-participant", "1");

      const textWrap = document.createElement("div");

      const name = document.createElement("div");
      name.className = "ee-check-name";
      name.textContent = getDisplayName(u);

      const meta = document.createElement("div");
      meta.className = "ee-check-meta";
      const roleId = u.user_role_id !== undefined && u.user_role_id !== null ? `role=${u.user_role_id}` : "";
      meta.textContent = [roleId, `user_id=${uid}`].filter(Boolean).join(" • ");

      textWrap.appendChild(name);
      textWrap.appendChild(meta);

      wrap.appendChild(cb);
      wrap.appendChild(textWrap);
      grid.appendChild(wrap);
    });

    el.innerHTML = "";
    el.appendChild(grid);
  }

  function getSelectedParticipantIds(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return [];
    const cbs = Array.from(el.querySelectorAll('input[type="checkbox"][data-ee-participant="1"]'));
    return cbs
      .filter((cb) => cb.checked)
      .map((cb) => Number(cb.value))
      .filter((v) => Number.isFinite(v) && v > 0);
  }

  function renderAttachments({ containerId, atts }) {
    const el = document.getElementById(containerId);
    if (!el) return;

    const rows = Array.isArray(atts) ? atts : [];
    if (!rows.length) {
      el.textContent = "-";
      return;
    }

    const wrap = document.createElement("div");
    wrap.style.display = "flex";
    wrap.style.flexDirection = "column";
    wrap.style.gap = "8px";

    rows.forEach((a) => {
      const fp = String(a.filepath || "").trim();
      const name = String(a.original_filename || a.stored_filename || fp || "ไฟล์แนบ");

      const row = document.createElement("div");
      row.style.display = "flex";
      row.style.alignItems = "center";
      row.style.gap = "10px";
      row.style.flexWrap = "wrap";

      const url = fp ? buildFileUrl(fp) : "";
      const isImg = url && /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(url);

      if (isImg) {
        const img = document.createElement("img");
        img.src = url;
        img.alt = name;
        img.style.maxWidth = "220px";
        img.style.borderRadius = "12px";
        img.style.border = "1px solid #e5e7eb";
        row.appendChild(img);
      }

      if (url) {
        const link = document.createElement("a");
        link.href = url;
        link.target = "_blank";
        link.rel = "noopener";
        link.textContent = name;
        link.style.textDecoration = "underline";
        row.appendChild(link);
      } else {
        const span = document.createElement("span");
        span.textContent = name;
        row.appendChild(span);
      }

      wrap.appendChild(row);
    });

    el.innerHTML = "";
    el.appendChild(wrap);
  }

  async function fetchEventReport(eventId) {
    const json = await window.apiFetch(`/events/${encodeURIComponent(eventId)}/report`, { method: "GET" });
    return json?.data || null;
  }

  async function uploadEventPicturesIfAny(eventId) {
    const input = document.getElementById("ee-new-event-pictures");
    const preview = document.getElementById("ee-new-event-pictures-preview");
    if (!input || !eventId) return null;

    const files = input.files ? Array.from(input.files) : [];
    if (!files.length) return null;

    const fd = new FormData();
    files.forEach((f) => fd.append("pictures[]", f));
    const res = await window.apiFetch(`/events/${encodeURIComponent(eventId)}/report/pictures`, {
      method: "POST",
      body: fd,
    });

    input.value = "";
    if (preview) {
      preview.innerHTML = "";
      preview.style.display = "none";
    }

    return res;
  }

  async function deleteEventPicture(eventId, pictureId) {
    return window.apiFetch(`/events/${encodeURIComponent(eventId)}/report/pictures/${encodeURIComponent(pictureId)}`, {
      method: "DELETE",
    });
  }

  function wireNewEventPicturesPreview() {
    const input = document.getElementById("ee-new-event-pictures");
    const preview = document.getElementById("ee-new-event-pictures-preview");
    if (!input || !preview) return;

    input.addEventListener("change", () => {
      const files = input.files ? Array.from(input.files) : [];
      if (!files.length) {
        preview.innerHTML = "";
        preview.style.display = "none";
        return;
      }

      preview.innerHTML = "";
      preview.style.display = "block";

      files.forEach((f) => {
        const li = document.createElement("li");

        if (/^image\//i.test(f.type)) {
          const img = document.createElement("img");
          img.src = URL.createObjectURL(f);
          img.alt = f.name;
          img.style.display = "block";
          img.style.maxWidth = "220px";
          img.style.borderRadius = "10px";
          img.style.border = "1px solid #e5e7eb";
          img.style.margin = "6px 0";
          li.appendChild(img);
        }

        const name = document.createElement("div");
        name.textContent = f.name;
        li.appendChild(name);

        preview.appendChild(li);
      });
    });
  }

  function wireNewAttachmentsPreview() {
    const input = document.getElementById("ee-new-attachments");
    const preview = document.getElementById("ee-new-attachments-preview");
    if (!input || !preview) return;

    input.addEventListener("change", () => {
      const files = input.files ? Array.from(input.files) : [];
      if (!files.length) {
        preview.innerHTML = "";
        preview.style.display = "none";
        return;
      }

      preview.innerHTML = "";
      preview.style.display = "block";

      files.forEach((f) => {
        const li = document.createElement("li");

        if (/^image\//i.test(f.type)) {
          const img = document.createElement("img");
          img.src = URL.createObjectURL(f);
          img.alt = f.name;
          img.style.display = "block";
          img.style.maxWidth = "220px";
          img.style.borderRadius = "10px";
          img.style.border = "1px solid #e5e7eb";
          img.style.margin = "6px 0";
          li.appendChild(img);
        }

        const name = document.createElement("div");
        name.textContent = f.name;
        li.appendChild(name);

        preview.appendChild(li);
      });
    });
  }

  async function loadEvent(eventId) {
    const json = await window.apiFetch(`/events/${encodeURIComponent(eventId)}`, { method: "GET" });
    const e = json?.data;
    if (!e) throw new Error("ไม่พบข้อมูล event");

    const titleText = String(e.title ?? "").trim();
    setPageTitle(titleText || `งาน #${e.event_id ?? ""}`);
    setSubtitle(e.request_id ? (`event_id=${e.event_id ?? ""} • request_id=${e.request_id ?? ""}`) : (`event_id=${e.event_id ?? ""}`));

    // Fill form
    document.getElementById("ee-event-id").value = e.event_id ?? "";
    document.getElementById("ee-request-id").value = e.request_id ?? "";
    const eidText = document.getElementById("ee-event-id-text");
    if (eidText) eidText.textContent = String(e.event_id ?? "-");

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
    let req = null;
    let requestAttachments = [];
    if (e.request_id) {
      try {
        const r = await window.apiFetch(`/requests/${encodeURIComponent(e.request_id)}`, { method: "GET" });
        req = r?.data?.request ?? null;
        requestTypeId = req?.request_type ?? null;
        requestAttachments = Array.isArray(r?.data?.attachments) ? r.data.attachments : [];
      } catch (err) {
        console.warn("Cannot load request for event_status filter", err);
      }
    }

    const isInternal = !e.request_id;

    // internal mode: hide request meta fields
    const rtField = document.getElementById("ee-request-type-field");
    const rstField = document.getElementById("ee-request-sub-type-field");
    if (rtField) rtField.style.display = isInternal ? "none" : "block";
    if (rstField) rstField.style.display = isInternal ? "none" : "block";

    // internal mode: allow editing dates
    const startEl = document.getElementById("ee-start");
    const endEl = document.getElementById("ee-end");
    if (startEl) startEl.disabled = !isInternal;
    if (endEl) endEl.disabled = !isInternal;

    // internal mode: hide stepper
    const stepperEl = document.getElementById("ee-stepper");
    const hintEl = document.getElementById("ee-stepper-hint");
    if (stepperEl) stepperEl.style.display = isInternal ? "none" : "grid";
    if (hintEl) hintEl.style.display = isInternal ? "none" : "block";

    // readonly request meta
    const rtEl = document.getElementById("ee-request-type");
    const rstEl = document.getElementById("ee-request-sub-type");
    if (rtEl) {
      const v = req
        ? (String(req.request_type_name || "").trim() || String(req.request_type || "-").trim())
        : "-";
      rtEl.value = v || "-";
    }
    if (rstEl) {
      const v = req
        ? (String(req.request_sub_type_name || "").trim() || String(req.request_sub_type || "-").trim())
        : "-";
      rstEl.value = v || "-";
    }

    // repair-only: device
    const isRepairType = Number(requestTypeId) === REQUEST_TYPE_REPAIR;
    const devField = document.getElementById("ee-device-field");
    const devEl = document.getElementById("ee-device");
    if (devField) devField.style.display = isRepairType ? "block" : "none";
    if (isRepairType && devEl) {
      const dn = String(req?.device_name || "").trim();
      const ip = String(req?.device_ip || "").trim();
      const deviceId = Number(req?.device_id || 0);

      let text = "";
      if (dn || ip) {
        text = [dn, ip].filter(Boolean).join(" • ");
      } else if (deviceId > 0) {
        // fallback: fetch device
        try {
          const dj = await window.apiFetch(`/devices/${encodeURIComponent(deviceId)}`, { method: "GET" });
          const d = dj?.data || null;
          const dn2 = String(d?.device_name || "").trim();
          const ip2 = String(d?.ip || "").trim();
          text = [dn2, ip2].filter(Boolean).join(" • ");
        } catch (err) {
          console.warn("Cannot load device", err);
        }
      }

      devEl.value = text || "ไม่ระบุอุปกรณ์";
    }

    // conditional fields
    const meetingField = document.getElementById("ee-meeting-link-field");
    if (meetingField) {
      meetingField.style.display = Number(requestTypeId) === REQUEST_TYPE_CONFERENCE ? "block" : "none";
    }

    // statuses (request-based only)
    const statusRows = isInternal ? [] : await fetchEventStatuses(requestTypeId);

    // keep hidden select populated (debug/compat)
    const hiddenSel = document.getElementById("ee-status");
    if (hiddenSel) {
      while (hiddenSel.options.length > 1) hiddenSel.remove(1);
      statusRows.forEach((s) => {
        const opt = document.createElement("option");
        opt.value = String(s.event_status_id);
        opt.textContent = String(s.status_name || s.status_code || s.event_status_id);
        hiddenSel.appendChild(opt);
      });
      if (e.event_status_id) hiddenSel.value = String(e.event_status_id);
    }

    const hiddenStatusInput = document.getElementById("ee-event-status-id");
    if (hiddenStatusInput) hiddenStatusInput.value = e.event_status_id ? String(e.event_status_id) : "";

    // repair-only dropdown
    const repairField = document.getElementById("ee-repair-status-field");
    const repairSel = document.getElementById("ee-repair-status");
    const isRepair = Number(requestTypeId) === REQUEST_TYPE_REPAIR;
    if (repairField) repairField.style.display = isRepair ? "block" : "none";
    if (isRepair && repairSel) {
      const allow = new Set(["รออะไหล่", "ส่งซ่อมภายนอก", "ดำเนินการแก้ไขแล้ว"]);
      const filtered = statusRows.filter((s) => allow.has(String(s.status_name || "").trim()));

      while (repairSel.options.length > 1) repairSel.remove(1);
      filtered.forEach((s) => {
        const opt = document.createElement("option");
        opt.value = String(s.event_status_id);
        opt.textContent = String(s.status_name || s.status_code || s.event_status_id);
        repairSel.appendChild(opt);
      });

      if (e.event_status_id) repairSel.value = String(e.event_status_id);
    }

    // stepper (request-based only)
    const milestones = isInternal ? [] : pickMilestoneStatuses(statusRows);
    if (!isInternal) {
      const currentStatusRow = statusRows.find((s) => Number(s.event_status_id || 0) === Number(e.event_status_id || 0)) || null;
      const currentStatusName = String(currentStatusRow?.status_name || currentStatusRow?.status_code || "");
      const currentStageIndex = mapStatusToStageIndex(currentStatusRow, milestones);
      renderStepper({
        containerId: "ee-stepper",
        milestones,
        currentStageIndex,
        currentStatusName,
      });

      // "รับงาน" button: show when currently waiting and there is an "รับงานแล้ว" status
      const acceptBtn = document.getElementById("ee-accept-btn");
      // Requirement: after accepting, jump straight to "กำลังดำเนินการ".
      const acceptStatusId = resolveAcceptInProgressStatusId(statusRows);
      const isWaiting = currentStatusName.includes("รอรับงาน") || currentStageIndex === 0;
      if (acceptBtn) {
        if (acceptStatusId && isWaiting) {
          acceptBtn.style.display = "inline-flex";
          acceptBtn.dataset.acceptStatusId = String(acceptStatusId);
        } else {
          acceptBtn.style.display = "none";
          acceptBtn.dataset.acceptStatusId = "";
        }
      }

      const hint = document.getElementById("ee-stepper-hint");
      if (hint) {
        hint.textContent = isRepair
          ? "* งานซ่อมสามารถเลือกสถานะย่อยได้จาก dropdown"
          : (isWaiting && acceptStatusId ? "* กด “รับงาน” เพื่อเปลี่ยนสถานะเป็นกำลังดำเนินการ" : "* กด “เสร็จสิ้น” เพื่อปิดงาน");
      }
    }

    // participants
    const selectedParticipantIds = Array.isArray(e.participant_user_ids) ? e.participant_user_ids : [];
    let users = [];
    try {
      users = isInternal ? await loadParticipantUsers23() : await loadUserOptions();
    } catch (err) {
      console.warn("Cannot load user list", err);
    }
    renderParticipants({
      containerId: "ee-participants",
      users,
      selectedUserIds: selectedParticipantIds,
    });

    // attachments (request-based)
    const attSection = document.getElementById("ee-attachments-section");
    if (attSection) {
      attSection.style.display = e.request_id ? "block" : "none";
    }
    if (e.request_id) {
      renderAttachments({ containerId: "ee-attachments", atts: requestAttachments });
    }

    // attachments (internal)
    const internalAttSection = document.getElementById("ee-internal-attachments-section");
    if (internalAttSection) internalAttSection.style.display = isInternal ? "block" : "none";
    if (isInternal) {
      try {
        const rep = await fetchEventReport(eventId);
        const pics = Array.isArray(rep?.pictures) ? rep.pictures : [];
        renderAttachments({ containerId: "ee-event-pictures", atts: pics });
      } catch (err) {
        console.warn("Cannot load event report pictures", err);
      }
    }

    // delete button only for internal
    const delBtn = document.getElementById("ee-delete-btn");
    if (delBtn) delBtn.style.display = isInternal ? "inline-flex" : "none";

    // show form
    const form = document.getElementById("event-edit-form");
    if (form) form.style.display = "block";

    // store for later
    window.__eventEdit = {
      event: e,
      isInternal,
      requestTypeId,
      request: req,
      eventStatuses: statusRows,
      milestoneStatuses: milestones,
      requestAttachments,
      userMap: buildUserMap(users),
    };

    // sidebar attachments (best effort)
    try {
      refreshSidebarAttachments(eventId);
    } catch (_) {}

    // logs (best effort)
    refreshEventLogs(eventId);
  }

  async function uploadRequestAttachmentsIfAny(requestId) {
    const input = document.getElementById("ee-new-attachments");
    const preview = document.getElementById("ee-new-attachments-preview");
    if (!input || !requestId) return null;

    const files = input.files ? Array.from(input.files) : [];
    if (!files.length) return null;

    const fd = new FormData();
    files.forEach((f) => fd.append("attachments[]", f));
    const res = await window.apiFetch(`/requests/${encodeURIComponent(requestId)}/attachments`, {
      method: "POST",
      body: fd,
    });

    // clear chosen files
    input.value = "";
    if (preview) {
      preview.innerHTML = "";
      preview.style.display = "none";
    }

    return res;
  }

  function setForcedEventStatusId(statusId) {
    const id = Number(statusId || 0);
    if (!Number.isFinite(id) || id <= 0) return null;

    const ctx = window.__eventEdit || {};
    ctx.forcedEventStatusId = id;
    window.__eventEdit = ctx;

    const hidden = document.getElementById("ee-event-status-id");
    if (hidden) hidden.value = String(id);

    return id;
  }

  function findStatusIdByName(statusRows, nameIncludes) {
    const needle = String(nameIncludes || "").trim();
    if (!needle) return null;
    const rows = Array.isArray(statusRows) ? statusRows : [];
    const found = rows.find((s) => String(s.status_name || "").includes(needle));
    const id = found ? Number(found.event_status_id || 0) : 0;
    return id > 0 ? id : null;
  }

  function findStatusIdByCodeIncludes(statusRows, codeIncludes) {
    const needle = String(codeIncludes || "").trim();
    if (!needle) return null;
    const rows = Array.isArray(statusRows) ? statusRows : [];
    const found = rows.find((s) => String(s.status_code || "").includes(needle));
    const id = found ? Number(found.event_status_id || 0) : 0;
    return id > 0 ? id : null;
  }

  function resolveAcceptInProgressStatusId(statusRows) {
    // Prefer *_IN_PROGRESS by status_code when present (e.g. OTHER_IN_PROGRESS)
    return (
      findStatusIdByCodeIncludes(statusRows, "IN_PROGRESS") ||
      // Fallback by name fragments (covers 'กำลังดำเนินการ' and 'กำลังดำเนินงาน')
      findStatusIdByName(statusRows, "กำลังดำเนิน") ||
      findStatusIdByName(statusRows, "ดำเนิน") ||
      // Last resort
      findStatusIdByName(statusRows, "รับงานแล้ว") ||
      findStatusIdByName(statusRows, "รับงาน") ||
      null
    );
  }

  function getEventStatusIdForSave() {
    const ctx = window.__eventEdit || {};
    const requestTypeId = Number(ctx.requestTypeId || 0);

    // If UI forces a specific status (e.g. รับงาน / เสร็จสิ้น), prefer it.
    if (ctx.forcedEventStatusId && Number(ctx.forcedEventStatusId) > 0) {
      return Number(ctx.forcedEventStatusId);
    }

    // repair: use dropdown if selected
    if (requestTypeId === REQUEST_TYPE_REPAIR) {
      const sel = document.getElementById("ee-repair-status");
      const v = sel ? String(sel.value || "").trim() : "";
      return v ? Number(v) : (ctx.event?.event_status_id ? Number(ctx.event.event_status_id) : null);
    }

    // others: keep current hidden value (if any)
    const hidden = document.getElementById("ee-event-status-id");
    const v = hidden ? String(hidden.value || "").trim() : "";
    return v ? Number(v) : (ctx.event?.event_status_id ? Number(ctx.event.event_status_id) : null);
  }

  function setEventStatusIdForFinish() {
    const ctx = window.__eventEdit || {};
    const milestones = Array.isArray(ctx.milestoneStatuses) ? ctx.milestoneStatuses : [];
    const done = milestones.find((m) => String(m.status_name || "").includes("เสร็จสิ้น")) || milestones[3] || null;
    const doneId = done ? Number(done.event_status_id || 0) : 0;
    if (!doneId) return null;
    return setForcedEventStatusId(doneId);
  }

  function bindHandlers(eventId) {
    const form = document.getElementById("event-edit-form");
    form?.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      setInfo("", { isError: false });

      const ctx = window.__eventEdit || {};
      const base = ctx.event || {};
      const isInternal = !!ctx.isInternal;

      // internal: allow editing start/end
      let startForSave = base.start_datetime ?? null;
      let endForSave = base.end_datetime ?? null;
      if (isInternal) {
        const s = fromDatetimeLocal(document.getElementById("ee-start").value);
        const e2 = fromDatetimeLocal(document.getElementById("ee-end").value);
        if (!s || !e2) {
          setInfo("กรุณากรอกวันที่เริ่มต้นและวันที่สิ้นสุด", { isError: true });
          return;
        }
        startForSave = s;
        endForSave = e2;
      }

      const payload = {
        title: document.getElementById("ee-title").value,
        detail: document.getElementById("ee-detail").value,
        // non-editable fields: keep existing values
        location: base.location ?? "",
        province_id: base.province_id ?? null,
        start_datetime: startForSave,
        end_datetime: endForSave,
        event_status_id: getEventStatusIdForSave(),
        meeting_link: document.getElementById("ee-meeting-link").value,
        note: document.getElementById("ee-note").value,
        participant_user_ids: getSelectedParticipantIds("ee-participants"),
      };

      const btn = document.getElementById("ee-save-btn");
      const btnFinish = document.getElementById("ee-finish-btn");
      btn.disabled = true;
      if (btnFinish) btnFinish.disabled = true;
      setInfo("กำลังบันทึก...", { isError: false });

      try {
        const reqId = ctx.event?.request_id ? Number(ctx.event.request_id) : 0;

        await window.apiFetch(`/events/${encodeURIComponent(eventId)}`, { method: "PUT", body: payload });

        // clear one-shot forced status + optional post-save actions
        let shouldReload = false;
        try {
          const c2 = window.__eventEdit || {};
          if (c2.forcedEventStatusId) {
            c2.forcedEventStatusId = null;
          }
          if (c2.postSaveReload) {
            shouldReload = true;
            c2.postSaveReload = null;
          }
          window.__eventEdit = c2;
        } catch (_) {}

        if (shouldReload) {
          // Fast path: accepting job should refresh UI (status, buttons, timeline, etc.)
          window.location.reload();
          return;
        }

        // internal pictures
        if (isInternal) {
          const input = document.getElementById("ee-new-event-pictures");
          const hasFiles = !!(input && input.files && input.files.length);
          if (hasFiles) {
            setInfo("กำลังอัปโหลดรูปภาพ...", { isError: false });
            const up = await uploadEventPicturesIfAny(eventId);
            if (up?.data?.pictures) {
              renderAttachments({ containerId: "ee-event-pictures", atts: up.data.pictures });
            }
          }

          // refresh list (best effort)
          try {
            const rep = await fetchEventReport(eventId);
            const pics = Array.isArray(rep?.pictures) ? rep.pictures : [];
            renderAttachments({ containerId: "ee-event-pictures", atts: pics });
          } catch (_) {}

          // refresh drawer attachments (best effort)
          try {
            await refreshSidebarAttachments(eventId);
          } catch (_) {}
        }

        if (reqId > 0) {
          setInfo("กำลังอัปโหลดไฟล์แนบ...", { isError: false });
          const res = await uploadRequestAttachmentsIfAny(reqId);
          if (res?.data?.attachments) {
            renderAttachments({ containerId: "ee-attachments", atts: res.data.attachments });
          }

          // refresh drawer attachments (best effort)
          try {
            await refreshSidebarAttachments(eventId);
          } catch (_) {}
        }

        // refresh logs (best effort)
        try {
          await refreshEventLogs(eventId);
        } catch (_) {}

        setInfo("บันทึกสำเร็จ", { isError: false });
      } catch (err) {
        console.error(err);
        setInfo(err?.message || "บันทึกไม่สำเร็จ", { isError: true });
      } finally {
        btn.disabled = false;
        if (btnFinish) btnFinish.disabled = false;
      }
    });

    const finishBtn = document.getElementById("ee-finish-btn");
    finishBtn?.addEventListener("click", async () => {
      setInfo("", { isError: false });

      const ctx = window.__eventEdit || {};
      const isInternal = !!ctx.isInternal;

      // one-shot: after finishing job, reload to reflect new state immediately
      try {
        const c0 = window.__eventEdit || {};
        c0.postSaveReload = true;
        window.__eventEdit = c0;
      } catch (_) {}

      if (isInternal) {
        // Internal: set end_datetime to now, then save
        const endEl = document.getElementById("ee-end");
        if (endEl) {
          const now = new Date();
          const pad = (n) => String(n).padStart(2, "0");
          const v = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
          endEl.value = v;
        }
        const submitBtn = document.getElementById("ee-save-btn");
        if (submitBtn) submitBtn.click();
        return;
      }

      const doneId = setEventStatusIdForFinish();
      if (!doneId) {
        setInfo("ไม่พบสถานะ “เสร็จสิ้น” ใน event_status ของ request_type นี้", { isError: true });
        return;
      }

      // trigger submit flow
      const submitBtn = document.getElementById("ee-save-btn");
      if (submitBtn) {
        submitBtn.click();
      }
    });

    const acceptBtn = document.getElementById("ee-accept-btn");
    acceptBtn?.addEventListener("click", async () => {
      setInfo("", { isError: false });

      const ctx = window.__eventEdit || {};
      const statusRows = Array.isArray(ctx.eventStatuses) ? ctx.eventStatuses : [];
      const sid =
        Number(acceptBtn.dataset.acceptStatusId || 0) ||
        resolveAcceptInProgressStatusId(statusRows) ||
        0;
      if (!sid) {
        setInfo("ไม่พบสถานะสำหรับการรับงาน (กำลังดำเนินการ/รับงานแล้ว) ใน event_status ของ request_type นี้", { isError: true });
        return;
      }

      // one-shot: after accepting job, reload to reflect new state immediately
      try {
        const c0 = window.__eventEdit || {};
        c0.postSaveReload = true;
        window.__eventEdit = c0;
      } catch (_) {}

      setForcedEventStatusId(sid);

      const submitBtn = document.getElementById("ee-save-btn");
      if (submitBtn) submitBtn.click();
    });

    const delBtn = document.getElementById("ee-delete-btn");
    delBtn?.addEventListener("click", async () => {
      const ctx = window.__eventEdit || {};
      if (!ctx.isInternal) return;

      const ok = window.confirm("ยืนยันลบงานนี้? (ลบแล้วกู้คืนไม่ได้)");
      if (!ok) return;

      try {
        setInfo("กำลังลบ...", { isError: false });
        await window.apiFetch(`/events/${encodeURIComponent(eventId)}`, { method: "DELETE" });
        window.location.href = "/ict8/schedule/calendar.html";
      } catch (err) {
        console.error(err);
        setInfo(err?.message || "ลบไม่สำเร็จ", { isError: true });
      }
    });
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const eventId = getParam("event_id") || getParam("id");
    if (!eventId) {
      setInfo("ไม่พบ event_id ใน URL เช่น ?event_id=1", { isError: true });
      return;
    }

    try {
      setInfo("กำลังโหลด...", { isError: false });
      wireLogDrawer();
      bindHandlers(eventId);
      wireNewAttachmentsPreview();
      wireNewEventPicturesPreview();
      await loadEvent(eventId);
      setInfo("");
    } catch (err) {
      console.error(err);
      setInfo(err?.message || "โหลดข้อมูลไม่สำเร็จ", { isError: true });
    }
  });
})();
