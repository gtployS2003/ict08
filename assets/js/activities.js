// assets/js/activities.js
// Public activities page: list published activities from DB via /activities API

document.addEventListener("DOMContentLoaded", () => {
    const PAGE_SIZE = 12;

    const listEl = document.getElementById("activities-list");
    const paginationEl = document.getElementById("activities-pagination");
    const searchInput = document.getElementById("activity-search");
    const clearBtn = document.querySelector(".activities-search-clear");

    if (!listEl) return;

    const state = {
        q: "",
        page: 1,
        totalPages: 1,
        loading: false,
        debounceTimer: null,
    };

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

        // DB usually stores: "uploads/..." or "/uploads/..."
        // Physical location: backend/public/uploads/...
        if (fp.startsWith("/uploads/")) {
            return `/ict8/backend/public${fp}`;
        }
        if (fp.startsWith("uploads/")) {
            return `/ict8/backend/public/${fp}`;
        }

        // Already absolute (e.g., /ict8/backend/public/uploads/...)
        if (fp.startsWith("/")) return fp;
        return `/ict8/backend/public/${fp}`;
    }

    function formatThaiDate(mysqlDt) {
        const s = String(mysqlDt || "").trim();
        if (!s) return "";

        // MySQL DATETIME: "YYYY-MM-DD HH:MM:SS"
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

    function getMeta(item) {
        const prov = String(item?.province_name || "").trim();
        const dt = item?.end_datetime || item?.start_datetime || item?.update_at || item?.create_at;
        const dateText = formatThaiDate(dt);
        return [prov, dateText].filter((x) => String(x || "").trim() !== "").join(" · ") || "-";
    }

    function getCategory(item) {
        const sub = String(item?.request_sub_type_name || "").trim();
        if (sub) return sub;
        const t = String(item?.request_type_name || "").trim();
        return t || "-";
    }

    function setLoading(isLoading) {
        state.loading = Boolean(isLoading);
        listEl.setAttribute("aria-busy", state.loading ? "true" : "false");
    }

    function renderList(items) {
        const rows = Array.isArray(items) ? items : [];
        if (rows.length === 0) {
            listEl.innerHTML = `<p style="text-align:center;">ไม่พบกิจกรรม</p>`;
            return;
        }

        listEl.innerHTML = rows
            .map((item) => {
                const id = Number(item?.activity_id || 0);
                const title = String(item?.title || "").trim() || "(ไม่ระบุชื่อกิจกรรม)";
                const category = getCategory(item);
                const meta = getMeta(item);
                const cover = buildFileUrl(item?.cover_filepath) || "/ict8/assets/image/activities/01.png";

                return `
                    <a href="activity-detail.html?id=${encodeURIComponent(String(id))}" target="_blank" rel="noopener noreferrer" class="activity-card">
                        <div class="activity-card-image">
                            <img src="${escapeHtml(cover)}" alt="${escapeHtml(title)}" loading="lazy">
                        </div>
                        <div class="activity-card-body">
                            <h3 class="activity-card-title">${escapeHtml(title)}</h3>
                            <span class="activity-card-category">${escapeHtml(category)}</span>
                            <div class="activity-card-meta">${escapeHtml(meta)}</div>
                        </div>
                    </a>
                `;
            })
            .join("");
    }

    function scrollToTop() {
        const section = document.querySelector(".activities-page");
        if (section) section.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    function updateUrl() {
        const u = new URL(window.location.href);
        if (state.q) u.searchParams.set("q", state.q);
        else u.searchParams.delete("q");

        if (state.page > 1) u.searchParams.set("page", String(state.page));
        else u.searchParams.delete("page");

        // remove legacy params from older UI
        u.searchParams.delete("category");
        window.history.replaceState({}, "", u.toString());
    }

    function renderPagination(totalPages) {
        if (!paginationEl) return;

        const tp = Math.max(1, Number(totalPages || 1));
        state.totalPages = tp;

        if (tp <= 1) {
            paginationEl.innerHTML = "";
            return;
        }

        let html = "";
        html += `<button class="activities-page-btn activities-page-prev" ${state.page === 1 ? "disabled" : ""}>&larr;</button>`;

        const items = [];
        const first = 1;
        const last = tp;

        if (tp <= 5) {
            for (let i = 1; i <= tp; i++) items.push({ type: "page", page: i });
        } else {
            if (state.page <= 3) {
                items.push({ type: "page", page: 1 });
                items.push({ type: "page", page: 2 });
                items.push({ type: "page", page: 3 });
                items.push({ type: "page", page: 4 });
                items.push({ type: "dots" });
                items.push({ type: "page", page: last });
            } else if (state.page >= tp - 2) {
                items.push({ type: "page", page: first });
                items.push({ type: "dots" });
                items.push({ type: "page", page: last - 3 });
                items.push({ type: "page", page: last - 2 });
                items.push({ type: "page", page: last - 1 });
                items.push({ type: "page", page: last });
            } else {
                items.push({ type: "page", page: first });
                items.push({ type: "dots" });
                items.push({ type: "page", page: state.page - 1 });
                items.push({ type: "page", page: state.page });
                items.push({ type: "page", page: state.page + 1 });
                items.push({ type: "dots" });
                items.push({ type: "page", page: last });
            }
        }

        items.forEach((it) => {
            if (it.type === "dots") {
                html += `<span class="activities-page-dots">...</span>`;
            } else {
                const i = it.page;
                html += `<button class="activities-page-number ${i === state.page ? "active" : ""}" data-page="${i}">${i}</button>`;
            }
        });

        html += `<button class="activities-page-btn activities-page-next" ${state.page === tp ? "disabled" : ""}>&rarr;</button>`;

        paginationEl.innerHTML = html;

        paginationEl.querySelectorAll(".activities-page-number").forEach((btn) => {
            btn.addEventListener("click", () => {
                const p = Number(btn.dataset.page);
                if (!Number.isFinite(p) || p <= 0 || p === state.page) return;
                state.page = p;
                updateUrl();
                load().catch(console.error);
                scrollToTop();
            });
        });

        paginationEl.querySelector(".activities-page-prev")?.addEventListener("click", () => {
            if (state.page <= 1) return;
            state.page -= 1;
            updateUrl();
            load().catch(console.error);
            scrollToTop();
        });

        paginationEl.querySelector(".activities-page-next")?.addEventListener("click", () => {
            if (state.page >= tp) return;
            state.page += 1;
            updateUrl();
            load().catch(console.error);
            scrollToTop();
        });
    }

    async function api(path, { method = "GET", body } = {}) {
        if (typeof window.apiFetch === "function") {
            return window.apiFetch(path, { method, body, skipAuth: true });
        }
        // Fallback (should be rare): raw fetch against backend/public
        const base = window.API_BASE_URL || "/ict8/backend/public";
        const res = await fetch(`${base}${path}`);
        const json = await res.json();
        if (!res.ok || json?.ok === false) throw new Error(json?.message || `Request failed (${res.status})`);
        return json;
    }

    async function load() {
        if (state.loading) return;
        setLoading(true);

        try {
            listEl.innerHTML = `<p style="text-align:center;">กำลังโหลด...</p>`;
            if (paginationEl) paginationEl.innerHTML = "";

            const qs = new URLSearchParams();
            qs.set("page", String(state.page));
            qs.set("limit", String(PAGE_SIZE));
            if (state.q) qs.set("q", state.q);

            const json = await api(`/activities?${qs.toString()}`, { method: "GET" });
            const items = Array.isArray(json?.data?.items) ? json.data.items : [];
            const pag = json?.data?.pagination || {};
            const tp = Number(pag?.totalPages || 1) || 1;

            renderList(items);
            renderPagination(tp);
        } catch (err) {
            console.error(err);
            listEl.innerHTML = `<p style="text-align:center;">โหลดข้อมูลไม่สำเร็จ</p>`;
            if (paginationEl) paginationEl.innerHTML = "";
        } finally {
            setLoading(false);
        }
    }

    // init from URL
    try {
        const u = new URL(window.location.href);
        state.q = String(u.searchParams.get("q") || "").trim();
        const p = Number(u.searchParams.get("page") || 1);
        state.page = Number.isFinite(p) && p > 0 ? p : 1;
    } catch {
        // ignore
    }

    if (searchInput) {
        searchInput.value = state.q;
        searchInput.addEventListener("input", () => {
            const nextQ = String(searchInput.value || "").trim();
            if (state.debounceTimer) window.clearTimeout(state.debounceTimer);
            state.debounceTimer = window.setTimeout(() => {
                state.q = nextQ;
                state.page = 1;
                updateUrl();
                load().catch(console.error);
                scrollToTop();
            }, 250);
        });
    }

    if (clearBtn && searchInput) {
        clearBtn.addEventListener("click", () => {
            searchInput.value = "";
            state.q = "";
            state.page = 1;
            updateUrl();
            load().catch(console.error);
            scrollToTop();
        });
    }

    updateUrl();
    load().catch(console.error);
});




