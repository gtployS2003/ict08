document.addEventListener("DOMContentLoaded", () => {
    const titleEl = document.getElementById("news-title");
    const dateEl = document.getElementById("news-date");
    const writerEl = document.getElementById("news-writer");
    const imageWrapEl = document.getElementById("news-image-wrap");
    const imageEl = document.getElementById("news-image");
    const contentEl = document.getElementById("news-content");
    const breadcrumbTitle = document.getElementById("news-breadcrumb-title");

    if (!titleEl) return; // กันกรณี script ถูกโหลดในหน้าอื่น

    // 1) อ่าน id จาก query string
    const params = new URLSearchParams(window.location.search);
    const idParam = params.get("id");
    const newsId = idParam ? Number(idParam) : null;

    if (!newsId) {
        titleEl.textContent = "ไม่พบรหัสข่าวประชาสัมพันธ์";
        contentEl.textContent = "ไม่พบข้อมูลที่ต้องการแสดง";
        if (imageWrapEl) imageWrapEl.style.display = "none";
        return;
    }

    // 2) เลือก path news.json ให้ถูก (อยู่ใน /page/ หรือหน้า root)
    const isInPageFolder = window.location.pathname.includes("/page/");
    const jsonPath = "/assets/js/data-ex/news.json"

    // 3) โหลด JSON แล้วหา news ตาม id
    fetch(jsonPath)
        .then(res => res.json())
        .then(data => {
            const item = data.find(n => Number(n.id) === newsId);

            if (!item) {
                titleEl.textContent = "ไม่พบข่าวประชาสัมพันธ์";
                contentEl.textContent = "ไม่พบข้อมูลที่ต้องการแสดง";
                if (imageWrapEl) imageWrapEl.style.display = "none";
                return;
            }

            // ตั้ง <title> แท็บ
            if (item.title) {
                document.title = `${item.title} | ศูนย์เทคโนโลยีสารสนเทศฯ เขต 8`;
            }

            // header
            titleEl.textContent = item.title || "ไม่ระบุหัวข้อข่าว";
            dateEl.textContent = item.date || "-";
            writerEl.textContent = item.writer ? `ผู้เขียน: ${item.writer}` : "ผู้เขียน: -";

            if (breadcrumbTitle) {
                breadcrumbTitle.textContent = item.title || "รายละเอียดประชาสัมพันธ์";
            }

            // รูปภาพ (มีหรือไม่มี)
            const imgPath = item.image && item.image.trim() !== "" ? item.image : "";
            if (imgPath) {
                imageEl.src = imgPath;
                imageEl.alt = item.title || "ภาพประชาสัมพันธ์";
                imageWrapEl.style.display = "block";
            } else {
                // ไม่มีรูป → ซ่อน block รูป
                imageWrapEl.style.display = "none";
            }

            // เนื้อหา
            // ถ้า content เป็น text ธรรมดา ใช้ textContent
            // ถ้าอนาคตมี <br> หรือ html ค่อยเปลี่ยนเป็น innerHTML
            contentEl.textContent = item.content || "";
        })
        .catch(err => {
            console.error("โหลด news.json สำหรับหน้า detail ไม่สำเร็จ", err);
            titleEl.textContent = "เกิดข้อผิดพลาดในการโหลดข้อมูล";
            contentEl.textContent = "กรุณาลองใหม่อีกครั้งภายหลัง";
            if (imageWrapEl) imageWrapEl.style.display = "none";
        });
});
