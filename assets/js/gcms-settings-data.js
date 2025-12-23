document.addEventListener("click", (e) => {
  const btn = e.target.closest(".menu-toggle");
  if (!btn) return;

  const menuId = btn.getAttribute("aria-controls");
  const menuEl = document.getElementById(menuId);
  if (!menuEl) return;

  const expanded = btn.getAttribute("aria-expanded") === "true";
  btn.setAttribute("aria-expanded", String(!expanded));

  // toggle hidden
  menuEl.hidden = expanded;

  console.log(menuId, "expanded:", !expanded, "hidden:", menuEl.hidden);
  console.log("settings js loaded");

});