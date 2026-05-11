// assets/js/auth.js

function isLoggedIn() {
  try {
    return !!(
      localStorage.getItem("auth_token") ||
      sessionStorage.getItem("auth_token") ||
      localStorage.getItem("token") ||
      sessionStorage.getItem("token") ||
      localStorage.getItem("access_token") ||
      sessionStorage.getItem("access_token")
    );
  } catch {
    return false;
  }
}

function logout() {
  localStorage.removeItem("auth_token");
  localStorage.removeItem("isLoggedIn"); // เผื่อเคยใช้ของเก่า
  window.location.href = "/ict8/login.html";
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
  const path = window.location.pathname.replace(/\/+$/, "");
  const protectedPaths = ["/ict8/index.html"];
  const publicPages = ["/ict8/login.html", "/ict8/profile-setup.html"];

  // ถ้าอยู่ใน public pages ให้ข้ามไป
  if (publicPages.includes(path)) return;

  if (!isLoggedIn() && protectedPaths.includes(path)) {
    const redirect = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.replace(`/ict8/login.html?redirect=${redirect}`);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  applyAuthUI();
  protectPages();
});
