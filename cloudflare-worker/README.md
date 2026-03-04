# Cloudflare Worker – LINE Webhook (standalone)

กรณีที่ webhook ฝั่ง PHP (origin) เข้าถึงได้เฉพาะใน VPN/เครือข่ายภายใน
การทำ Worker แบบ proxy จะเจอ `origin_http=522` (Cloudflare ต่อไป origin ไม่ได้)

ไฟล์ `line-webhook-worker.js` คือ Worker ที่ “รับ LINE webhook แล้วตอบกลับเอง”
โดยจะเด้ง 3 ปุ่ม **ขอสนับสนุน** ทันที โดยไม่ต้องเรียก origin.

## ต้องตั้งค่าอะไรใน Cloudflare Worker

### Secrets (แนะนำให้ตั้งเป็น secret)
- `LINE_CHANNEL_SECRET`
- `LINE_CHANNEL_ACCESS_TOKEN`

### Variables (หรือ secret ก็ได้)
- `SUPPORT_URL_CONFERENCE`
- `SUPPORT_URL_REPAIR`
- `SUPPORT_URL_OTHER`

ตัวอย่าง URL (ปรับเป็นโดเมนที่เข้าถึงได้จากภายนอก)
- `https://<your-public-domain>/ict8/gcms/request-conference.html`
- `https://<your-public-domain>/ict8/gcms/request-repair.html`
- `https://<your-public-domain>/ict8/gcms/request-other.html`

### Debug (optional)
ตั้ง `DEBUG_KEY` เป็นค่า random แล้วเปิด:

- `https://<worker-url>/?debug=1&key=<DEBUG_KEY>`

จะเห็นว่าตั้งค่า secrets/urls ครบไหม (ไม่โชว์ค่า secret จริง)

## วิธีทดสอบ

1) ตั้ง Webhook URL ใน LINE Developers ให้ชี้มาที่ Worker URL
2) เปิด Use webhook
3) พิมพ์ "ขอสนับสนุน" ใน LINE หรือกด richmenu ที่ส่ง postback `ext:support`
4) ควรเด้ง 3 ปุ่มทันที

## หมายเหตุ
- Worker นี้ verify signature จาก `X-Line-Signature` ด้วย body แบบ raw bytes (ถูกต้องตาม LINE)
- หากต้องการกลับไปใช้ PHP origin ภายหลัง ให้แก้ให้ origin เข้าถึงได้จากอินเทอร์เน็ต/Cloudflare ก่อน
