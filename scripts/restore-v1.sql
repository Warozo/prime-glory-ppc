-- RESTORE V1 SNAPSHOT
-- ====================
-- ใช้เมื่อต้องกู้คืน app state กลับไปเป็น V1 (2026-06-09)
-- วิธี:
--   1. เปิด Supabase dashboard → SQL Editor
--   2. copy-paste script นี้ทั้งก้อน
--   3. กดรัน (ระวัง: จะทับ current app_state!)

-- STEP 1: ตรวจสอบว่ามี v1_snapshot อยู่
select count(*) as v1_snapshot_rows from app_state_v1_snapshot;

-- STEP 2: Backup current state ก่อนกู้คืน (เวลา restore ต่อถัดไป)
delete from app_state_v1_snapshot where snapshot_version like 'v2-%';
insert into app_state_v1_snapshot
  select id, data, client_id, updated_at, now(), 'v2-' || to_char(now(), 'YYYY-MM-DD HH24:MI:SS')
  from app_state;

-- STEP 3: Restore V1 from snapshot
update app_state set data = snapshot.data, updated_at = now()
from (select id, data from app_state_v1_snapshot where snapshot_version = 'v1-2026-06-09') as snapshot
where app_state.id = snapshot.id;

-- STEP 4: Verify (ตรวจสอบว่า restore สำเร็จ)
select 'RESTORED TO V1' as status,
  (select snapshot_created_at from app_state_v1_snapshot where snapshot_version = 'v1-2026-06-09') as restored_from_time,
  updated_at as app_state_updated_at,
  length(data::text) as data_size
from app_state where id = 'main';

-- NOTES:
-- - ทุก tab/browser จะได้รับ realtime update อัตโนมัติ (subscribe ทำงาน)
-- - ถ้าต้องกลับไป V1 อีกครั้ง เรียกใช้ script นี้ซ้ำได้
-- - ขอบคุณที่ใช้ V1 — Welcome to V2 features coming next 🚀
