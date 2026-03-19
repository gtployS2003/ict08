<!-- CLOUDFLARE WORKER SETUP GUIDE -->
# 🚀 Cloudflare Worker Setup for LINE Webhook

## ปัญหา
- PHP webhook (origin) ตอบ HTTP 500 เพราะปัญหา PHP code
- Line webhook verify ไม่ผ่าน
- ต้องการวิธีที่เร็ว โดยไม่ต้องแก้ PHP

## วิธีแก้: Standalone Cloudflare Worker
ใช้ Worker ตอบ LINE webhook โดยตรง **จากการ์ Cloudflare Edge** (ไม่ proxy ไป PHP)

✅ Signature verification ใน Worker  
✅ ACK ส่งทันที (<100ms) จากทั่วโลก   
✅ ตอบ 3 ปุ่ม "ขอสนับสนุน" ได้เลย  
✅ ไม่ต้องรอ PHP ประมวลผล  

---

## Step 1️⃣: Copy Worker Code

เลือกตามต้องการ:

### Option A: Standalone Mode (แนะนำ)
ใช้ `line-webhook-standalone.js` - ตอบ LINE webhook เองแบบเต็ม

### Option B: Proxy Mode (ถ้า PHP ต่อมา fixed)
ใช้ worker ที่ forward ไป PHP backend (ที่คุณมีอยู่แล้ว)

---

## Step 2️⃣: สร้าง Cloudflare Worker

ไปที่ https://dash.cloudflare.com/

1. ไปที่ **Workers & Pages** → **Create Application**
2. เลือก **Create Worker** (ไม่ต้อง create route ตอนนี้)
3. ชื่อ worker: `line-webhook` (หรือชื่อไหนก็ได้)
4. คลิก **Deploy**

---

## Step 3️⃣: แก้ไข Worker Code

1. ที่หน้า Worker ของเรา คลิก **Edit Code**
2. ลบ code ที่มีอยู่ทั้งหมด
3. Copy-Paste entire code from:
   - `/cloudflare-worker/line-webhook-standalone.js`
4. คลิก **Save and Deploy**

---

## Step 4️⃣: ตั้ง Environment Variables

ใน Cloudflare Worker Dashboard:

1. ไปที่ **Settings** → **Variables**

### Add Secrets (🔒 ซ่อน):
```
NAME: LINE_CHANNEL_SECRET
VALUE: [copy จาก LINE Developers Console]

NAME: LINE_CHANNEL_ACCESS_TOKEN
VALUE: [copy จาก LINE Developers Console]
```

คลิก "Encrypt" สำหรับแต่ละอัน

### Add Variables (ปกติ):
```
NAME: SUPPORT_URL_CONFERENCE
VALUE: https://ict8.moi.go.th/ict8/gcms/request-conference.html

NAME: SUPPORT_URL_REPAIR
VALUE: https://ict8.moi.go.th/ict8/gcms/request-repair.html

NAME: SUPPORT_URL_OTHER
VALUE: https://ict8.moi.go.th/ict8/gcms/request-other.html
```

คลิก **Deployments** เพื่ออัปเดต worker

---

## Step 5️⃣: ดู Worker URL

ที่หน้า Worker dashboard คุณจะเห็น:
```
https://[worker-name].[account-hash].workers.dev
```

เช่น: `https://line-webhook.sirichat2003.workers.dev`

สำคัญ! **จดลิงค์นี้ไว้**

---

## Step 6️⃣: LINE Developers Console - อัปเดต Webhook URL

ไปที่ https://developers.line.biz/console

1. ไปที่ LINE Bot ของเรา
2. **Messaging API** tab
3. Webhook URL: เปลี่ยนจาก
   ```
   https://ict8.moi.go.th/ict8/backend/public/line_webhook.php
   ```
   เป็น:
   ```
   https://[your-worker-url].workers.dev
   ```
4. ✏️ คลิก **Edit**
5. ปิด **Use webhook** แล้ว เปิดใหม่
6. คลิก **Verify** 

✅ ควรแสดง **Success** (ถ้า env variables ตั้งครบ)

---

## Step 7️⃣: ทดสอบ

### Test 1: ตรวจเช็ค Worker Config (optional)
```bash
curl "https://[your-worker-url].workers.dev/?debug=1"
```

Output:
```json
{
  "ok": true,
  "mode": "STANDALONE (no PHP proxy)",
  "configuration": {
    "haveSecret": true,
    "haveToken": true,
    "urls": {
      "conference": true,
      "repair": true,
      "other": true
    }
  }
}
```

### Test 2: ทดสอบ webhook ACK
```bash
curl -X POST https://[your-worker-url].workers.dev \
  -H "X-Line-Signature: test" \
  -H "Content-Type: application/json" \
  -d '{"events":[]}' \
  -w "\nHTTP: %{http_code}\n"
```

ควรเห็น:
```
OK
HTTP: 200 ✅
```

### Test 3: ทดสอบจริงใน LINE

ส่งข้อความไป LINE Bot:
```
ขอสนับสนุน
```

ควรเห็น 3 ปุ่มปรากฏทันที:
- ✅ ขอสนับสนุนห้องประชุม
- ✅ แจ้งเสีย/ซ่อมอุปกรณ์
- ✅ ขอใช้บริการอื่น ๆ

---

## Troubleshooting

### ❌ Webhook Verify ล้มเหลว ("Invalid signature")
**ตรวจสอบ:**
- ✓ LINE_CHANNEL_SECRET ตั้งถูก (copy exact จาก LINE Console)
- ✓ ตั้งเป็น **Secret** ไม่ใช่ Variable
- ✓ Deploy ใหม่หลังจากตั้ง variables

### ❌ Webhook Verify ล้มเหลว ("Missing LINE_CHANNEL_SECRET")
**ตรวจสอบ:**
- ✓ ตั้ง LINE_CHANNEL_SECRET แล้ว?
- ✓ เปิด "Encrypt" สำหรับ secrets?
- ✓ คลิก Deploy/save ใหม่?

### ❌ ข้อความเข้ามา แต่ไม่เห็นปุ่ม 3 ตัว
**ลองดู:**
- ตรวจสอบ LOG ใน Cloudflare Dashboard: **Logs** → **Real-time logs**
- ดูว่ามี error ไหม
- ตรวจสอบ SUPPORT_URL_* ตั้งถูกไหม

### ❌ Cloudflare อื่นปัญหา?
ลอง:
```bash
# ทดสอบ worker health
curl https://[your-worker-url].workers.dev/

# ควรเห็น: OK
```

---

## ข้อมูลเพิ่มเติม

### Proxy Mode (ถ้าต้องการ)
ถ้าหลังจากนี้แก้ PHP webhook ให้ทำงานได้ คุณสามารถ:
- ใช้ worker ที่ forward ไป PHP origin
- ก็คงการกำหนด `ORIGIN_WEBHOOK_URL` ใน variables

### Debug Mode
เพื่อให้ worker แสดง error details:
```
ตั้ง DEBUG_KEY = randomstring

ที่ GET /?debug=1&key=randomstring
```

---

## Further Reading

- LINE Messaging API: https://developers.line.biz/en/docs/messaging-api/
- Cloudflare Workers: https://developers.cloudflare.com/workers/
- Flex Message Layout: https://developers.line.biz/en/docs/messaging-api/using-flex-messages/

---

**Created:** 2026-03-19  
**Status:** Ready to deploy  
**Contact:** Team ICT8
