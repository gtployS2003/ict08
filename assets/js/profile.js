// assets/js/profile.js

(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", () => {
    init().catch((err) => {
      console.error("profile init error:", err);
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
      if (Array.isArray(d.data)) return d.data;
    }
    // some controllers return {success:true,data:{items:[]}}
    const dd = json?.data?.data;
    if (Array.isArray(dd)) return dd;
    if (dd && typeof dd === "object") {
      if (Array.isArray(dd.items)) return dd.items;
      if (Array.isArray(dd.rows)) return dd.rows;
    }
    return [];
  }

  function setInfo(msg, { isError = false } = {}) {
    const el = document.getElementById("pf-info");
    if (!el) return;
    el.textContent = msg || "";
    el.style.display = msg ? "block" : "none";
    el.style.borderStyle = msg ? "solid" : "dashed";
    el.style.borderColor = isError ? "#fecaca" : "#bbf7d0";
    el.style.background = isError ? "#fff1f2" : "#ecfdf5";
  }

  function qs(id) {
    return document.getElementById(id);
  }

  function setSelectOptions(sel, items, { getValue, getLabel, placeholder = "-- กรุณาเลือก --" } = {}) {
    if (!sel) return;
    const cur = String(sel.value || "");
    sel.innerHTML = "";

    const opt0 = document.createElement("option");
    opt0.value = "";
    opt0.textContent = placeholder;
    sel.appendChild(opt0);

    (Array.isArray(items) ? items : []).forEach((it) => {
      const o = document.createElement("option");
      o.value = String(getValue(it) ?? "");
      o.textContent = String(getLabel(it) ?? "-");
      sel.appendChild(o);
    });

    if (cur) sel.value = cur;
  }

  function toDatetimeLocal(v) {
    if (!v) return "";
    // Accept: YYYY-MM-DD HH:mm:ss
    const s = String(v).trim();
    if (!s) return "";
    return s.replace(" ", "T").slice(0, 16);
  }

  function fromDatetimeLocal(v) {
    const s = String(v || "").trim();
    return s ? s : "";
  }

  function setAvatar(photoPath) {
    const img = qs("pf-photo");
    const fb = qs("pf-photo-fallback");
    const apiBaseRaw =
      (window.__APP_CONFIG__ && window.__APP_CONFIG__.API_BASE) ||
      (typeof window.API_BASE_URL === "string" && window.API_BASE_URL) ||
      "/ict8/backend/public";
    const apiBase = String(apiBaseRaw || "").replace(/\/+$/, "");

    const p = String(photoPath || "").trim();
    const src = p
      ? p.startsWith("http")
        ? p
        : `${apiBase}${p.startsWith("/") ? "" : "/"}${p}`
      : "";

    if (src) {
      if (img) {
        img.src = src;
        img.style.display = "block";
      }
      if (fb) fb.style.display = "none";
      return;
    }

    if (img) {
      img.removeAttribute("src");
      img.style.display = "none";
    }
    if (fb) fb.style.display = "flex";
  }

  async function loadLookups({ organizationId, departmentId } = {}) {
    const [prefixesJson, orgsJson] = await Promise.all([
      api("/person-prefixes?limit=200", { method: "GET" }),
      api("/organizations?limit=500", { method: "GET" }),
    ]);

    const prefixes = normalizeRows(prefixesJson);
    const orgs = normalizeRows(orgsJson);

    setSelectOptions(qs("person_prefix_id"), prefixes, {
      getValue: (x) => x.person_prefix_id,
      getLabel: (x) => x.prefix_th || x.prefix_en || `#${x.person_prefix_id}`,
    });

    setSelectOptions(qs("organization_id"), orgs, {
      getValue: (x) => x.organization_id,
      getLabel: (x) => x.name || x.organization_name || `#${x.organization_id}`,
    });

    await reloadDepartments({ organizationId });
    await reloadPositionTitles({ organizationId, departmentId });
  }

  async function reloadDepartments({ organizationId } = {}) {
    const orgId = Number(organizationId || qs("organization_id")?.value) || 0;
    const sel = qs("department_id");

    if (!orgId) {
      setSelectOptions(sel, [], { placeholder: "-- เลือกหน่วยงานก่อน --" });
      return;
    }

    const json = await api(`/departments/dropdown?organization_id=${encodeURIComponent(orgId)}`, {
      method: "GET",
    });
    const items = normalizeRows(json);

    setSelectOptions(sel, items, {
      getValue: (x) => x.department_id,
      getLabel: (x) => x.department_title || x.department_name || `#${x.department_id}`,
    });
  }

  async function reloadPositionTitles({ organizationId, departmentId } = {}) {
    const orgId = Number(organizationId || qs("organization_id")?.value) || 0;
    const depId = Number(departmentId || qs("department_id")?.value) || 0;

    const sel = qs("position_title_id");
    if (!orgId) {
      setSelectOptions(sel, [], { placeholder: "-- เลือกหน่วยงานก่อน --" });
      return;
    }

    const qp = new URLSearchParams();
    qp.set("organization_id", String(orgId));
    if (depId) qp.set("department_id", String(depId));

    const json = await api(`/position-titles/dropdown?${qp.toString()}`, { method: "GET" });
    const items = normalizeRows(json);

    setSelectOptions(sel, items, {
      getValue: (x) => x.position_title_id,
      getLabel: (x) => x.position_title || x.position_title_name || `#${x.position_title_id}`,
    });
  }

  function fillForm({ user, person, detail } = {}) {
    const u = user || {};
    const p = person || {};
    const d = detail || {};

    qs("person_id").value = p.person_id || "";
    qs("person_user_id").value = p.person_user_id || u.user_id || "";
    qs("line_user_name").value = d.line_user_name || u.line_user_name || "";

    qs("person_prefix_id").value = p.person_prefix_id || "";
    qs("first_name_th").value = p.first_name_th || "";
    qs("last_name_th").value = p.last_name_th || "";
    qs("first_name_en").value = p.first_name_en || "";
    qs("last_name_en").value = p.last_name_en || "";
    qs("display_name").value = p.display_name || "";

    qs("organization_id").value = p.organization_id || "";
    qs("department_id").value = p.department_id || "";
    qs("position_title_id").value = p.position_title_id || "";

    qs("is_active").checked = Number(p.is_active || 0) === 1;

    qs("start_date").value = toDatetimeLocal(p.start_date);
    qs("end_date").value = toDatetimeLocal(p.end_date);

    qs("create_at").value = String(p.create_at || "");
    qs("photo_path").value = String(p.photo_path || "");

    const showName =
      (p.display_name || "").trim() ||
      `${(p.first_name_th || "").trim()} ${(p.last_name_th || "").trim()}`.trim() ||
      (d.line_user_name || u.line_user_name || "ผู้ใช้งาน").trim();

    const sub = [];
    if (d.organization_name) sub.push(d.organization_name);
    if (d.department_name) sub.push(d.department_name);
    if (d.position_title_name) sub.push(d.position_title_name);

    const nameEl = qs("pf-name");
    const subEl = qs("pf-sub");
    const chipEl = qs("pf-chip");

    if (nameEl) nameEl.textContent = showName;
    if (subEl) subEl.textContent = sub.join(" • ") || "";
    if (chipEl) chipEl.textContent = `LINE: ${d.line_user_name || u.line_user_name || "-"}`;

    setAvatar(p.photo_path);
  }

  function collectFormData() {
    const fd = new FormData();

    // Numeric ids
    fd.set("person_prefix_id", qs("person_prefix_id").value || "");
    fd.set("organization_id", qs("organization_id").value || "");
    fd.set("department_id", qs("department_id").value || "");
    fd.set("position_title_id", qs("position_title_id").value || "");

    // Strings
    fd.set("first_name_th", qs("first_name_th").value || "");
    fd.set("last_name_th", qs("last_name_th").value || "");
    fd.set("first_name_en", qs("first_name_en").value || "");
    fd.set("last_name_en", qs("last_name_en").value || "");
    fd.set("display_name", qs("display_name").value || "");

    // Keep current photo_path unless clearing/uploading
    fd.set("photo_path", qs("photo_path").value || "");

    const start = fromDatetimeLocal(qs("start_date").value);
    const end = fromDatetimeLocal(qs("end_date").value);
    if (start) fd.set("start_date", start);
    else fd.set("start_date", "");
    if (end) fd.set("end_date", end);
    else fd.set("end_date", "");

    // is_active exists in table, but self-edit should not change it.
    // Send current state (read-only) to satisfy "use all columns" without granting privilege.
    fd.set("is_active", qs("is_active").checked ? "1" : "0");

    // photo clear flag if requested
    const wantClear = qs("photo_clear").value === "1";
    if (wantClear) fd.set("photo_clear", "1");

    const fileInput = qs("photo_file");
    const f = fileInput?.files?.[0];
    if (f) {
      fd.set("photo_file", f);
    }

    return fd;
  }

  async function handleSave(e) {
    e?.preventDefault?.();

    const btn = qs("btn-save");
    if (btn) btn.disabled = true;

    try {
      setInfo("กำลังบันทึก...", { isError: false });
      const fd = collectFormData();
      const json = await api("/profile/me", { method: "PUT", body: fd });
      fillForm(json?.data);
      qs("photo_clear").value = "0";
      qs("photo_file").value = "";
      setInfo("บันทึกข้อมูลเรียบร้อย", { isError: false });
    } catch (err) {
      console.error(err);
      setInfo(err?.message || "บันทึกไม่สำเร็จ", { isError: true });
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  function clearPhoto() {
    qs("photo_clear").value = "1";
    qs("photo_file").value = "";
    qs("photo_path").value = "";
    setAvatar("");
    setInfo("เลือก ‘บันทึกข้อมูล’ เพื่อยืนยันการลบรูปโปรไฟล์", { isError: false });
  }

  async function handleDeleteAccount() {
    const yes = confirm(
      "ยืนยันลบบัญชี/ข้อมูลส่วนตัว?\n\n- จะลบข้อมูล person และ user ของคุณ\n- ต้องเข้าสู่ระบบใหม่เพื่อใช้งานอีกครั้ง"
    );
    if (!yes) return;

    const btn = qs("btn-delete");
    if (btn) btn.disabled = true;

    try {
      setInfo("กำลังลบบัญชี...", { isError: false });
      await api("/profile/me", { method: "DELETE" });

      // Clear tokens
      ["auth_token", "token", "access_token", "isLoggedIn"].forEach((k) => {
        localStorage.removeItem(k);
        sessionStorage.removeItem(k);
      });

      setInfo("ลบบัญชีเรียบร้อย", { isError: false });

      // best-effort close LIFF
      try {
        if (window.liff) {
          if (typeof window.liff.logout === "function") window.liff.logout();
          if (typeof window.liff.closeWindow === "function") window.liff.closeWindow();
        }
      } catch (e) {
        console.warn("LIFF close failed", e);
      }

      setTimeout(() => {
        window.location.href = "/ict8/login.html";
      }, 700);
    } catch (err) {
      console.error(err);
      setInfo(err?.message || "ลบไม่สำเร็จ", { isError: true });
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  async function handleLogout() {
    const yes = confirm("ออกจากระบบและกลับไป Rich Menu ก่อนล็อกอิน? ");
    if (!yes) return;

    const btn = qs("btn-logout");
    if (btn) btn.disabled = true;

    try {
      setInfo("กำลังออกจากระบบ...", { isError: false });

      // Tell backend to switch richmenu -> before login (best-effort)
      await api("/profile/logout", { method: "POST", body: {} });

      // Clear tokens
      ["auth_token", "token", "access_token", "isLoggedIn"].forEach((k) => {
        localStorage.removeItem(k);
        sessionStorage.removeItem(k);
      });

      // LIFF: logout + close
      try {
        if (window.liff) {
          if (typeof window.liff.logout === "function") window.liff.logout();
          if (typeof window.liff.closeWindow === "function") window.liff.closeWindow();
        }
      } catch (e) {
        console.warn("LIFF logout failed", e);
      }

      setInfo("ออกจากระบบแล้ว", { isError: false });
      setTimeout(() => {
        window.location.href = "/ict8/login.html";
      }, 600);
    } catch (err) {
      console.error(err);
      setInfo(err?.message || "ออกจากระบบไม่สำเร็จ", { isError: true });
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  async function init() {
    const token = pickToken();
    if (!token) {
      setInfo("กรุณาเข้าสู่ระบบก่อนใช้งานหน้าโปรไฟล์", { isError: true });
      setTimeout(() => (window.location.href = "/ict8/login.html"), 700);
      return;
    }

    // wire events
    qs("profile-form")?.addEventListener("submit", handleSave);
    qs("btn-save")?.addEventListener("click", handleSave);
    qs("btn-clear-photo")?.addEventListener("click", (e) => {
      e.preventDefault();
      clearPhoto();
    });
    qs("btn-delete")?.addEventListener("click", (e) => {
      e.preventDefault();
      handleDeleteAccount();
    });
    qs("btn-logout")?.addEventListener("click", (e) => {
      e.preventDefault();
      handleLogout();
    });

    // dependent dropdowns
    qs("organization_id")?.addEventListener("change", async () => {
      try {
        await reloadDepartments({});
        qs("department_id").value = "";
        await reloadPositionTitles({});
        qs("position_title_id").value = "";
      } catch (e) {
        console.warn(e);
      }
    });

    qs("department_id")?.addEventListener("change", async () => {
      try {
        await reloadPositionTitles({});
        qs("position_title_id").value = "";
      } catch (e) {
        console.warn(e);
      }
    });

    qs("photo_file")?.addEventListener("change", () => {
      qs("photo_clear").value = "0";
      const f = qs("photo_file")?.files?.[0];
      if (!f) return;

      const url = URL.createObjectURL(f);
      const img = qs("pf-photo");
      const fb = qs("pf-photo-fallback");
      if (img) {
        img.src = url;
        img.style.display = "block";
      }
      if (fb) fb.style.display = "none";
    });

    // load profile + lookups
    setInfo("กำลังโหลดข้อมูล...", { isError: false });
    const json = await api("/profile/me", { method: "GET" });

    const data = json?.data || {};
    const person = data.person || {};

    // load lookups first, then fill values so selects can set properly
    await loadLookups({ organizationId: person.organization_id, departmentId: person.department_id });

    fillForm(data);

    // After filling, reload dependent lists to ensure correct options
    await reloadDepartments({ organizationId: person.organization_id });
    qs("department_id").value = person.department_id || "";

    await reloadPositionTitles({ organizationId: person.organization_id, departmentId: person.department_id });
    qs("position_title_id").value = person.position_title_id || "";

    setInfo("", { isError: false });
  }
})();
