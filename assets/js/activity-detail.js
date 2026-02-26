// assets/js/activity-detail.js
// Public activity detail page: load from DB via /activities/{id}

document.addEventListener("DOMContentLoaded", () => {
    let currentImageIndex = 0;
    let images = [];

    const titleEl = document.getElementById("activity-title");
    const catEl = document.getElementById("activity-category");
    const dateEl = document.getElementById("activity-date");
    const provEl = document.getElementById("activity-province");
    const writerEl = document.getElementById("activity-writer");
    const mainImgEl = document.getElementById("activity-main-image");
    const thumbsEl = document.getElementById("activity-thumbs");
    const contentEl = document.getElementById("activity-content");
    const breadcrumbTitle = document.getElementById("activity-breadcrumb-title");

    if (!titleEl) return;

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

        if (fp.startsWith("/uploads/")) {
            return `/ict8/backend/public${fp}`;
        }
        if (fp.startsWith("uploads/")) {
            return `/ict8/backend/public/${fp}`;
        }
        if (fp.startsWith("/")) return fp;
        return `/ict8/backend/public/${fp}`;
    }

    function formatThaiDate(mysqlDt) {
        const s = String(mysqlDt || "").trim();
        if (!s) return "";
        const d = new Date(s.replace(" ", "T"));
        if (Number.isNaN(d.getTime())) return s;
        try {
            return new Intl.DateTimeFormat("th-TH", {
                year: "numeric",
                month: "short",
                day: "numeric",
            }).format(d);
        } catch {
            return s;
        }
    }

    function updateMainImage() {
        if (!images.length || !mainImgEl) return;
        mainImgEl.src = images[currentImageIndex];
        mainImgEl.alt = titleEl.textContent || "กิจกรรม";
    }

    function renderThumbs() {
        if (!thumbsEl) return;
        thumbsEl.innerHTML = "";

        images.forEach((src, index) => {
            const thumb = document.createElement("button");
            thumb.type = "button";
            thumb.className = "activity-thumb" + (index === currentImageIndex ? " active" : "");
            thumb.innerHTML = `<img src="${escapeHtml(src)}" alt="${escapeHtml(titleEl.textContent || "กิจกรรม")}">`;

            thumb.addEventListener("click", () => {
                currentImageIndex = index;
                updateMainImage();
                renderThumbs();
            });

            thumbsEl.appendChild(thumb);
        });
    }

    async function api(path, { method = "GET", body } = {}) {
        if (typeof window.apiFetch === "function") {
            return window.apiFetch(path, { method, body, skipAuth: true });
        }
        const base = window.API_BASE_URL || "/ict8/backend/public";
        const res = await fetch(`${base}${path}`);
        const json = await res.json();
        if (!res.ok || json?.ok === false) throw new Error(json?.message || `Request failed (${res.status})`);
        return json;
    }

    async function load() {
        const params = new URLSearchParams(window.location.search);
        const idParam = params.get("id");
        const activityId = idParam ? Number(idParam) : 0;

        if (!activityId) {
            titleEl.textContent = "ไม่พบรหัสกิจกรรม";
            if (contentEl) contentEl.textContent = "ไม่พบข้อมูลกิจกรรมที่ต้องการแสดง";
            return;
        }

        try {
            const json = await api(`/activities/${encodeURIComponent(String(activityId))}`, { method: "GET" });
            const row = json?.data;
            if (!row) throw new Error("ไม่พบข้อมูล");

            const title = String(row?.title || "").trim() || "ไม่ระบุชื่อกิจกรรม";
            const category = String(row?.request_sub_type_name || "").trim() || String(row?.request_type_name || "").trim() || "-";
            const province = String(row?.province_name || "").trim() || "-";
            const writer = String(row?.writer_name || "").trim();
            const dt = row?.end_datetime || row?.start_datetime || row?.update_at || row?.create_at;
            const dateText = formatThaiDate(dt) || "-";

            document.title = `${title} | ศูนย์เทคโนโลยีสารสนเทศฯ เขต 8`;

            titleEl.textContent = title;
            if (catEl) catEl.textContent = category;
            if (dateEl) dateEl.textContent = dateText;
            if (provEl) provEl.textContent = province;
            if (writerEl) writerEl.textContent = writer ? `ผู้เขียน: ${writer}` : "ผู้เขียน: -";
            if (breadcrumbTitle) breadcrumbTitle.textContent = title;

            const content = String(row?.content || "");
            if (contentEl) {
                // keep safe rendering (no raw HTML), preserve line breaks
                contentEl.innerHTML = escapeHtml(content).replace(/\n/g, "<br>");
            }

            const media = Array.isArray(row?.media) ? row.media : [];
            const urls = media
                .map((m) => buildFileUrl(m?.filepath))
                .map((u) => String(u || "").trim())
                .filter((u) => u);

            images = urls.length ? urls : ["/ict8/assets/image/activities/01.png"];
            currentImageIndex = 0;
            updateMainImage();
            renderThumbs();
        } catch (err) {
            console.error(err);
            titleEl.textContent = "เกิดข้อผิดพลาดในการโหลดข้อมูล";
            if (contentEl) contentEl.textContent = "กรุณาลองใหม่อีกครั้งภายหลัง";
            images = ["/ict8/assets/image/activities/01.png"];
            currentImageIndex = 0;
            updateMainImage();
            renderThumbs();
        }
    }

    load().catch(console.error);
});
