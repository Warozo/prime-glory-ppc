/* ============================================================
   Module: FG Receiving (QC accept flow) + Warehouse Stock
   ============================================================ */
(function () {
  const { useI18n } = window.PG_I18N;
  const { PageHead, Icon, fmt, fmtDate, DateField, useToast, Stat, StatusBadge, Progress, Modal, Field } = window.PG_UI;
  const D = window.PG_DATA;

  /* ---------------- FG Receiving ---------------- */
  function FGReceiving({ state, setState }) {
    const { t, lang } = useI18n();
    const toast = useToast();
    const e = React.createElement;
    const [recv, setRecv] = React.useState(null); // pending item being received
    const pending = state.fgPending.filter(f => f.status === 'pending');
    const accepted = state.fgPending.filter(f => f.status === 'accepted');
    const [fpq, setFpq] = React.useState('');
    const [fpStatus, setFpStatus] = React.useState('');
    // Date filter — trims only FINISHED items (received/rejected); pending always shows (active queue).
    const daysAgo = (n) => { const d = new Date(state.today); d.setDate(d.getDate() - (n - 1)); return d.toISOString().slice(0, 10); };
    const [fpPreset, setFpPreset] = React.useState(30);
    const [fpFrom, setFpFrom] = React.useState(() => daysAgo(30));
    const [fpTo, setFpTo] = React.useState(() => state.today);
    const setPresetDays = (n) => { setFpPreset(n); setFpFrom(daysAgo(n)); setFpTo(state.today); };
    const setAllDates = () => { setFpPreset(0); setFpFrom(''); setFpTo(''); };
    const itemDate = (f) => { const rs = f.receipts || []; return (rs.length ? rs[rs.length - 1].date : f.completed) || f.completed || ''; };
    const inWindow = (f) => { if (!fpFrom && !fpTo) return true; if (f.status === 'pending') return true; const d = itemDate(f); return !d || ((!fpFrom || d >= fpFrom) && (!fpTo || d <= fpTo)); };
    const fpNeedle = fpq.trim().toLowerCase();
    const fpFiltered = state.fgPending.filter(f => {
      if (!inWindow(f)) return false;
      if (fpStatus && f.status !== fpStatus) return false;
      if (fpNeedle) { const hay = ((f.id || '') + ' ' + (f.po || '') + ' ' + D.fgName(state, f.fg, lang)).toLowerCase(); if (hay.indexOf(fpNeedle) < 0) return false; }
      return true;
    });
    const fpHidden = (!fpFrom && !fpTo) ? 0 : state.fgPending.filter(f => f.status !== 'pending' && !inWindow(f)).length;

    function received(f) { return (f.receipts || []).reduce((a, r) => a + r.qty, 0); }
    function producedOf(f) { return f.produced != null ? f.produced : f.qty; }
    function readyToReceive(f) { return Math.max(0, producedOf(f) - received(f)); }

    function doReceive(f, form) {
      setState(prev => {
        const item = prev.fgPending.find(x => x.id === f.id);
        const already = (item.receipts || []).reduce((a, r) => a + r.qty, 0);
        const ready = (item.produced != null ? item.produced : item.qty) - already;
        const qty = Math.max(0, Math.min(+form.qty, ready));
        if (qty <= 0) return prev;
        const receipts = [...(item.receipts || []), { lotNo: form.lotNo, qty, date: form.date }];
        const totalRecv = already + qty;
        const status = totalRecv >= item.qty ? 'accepted' : 'pending';
        const fgPending = prev.fgPending.map(x => x.id === f.id ? { ...x, receipts, status } : x);
        const fgStock = [{ sid: D.genId('FG'), fg: item.fg, qty, lot: form.lotNo, expiry: form.expiry || prev.today }, ...prev.fgStock];
        return { ...prev, fgPending, fgStock };
      });
      toast(t('toast.received'));
      setRecv(null);
    }
    function reject(id) {
      setState(prev => ({ ...prev, fgPending: prev.fgPending.map(f => f.id === id ? { ...f, status: 'rejected' } : f) }));
      toast(t('toast.saved'), 'warn');
    }

    const STAGES = [
      { k: 'complete', label: lang === 'th' ? 'ผลิตเสร็จ' : 'Production Complete', ic: 'checkcircle', c: 'var(--st-completed)' },
      { k: 'pending', label: t('status.pending'), ic: 'clock', c: 'var(--st-pending)' },
      { k: 'accepted', label: t('status.accepted'), ic: 'check', c: 'var(--ok)' },
      { k: 'warehouse', label: lang === 'th' ? 'คลังสินค้าสำเร็จรูป' : 'FG Warehouse', ic: 'warehouse', c: 'var(--primary)' },
    ];

    return e('div', null,
      e(PageHead, { title: t('fg.title'), sub: t('fg.sub') }),
      // flow visual
      e('div', { className: 'card', style: { marginBottom: 'var(--gap)' } },
        e('div', { className: 'card-b', style: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, flexWrap: 'wrap' } },
          STAGES.map((s, i) => e(React.Fragment, { key: s.k },
            e('div', { style: { display: 'flex', alignItems: 'center', gap: 9, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 30, padding: '7px 15px' } },
              e('span', { style: { width: 26, height: 26, borderRadius: '50%', background: s.c, color: '#fff', display: 'grid', placeItems: 'center' } }, e(Icon, { name: s.ic, size: 14 })),
              e('span', { style: { fontSize: 12, fontWeight: 600 } }, s.label)),
            i < STAGES.length - 1 && e(Icon, { name: 'arrowR', size: 16, style: { color: 'var(--text-faint)' } })))),
        e('div', { style: { textAlign: 'center', fontSize: 11, color: 'var(--text-faint)', paddingBottom: 12 } }, lang === 'th' ? 'รับเข้าเป็นรอบ ๆ ตามจำนวนที่ผลิตเสร็จ — 1 ใบสั่งผลิตมีหลายล็อตได้' : 'Receive in partial batches as produced — one PO may yield multiple lots')),

      e('div', { className: 'grid g-4', style: { marginBottom: 'var(--gap)' } },
        e(Stat, { label: t('status.pending'), value: pending.length, accent: 'var(--st-pending)', icon: 'clock' }),
        e(Stat, { label: t('status.accepted'), value: accepted.length, accent: 'var(--ok)', icon: 'check' }),
        e(Stat, { label: t('db.fgstock'), value: fmt(state.fgStock.reduce((a, x) => a + x.qty, 0)), unit: t('u.pcs'), accent: 'var(--primary)', icon: 'fg' }),
        e(Stat, { label: lang === 'th' ? 'พร้อมรับเข้า' : 'Ready to receive', value: pending.reduce((a, x) => a + readyToReceive(x), 0).toLocaleString(), unit: t('u.pcs'), accent: 'var(--warn)', icon: 'alert' })),

      e('div', { className: 'card' },
        e('div', { className: 'card-h' }, e(Icon, { name: 'fg', size: 15, style: { color: 'var(--primary)' } }), e('h3', null, t('status.pending')),
          e('span', { className: 'badge badge-soft', style: { marginLeft: 'auto' } }, fpFiltered.length + ' / ' + state.fgPending.length)),
        e('div', { style: { padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' } },
          e('input', { className: 'input', style: { flex: '1 1 200px', minWidth: 160 }, placeholder: lang === 'th' ? 'ค้นหา FR# / ใบสั่งผลิต / สินค้า' : 'Search FR# / PO / product', value: fpq, onChange: ev => setFpq(ev.target.value) }),
          e('select', { className: 'select', style: { width: 160 }, value: fpStatus, onChange: ev => setFpStatus(ev.target.value) },
            e('option', { value: '' }, lang === 'th' ? 'ทุกสถานะ' : 'All statuses'),
            e('option', { value: 'pending' }, t('status.pending')),
            e('option', { value: 'accepted' }, t('status.accepted')),
            e('option', { value: 'rejected' }, lang === 'th' ? 'ปฏิเสธ' : 'Rejected')),
          e('div', { className: 'pill-tabs' },
            [7, 15, 30, 90].map(n => e('button', { key: n, className: fpPreset === n ? 'on' : '', onClick: () => setPresetDays(n) }, n + (lang === 'th' ? ' วัน' : 'd'))).concat([
              e('button', { key: 'all', className: (fpPreset === 0 && !fpFrom && !fpTo) ? 'on' : '', onClick: setAllDates }, lang === 'th' ? 'ทั้งหมด' : 'All')])),
          e(DateField, { value: fpFrom, onChange: v => { setFpFrom(v); setFpPreset(0); }, style: { width: 130 } }),
          e('span', { className: 'faint' }, '–'),
          e(DateField, { value: fpTo, onChange: v => { setFpTo(v); setFpPreset(0); }, style: { width: 130 } }),
          fpHidden > 0 && e('span', { className: 'badge', style: { color: 'var(--text-muted)', background: 'var(--surface-3)', fontSize: 11 } }, lang === 'th' ? 'ซ่อนที่รับเข้าแล้วเก่ากว่า ' + fpHidden : fpHidden + ' older hidden'),
          e('button', { className: 'btn btn-sm', onClick: () => { setFpq(''); setFpStatus(''); setPresetDays(30); } }, lang === 'th' ? 'ล้าง' : 'Clear')),
        e('table', { className: 'tbl' },
          e('thead', null, e('tr', null,
            e('th', null, 'FR#'), e('th', null, t('f.po')), e('th', null, t('f.product')),
            e('th', { className: 'num' }, t('f.qty')), e('th', { className: 'num' }, t('fg.produced')), e('th', { className: 'num' }, t('fg.received')),
            e('th', { className: 'num' }, t('fg.ready')), e('th', { style: { width: 110 } }, t('f.progress')),
            e('th', null, t('f.status')), e('th', { style: { width: 170 } }, ''))),
          e('tbody', null,
            fpFiltered.length === 0
              ? e('tr', null, e('td', { colSpan: 10, className: 'empty' }, t('tbl.noresults')))
              : fpFiltered.map(f => {
              const rec = received(f), prod = producedOf(f), ready = readyToReceive(f), pct = Math.round(rec / f.qty * 100);
              return e(React.Fragment, { key: f.id },
                e('tr', null,
                  e('td', { className: 'mono', style: { fontWeight: 600, color: 'var(--primary)' } }, f.id),
                  e('td', { className: 'mono faint' }, f.po),
                  e('td', { style: { fontWeight: 600 } }, D.fgName(state, f.fg, lang)),
                  e('td', { className: 'num mono', style: { fontWeight: 600 } }, fmt(f.qty)),
                  e('td', { className: 'num mono', style: { color: 'var(--st-completed)' } }, fmt(prod)),
                  e('td', { className: 'num mono', style: { color: rec > 0 ? 'var(--ok)' : 'var(--text-faint)' } }, fmt(rec)),
                  e('td', { className: 'num mono', style: { fontWeight: 700, color: ready > 0 ? 'var(--warn)' : 'var(--text-faint)' } }, ready > 0 ? fmt(ready) : '–'),
                  e('td', null, e(Progress, { value: pct, color: pct >= 100 ? 'var(--ok)' : 'var(--primary)' }), e('div', { className: 'faint mono', style: { fontSize: 9.5, marginTop: 2 } }, pct + '%')),
                  e('td', null, e(StatusBadge, { status: f.status === 'rejected' ? 'request' : f.status })),
                  e('td', null, f.status === 'pending'
                    ? e('div', { className: 'row', style: { gap: 6 } },
                        e('button', { className: 'btn btn-sm btn-pri', disabled: ready <= 0, onClick: () => setRecv(f) }, e(Icon, { name: 'receive', size: 12 }), t('btn.receive')),
                        e('button', { className: 'btn btn-sm', onClick: () => reject(f.id) }, t('btn.reject')))
                    : e('span', { className: 'faint', style: { fontSize: 11 } }, f.status === 'accepted' ? '✓ ' + t('status.accepted') : t('btn.reject')))),
                // sub-rows: lots received so far
                (f.receipts || []).length > 0 && e('tr', null, e('td', { colSpan: 10, style: { padding: '0 14px 8px 40px', background: 'var(--surface-2)' } },
                  e('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, paddingTop: 6 } },
                    f.receipts.map((r, i) => e('span', { key: i, className: 'badge', style: { background: 'var(--surface-3)', color: 'var(--text-muted)' } },
                      e(Icon, { name: 'box', size: 11 }), r.lotNo + ' · ' + fmt(r.qty) + ' ' + t('u.pcs') + ' · ' + fmtDate(r.date)))))));
            })))),
      recv && e(ReceiveFGModal, { item: recv, received: received(recv), ready: readyToReceive(recv), state, t, lang, onClose: () => setRecv(null), onSubmit: (form) => doReceive(recv, form) }));
  }

  function ReceiveFGModal({ item, received, ready, state, t, lang, onClose, onSubmit }) {
    const e = React.createElement;
    const remain = ready != null ? ready : (item.qty - received);
    const [f, setF] = React.useState({ lotNo: 'FGLOT-' + item.po.replace('PO-', '') + '-' + ((item.receipts || []).length + 1), qty: remain, date: state.today, expiry: '' });
    const set = (k, v) => setF(p => ({ ...p, [k]: v }));
    const valid = f.lotNo.trim() && +f.qty > 0 && +f.qty <= remain;
    return e(Modal, { title: t('fg.receivebatch') + ' · ' + item.id, onClose, width: 480,
      footer: e(React.Fragment, null, e('button', { className: 'btn', onClick: onClose }, t('btn.cancel')),
        e('button', { className: 'btn btn-pri', disabled: !valid, onClick: () => onSubmit(f) }, e(Icon, { name: 'check', size: 14 }), t('fg.acceptbatch'))) },
      e('div', { style: { background: 'var(--surface-2)', borderRadius: 8, padding: '10px 12px', marginBottom: 14, fontSize: 12 } },
        e('div', { className: 'row', style: { justifyContent: 'space-between' } }, e('span', { className: 'faint' }, t('f.product')), e('b', null, D.fgName(state, item.fg, lang))),
        e('div', { className: 'row', style: { justifyContent: 'space-between', marginTop: 4 } }, e('span', { className: 'faint' }, t('f.po')), e('b', { className: 'mono' }, item.po)),
        e('div', { className: 'row', style: { justifyContent: 'space-between', marginTop: 4 } }, e('span', { className: 'faint' }, t('fg.ready')), e('b', { className: 'mono', style: { color: 'var(--warn)' } }, fmt(remain) + ' ' + t('u.pcs'))),
        e('div', { className: 'row', style: { justifyContent: 'space-between', marginTop: 4 } }, e('span', { className: 'faint' }, t('fg.received') + ' / ' + t('f.qty')), e('b', { className: 'mono', style: { color: 'var(--primary)' } }, fmt(received) + ' / ' + fmt(item.qty) + ' ' + t('u.pcs')))),
      e('div', { className: 'grid g-2', style: { gap: 12 } },
        e('div', { style: { gridColumn: 'span 2' } }, e(Field, { label: t('f.lot'), required: true, hint: lang === 'th' ? 'กรอกเลขล็อตก่อนรับเข้า' : 'Enter the lot number before receiving' },
          e('input', { className: 'input mono', value: f.lotNo, onChange: ev => set('lotNo', ev.target.value), placeholder: 'FGLOT-____' }))),
        e(Field, { label: t('f.qty') + ' (≤ ' + fmt(remain) + ')', required: true }, e('input', { className: 'input mono', type: 'number', value: f.qty, onChange: ev => set('qty', ev.target.value), max: remain })),
        e(Field, { label: t('f.date'), required: true }, e(DateField, { value: f.date, onChange: v => set('date', v) })),
        e('div', { style: { gridColumn: 'span 2' } }, e(Field, { label: t('f.expiry') }, e(DateField, { value: f.expiry, onChange: v => set('expiry', v) })))));
  }

  /* ---------------- Warehouse Stock ---------------- */
  function Stock({ state, setState }) {
    const { t, lang } = useI18n();
    const [wh, setWh] = React.useState('rm');
    const [open, setOpen] = React.useState({}); // expanded RM code → show its in-stock lots
    // self-produced materials: flip the ready/not-ready status right from the stock page
    const toggleReady = (code) => setState && setState(prev => ({ ...prev, raw: prev.raw.map(x => x.code === code ? { ...x, ready: x.ready === false } : x) }));
    const rmAgg = state.raw.map(r => ({ ...r, onHand: D.rmOnHand(state, r.code), reserved: D.rmReserved(state, r.code), available: D.rmAvailable(state, r.code), lots: state.lots.filter(l => l.rm === r.code && l.remaining > 0).length }));
    const [q, setQ] = React.useState('');
    const [catF, setCatF] = React.useState('');
    const [statusF, setStatusF] = React.useState('');
    const switchWh = (w) => { setWh(w); setQ(''); setCatF(''); setStatusF(''); };
    const needle = q.trim().toLowerCase();
    const matchItem = (code, nameTh, name, cat, status) => {
      if (statusF && (statusF === 'A' ? status !== 'A' : status === 'A')) return false;
      if (catF && cat !== catF) return false;
      if (needle) { const hay = (code + ' ' + (nameTh || '') + ' ' + (name || '') + ' ' + (cat || '')).toLowerCase(); if (hay.indexOf(needle) < 0) return false; }
      return true;
    };
    const rmFiltered = rmAgg.filter(r => matchItem(r.code, r.nameTh, r.name, r.cat, r.status || 'A'));
    const fgFiltered = (state.fgStock || []).filter(x => { const p = state.fg.find(g => g.code === x.fg) || {}; return matchItem(p.code || x.fg, p.nameTh, p.name, p.cat, p.status || 'A'); });
    const cats = Array.from(new Set((wh === 'rm' ? state.raw : state.fg).map(x => x.cat).filter(Boolean)));
    const totalRows = wh === 'rm' ? rmAgg.length : (state.fgStock || []).length;
    const shownRows = wh === 'rm' ? rmFiltered.length : fgFiltered.length;
    const st = (v) => (v || 'A') === 'A' ? (lang === 'th' ? 'ใช้งาน' : 'Active') : (lang === 'th' ? 'ปิดใช้งาน' : 'Inactive');
    const lotsOf = (code) => state.lots.filter(l => l.rm === code && l.remaining > 0).sort((a, b) => new Date(a.expiry) - new Date(b.expiry));
    // Summary export (one row per item); RM rows now also list their in-stock lot numbers.
    function exportStock() {
      const dt = state.today || new Date().toISOString().slice(0, 10);
      if (wh === 'rm') {
        window.PG_UI.exportCsv('stock-rawmaterial-' + dt + '.csv',
          ['รหัส', 'ชื่อสาร', 'INCI Name', 'หมวดหมู่', 'หน่วย', 'คงคลัง', 'จอง', 'พร้อมใช้', 'จำนวนล็อต', 'เลขล็อต', 'สถานะ'],
          rmFiltered.map(r => [r.code, r.nameTh || '', r.name || '', r.cat || '', r.unit || '', r.onHand, r.reserved, r.available, r.lots, lotsOf(r.code).map(l => l.lot).join('; '), st(r.status)]));
      } else {
        window.PG_UI.exportCsv('stock-finishedgoods-' + dt + '.csv',
          ['รหัสสินค้า', 'ชื่อสาร', 'INCI Name', 'ล็อต', 'จำนวน', 'วันหมดอายุ'],
          fgFiltered.map(x => { const p = state.fg.find(g => g.code === x.fg) || {}; return [x.fg, p.nameTh || '', p.name || '', x.lot || '', x.qty, x.expiry || '']; }));
      }
    }
    // Detailed export: one row per in-stock lot of each (filtered) raw material.
    function exportStockLots() {
      const dt = state.today || new Date().toISOString().slice(0, 10);
      const rows = [];
      rmFiltered.forEach(r => lotsOf(r.code).forEach(l => {
        const days = Math.round((new Date(l.expiry) - new Date(state.today)) / 864e5);
        rows.push([r.code, r.nameTh || '', r.name || '', r.cat || '', l.lot, l.supplier || '', l.remaining, r.unit || '', fmtDate(l.recv), fmtDate(l.expiry), days]);
      }));
      window.PG_UI.exportCsv('stock-rawmaterial-lots-' + dt + '.csv',
        ['รหัสวัตถุดิบ', 'ชื่อสาร', 'INCI Name', 'หมวดหมู่', 'เลขล็อต', 'ผู้ขาย', 'คงเหลือ', 'หน่วย', 'วันรับเข้า', 'วันหมดอายุ', 'เหลืออายุ (วัน)'], rows);
    }

    return React.createElement('div', null,
      React.createElement(PageHead, { title: t('nav.stock'), sub: t('navsec.warehouse'),
        actions: React.createElement('div', { className: 'row', style: { gap: 8 } },
          React.createElement('button', { className: 'btn btn-sm', onClick: exportStock, disabled: shownRows === 0 }, React.createElement(Icon, { name: 'export', size: 14 }), lang === 'th' ? 'ส่งออก CSV' : 'Export CSV'),
          wh === 'rm' && React.createElement('button', { className: 'btn btn-sm', onClick: exportStockLots, disabled: shownRows === 0 }, React.createElement(Icon, { name: 'export', size: 14 }), lang === 'th' ? 'CSV รายล็อต' : 'CSV by lot'),
          React.createElement('div', { className: 'pill-tabs' },
            React.createElement('button', { className: wh === 'rm' ? 'on' : '', onClick: () => switchWh('rm') }, t('rawmat')),
            React.createElement('button', { className: wh === 'fg' ? 'on' : '', onClick: () => switchWh('fg') }, t('finished')))) }),
      React.createElement('div', { className: 'card', style: { marginBottom: 'var(--gap)', padding: 12 } },
        React.createElement('div', { className: 'row', style: { gap: 10, flexWrap: 'wrap', alignItems: 'center' } },
          React.createElement('input', { className: 'input', style: { flex: '1 1 220px', minWidth: 180 }, placeholder: lang === 'th' ? 'ค้นหา รหัส / ชื่อ' : 'Search code / name', value: q, onChange: ev => setQ(ev.target.value) }),
          React.createElement('select', { className: 'select', style: { width: 168 }, value: catF, onChange: ev => setCatF(ev.target.value) },
            [React.createElement('option', { key: '_all', value: '' }, lang === 'th' ? 'ทุกหมวดหมู่' : 'All categories')].concat(cats.map(c => React.createElement('option', { key: c, value: c }, c)))),
          React.createElement('select', { className: 'select', style: { width: 150 }, value: statusF, onChange: ev => setStatusF(ev.target.value) },
            React.createElement('option', { value: '' }, lang === 'th' ? 'ทุกสถานะ' : 'All statuses'),
            React.createElement('option', { value: 'A' }, lang === 'th' ? 'ใช้งาน' : 'Active'),
            React.createElement('option', { value: 'I' }, lang === 'th' ? 'ปิดใช้งาน' : 'Inactive')),
          React.createElement('span', { className: 'badge badge-soft', style: { fontSize: 11 } }, shownRows + ' / ' + totalRows),
          (q || catF || statusF) && React.createElement('button', { className: 'btn btn-sm', onClick: () => { setQ(''); setCatF(''); setStatusF(''); } }, lang === 'th' ? 'ล้าง' : 'Clear'))),
      wh === 'rm' ? React.createElement('div', { className: 'card' },
        React.createElement('div', { className: 'card-h' }, React.createElement(Icon, { name: 'warehouse', size: 15, style: { color: 'var(--primary)' } }), React.createElement('h3', null, lang === 'th' ? 'คลังวัตถุดิบ' : 'Raw Material Warehouse')),
        React.createElement('table', { className: 'tbl' },
          React.createElement('thead', null, React.createElement('tr', null, React.createElement('th', null, t('f.code')), React.createElement('th', null, t('f.name')), React.createElement('th', null, t('f.category')), React.createElement('th', { className: 'num' }, t('f.onhand')), React.createElement('th', { className: 'num' }, t('f.reserved')), React.createElement('th', { className: 'num' }, t('f.available')), React.createElement('th', { className: 'num' }, t('wh.batches')), React.createElement('th', null, t('f.status')))),
          React.createElement('tbody', null, rmFiltered.map(r => {
            const isOpen = !!open[r.code];
            const lots = state.lots.filter(l => l.rm === r.code && l.remaining > 0).sort((a, b) => new Date(a.expiry) - new Date(b.expiry));
            const selfMade = !!r.selfMade, ready = r.ready !== false;
            const dash = React.createElement('td', { className: 'num mono faint' }, '—');
            const mainRow = React.createElement('tr', { key: r.code, className: selfMade ? '' : 'clickrow', style: { cursor: selfMade ? 'default' : 'pointer' }, onClick: selfMade ? null : () => setOpen(o => ({ ...o, [r.code]: !o[r.code] })) },
              React.createElement('td', { className: 'mono', style: { fontWeight: 600 } },
                !selfMade && React.createElement('span', { style: { display: 'inline-block', width: 12, color: 'var(--text-faint)', transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform .15s' } }, '▸'), selfMade ? '' : ' ', r.code),
              React.createElement('td', { style: { fontWeight: 600 } }, lang === 'th' ? r.nameTh : r.name,
                selfMade && React.createElement('span', { className: 'badge badge-soft', style: { fontSize: 9, marginLeft: 6 } }, lang === 'th' ? 'ผลิตเอง' : 'Self-made')),
              React.createElement('td', null, React.createElement('span', { className: 'badge badge-soft' }, r.cat)),
              selfMade ? dash : React.createElement('td', { className: 'num mono', style: { fontWeight: 600 } }, fmt(r.onHand) + ' ' + r.unit),
              selfMade ? dash : React.createElement('td', { className: 'num mono', style: { color: r.reserved > 0 ? 'var(--warn)' : 'var(--text-faint)' } }, r.reserved > 0 ? fmt(r.reserved) : '–'),
              selfMade ? React.createElement('td', { className: 'num mono faint', style: { fontSize: 10.5 } }, lang === 'th' ? 'ไม่อั้น' : 'unlimited') : React.createElement('td', { className: 'num mono', style: { fontWeight: 600, color: r.available <= 0 ? 'var(--danger)' : 'var(--ok)' } }, fmt(r.available)),
              selfMade ? dash : React.createElement('td', { className: 'num mono' }, React.createElement('span', { className: 'badge badge-soft' }, r.lots)),
              React.createElement('td', null, selfMade
                ? React.createElement('button', { className: 'btn btn-sm', onClick: (ev) => { ev.stopPropagation(); toggleReady(r.code); }, style: { fontSize: 10, padding: '2px 9px', fontWeight: 700, color: ready ? 'var(--ok)' : 'var(--danger)', borderColor: ready ? 'var(--ok)' : 'var(--danger)' }, title: lang === 'th' ? 'กดสลับ พร้อม/ไม่พร้อม' : 'toggle ready' }, ready ? (lang === 'th' ? '● พร้อม' : '● Ready') : (lang === 'th' ? '○ ไม่พร้อม' : '○ Not ready'))
                : React.createElement('span', { className: 'badge', style: { color: (r.status || 'A') === 'A' ? 'var(--ok)' : 'var(--text-muted)', background: (r.status || 'A') === 'A' ? 'var(--ok-tint)' : 'var(--surface-3)' } }, (r.status || 'A') === 'A' ? '✓ ' + t('f.active') : t('f.inactive'))));
            const detailRow = isOpen ? React.createElement('tr', { key: r.code + '_d' },
              React.createElement('td', { colSpan: 8, style: { background: 'var(--surface-2)', padding: 0 } },
                lots.length === 0
                  ? React.createElement('div', { className: 'faint', style: { padding: '10px 16px', fontSize: 11.5 } }, lang === 'th' ? 'ไม่มีล็อตคงคลัง' : 'No lots in stock')
                  : React.createElement('table', { className: 'tbl', style: { margin: 0 } },
                    React.createElement('thead', null, React.createElement('tr', null,
                      React.createElement('th', { style: { paddingLeft: 28 } }, t('f.lot')),
                      React.createElement('th', null, t('f.supplier')),
                      React.createElement('th', { className: 'num' }, t('f.available')),
                      React.createElement('th', null, lang === 'th' ? 'รับเข้า' : 'Received'),
                      React.createElement('th', null, t('f.expiry')))),
                    React.createElement('tbody', null, lots.map(l => {
                      const days = Math.round((new Date(l.expiry) - new Date(state.today)) / 864e5);
                      return React.createElement('tr', { key: l.id },
                        React.createElement('td', { className: 'mono', style: { fontWeight: 600, paddingLeft: 28 } }, l.lot),
                        React.createElement('td', { className: 'faint' }, l.supplier),
                        React.createElement('td', { className: 'num mono', style: { fontWeight: 600 } }, fmt(l.remaining) + ' ' + r.unit),
                        React.createElement('td', { className: 'mono faint' }, fmtDate(l.recv)),
                        React.createElement('td', null, React.createElement('span', { className: 'badge', style: { color: days <= 14 ? 'var(--danger)' : days <= 30 ? 'var(--warn)' : 'var(--text-muted)', background: days <= 14 ? 'var(--danger-tint)' : days <= 30 ? 'var(--warn-tint)' : 'var(--surface-3)' } }, fmtDate(l.expiry) + ' · ' + days + (lang === 'th' ? ' วัน' : 'd'))));
                    })))) ) : null;
            return [mainRow, detailRow];
          }))))
      : React.createElement('div', { className: 'card' },
        React.createElement('div', { className: 'card-h' }, React.createElement(Icon, { name: 'fg', size: 15, style: { color: 'var(--primary)' } }), React.createElement('h3', null, lang === 'th' ? 'คลังสินค้าสำเร็จรูป' : 'Finished Good Warehouse')),
        React.createElement('table', { className: 'tbl' },
          React.createElement('thead', null, React.createElement('tr', null, React.createElement('th', null, t('f.product')), React.createElement('th', null, t('f.lot')), React.createElement('th', { className: 'num' }, t('f.qty')), React.createElement('th', null, t('f.expiry')))),
          React.createElement('tbody', null, fgFiltered.map((x, i) => React.createElement('tr', { key: i },
            React.createElement('td', { style: { fontWeight: 600 } }, D.fgName(state, x.fg, lang)),
            React.createElement('td', { className: 'mono' }, x.lot),
            React.createElement('td', { className: 'num mono', style: { fontWeight: 600 } }, fmt(x.qty)),
            React.createElement('td', { className: 'mono faint' }, fmtDate(x.expiry))))))));
  }

  window.PG_FGReceiving = FGReceiving;
  window.PG_Stock = Stock;
})();
