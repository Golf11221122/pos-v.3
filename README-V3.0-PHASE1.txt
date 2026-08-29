CHAIXI BAMEEKIAO POS MAIN — V3.0 PHASE 1
PROFESSIONAL UI + SOUND FEEDBACK

อิงจากไฟล์จริงที่ผู้ใช้ส่งมา:
- pos.html
- pos.css
- pos (3).js

สิ่งที่เปลี่ยน:
- เปลี่ยนภาพรวม POS ให้เป็น Professional Restaurant POS
- ใช้โทนขาว/เทาเข้ม + ทองแบบสุขุม
- ปุ่มมี pressed state ชัดเจน
- Product card flash เมื่อตะสินค้า
- ปุ่มที่กำลังทำงานมี spinner
- Message สำเร็จ/เตือน/error แยกสี
- เสียง Tap ทุกปุ่มที่กดได้
- เสียง Success
- เสียง Warning
- เสียง Error
- ชำระเงินสำเร็จมีเสียง Success
- ส่งออเดอร์เข้าครัวสำเร็จมีเสียง Success
- เพิ่มสินค้าลงตะกร้ามีเสียง/visual feedback
- Error จากการส่งครัว/ชำระเงินมีเสียง Error
- ใช้ Web Audio API ไม่ต้องมีไฟล์ mp3/wav
- รองรับ iPhone: เสียงถูก unlock จาก gesture แรกของผู้ใช้

ไม่เปลี่ยน:
- Supabase
- SQL
- BOM/Stock
- Shift
- Kitchen
- Payment RPC
- Manager PIN
- Discount authorization
- Restaurant order logic

ไฟล์:
1. pos.html
2. css/pos.css
3. js/pos.js
4. js/ui-feedback.js (ไฟล์ใหม่)

ติดตั้ง:
1. POS MAIN/pos.html -> แทนไฟล์เดิม
2. POS MAIN/css/pos.css -> แทนไฟล์เดิม
3. POS MAIN/js/pos.js -> แทนไฟล์เดิม
4. POS MAIN/js/ui-feedback.js -> เพิ่มไฟล์ใหม่
5. Commit / Deploy
6. เปิด POS บน iPhone
7. แตะหน้าจอ 1 ครั้งเพื่อให้ Safari อนุญาต WebAudio
8. ทดสอบเพิ่มสินค้า / ยืนยันออเดอร์ / ชำระเงิน / error

SQL: ไม่ต้องรัน

READY:
CHAIXI BAMEEKIAO POS PROFESSIONAL UI SOUND V3.0 PHASE 1 READY
