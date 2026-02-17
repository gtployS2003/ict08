// assets/js/api/user-roles.api.js
// CRUD สำหรับ user_roles
// ใช้ร่วมกับ assets/js/api/http.js

(() => {
    // พยายามรองรับรูปแบบ http.js ที่พบได้บ่อยในโปรเจกต์คุณ
    const http =
        window.http ||
        window.apiFetch ||
        window.httpFetch ||
        window.httpClient ||
        null;

    // base url: ใช้จาก config.js.php ก่อน ถ้าไม่มีค่อย fallback
    const API_BASE =
        window.API_BASE_URL ||
        window.__API_BASE__ ||
        "/ict8/backend/public";

    async function rawFetch(path, { method = "GET", body } = {}) {
        const url = `${API_BASE}${path}`;
        const opts = { method, headers: {} };

        if (body !== undefined) {
            opts.headers["Content-Type"] = "application/json; charset=utf-8";
            opts.body = JSON.stringify(body);
        }

        const res = await fetch(url, opts);
        const data = await res.json().catch(() => ({}));

        if (!res.ok || data?.success === false) {
            const msg =
                data?.message ||
                `Request failed: ${res.status} ${res.statusText}`;
            throw new Error(msg);
        }
        return data;
    }

    // ใช้ http.js ถ้ามี ไม่งั้น fallback เป็น fetch ตรง
    async function request(path, options = {}) {
        if (typeof http === "function") {
            // รองรับ 2 แบบที่มักเจอ:
            // 1) http(path, options)  (options: {method, body})
            // 2) http(url, options)   (url แบบเต็ม)
            try {
                return await http(path, options);
            } catch (e1) {
                return await http(`${API_BASE}${path}`, options);
            }
        }
        return rawFetch(path, options);
    }

    const UserRolesAPI = {
        // GET /user_roles?q=&page=&limit=
        // GET /user-roles?q=&page=&limit=
        async list({ q = "", page = 1, limit = 50 } = {}) {
            const params = new URLSearchParams();
            if (q !== undefined && q !== null && String(q).trim() !== "") {
                params.set("q", String(q).trim());
            }
            params.set("page", String(page));
            params.set("limit", String(limit));

            const res = await request(`/user-roles?${params.toString()}`, { method: "GET" });

            // รองรับทั้ง:
            // A) { success, data: { items, pagination } }
            // B) { items, pagination }
            // C) http.js unwrap มาแล้วเป็น data ตรงๆ
            const data = res?.data ?? res;

            const items = data?.items ?? data?.data?.items ?? [];
            const pagination = data?.pagination ?? data?.data?.pagination ?? {
                page,
                limit,
                total: Array.isArray(items) ? items.length : 0,
                total_pages: 1,
            };

            return { items, pagination };
        },


        // POST /user_roles
        async create({ code, role }) {
            const res = await request(`/user-roles`, {
                method: "POST",
                body: { code, role },
            });
            return res.data ?? res;
        },

        // PUT /user_roles/{id}
        async update(id, { code, role }) {
            const res = await request(`/user-roles/${id}`, {
                method: "PUT",
                body: { code, role },
            });
            return res.data ?? res;
        },

        // DELETE /user_roles/{id}
        async remove(id) {
            const res = await request(`/user-roles/${id}`, {
                method: "DELETE",
            });
            return res.data ?? res;
        },
    };

    // export ให้เรียกใช้ได้หลายแบบ
    window.UserRolesAPI = UserRolesAPI;
    window.userRolesApi = UserRolesAPI;
})();
