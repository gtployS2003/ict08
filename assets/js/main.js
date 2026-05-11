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

        const SITE_BASE = "https://ict8.moi.go.th/ict8/site";
        const buildBannerHref = (banner) => {
            const actId = Number(banner?.source_activity_id || 0);
            const newsId = Number(banner?.source_news_id || 0);
            const linkUrl = String(banner?.source_link_url || "").trim();

            if (actId > 0) {
                return `${SITE_BASE}/activity-detail.html?id=${encodeURIComponent(String(actId))}`;
            }
            if (newsId > 0) {
                return `${SITE_BASE}/news-detail.html?id=${encodeURIComponent(String(newsId))}`;
            }
            return linkUrl;
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
                const href = buildBannerHref(b);
                const isExternalLink = /^https?:\/\//i.test(href) && !href.startsWith(SITE_BASE);
                const target = isExternalLink ? "_blank" : "";
                const rel = isExternalLink ? "noopener noreferrer" : "";

                const imgTag = `<img src="${String(img).replaceAll('"', '&quot;')}" alt="${title.replaceAll('"', '&quot;') || `banner ${id}`}">`;
                const inner = href
                    ? `<a class="hero-slide-link" href="${href.replaceAll('"', '&quot;')}" ${target ? `target="${target}"` : ""} ${rel ? `rel="${rel}"` : ""}>${imgTag}</a>`
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

async function initHomePopup() {
    const path = String(window.location.pathname || "").replace(/\/+$/, "");
    if (!path.endsWith("/site/home.html")) return;
    if (!window.PopupAPI || typeof window.PopupAPI.listPublic !== "function") return;

    try {
        const res = await window.PopupAPI.listPublic({ limit: 50 });
        const items = Array.isArray(res?.data?.items) ? res.data.items.filter((it) => it && it.image_path) : [];
        if (!items.length) return;

        const existing = document.getElementById("site-popup-overlay");
        if (existing) existing.remove();

        const escapeAttr = (value) => String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
        const normalizeHref = (value) => {
            const raw = String(value || "").trim();
            if (!raw) return "";
            if (/^(javascript|data):/i.test(raw)) return "";
            return raw;
        };

        const overlay = document.createElement("div");
        overlay.id = "site-popup-overlay";
        overlay.className = "site-popup-overlay";

        const slides = items.map((item, index) => {
            const title = String(item.title || "popup");
            const url = normalizeHref(item.url_link);
            const img = window.PopupAPI.toPublicUrl(item.image_path);
            const hrefAttrs = url
                ? `href="${escapeAttr(url)}" ${/^https?:\/\//i.test(url) ? 'target="_blank" rel="noopener noreferrer"' : ""}`
                : "";
            const media = url
                ? `<a class="site-popup-media-link" ${hrefAttrs}><img class="site-popup-image" src="${escapeAttr(img)}" alt="${escapeAttr(title)}"></a>`
                : `<img class="site-popup-image" src="${escapeAttr(img)}" alt="${escapeAttr(title)}">`;

            return `<div class="site-popup-slide${index === 0 ? " is-active" : ""}" data-popup-slide="${index}">${media}</div>`;
        }).join("");

        const dots = items.length > 1
            ? `<div class="site-popup-dots">${items.map((_, i) => `<button class="site-popup-dot${i === 0 ? " is-active" : ""}" type="button" data-popup-dot="${i}" aria-label="Popup ${i + 1}"></button>`).join("")}</div>`
            : "";

        const controls = items.length > 1
            ? `
                <button class="site-popup-arrow site-popup-arrow-left" type="button" data-popup-prev="1" aria-label="Previous">‹</button>
                <button class="site-popup-arrow site-popup-arrow-right" type="button" data-popup-next="1" aria-label="Next">›</button>
              `
            : "";

        overlay.innerHTML = `
            <div class="site-popup-backdrop" data-popup-close="1"></div>
            <div class="site-popup-dialog" role="dialog" aria-modal="true" aria-label="Popup">
                <button class="site-popup-close" type="button" aria-label="Close" data-popup-close="1">×</button>
                <div class="site-popup-track">
                    ${slides}
                </div>
                ${controls}
                ${dots}
            </div>
        `;

        let current = 0;
        const showSlide = (next) => {
            const total = items.length;
            if (total <= 0) return;
            current = (next + total) % total;
            overlay.querySelectorAll(".site-popup-slide").forEach((el, i) => {
                el.classList.toggle("is-active", i === current);
            });
            overlay.querySelectorAll(".site-popup-dot").forEach((el, i) => {
                el.classList.toggle("is-active", i === current);
            });
        };

        const close = () => {
            overlay.classList.remove("is-open");
            setTimeout(() => overlay.remove(), 160);
            document.body.style.overflow = "";
        };

        overlay.addEventListener("click", (e) => {
            if (e.target?.getAttribute?.("data-popup-close") === "1") close();
            if (e.target?.getAttribute?.("data-popup-prev") === "1") showSlide(current - 1);
            if (e.target?.getAttribute?.("data-popup-next") === "1") showSlide(current + 1);
            const dot = e.target?.closest?.("[data-popup-dot]");
            if (dot) showSlide(Number(dot.getAttribute("data-popup-dot") || 0));
        });

        document.addEventListener("keydown", function onPopupKey(e) {
            if (!document.getElementById("site-popup-overlay")) {
                document.removeEventListener("keydown", onPopupKey);
                return;
            }
            if (e.key === "Escape") {
                document.removeEventListener("keydown", onPopupKey);
                close();
            }
            if (e.key === "ArrowLeft") showSlide(current - 1);
            if (e.key === "ArrowRight") showSlide(current + 1);
        });

        document.body.appendChild(overlay);
        document.body.style.overflow = "hidden";
        requestAnimationFrame(() => overlay.classList.add("is-open"));
    } catch (err) {
        console.warn("[popup] failed to load:", err);
    }
}

// NEWS SLIDER
function initNewsSlider() {
    const track = document.querySelector(".news-cards");
    const cards = track ? track.querySelectorAll(".news-card") : [];
    const btnLeft = document.querySelector(".news-arrow-left");
    const btnRight = document.querySelector(".news-arrow-right");
    const dotsWrap = document.querySelector(".news-dots");

    if (!track || cards.length === 0) return;

    // Responsive: คำนวณจำนวนการ์ดต่อหน้าอิงจากความกว้างจริง
    let perPage = 3;
    let totalPages = 1;
    let currentPage = 0;
    let dots = [];

    // หาค่า gap จาก CSS (news-cards { gap: 24px; })
    function getGap() {
        const style = getComputedStyle(track);
        const g = parseFloat(style.columnGap || style.gap || "0");
        return isNaN(g) ? 0 : g;
    }

    function computePerPage() {
        if (!cards[0]) return 1;
        const gap = getGap();
        const trackW = track.getBoundingClientRect().width;
        const cardW = cards[0].getBoundingClientRect().width;
        if (!trackW || !cardW) return 1;

        // จำนวนการ์ดที่น่าจะมองเห็นได้ใน 1 หน้า (เผื่อ gap)
        const n = Math.floor((trackW + gap) / (cardW + gap));
        return Math.max(1, Math.min(n, cards.length));
    }

    function buildDots(tp) {
        const total = Math.max(1, Number(tp || 1));
        if (!dotsWrap) {
            dots = Array.from(document.querySelectorAll(".news-dot"));
            return;
        }

        dotsWrap.innerHTML = "";
        for (let i = 0; i < total; i++) {
            const dot = document.createElement("span");
            dot.className = `news-dot${i === 0 ? " active" : ""}`;
            dot.dataset.index = String(i);
            dot.addEventListener("click", () => goTo(i));
            dotsWrap.appendChild(dot);
        }
        dots = Array.from(dotsWrap.querySelectorAll(".news-dot"));
    }

    // คำนวณระยะเลื่อนต่อหน้า = กว้างการ์ด 3 ใบ + gap 2 ช่อง
    function getStep() {
        if (!cards[0]) return 0;
        const cardWidth = cards[0].getBoundingClientRect().width;
        const gap = getGap();
        return perPage * cardWidth + (perPage - 1) * gap + gap;
    }

    function recalc() {
        const oldPerPage = perPage;
        const oldItemIndex = currentPage * oldPerPage;

        perPage = computePerPage();
        totalPages = Math.ceil(cards.length / perPage) || 1;

        currentPage = Math.max(0, Math.min(Math.floor(oldItemIndex / perPage), totalPages - 1));
        buildDots(totalPages);
        goTo(currentPage);
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

    // เวลา resize ให้คงหน้าปัจจุบันแต่คำนวณ step ใหม่
    window.addEventListener("resize", () => {
        recalc();
    });

    // init
    recalc();
}

// load news
function initHomeNews() {
    const container = document.querySelector(".news-cards");
    if (!container) return;   // ถ้าไม่ใช่หน้า home (ไม่มี .news-cards) ก็ไม่ต้องทำอะไร

    const HOME_NEWS_LIMIT = 15;

    function escapeHtml(str) {
        if (str == null) return "";
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function formatThaiDate(mysqlDateTime) {
        const s = String(mysqlDateTime || "").trim();
        if (!s) return "-";
        const dt = new Date(s.replace(" ", "T"));
        if (isNaN(dt.getTime())) return s;

        try {
            return new Intl.DateTimeFormat("th-TH", {
                year: "numeric",
                month: "short",
                day: "numeric",
            }).format(dt);
        } catch {
            const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
            const d = dt.getDate();
            const m = months[dt.getMonth()] || "";
            const y = dt.getFullYear() + 543;
            return `${d} ${m} ${y}`;
        }
    }

    function joinUrl(base, path) {
        const b = String(base || "").replace(/\/$/, "");
        const p = String(path || "");
        if (!p) return b;
        if (p.startsWith("/")) return `${b}${p}`;
        return `${b}/${p}`;
    }

    const API_BASE = window.API_BASE_URL || window.__API_BASE__ || (window.__APP_CONFIG__ && window.__APP_CONFIG__.API_BASE) || "/ict8/backend/public";

    fetch(joinUrl(API_BASE, `/news?limit=${HOME_NEWS_LIMIT}`), {
        headers: { "Accept": "application/json" },
    })
        .then(async (res) => {
            const json = await res.json().catch(() => ({}));
            if (!res.ok || json?.ok === false) {
                throw new Error(json?.message || `HTTP ${res.status}`);
            }
            return json;
        })
        .then((json) => {
            const rows = Array.isArray(json?.data) ? json.data : [];

            // safety: sort newest first (in case backend order changes)
            const latestNews = [...rows]
                .sort((a, b) => {
                    const ad = String(a?.create_at || "");
                    const bd = String(b?.create_at || "");
                    if (ad !== bd) return bd.localeCompare(ad);
                    return Number(b?.news_id || 0) - Number(a?.news_id || 0);
                })
                .slice(0, HOME_NEWS_LIMIT);

            container.innerHTML = latestNews
                .map((row) => {
                    const id = row?.news_id ?? row?.id;
                    const title = String(row?.title || "");
                    const date = formatThaiDate(row?.create_at || row?.update_at || "");

                    return `
                        <a href="/ict8/site/news-detail.html?id=${encodeURIComponent(String(id ?? ""))}" target="_blank" rel="noopener noreferrer" class="news-card" >
                            <h3 class="news-card-title">${escapeHtml(title)}</h3>
                            <div class="news-card-date">${escapeHtml(date)}</div>
                            <p class="news-card-link">รายละเอียดเพิ่มเติม ➜</p>
                        </a>
                    `;
                })
                .join("");

            initNewsSlider();
        })
        .catch((err) => {
            console.error("โหลดข่าวสำหรับหน้าแรกไม่สำเร็จ", err);
        });
}

// load activity 
function initHomeActivities() {
    const slidesContainer = document.querySelector(".activities-slides");
    const dotsContainer = document.querySelector(".activity-dots");
    if (!slidesContainer || !dotsContainer) return;  // ถ้าไม่ได้อยู่หน้า home ก็ไม่ทำอะไร

    const HOME_ACT_LIMIT = 15;

    function escapeHtml(str) {
        if (str == null) return "";
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function joinUrl(base, path) {
        const b = String(base || "").replace(/\/$/, "");
        const p = String(path || "");
        if (!p) return b;
        if (p.startsWith("/")) return `${b}${p}`;
        return `${b}/${p}`;
    }

    const API_BASE = window.API_BASE_URL || window.__API_BASE__ || (window.__APP_CONFIG__ && window.__APP_CONFIG__.API_BASE) || "/ict8/backend/public";

    function buildFileUrl(filepath) {
        const fp = String(filepath || "").trim();
        if (!fp) return "";

        // DB usually stores: "uploads/..." or "/uploads/..." => under backend/public
        if (fp.startsWith("/uploads/")) return joinUrl(API_BASE, fp);
        if (fp.startsWith("uploads/")) return joinUrl(API_BASE, `/${fp}`);
        if (fp.startsWith("./uploads/")) return joinUrl(API_BASE, `/${fp.replace(/^\.\//, "")}`);

        // Already absolute
        if (fp.startsWith("/")) return fp;
        return joinUrl(API_BASE, `/${fp}`);
    }

    function formatThaiDate(mysqlDt) {
        const s = String(mysqlDt || "").trim();
        if (!s) return "-";

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

    function getExcerpt(item, maxLength = 90) {
        const raw = String(item?.content || "").replace(/<[^>]*>/g, " ");
        const text = raw.replace(/\s+/g, " ").trim() || String(item?.title || "").trim();
        if (!text) return "-";
        return text.length > maxLength ? `${text.slice(0, maxLength).trim()}...` : text;
    }

    function getDateText(item) {
        const dt = item?.end_datetime || item?.start_datetime || item?.update_at || item?.create_at;
        return formatThaiDate(dt);
    }

    const qs = new URLSearchParams();
    qs.set("page", "1");
    qs.set("limit", String(HOME_ACT_LIMIT));

    fetch(joinUrl(API_BASE, `/activities?${qs.toString()}`), {
        headers: { "Accept": "application/json" },
    })
        .then(async (res) => {
            const json = await res.json().catch(() => ({}));
            if (!res.ok || json?.ok === false) {
                throw new Error(json?.message || `HTTP ${res.status}`);
            }
            return json;
        })
        .then((json) => {
            const latest = Array.isArray(json?.data?.items) ? json.data.items : [];

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

                const mainImg = buildFileUrl(main?.cover_filepath) || "/ict8/assets/image/activities/01.png";

                const mainId = Number(main?.activity_id || 0);
                const detailHref = `/ict8/site/activity-detail.html?id=${encodeURIComponent(String(mainId || ""))}`;

                // สร้าง HTML ฝั่งขวา (side)
                let sideHtml = "";

                function renderSide(item) {
                    if (!item) return "";
                    const img = buildFileUrl(item?.cover_filepath) || "/ict8/assets/image/activities/01.png";
                    const id = Number(item?.activity_id || 0);
                    const title = String(item?.title || "").trim();
                    const excerpt = getExcerpt(item, 70);
                    const dateText = getDateText(item);
                    return `
                        <a href="/ict8/site/activity-detail.html?id=${encodeURIComponent(String(id || ""))}" target="_blank" rel="noopener noreferrer"
                           class="activity-side-item card-link">
                            <img src="${escapeHtml(img)}" alt="${escapeHtml(title)}" class="activity-side-img" loading="lazy">
                            <div class="activity-side-content">
                                <h3 class="activity-side-title">
                                    ${escapeHtml(title)}
                                </h3>
                                <p class="activity-side-excerpt">${escapeHtml(excerpt)}</p>
                                <div class="activity-side-date">${escapeHtml(dateText)}</div>
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
                            <img src="${escapeHtml(mainImg)}" alt="${escapeHtml(String(main?.title || ""))}" class="activity-main-img" loading="lazy">
                            <div class="activity-main-overlay">
                                <h3 class="activity-main-title">
                                    ${escapeHtml(String(main?.title || "").trim())}
                                </h3>
                                <p class="activity-main-excerpt">${escapeHtml(getExcerpt(main, 120))}</p>
                                <div class="activity-main-date">${escapeHtml(getDateText(main))}</div>
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
    await initHomePopup();
    initHomeNews();
    initHomeActivities();
    initProfileDropdown();
    initActivelink();
});
