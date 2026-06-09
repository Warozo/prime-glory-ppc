-- RESTORE V3 SNAPSHOT
-- ====================
-- ใช้เมื่อต้องกู้คืน app state กลับไปเป็น V3 (2026-06-09)
-- V3 = ยกเลิกจอง+คืนสต็อก, สิทธิ์ตามบทบาท, กรอกลูกค้า/ผู้ขายเอง,
--      สต็อกแสดงล็อต, ปุ่มลบเฉพาะ admin/PPC, ติดตามการจัดหาวัตถุดิบ+แดชบอร์ด, เวลาแบบ 24 ชม.
-- วิธี:
--   1. เปิด Supabase dashboard -> SQL Editor
--   2. copy-paste script นี้ทั้งก้อน
--   3. กดรัน (ระวัง: จะทับ current app_state!)

-- STEP 1: ตรวจสอบว่ามี v3 snapshot อยู่
select count(*) as v3_snapshot_rows from app_state_v1_snapshot where snapshot_version = 'v3-2026-06-09';

-- STEP 2: Backup current state ก่อนกู้คืน (เก็บเป็น live-<timestamp>)
insert into app_state_v1_snapshot (id, data, client_id, updated_at, snapshot_created_at, snapshot_version)
  select id, data, client_id, updated_at, now(), 'live-' || to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS')
  from app_state where id = 'main';

-- STEP 3: Restore V3 from snapshot
update app_state set data = snapshot.data, updated_at = now(), client_id = 'restore-v3'
from (select data from app_state_v1_snapshot where snapshot_version = 'v3-2026-06-09') as snapshot
where app_state.id = 'main';

-- STEP 4: Verify
select 'RESTORED TO V3' as status,
  jsonb_array_length(coalesce(data->'users','[]'::jsonb)) as users,
  jsonb_array_length(coalesce(data->'orders','[]'::jsonb)) as orders,
  jsonb_array_length(coalesce(data->'lots','[]'::jsonb)) as lots,
  updated_at
from app_state where id = 'main';

-- NOTES:
-- - ทุก tab/browser จะได้รับ realtime update อัตโนมัติ
-- - กลับไปเวอร์ชันก่อนหน้าใช้ scripts/restore-v2.sql หรือ restore-v1.sql
