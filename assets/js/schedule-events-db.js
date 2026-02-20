// assets/js/schedule-events-db.js
// DB-backed events list for schedule/events.html (search-only)

(function () {
  let allRows = [];
  let tbodyEl = null;

  let __provincesLoaded = false;
  let __participantsLoaded = false;

  function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function fmt(v) {
    const s = (v == null ? "" : String(v)).trim();
    return s || "-";
  }

  function typeLabel(row) {
    const main = row?.request_type_name || row?.request_type_id;
    const sub = row?.request_sub_type_name || row?.request_sub_type_id;

    const mainTxt = main != null && String(main).trim() !== "" ? String(main) : "-";
    const subTxt = sub != null && String(sub).trim() !== "" ? String(sub) : "-";

    // Per spec for events list: show sub-type first, then main type
    return `${subTxt} / ${mainTxt}`;
  }

  function provinceLabel(row) {
    return row?.province_name_th || row?.province_name_en || "-";
  }

  function statusLabel(row) {
    return row?.event_status_name || row?.event_status_code || "-";
  }

  function participantsLabel(row) {
    const s = row?.participant_names;
    return s && String(s).trim() ? String(s) : "-";
  }

  function requesterLabel(row) {
    const s = row?.requester_name;
    return s && String(s).trim() ? String(s) : "-";
  }

  function buildHaystack(row) {
    return (
      `${row?.event_id ?? ""} ` +
      `${row?.request_id ?? ""} ` +
      `${row?.title ?? ""} ` +
      `${row?.request_type_name ?? ""} ` +
      `${row?.request_sub_type_name ?? ""} ` +
      `${row?.requester_name ?? ""} ` +
      `${row?.participant_names ?? ""} ` +
      `${row?.province_name_th ?? ""} ` +
      `${row?.start_datetime ?? ""} ` +
      `${row?.end_datetime ?? ""} ` +
      `${row?.event_status_name ?? ""} ` +
      `${row?.event_status_code ?? ""}`
    )
      .toLowerCase()
      .trim();
  }

  function renderTable(rows) {
    if (!tbodyEl) return;
    tbodyEl.innerHTML = "";

    if (!Array.isArray(rows) || rows.length === 0) {
      tbodyEl.innerHTML = `
        <tr>
          <td colspan="10" style="text-align:center; color:#6b7280;">
            ยังไม่มีข้อมูลงานในระบบ
          </td>
        </tr>
      `;
      return;
    }

    rows.forEach((row) => {
      const eventId = row?.event_id;
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td class="evnt-cell evnt-cell-id" data-label="รหัสงาน"><span class="evnt-cell-value">${escapeHtml(
          fmt(eventId)
        )}</span></td>
        <td class="evnt-cell evnt-cell-request" data-label="รหัสคำร้อง"><span class="evnt-cell-value">${escapeHtml(
          fmt(row?.request_id)
        )}</span></td>
        <td class="evnt-cell evnt-cell-title evnt-cell-block" data-label="ชื่องาน">
          <span class="evnt-cell-value">
            <a class="job-title-link" href="/ict8/schedule/event-edit.html?event_id=${encodeURIComponent(
              eventId
            )}">${escapeHtml(fmt(row?.title))}</a>
          </span>
        </td>
        <td class="evnt-cell evnt-cell-type evnt-cell-block" data-label="ประเภทย่อย / ประเภทหลัก"><span class="evnt-cell-value">${escapeHtml(
          typeLabel(row)
        )}</span></td>
        <td class="evnt-cell evnt-cell-requester" data-label="ผู้ร้องขอ"><span class="evnt-cell-value">${escapeHtml(
          requesterLabel(row)
        )}</span></td>
        <td class="evnt-cell evnt-cell-participants evnt-cell-block" data-label="ผู้เข้าร่วม"><span class="evnt-cell-value">${escapeHtml(
          participantsLabel(row)
        )}</span></td>
        <td class="evnt-cell evnt-cell-province" data-label="จังหวัด"><span class="evnt-cell-value">${escapeHtml(
          provinceLabel(row)
        )}</span></td>
        <td class="evnt-cell evnt-cell-start" data-label="เริ่มต้น"><span class="evnt-cell-value">${escapeHtml(
          fmt(row?.start_datetime)
        )}</span></td>
        <td class="evnt-cell evnt-cell-end" data-label="สิ้นสุด"><span class="evnt-cell-value">${escapeHtml(
          fmt(row?.end_datetime)
        )}</span></td>
        <td class="evnt-cell evnt-cell-status" data-label="สถานะ"><span class="evnt-cell-value">${escapeHtml(
          statusLabel(row)
        )}</span></td>
      `;

      // Click row -> open edit (except clicking a link)
      tr.addEventListener("click", (e) => {
        if (e.target && e.target.closest("a")) return;
        if (eventId == null) return;
        window.location.href = `/ict8/schedule/event-edit.html?event_id=${encodeURIComponent(eventId)}`;
      });

      tbodyEl.appendChild(tr);
    });
  }

  function setBodyModalOpen(isOpen) {
    document.body.classList.toggle("modal-open", Boolean(isOpen));
  }

  function syncBodyModalOpenState() {
    const anyOpen = Boolean(
      document.getElementById("task-add-overlay")?.classList.contains("open") ||
        document.getElementById("task-modal-overlay")?.classList.contains("open")
    );
    setBodyModalOpen(anyOpen);
  }

  async function ensureProvincesLoaded() {
    if (__provincesLoaded) return;
    const select = document.getElementById("add-province");
    if (!select) return;

    const apiFetch = window.apiFetch;
    if (typeof apiFetch !== "function") throw new Error("missing apiFetch");

    const res = await apiFetch("/provinces?limit=200", { method: "GET" });
    const items = Array.isArray(res?.data?.items)
      ? res.data.items
      : Array.isArray(res?.data)
      ? res.data
      : [];

    // keep the first placeholder option only
    const firstOpt = select.querySelector("option[value='']");
    select.innerHTML = "";
    if (firstOpt) select.appendChild(firstOpt);
    else {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "-- เลือกจังหวัด --";
      select.appendChild(opt);
    }

    items.forEach((p) => {
      const opt = document.createElement("option");
      opt.value = String(p.province_id);
      opt.textContent = String(p.nameTH ?? p.nameEN ?? p.province_id);
      select.appendChild(opt);
    });

    __provincesLoaded = true;
  }

  async function ensureParticipantsLoaded() {
    if (__participantsLoaded) return;
    const grid = document.getElementById("add-participant-grid");
    if (!grid) return;

    const apiFetch = window.apiFetch;
    if (typeof apiFetch !== "function") throw new Error("missing apiFetch");

    const res = await apiFetch("/users/participants", { method: "GET" });
    const items = Array.isArray(res?.data) ? res.data : [];

    grid.innerHTML = "";
    items.forEach((u) => {
      const name =
        u?.line_user_name && String(u.line_user_name).trim() !== ""
          ? String(u.line_user_name)
          : `user#${u?.user_id}`;

      const label = document.createElement("label");
      const input = document.createElement("input");
      input.type = "checkbox";
      input.className = "add-participant";
      input.value = String(u.user_id);

      label.appendChild(input);
      label.appendChild(document.createTextNode(" " + name));
      grid.appendChild(label);
    });

    __participantsLoaded = true;
  }

  function resetAddTaskFormDefaults() {
    const todayStr = new Date().toISOString().slice(0, 10);

    const start = document.getElementById("add-start-date");
    const end = document.getElementById("add-end-date");

    if (start && !start.value) start.value = todayStr;
    if (end && !end.value) end.value = todayStr;
  }

  function setupAddTaskModal() {
    const overlay = document.getElementById("task-add-overlay");
    const openBtn = document.getElementById("schedule-add-task-toggle");
    const form = document.getElementById("task-add-form");

    if (!overlay || !openBtn || !form) return;

    const closeBtns = overlay.querySelectorAll(".task-add-close");

    openBtn.addEventListener("click", async () => {
      try {
        form.reset();
        overlay
          .querySelectorAll('.add-participant')
          .forEach((cb) => (cb.checked = false));

        await ensureProvincesLoaded();
        await ensureParticipantsLoaded();
        resetAddTaskFormDefaults();

        overlay.classList.add("open");
        syncBodyModalOpenState();
      } catch (err) {
        console.error(err);
        alert("ไม่สามารถเปิดฟอร์มเพิ่มงานได้");
      }
    });

    closeBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        overlay.classList.remove("open");
        syncBodyModalOpenState();
      });
    });

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        overlay.classList.remove("open");
        syncBodyModalOpenState();
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      if (overlay.classList.contains("open")) {
        overlay.classList.remove("open");
        syncBodyModalOpenState();
      }
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      try {
        const title = String(document.getElementById("add-title")?.value ?? "").trim();
        const detail = String(document.getElementById("add-desc")?.value ?? "");
        const location = String(document.getElementById("add-location")?.value ?? "");
        const provinceId = String(document.getElementById("add-province")?.value ?? "").trim();
        const meetingLink = String(document.getElementById("add-meeting-link")?.value ?? "").trim();
        const note = String(document.getElementById("add-note")?.value ?? "");
        const startDate = String(document.getElementById("add-start-date")?.value ?? "").trim();
        const endDate = String(document.getElementById("add-end-date")?.value ?? "").trim();

        const participantIds = Array.from(
          document.querySelectorAll(".add-participant:checked")
        ).map((cb) => Number(cb.value));

        if (!title) {
          alert("กรุณากรอกชื่องาน");
          return;
        }
        if (!provinceId) {
          alert("กรุณาเลือกจังหวัด");
          return;
        }
        if (!startDate || !endDate) {
          alert("กรุณาเลือกวันที่เริ่มต้นและวันที่สิ้นสุด");
          return;
        }

        const apiFetch = window.apiFetch;
        if (typeof apiFetch !== "function") throw new Error("missing apiFetch");

        const body = {
          title,
          detail,
          location,
          province_id: Number(provinceId),
          meeting_link: meetingLink,
          note,
          start_date: startDate,
          end_date: endDate,
          participant_user_ids: participantIds,
        };

        const res = await apiFetch("/events/internal", { method: "POST", body });
        if (res?.error) {
          alert(res?.message || "บันทึกงานไม่สำเร็จ");
          return;
        }

        overlay.classList.remove("open");
        syncBodyModalOpenState();

        allRows = await loadRows();
        applySearch();

        alert("บันทึกงานเรียบร้อย");
      } catch (err) {
        console.error(err);
        alert("บันทึกงานไม่สำเร็จ");
      }
    });
  }

  function applySearch() {
    const searchInput = document.getElementById("schedule-search-input");
    const q = (searchInput ? searchInput.value : "").trim().toLowerCase();

    if (!q) {
      renderTable(allRows);
      return;
    }

    const filtered = allRows.filter((r) => buildHaystack(r).includes(q));
    renderTable(filtered);
  }

  function setupSearch() {
    const searchInput = document.getElementById("schedule-search-input");
    const searchClear = document.getElementById("schedule-search-clear");

    if (searchInput) {
      searchInput.addEventListener("input", applySearch);
    }

    if (searchClear && searchInput) {
      searchClear.addEventListener("click", () => {
        searchInput.value = "";
        applySearch();
      });
    }
  }

  async function loadRows() {
    // Prefer apiFetch if available (handles API_BASE + auth)
    const endpoint = `/events/table?page=1&limit=500`;

    if (typeof window.apiFetch === "function") {
      const json = await window.apiFetch(endpoint, { method: "GET" });
      return json?.data || [];
    }

    // Fallback: direct fetch relative to backend public
    const base = (window.API_BASE || "/ict8/backend/public").replace(/\/$/, "");
    const res = await fetch(`${base}${endpoint}`, { credentials: "include" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return json?.data || [];
  }

  document.addEventListener("DOMContentLoaded", async () => {
    tbodyEl = document.querySelector("#event-list-table-body");
    if (!tbodyEl) return;

    tbodyEl.innerHTML = `
      <tr>
        <td colspan="10" style="text-align:center; color:#6b7280;">
          กำลังโหลดข้อมูล...
        </td>
      </tr>
    `;

    setupSearch();
    setupAddTaskModal();

    try {
      allRows = await loadRows();
      applySearch();
    } catch (err) {
      console.error("โหลดข้อมูลงานไม่สำเร็จ", err);
      tbodyEl.innerHTML = `
        <tr>
          <td colspan="10" style="text-align:center; color:#b91c1c;">
            ไม่สามารถโหลดข้อมูลงานได้ กรุณาลองใหม่อีกครั้ง
          </td>
        </tr>
      `;
    }
  });
})();
