// navbar
function initNavbar() {
    // รองรับหลายหน้า: navbar ใช้ .nav-menu แต่ device/schedule ใช้ ul คนละ class
    document.querySelectorAll(".main-nav").forEach((nav) => {
        const toggle = nav.querySelector(".nav-toggle");
        const menu = nav.querySelector(".nav-menu") || nav.querySelector("ul");

        if (!toggle || !menu) return;

        // GCMS nav มีสคริปต์เฉพาะ (assets/js/gcms-nav.js) จัดการอยู่แล้ว
        // ถ้า bind ซ้ำจะเกิดอาการ toggle 2 ครั้ง (เปิดแล้วปิดทันที)
        if (toggle.id === "gcmsNavToggle" || menu.id === "gcmsNavMenu") return;

        // กัน bind ซ้ำ (include.js อาจเรียก initNavbar() หลายครั้ง)
        if (toggle.dataset.navBound === "1") return;
        toggle.dataset.navBound = "1";

        // ============ ปุ่ม ☰ (เมนูมือถือ) ============
        toggle.addEventListener("click", () => {
            menu.classList.toggle("open");
        });

        // คลิกลิงก์ไหนก็ปิดเมนู (ตอนหน้าจอเล็ก)
        menu.querySelectorAll("a").forEach((link) => {
            link.addEventListener("click", () => {
                menu.classList.remove("open");
            });
        });

        // ============ DROPDOWN (คลิกแล้วเปิด/ปิด + ลูกศรหมุน) ============
        const dropdownLinks = menu.querySelectorAll(".dropdown > a");

        dropdownLinks.forEach((trigger) => {
            trigger.addEventListener("click", function (e) {
                e.preventDefault();
                e.stopPropagation();

                const parent = this.parentElement;
                const isOpen = parent.classList.contains("open");

                // ปิด dropdown ที่เปิดอยู่ทั้งหมดก่อน
                menu.querySelectorAll(".dropdown.open").forEach((d) => {
                    d.classList.remove("open");
                });

                if (!isOpen) {
                    parent.classList.add("open");
                }
            });
        });
    });

    // คลิกนอก .dropdown ให้ปิด dropdown ทั้งหมด (ผูกครั้งเดียว)
    if (!document.documentElement.dataset.navDropdownDocBound) {
        document.documentElement.dataset.navDropdownDocBound = "1";
        document.addEventListener("click", function (e) {
            if (!e.target.closest(".dropdown")) {
                document.querySelectorAll(".main-nav .dropdown.open").forEach((d) => {
                    d.classList.remove("open");
                });
            }
        });
    }
}

// hero slider
function initHeroSlider() {
    const hero = document.querySelector(".hero");
    const slides = Array.from(document.querySelectorAll(".hero-slide"));
    const dotsWrap = document.querySelector(".hero-dots");
    let dots = dotsWrap ? Array.from(dotsWrap.querySelectorAll(".dot")) : [];
    const btnLeft = document.querySelector(".hero-arrow-left");
    const btnRight = document.querySelector(".hero-arrow-right");

    if (slides.length === 0) return; // ถ้าไม่มี hero section ให้ข้ามไป

    let current = 0;
    const total = slides.length;

    // If slider was initialized before (e.g. banners refreshed), clear the previous auto-interval.
    if (hero && hero.__heroSliderIntervalId) {
        clearInterval(hero.__heroSliderIntervalId);
        hero.__heroSliderIntervalId = null;
    }

    // Ensure dots exist and have indices (keeps slider clickable even if HTML was static)
    if (dotsWrap && dots.length !== total) {
        dotsWrap.innerHTML = slides
            .map((_, i) => `<span class="dot${i === 0 ? " active" : ""}" data-index="${i}"></span>`)
            .join("");
        dots = Array.from(dotsWrap.querySelectorAll(".dot"));
    } else {
        dots.forEach((d, i) => {
            if (!d.dataset.index) d.dataset.index = String(i);
        });
    }

    function showSlide(index) {
        slides.forEach(s => s.classList.remove("active"));
        dots.forEach(d => d.classList.remove("active"));

        slides[index].classList.add("active");
        dots[index]?.classList.add("active");

        current = index;
    }

    // ปุ่ม → (use onclick so re-init won't stack listeners)
    if (btnRight) btnRight.onclick = () => {
        let next = (current + 1) % total;
        showSlide(next);
    };

    // ปุ่ม ← (use onclick so re-init won't stack listeners)
    if (btnLeft) btnLeft.onclick = () => {
        let prev = (current - 1 + total) % total;
        showSlide(prev);
    };

    // คลิก dot (overwrite handler each init)
    dots.forEach(dot => {
        dot.onclick = () => {
            showSlide(parseInt(dot.dataset.index));
        };
    });

    // Auto slide ทุก 5 วิ
    const intervalId = setInterval(() => {
        let next = (current + 1) % total;
        showSlide(next);
    }, 5000);

    if (hero) hero.__heroSliderIntervalId = intervalId;
}

