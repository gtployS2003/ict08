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

      // ✅ แปลง datetime-local -> YYYY-MM-DD HH:MM:SS
      const startLocal = String(form.querySelector("#start_date_time")?.value || "").trim();
      const endLocal = String(form.querySelector("#end_date_time")?.value || "").trim();
      fd.set("start_date_time", toMysqlDatetime(startLocal));
      fd.set("end_date_time", toMysqlDatetime(endLocal));

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
      const msg = err?.payload?.message || err?.message || "เกิดข้อผิดพลาดในการส่งคำขอ";
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
  if (!dtLocal) return "";
  return dtLocal.replace("T", " ") + ":00";
}

function showMsg(el, text, isError, show) {
  if (!el) return;
  el.style.display = show ? "block" : "none";
  el.textContent = text || "";
  el.className =
    "request-form-footer-note " +
    (isError ? "request-form-footer-error" : "request-form-footer-success");
}
