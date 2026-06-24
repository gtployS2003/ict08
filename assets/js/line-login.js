document.addEventListener("DOMContentLoaded", () => {
  const btnLineLogin = document.getElementById("btn-line-login");
  const btnGoogleLogin = document.getElementById("btn-google-login");

  btnLineLogin?.addEventListener("click", handleLineLogin);
  btnGoogleLogin?.addEventListener("click", handleGoogleLogin);

  initGoogleLogin();

  autoResumeAfterRedirect().catch((e) => {
    setLoginStatus("ไม่สามารถเข้าสู่ระบบด้วย LINE ต่อได้ กรุณาลองใหม่อีกครั้ง", true);
    console.error("[login] auto resume failed", e);
  });
});

let googleTokenClient = null;

async function autoResumeAfterRedirect() {
  if (!window.liff || !window.LIFF_ID) return;

  const hasOAuthParams =
    location.search.includes("code=") || location.search.includes("state=");
  if (!hasOAuthParams) return;

  await liff.init({ liffId: window.LIFF_ID });

  if (liff.isLoggedIn()) {
    await continueAfterLineLogin();
  }
}

async function continueAfterLineLogin() {
  setLoginStatus("กำลังตรวจสอบบัญชี LINE...");

  const profile = await liff.getProfile();
  if (!profile?.userId) {
    setLoginStatus("ไม่พบข้อมูลผู้ใช้จาก LINE กรุณาลองใหม่อีกครั้ง", true);
    return;
  }

  const res = await AuthAPI.lineLogin({
    line_user_id: profile.userId,
    line_user_name: profile.displayName,
  });

  const data = res?.data || {};
  handleLoginResult(data, {
    activeMessage: liff.isInClient()
      ? "เข้าสู่ระบบสำเร็จ กำลังปิดหน้าต่าง..."
      : "เข้าสู่ระบบสำเร็จ กำลังไปยังหน้าหลัก...",
    onActive: () => {
      if (liff.isInClient()) {
        setTimeout(() => {
          try { liff.closeWindow(); } catch {}
        }, 300);
        return;
      }

      redirectAfterLogin();
    },
    onRegister: () => {
      sessionStorage.setItem("line_user_id", profile.userId);
      sessionStorage.setItem("line_user_name", profile.displayName || "");
      location.href = "/ict8/profile-setup.html";
    },
  });
}

async function handleLineLogin() {
  try {
    setLoginStatus("กำลังเปิดหน้าต่างเข้าสู่ระบบ LINE...");

    if (!window.liff) {
      setLoginStatus("ไม่สามารถโหลดระบบ LINE Login ได้ กรุณารีเฟรชหน้าแล้วลองใหม่", true);
      return;
    }
    if (!window.LIFF_ID) {
      setLoginStatus("ยังไม่ได้ตั้งค่า LIFF ID สำหรับ LINE Login", true);
      return;
    }

    await liff.init({ liffId: window.LIFF_ID });

    if (!liff.isLoggedIn()) {
      liff.login({ redirectUri: location.href });
      return;
    }

    await continueAfterLineLogin();
  } catch (e) {
    console.error("[login] LINE login failed", e);
    setLoginStatus("เกิดข้อผิดพลาดระหว่างเข้าสู่ระบบด้วย LINE: " + (e?.message || String(e)), true);
  }
}

function initGoogleLogin() {
  const clientId = getGoogleClientId();
  if (!clientId) return;

  waitForGoogleIdentity()
    .then(() => {
      googleTokenClient = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: "openid email profile",
        callback: handleGoogleToken,
      });
    })
    .catch((e) => {
      console.error("[login] Google Identity Services unavailable", e);
    });
}

