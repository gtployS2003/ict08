document.addEventListener("DOMContentLoaded", () => {
  const mapEl = document.getElementById("device-map");
  if (!mapEl) return;

  // กันเคส script ถูกโหลดซ้ำแล้ว Leaflet บ่นว่า container ถูก init ไปแล้ว
  if (mapEl._leaflet_id) {
    mapEl._leaflet_id = null;
  }

  // ตั้งค่า default icon ของ Marker ให้ใช้ไฟล์จาก CDN (กัน 404)
  L.Marker.prototype.options.icon = L.icon({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    iconRetinaUrl:
      "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

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
  fetch("/assets/js/data-ex/devices.json")
    .then((res) => {
      if (!res.ok) {
        throw new Error("โหลด devices.json ไม่สำเร็จ (status " + res.status + ")");
      }
      return res.json();
    })
    .then((devices) => {
      const bounds = [];

      devices.forEach((d) => {
        // เช็ก lat/lng ก่อนกันข้อมูลเสีย
        if (typeof d.lat !== "number" || typeof d.lng !== "number") return;

        const marker = L.marker([d.lat, d.lng]).addTo(map);

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
