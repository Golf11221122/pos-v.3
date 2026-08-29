CHAIXI BAMEEKIAO POS MAIN — GLOBAL UX FEEDBACK & LOADING POLISH V3.13

ฐาน:
- pos-v.3-main (7).zip ที่ตรวจล่าสุด
- ไม่ย้อน UI V3.1-V3.11
- ไม่แตะ Critical Security V3.12 logic
- ไม่แตะ POS Sound V3.0.6

เพิ่ม UX ทั่วทั้งโปรเจกต์:
1. Navigation Progress Bar
   - กดเปลี่ยนหน้าจะมีเส้น Progress ด้านบน
   - ผู้ใช้รู้ทันทีว่าระบบรับคำสั่งแล้ว

2. Unified Toast
   - Success / Warning / Error / Info รูปแบบเดียวกัน
   - อ่านข้อความจาก .message / .page-message / .form-message
   - POS ไม่สร้าง Toast ซ้ำ เพราะ POS มีระบบ ui-feedback ของตัวเองอยู่แล้ว
   - ไม่มีเสียงเพิ่ม จึงไม่ชนเสียง POS

3. Automatic Busy Visual
   - ถ้า JS เดิมเปลี่ยนปุ่มจาก enabled -> disabled
     ปุ่มจะแสดง spinner อัตโนมัติ
   - V3.13 ไม่ disable ปุ่มเอง จึงไม่เปลี่ยน business logic
   - ปุ่มที่ disabled ตั้งแต่โหลดหน้าไม่ถูกตีความว่า loading

4. Modal Motion
   - Modal เปิดนุ่มขึ้น
   - รองรับ prefers-reduced-motion

5. Skeleton / aria-busy Foundation
   - มี .jj-skeleton และ aria-busy visual พร้อมใช้
   - ไม่บังคับใส่ข้อมูลปลอม

6. iPhone Safe Area
   - Toast / Bottom controls / Modal รองรับ safe-area ดีขึ้น

ไฟล์ที่แก้/เพิ่ม:
- css/pro-ui.css
- js/pro-ui.js
- HTML 26 หน้า เพื่อเปลี่ยน cache version เป็น v3.13.0

สำคัญ:
- ไม่แก้ JS ของ Dashboard / POS / Shift / Kitchen / Employees / Reports
- ไม่แก้ SQL / Supabase / RPC
- ไม่แก้ Auth / Role / Stock / Payment
- ไม่แก้ระบบเสียง POS

ติดตั้ง:
1. แทน POS MAIN/css/pro-ui.css
2. แทน POS MAIN/js/pro-ui.js
3. แทน HTML ทั้งหมดที่อยู่ใน ZIP
4. Commit / Deploy
5. Hard Reload 1 ครั้ง
6. ทดสอบ Desktop + iPhone:
   Login -> Dashboard -> POS -> Shift -> Kitchen -> Employees -> Reports

READY:
CHAIXI BAMEEKIAO GLOBAL UX FEEDBACK LOADING POLISH V3.13 READY
