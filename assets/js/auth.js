// assets/js/auth.js

function isLoggedIn() {
  return !!localStorage.getItem("auth_token");
}

function logout() {
  localStorage.removeItem("auth_token");
  localStorage.removeItem("isLoggedIn"); // เผื่อเคยใช้ของเก่า
  window.location.href = "/ict/site/home.html";
}

// ซ่อน/แสดง element ตามสถานะ login
function applyAuthUI() {
  const loggedIn = isLoggedIn();

  document.querySelectorAll(".guest-only").forEach((el) => {
    el.style.display = loggedIn ? "none" : "";
  });

  document.querySelectorAll(".member-only").forEach((el) => {
    el.style.display = loggedIn ? "block" : "none";
  });
}

// กันคนที่ยังไม่ login เข้า pages ที่ต้องเป็นสมาชิก
function protectPages() {
  const path = window.location.pathname;
  const protectedPaths = ["/ict/index.html"];

  if (!isLoggedIn() && protectedPaths.includes(path)) {
    window.location.href = "/ict/site/home.html";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  applyAuthUI();
  protectPages();
});
