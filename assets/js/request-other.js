// assets/js/request-other.js
document.addEventListener("DOMContentLoaded", () => {
  initOtherRequestForm();
});

function initOtherRequestForm() {
  const form = document.querySelector("#request-other-form");
  if (!form) {
    console.warn("[request-other] form not found");
    return;
  }

  const subtypeSelect = form.querySelector("#request_sub_type");
  const provinceSelect = form.querySelector("#province_id");
  const submitBtn = form.querySelector("button[type=submit]");
  const fileInput = form.querySelector("#attachments");
  const previewEl = document.querySelector("#attachments-preview");
  const msgEl = document.querySelector("#request-form-message");

  // โหลด dropdown
  loadSubTypes(subtypeSelect, 4);
  loadProvinces(provinceSelect);

  // preview ไฟล์
  if (fileInput && previewEl) {
    fileInput.addEventListener("change", () => {
      previewEl.innerHTML = "";
      const files = Array.from(fileInput.files || []);
      for (const f of files) {
        const li = document.createElement("li");
        li.textContent = `${f.name} (${Math.round(f.size / 1024)} KB)`;
        previewEl.appendChild(li);
      }
    });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    showMsg(msgEl, "", false, false);

    try {
      submitBtn.disabled = true;

      const fd = new FormData(form);

      // ✅ บังคับ request_type = 4
      fd.set("request_type", "4");

      // ✅ กันเคสไม่ได้เลือกจังหวัด
      const provinceId = String(provinceSelect?.value || "").trim();
      if (!provinceId) {
        showMsg(msgEl, "❌ กรุณาเลือกจังหวัด", true, true);
        return;
      }
      fd.set("province_id", provinceId);

      // ✅ แปลง datetime-local -> YYYY-MM-DD HH:MM:SS + ตรวจ start/end
      const startLocal = String(form.querySelector("#start_date_time")?.value || "").trim();
      const endLocal = String(form.querySelector("#end_date_time")?.value || "").trim();
      const startMysql = toMysqlDatetime(startLocal);
      const endMysql = toMysqlDatetime(endLocal);
      fd.set("start_date_time", startMysql);
      fd.set("end_date_time", endMysql);

      if (startMysql && endMysql) {
        const s = new Date(startMysql.replace(" ", "T"));
        const t = new Date(endMysql.replace(" ", "T"));
        if (!isNaN(s.getTime()) && !isNaN(t.getTime()) && t.getTime() <= s.getTime()) {
          showMsg(msgEl, "❌ วัน-เวลาสิ้นสุด ต้องมากกว่า วัน-เวลาเริ่มต้น", true, true);
          return;
        }
      }

      // ✅ รองรับ name="attachments[]" อยู่แล้ว (FormData จะพาไปเอง)
      // แต่ถ้าอยากชัวร์ว่าเป็น attachments[]:
      // (ไม่จำเป็น ถ้า input name ถูกต้อง)
      // fd.delete("attachments[]"); แล้ว append ใหม่ ก็ได้

      const res = await window.apiFetch("/requests", {
        method: "POST",
        body: fd,
      });

      if (res?.error) {
        const msg = res?.message || "ส่งคำขอไม่สำเร็จ";
        showMsg(msgEl, "❌ " + msg, true, true);
        return;
      }

      alert("✅ ส่งคำขอเรียบร้อยแล้ว");
      form.reset();
      if (previewEl) previewEl.innerHTML = "";

      console.log("[request-other] created:", res);
    } catch (err) {
      console.error("[request-other] submit error:", err);
      const payload = err?.payload;
      const msg = buildFriendlyErrorMessage(payload) || err?.message || "เกิดข้อผิดพลาดในการส่งคำขอ";
      showMsg(msgEl, "❌ " + msg, true, true);
    } finally {
      submitBtn.disabled = false;
    }
  });
}

async function loadSubTypes(selectEl, subtypeOf) {
  if (!selectEl) return;

  selectEl.innerHTML = `<option value="">กำลังโหลด...</option>`;

  try {
    const res = await window.apiFetch(`/request-sub-types?subtype_of=${encodeURIComponent(subtypeOf)}&limit=200`, {
      method: "GET",
    });
    const items = normalizeList(res);

    if (!items.length) {
      selectEl.innerHTML = `<option value="">-- ไม่มีข้อมูล --</option>`;
      return;
    }

    selectEl.innerHTML = `<option value="">-- กรุณาเลือก --</option>`;
    for (const row of items) {
      const opt = document.createElement("option");
      opt.value = row.request_sub_type_id ?? row.id ?? "";
      opt.textContent = row.name ?? row.sub_type_name ?? "-";
      selectEl.appendChild(opt);
    }
  } catch (err) {
    console.error("[request-other] load subtype failed:", err);
    selectEl.innerHTML = `<option value="">โหลดข้อมูลไม่สำเร็จ</option>`;
  }
}

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
    console.error("[request-other] load provinces failed:", err);
    selectEl.innerHTML = `<option value="">โหลดจังหวัดไม่สำเร็จ</option>`;
  }
}

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
  const s0 = String(dtLocal || "").trim();
  if (!s0) return "";
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(s0)) return s0;
  const s = s0.replace("T", " ");
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(s)) return s + ":00";
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(s)) return s;
  return s;
}

function buildFriendlyErrorMessage(payload) {
  if (!payload) return "";

  const errors = payload?.errors;
  const message = String(payload?.message || "").trim();

  if (errors && typeof errors === "object") {
    const label = {
      subject: "หัวข้อคำขอ",
      request_sub_type: "ประเภทบริการ",
      start_date_time: "วัน-เวลาเริ่มต้น",
      end_date_time: "วัน-เวลาสิ้นสุด",
      province_id: "จังหวัด",
      location: "สถานที่/พื้นที่ปฏิบัติงาน",
    };

    const lines = Object.entries(errors)
      .map(([k, v]) => {
        const key = label[k] || k;
        const val = Array.isArray(v) ? v.join(", ") : String(v);
        return `- ${key}: ${val}`;
      });

    return ["ตรวจสอบข้อมูลไม่ถูกต้อง", ...lines].join("\n");
  }

  if (message) return message;
  return "";
}

function showMsg(el, text, isError, show) {
  if (!el) return;
  el.style.display = show ? "block" : "none";
  el.textContent = text || "";
  el.className =
    "request-form-footer-note " +
    (isError ? "request-form-footer-error" : "request-form-footer-success");
}
