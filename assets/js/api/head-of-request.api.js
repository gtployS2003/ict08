// assets/js/api/head-of-request.api.js
// Endpoint: /head-of-request

(() => {
	const API_BASE =
		window.API_BASE_URL ||
		window.__API_BASE__ ||
		"/ict8/backend/public";

	async function apiFetch(path, { method = "GET", body, headers = {} } = {}) {
		const url = `${API_BASE}${path}`;
		const opts = { method, headers: { ...headers } };

		if (body !== undefined) {
			opts.headers["Content-Type"] = "application/json; charset=utf-8";
			opts.body = JSON.stringify(body);
		}

		const res = await fetch(url, opts);
		const text = await res.text();

		let json;
		try {
			json = JSON.parse(text);
		} catch {
			throw new Error(text || `Request failed (${res.status})`);
		}

		if (!res.ok || json?.error === true || json?.success === false || json?.ok === false) {
			const msg = json?.message || `Request failed (${res.status})`;
			const extra = json?.detail ? `: ${json.detail}` : "";
			throw new Error(msg + extra);
		}

		return json;
	}

	const HeadOfRequestAPI = {
		/**
		 * GET /head-of-request?q=&subtype_of=&page=&limit=
		 */
		async list({ q = "", subtype_of = 0, page = 1, limit = 50 } = {}) {
			const qs = new URLSearchParams();
			if (q) qs.set("q", String(q));
			if (subtype_of) qs.set("subtype_of", String(subtype_of));
			qs.set("page", String(page));
			qs.set("limit", String(limit));
			return apiFetch(`/head-of-request?${qs.toString()}`, { method: "GET" });
		},

		/**
		 * GET /head-of-request/eligible-users?q=&page=&limit=
		 */
		async eligibleUsers({ q = "", page = 1, limit = 50 } = {}) {
			const qs = new URLSearchParams();
			if (q) qs.set("q", String(q));
			qs.set("page", String(page));
			qs.set("limit", String(limit));
			return apiFetch(`/head-of-request/eligible-users?${qs.toString()}`, { method: "GET" });
		},

		/**
		 * POST /head-of-request
		 * body: { request_sub_type_id, staff_ids: number[] }
		 */
		async save({ request_sub_type_id, staff_ids } = {}) {
			return apiFetch(`/head-of-request`, {
				method: "POST",
				body: { request_sub_type_id, staff_ids: Array.isArray(staff_ids) ? staff_ids : [] },
			});
		},

		/**
		 * DELETE /head-of-request/{request_sub_type_id}
		 */
		async removeBySubType(request_sub_type_id) {
			if (!request_sub_type_id) throw new Error("Missing request_sub_type_id");
			return apiFetch(`/head-of-request/${encodeURIComponent(request_sub_type_id)}`, {
				method: "DELETE",
			});
		},
	};

	window.HeadOfRequestAPI = HeadOfRequestAPI;
})();

