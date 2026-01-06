// assets/js/api/news.api.js
async function apiListNews(limit = 20) {
  return httpGet(`news?limit=${limit}`);
}
async function apiGetNews(id) {
  return httpGet(`news/${id}`);
}
async function apiCreateNews(payload) {
  return httpPost("news", payload);
}
async function apiUpdateNews(id, payload) {
  return httpPut(`news/${id}`, payload);
}
async function apiDeleteNews(id) {
  return httpDelete(`news/${id}`);
}
