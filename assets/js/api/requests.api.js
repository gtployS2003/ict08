// assets/js/api/requests.api.js
// ใช้ http helpers จาก assets/js/api/http.js

const requestsApi = {
  /**
   * Create new request
   * payload = {
   *   request_type,
   *   request_sub_type,
   *   subject,
   *   device_id,
   *   detail,
   *   requester_id,
   *   hasAttachment,
   *   urgency_id,
   *   start_date_time,
   *   end_date_time,
   *   current_status_id
   * }
   */
  async create(payload = {}) {
    return apiFetch("/requests", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  // (เผื่ออนาคต)
  // async list({ q = "", page = 1, limit = 20 } = {}) {
  //   const qs = new URLSearchParams({ q, page, limit });
  //   return apiFetch(`/requests?${qs.toString()}`, { method: "GET" });
  // },

  // async get(id) {
  //   return apiFetch(`/requests/${id}`, { method: "GET" });
  // },
};

// expose global
window.requestsApi = requestsApi;
