function isLoggedIn() {
  return localStorage.getItem("isLoggedIn") === "true";
}

// จำลอง login ด้วย Google (ตอนนี้ยังไม่ต่อของจริง)
function loginMock() {
  localStorage.setItem("isLoggedIn", "true");
  window.location.href = "../../index.html";   // หลัง login ไปหน้า index.html
}

function logout() {
  localStorage.removeItem("isLoggedIn");
  window.location.href = "../../site/home.html";
}

// ซ่อน/แสดง element ตามสถานะ login
function applyAuthUI() {
  const loggedIn = isLoggedIn();

  document.querySelectorAll(".guest-only").forEach(el => {
    el.style.display = loggedIn ? "none" : "";
  });

  document.querySelectorAll(".member-only").forEach(el => {
    el.style.display = loggedIn ? "block" : "none";
  });
}

// กันคนที่ login แล้ว เข้า /login.html ซ้ำ
function protectPages() {
  const path = window.location.pathname;

  const protectedPages = ["../../index.html"]; // หน้าเฉพาะสมาชิก
  if (!isLoggedIn() && protectedPages.includes(path)) {
    window.location.href = "../../site/home.html";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  applyAuthUI();
  protectPages();
});
