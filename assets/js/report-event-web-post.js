// assets/js/report-event-web-post.js
// Edit title/content for publicity_post used in website posting

(() => {
  const $ = (sel) => document.querySelector(sel);

  const state = {
    availableMedia: [],
    selectedIds: [],
    coverId: 0,
  };

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

  function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function buildFileUrl(filepath) {
    const fp = String(filepath || "").trim();
    if (!fp) return "";

    // DB usually stores: "uploads/..." or "/uploads/..."
    // Physical location: backend/public/uploads/...
    if (fp.startsWith("/uploads/")) {
      return `/ict8/backend/public${fp}`;
    }
    if (fp.startsWith("uploads/")) {
      return `/ict8/backend/public/${fp}`;
    }

    // Already absolute (e.g., /ict8/backend/public/uploads/...)
    if (fp.startsWith("/")) return fp;
    return `/ict8/backend/public/${fp}`;
  }

  function setMediaMeta(text) {
    const el = $("#wep-media-meta");
    if (el) el.textContent = text || "";
  }

  function isSelected(id) {
    return state.selectedIds.includes(Number(id));
  }

  function toggleSelected(id) {
    id = Number(id || 0);
    if (!id) return;
    const idx = state.selectedIds.indexOf(id);
    if (idx >= 0) {
      state.selectedIds.splice(idx, 1);
      if (state.coverId === id) {
        state.coverId = state.selectedIds[0] || 0;
      }
    } else {
      state.selectedIds.push(id);
      if (!state.coverId) state.coverId = id;
    }
    renderMedia();
  }

  function moveSelected(id, dir) {
    id = Number(id || 0);
    const i = state.selectedIds.indexOf(id);
    if (i < 0) return;
    const j = i + dir;
    if (j < 0 || j >= state.selectedIds.length) return;
    const tmp = state.selectedIds[i];
    state.selectedIds[i] = state.selectedIds[j];
    state.selectedIds[j] = tmp;
    renderMedia();
  }

  function setCover(id) {
    id = Number(id || 0);
    if (!id) return;
    if (!state.selectedIds.includes(id)) return;
    state.coverId = id;
    renderMedia();
  }

  function clearSelection() {
    state.selectedIds = [];
    state.coverId = 0;
    renderMedia();
  }

  function renderMedia() {
    const grid = $("#wep-media-grid");
    const list = $("#wep-selected-list");
    if (!grid || !list) return;

    const avail = Array.isArray(state.availableMedia) ? state.availableMedia : [];
    setMediaMeta(`ทั้งหมด ${avail.length} รูป • เลือกแล้ว ${state.selectedIds.length} รูป`);

    grid.innerHTML = avail
      .map((m) => {
        const id = Number(m?.event_media_id || 0);
        const url = buildFileUrl(m?.filepath);
        const selected = isSelected(id);
        const chipClass = selected ? "wep-chip wep-chip--selected" : "wep-chip";
        const chipText = selected ? "เลือกแล้ว" : "กดเพื่อเลือก";

        return `
          <div class="wep-media-card" data-mid="${id}" title="คลิกเพื่อเลือก/ยกเลิก">
            <img class="wep-media-thumb" src="${escapeHtml(url)}" alt="media-${id}" loading="lazy" />
            <div class="wep-media-meta">
              <span class="${chipClass}"><i class="${selected ? "fa-solid fa-check" : "fa-regular fa-circle"}"></i> ${chipText}</span>
              <span class="muted" style="font-size:12px;">#${id}</span>
            </div>
          </div>
        `;
      })
      .join("");

    const selectedRows = state.selectedIds
      .map((id) => {
        const m = avail.find((x) => Number(x?.event_media_id || 0) === id);
        const url = buildFileUrl(m?.filepath);
        const isCover = state.coverId === id;
        return { id, url, isCover };
      })
      .filter((x) => x.id);

    if (selectedRows.length === 0) {
      list.innerHTML = `<div class="muted" style="padding:10px 0;">ยังไม่ได้เลือกรูปภาพ</div>`;
      return;
    }

    list.innerHTML = selectedRows
      .map((x, idx) => {
        return `
          <div class="wep-selected-item" data-sel-mid="${x.id}">
            <img src="${escapeHtml(x.url)}" alt="sel-${x.id}" />
            <div>
              <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
                <b>#${x.id}</b>
                <label class="wep-chip" style="cursor:pointer;">
                  <input type="radio" name="wep-cover" ${x.isCover ? "checked" : ""} data-cover-mid="${x.id}" />
                  หน้าปก
                </label>
                <span class="muted" style="font-size:12px;">ลำดับ ${idx + 1}</span>
              </div>
            </div>
            <div style="display:flex; gap:6px; flex-wrap:wrap; justify-content:flex-end;">
              <button type="button" class="wep-mini-btn" data-move="up" title="เลื่อนขึ้น"><i class="fa-solid fa-arrow-up"></i></button>
              <button type="button" class="wep-mini-btn" data-move="down" title="เลื่อนลง"><i class="fa-solid fa-arrow-down"></i></button>
              <button type="button" class="wep-mini-btn" data-remove="1" title="ลบออก"><i class="fa-solid fa-xmark"></i></button>
            </div>
          </div>
        `;
      })
      .join("");
  }

  async function loadMedia() {
    const eventId = getEventId();
    if (!eventId) return;

    setMediaMeta("กำลังโหลดรูป...");

    // Prefer post-media endpoint (has selected)
    try {
      const json = await api(`/publicity-posts/${encodeURIComponent(eventId)}/media`, { method: "GET" });
      const data = json?.data || {};
      state.availableMedia = Array.isArray(data?.available) ? data.available : [];
      const selected = Array.isArray(data?.selected) ? data.selected : [];
      // selected rows include sort_order + is_cover
      const sorted = [...selected].sort((a, b) => {
        const ca = Number(b?.is_cover || 0) - Number(a?.is_cover || 0);
        if (ca !== 0) return ca;
        return Number(a?.sort_order || 0) - Number(b?.sort_order || 0);
      });
      state.selectedIds = sorted.map((x) => Number(x?.event_media_id || 0)).filter((x) => x > 0);
      state.coverId = Number(sorted.find((x) => Number(x?.is_cover || 0) === 1)?.event_media_id || 0) || (state.selectedIds[0] || 0);
      renderMedia();
      return;
    } catch (err) {
      // fallback below
      console.warn("loadMedia via publicity-posts/{id}/media failed, fallback to events/{id}/media", err);
    }

    const json2 = await api(`/events/${encodeURIComponent(eventId)}/media`, { method: "GET" });
    state.availableMedia = Array.isArray(json2?.data) ? json2.data : [];
    state.selectedIds = [];
    state.coverId = 0;
    renderMedia();
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

    // media
    await loadMedia();
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

      // Save selected media to publicity_post_media
      const items = (state.selectedIds || []).map((mid, idx) => ({
        event_media_id: Number(mid),
        sort_order: idx + 1,
        is_cover: Number(mid) === Number(state.coverId) ? 1 : 0,
      }));

      await api(`/publicity-posts/${encodeURIComponent(eventId)}/media`, {
        method: "PUT",
        body: { items },
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

    // media UI events
    $("#wep-media-reload")?.addEventListener("click", () => loadMedia().catch(console.error));
    $("#wep-media-clear")?.addEventListener("click", () => clearSelection());

    // grid click (select/unselect)
    $("#wep-media-grid")?.addEventListener("click", (e) => {
      const card = e.target?.closest?.(".wep-media-card");
      if (!card) return;
      const mid = Number(card.getAttribute("data-mid") || 0);
      toggleSelected(mid);
    });

    // selected list actions
    $("#wep-selected-list")?.addEventListener("click", (e) => {
      const item = e.target?.closest?.(".wep-selected-item");
      if (!item) return;
      const mid = Number(item.getAttribute("data-sel-mid") || 0);
      if (!mid) return;

      const btnMove = e.target?.closest?.("[data-move]");
      const btnRemove = e.target?.closest?.("[data-remove]");
      if (btnMove) {
        const dir = btnMove.getAttribute("data-move") === "up" ? -1 : 1;
        moveSelected(mid, dir);
        return;
      }
      if (btnRemove) {
        toggleSelected(mid);
        return;
      }
    });

    $("#wep-selected-list")?.addEventListener("change", (e) => {
      const r = e.target?.closest?.("input[type='radio'][name='wep-cover']");
      if (!r) return;
      const mid = Number(r.getAttribute("data-cover-mid") || 0);
      setCover(mid);
    });

    try {
      await load();
    } catch (err) {
      console.error(err);
      setMeta("โหลดข้อมูลไม่สำเร็จ");
    }
  });
})();
