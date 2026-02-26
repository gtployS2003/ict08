document.addEventListener("DOMContentLoaded", () => {
    const titleEl = document.getElementById("news-title");
    const dateEl = document.getElementById("news-date");
    const writerEl = document.getElementById("news-writer");
    const imageWrapEl = document.getElementById("news-image-wrap");
    const contentEl = document.getElementById("news-content");
    const breadcrumbTitle = document.getElementById("news-breadcrumb-title");
    const attachmentsWrapEl = document.getElementById("news-attachments-wrap");
    const attachmentsListEl = document.getElementById("news-attachments");

    if (!titleEl) return; // กันกรณี script ถูกโหลดในหน้าอื่น

    const API_BASE = (window.__APP_CONFIG__ && window.__APP_CONFIG__.API_BASE) || "/ict8/backend/public";

    function docToPublicUrl(path) {
        const p0 = String(path || "").trim();
        if (!p0) return "";
        if (/^https?:\/\//i.test(p0)) return p0;
        if (p0.startsWith("/uploads/")) return `${API_BASE}${p0}`;
        if (p0.startsWith("uploads/")) return `${API_BASE}/${p0}`;
        if (p0.startsWith("./uploads/")) return `${API_BASE}/${p0.replace(/^\.\//, "")}`;
        return p0;
    }

    function formatThaiDate(mysqlDateTime) {
        const s = String(mysqlDateTime || "").trim();
        if (!s) return "-";
        const dt = new Date(s.replace(" ", "T"));
        if (isNaN(dt.getTime())) return s;

        const months = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
        const d = dt.getDate();
        const m = months[dt.getMonth()] || "";
        const y = dt.getFullYear() + 543;
        return `${d} ${m} ${y}`;
    }

    // 1) อ่าน id จาก query string
    const params = new URLSearchParams(window.location.search);
    const idParam = params.get("id");
    const newsId = idParam ? Number(idParam) : null;

    if (!newsId) {
        titleEl.textContent = "ไม่พบรหัสข่าวประชาสัมพันธ์";
        if (contentEl) contentEl.textContent = "ไม่พบข้อมูลที่ต้องการแสดง";
        if (imageWrapEl) imageWrapEl.style.display = "none";
        return;
    }

    // ตอนนี้ระบบข่าวไม่มีรูปภาพจาก DB → ซ่อนเสมอ (กัน layout เด้ง)
    if (imageWrapEl) imageWrapEl.style.display = "none";

    if (attachmentsWrapEl) attachmentsWrapEl.style.display = "none";

    fetch(`${API_BASE}/news/${encodeURIComponent(String(newsId))}`, {
        headers: { 'Accept': 'application/json' },
    })
        .then((res) => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
        })
        .then((json) => {
            const item = json?.data || json;

            if (!item) {
                titleEl.textContent = "ไม่พบข่าวประชาสัมพันธ์";
                if (contentEl) contentEl.textContent = "ไม่พบข้อมูลที่ต้องการแสดง";
                return;
            }

            const title = item?.title || "ไม่ระบุหัวข้อข่าว";
            const dateStr = formatThaiDate(item?.create_at);
            const writerName = item?.writer_name || item?.writer || "-";

            document.title = `${title} | ศูนย์เทคโนโลยีสารสนเทศฯ เขต 8`;

            titleEl.textContent = title;
            if (dateEl) dateEl.textContent = dateStr;
            if (writerEl) writerEl.textContent = writerName ? `ผู้เขียน: ${writerName}` : "ผู้เขียน: -";
            if (breadcrumbTitle) breadcrumbTitle.textContent = title || "รายละเอียดประชาสัมพันธ์";

            // เนื้อหา: DB เป็นข้อความธรรมดา
            if (contentEl) contentEl.textContent = item?.content || "";

            // เอกสารแนบ (join ผ่าน news_document)
            if (!attachmentsWrapEl || !attachmentsListEl) return;
            fetch(`${API_BASE}/news/${encodeURIComponent(String(newsId))}/documents`, {
                headers: { 'Accept': 'application/json' },
            })
                .then((res) => {
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    return res.json();
                })
                .then((j2) => {
                    const items2 = Array.isArray(j2?.data?.items) ? j2.data.items : Array.isArray(j2?.items) ? j2.items : [];
                    if (!Array.isArray(items2) || items2.length === 0) {
                        attachmentsWrapEl.style.display = "none";
                        attachmentsListEl.innerHTML = "";
                        return;
                    }

                    attachmentsListEl.innerHTML = "";
                    for (const d of items2) {
                        const li = document.createElement("li");
                        li.style.margin = "6px 0";

                        const name = String(d?.original_filename || d?.filepath || "เอกสาร");
                        const href = docToPublicUrl(d?.filepath);

                        if (href) {
                            const a = document.createElement("a");
                            a.href = href;
                            a.target = "_blank";
                            a.rel = "noopener noreferrer";
                            a.textContent = name;
                            a.title = String(d?.filepath || "");
                            li.appendChild(a);
                        } else {
                            li.textContent = name;
                        }

                        attachmentsListEl.appendChild(li);
                    }

                    attachmentsWrapEl.style.display = "block";
                })
                .catch((e2) => {
                    console.error("โหลดเอกสารแนบไม่สำเร็จ", e2);
                    attachmentsWrapEl.style.display = "none";
                });
        })
        .catch((err) => {
            console.error("โหลดข่าวจาก API ไม่สำเร็จ", err);
            titleEl.textContent = "เกิดข้อผิดพลาดในการโหลดข้อมูล";
            if (contentEl) contentEl.textContent = "กรุณาลองใหม่อีกครั้งภายหลัง";
        });
});
