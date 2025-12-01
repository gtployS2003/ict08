let allNotifs = [];
let filteredNotifs = [];

// map ประเภท -> label ภาษาไทยสั้น ๆ
const typeLabelMap = {
  critical: "วิกฤติ",
  warning: "คำเตือน",
  info: "ข้อมูล",
  request: "คำร้องซ่อม",
  maintenance: "ระหว่างซ่อมบำรุง",
};

// โหลดข้อมูลจาก device_notifications.json
async function loadNotifications() {
  try {
    const res = await fetch("/assets/js/data-ex/device_notifications.json");
    if (!res.ok) {
      throw new Error(
        "โหลด device_notifications.json ไม่สำเร็จ (status " + res.status + ")"
      );
    }

    const data = await res.json();

    // เติม field read = false ไว้ใช้กับ filter ยังไม่อ่าน/อ่านแล้ว
    allNotifs = data.map((n) => ({ ...n, read: false }));
    filteredNotifs = [...allNotifs];
    renderNotifications(filteredNotifs);
  } catch (err) {
    console.error("❌ โหลดการแจ้งเตือนไม่สำเร็จ:", err);
  }
}

// เรนเดอร์รายการแจ้งเตือน
function renderNotifications(list) {
  const listEl = document.querySelector(".notifications-list");
  const emptyEl = document.querySelector(".notifications-empty");
  if (!listEl) return;

  if (!list || list.length === 0) {
    listEl.innerHTML = "";
    if (emptyEl) emptyEl.style.display = "block";
    return;
  }

  if (emptyEl) emptyEl.style.display = "none";

  const cards = list
    .map((n) => {
      const type = n.ประเภท || "info";
      const typeLabel = typeLabelMap[type] || type;
      const readClass = n.read ? "notification-card-read" : "notification-card-unread";
      const typeClass = `notification-type-${type}`;

      // สร้างบรรทัดย่อยด้านล่างหัวข้อ
      const metaParts = [];
      if (n.อุปกรณ์) metaParts.push(n.อุปกรณ์);
      if (n.จังหวัด) metaParts.push("จังหวัด" + n.จังหวัด);
      if (n.ผู้ร้องขอ) metaParts.push("ผู้ร้องขอ: " + n.ผู้ร้องขอ);
      if (n.สถานะคำร้อง) metaParts.push("สถานะคำร้อง: " + n.สถานะคำร้อง);
      if (n.ผู้ดำเนินการ) metaParts.push("ผู้ดำเนินการ: " + n.ผู้ดำเนินการ);
      const metaText = metaParts.join(" · ");

      return `
        <article class="notification-card ${readClass}" data-id="${n.id}">
          <div class="notification-card-top">
            <span class="notification-badge ${typeClass}">
              ${typeLabel}
            </span>
            <span class="notification-time">
              ${n.เวลา || ""}
            </span>
          </div>

          <h2 class="notification-title">${n.หัวข้อ || "-"}</h2>

          <p class="notification-detail">
            ${n.รายละเอียด || ""}
          </p>

          ${
            metaText
              ? `<p class="notification-meta">${metaText}</p>`
              : ""
          }
        </article>
      `;
    })
    .join("");

  listEl.innerHTML = cards;
}

// apply search + filter ทั้งหมด
function applyNotificationFilters() {
  const searchInput = document.getElementById("notif-search");
  const typeFilter = document.getElementById("notif-type-filter");
  const readFilter = document.getElementById("notif-read-filter");

  const keyword = (searchInput?.value || "").trim().toLowerCase();
  const typeValue = typeFilter?.value || "all";
  const readValue = readFilter?.value || "all";

  filteredNotifs = allNotifs.filter((n) => {
    // filter ประเภท
    if (typeValue !== "all" && n.ประเภท !== typeValue) {
      return false;
    }

    // filter ยังไม่อ่าน / อ่านแล้ว
    if (readValue === "unread" && n.read) return false;
    if (readValue === "read" && !n.read) return false;

    // filter keyword
    if (keyword) {
      const text =
        (n.หัวข้อ || "") +
        " " +
        (n.รายละเอียด || "") +
        " " +
        (n.อุปกรณ์ || "") +
        " " +
        (n.จังหวัด || "") +
        " " +
        (n.ผู้ร้องขอ || "") +
        " " +
        (n.สถานะคำร้อง || "");

      if (!text.toLowerCase().includes(keyword)) {
        return false;
      }
    }

    return true;
  });

  renderNotifications(filteredNotifs);
}

// ผูก event ให้ search + filter + คลิกการ์ด = อ่านแล้ว
function setupNotificationUI() {
  const searchInput = document.getElementById("notif-search");
  const clearBtn = document.getElementById("notif-search-clear");
  const typeFilter = document.getElementById("notif-type-filter");
  const readFilter = document.getElementById("notif-read-filter");
  const listEl = document.querySelector(".notifications-list");

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      applyNotificationFilters();
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      searchInput.value = "";
      applyNotificationFilters();
      searchInput.focus();
    });
  }

  if (typeFilter) {
    typeFilter.addEventListener("change", applyNotificationFilters);
  }

  if (readFilter) {
    readFilter.addEventListener("change", applyNotificationFilters);
  }

  // คลิกการ์ด = mark as read
  if (listEl) {
    listEl.addEventListener("click", (e) => {
      const card = e.target.closest(".notification-card");
      if (!card) return;

      const id = Number(card.dataset.id);
      const notif = allNotifs.find((n) => n.id === id);
      if (notif) {
        notif.read = true;
        applyNotificationFilters();
      }
    });
  }
}

// init
document.addEventListener("DOMContentLoaded", () => {
  // กันไม่ให้รันในหน้าที่ไม่มี .main-notifications
  const main = document.querySelector(".main-notifications");
  if (!main) return;

  loadNotifications();
  setupNotificationUI();
});
