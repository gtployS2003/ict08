// assets/js/profile-setup.js
/**
 * Profile Setup (Register) - Cascading dropdown
 * ใช้กับหน้า profile-setup.html
 *
 * ต้องมี:
 * - auth.api.js
 * - position-titles.api.js   (window.PositionTitlesAPI)
 * - departments.api.js       (window.departmentsApi)  <-- ตัวเล็กของคุณ
 * - organizations.api.js     (window.organizationsApi หรือ window.OrganizationsAPI)
 * - person-prefixes.api.js   (window.personPrefixesApi)
 */

document.addEventListener("DOMContentLoaded", initProfileSetup);

async function initProfileSetup() {
    // 1) ดึงข้อมูลจาก sessionStorage (มาจาก line-login.js)
    const lineUserId = sessionStorage.getItem("line_user_id");
    const lineUserName = sessionStorage.getItem("line_user_name");

    if (!lineUserId || !lineUserName) {
        alert("ไม่พบข้อมูล LINE กรุณาเข้าสู่ระบบใหม่");
        window.location.href = "/ict8/login.html";
        return;
    }

    // 2) map element
    const form = document.getElementById("profile-setup-form");
    const prefixEl = document.getElementById("person_prefix");
    const firstNameEl = document.getElementById("first_name_th");
    const lastNameEl = document.getElementById("last_name_th");

    const organizationEl = document.getElementById("organization_id");
    const departmentEl = document.getElementById("department_id");
    const positionEl = document.getElementById("position_title_id");

    const submitBtn = document.getElementById("btn-submit-profile");

    if (!form) {
        console.error("profile-setup-form not found");
        return;
    }

    // ===== DEBUG: เช็คว่ามี API global จริงไหม =====
    console.log("APIs:", {
        personPrefixesApi: !!window.personPrefixesApi,
        organizationsApi: !!window.organizationsApi,
        OrganizationsAPI: !!window.OrganizationsAPI,
        departmentsApi: !!window.departmentsApi,
        PositionTitlesAPI: !!window.PositionTitlesAPI,
    });

    // 3) init placeholders
    setSelectPlaceholder(prefixEl, "-- กรุณาเลือก --");
    setSelectPlaceholder(organizationEl, "กำลังโหลดหน่วยงาน...");
    setSelectPlaceholder(departmentEl, "-- เลือกหน่วยงานก่อน --");
    setSelectPlaceholder(positionEl, "-- เลือกฝ่ายก่อน --");

    // 4) โหลด dropdown แรกเริ่ม
    try {
        await Promise.all([
            loadPersonPrefixes(prefixEl),
            loadOrganizations(organizationEl),
        ]);
    } catch (e) {
        console.error("initial load error:", e);
    }

    // 5) cascading: org -> departments
    if (organizationEl) {
        organizationEl.addEventListener("change", async () => {
            const orgId = toIntOrNull(organizationEl.value);

            // reset downstream
            setSelectPlaceholder(
                departmentEl,
                orgId ? "กำลังโหลดฝ่าย..." : "-- เลือกหน่วยงานก่อน --"
            );
            setSelectPlaceholder(positionEl, "-- เลือกฝ่ายก่อน --");

            if (!orgId) return;

            try {
                await loadDepartmentsDropdown(departmentEl, orgId);
            } catch (err) {
                console.error("load departments dropdown error:", err);
                setSelectPlaceholder(departmentEl, "-- โหลดฝ่ายไม่สำเร็จ --");
            }
        });
    }

    // 6) cascading: department -> positions
    if (departmentEl) {
        departmentEl.addEventListener("change", async () => {
            const orgId = toIntOrNull(organizationEl?.value);
            const depId = toIntOrNull(departmentEl.value);

            setSelectPlaceholder(
                positionEl,
                depId ? "กำลังโหลดตำแหน่ง..." : "-- เลือกฝ่ายก่อน --"
            );

            if (!orgId || !depId) return;

            try {
                await loadPositionTitlesDropdown(positionEl, orgId, depId);
            } catch (err) {
                console.error("load position titles dropdown error:", err);
                setSelectPlaceholder(positionEl, "-- โหลดตำแหน่งไม่สำเร็จ --");
            }
        });
    }

    // 7) submit
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const payload = {
            line_user_id: lineUserId,
            line_user_name: lineUserName,
            person_prefix_id: toIntOrZero(prefixEl?.value), // optional
            first_name_th: firstNameEl?.value.trim(),
            last_name_th: lastNameEl?.value.trim(),
            organization_id: toIntOrZero(organizationEl?.value),
            department_id: toIntOrZero(departmentEl?.value),
            position_title_id: toIntOrZero(positionEl?.value),
        };

        const missing = [];
        if (!payload.first_name_th) missing.push("ชื่อจริง");
        if (!payload.last_name_th) missing.push("นามสกุล");
        if (!payload.organization_id) missing.push("หน่วยงาน");
        if (!payload.department_id) missing.push("ฝ่าย");
        if (!payload.position_title_id) missing.push("ตำแหน่งงาน");

        if (missing.length) {
            alert("กรุณากรอกข้อมูลให้ครบ: " + missing.join(", "));
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = "กำลังบันทึก...";

        try {
            const res = await AuthAPI.register(payload);

            if (!res || res.ok !== true) {
                alert(res?.message || "บันทึกไม่สำเร็จ");
                console.error("register failed:", res);
                return;
            }

            alert("บันทึกข้อมูลสำเร็จ");

            const data = res?.data ?? res ?? {};

            if (data.status === "pending") {
                alert("สมัครสมาชิกสำเร็จ\nรอการอนุมัติจากเจ้าหน้าที่");
            } else if (data.status === "exists") {
                alert("บัญชีนี้ถูกสมัครไว้แล้ว กรุณารอการอนุมัติ");
            } else {
                alert("บันทึกข้อมูลสำเร็จ");
            }

            sessionStorage.removeItem("line_user_id");
            sessionStorage.removeItem("line_user_name");
            window.location.href = "/ict8/login.html";
        } catch (err) {
            console.error("register error:", err);
            alert(err?.message || "เกิดข้อผิดพลาดในการสมัครสมาชิก");
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = "บันทึกข้อมูล";
        }
    });
}

