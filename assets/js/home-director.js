// assets/js/home-director.js
// เติมข้อมูลผู้อำนวยการ (หน้า site/home.html)
// ดึงจากตาราง site_structure แถว site_structure = 1

(() => {
  async function initHomeDirector() {
    const nameEl = document.querySelector(".director-name");
    const positionEl = document.querySelector(".director-position");
    const imgEl = document.querySelector(".director-photo");

    // ถ้าไม่ได้อยู่หน้า home หรือไม่มี section นี้ ให้ข้าม
    if (!nameEl && !imgEl) return;

    if (!window.SiteStructureAPI || typeof window.SiteStructureAPI.get !== "function") {
      // API ไม่ถูก include -> คงค่าเดิมไว้
      return;
    }

    try {
      const res = await window.SiteStructureAPI.get(1, { isPublic: true });
      const row = res?.data?.row || null;
      if (!row) return;

      const prefix = String(row.prefix_th || "").trim();
      const fristname = String(row.fristname || row.firstname || "").trim();
      const lastname = String(row.lastname || "");
      const fullName = [prefix, fristname, lastname].filter(Boolean).join(" ");

      if (nameEl && fullName) {
        nameEl.textContent = fullName;
      }

      if (positionEl) {
        positionEl.textContent = "ผู้อำนวยการศูนย์เทคโนโลยีสารสนเทศและการสื่อสารเขต 8 (พิษณุโลก)";
      }

      const API_BASE = window.API_BASE_URL || window.__API_BASE__ || "/ict8/backend/public";
      const toPublicUrl = (fp) => {
        const p = String(fp || "").trim();
        if (!p) return "";
        if (/^https?:\/\//i.test(p)) return p;
        if (p.startsWith("/uploads/")) return `${API_BASE}${p}`;
        if (p.startsWith("uploads/")) return `${API_BASE}/${p}`;
        if (p.startsWith("./uploads/")) return `${API_BASE}/${p.replace(/^\.\//, "")}`;
        if (p.startsWith("/")) return p;
        return `/${p}`;
      };

      const photoUrl = toPublicUrl(row.pic_path);
      if (imgEl && photoUrl) {
        imgEl.src = photoUrl;
        imgEl.alt = fullName || "director";
      }
    } catch (e) {
      // เงียบ ๆ ไม่ให้หน้าเว็บพัง
      // console.warn("Home director load failed", e);
    }
  }

  // defer scripts: DOM พร้อมแล้ว แต่เผื่อกรณี include.js ยังเปลี่ยน DOM บางส่วน
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initHomeDirector);
  } else {
    initHomeDirector();
  }
})();
