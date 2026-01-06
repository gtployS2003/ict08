// assets/js/api/activities.api.js
async function apiListActivities(limit = 20) {
  return httpGet(`activities?limit=${limit}`);
}
async function apiGetActivity(id) {
  return httpGet(`activities/${id}`);
}
