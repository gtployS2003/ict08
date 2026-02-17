// assets/js/devices-list.js

let allDevices = [];
let filteredDevices = [];

// ฟังก์ชันโหลดข้อมูลจาก devices.json
async function loadDevices() {
  try {
    const res = await fetch("/ict8/assets/js/data-ex/devices.json");
    if (!res.ok) {
      throw new Error(
        "โหลด devices.json ไม่สำเร็จ (status " + res.status + ")"
      );
    }
    const data = await res.json();
    allDevices = data;
    filteredDevices = [...allDevices];
    renderDeviceTable(filteredDevices);
  } catch (err) {
    console.error("❌ โหลดข้อมูลอุปกรณ์ไม่สำเร็จ:", err);
  }
}

// ฟังก์ชันเรนเดอร์ตาราง
function renderDeviceTable(list) {
  const tbody = document.getElementById("device-list-tbody");
  if (!tbody) return;

  if (!list || list.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center; color:#777; padding:12px 0;">
          ไม่มีข้อมูลอุปกรณ์
        </td>
      </tr>
    `;
    return;
  }

  const rows = list.map((d, index) => {
    // ตั้งชื่ออุปกรณ์เบื้องต้น: ถ้ามีฟิลด์ "ชื่ออุปกรณ์" ให้ใช้, ไม่งั้นเอา "ประเภท @ สถานที่"
    const deviceName =
      d["ชื่ออุปกรณ์"] || `${d.ประเภท || "-"} @ ${d.สถานที่ || "-"}`;

    return `
      <tr>
        <td>${index + 1}</td>
        <td>${deviceName}</td>
        <td>${d.ประเภท || "-"}</td>
        <td>${d.ip || "-"}</td>
<td class="status-col">
  <span class="status-pill status-pill-${(d.สถานะ || "").toLowerCase()}">
    ${d.สถานะ || "-"}
  </span>
</td>

        <td>${d.สถานที่ || "-"}</td>
        <td>${d.จังหวัด || "-"}</td>
      </tr>
    `;
  });

  tbody.innerHTML = rows.join("");
}

// ฟังก์ชันตั้งค่า event ค้นหา + ปุ่มล้าง
function setupDeviceListSearch() {
  const searchInput = document.getElementById("device-list-search-input");
  const clearBtn = document.getElementById("device-list-search-clear");

  if (!searchInput) return;

  function applySearch() {
    const keyword = searchInput.value.trim().toLowerCase();

    if (!keyword) {
      filteredDevices = [...allDevices];
    } else {
      filteredDevices = allDevices.filter((d) => {
        const deviceName = (
          d["ชื่ออุปกรณ์"] || `${d.ประเภท || ""} ${d.สถานที่ || ""}`
        ).toLowerCase();
        const type = (d.ประเภท || "").toLowerCase();
        const ip = (d.ip || "").toLowerCase();
        const place = (d.สถานที่ || "").toLowerCase();
        const province = (d.จังหวัด || "").toLowerCase();
        const status = (d.สถานะ || "").toLowerCase();

        return (
          deviceName.includes(keyword) ||
          type.includes(keyword) ||
          ip.includes(keyword) ||
          place.includes(keyword) ||
          province.includes(keyword) ||
          status.includes(keyword)
        );
      });
    }

    renderDeviceTable(filteredDevices);
  }

  searchInput.addEventListener("input", () => {
    applySearch();
  });

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      searchInput.value = "";
      applySearch();
      searchInput.focus();
    });
  }
}

// init เมื่อโหลดหน้าเสร็จ
document.addEventListener("DOMContentLoaded", () => {
  // กันกรณีเอาไฟล์นี้ไปใช้ร่วมกับหน้าอื่น
  const tbody = document.getElementById("device-list-tbody");
  if (!tbody) return;

  loadDevices();
  setupDeviceListSearch();

  // TODO: ถ้ามี filter icon / add-device-button ค่อยมาเพิ่ม event ภายหลัง
});
