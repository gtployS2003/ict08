// generate-devices.js
// สคริปต์นี้ใช้สร้างไฟล์ assets/js/data-ex/devices.json

const fs = require('fs');
const path = require('path');

// ===== 1) กำหนด path ปลายทาง =====
const outputPath = path.join(__dirname, 'assets/js/data-ex/devices.json');

// ===== 2) ข้อมูลฐาน สถานที่หลายจุดต่อจังหวัด =====
const baseLocations = [
  // พิษณุโลก
  { จังหวัด: 'พิษณุโลก', สถานที่: 'ศาลากลางจังหวัดพิษณุโลก', lat: 16.8285, lng: 100.2620 },
  { จังหวัด: 'พิษณุโลก', สถานที่: 'โรงพยาบาลพุทธชินราช',     lat: 16.8298, lng: 100.2592 },
  { จังหวัด: 'พิษณุโลก', สถานที่: 'สถานีตำรวจภูธรเมืองพิษณุโลก', lat: 16.8242, lng: 100.2629 },
  { จังหวัด: 'พิษณุโลก', สถานที่: 'ที่ว่าการอำเภอวังทอง',      lat: 16.4225, lng: 100.3421 },

  // สุโขทัย
  { จังหวัด: 'สุโขทัย', สถานที่: 'ศาลากลางจังหวัดสุโขทัย',   lat: 17.0051, lng: 99.8254 },
  { จังหวัด: 'สุโขทัย', สถานที่: 'โรงพยาบาลสุโขทัย',         lat: 17.0135, lng: 99.8230 },
  { จังหวัด: 'สุโขทัย', สถานที่: 'ที่ว่าการอำเภอศรีสัชนาลัย', lat: 17.5070, lng: 99.8181 },

  // อุตรดิตถ์
  { จังหวัด: 'อุตรดิตถ์', สถานที่: 'สำนักงานจังหวัดอุตรดิตถ์', lat: 17.6221, lng: 100.0948 },
  { จังหวัด: 'อุตรดิตถ์', สถานที่: 'โรงพยาบาลอุตรดิตถ์',     lat: 17.6252, lng: 100.1012 },
  { จังหวัด: 'อุตรดิตถ์', สถานที่: 'ที่ว่าการอำเภอลับแล',      lat: 17.6155, lng: 100.0205 },

  // เพชรบูรณ์
  { จังหวัด: 'เพชรบูรณ์', สถานที่: 'ศาลากลางจังหวัดเพชรบูรณ์',   lat: 16.4211, lng: 101.1553 },
  { จังหวัด: 'เพชรบูรณ์', สถานที่: 'โรงพยาบาลเพชรบูรณ์',       lat: 16.4238, lng: 101.1590 },
  { จังหวัด: 'เพชรบูรณ์', สถานที่: 'ที่ว่าการอำเภอหล่มสัก',      lat: 16.8845, lng: 101.2501 },

  // ตาก
  { จังหวัด: 'ตาก', สถานที่: 'ศาลากลางจังหวัดตาก',         lat: 16.8830, lng: 99.1250 },
  { จังหวัด: 'ตาก', สถานที่: 'สถานีตำรวจภูธรเมืองตาก',    lat: 16.8742, lng: 99.1259 },
  { จังหวัด: 'ตาก', สถานที่: 'ที่ว่าการอำเภอแม่สอด',       lat: 16.7168, lng: 98.5701 }
];

const types = [
  'Switch',
  'Router',
  'CCTV',
  'วิทยุสื่อสาร',
  'UPS',
  'Access Point',
  'Server',
  'NVR',
  'Firewall'
];

const statuses = ['online', 'offline', 'maintenance'];

// ===== 3) helper function ต่าง ๆ =====

// สุ่ม IP
function genIp() {
  const a = Math.floor(Math.random() * 7) + 1;    // 1–7
  const b = Math.floor(Math.random() * 256);      // 0–255
  const c = Math.floor(Math.random() * 254) + 1;  // 1–254
  return `10.${a}.${b}.${c}`;
}

// jitter พิกัดรอบ base location
function jitter(base, delta) {
  return base + (Math.random() * 2 - 1) * delta;  // base ± delta
}

// ===== 4) generate ข้อมูล =====
const devices = [];
const TOTAL = 150; // เปลี่ยนเป็น 100–300 ได้ตามต้องการ

for (let i = 1; i <= TOTAL; i++) {
  const loc = baseLocations[Math.floor(Math.random() * baseLocations.length)];
  const type = types[Math.floor(Math.random() * types.length)];
  const status = statuses[Math.floor(Math.random() * statuses.length)];

  const hasIp = Math.random() < 0.65;  // ~65% มี IP
  const ip = hasIp ? genIp() : null;

  const lat = Number(jitter(loc.lat, 0.005).toFixed(6)); // +/- ~500m
  const lng = Number(jitter(loc.lng, 0.005).toFixed(6));

  devices.push({
    id: i,
    ประเภท: type,
    lat: lat,
    lng: lng,
    สถานที่: loc.สถานที่,
    จังหวัด: loc.จังหวัด,
    ip: ip,
    สถานะ: status
  });
}

// ===== 5) เขียนไฟล์ JSON =====
fs.mkdirSync(path.dirname(outputPath), { recursive: true });

fs.writeFileSync(outputPath, JSON.stringify(devices, null, 2), 'utf8');

console.log(`✅ สร้างไฟล์ devices.json แล้ว: ${outputPath}`);
console.log(`   จำนวนอุปกรณ์: ${devices.length} จุด`);
