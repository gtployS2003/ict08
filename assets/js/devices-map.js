// ===== เลือกชื่อ base icon ตามประเภทอุปกรณ์ =====
function getDeviceBaseName(deviceType) {
  switch (deviceType) {
    case "Switch":
      return "Switch";
    case "Router":
      return "Router";
    case "CCTV":
      return "Cctv"; // ให้ตรงกับ "Cctv online/offline.png"
    case "Firewall":
      return "firewall"; // ให้ตรงกับ "firewall online/offline.png"
    case "Access Point":
      return "Access point"; // ให้ตรงกับ "Access point online/offline.png"
    case "Server":
      return "Server"; // ให้ตรงกับ "Server online/offline.png"
    case "วิทยุสื่อสาร":
      return "walkie talkie"; // ให้ตรงกับ "walkie talkie online/offline.png"
    case "UPS":
      // ถ้าไม่มี icon UPS แยก ใช้ Server หรือ Switch แทนก็ได้
      return "Server";
    default:
      return "Unknown device";
  }
}

// ===== สร้าง path รูป icon ตามประเภท + สถานะ =====
function getDeviceIconUrl(device) {
  const baseName = getDeviceBaseName(device.ประเภท);
  const status = (device.สถานะ || "").toLowerCase(); // "online" | "offline" | "maintenance" ฯลฯ

  if (baseName === "Unknown device") {
    return "/ict/assets/image/status-device/Unknown device.png";
  }

  // ถ้าไม่ได้ online ให้ถือเป็น offline (รวมถึง maintenance)
  const statusSuffix = status === "online" ? "online" : "offline";

  return `/ict/assets/image/status-device/${baseName} ${statusSuffix}.png`;
}

// ===== Leaflet map =====
document.addEventListener("DOMContentLoaded", () => {
  const mapEl = document.getElementById("device-map");
  if (!mapEl) return;

  // กันเคส script ถูกโหลดซ้ำแล้ว Leaflet บ่นว่า container ถูก init ไปแล้ว
  if (mapEl._leaflet_id) {
    mapEl._leaflet_id = null;
  }

  // 1) สร้างแผนที่ (ค่าเริ่มต้นโฟกัสกลางเขต 8)
  const map = L.map("device-map").setView([16.8, 100.0], 7);

  // 2) พื้นหลังแผนที่
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);

  // (ถ้าไม่อยากมี marker พิเศษสำหรับศูนย์ ICT ก็ลบส่วนนี้ออกได้)
  L.marker([16.821, 100.265])
    .addTo(map)
    .bindPopup("<b>ศูนย์ ICT เขต 8</b><br>อุปกรณ์เครือข่ายหลัก");

  // 3) โหลดข้อมูลอุปกรณ์จากไฟล์ JSON
  fetch("/ict/assets/js/data-ex/devices.json")
    .then((res) => {
      if (!res.ok) {
        throw new Error(
          "โหลด devices.json ไม่สำเร็จ (status " + res.status + ")"
        );
      }
      return res.json();
    })
    .then((devices) => {
      const bounds = [];
      const total = devices.length;
      const onlineCount = devices.filter((d) => d.สถานะ === "online").length;
      const offlineCount = devices.filter((d) => d.สถานะ !== "online").length;

      document.getElementById("summary-total").textContent = total;
      document.getElementById("summary-online").textContent = onlineCount;
      document.getElementById("summary-offline").textContent = offlineCount;

      devices.forEach((d) => {
        // เช็ก lat/lng ก่อนกันข้อมูลเสีย
        if (typeof d.lat !== "number" || typeof d.lng !== "number") return;

        const iconUrl = getDeviceIconUrl(d);

        const icon = L.icon({
          iconUrl: iconUrl,
          iconSize: [32, 32], // ปรับให้พอดีกับไฟล์จริงได้
          iconAnchor: [16, 32],
          popupAnchor: [1, -28],
        });

        const marker = L.marker([d.lat, d.lng], { icon }).addTo(map);

        marker.bindPopup(`
          <b>${d.ประเภท} #${d.id}</b><br>
          สถานที่: ${d.สถานที่}<br>
          จังหวัด: ${d.จังหวัด}<br>
          IP: ${d.ip || "- ไม่มี IP -"}<br>
          สถานะ: ${d.สถานะ}
        `);

        bounds.push([d.lat, d.lng]);
      });

      // ถ้ามีพิกัดอย่างน้อย 1 จุด ให้ zoom ให้พอดีกับทุกอุปกรณ์
      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [40, 40] });
      }
    })
    .catch((err) => {
      console.error("❌ โหลดข้อมูลอุปกรณ์ไม่สำเร็จ:", err);
    });
});
