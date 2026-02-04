// assets/js/api/users.api.js
// ✅ non-module: ใช้ global http helpers จาก window (ต้อง include http.js ก่อนไฟล์นี้)

(() => {
    function ensureHttp() {
        const httpGet = window.httpGet;
        const httpPost = window.httpPost;
        const httpPut = window.httpPut;
        const httpDelete = window.httpDelete;

        if (!httpGet || !httpPost || !httpPut || !httpDelete) {
            throw new Error(
                "http helpers not found. Make sure assets/js/api/http.js is included BEFORE users.api.js " +
                "and that it attaches httpGet/httpPost/httpPut/httpDelete to window."
            );
        }
        return { httpGet, httpPost, httpPut, httpDelete };
    }

    /**
     * GET /users
     * params: { q, organization_id, department_id, position_title_id, page, limit }
     */
    async function listUsers(params = {}) {
        const { httpGet } = ensureHttp();

        const qs = new URLSearchParams();

        if (params.q) qs.set("q", params.q);

        if (params.organization_id) qs.set("organization_id", String(params.organization_id));
        if (params.department_id) qs.set("department_id", String(params.department_id));
        if (params.position_title_id) qs.set("position_title_id", String(params.position_title_id));

        if (params.page) qs.set("page", String(params.page));
        if (params.limit) qs.set("limit", String(params.limit));

        const query = qs.toString();
        const url = query ? `/users?${query}` : `/users`;
        return httpGet(url);
    }

    /**
     * GET /users/{person_id}
     */
    async function getUser(personId) {
        const { httpGet } = ensureHttp();
        return httpGet(`/users/${encodeURIComponent(personId)}`);
    }

    /**
     * POST /users
     */
    async function createUser(payload) {
        const { httpPost } = ensureHttp();
        return httpPost(`/users`, payload);
    }

    /**
     * PUT /users/{person_id}
     */
    async function updateUser(personId, payload) {
        const { httpPut } = ensureHttp();
        return httpPut(`/users/${encodeURIComponent(personId)}`, payload);
    }

    /**
     * DELETE /users/{person_id}
     */
    async function deleteUser(personId) {
        const { httpDelete } = ensureHttp();
        return httpDelete(`/users/${encodeURIComponent(personId)}`);
    }

    /**
   * PUT /users/{person_id} (multipart/form-data)
   * - ใช้ตอนอัปโหลดรูปโปรไฟล์
   * - body เป็น FormData
   */
    async function updateUserFormData(personId, formData) {
        const base = (window.API_BASE_URL || "").replace(/\/$/, "");
        const url = `${base}/users/${encodeURIComponent(personId)}`;

        // ✅ method override ให้เข้า route POST /users/{id} แล้วเรียก update()
        if (!formData.has("_method")) formData.append("_method", "PUT");

        const res = await fetch(url, {
            method: "POST",     // ✅ เปลี่ยนจาก PUT -> POST
            body: formData,
            credentials: "include",
        });

        const text = await res.text();
        let json = null;
        try { json = text ? JSON.parse(text) : null; } catch (_) { }

        if (!res.ok) {
            const msg = (json && (json.message || json.error)) || text || `HTTP ${res.status}`;
            throw new Error(msg);
        }

        return json;
    }


    // ✅ expose to global
    window.UsersAPI = {
        listUsers,
        getUser,
        createUser,
        updateUser,
        updateUserFormData,
        deleteUser,
        // เผื่อคุณเรียกชื่อ remove ใน gcms-settings-data.js
        remove: deleteUser,
    };

    console.log("[UsersAPI] ready");
})();
