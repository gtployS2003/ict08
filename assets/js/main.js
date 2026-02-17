// navbar
function initNavbar() {
    const toggle = document.querySelector(".nav-toggle");
    const menu = document.querySelector(".nav-menu");

    if (!toggle || !menu) return;

    toggle.onclick = null;
    menu.querySelectorAll("a").forEach(link => (link.onclick = null));

    // ============ ปุ่ม ☰ (เมนูมือถือ) ============
    toggle.addEventListener("click", () => {
        menu.classList.toggle("open");
    });

    // คลิกลิงก์ไหนก็ปิดเมนู (ตอนหน้าจอเล็ก)
    menu.querySelectorAll("a").forEach(link => {
        link.addEventListener("click", () => {
            menu.classList.remove("open");
        });
    });

    // ============ DROPDOWN (คลิกแล้วเปิด/ปิด + ลูกศรหมุน) ============
    const dropdownLinks = menu.querySelectorAll(".dropdown > a");

    dropdownLinks.forEach(trigger => {
        trigger.addEventListener("click", function (e) {
            e.preventDefault();    // กันไม่ให้กระโดดไปบนสุดหน้า
            e.stopPropagation();   // กันไม่ให้หลุดไปถึง document click

            const parent = this.parentElement;
            const isOpen = parent.classList.contains("open");

            // ปิด dropdown ที่เปิดอยู่ทั้งหมดก่อน
            menu.querySelectorAll(".dropdown.open").forEach(d => {
                d.classList.remove("open");
            });

            // ถ้าอันที่คลิกเดิมยังไม่เปิด → ให้เปิด
            if (!isOpen) {
                parent.classList.add("open");
            }
        });
    });

    // คลิกนอก .dropdown ให้ปิด dropdown ทั้งหมด
    document.addEventListener("click", function (e) {
        if (!e.target.closest(".dropdown")) {
            menu.querySelectorAll(".dropdown.open").forEach(d => {
                d.classList.remove("open");
            });
        }
    });
}

// hero slider
function initHeroSlider() {
    const slides = document.querySelectorAll(".hero-slide");
    const dots = document.querySelectorAll(".hero-dots .dot");
    const btnLeft = document.querySelector(".hero-arrow-left");
    const btnRight = document.querySelector(".hero-arrow-right");

    if (slides.length === 0) return; // ถ้าไม่มี hero section ให้ข้ามไป

    let current = 0;
    const total = slides.length;

    function showSlide(index) {
        slides.forEach(s => s.classList.remove("active"));
        dots.forEach(d => d.classList.remove("active"));

        slides[index].classList.add("active");
        dots[index].classList.add("active");

        current = index;
    }

    // ปุ่ม →
    btnRight?.addEventListener("click", () => {
        let next = (current + 1) % total;
        showSlide(next);
    });

    // ปุ่ม ←
    btnLeft?.addEventListener("click", () => {
        let prev = (current - 1 + total) % total;
        showSlide(prev);
    });

    // คลิก dot
    dots.forEach(dot => {
        dot.addEventListener("click", () => {
            showSlide(parseInt(dot.dataset.index));
        });
    });

    // Auto slide ทุก 5 วิ
    setInterval(() => {
        let next = (current + 1) % total;
        showSlide(next);
    }, 5000);
}

// NEWS SLIDER
function initNewsSlider() {
    const track = document.querySelector(".news-cards");
    const cards = track ? track.querySelectorAll(".news-card") : [];
    const btnLeft = document.querySelector(".news-arrow-left");
    const btnRight = document.querySelector(".news-arrow-right");
    const dots = document.querySelectorAll(".news-dot");

    if (!track || cards.length === 0) return;

    const perPage = 3;                         // แสดงทีละ 3 การ์ด
    const totalPages = Math.ceil(cards.length / perPage);
    let currentPage = 0;

    // หาค่า gap จาก CSS (news-cards { gap: 24px; })
    function getGap() {
        const style = getComputedStyle(track);
        const g = parseFloat(style.columnGap || style.gap || "0");
        return isNaN(g) ? 0 : g;
    }

    // คำนวณระยะเลื่อนต่อหน้า = กว้างการ์ด 3 ใบ + gap 2 ช่อง
    function getStep() {
        if (!cards[0]) return 0;
        const cardWidth = cards[0].getBoundingClientRect().width;
        const gap = getGap();
        return perPage * cardWidth + (perPage - 1) * gap + gap;
    }

    function goTo(page) {
        const step = getStep();
        currentPage = Math.max(0, Math.min(page, totalPages - 1));

        track.scrollTo({
            left: currentPage * step,
            behavior: "smooth",
        });

        // อัปเดต dot
        dots.forEach((d, i) => {
            d.classList.toggle("active", i === currentPage);
        });
    }

    // ปุ่ม →
    btnRight?.addEventListener("click", () => {
        if (currentPage < totalPages - 1) {
            goTo(currentPage + 1);
        } else {
            goTo(0); // ถ้าไม่อยากวนลูปเปลี่ยนเป็น return;
        }
    });

    // ปุ่ม ←
    btnLeft?.addEventListener("click", () => {
        if (currentPage > 0) {
            goTo(currentPage - 1);
        } else {
            goTo(totalPages - 1);
        }
    });

    // คลิก dot
    dots.forEach((dot, index) => {
        dot.addEventListener("click", () => {
            goTo(index);
        });
    });

    // เวลา resize ให้คงหน้าปัจจุบันแต่คำนวณ step ใหม่
    window.addEventListener("resize", () => {
        goTo(currentPage);
    });

    // เรียกครั้งแรก
    goTo(0);
}