async function handleGoogleLogin() {
  const clientId = getGoogleClientId();
  if (!clientId) {
    setLoginStatus("ยังไม่ได้ตั้งค่า Google Client ID สำหรับเข้าสู่ระบบด้วย Email", true);
    return;
  }

  try {
    setLoginStatus("กำลังเปิดหน้าต่างเข้าสู่ระบบ Google...");
    await waitForGoogleIdentity();

    if (!googleTokenClient) {
      googleTokenClient = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: "openid email profile",
        callback: handleGoogleToken,
      });
    }

    googleTokenClient.requestAccessToken({
      prompt: "select_account",
    });
  } catch (e) {
    console.error("[login] Google login failed", e);
    setLoginStatus("ไม่สามารถเปิด Google Login ได้ กรุณาลองใหม่อีกครั้ง", true);
  }
}

async function handleGoogleCredential(response) {
  try {
    const credential = response?.credential || "";
    if (!credential) {
      setLoginStatus("ไม่พบข้อมูลยืนยันตัวตนจาก Google", true);
      return;
    }

    setLoginStatus("กำลังตรวจสอบ Email กับระบบ...");
    const res = await AuthAPI.googleLogin({ credential });
    handleLoginResult(res?.data || {}, {
      activeMessage: "เข้าสู่ระบบสำเร็จ กำลังไปยังหน้าหลัก...",
      onActive: redirectAfterLogin,
    });
  } catch (e) {
    console.error("[login] Google credential failed", e);
    const msg = e?.payload?.message || e?.message || "ไม่สามารถเข้าสู่ระบบด้วย Google ได้";
    setLoginStatus(msg, true);
  }
}

async function handleGoogleToken(response) {
  try {
    const accessToken = response?.access_token || "";
    if (!accessToken) {
      setLoginStatus("ไม่พบข้อมูลยืนยันตัวตนจาก Google", true);
      return;
    }

    setLoginStatus("กำลังตรวจสอบ Email กับระบบ...");
    const res = await AuthAPI.googleLogin({ access_token: accessToken });
    handleLoginResult(res?.data || {}, {
      activeMessage: "เข้าสู่ระบบสำเร็จ กำลังไปยังหน้าหลัก...",
      onActive: redirectAfterLogin,
    });
  } catch (e) {
    console.error("[login] Google token failed", e);
    const msg = e?.payload?.message || e?.message || "ไม่สามารถเข้าสู่ระบบด้วย Google ได้";
    setLoginStatus(msg, true);
  }
}

function handleLoginResult(data, options = {}) {
  if (data.status === "active") {
    if (data.token) AuthAPI.saveToken(data.token);
    setLoginStatus(options.activeMessage || "เข้าสู่ระบบสำเร็จ");
    if (typeof options.onActive === "function") options.onActive();
    return;
  }

  if (data.status === "register") {
    if (typeof options.onRegister === "function") {
      options.onRegister();
      return;
    }
    setLoginStatus("ไม่พบอีเมลนี้ในระบบ กรุณาติดต่อเจ้าหน้าที่เพื่อเพิ่มข้อมูลผู้ใช้", true);
    return;
  }

  if (data.status === "pending") {
    setLoginStatus("บัญชีของคุณอยู่ระหว่างรอการอนุมัติจากเจ้าหน้าที่", true);
    return;
  }

  setLoginStatus("ไม่สามารถเข้าสู่ระบบได้ กรุณาลองใหม่อีกครั้ง", true);
}

function redirectAfterLogin() {
  const params = new URLSearchParams(location.search);
  const redirect = params.get("redirect");
  location.href = redirect || "/ict8/index.html";
}

function setLoginStatus(message, isError = false) {
  const el = document.getElementById("login-status");
  if (!el) return;
  el.textContent = message || "";
  el.classList.toggle("is-error", Boolean(isError));
}

function getGoogleClientId() {
  return String(window.__APP_CONFIG__?.GOOGLE_CLIENT_ID || window.GOOGLE_CLIENT_ID || "").trim();
}

function waitForGoogleIdentity() {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const timer = setInterval(() => {
      if (window.google?.accounts?.id) {
        clearInterval(timer);
        resolve();
        return;
      }

      if (Date.now() - started > 5000) {
        clearInterval(timer);
        reject(new Error("Google Identity Services not loaded"));
      }
    }, 100);
  });
}