/* =========================
   Dropdown loaders
========================= */

async function loadPersonPrefixes(selectEl) {
    if (!selectEl) return;
    const api = window.personPrefixesApi;
    if (!api?.list) {
        console.warn("personPrefixesApi.list not found");
        setSelectPlaceholder(selectEl, "-- ไม่พบ API คำนำหน้า --");
        return;
    }

    const res = await api.list({ limit: 200 });
    const items = res?.data?.items || res?.items || [];
    renderOptions(selectEl, items, "person_prefix_id", "prefix_th");
}

async function loadOrganizations(selectEl) {
    if (!selectEl) return;

    // รองรับชื่อ global ทั้ง 2 แบบ
    const api = window.organizationsApi || window.OrganizationsAPI;
    if (!api?.list) {
        console.warn("organizations API .list not found");
        setSelectPlaceholder(selectEl, "-- ไม่พบ API หน่วยงาน --");
        return;
    }

    const res = await api.list({ limit: 200 });
    console.log("organizations res =", res);

    const items = res?.data?.items || res?.items || [];
    renderOptions(selectEl, items, "organization_id", "name");
}

async function loadDepartmentsDropdown(selectEl, organization_id) {
    if (!selectEl) return;

    const api = window.departmentsApi || window.DepartmentsAPI;
    if (!api?.list) {
        console.warn("departments API .list not found");
        setSelectPlaceholder(selectEl, "-- ไม่พบ API ฝ่าย --");
        return;
    }

    const res = await api.list({ limit: 200, organization_id });
    console.log("departments res =", res);

    // departments.api.js ของคุณ return json?.data ?? json
    // ดังนั้น res จะเป็น {items,pagination} แล้ว
    const items = res?.items || res?.data?.items || [];
    renderOptions(selectEl, items, "department_id", "department_title");
}

async function loadPositionTitlesDropdown(selectEl, organization_id, department_id) {
    if (!selectEl) return;

    const api = window.PositionTitlesAPI || window.positionTitlesApi;
    if (!api?.list) {
        console.warn("PositionTitlesAPI.list not found");
        setSelectPlaceholder(selectEl, "-- ไม่พบ API ตำแหน่ง --");
        return;
    }

    const res = await api.list({
        limit: 200,
        organization_id,
        department_id,
    });
    console.log("position titles res =", res);

    // position-titles.api.js ของคุณ return {success, data:{items}} (อีกแบบ)
    const items = res?.data?.items || res?.items || [];
    renderOptions(selectEl, items, "position_title_id", "position_title");
}

/* =========================
   Helpers (ต้องมี ไม่งั้นพัง)
========================= */

function setSelectPlaceholder(selectEl, text) {
    if (!selectEl) return;
    selectEl.innerHTML = "";
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = text || "-- กรุณาเลือก --";
    selectEl.appendChild(opt);
}

function toIntOrNull(v) {
    const n = parseInt(String(v ?? ""), 10);
    return Number.isFinite(n) && n > 0 ? n : null;
}

function toIntOrZero(v) {
    const n = parseInt(String(v ?? ""), 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
}

function renderOptions(selectEl, items, valueKey, labelKey) {
    if (!selectEl) return;
    selectEl.innerHTML = `<option value="">-- กรุณาเลือก --</option>`;
    items.forEach((it) => {
        const opt = document.createElement("option");
        opt.value = it[valueKey];
        opt.textContent = it[labelKey] ?? "-";
        selectEl.appendChild(opt);
    });

    // ถ้าไม่มีข้อมูลเลย
    if (!items.length) {
        // แสดงข้อความให้เห็นว่า list ว่าง
        // (คง option แรกไว้)
        const opt = document.createElement("option");
        opt.value = "";
        opt.textContent = "-- ไม่มีข้อมูล --";
        selectEl.appendChild(opt);
    }
}
