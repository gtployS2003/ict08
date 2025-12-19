document.addEventListener("DOMContentLoaded", () => {
  const titleEl = document.getElementById("dashboard-title");
  const items = document.querySelectorAll(".sidebar__item");

  if (!titleEl || items.length === 0) return;

  const titles = {
    network: "เครือข่ายและอุปกรณ์",
    requests: "คำขอรับการสนับสนุน",
    meetings: "การประชุมและปฏิทินงาน",
    publicity: "ข่าวประชาสัมพันธ์",
  };

  items.forEach((btn) => {
    btn.addEventListener("click", () => {
      // set active
      items.forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");

      // change title (click only)
      const key = btn.dataset.dashboard;
      titleEl.textContent = titles[key] || btn.textContent.trim();
    });
  });

  // ตั้งค่าเริ่มต้นให้ตรงกับปุ่มที่ active ตอนแรก
  const initialActive = document.querySelector(".sidebar__item.is-active");
  if (initialActive) initialActive.click();
});
