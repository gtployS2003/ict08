function detectBasePath() {
  const script =
    document.currentScript ||
    Array.from(document.scripts).find((s) => (s.src || "").includes("/assets/js/include.js"));

  if (!script || !script.src) return "";

  const u = new URL(script.src);
  const p = u.pathname; // เช่น /ict8/assets/js/include.js
  const marker = "/ict8/assets/js/";
  const idx = p.indexOf(marker);

  return idx >= 0 ? p.slice(0, idx) : "";
}

const BASE_PATH =
  (window.__APP_CONFIG__ && window.__APP_CONFIG__.BASE_PATH) || detectBasePath() || ""; // "" หรือ "/ict8"

async function loadHtml(targetId, filePath) {
  const url = `${BASE_PATH}${filePath}`; // filePath ต้องขึ้นต้นด้วย /assets/...

  const res = await fetch(url);
  if (!res.ok) {
    console.error("Include failed:", url, res.status);
    return;
  }

  const htmlRaw = await res.text();
  const html = patchAssetPaths(htmlRaw);

  if (targetId === "head") {
    document.head.insertAdjacentHTML("beforeend", html);
    return;
  }

  const el = document.getElementById(targetId);
  if (el) el.innerHTML = html;
}

function patchAssetPaths(html) {
  // แปลง href/src="/assets/..." -> href="/ict8/assets/..." (ถ้า BASE_PATH="/ict8")
  if (!BASE_PATH) return html;
  return html
    .replaceAll('href="/assets/', `href="${BASE_PATH}/assets/`)
    .replaceAll("href='/assets/", `href='${BASE_PATH}/assets/`)
    .replaceAll('src="/assets/', `src="${BASE_PATH}/assets/`)
    .replaceAll("src='/assets/", `src='${BASE_PATH}/assets/`);
}


document.addEventListener("DOMContentLoaded", async () => {
  await loadHtml("head", "/ict8/assets/include/head.html");

  await loadHtml("header", "/ict8/assets/include/header.html");
  await loadHtml("navbar", "/ict8/assets/include/navbar.html");

  // initNavbar ถ้ามี
  if (typeof window.initNavbar === "function") window.initNavbar();

  await loadHtml("footer", "/ict8/assets/include/footer.html");

  await loadHtml("header-index", "/ict8/assets/include/header-schedule.html");
  await loadHtml("footer-index", "/ict8/assets/include/footer_index.html");

  await loadHtml("schedule-nav", "/ict8/assets/include/nav-schedule.html");

  await loadHtml("device-nav", "/ict8/assets/include/nav-device.html");
  await loadHtml("header-device", "/ict8/assets/include/header-device.html");

  await loadHtml("gcms-nav", "/ict8/assets/include/nav-gcms.html");
  await loadHtml("header-gcms", "/ict8/assets/include/header-gcms.html");

  await loadHtml("header-form", "/ict8/assets/include/header-form.html");
});
