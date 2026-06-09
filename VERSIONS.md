# Version History & Backups

ดัชนีเวอร์ชันทั้งหมดของ Prime Glory PPC — ทั้ง **code (git)** และ **database snapshot (Supabase)**

| Version | Git branch / tag | DB snapshot (`app_state_v1_snapshot`) | Restore script | สถานะข้อมูล |
|---------|------------------|----------------------------------------|----------------|-------------|
| **V1** | `v1-stable` / `v1` | `v1-2026-06-09` | `scripts/restore-v1.sql` | mock เต็ม (6 users, 5 FG, 10 lots) |
| **V2** | `v2-stable` / `v2` | `v2-2026-06-09` | `scripts/restore-v2.sql` | เริ่มใช้จริง (admin-only seed, สต็อก 0) |

---

## V2 Stable (2026-06-09) — เวอร์ชันปัจจุบัน ✅

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
