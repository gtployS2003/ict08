# Cloudflare Worker: Proxy vs Standalone Mode

## ภาพรวม

คุณมี 2 ทางเลือก:

| ลักษณะ | Proxy Mode | Standalone Mode |
|------|---------|---------|
| **ไฟล์** | (ที่คุณมี - proxy to PHP) | `line-webhook-standalone.js` (ใหม่) |
| **ฟังชั่น** | Forward → PHP backend | ตอบใน Worker เอง |
| **PHP Dependency** | ✅ ต้อง PHP ทำงาน | ❌ ไม่ต้อง PHP ทำงาน |
| **ACK Speed** | รอ PHP ตอบ (อาจ timeout) | ทันที (<100ms) ✅ |
| **Webhook Verify** | ✅ ผ่าน (ถ้า PHP fix) | ✅ ผ่าน (now) |
| **Support Buttons** | 3 ปุ่มจาก PHP DB/fallback | 3 ปุ่มจาก config ✅ |
| **Current Status** | ❌ PHP error 500 | ✅ Ready to go |

---

## เหตุผลเลือก Standalone (แนะนำสำหรับตอนนี้)

### ✅ Standalone ดีกว่า เพราะ:

1. **ทำงานได้เดี๋ยวนี้** - PHP backend ไม่ต้องแก้
2. **เร็วแน่วน** - Edge location ใกล้เคียง LINE servers
3. **Reliable** - ไม่ dependency PHP connectivity
4. **ง่ายต่อแก้ไข** - JavaScript ใน Worker ง่ายกว่า PHP
5. **ค่ำใช้ฟรี** - Cloudflare Worker free tier เพียง ~100k requests/day

### ❌ Proxy ปัญหา เพราะ:

1. PHP webhook ยัง error 500 (ต้องแก้ก่อน)
2. Proxy เพิ่ม latency (รอ PHP)
3. หาก PHP network ล้ม → webhook ไม่ได้

---

## วิธี Deploy Standalone (3 นาที)

### 1️⃣ Copy Code
```
ไปไฟล์: /cloudflare-worker/line-webhook-standalone.js
Copy ทั้งหมด
```

### 2️⃣ Paste ที่ Cloudflare
```
https://dash.cloudflare.com/
→ Workers & Pages
→ Create Worker (ชื่อ: line-webhook)
→ Edit Code
→ Paste code ข้างบน
→ Save and Deploy
```

### 3️⃣ ตั้ง Environment Variables
```
LINE_CHANNEL_SECRET = [from LINE Console]
LINE_CHANNEL_ACCESS_TOKEN = [from LINE Console]
SUPPORT_URL_CONFERENCE = https://ict8.moi.go.th/ict8/gcms/request-conference.html
SUPPORT_URL_REPAIR = https://ict8.moi.go.th/ict8/gcms/request-repair.html
SUPPORT_URL_OTHER = https://ict8.moi.go.th/ict8/gcms/request-other.html
```

### 4️⃣ อัปเดต LINE Console
```
Webhook URL = https://[your-worker].workers.dev
Click Verify ✅
```

### 5️⃣ ทดสอบ
```
ส่ง "ขอสนับสนุน" ใน LINE
→ 3 ปุ่มปรากฏทันที ✅
```

---

## ถ้าต่อมา PHP Config ได้

หาก ท่านแก้ PHP webhook ให้ทำงานได้ (เช่นแก้ error 500) คุณสามารถ:

1. **Revert to Proxy Mode** - ดีกว่าเพราะ dynamic buttons จาก DB
2. ตั้ง `ORIGIN_WEBHOOK_URL` → PHP webhook URL ใน Cloudflare Worker
3. Worker จะ proxy + ACK ทันที

แต่อย่างนี้ไม่เร่งรีบ - Standalone ทำงานได้ดี!

---

## สรุป

**ตอนนี้:** ใช้ Standalone Mode ✅
- เร็ว
- ทำงานได้เดี๋ยว
- ไม่ต้องแก้ PHP

**ท่อนนี้ (ถ้าแก้ PHP):** ย้าย Proxy Mode
- ดึง buttons จาก DB
- Dynamic configuration

---

**Document:** 2026-03-19  
**Status:** Ready  
