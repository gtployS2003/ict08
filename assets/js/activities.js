document.addEventListener("DOMContentLoaded", () => {
    const PAGE_SIZE = 12;
    const listEl = document.getElementById("activities-list");
    const paginationEl = document.getElementById("activities-pagination");
    const searchInput = document.getElementById("activity-search");
    const clearBtn = document.querySelector(".activities-search-clear");
    const chipButtons = document.querySelectorAll(".activity-chip");

    let allActivities = [];
    let selectedCategories = new Set(["all"]);
    let searchTerm = "";
    let currentPage = 1;
    let filterStart = null;
    let filterEnd = null;
    let filterProvinces = new Set();
    let filterSort = "desc";

    const params = new URLSearchParams(window.location.search);
    const initialCategory = params.get("category");

    if (initialCategory && initialCategory !== "all") {
        selectedCategories = new Set([initialCategory]);

        chipButtons.forEach((btn) => {
            const cat = btn.dataset.category;
            if (cat === initialCategory) {
                btn.classList.add("active");
            } else if (cat === "all") {
                btn.classList.remove("active");
            } else {
                btn.classList.remove("active");
            }
        });
    } else {
        selectedCategories = new Set(["all"]);
        chipButtons.forEach((btn) => {
            if (btn.dataset.category === "all") {
                btn.classList.add("active");
            } else {
                btn.classList.remove("active");
            }
        });
    }

    fetch("/assets/js/data-ex/activity.json")
        .then((res) => res.json())
        .then((data) => {
            allActivities = data;
            render();
        })
        .catch((err) => console.error("load activity.json error:", err));

    function parseThaiDate(str) {
        if (!str || typeof str !== "string") return null;

        const parts = str.trim().split(/\s+/);
        if (parts.length < 3) return null;

        const day = parseInt(parts[0], 10);
        const yearBE = parseInt(parts[2], 10); // ปี พ.ศ.

        if (isNaN(day) || isNaN(yearBE)) return null;

        // เอาชื่อเดือนไทยแบบย่อออกจากจุดทั้งหมด เช่น "พ.ย." -> "พย"
        const monthKey = parts[1].replace(/\./g, "");

        const monthMap = {
            "มค": 0,
            "กพ": 1,
            "มีค": 2,
            "เมย": 3,
            "พค": 4,
            "มิย": 5,
            "กค": 6,
            "สค": 7,
            "กย": 8,
            "ตค": 9,
            "พย": 10,
            "ธค": 11
        };

        const m = monthMap[monthKey];
        if (m === undefined) return null;

        const yearAD = yearBE - 543; // แปลง พ.ศ. -> ค.ศ.

        return new Date(yearAD, m, day);
    }

    function applyFilter() {
        return allActivities
            .filter(item => {
                const useAll =
                    selectedCategories.size === 0 || selectedCategories.has("all");

                const matchCategory = useAll || selectedCategories.has(item.category);

                const q = searchTerm.trim().toLowerCase();
                const matchSearch =
                    !q ||
                    item.title.toLowerCase().includes(q) ||
                    (item.content && item.content.toLowerCase().includes(q)) ||
                    (item.province && item.province.toLowerCase().includes(q)) ||
                    (item.date && item.date.toLowerCase().includes(q));

                // province filter
                const matchProvince =
                    filterProvinces.size === 0 || filterProvinces.has(item.province);
                const itemDate = parseThaiDate(item.date);
                let matchDate = true;
                if (filterStart && itemDate && itemDate < filterStart) matchDate = false;
                if (filterEnd && itemDate && itemDate > filterEnd) matchDate = false;
                return matchCategory && matchSearch && matchProvince && matchDate;
            })
            .sort((a, b) => {
                const da = parseThaiDate(a.date);
                const db = parseThaiDate(b.date);
                if (!da || !db) return 0;

                return filterSort === "desc" ? db - da : da - db;
            });

    }

    function render() {
        const filtered = applyFilter();
        const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
        if (currentPage > totalPages) currentPage = totalPages;
        const start = (currentPage - 1) * PAGE_SIZE;
        const pageItems = filtered.slice(start, start + PAGE_SIZE);
        renderList(pageItems);
        renderPagination(totalPages);
    }

    function renderList(items) {
        listEl.innerHTML = "";

        if (!items.length) {
            listEl.innerHTML = `<p style="text-align:center;">ไม่พบกิจกรรม</p>`;
            return;
        }

        const html = items
            .map((item) => {
                const imgSrc =
                    item.images && item.images.length > 0
                        ? item.images[0]
                        : "/assets/image/activities/01.png";

                return `
        <a href="activity-detail.html?id=${item.id}" target="_blank" rel="noopener noreferrer" class="activity-card">
          <div class="activity-card-image">
            <img src="${imgSrc}" alt="${item.title}">
          </div>
          <div class="activity-card-body">
            <h3 class="activity-card-title">${item.title}</h3>
            <span class="activity-card-category">${item.category}</span>
            <div class="activity-card-meta">
              ${item.province ? item.province + " · " : ""}${item.date}
            </div>
          </div>
        </a>`;
            })
            .join("");

        listEl.innerHTML = html;
    }

    function renderPagination(totalPages) {
        if (!paginationEl) return;

        if (totalPages <= 1) {
            paginationEl.innerHTML = '';
            return;
        }

        let html = '';

        // ปุ่ม previous
        html += `<button class="activities-page-btn activities-page-prev" ${currentPage === 1 ? 'disabled' : ''
            }>&larr;</button>`;

        const items = [];
        const first = 1;
        const last = totalPages;

        if (totalPages <= 5) {
            // แสดงทุกหน้าเลย
            for (let i = 1; i <= totalPages; i++) {
                items.push({ type: 'page', page: i });
            }
        } else {
            if (currentPage <= 3) {
                // 1 2 3 4 ... last
                items.push({ type: 'page', page: 1 });
                items.push({ type: 'page', page: 2 });
                items.push({ type: 'page', page: 3 });
                items.push({ type: 'page', page: 4 });
                items.push({ type: 'dots' });
                items.push({ type: 'page', page: last });
            } else if (currentPage >= totalPages - 2) {
                // first ... last-3 last-2 last-1 last
                items.push({ type: 'page', page: first });
                items.push({ type: 'dots' });
                items.push({ type: 'page', page: last - 3 });
                items.push({ type: 'page', page: last - 2 });
                items.push({ type: 'page', page: last - 1 });
                items.push({ type: 'page', page: last });
            } else {
                items.push({ type: 'page', page: first });
                items.push({ type: 'dots' });
                items.push({ type: 'page', page: currentPage - 1 });
                items.push({ type: 'page', page: currentPage });
                items.push({ type: 'page', page: currentPage + 1 });
                items.push({ type: 'dots' });
                items.push({ type: 'page', page: last });
            }
        }

        items.forEach((item) => {
            if (item.type === 'dots') {
                html += `<span class="activities-page-dots">...</span>`;
            } else {
                const i = item.page;
                html += `<button class="activities-page-number ${i === currentPage ? 'active' : ''
                    }" data-page="${i}">${i}</button>`;
            }
        });

        html += `<button class="activities-page-btn activities-page-next" ${currentPage === totalPages ? 'disabled' : ''
            }>&rarr;</button>`;

        paginationEl.innerHTML = html;

        paginationEl.querySelectorAll('.activities-page-number').forEach((btn) => {
            btn.addEventListener('click', () => {
                const page = Number(btn.dataset.page);
                if (page === currentPage) return;
                currentPage = page;
                render();
                scrollToTop();
            });
        });

        const prevBtn = paginationEl.querySelector('.activities-page-prev');
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                if (currentPage > 1) {
                    currentPage -= 1;
                    render();
                    scrollToTop();
                }
            });
        }

        const nextBtn = paginationEl.querySelector('.activities-page-next');
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                if (currentPage < totalPages) {
                    currentPage += 1;
                    render();
                    scrollToTop();
                }
            });
        }
    }

    function scrollToTop() {
        const section = document.querySelector('.activities-page');
        if (section) {
            section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    chipButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
            const cat = btn.dataset.category;

            if (cat === "all") {
                selectedCategories = new Set(["all"]);
                chipButtons.forEach((b) => b.classList.remove("active"));
                btn.classList.add("active");
            } else {
                if (selectedCategories.has(cat)) {
                    selectedCategories.delete(cat);
                    btn.classList.remove("active");
                } else {
                    selectedCategories.add(cat);
                    btn.classList.add("active");
                }

                const allBtn = document.querySelector('.activity-chip[data-category="all"]');
                if (selectedCategories.size > 0) {
                    selectedCategories.delete("all");
                    if (allBtn) allBtn.classList.remove("active");
                }

                if (selectedCategories.size === 0) {
                    selectedCategories.add("all");
                    if (allBtn) allBtn.classList.add("active");
                }
            }

            currentPage = 1;
            render();
        });
    });

    if (searchInput) {
        searchInput.addEventListener("input", () => {
            searchTerm = searchInput.value;
            currentPage = 1;
            render();
            scrollToTop();
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener("click", () => {
            searchInput.value = "";
            searchTerm = "";
            currentPage = 1;
            render();
        });
    }

    document.querySelector(".activities-filter-icon").addEventListener("click", () => {
        document.querySelector(".activities-filter-popup-overlay").classList.add("open");
    });

    document.querySelector(".activities-filter-popup-overlay").addEventListener("click", (e) => {
        if (e.target.classList.contains("activities-filter-popup-overlay")) {
            e.target.classList.remove("open");
        }
    });

    document.querySelector(".activity-filter-clear").addEventListener("click", () => {
        document.getElementById("activity-filter-start").value = "";
        document.getElementById("activity-filter-end").value = "";

        filterStart = null;
        filterEnd = null;

        filterProvinces.clear();
        document.querySelectorAll(".filter-province").forEach(cb => cb.checked = false);
        document.getElementById("province-all").checked = true;

        filterSort = "desc";
        document.querySelector('input[name="activityDateOrder"][value="desc"]').checked = true;

        currentPage = 1;
        render();
    });

    document.querySelector(".activity-filter-apply").addEventListener("click", () => {
        const start = document.getElementById("activity-filter-start").value;
        filterStart = start ? new Date(start) : null;

        const end = document.getElementById("activity-filter-end").value;
        filterEnd = end ? new Date(end) : null;

        filterProvinces.clear();
        document.querySelectorAll(".filter-province:checked").forEach(cb => {
            filterProvinces.add(cb.value);
        });

        if (document.getElementById("province-all").checked) {
            filterProvinces.clear();
        }

        filterSort = document.querySelector('input[name="activityDateOrder"]:checked').value;
        document.querySelector(".activities-filter-popup-overlay").classList.remove("open");
        currentPage = 1;
        render();
    });

        // ===== Logic จังหวัดลูกข่าย กับ "ทั้งหมด" =====
    const provinceAllCb = document.getElementById("province-all");
    const provinceCbs = document.querySelectorAll(".filter-province");

    if (provinceAllCb) {
        // ถ้าเลือก "ทั้งหมด" -> ยกเลิกทุกจังหวัด
        provinceAllCb.addEventListener("change", () => {
            if (provinceAllCb.checked) {
                provinceCbs.forEach(cb => {
                    cb.checked = false;
                });
            }
        });
    }

    provinceCbs.forEach(cb => {
        cb.addEventListener("change", () => {
            if (cb.checked) {
                // ถ้ามีการเลือกจังหวัดใดจังหวัดหนึ่ง -> เอา "ทั้งหมด" ออก
                if (provinceAllCb) provinceAllCb.checked = false;
            } else {
                // ถ้าไม่มีจังหวัดไหนถูกเลือกเลย -> ติ๊ก "ทั้งหมด" กลับ
                const anyChecked = Array.from(provinceCbs).some(p => p.checked);
                if (!anyChecked && provinceAllCb) {
                    provinceAllCb.checked = true;
                }
            }
        });
    });

});




