// assets/js/line-login.js
/**
 * LINE Login via LIFF (Manual click only)
 * - ไม่ auto-login
 * - กดปุ่มเท่านั้นถึงทำงาน
 * - มี debug บนหน้า (เห็นใน LINE ได้)
 */

document.addEventListener("DOMContentLoaded", () => {
  const btnLogin = document.getElementById("btn-line-login");
  const btnLogout = document.getElementById("btn-line-logout");
  const btnDebug = document.getElementById("btn-debug");

  btnLogin?.addEventListener("click", handleLineLogin);
  btnLogout?.addEventListener("click", handleLogoutDev);
  btnDebug?.addEventListener("click", showDebug);

  // debug panel จะโชว์ตลอด (กันเคส LINE ไม่มี console)
  ensureDebugPanel();
  logUI("DOM ready");
  logUI("href=" + location.href);
  logUI("LIFF_ID=" + (window.LIFF_ID || "(missing)"));
});

function ensureDebugPanel() {
  if (document.getElementById("liff-debug-panel")) return;

  const panel = document.createElement("pre");
  panel.id = "liff-debug-panel";
  panel.style.cssText =
    "position:fixed;left:10px;right:10px;bottom:10px;max-height:42vh;overflow:auto;" +
    "padding:10px;border-radius:12px;background:#111;color:#0f0;font-size:12px;" +
    "z-index:99999;opacity:.92;white-space:pre-wrap;word-break:break-word;";
  panel.textContent = "LIFF DEBUG\n";
  document.body.appendChild(panel);
}

function logUI(msg, obj) {
  const panel = document.getElementById("liff-debug-panel");
  const line = obj ? `${msg} ${safeJson(obj)}` : String(msg);
  console.log("[LIFF]", msg, obj || "");
  if (panel) panel.textContent += line + "\n";
}

function safeJson(v) {
  try { return JSON.stringify(v); } catch { return String(v); }
}

async function showDebug() {
  try {
    ensureDebugPanel();

    if (!window.liff) return logUI("ERROR: LIFF SDK not loaded");
    if (!window.LIFF_ID) return logUI("ERROR: LIFF_ID missing");

    logUI("DEBUG: init()");
    await liff.init({ liffId: window.LIFF_ID });

    logUI("DEBUG status", {
      isInClient: liff.isInClient(),
      isLoggedIn: liff.isLoggedIn(),
      os: liff.getOS?.() || "n/a",
      language: liff.getLanguage?.() || "n/a",
      version: liff.getVersion?.() || "n/a",
      lineVersion: liff.getLineVersion?.() || "n/a",
      href: location.href,
    });
  } catch (e) {
    logUI("showDebug error", { message: e?.message || String(e) });
  }
}

async function handleLogoutDev() {
  try {
    ensureDebugPanel();
    if (window.liff && window.LIFF_ID) {
      logUI("logout: init()");
      await liff.init({ liffId: window.LIFF_ID });
    }
  } catch (e) {
    logUI("logout init failed", { message: e?.message || String(e) });
  }

  try { AuthAPI.clearToken(); } catch {}
  localStorage.removeItem("auth_token");
  sessionStorage.removeItem("auth_token");
  sessionStorage.removeItem("line_user_id");
  sessionStorage.removeItem("line_user_name");

  try {
    if (window.liff && liff.isLoggedIn()) {
      logUI("logout: liff.logout()");
      liff.logout();
    }
  } catch (e) {
    logUI("logout failed", { message: e?.message || String(e) });
  }

  location.href = "/ict/login.html?ts=" + Date.now();
}

async function handleLineLogin() {
  try {
    ensureDebugPanel();
    logUI("STEP 1: click login");

    if (!window.liff) return logUI("ERROR: LIFF SDK not loaded");
    if (!window.LIFF_ID) return logUI("ERROR: LIFF_ID missing");

    logUI("STEP 2: liff.init()");
    await liff.init({ liffId: window.LIFF_ID });

    logUI("STEP 3: after init", {
      isInClient: liff.isInClient(),
      isLoggedIn: liff.isLoggedIn(),
    });

    // ยังไม่ login -> เริ่ม login (ผู้ใช้ต้องกด Continue เองตาม flow ของ LINE)
    if (!liff.isLoggedIn()) {
      logUI("STEP 4: liff.login()");
      liff.login();
      return;
    }

    // login แล้ว -> ดึง profile + call backend
    logUI("STEP 5: getProfile()");
    const profile = await liff.getProfile();
    if (!profile?.userId) return logUI("ERROR: no userId from profile");

    logUI("profile", { userId: profile.userId, name: profile.displayName });

    logUI("STEP 6: call backend /auth/line-login");
    const res = await AuthAPI.lineLogin({
      line_user_id: profile.userId,
      line_user_name: profile.displayName,
    });

    const data = res?.data || {};
    logUI("backend response", data);

    if (data.status === "active") {
      if (data.token) AuthAPI.saveToken(data.token);

      if (liff.isInClient()) {
        // ✅ แนะนำ: ปิดก่อน (sendMessages บางเครื่องทำให้ค้าง/ปิดไม่ได้)
        logUI("STEP 7: closeWindow()");
        setTimeout(() => {
          try { liff.closeWindow(); } catch {}
        }, 300);
        return;
      }

      // นอก client ปิดไม่ได้
      alert("isInClient=false → ปิดหน้าต่าง LIFF ไม่ได้ (ตอนนี้ไม่ได้เปิดแบบ LIFF ในแอป LINE)");
      location.href = "/ict/index.html";
      return;
    }

    if (data.status === "register") {
      sessionStorage.setItem("line_user_id", profile.userId);
      sessionStorage.setItem("line_user_name", profile.displayName);
      location.href = "/ict/profile-setup.html";
      return;
    }

    if (data.status === "pending") {
      alert("บัญชีของคุณอยู่ระหว่างรอการอนุมัติจากเจ้าหน้าที่");
      return;
    }

    alert("ไม่สามารถเข้าสู่ระบบได้");
  } catch (e) {
    logUI("catch error", { message: e?.message || String(e) });
    alert("เกิดข้อผิดพลาด: " + (e?.message || String(e)));
  }
}