// Load banners (public) and render into home hero section
async function initHomeHeroBanners() {
    const heroInner = document.querySelector(".hero .hero-inner");
    if (!heroInner) return;

    const hero = document.querySelector(".hero");
    // Clear any pending refresh timer from previous render
    if (hero && hero.__heroBannersRefreshTimeoutId) {
        clearTimeout(hero.__heroBannersRefreshTimeoutId);
        hero.__heroBannersRefreshTimeoutId = null;
    }

    // If BannerAPI isn't present, keep static hero.
    if (!window.BannerAPI || typeof window.BannerAPI.listPublic !== "function") return;

    try {
        const res = await window.BannerAPI.listPublic({ limit: 10 });
        const items = Array.isArray(res?.data?.items) ? res.data.items : [];
        const list = items.length
            ? items
            : [
                {
                    banner_id: 0,
                    title: "",
                    discription: "",
                    image_path: "/ict8/assets/image/hero1.jpg",
                    source_activity_id: null,
                    source_news_id: null,
                    source_link_url: "",
                },
            ];

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

        // Remove existing slides (keep arrows and dots wrapper)
        heroInner.querySelectorAll(".hero-slide").forEach((el) => el.remove());

        let dotsWrap = heroInner.querySelector(".hero-dots");
        if (!dotsWrap) {
            dotsWrap = document.createElement("div");
            dotsWrap.className = "hero-dots";
            heroInner.appendChild(dotsWrap);
        }
        dotsWrap.innerHTML = "";

        const slidesHtml = list
            .map((b, i) => {
                const id = b.banner_id;
                const title = String(b.title || "");
                const img = toPublicUrl(b.image_path);

                const actId = Number(b.source_activity_id || 0);
                const newsId = Number(b.source_news_id || 0);
                const url0 = String(b.source_link_url || "").trim();

                let href = "";
                let target = "";
                let rel = "";

                if (actId > 0) {
                    href = `/ict8/site/activity-detail.html?id=${encodeURIComponent(String(actId))}`;
                } else if (newsId > 0) {
                    href = `/ict8/site/news-detail.html?id=${encodeURIComponent(String(newsId))}`;
                } else if (url0) {
                    href = url0;
                    if (/^https?:\/\//i.test(url0)) {
                        target = "_blank";
                        rel = "noopener noreferrer";
                    }
                }

                const imgTag = `<img src="${String(img).replaceAll('"', '&quot;')}" alt="${title.replaceAll('"', '&quot;') || `banner ${id}`}">`;
                const inner = href
                    ? `<a href="${href.replaceAll('"', '&quot;')}" ${target ? `target="${target}"` : ""} ${rel ? `rel="${rel}"` : ""} style="display:block; width:100%; height:100%;">${imgTag}</a>`
                    : imgTag;

                return `<div class="hero-slide${i === 0 ? " active" : ""}">${inner}</div>`;
            })
            .join("");

        // Insert slides before arrows so arrows stay on top
        heroInner.insertAdjacentHTML("afterbegin", slidesHtml);

        // dots
        dotsWrap.innerHTML = list
            .map((_, i) => `<span class="dot${i === 0 ? " active" : ""}" data-index="${i}"></span>`)
            .join("");

        // Auto refresh when the nearest end_at is reached (so expired banners disappear without a manual reload)
        const parseMySqlDateTime = (s) => {
            const t = String(s || "").trim();
            if (!t) return null;
            // MySQL DATETIME: "YYYY-MM-DD HH:MM:SS" -> "YYYY-MM-DDTHH:MM:SS"
            const d = new Date(t.replace(" ", "T"));
            return isNaN(d.getTime()) ? null : d;
        };

        const now = Date.now();
        const futureEnds = items
            .map((b) => parseMySqlDateTime(b?.end_at))
            .filter((d) => d && d.getTime() > now);

        if (hero && futureEnds.length) {
            const nextEndMs = Math.min(...futureEnds.map((d) => d.getTime()));
            const delay = Math.max(1000, nextEndMs - now + 1000); // +1s to pass the boundary

            hero.__heroBannersRefreshTimeoutId = setTimeout(async () => {
                try {
                    await initHomeHeroBanners();
                    initHeroSlider();
                } catch (e) {
                    // ignore
                }
            }, delay);
        }
    } catch (err) {
        // keep static hero on error
        console.warn("[hero] failed to load banners:", err);
    }
}

