JOKJUNG — GLOBAL PROFESSIONAL UX/UI V3.1

ฐานที่ใช้:
pos-v.3-main (6).zip ที่ผู้ใช้ส่งมา

แนวทาง:
- ไม่เขียนทับ logic เดิมของแต่ละหน้า
- ไม่แก้ SQL / Supabase / RPC
- ไม่ย้อน POS Professional V3.0.5.1
- ไม่แตะระบบเสียง POS V3.0.6
- เพิ่ม Shared UI Layer หลัง CSS เดิม เพื่อให้ทั้งโปรเจกต์เป็นภาษาภาพเดียวกัน
- เพิ่ม visual press feedback ให้ปุ่ม/ลิงก์ทุกหน้า
- Mobile touch target และ focus state ชัดขึ้น

ธีม:
- Navy #152033 = Primary
- Gold #c28b00 = Accent
- White / soft gray = Surface
- Green = Success
- Red = Danger
- Orange = Warning

ไฟล์ใหม่:
- css/pro-ui.css
- js/pro-ui.js

HTML ที่แก้ 26 ไฟล์:
- audit-log.html
- cancellation-history.html
- categories.html
- cost-control.html
- customer-order.html
- dashboard.html
- employee-activity.html
- employees.html
- index.html
- ingredients.html
- inventory-report.html
- kitchen-stations.html
- kitchen.html
- marketing.html
- modifier-options.html
- order-history.html
- pos.html
- products.html
- promotions.html
- recipes.html
- reset-password.html
- sales-history.html
- sales-report.html
- shift.html
- stock-movements.html
- tables.html

ติดตั้ง:
1. เพิ่ม POS MAIN/css/pro-ui.css
2. เพิ่ม POS MAIN/js/pro-ui.js
3. แทน HTML ทุกไฟล์ที่อยู่ใน ZIP นี้
4. ไม่ต้องแทน CSS/JS เดิมอื่น ๆ
5. ไม่ต้องรัน SQL
6. Commit / Deploy
7. Hard Reload 1 ครั้ง

ข้อดี:
ถ้าจะปรับธีมรอบต่อไป แก้หลัก ๆ ที่ pro-ui.css ไฟล์เดียว
ลดโอกาสย้อนเวอร์ชัน CSS ของแต่ละหน้า

READY:
JOKJUNG GLOBAL PROFESSIONAL UXUI V3.1 READY
