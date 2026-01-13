(function () {
  // รอ element โผล่มา (กรณี include.js แทรก HTML ทีหลัง)
  function waitForEl(id, timeout = 4000) {
    return new Promise((resolve) => {
      const start = Date.now();
      const timer = setInterval(() => {
        const el = document.getElementById(id);
        if (el) {
          clearInterval(timer);
          resolve(el);
        } else if (Date.now() - start > timeout) {
          clearInterval(timer);
          resolve(null);
        }
      }, 50);
    });
  }

  async function init() {
    const btn = await waitForEl("gcmsNavToggle");
    const menu = await waitForEl("gcmsNavMenu");

    if (!btn || !menu) {
      console.warn("[gcms-nav] toggle/menu not found", { btn, menu });
      return;
    }

    console.log("[gcms-nav] ready");

    const closeMenu = () => {
      menu.classList.remove("open");
      btn.setAttribute("aria-expanded", "false");
    };

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const isOpen = menu.classList.toggle("open");
      btn.setAttribute("aria-expanded", String(isOpen));
      console.log("[gcms-nav] toggle", isOpen);
    });

    document.addEventListener("click", (e) => {
      if (!menu.classList.contains("open")) return;
      if (menu.contains(e.target) || btn.contains(e.target)) return;
      closeMenu();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeMenu();
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > 992) closeMenu();
    });
  }

  // เรียก init ทันที ไม่พึ่ง DOMContentLoaded
  init();
})();
