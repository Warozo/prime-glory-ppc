# Version History & Backups

ดัชนีเวอร์ชันทั้งหมดของ Prime Glory PPC — ทั้ง **code (git)** และ **database snapshot (Supabase)**

| Version | Git branch / tag | DB snapshot (`app_state_v1_snapshot`) | Restore script | สถานะข้อมูล |
|---------|------------------|----------------------------------------|----------------|-------------|
| **V1** | `v1-stable` / `v1` | `v1-2026-06-09` | `scripts/restore-v1.sql` | mock เต็ม (6 users, 5 FG, 10 lots) |
| **V2** | `v2-stable` / `v2` | `v2-2026-06-09` | `scripts/restore-v2.sql` | เริ่มใช้จริง (admin-only seed, สต็อก 0) |
| **V3** | `v3-stable` / `v3` | `v3-2026-06-09` | `scripts/restore-v3.sql` | ใช้งานจริง + ฟีเจอร์ครบ (ดูด้านล่าง) |

---

## V3 Stable (2026-06-09) — เวอร์ชันปัจจุบัน ✅

**Git:** branch `v3-stable`, tag `v3`, commit `b9dea69`
**DB snapshot:** `v3-2026-06-09`

### สิ่งที่เพิ่ม/เปลี่ยนจาก V2
- ↩️ **ยกเลิกจอง** — ใบสั่งที่ยังไม่เริ่มผลิต กดยกเลิกการจองได้ พร้อม **คืนวัตถุดิบที่เบิกไปแล้ว** กลับเข้าล็อต
- 🔐 **สิทธิ์ตามบทบาท** — admin (ทั้งหมด), PPC/บริหาร (ทั้งหมดยกเว้นจัดการผู้ใช้), คลังสินค้า (เฉพาะคลัง), ผลิต (เฉพาะการผลิต)
- ✏️ **กรอกเอง** — ชื่อลูกค้า (คำสั่งซื้อ) และผู้ขาย (รับเข้าวัตถุดิบ) เปลี่ยนจาก dropdown เป็นพิมพ์เอง
- 📦 **สต็อกแสดงล็อต** — คลิกแถววัตถุดิบเพื่อกางดูล็อตคงคลัง (เลขล็อต/ผู้ขาย/คงเหลือ/รับเข้า/หมดอายุ)
- 🗑️ **ปุ่มลบเฉพาะ admin + PPC** — ทุกหน้า (รายการสินค้า, BOM, designer, ผู้ใช้, คำสั่งซื้อ, ตั้งค่าสายการผลิต)
- 🚚 **ติดตามการจัดหาวัตถุดิบ** — ใบสั่งที่รอวัตถุดิบ บันทึกสถานะ (รอสั่งซื้อ/สั่งซื้อแล้ว/กำลังขนส่ง) + วันคาดการณ์ → แสดงบนแดชบอร์ด
- 🕐 **เวลาแบบ 24 ชม.** — รายงานผลผลิตเลือกเวลาแบบ dropdown 00–23 : 00–59 (ไม่มี AM/PM)

### กู้คืน V3
```bash
git checkout v3-stable          # code
```
```sql
-- database: เปิด Supabase SQL Editor แล้วรัน scripts/restore-v3.sql
```

---

## V2 Stable (2026-06-09)

**Git:** branch `v2-stable`, tag `v2`, commit `d54a1fb`
**DB snapshot:** `v2-2026-06-09`

### สิ่งที่เพิ่ม/เปลี่ยนจาก V1
- 🗂️ **Item Master** — แก้ไข/ลบ วัตถุดิบ + สินค้าสำเร็จรูป (ชื่อ TH/EN แยก, มี guard กันลบของที่ถูกใช้)
- 🧪 **BOM** — แก้ไข/ลบ สินค้าสำเร็จรูปจากลิสต์ (ลบ FG ลบสูตรด้วย)
- ⚙️ **Designer** — ลบเทมเพลตกระบวนการ + คลังขั้นตอนเพิ่ม/ลบได้ (มี icon picker)
- 👤 **User Management** — เพิ่ม/แก้ไข/ลบ ผู้ใช้ (กันลบ admin คนสุดท้าย)
- 🔑 **Login** — ตรวจรหัสจาก Supabase snapshot (user ที่เพิ่มเองภายหลัง login ได้)
- 🧹 **Cleared** — stock, receiving, FG stock = 0 · users เหลือ admin (seed)

### กู้คืน V2
```bash
git checkout v2-stable          # code
```
```sql
-- database: เปิด Supabase SQL Editor แล้วรัน scripts/restore-v2.sql
```

---

## V1 Stable (2026-06-09)

**Git:** branch `v1-stable`, tag `v1`
**DB snapshot:** `v1-2026-06-09`
รายละเอียดเต็ม + troubleshooting ดูที่ `V1-BACKUP-INFO.md`

### กู้คืน V1
```bash
git checkout v1-stable
```
```sql
-- database: เปิด Supabase SQL Editor แล้วรัน scripts/restore-v1.sql
```

---

## วิธีสร้าง snapshot ใหม่ก่อนทำงานต่อ (เผื่อ safety)
```sql
-- ใน Supabase SQL Editor — เก็บ state ปัจจุบันเป็นเวอร์ชันใหม่
insert into app_state_v1_snapshot (id, data, client_id, updated_at, snapshot_created_at, snapshot_version)
select id, data, client_id, updated_at, now(), 'v3-' || to_char(now(), 'YYYY-MM-DD')
from app_state where id = 'main';
```

## หมายเหตุ
- Restore แต่ละครั้ง script จะ **backup state ปัจจุบันก่อนเสมอ** (เป็น `live-<timestamp>`) จึงย้อนกลับได้
- ทุก tab/เครื่องที่เปิดอยู่จะ sync ตาม realtime หลัง restore
- Snapshot ทั้งหมดอยู่ในตาราง `app_state_v1_snapshot` (ดูได้: `select snapshot_version, snapshot_created_at from app_state_v1_snapshot;`)
