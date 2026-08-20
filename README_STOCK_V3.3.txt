JOKJUNG POS — STOCK V3.3

สิ่งที่เพิ่ม
- Checkout ใช้ RPC jokjung_create_pos_sale_v33
- BASE/BOM ยังคงใช้ create_pos_sale เดิม
- ตัวเลือก/เส้น/พิเศษ ตัด Stock จากกติกาของ Modifier Option
- DINE-IN / TAKEAWAY ตัด Stock เพิ่มตามกติกาของแต่ละเมนู
- Checkout เป็น transaction เดียว: ถ้า Stock ส่วนใดไม่พอ การขายจะ rollback
- VOID เรียกคืน Stock ชั้น Modifier + DINE-IN/TAKEAWAY เพิ่มเติมแบบ idempotent
- ต้นทุนสินค้า Sync จาก Recipe/BOM อัตโนมัติ

ก่อนอัปโหลด/ใช้งาน
1) รัน sql/jokjung-stock-v3.3-sale-rules.sql ใน Supabase SQL Editor ก่อน
2) อัปโหลดโปรเจกต์นี้ขึ้น GitHub
3) เปิด Back Office > กติกาตัด Stock ตอนขาย
4) ตั้งวัตถุดิบสำหรับ Option เช่น เส้น, พิเศษ และ DINE-IN/TAKEAWAY
5) ทดสอบขาย 1 บิล แล้วตรวจ Ingredient Stock Movement
6) ทดสอบ VOID แล้วตรวจ Stock คืน

หมายเหตุ
- Prep ที่ขายจะตัด Prep Stock โดยตรง ไม่ย้อนตัด Raw เพราะ Raw ถูกตัดตอน Production แล้ว
