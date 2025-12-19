// ========== LOAD <head> ==========
fetch("/assets/include/head.html")
  .then(res => res.text())
  .then(html => {
    document.head.insertAdjacentHTML("beforeend", html);
  });

// ========== LOAD HEADER ==========
fetch("/assets/include/header.html")
  .then(res => res.text())
  .then(html => {
    const el = document.getElementById("header");
    if (el) el.innerHTML = html;
  });

// ========== LOAD NAVBAR ==========
fetch("/assets/include/navbar.html")
  .then(res => res.text())
  .then(html => {
    const el = document.getElementById("navbar");
    if (el) {
      el.innerHTML = html;

      // เรียก initNavbar ถ้ามีใน main.js
      if (typeof initNavbar === "function") {
        initNavbar();
      }
    }
  });

// ========== LOAD FOOTER ==========
fetch("/assets/include/footer.html")
  .then(res => res.text())
  .then(html => {
    const el = document.getElementById("footer");
    if (el) el.innerHTML = html;
  });

// ========== LOAD HEADER INDEX ==========
fetch("/assets/include/header-schedule.html")
  .then(res => res.text())
  .then(html => {
    const el = document.getElementById("header-index");
    if (el) el.innerHTML = html;
  });
  
// ========== LOAD FOOTER INDEX ==========
fetch("/assets/include/footer_index.html")
  .then(res => res.text())
  .then(html => {
    const el = document.getElementById("footer-index");
    if (el) el.innerHTML = html;
  });

// ========== LOAD SCHEDULE NAVIGATION ==========
fetch("/assets/include/nav-schedule.html")
  .then(res => res.text())
  .then(html => {
    const el = document.getElementById("schedule-nav");
    if (el) el.innerHTML = html;
  });

// ========== LOAD DEVICE NAVIGATION ==========
fetch("/assets/include/nav-device.html")
  .then(res => res.text())
  .then(html => {
    const el = document.getElementById("device-nav");
    if (el) el.innerHTML = html;
  });

fetch("/assets/include/header-device.html")
  .then(res => res.text())
  .then(html => {
    const el = document.getElementById("header-device");
    if (el) el.innerHTML = html;
  });

// ========== LOAD GCMS NAVIGATION ==========
fetch("/assets/include/nav-gcms.html")
  .then(res => res.text())
  .then(html => {
    const el = document.getElementById("gcms-nav");
    if (el) el.innerHTML = html;
  });

fetch("/assets/include/header-gcms.html")
  .then(res => res.text())
  .then(html => {
    const el = document.getElementById("header-gcms");
    if (el) el.innerHTML = html;
  });