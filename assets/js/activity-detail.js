// js/activity-detail.js

document.addEventListener("DOMContentLoaded", () => {
    // ========== ตัวแปรรูปภาพ ==========
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

    const prevBtn = document.querySelector(".gallery-prev");
    const nextBtn = document.querySelector(".gallery-next");

    if (!titleEl) return; // กันกรณี script ถูกโหลดในหน้าอื่น

    // ========== ฟังก์ชันช่วยเรื่องรูป ==========
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
            thumb.innerHTML = `<img src="${src}" alt="${titleEl.textContent || "กิจกรรม"}">`;

            thumb.addEventListener("click", () => {
                currentImageIndex = index;
                updateMainImage();
                renderThumbs();
            });

            thumbsEl.appendChild(thumb);
        });
    }

    // ========== 1) อ่าน id จาก query string ==========
    const params = new URLSearchParams(window.location.search);
    const idParam = params.get("id");
    const activityId = idParam ? Number(idParam) : null;

    if (!activityId) {
        titleEl.textContent = "ไม่พบรหัสกิจกรรม";
        contentEl.textContent = "ไม่พบข้อมูลกิจกรรมที่ต้องการแสดง";
        return;
    }

    // ========== 2) เลือก path ของ activity.json ==========
    const isInPageFolder = window.location.pathname.includes("/site/");
    const jsonPath = "/assets/js/data-ex/activity.json";

    // ========== 3) โหลด JSON แล้วหา activity ตาม id ==========
    fetch(jsonPath)
        .then(res => res.json())
        .then(data => {
            const item = data.find(act => Number(act.id) === activityId);

            if (!item) {
                titleEl.textContent = "ไม่พบกิจกรรม";
                contentEl.textContent = "ไม่พบข้อมูลกิจกรรมที่ต้องการแสดง";
                return;
            }

            // ตั้ง title แท็บ
            if (item.title) {
                document.title = `${item.title} | ศูนย์เทคโนโลยีสารสนเทศฯ เขต 8`;
            }

            // ---- ตั้งค่า header ----
            titleEl.textContent = item.title || "ไม่ระบุชื่อกิจกรรม";
            catEl.textContent = item.category || "ไม่ระบุหมวดหมู่";
            dateEl.textContent = item.date || "-";
            provEl.textContent = item.province || "ไม่ระบุจังหวัด";
            writerEl.textContent = item.writer ? `ผู้เขียน: ${item.writer}` : "ผู้เขียน: -";

            if (breadcrumbTitle) {
                breadcrumbTitle.textContent = item.title || "รายละเอียดกิจกรรม";
            }

            // ---- เนื้อหา ----
            contentEl.textContent = item.content || "";

            // ---- รูปภาพ (เก็บไว้ที่ตัวแปร images ด้านบน) ----
            if (Array.isArray(item.images) && item.images.length > 0) {
                images = item.images;
            } else if (item.image) {
                images = [item.image];
            } else {
                images = ["/assets/image/activities/01.png"];
            }

            currentImageIndex = 0;
            updateMainImage();
            renderThumbs();
        })
        .catch(err => {
            console.error("โหลด activity.json สำหรับหน้า detail ไม่สำเร็จ", err);
            titleEl.textContent = "เกิดข้อผิดพลาดในการโหลดข้อมูล";
            contentEl.textContent = "กรุณาลองใหม่อีกครั้งภายหลัง";
        });

    // ========== ปุ่มเลื่อนซ้าย–ขวา ==========
    if (prevBtn) {
        prevBtn.addEventListener("click", () => {
            if (!images.length) return;
            currentImageIndex = (currentImageIndex - 1 + images.length) % images.length;
            updateMainImage();
            renderThumbs();
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener("click", () => {
            if (!images.length) return;
            currentImageIndex = (currentImageIndex + 1) % images.length;
            updateMainImage();
            renderThumbs();
        });
    }
});
