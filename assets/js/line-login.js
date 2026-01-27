// assets/js/line-login.js

/**
 * LINE Login via LIFF
 * ใช้กับหน้า login.html
 *
 * ต้องมี:
 * - config.js.php (กำหนด LIFF_ID)
 * - http.js
 * - auth.api.js
 */

document.addEventListener("DOMContentLoaded", () => {
  const btnLogin = document.getElementById("btn-line-login");
  if (!btnLogin) return;

  btnLogin.addEventListener("click", handleLineLogin);
});

async function handleLineLogin() {
  try {
    // 1) ตรวจว่า LIFF พร้อมไหม
    if (!window.liff) {
      alert("ไม่พบ LIFF SDK");
      return;
    }

    if (!window.LIFF_ID) {
      alert("ยังไม่ได้ตั้งค่า LIFF_ID");
      return;
    }

    // 2) init LIFF
    await liff.init({ liffId: window.LIFF_ID });

    // 3) ถ้ายังไม่ login → login ก่อน
    if (!liff.isLoggedIn()) {
      liff.login({
        redirectUri: window.location.href,
      });
      return;
    }

    // 4) ดึงข้อมูล profile
    const profile = await liff.getProfile();
    const lineUserId = profile.userId;
    const lineUserName = profile.displayName;

    if (!lineUserId) {
      alert("ไม่สามารถดึงข้อมูล LINE user ได้");
      return;
    }

    // 5) ส่งไปเช็ค backend
    const res = await AuthAPI.lineLogin({
      line_user_id: lineUserId,
      line_user_name: lineUserName,
    });

    const data = res?.data || {};
    const status = data.status;

    // 6) จัดการตามสถานะ
    switch (status) {
      case "active":
        // login สำเร็จ
        if (data.token) {
          AuthAPI.saveToken(data.token);
        }
        window.location.href = "/ict/gcms/dashboard.html";
        break;

      case "pending":
        alert("บัญชีของคุณอยู่ระหว่างรอการอนุมัติจากเจ้าหน้าที่");
        break;

      case "register":
        // ไปหน้าสมัครสมาชิก
        // ส่ง line_user_id / name ผ่าน query (หรือใช้ sessionStorage ก็ได้)
        sessionStorage.setItem("line_user_id", lineUserId);
        sessionStorage.setItem("line_user_name", lineUserName);

        window.location.href = "/ict/profile-setup.html";
        break;

      default:
        alert("ไม่สามารถเข้าสู่ระบบได้");
        console.error("Unknown status:", status, data);
    }
  } catch (err) {
    console.error("LINE login error:", err);
    alert("เกิดข้อผิดพลาดในการเข้าสู่ระบบด้วย LINE");
  }
}
