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
  ["auth_token", "token", "access_token", "isLoggedIn", "ict8_current_user", "ict8_current_person"].forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
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

function getCookie(name) {
  const key = `${encodeURIComponent(name)}=`;
  return document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(key))
    ?.slice(key.length) || "";
}

function setCookie(name, value, days) {
  const maxAge = Math.max(1, Number(days) || 365) * 24 * 60 * 60;
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; Max-Age=${maxAge}; Path=/ict8; SameSite=Lax`;
}

function initCookieConsent() {
  if (getCookie("ict8_cookie_consent") === "accepted") return;
  if (document.getElementById("cookieConsent")) return;

  const banner = document.createElement("div");
  banner.className = "cookie-consent";
  banner.id = "cookieConsent";
  banner.setAttribute("role", "dialog");
  banner.setAttribute("aria-live", "polite");
  banner.innerHTML = `
    <div class="cookie-consent__text">
      เว็บไซต์นี้ใช้คุกกี้เพื่อจดจำการเข้าสู่ระบบ การตั้งค่าการใช้งาน และปรับปรุงประสบการณ์ใช้งานของคุณ
    </div>
    <button type="button" class="cookie-consent__btn" id="cookieConsentAccept">ยอมรับ</button>
  `;

  document.body.appendChild(banner);
  document.getElementById("cookieConsentAccept")?.addEventListener("click", () => {
    setCookie("ict8_cookie_consent", "accepted", 365);
    try {
      localStorage.setItem("ict8_cookie_consent", "accepted");
    } catch {}
    banner.remove();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  applyAuthUI();
  protectPages();
  initCookieConsent();
});