// Load home mission images (public) and render into <div class="mission-images">
async function initHomeMissionImages() {
    const wrap = document.querySelector(".mission-images");
    if (!wrap) return;

    // If HomeMissionImgAPI isn't present, keep static images.
    if (!window.HomeMissionImgAPI || typeof window.HomeMissionImgAPI.listPublic !== "function") return;

    // Ensure DOM structure exists even if HTML was edited.
    let left = wrap.querySelector(".mission-left");
    if (!left) {
        left = document.createElement("div");
        left.className = "mission-left";
        wrap.appendChild(left);
    }

    let right = wrap.querySelector(".mission-right");
    if (!right) {
        right = document.createElement("div");
        right.className = "mission-right";
        wrap.appendChild(right);
    }

    let leftImg = left.querySelector("img");
    if (!leftImg) {
        leftImg = document.createElement("img");
        leftImg.alt = "ภาพใหญ่";
        left.appendChild(leftImg);
    }

    let rightImgs = Array.from(right.querySelectorAll("img"));
    while (rightImgs.length < 2) {
        const img = document.createElement("img");
        img.alt = rightImgs.length === 0 ? "ภาพเล็ก 1" : "ภาพเล็ก 2";
        right.appendChild(img);
        rightImgs = Array.from(right.querySelectorAll("img"));
    }

    const defaultLeft = leftImg?.getAttribute("src") || "";
    const defaultRight1 = rightImgs?.[0]?.getAttribute("src") || "";
    const defaultRight2 = rightImgs?.[1]?.getAttribute("src") || "";

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

    try {
        const res = await window.HomeMissionImgAPI.listPublic({ limit: 3 });
        const items = Array.isArray(res?.data?.items) ? res.data.items : [];

        const src0 = items[0]?.path ? toPublicUrl(items[0].path) : defaultLeft;
        const src1 = items[1]?.path ? toPublicUrl(items[1].path) : defaultRight1;
        const src2 = items[2]?.path ? toPublicUrl(items[2].path) : defaultRight2;

        if (leftImg && src0) leftImg.src = src0;
        if (rightImgs?.[0] && src1) rightImgs[0].src = src1;
        if (rightImgs?.[1] && src2) rightImgs[1].src = src2;
    } catch (err) {
        console.warn("[mission-images] failed to load:", err);
        // keep defaults
    }
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

document.addEventListener("DOMContentLoaded", async () => {
    initNavbar();
    await initHomeHeroBanners();
    initHeroSlider();
    await initHomeMissionImages();
    initHomeNews();
    initHomeActivities();
    initProfileDropdown();
    initActivelink();
});