JOKJUNG — REMAINING PAGES PROFESSIONAL UX/UI V3.11

รอบรวมหน้าที่เหลือทั้งหมดจากโปรเจกต์ POS MAIN

ทำพร้อมกัน 16 หน้า:
- cancellation-history.html
- categories.html
- cost-control.html
- customer-order.html
- index.html
- ingredients.html
- inventory-report.html
- kitchen-stations.html
- marketing.html
- modifier-options.html
- products.html
- promotions.html
- recipes.html
- reset-password.html
- stock-movements.html
- tables.html

แนวทาง:
- ใช้โปรเจกต์เต็มล่าสุด pos-v.3-main (6) เป็นฐาน
- ใช้ Global Professional UX/UI V3.1 ต่อ
- เพิ่ม shared targeted layer ใหม่: css/pro-ui-remaining-v3.11.css
- ไม่เขียนทับ CSS เดิม 16 ไฟล์ จึงลดความเสี่ยง regression
- ไม่แตะหน้า Dashboard/Shift/Kitchen/Employees/Audit/Employee Activity/Sales History/Order History/Sales Report ที่อัปเกรดแยกแล้ว
- ไม่แตะ POS Professional V3.0.5.1 / Sound V3.0.6
- ไม่แก้ JavaScript business logic
- ไม่แก้ SQL / Supabase / RPC
- ไม่แก้ Auth / Stock / Cost / Promotion / Table / Recipe logic

ครอบคลุม:
- Login + Reset Password
- Categories
- Products
- Ingredients
- Inventory Report
- Stock Movements
- Recipes
- Modifier Options
- Kitchen Stations
- Tables
- Marketing
- Promotions
- Cost Control
- Cancellation History
- Customer Order

ไฟล์ใหม่:
- css/pro-ui-remaining-v3.11.css

HTML ที่แก้:
- 16 ไฟล์ตามรายการด้านบน

ติดตั้ง:
1. เพิ่ม POS MAIN/css/pro-ui-remaining-v3.11.css
2. แทน HTML 16 ไฟล์ที่อยู่ใน ZIP
3. ต้องมี css/pro-ui.css + js/pro-ui.js จาก V3.1 อยู่แล้ว
4. ไม่ต้องแทน CSS เดิมของ 16 หน้า
5. ไม่ต้องรัน SQL
6. Commit / Deploy
7. Hard Reload
8. ทดสอบ Desktop + Mobile

หมายเหตุ:
- ZIP นี้มีเฉพาะไฟล์ที่แก้/เพิ่ม
- หน้า POS และหน้าที่ทำ V3.2-V3.10 แล้วไม่ได้ถูกใส่มา จึงไม่ย้อนเวอร์ชัน

READY:
JOKJUNG REMAINING PAGES PROFESSIONAL UXUI V3.11 READY
