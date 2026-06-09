# V1 Backup & Recovery Guide

## ✅ สถานะ V1 Stable (2026-06-09)

| รายการ | ข้อมูล |
|--------|--------|
| **Git Branch** | `v1-stable` (สามารถ checkout ได้) |
| **Git Tag** | `v1` |
| **Database Snapshot** | `app_state_v1_snapshot` table ใน Supabase |
| **Snapshot Time** | 2026-06-09 08:37:15 UTC |
| **Data Size** | ~12.7 KB JSON |
| **Features Working** | ✅ All 14 modules + Supabase persistence + realtime cross-tab sync |

---

## 🔄 How to Use V1 Backup

### **Scenario 1: ต้องดูเวอร์ชัน V1 (code เท่านั้น)**

```bash
# เปลี่ยน local branch ไป v1-stable
git checkout v1-stable

# ทำการแก้/เพิ่มเติมได้
# แต่อย่าลืม merge กลับ main ถ้าต้องการ
```

⚠️ **Note:** Repository มี code เดียวกันทั้ง main และ v1-stable (sync point)
- ถ้าต้อง view history: `git log --oneline v1..main` (commits ที่ใหม่กว่า V1)

---

### **Scenario 2: ต้องกู้ database กลับไป V1**

**เมื่อไหร่ใช้:**
- V2 มีบั้ก database
- ต้องทำความสะอาดข้อมูลทดลอง
- ต้องเทียบข้อมูลเก่า V1

**ขั้นตอน:**

1. **เปิด Supabase Dashboard**
   - ไปที่ SQL Editor
   - Copy-paste ทั้งหมดจากไฟล์ `scripts/restore-v1.sql`
   - กดรัน

2. **รอ realtime sync** (~1-2 วินาที)
   - ทุก tab ที่เปิด app จะอัปเดตอัตโนมัติ
   - ไม่ต้อง refresh ด้วยซ้ำ

3. **ตรวจสอบ:**
   - ดูข้อมูลใน app เหมือนวันที่ 9 มิ.ย. 08:37 UTC
   - ถ้า dev ต่างประเทศ ลบ 7 ชั่วโมง = 09:37 +7 (ไทย)

---

### **Scenario 3: สร้าง V2 Snapshot ก่อนไปต่อ**

หลังจากใช้ V2 สักพักแล้ว อยาก backup V2 เพื่อ safety:

```sql
-- ใน Supabase SQL Editor
insert into app_state_v1_snapshot
select id, data, client_id, updated_at, now(), 'v2-' || to_char(now(), 'YYYY-MM-DD HH24:MI:SS')
from app_state;

-- ตรวจสอบ
select snapshot_version, snapshot_created_at from app_state_v1_snapshot 
order by snapshot_created_at desc limit 5;
```

---

## 📋 Recovery Checklist

| ขั้นตอน | ทำหรือไม่ |
|--------|----------|
| ✅ Git branch `v1-stable` สร้าง | Done |
| ✅ Git tag `v1` สร้าง | Done |
| ✅ Database snapshot `app_state_v1_snapshot` บันทึก | Done |
| ✅ Restore script `scripts/restore-v1.sql` เตรียม | Done |
| ✅ Realtime sync ตรวจสอบ | Tested ✓ |

---

## 🆘 Troubleshooting

### **Q: Restore ไป V1 แล้วเอา V2 ของหาย ต้องทำไง?**
→ Script `restore-v1.sql` มีขั้น "STEP 2: Backup current state" ที่จะบันทึก V2 ลง `app_state_v1_snapshot` เป็น `v2-YYYY-MM-DD` กลับมาได้

### **Q: 2 tab ไม่ sync หลัง restore?**
→ Refresh ด้วย Ctrl+F5 (hard refresh) เพื่อให้ subscribe realtime ทำงานใหม่

### **Q: Restore script syntax error?**
→ ตรวจสอบว่า Supabase SQL Editor รองรับ PostgreSQL เวอร์ชันใหม่ (v15+) ได้ — ถ้าไม่ได้บอกผมเดี๋ยวแก้

---

## 📌 Summary

- **V1 branch:** ที่เด็ดสำหรับ code rollback
- **V1 snapshot:** ที่เด็ดสำหรับ database rollback
- **Realtime sync:** ตัวช่วยให้ทุกที่อัปเดตพร้อมกัน ✨

ถ้าจะพัฒนา V2 ต่อ ไปเลยได้เลย — backup ปลอดภัยแล้ว 🎯
