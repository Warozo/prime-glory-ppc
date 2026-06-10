/* ============================================================
   Data store — Prime Glory cosmetics manufacturing
   buildState() seeds a fresh world; loadState/saveState/subscribe
   persist & sync the whole snapshot via Supabase (realtime).
   ============================================================ */
(function () {
  /* ---- Supabase client (shared persistence backend) ---- */
  const SUPABASE_URL = 'https://onucjibwifwajzizlshv.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_jR8yyCqOQgAgKfac3TvTmw_APJ3u3ws';
  let _supa = null;
  try { if (window.supabase) _supa = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY); }
  catch (e) { console.warn('Supabase init failed; running in-memory only', e); }
  const CLIENT_ID = Math.random().toString(36).slice(2) + Date.now().toString(36);
  const STEP_LIB = [
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
  ];

  const RAW = [
    { code: 'RM001', name: 'Rose Hydrosol Base', nameTh: 'เบสน้ำกุหลาบ',     unit: 'kg', cat: 'Base', status: 'A' },
    { code: 'RM002', name: 'Hyaluronic Acid',    nameTh: 'ไฮยาลูรอนิค',      unit: 'kg', cat: 'Active', status: 'A' },
    { code: 'RM003', name: 'Rose Fragrance Oil', nameTh: 'น้ำมันหอมกุหลาบ',  unit: 'kg', cat: 'Fragrance', status: 'A' },
    { code: 'RM004', name: 'Vitamin C (SAP)',    nameTh: 'วิตามินซี',        unit: 'kg', cat: 'Active', status: 'A' },
    { code: 'RM005', name: 'Niacinamide',        nameTh: 'ไนอาซินาไมด์',     unit: 'kg', cat: 'Active', status: 'A' },
    { code: 'RM006', name: 'Glycerin USP',       nameTh: 'กลีเซอรีน',        unit: 'kg', cat: 'Base', status: 'A' },
    { code: 'RM007', name: 'Titanium Dioxide',   nameTh: 'ไทเทเนียมไดออกไซด์', unit: 'kg', cat: 'Pigment', status: 'A' },
    { code: 'RM008', name: 'Iron Oxide Pigment', nameTh: 'ไอรอนออกไซด์',     unit: 'kg', cat: 'Pigment', status: 'A' },
    { code: 'RM009', name: 'Carnauba Wax',       nameTh: 'ไขคาร์นัวบา',      unit: 'kg', cat: 'Base', status: 'A' },
    { code: 'RM010', name: 'Glass Dropper 5ml',  nameTh: 'ขวดหยด 5มล.',      unit: 'pcs', cat: 'Packaging', status: 'A' },
    { code: 'RM011', name: 'Serum Carton',       nameTh: 'กล่องเซรั่ม',      unit: 'pcs', cat: 'Packaging', status: 'A' },
    { code: 'RM012', name: 'Foundation Pump 30ml', nameTh: 'หัวปั๊ม 30มล.',  unit: 'pcs', cat: 'Packaging', status: 'A' },
    { code: 'RM013', name: 'Lipstick Tube',      nameTh: 'แท่งลิปสติก',      unit: 'pcs', cat: 'Packaging', status: 'A' },
  ];

  const FG = [
    { code: 'FG001', name: 'Rose Serum 5g',         nameTh: 'โรสเซรั่ม 5g',        unit: 'pcs', cat: 'Serum', status: 'A' },
    { code: 'FG002', name: 'Vitamin C Brightening Serum', nameTh: 'เซรั่มวิตามินซี', unit: 'pcs', cat: 'Serum', status: 'A' },
    { code: 'FG003', name: 'Velvet Matte Foundation', nameTh: 'รองพื้นเวลเวท',    unit: 'pcs', cat: 'Foundation', status: 'A' },
    { code: 'FG004', name: 'Rosé Tinted Lip Balm',  nameTh: 'ลิปบาล์มกุหลาบ',    unit: 'pcs', cat: 'Lip', status: 'A' },
    { code: 'FG005', name: 'Niacinamide Pore Serum', nameTh: 'เซรั่มไนอาซินาไมด์', unit: 'pcs', cat: 'Serum', status: 'A' },
  ];

  const BOMS = {
    FG001: { version: 'v2.1', lines: [
      { rm: 'RM001', qty: 3.6, unit: 'g' }, { rm: 'RM002', qty: 0.5, unit: 'g' },
      { rm: 'RM003', qty: 0.1, unit: 'g' }, { rm: 'RM006', qty: 0.8, unit: 'g' },
      { rm: 'RM010', qty: 1, unit: 'pcs' }, { rm: 'RM011', qty: 1, unit: 'pcs' } ] },
    FG002: { version: 'v1.4', lines: [
      { rm: 'RM004', qty: 0.6, unit: 'g' }, { rm: 'RM006', qty: 2.0, unit: 'g' },
      { rm: 'RM002', qty: 0.3, unit: 'g' }, { rm: 'RM010', qty: 1, unit: 'pcs' }, { rm: 'RM011', qty: 1, unit: 'pcs' } ] },
    FG003: { version: 'v3.0', lines: [
      { rm: 'RM007', qty: 5.0, unit: 'g' }, { rm: 'RM008', qty: 1.2, unit: 'g' },
      { rm: 'RM006', qty: 8.0, unit: 'g' }, { rm: 'RM012', qty: 1, unit: 'pcs' } ] },
    FG004: { version: 'v1.1', lines: [
      { rm: 'RM009', qty: 2.4, unit: 'g' }, { rm: 'RM003', qty: 0.2, unit: 'g' },
      { rm: 'RM008', qty: 0.4, unit: 'g' }, { rm: 'RM013', qty: 1, unit: 'pcs' } ] },
    FG005: { version: 'v1.0', lines: [
      { rm: 'RM005', qty: 0.5, unit: 'g' }, { rm: 'RM006', qty: 1.8, unit: 'g' },
      { rm: 'RM002', qty: 0.3, unit: 'g' }, { rm: 'RM010', qty: 1, unit: 'pcs' }, { rm: 'RM011', qty: 1, unit: 'pcs' } ] },
  };

  const CUSTOMERS = ['Siam Beauty Co.', 'Lumina Cosmetics', 'Bloom Retail Group', 'Aura Skincare', 'Glow Pharma'];
  const SUPPLIERS = ['ChemSupply Asia', 'AromaSource Ltd.', 'PackPro Industries', 'PureActives Co.'];

  const LINES = [
    { id: 'A', name: 'Line A — Serum', manpower: 8, dailyCap: 12000 },
    { id: 'B', name: 'Line B — Foundation', manpower: 6, dailyCap: 8000 },
    { id: 'C', name: 'Line C — Lip & Color', manpower: 5, dailyCap: 6000 },
  ];

  function wf(keys) { return keys.map((k, i) => { const s = STEP_LIB.find(x => x.key === k); return { ...s, id: 'st' + i + '_' + k }; }); }
  const WORKFLOWS = [
    { id: 'WF-A', name: 'Serum Line (Line A)', line: 'A', steps: wf(['issue','weigh','mix','fill','seal','label','box','carton']) },
    { id: 'WF-B', name: 'Foundation Line (Line B)', line: 'B', steps: wf(['issue','weigh','mix','fill','qc','seal','box','shrink','carton']) },
    { id: 'WF-C', name: 'Lip & Color (Line C)', line: 'C', steps: wf(['issue','weigh','mix','fill','seal','label','carton']) },
  ];

  const _now = new Date();
  const today = new Date(_now.getFullYear(), _now.getMonth(), _now.getDate()); // real local "today" at load
  function d(offset) { const x = new Date(today); x.setDate(x.getDate() + offset); const y = x.getFullYear(), m = String(x.getMonth() + 1).padStart(2, '0'), dd = String(x.getDate()).padStart(2, '0'); return y + '-' + m + '-' + dd; }

  // Customer orders, mapped across the 5-status flow
  // Customer orders — empty so the user keys their own and walks the flow
  const ORDERS = [];


  // RM stock lots (FIFO by expiry) — empty; the user receives their own stock
  const LOTS = [];

  // Goods-receipt history — empty; filled when the user records receiving
  const RECEIPTS = [];

  // Active production lots on the shop floor
  function buildLot(id, po, order, fg, qty, line, wfId, fillPattern) {
    const flow = WORKFLOWS.find(w => w.id === wfId);
    let prev = qty;
    const stations = flow.steps.map((s, i) => {
      const cum = Math.round(qty * (fillPattern[i] != null ? fillPattern[i] : 0));
      const cumOut = i < flow.steps.length - 1 ? Math.round(qty * (fillPattern[i + 1] != null ? fillPattern[i + 1] : 0)) : 0;
      const o = { step: s.key, name: s.name, nameTh: s.nameTh, wipIn: cum, wipOut: cumOut, cumOut: cumOut, wip: cum - cumOut };
      return o;
    });
    return { id, po, order, fg, qty, line, wf: wfId, stations,
      outputLog: [
        { time: '09:00', station: flow.steps[2].name, qty: 1000 },
        { time: '10:00', station: flow.steps[2].name, qty: 1500 },
        { time: '11:00', station: flow.steps[3].name, qty: 800 },
      ] };
  }

  const LOTS_WIP = [
    buildLot('LOT-A1', 'PO-7781', 'SO-2456', 'FG001', 12000, 'A', 'WF-A', [1, .92, .75, .58, .42, .30, .18, .08]),
    buildLot('LOT-A2', 'PO-7782', 'SO-2457', 'FG002', 7000, 'A', 'WF-A', [1, .80, .55, .30, .12, .04, 0, 0]),
    buildLot('LOT-B1', 'PO-7783', 'SO-2454', 'FG003', 5000, 'B', 'WF-B', [1, .70, .40, .20, .08, 0, 0, 0, 0]),
  ];

  // Empty — production orders are created when the user reserves their own order
  const PRODORDERS = [];

  // FG awaiting QC acceptance — empty; filled when a lot completes on the floor
  const FG_PENDING = [];

  // Finished-goods stock — empty; filled when lots complete and pass QC
  const FG_STOCK = [];

  // Only the admin account is seeded; other users are added via User Management
  const USERS = [
    { id: 'U01', username: 'admin', name: 'System Admin', email: 'admin@primeglory.co', role: 'admin', status: 'A', last: d(0), password: 'prime888' },
  ];

  // Dashboard analytics
  const ANALYTICS = {
    planActual: [ // per line
      { line: 'A', plan: 19000, actual: 17200 },
      { line: 'B', plan: 8000, actual: 6400 },
      { line: 'C', plan: 6000, actual: 6300 },
    ],
    daily: [ // last 7 days output
      { day: 'จ.', dayEn: 'Mon', out: 24500 }, { day: 'อ.', dayEn: 'Tue', out: 27800 },
      { day: 'พ.', dayEn: 'Wed', out: 26100 }, { day: 'พฤ.', dayEn: 'Thu', out: 29400 },
      { day: 'ศ.', dayEn: 'Fri', out: 31200 }, { day: 'ส.', dayEn: 'Sat', out: 18600 },
      { day: 'อา.', dayEn: 'Sun', out: 0 },
    ],
    capUtil: [ { line: 'A', pct: 86 }, { line: 'B', pct: 64 }, { line: 'C', pct: 92 } ],
    hourly: [
      { t: '08', out: 0 }, { t: '09', out: 1000 }, { t: '10', out: 1500 }, { t: '11', out: 800 },
      { t: '12', out: 400 }, { t: '13', out: 1300 }, { t: '14', out: 1650 }, { t: '15', out: 1200 },
    ],
    wipStation: [
      { step: 'Material Issue', stepTh: 'เบิกวัตถุดิบ', qty: 5000 },
      { step: 'Weighing', stepTh: 'ชั่งวัตถุดิบ', qty: 4000 },
      { step: 'Mixing', stepTh: 'ผสม', qty: 1000 },
      { step: 'Filling', stepTh: 'บรรจุ', qty: 1600 },
      { step: 'Sealing', stepTh: 'ซีล', qty: 900 },
      { step: 'Packing', stepTh: 'แพ็ค', qty: 1240 },
    ],
  };

  let _seq = 9100;
  function genId(prefix) { return prefix + '-' + (++_seq); }

  function buildState() {
    return JSON.parse(JSON.stringify({
      raw: RAW, fg: FG, boms: BOMS, customers: CUSTOMERS, suppliers: SUPPLIERS,
      lines: LINES, workflows: WORKFLOWS, orders: ORDERS, lots: LOTS, receipts: RECEIPTS,
      lotsWip: [], prodOrders: PRODORDERS, fgPending: FG_PENDING, fgStock: FG_STOCK, fgSales: [],
      reservedByRm: {}, scheduleBars: [], issues: [], procurement: {},
      users: USERS, analytics: ANALYTICS, stepLib: STEP_LIB, today: d(0),
    }));
  }

  // Procurement status for short materials of a waiting order
  const PROC_STATUS = {
    pending: { th: 'รอสั่งซื้อ', en: 'To order' },
    ordered: { th: 'สั่งซื้อแล้ว', en: 'Ordered' },
    transit: { th: 'กำลังขนส่ง', en: 'In transit' },
  };

  // helpers shared across modules
  function fgName(s, code, lang) { const f = s.fg.find(x => x.code === code); return f ? (lang === 'th' ? f.nameTh : f.name) : code; }
  function rmName(s, code, lang) { const r = s.raw.find(x => x.code === code); return r ? (lang === 'th' ? r.nameTh : r.name) : code; }
  function rmOnHand(s, code) { return s.lots.filter(l => l.rm === code).reduce((a, l) => a + l.remaining, 0); }
  // lots holding a material, sorted FEFO (earliest expiry first), only with remaining stock
  function rmLotsFEFO(s, code) { return s.lots.filter(l => l.rm === code && l.remaining > 0).sort((a, b) => new Date(a.expiry) - new Date(b.expiry)); }
  function rmReserved(s, code) { return (s.reservedByRm && s.reservedByRm[code]) || 0; }
  function rmAvailable(s, code) { return +(rmOnHand(s, code) - rmReserved(s, code)).toFixed(2); }
  function rmUnit(s, code) { const r = s.raw.find(x => x.code === code); return r ? r.unit : ''; }

  // Convert a BOM line qty into the material's stock unit (BOM often in g/ml, stock in kg/L)
  function toStockQty(lineUnit, stockUnit, qty) {
    if (lineUnit === stockUnit) return qty;
    if (lineUnit === 'g' && stockUnit === 'kg') return qty / 1000;
    if (lineUnit === 'ml' && stockUnit === 'L') return qty / 1000;
    if (lineUnit === 'kg' && stockUnit === 'g') return qty * 1000;
    if (lineUnit === 'L' && stockUnit === 'ml') return qty * 1000;
    return qty;
  }

  // BOM requirement for an order qty → array of {rm, need, onHand, reserved, available, unit, short}
  // need is expressed in the material's STOCK unit, so it is comparable to on-hand.
  // ignoreReserved=true → measure shortage against physical on-hand (use once an order has
  // already secured its own reservation, so its own reservation isn't counted against it).
  function bomRequirement(s, fgCode, qty, ignoreReserved) {
    const bom = s.boms[fgCode]; if (!bom) return [];
    return bom.lines.map(l => {
      const raw = s.raw.find(x => x.code === l.rm);
      const stockUnit = raw ? raw.unit : l.unit;
      const need = +(toStockQty(l.unit, stockUnit, l.qty) * qty).toFixed(3);
      const onHand = rmOnHand(s, l.rm);
      const reserved = rmReserved(s, l.rm);
      const available = ignoreReserved ? onHand : +(onHand - reserved).toFixed(3);
      return { rm: l.rm, unit: stockUnit, need, onHand, reserved, available, short: Math.max(0, +(need - available).toFixed(3)) };
    });
  }

  // Pick the workflow for a line: explicit binding on the line wins, else by line tag, else first
  function workflowForLine(s, lineId) {
    const line = (s.lines || []).find(l => l.id === lineId);
    if (line && line.wf) { const w = s.workflows.find(x => x.id === line.wf); if (w) return w; }
    return s.workflows.find(w => w.line === lineId) || s.workflows[0];
  }

  // Build an empty WIP lot for a production order. Uses a workflow snapshot if the PO
  // carries one (frozen at schedule time) so later Designer edits don't change it.
  function buildWipLot(s, po) {
    const snap = po.wfSnapshot;
    const flow = snap ? { id: po.wf, steps: snap } : (s.workflows.find(w => w.id === po.wf) || workflowForLine(s, po.line));
    const stations = flow.steps.map(st => ({ step: st.key, name: st.name, nameTh: st.nameTh, wipIn: 0, wipOut: 0, cumOut: 0, wip: 0 }));
    return { id: 'LOT-' + po.id.replace('PO-', ''), po: po.id, order: po.order, fg: po.fg, qty: po.qty, line: po.line, wf: flow.id, stations, outputLog: [] };
  }

  // Read-only progress derivation for a customer order (does NOT mutate status):
  //   produced  = output at the last station of its WIP lot
  //   received  = total FG quantity received into the warehouse for its PO
  //   started   = production has actually begun (prod order is in progress)
  function orderProgress(s, o) {
    const po = s.prodOrders.find(p => p.order === o.id);
    // an order may be split across several lines → sum the last-station output of every WIP lot
    const lots = s.lotsWip.filter(l => l.order === o.id);
    const produced = lots.reduce((a, l) => a + (l.stations[l.stations.length - 1].cumOut || 0), 0);
    const fgp = po ? s.fgPending.find(f => f.po === po.id) : null;
    const received = fgp ? (fgp.receipts || []).reduce((a, r) => a + r.qty, 0) : 0;
    const started = lots.length > 0 || (!!po && po.status === 'inprogress');
    return { produced, received, started };
  }

  function fgOnHand(s, code) { return s.fgStock.filter(x => x.fg === code).reduce((a, x) => a + x.qty, 0); }

  /* ---- Persistence: whole-state snapshot in Supabase (id='main') ---- */
  // Load the shared snapshot; seed it on first run. 'today' is always refreshed
  // to the real current date so countdowns stay live even on an old snapshot.
  async function loadState() {
    if (!_supa) return buildState();
    try {
      const { data, error } = await _supa.from('app_state').select('data').eq('id', 'main').maybeSingle();
      if (error) { console.warn('loadState:', error.message); return buildState(); }
      if (!data) {
        const seed = buildState();
        await _supa.from('app_state').upsert({ id: 'main', data: seed, client_id: CLIENT_ID, updated_at: new Date().toISOString() });
        return seed;
      }
      const st = data.data; st.today = d(0); return st;
    } catch (e) { console.warn('loadState error:', e); return buildState(); }
  }

  // Debounced upsert of the full snapshot. Tagged with CLIENT_ID so this tab
  // can ignore the realtime echo of its own write.
  let _saveTimer = null, _pending = null;
  function saveState(state) {
    if (!_supa) return;
    _pending = state;
    clearTimeout(_saveTimer);
    _saveTimer = setTimeout(() => {
      _supa.from('app_state')
        .upsert({ id: 'main', data: _pending, client_id: CLIENT_ID, updated_at: new Date().toISOString() })
        .then(({ error }) => { if (error) console.warn('saveState:', error.message); });
    }, 300);
  }

  // Subscribe to remote changes (other tabs / other users). Ignores our own writes.
  function subscribe(onRemote) {
    if (!_supa) return function () {};
    const ch = _supa.channel('app_state_main')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_state', filter: 'id=eq.main' }, function (payload) {
        const row = payload.new;
        if (!row || row.client_id === CLIENT_ID) return;
        const st = row.data; st.today = d(0); onRemote(st);
      })
      .subscribe();
    return function () { try { _supa.removeChannel(ch); } catch (e) {} };
  }

  window.PG_DATA = { buildState, loadState, saveState, subscribe, genId, fgName, rmName, rmOnHand, rmLotsFEFO, rmReserved, rmAvailable, rmUnit, fgOnHand, bomRequirement, workflowForLine, buildWipLot, orderProgress, STEP_LIB, PROC_STATUS };
})();
