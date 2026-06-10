-- RESTORE V4 SNAPSHOT
-- ====================
-- ใช้เมื่อต้องกู้คืน app state กลับไปเป็น V4 (2026-06-10)
-- V4 = multi-line split, การ์ด 3 สถานะผลิต, FEFO precision fix, เมนูล้างข้อมูล admin,
--      เรียงสาย A,B,C, แก้ drag&drop + ช่วงวันที่ Gantt, filter คำสั่งซื้อ, ลูกค้า free-text (FG sales),
--      พับ sidebar, สถานี QA (ดี/เสีย + Rework บางส่วน), กระดาน QA หลายขั้น, แก้ key แบบ cascade
-- วิธี:
--   1. เปิด Supabase dashboard -> SQL Editor
--   2. copy-paste script นี้ทั้งก้อน
--   3. กดรัน (ระวัง: จะทับ current app_state!)

-- STEP 1: ตรวจสอบว่ามี v4 snapshot อยู่
select count(*) as v4_snapshot_rows from app_state_v1_snapshot where snapshot_version = 'v4-2026-06-10';

-- STEP 2: Backup current state ก่อนกู้คืน (เก็บเป็น live-<timestamp>)
insert into app_state_v1_snapshot (id, data, client_id, updated_at, snapshot_created_at, snapshot_version)
  select id, data, client_id, updated_at, now(), 'live-' || to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS')
  from app_state where id = 'main';

-- STEP 3: Restore V4 from snapshot
update app_state set data = snapshot.data, updated_at = now(), client_id = 'restore-v4'
from (select data from app_state_v1_snapshot where snapshot_version = 'v4-2026-06-10') as snapshot
where app_state.id = 'main';

-- STEP 4: Verify
select 'RESTORED TO V4' as status,
  jsonb_array_length(coalesce(data->'users','[]'::jsonb)) as users,
  jsonb_array_length(coalesce(data->'orders','[]'::jsonb)) as orders,
  jsonb_array_length(coalesce(data->'lots','[]'::jsonb)) as lots,
  jsonb_array_length(coalesce(data->'lotsWip','[]'::jsonb)) as lots_wip,
  updated_at
from app_state where id = 'main';

-- NOTES:
-- - ทุก tab/browser จะได้รับ realtime update อัตโนมัติ
-- - กลับไปเวอร์ชันก่อนหน้าใช้ scripts/restore-v3.sql / restore-v2.sql / restore-v1.sql
