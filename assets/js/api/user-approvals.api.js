// assets/js/api/user-approvals.api.js
(() => {
    // base url: ใช้จาก config.js.php ก่อน ถ้าไม่มีค่อย fallback
    const API_BASE =
        window.API_BASE_URL ||
        window.__API_BASE__ ||
        "/ict/backend/public"; // fallback (ปรับได้)

    /**
     * ใช้ http.js ถ้ามี (แนะนำ) เพราะรวม token/headers แล้ว
     * แต่เผื่อบางหน้าจะยังไม่ได้ include http.js เราเลยทำ fallback ให้
     */
    async function apiFetchCompat(path, { method = "GET", body, headers = {} } = {}) {
        // ถ้ามี apiFetch จาก assets/js/api/http.js ให้ใช้ตัวนั้น
        if (typeof window.apiFetch === "function") {
            return window.apiFetch(path, { method, body, headers });
        }

        // fallback fetch ตรง ๆ
        const url = `${API_BASE}${path}`;
        const opts = { method, headers: { ...headers } };

        // แนบ token (ถ้ามี)
        const token =
            localStorage.getItem("access_token") ||
            sessionStorage.getItem("access_token") ||
            localStorage.getItem("auth_token") ||
            sessionStorage.getItem("auth_token") ||
            localStorage.getItem("token") ||
            sessionStorage.getItem("token");


        if (token) {
            opts.headers["Authorization"] = `Bearer ${token}`;
        }

        if (body !== undefined) {
            opts.headers["Content-Type"] = "application/json; charset=utf-8";
            opts.body = typeof body === "string" ? body : JSON.stringify(body);
        }

        const res = await fetch(url, opts);
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
            const msg = data?.message || data?.error || "Request failed";
            const err = new Error(msg);
            err.status = res.status;
            err.payload = data;
            throw err;
        }
        return data;
    }

    /**
     * GET /user-approvals/pending?q=&page=&limit=
     */
    async function getPendingApprovals({ q = "", page = 1, limit = 50 } = {}) {
        const qs = new URLSearchParams();
        if (q) qs.set("q", q);
        if (page) qs.set("page", String(page));
        if (limit) qs.set("limit", String(limit));

        const url = `/user-approvals/pending${qs.toString() ? `?${qs.toString()}` : ""}`;
        return apiFetchCompat(url, { method: "GET" });
    }

    /**
     * POST /user-approvals/approve
     * body: { user_id, role_id? }
     *
     * - role_id optional:
     *   - ไม่ส่ง role_id -> อนุมัติอย่างเดียว (set person.is_active=1)
     *   - ส่ง role_id -> เปลี่ยน user_role_id ก่อน แล้วอนุมัติ
     */
    async function approveUser({ user_id, role_id } = {}) {
        if (!user_id) throw new Error("user_id is required");

        const body = { user_id: Number(user_id) };
        if (role_id !== undefined && role_id !== null && role_id !== "") {
            body.role_id = Number(role_id);
        }

        return apiFetchCompat("/user-approvals/approve", {
            method: "POST",
            body,
        });
    }

    // expose
    window.UserApprovalsAPI = {
        getPendingApprovals,
        approveUser,
    };
})();
