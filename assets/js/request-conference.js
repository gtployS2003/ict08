// assets/js/request-conference.js

document.addEventListener("DOMContentLoaded", () => {
    initConferenceRequestForm();
});

function initConferenceRequestForm() {
    const form = document.querySelector("#requestConferenceForm");
    if (!form) {
        console.warn("[request-conference] form not found");
        return;
    }

    const subtypeSelect = form.querySelector("#request_sub_type");
    const provinceSelect = form.querySelector("#province");
    const submitBtn = form.querySelector("button[type=submit]");

    loadConferenceSubTypes(subtypeSelect);
    loadProvinces(provinceSelect);

    form.addEventListener("submit", async (e) => {
    e.preventDefault();

    try {
      submitBtn.disabled = true;

      const fd = new FormData(form);

      // ✅ 1) บังคับส่ง request_type=2 สำหรับ conference
      fd.set("request_type", "2");

      // ✅ 2) บังคับส่ง province_id (กันเคส HTML ไม่มี name="province_id")
      const provinceId = String(provinceSelect?.value || "").trim();
      if (!provinceId) {
        alert("❌ กรุณาเลือกจังหวัด");
        return;
      }
      fd.set("province_id", provinceId);

      // ✅ 3) แปลง datetime-local -> YYYY-MM-DD HH:MM:SS แบบไม่ซ้ำ
      const startLocal = String(form.querySelector("#start_date_time")?.value || "").trim();
      const endLocal = String(form.querySelector("#end_date_time")?.value || "").trim();

      fd.set("start_date_time", toMysqlDatetime(startLocal));
      fd.set("end_date_time", toMysqlDatetime(endLocal));

      const res = await window.apiFetch("/requests", {
        method: "POST",
        body: fd, // ✅ FormData
      });

      alert("✅ ส่งคำขอเรียบร้อยแล้ว");
      console.log("[request-conference] created:", res);
      form.reset();
    } catch (err) {
      console.error("[request-conference] submit error:", err);
      const msg = err?.payload?.message || err?.message || "เกิดข้อผิดพลาดในการส่งคำขอ";
      alert("❌ " + msg);
    } finally {
      submitBtn.disabled = false;
    }
  });
}


function normalizeDateTimeLocal(form, fieldName) {
    const el = form.querySelector(`[name="${fieldName}"]`);
    if (!el) return;

    const v = String(el.value || "").trim(); // เช่น 2026-02-10T09:00
    if (!v) return;

    // ถ้าเป็น datetime-local จะมี 'T'
    if (v.includes("T")) {
        const s = v.replace("T", " ");
        // เติม :00 ถ้ายังไม่มีวินาที
        el.value = s.length === 16 ? `${s}:00` : s;
    }
}

/**
 * โหลด subtype สำหรับ request_type = 2 (ห้องประชุม)
 */
async function loadConferenceSubTypes(selectEl) {
    if (!selectEl) return;

    selectEl.innerHTML = `<option value="">กำลังโหลด...</option>`;

    try {
        const res = await window.apiFetch("/request-sub-types?subtype_of=2&limit=200", { method: "GET" });
        const items = normalizeList(res);

        if (!items.length) {
            selectEl.innerHTML = `<option value="">-- ไม่มีข้อมูล --</option>`;
            return;
        }

        selectEl.innerHTML = `<option value="">-- เลือกระบบประชุม --</option>`;

        for (const row of items) {
            const opt = document.createElement("option");
            opt.value = row.request_sub_type_id ?? row.id ?? "";
            opt.textContent = row.name ?? row.sub_type_name ?? "-";
            selectEl.appendChild(opt);
        }
    } catch (err) {
        console.error("[request-conference] load subtype failed:", err);
        selectEl.innerHTML = `<option value="">โหลดข้อมูลไม่สำเร็จ</option>`;
    }
}

/**
 * โหลดจังหวัดจาก /provinces
 */
async function loadProvinces(selectEl) {
    if (!selectEl) return;

    selectEl.innerHTML = `<option value="">กำลังโหลด...</option>`;

    try {
        const res = await window.apiFetch("/provinces?limit=200", { method: "GET" });
        const items = normalizeList(res);

        if (!items.length) {
            selectEl.innerHTML = `<option value="">-- ไม่มีข้อมูลจังหวัด --</option>`;
            return;
        }

        selectEl.innerHTML = `<option value="">-- กรุณาเลือก --</option>`;

        for (const p of items) {
            const opt = document.createElement("option");
            opt.value = p.province_id ?? p.id ?? "";
            opt.textContent = p.nameTH ?? p.name_th ?? p.nameEN ?? p.name_en ?? "-";
            selectEl.appendChild(opt);
        }
    } catch (err) {
        console.error("[request-conference] load provinces failed:", err);
        selectEl.innerHTML = `<option value="">โหลดจังหวัดไม่สำเร็จ</option>`;
    }
}

/**
 * รองรับ response หลายรูปแบบ:
 * - { data: [...] }
 * - { data: { items: [...] } }
 * - { data: { rows: [...] } }
 */
function normalizeList(res) {
    const d = res?.data;
    if (Array.isArray(d)) return d;
    if (Array.isArray(d?.items)) return d.items;
    if (Array.isArray(d?.rows)) return d.rows;
    if (Array.isArray(res?.items)) return res.items;
    if (Array.isArray(res?.rows)) return res.rows;
    return [];
}

function toMysqlDatetime(dtLocal) {
    if (!dtLocal) return "";
    return dtLocal.replace("T", " ") + ":00";
}

