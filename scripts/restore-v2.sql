-- RESTORE V2 SNAPSHOT
-- ====================
-- ใช้เมื่อต้องกู้คืน app state กลับไปเป็น V2 (2026-06-09)
-- V2 = ระบบที่แก้ไข/ลบ master ได้, ผู้ใช้เริ่มจาก admin, login ตรวจจาก snapshot, สต็อกเริ่มที่ 0
-- วิธี:
--   1. เปิด Supabase dashboard → SQL Editor
--   2. copy-paste script นี้ทั้งก้อน
--   3. กดรัน (ระวัง: จะทับ current app_state!)

-- STEP 1: ตรวจสอบว่ามี v2 snapshot อยู่
select count(*) as v2_snapshot_rows from app_state_v1_snapshot where snapshot_version = 'v2-2026-06-09';

-- STEP 2: Backup current state ก่อนกู้คืน (เก็บเป็น live-<timestamp> เผื่ออยากย้อนกลับ)
insert into app_state_v1_snapshot (id, data, client_id, updated_at, snapshot_created_at, snapshot_version)
  select id, data, client_id, updated_at, now(), 'live-' || to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS')
  from app_state where id = 'main';

-- STEP 3: Restore V2 from snapshot
update app_state set data = snapshot.data, updated_at = now(), client_id = 'restore-v2'
from (select data from app_state_v1_snapshot where snapshot_version = 'v2-2026-06-09') as snapshot
where app_state.id = 'main';

-- STEP 4: Verify
select 'RESTORED TO V2' as status,
  jsonb_array_length(coalesce(data->'users','[]'::jsonb)) as users,
  jsonb_array_length(coalesce(data->'fg','[]'::jsonb))    as fg,
  jsonb_array_length(coalesce(data->'lots','[]'::jsonb))  as lots,
  updated_at
from app_state where id = 'main';

-- NOTES:
-- - ทุก tab/browser จะได้รับ realtime update อัตโนมัติ (subscribe ทำงาน)
-- - ต้องกลับไป V1 (ข้อมูลตั้งต้นมี mock เต็ม) ใช้ scripts/restore-v1.sql แทน
