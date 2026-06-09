/* ============================================================
   Supabase Data Layer — Prime Glory PPC System
   Fetches real data from Supabase + fallback to mock
   ============================================================ */
(function () {
  // Initialize Supabase client
  const SUPABASE_URL = 'https://onucjibwifwajzizlshv.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_jR8yyCqOQgAgKfac3TvTmw_APJ3u3ws';
  let supabase = null;

  try {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  } catch (e) {
    console.warn('Supabase not loaded, using fallback mock data');
  }

  // Fallback mock data
  const MOCK_DATA = {
    STEP_LIB: [
      { key: 'issue',   name: 'Material Issue',    nameTh: 'เบิกวัตถุดิบ',     dur: 1, ic: 'box' },
      { key: 'weigh',   name: 'Material Weighing', nameTh: 'ชั่งวัตถุดิบ',      dur: 1, ic: 'scale' },
      { key: 'mix',     name: 'Mixing',            nameTh: 'ผสม',             dur: 3, ic: 'blend' },
      { key: 'fill',    name: 'Filling',           nameTh: 'บรรจุ',            dur: 2, ic: 'fill' },
      { key: 'seal',    name: 'Sealing',           nameTh: 'ซีล',              dur: 1, ic: 'seal' },
      { key: 'box',     name: 'Boxing',            nameTh: 'ใส่กล่อง',         dur: 1, ic: 'box2' },
      { key: 'shrink',  name: 'Shrink Wrapping',   nameTh: 'หุ้มฟิล์ม',         dur: 1, ic: 'wrap' },
      { key: 'carton',  name: 'Carton Packing',    nameTh: 'แพ็คลัง',          dur: 1, ic: 'carton' },
      { key: 'qc',      name: 'In-line QC',        nameTh: 'ตรวจสอบคุณภาพ',    dur: 1, ic: 'qc' },
      { key: 'label',   name: 'Labeling',          nameTh: 'ติดฉลาก',          dur: 1, ic: 'label' },
    ],
    RAW: [
      { code: 'RM001', name: 'Rose Hydrosol Base', nameTh: 'เบสน้ำกุหลาบ',     unit: 'kg', cat: 'Base', status: 'A' },
      { code: 'RM002', name: 'Hyaluronic Acid',    nameTh: 'ไฮยาลูรอนิค',      unit: 'kg', cat: 'Active', status: 'A' },
      { code: 'RM003', name: 'Rose Fragrance Oil', nameTh: 'น้ำมันหอมกุหลาบ',  unit: 'kg', cat: 'Fragrance', status: 'A' },
      { code: 'RM004', name: 'Vitamin C (SAP)',    nameTh: 'วิตามินซี',        unit: 'kg', cat: 'Active', status: 'A' },
      { code: 'RM005', name: 'Niacinamide',        nameTh: 'ไนอาซินาไมด์',     unit: 'kg', cat: 'Active', status: 'A' },
      { code: 'RM006', name: 'Glycerin USP',       nameTh: 'กลีเซอรีน',        unit: 'kg', cat: 'Base', status: 'A' },
      { code: 'RM010', name: 'Glass Dropper 5ml',  nameTh: 'ขวดหยด 5มล.',      unit: 'pcs', cat: 'Packaging', status: 'A' },
      { code: 'RM011', name: 'Serum Carton',       nameTh: 'กล่องเซรั่ม',      unit: 'pcs', cat: 'Packaging', status: 'A' },
    ],
    FG: [
      { code: 'FG001', name: 'Rose Serum 5g',         nameTh: 'โรสเซรั่ม 5g',        unit: 'pcs', cat: 'Serum', status: 'A' },
      { code: 'FG002', name: 'Vitamin C Brightening Serum', nameTh: 'เซรั่มวิตามินซี', unit: 'pcs', cat: 'Serum', status: 'A' },
      { code: 'FG003', name: 'Velvet Matte Foundation', nameTh: 'รองพื้นเวลเวท',    unit: 'pcs', cat: 'Foundation', status: 'A' },
      { code: 'FG004', name: 'Rosé Tinted Lip Balm',  nameTh: 'ลิปบาล์มกุหลาบ',    unit: 'pcs', cat: 'Lip', status: 'A' },
    ],
    LINES: [
      { id: 'L01', name: 'Line 1 — Serum', manpower: 5, dailyCap: 500 },
      { id: 'L02', name: 'Line 2 — Foundation', manpower: 6, dailyCap: 400 },
    ],
    WORKFLOWS: [
      { id: 'WF-A', name: 'Serum Line (Line 1)', line: 'L01', steps: [] },
      { id: 'WF-B', name: 'Foundation Line (Line 2)', line: 'L02', steps: [] },
    ],
    USERS: [
      { id: '1', username: 'admin', password: 'prime888', role: 'admin', fullName: 'Administrator', status: 'A' },
      { id: '2', username: 'ppc001', password: 'ppc123', role: 'ppc', fullName: 'PPC Planner', status: 'A' },
      { id: '3', username: 'warehouse', password: 'wh123', role: 'warehouse', fullName: 'Warehouse Manager', status: 'A' },
      { id: '4', username: 'production', password: 'prod123', role: 'production', fullName: 'Production Manager', status: 'A' },
    ],
    ORDERS: [],
    SCHEDULES: [],
    CUSTOMERS: [
      { id: '1', code: 'C001', name: 'Cosmetics Express', phone: '02-123-4567' },
      { id: '2', code: 'C002', name: 'Beauty Plus', phone: '02-234-5678' },
    ],
  };

  // Async function to load data from Supabase
  async function loadFromSupabase() {
    if (!supabase) return MOCK_DATA;

    try {
      const [materials, fgs, lines, steps, users, customers] = await Promise.all([
        supabase.from('materials').select('*').eq('status', 'A'),
        supabase.from('finished_goods').select('*').eq('status', 'A'),
        supabase.from('production_lines').select('*').eq('status', 'A'),
        supabase.from('production_steps').select('*').order('sequence'),
        supabase.from('users').select('*').eq('status', 'A'),
        supabase.from('customers').select('*').eq('status', 'A'),
      ]);

      const data = { ...MOCK_DATA };
      if (materials.data) data.RAW = materials.data.map(m => ({
        code: m.code, name: m.name, nameTh: m.name_th, unit: m.unit, cat: m.category, status: m.status
      }));
      if (fgs.data) data.FG = fgs.data.map(f => ({
        code: f.code, name: f.name, nameTh: f.name_th, unit: f.unit, cat: f.category, status: f.status
      }));
      if (lines.data) data.LINES = lines.data.map(l => ({
        id: l.code, name: l.name, manpower: l.manpower, dailyCap: l.daily_capacity
      }));
      if (steps.data) data.STEP_LIB = steps.data.map(s => ({
        key: s.code, name: s.name, nameTh: s.name_th, dur: Math.ceil(s.duration_hours || 1), ic: 'task'
      }));
      if (users.data) data.USERS = users.data.map(u => ({
        id: u.id, username: u.username, password: '', role: u.role_id, fullName: u.full_name_en, status: u.status
      }));
      if (customers.data) data.CUSTOMERS = customers.data.map(c => ({
        id: c.id, code: c.code, name: c.name, phone: c.phone
      }));
      return data;
    } catch (e) {
      console.warn('Failed to load from Supabase:', e.message);
      return MOCK_DATA;
    }
  }

  window.PG_DATA_LOADER = loadFromSupabase;

  // buildState() — returns mutable state, now async-aware
  window.PG_DATA = {
    buildState: async function() {
      const data = await loadFromSupabase();
      const today = new Date(2026, 5, 6);
      function d(offset) { const x = new Date(today); x.setDate(x.getDate() + offset); return x.toISOString().slice(0, 10); }

      return {
        steps: data.STEP_LIB,
        materials: data.RAW,
        finished_goods: data.FG,
        lines: data.LINES,
        workflows: data.WORKFLOWS,
        users: data.USERS,
        orders: data.ORDERS,
        schedules: data.SCHEDULES || [],
        customers: data.CUSTOMERS || [],

        // Gantt timeline
        gantt: {
          start: d(-5),
          end: d(25),
          lines: data.LINES,
          orders: data.SCHEDULES || [],
        },

        // Dashboard KPIs
        kpis: {
          ordersTotal: data.ORDERS.length,
          ordersScheduled: data.SCHEDULES ? data.SCHEDULES.length : 0,
          completionRate: 78,
          avgLeadTime: 4.2,
        },

        // Stock levels
        stock: data.RAW.map(m => ({
          code: m.code,
          name: m.name,
          quantity: 100 + Math.random() * 50,
          unit: m.unit,
          reorder: 50,
        })),

        // Charts
        chartData: {
          production: { labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], data: [450, 520, 480, 610, 550] },
          efficiency: { labels: ['L01', 'L02'], data: [92, 88] },
          materials: { labels: ['Active', 'Base', 'Packaging'], data: [35, 40, 25] },
        },
      };
    },
  };
})();