// load news
function initHomeNews() {
    const container = document.querySelector(".news-cards");
    if (!container) return;   // ถ้าไม่ใช่หน้า home (ไม่มี .news-cards) ก็ไม่ต้องทำอะไร

    const HOME_NEWS_LIMIT = 15;
    const isInPageFolder = window.location.pathname.includes("/site/");
    const jsonPath = "/ict8/assets/js/data-ex/news.json";

    fetch(jsonPath)
        .then(res => res.json())
        .then(data => {
            // เอาเฉพาะ 15 ข่าวล่าสุดตาม id (id มาก = ใหม่กว่า)
            const latestNews = [...data]
                .sort((a, b) => b.id - a.id)
                .slice(0, HOME_NEWS_LIMIT);

            container.innerHTML = latestNews.map(item => `
                <a href="/ict8/site/news-detail.html?id=${item.id}" target="_blank" rel="noopener noreferrer" class="news-card" >
                    <h3 class="news-card-title">${item.title}</h3>
                    <div class="news-card-date">${item.date}</div>
                    <p  class="news-card-link">
                        รายละเอียดเพิ่มเติม ➜
                    </p>
                </a>
            `).join("");

            // หลังจากเติมการ์ดแล้ว ค่อย init slider
            initNewsSlider();
        })
        .catch(err => {
            console.error("โหลดข่าวสำหรับหน้าแรกไม่สำเร็จ", err);
        });
}

function parseThaiDateForHome(str) {
    if (!str || typeof str !== "string") return null;
    const parts = str.trim().split(/\s+/);
    if (parts.length < 3) return null;

    const day = parseInt(parts[0], 10);
    const yearBE = parseInt(parts[2], 10);
    if (isNaN(day) || isNaN(yearBE)) return null;

    // "7 พ.ย. 2568" -> เดือน key = "พย"
    const monthKey = parts[1].replace(/\./g, "");
    const monthMap = {
        "มค": 0, "กพ": 1, "มีค": 2, "เมย": 3,
        "พค": 4, "มิย": 5, "กค": 6, "สค": 7,
        "กย": 8, "ตค": 9, "พย": 10, "ธค": 11
    };
    const m = monthMap[monthKey];
    if (m === undefined) return null;

    const yearAD = yearBE - 543;
    return new Date(yearAD, m, day);
}

