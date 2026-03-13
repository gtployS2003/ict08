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

                // ✅ 3) แปลง datetime-local -> YYYY-MM-DD HH:MM:SS + ตรวจ start/end
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
                        alert("❌ วัน-เวลาสิ้นสุด ต้องมากกว่า วัน-เวลาเริ่มต้น");
                        return;
                    }
                }

                const res = await window.apiFetch("/requests", {
                    method: "POST",
                    body: fd, // ✅ FormData
                });

                alert("✅ ส่งคำขอเรียบร้อยแล้ว");
                console.log("[request-conference] created:", res);
                form.reset();
            } catch (err) {
                console.error("[request-conference] submit error:", err);

                const payload = err?.payload;
                const msg = buildFriendlyErrorMessage(payload) || err?.message || "เกิดข้อผิดพลาดในการส่งคำขอ";
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
        const s0 = String(dtLocal || "").trim();
        if (!s0) return "";

        // already mysql
        if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(s0)) return s0;

        const s = s0.replace("T", " ");
        // no seconds
        if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(s)) return s + ":00";
        // has seconds
        if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(s)) return s;
        // fallback
        return s;
}

function buildFriendlyErrorMessage(payload) {
    if (!payload) return "";

    // If backend returns { error:true, message:'Validation failed', errors:{...} }
    const errors = payload?.errors;
    const message = String(payload?.message || "").trim();

    if (errors && typeof errors === "object") {
        const label = {
            subject: "หัวข้อคำขอ (เรื่อง)",
            request_sub_type: "ระบบประชุมที่ต้องการ",
            start_date_time: "วัน-เวลาเริ่มต้น",
            end_date_time: "วัน-เวลาสิ้นสุด",
            province_id: "จังหวัด",
        };

        const lines = Object.entries(errors)
            .map(([k, v]) => {
                const key = label[k] || k;
                const val = Array.isArray(v) ? v.join(", ") : String(v);
                return `- ${key}: ${val}`;
            });

        // Prefer Thai headline
        return ["ตรวจสอบข้อมูลไม่ถูกต้อง", ...lines].join("\n");
    }

    // fallback to backend message
    if (message) return message;
    return "";
}