// load activity 
function initHomeActivities() {
    const slidesContainer = document.querySelector(".activities-slides");
    const dotsContainer = document.querySelector(".activity-dots");
    if (!slidesContainer || !dotsContainer) return;  // ถ้าไม่ได้อยู่หน้า home ก็ไม่ทำอะไร

    const HOME_ACT_LIMIT = 15;
    const jsonPath = "/ict8/assets/js/data-ex/activity.json";  // เหมือนที่ใช้ใน activities.js

    fetch(jsonPath)
        .then(res => res.json())
        .then(data => {
            // เรียงจากกิจกรรมล่าสุดไปเก่าสุด (ลองใช้วันที่)
            const latest = [...data]
                .sort((a, b) => b.id - a.id)
                .slice(0, HOME_ACT_LIMIT);
            // เคลียร์ของเก่า
            slidesContainer.innerHTML = "";
            dotsContainer.innerHTML = "";

            const groupSize = 3; // 1 การ์ดใหญ่ + 2 การ์ดเล็ก
            let slideIndex = 0;

            for (let i = 0; i < latest.length; i += groupSize) {
                const main = latest[i];
                const side1 = latest[i + 1];
                const side2 = latest[i + 2];

                if (!main) continue;

                const mainImg =
                    main.images && main.images.length > 0
                        ? main.images[0]
                        : "/img/activities/01.png";

                const detailHref = `activity-detail.html?id=${main.id}`;

                // สร้าง HTML ฝั่งขวา (side)
                let sideHtml = "";

                function renderSide(item) {
                    if (!item) return "";
                    const img =
                        item.images && item.images.length > 0
                            ? item.images[0]
                            : "/ict8/assets/img/activities/01.png";
                    return `
                        <a href="/ict8/site/activity-detail.html?id=${item.id}" target="_blank" rel="noopener noreferrer"
                           class="activity-side-item card-link">
                            <img src="${img}" alt="${item.title}" class="activity-side-img">
                            <div class="activity-side-content">
                                <h3 class="activity-side-title">
                                    ${item.title}
                                </h3>
                                <span class="activity-side-tag">${item.category}</span>
                                <div class="activity-side-date">${item.date}</div>
                            </div>
                        </a>
                    `;
                }

                if (side1) {
                    sideHtml += renderSide(side1);
                }
                if (side1 && side2) {
                    sideHtml += `<hr class="activity-side-divider">`;
                }
                if (side2) {
                    sideHtml += renderSide(side2);
                }

                const slideHtml = `
                    <div class="activities-grid activity-slide ${slideIndex === 0 ? "active" : ""}">
                        <!-- การ์ดใหญ่ด้านซ้าย -->
                        <a href="${detailHref}" target="_blank" rel="noopener noreferrer" class="activity-main card-link">
                            <img src="${mainImg}" alt="${main.title}" class="activity-main-img">
                            <div class="activity-main-overlay">
                                <h3 class="activity-main-title">
                                    ${main.title}
                                </h3>
                                <span class="activity-main-tag">${main.category}</span>
                                <div class="activity-main-date">${main.date}</div>
                            </div>
                        </a>

                        <!-- คอลัมน์ขวา -->
                        <div class="activity-side">
                            ${sideHtml}
                        </div>
                    </div>
                `;

                slidesContainer.insertAdjacentHTML("beforeend", slideHtml);

                // จุดของสไลด์
                dotsContainer.insertAdjacentHTML(
                    "beforeend",
                    `<span class="activity-dot ${slideIndex === 0 ? "active" : ""}" data-index="${slideIndex}"></span>`
                );

                slideIndex++;
            }

            // หลังจากสร้างสไลด์แล้ว ค่อย init slider
            initActivitySlider();
        })
        .catch(err => {
            console.error("โหลดกิจกรรมสำหรับหน้าแรกไม่สำเร็จ", err);
        });
}

// Activity SLIDER
function initActivitySlider() {
    const slides = document.querySelectorAll('.activity-slide');
    const dots = document.querySelectorAll('.activity-dot');

    function showSlide(index) {
        slides.forEach((slide, i) => {
            slide.classList.toggle('active', i === index);
        });
        dots.forEach((dot, i) => {
            dot.classList.toggle('active', i === index);
        });
    }

    dots.forEach((dot, idx) => {
        dot.addEventListener('click', () => {
            showSlide(idx);
        });
    });

    // เริ่มจาก slide แรกเสมอ
    showSlide(0);
}

// profile dropdown
function initProfileDropdown() {
    const wrapper = document.querySelector(".profile-wrapper");
    const toggleBtn = document.getElementById("profileToggle");

    if (!wrapper || !toggleBtn) return;

    toggleBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        wrapper.classList.toggle("open");
    });

    document.addEventListener("click", (e) => {
        if (!wrapper.contains(e.target)) {
            wrapper.classList.remove("open");
        }
    });
}

function initActivelink() {
    const currentPath = window.location.pathname.replace(/\/index\.html$/, '/');

    document.querySelectorAll('.nav-schedule a').forEach(link => {
        const linkPath = new URL(link.href).pathname.replace(/\/index\.html$/, '/');

        if (linkPath === currentPath) {
            link.classList.add('active');
        }
    });

    document.querySelectorAll('.nav-menu a').forEach(link => {
        const linkPath = new URL(link.href).pathname.replace(/\/index\.html$/, '/');

        if (linkPath === currentPath) {
            link.classList.add('active');
        }
    });

    document.querySelectorAll('.nav-device a').forEach(link => {
        const linkPath = new URL(link.href).pathname.replace(/\/index\.html$/, '/');

        if (linkPath === currentPath) {
            link.classList.add('active');
        }
    });
}

document.addEventListener("DOMContentLoaded", () => {
    initNavbar();
    initHeroSlider();
    initHomeNews();
    initHomeActivities();
    initProfileDropdown();
    initActivelink();
});