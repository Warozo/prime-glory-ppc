/* ============================================================
   Module: Shop Floor / WIP Tracking (HERO)
   Station WIP chain · output reporting · completion logic
   ============================================================ */
(function () {
  const { useI18n } = window.PG_I18N;
  const { PageHead, Icon, fmt, fmtDate, Modal, Field, useToast, Progress, StatusBadge } = window.PG_UI;
  const D = window.PG_DATA;

  function ShopFloor({ state, setState, go }) {
    const { t, lang } = useI18n();
    const toast = useToast();

    // Derive view-model from shared state so changes persist across navigation
    const lots = state.lotsWip.map(l => ({
      id: l.id, po: l.po, order: l.order, fg: l.fg, qty: l.qty, line: l.line, wf: l.wf,
      steps: l.stations.map(st => ({ key: st.step, name: st.name, nameTh: st.nameTh })),
      prog: l.stations.map(st => st.cumOut),
      log: (l.outputLog || []).map(x => ({ ...x })),
    }));
    const [selId, setSelId] = React.useState(lots[0] ? lots[0].id : null);
    const [report, setReport] = React.useState(null); // {lotId, stepIdx}

    const lot = lots.find(l => l.id === selId) || lots[0];

    function cumIn(l, i) { return i === 0 ? l.qty : l.prog[i - 1]; }
    function wipAt(l, i) { return cumIn(l, i) - l.prog[i]; }
    function isComplete(l) { return l.prog[l.prog.length - 1] >= l.qty; }

    function applyOutput(lotId, stepIdx, qty, time, date) {
      const useDate = date || state.today;
      setState(prev => {
        const lotsWip = prev.lotsWip.map(l => {
          if (l.id !== lotId) return l;
          const cumPrev = stepIdx === 0 ? l.qty : l.stations[stepIdx - 1].cumOut;
          const inAvail = cumPrev - l.stations[stepIdx].cumOut;
          const add = Math.max(0, Math.min(qty, inAvail));
          const stations = l.stations.map((st, i) => i === stepIdx ? { ...st, cumOut: st.cumOut + add } : st);
          const stepName = lang === 'th' ? l.stations[stepIdx].nameTh : l.stations[stepIdx].name;
          const outputLog = [{ time, date: useDate, step: l.stations[stepIdx].step, stepIdx, station: stepName, qty: add }, ...(l.outputLog || [])];
          return { ...l, stations, outputLog };
        });
        const after = lotsWip.find(l => l.id === lotId);
        const poId = after.po;
        let next = { ...prev, lotsWip };

        // One PO may be split across several lines (several lots): aggregate the
        // last-station output of EVERY lot belonging to this PO.
        const lastOut = (w) => (w.stations[w.stations.length - 1].cumOut || 0);
        const sumForPo = (arr) => arr.filter(w => w.po === poId).reduce((a, w) => a + lastOut(w), 0);
        const producedBefore = sumForPo(prev.lotsWip);
        const producedNow = sumForPo(lotsWip);
        // order/PO total qty (not the sub-lot qty)
        const orderQty = (prev.prodOrders.find(p => p.id === poId) || {}).qty || after.qty;

        // total finished output grew → make it available for FG receiving (qty = order total)
        if (producedNow > producedBefore) {
          const existing = prev.fgPending.find(f => f.po === poId);
          if (existing) {
            next.fgPending = prev.fgPending.map(f => f.po === poId ? { ...f, produced: producedNow, qty: orderQty } : f);
          } else {
            next.fgPending = [{ id: D.genId('FR'), po: poId, fg: after.fg, qty: orderQty, produced: producedNow, receipts: [], completed: prev.today, status: 'pending' }, ...prev.fgPending];
          }
        }
        // whole ORDER finished (all lines summed) → close PO + order
        const justCompleted = producedBefore < orderQty && producedNow >= orderQty;
        if (justCompleted) {
          setTimeout(() => toast(t('toast.completed')), 50);
          next.prodOrders = prev.prodOrders.map(p => p.id === poId ? { ...p, status: 'completed', completedAt: prev.today } : p);
          next.orders = prev.orders.map(o => o.id === after.order ? { ...o, status: 'completed' } : o);
        }
        return next;
      });
      toast(t('toast.reported'));
    }

    // Sort: active lots first, completed lots pushed to the bottom
    const sortedLots = lots.slice().sort((a, b) => (isComplete(a) ? 1 : 0) - (isComplete(b) ? 1 : 0));
    return React.createElement('div', null,
      React.createElement(PageHead, { title: t('sf.title'), sub: t('sf.sub') }),
      React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '230px 1fr', gap: 14, alignItems: 'start' } },

        // Lot list
        React.createElement('div', { className: 'card' },
          React.createElement('div', { className: 'card-h' }, React.createElement(Icon, { name: 'layers', size: 15, style: { color: 'var(--primary)' } }), React.createElement('h3', null, t('sf.lot'))),
          React.createElement('div', { style: { padding: 8, display: 'flex', flexDirection: 'column', gap: 7 } },
            lots.length === 0 && React.createElement('div', { className: 'empty', style: { fontSize: 11 } }, React.createElement(Icon, { name: 'shopfloor', size: 20 }), React.createElement('div', { style: { marginTop: 6 } }, lang === 'th' ? 'ยังไม่มีล็อตการผลิต' : 'No production lots yet'), React.createElement('div', { className: 'faint', style: { fontSize: 10, marginTop: 3 } }, lang === 'th' ? 'จัดใบสั่งลงตารางการผลิตก่อน' : 'Schedule an order first')),
            sortedLots.map(l => {
              const pct = Math.round(l.prog[l.prog.length - 1] / l.qty * 100);
              const done = isComplete(l);
              return React.createElement('button', { key: l.id, onClick: () => setSelId(l.id),
                style: { textAlign: 'left', background: selId === l.id ? 'var(--primary-tint)' : 'var(--surface-2)', border: '1px solid ' + (selId === l.id ? 'var(--primary)' : 'var(--border)'), borderRadius: 7, padding: 9, cursor: 'pointer' } },
                React.createElement('div', { className: 'row', style: { justifyContent: 'space-between' } },
                  React.createElement('span', { className: 'mono', style: { fontSize: 11.5, fontWeight: 700, color: 'var(--primary)' } }, l.id),
                  done ? React.createElement(Icon, { name: 'checkcircle', size: 14, style: { color: 'var(--ok)' } }) : React.createElement('span', { className: 'mono', style: { fontSize: 10.5, fontWeight: 700 } }, pct + '%')),
                React.createElement('div', { style: { fontSize: 11.5, fontWeight: 600, margin: '2px 0 5px' } }, D.fgName(state, l.fg, lang)),
                React.createElement(Progress, { value: pct, color: done ? 'var(--ok)' : 'var(--primary)', height: 5 }),
                React.createElement('div', { className: 'faint mono', style: { fontSize: 9.5, marginTop: 4 } }, 'Line ' + l.line + ' · ' + fmt(l.qty) + ' ' + t('u.pcs')));
            }))),

        // WIP board
        lot && React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 14 } },
          React.createElement('div', { className: 'card' },
            React.createElement('div', { className: 'card-h' },
              React.createElement(Icon, { name: 'shopfloor', size: 16, style: { color: 'var(--primary)' } }),
              React.createElement('div', null,
                React.createElement('h3', null, t('sf.wipboard') + ' · ' + lot.id),
                React.createElement('div', { className: 'sub' }, lot.po + ' · ' + D.fgName(state, lot.fg, lang) + ' · ' + t('sf.lotqty') + ' ' + fmt(lot.qty) + ' ' + t('u.pcs'))),
              React.createElement('div', { className: 'card-h-actions' },
                isComplete(lot) ? React.createElement('button', { className: 'btn btn-pri', onClick: () => go('fgreceiving') },
                  React.createElement(Icon, { name: 'fg', size: 14 }), t('nav.fgreceiving')) :
                  React.createElement('span', { className: 'badge', style: { color: 'var(--primary)', background: 'var(--primary-tint)' } },
                    React.createElement('span', { className: 'dot' }), t('status.inprogress')))),
            React.createElement('div', { className: 'card-b' },
              isComplete(lot) && React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 10, background: 'var(--ok-tint)', border: '1px solid color-mix(in srgb,var(--ok) 30%,white)', borderRadius: 8, padding: '10px 14px', marginBottom: 14 } },
                React.createElement(Icon, { name: 'checkcircle', size: 20, style: { color: 'var(--ok)' } }),
                React.createElement('div', null,
                  React.createElement('div', { style: { fontWeight: 700, color: 'var(--ok)', fontSize: 13 } }, t('toast.completed')),
                  React.createElement('div', { style: { fontSize: 11.5, color: 'var(--text-muted)' } }, lang === 'th' ? 'ทุกสถานีผลิตครบ ' + fmt(lot.qty) + ' ชิ้น — ส่งต่อรอ QC' : 'All stations reached ' + fmt(lot.qty) + ' — forwarded to pending acceptance'))),
              // station chain
              React.createElement('div', { style: { display: 'flex', gap: 0, overflowX: 'auto', paddingBottom: 6 } },
                lot.steps.map((st, i) => {
                  const ci = cumIn(lot, i), out = lot.prog[i], wip = ci - out, full = out >= lot.qty;
                  // a station is "locked" until the previous station passes output to it
                  const locked = !full && wip <= 0 && ci <= 0;
                  return React.createElement(React.Fragment, { key: i },
                    React.createElement('div', { style: { flexShrink: 0, width: 168, border: '1px solid ' + (full ? 'color-mix(in srgb,var(--ok) 35%,white)' : wip > 0 ? 'var(--primary)' : 'var(--border)'), borderRadius: 9, overflow: 'hidden', background: full ? 'var(--ok-tint)' : locked ? 'var(--surface-2)' : 'var(--surface)', opacity: locked ? 0.7 : 1 } },
                      React.createElement('div', { style: { padding: '7px 10px', background: full ? 'color-mix(in srgb,var(--ok) 14%,white)' : wip > 0 ? 'var(--primary-tint)' : 'var(--surface-2)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6 } },
                        React.createElement('span', { style: { width: 18, height: 18, borderRadius: '50%', background: full ? 'var(--ok)' : locked ? 'var(--text-faint)' : 'var(--primary)', color: '#fff', fontSize: 9.5, fontWeight: 700, display: 'grid', placeItems: 'center' } }, i + 1),
                        React.createElement('span', { style: { fontSize: 11, fontWeight: 700, lineHeight: 1.15 } }, lang === 'th' ? st.nameTh : st.name)),
                      React.createElement('div', { style: { padding: 10 } },
                        React.createElement(StatRow, { label: t('sf.totalin'), v: ci, color: 'var(--text-muted)' }),
                        React.createElement(StatRow, { label: t('sf.atstation'), v: wip, color: wip > 0 ? 'var(--primary)' : 'var(--text-faint)', big: true }),
                        React.createElement(StatRow, { label: t('sf.cumoutput'), v: out, color: full ? 'var(--ok)' : 'var(--text-muted)' }),
                        React.createElement('div', { style: { marginTop: 7 } }, React.createElement(Progress, { value: out / lot.qty * 100, color: full ? 'var(--ok)' : 'var(--primary)', height: 5 })),
                        !isComplete(lot) && wip > 0 && React.createElement('button', { className: 'btn btn-sm btn-pri', style: { width: '100%', marginTop: 8 }, onClick: () => setReport({ lotId: lot.id, stepIdx: i }) },
                          React.createElement(Icon, { name: 'arrowR', size: 12 }), t('btn.report')),
                        locked && React.createElement('div', { style: { width: '100%', marginTop: 8, fontSize: 10, color: 'var(--text-faint)', display: 'flex', gap: 5, alignItems: 'center', justifyContent: 'center', padding: '5px 0', border: '1px dashed var(--border-strong)', borderRadius: 5 } },
                          React.createElement(Icon, { name: 'lock', size: 11 }), lang === 'th' ? 'รอขั้นก่อนหน้า' : 'Awaiting previous'),
                        full && React.createElement('div', { style: { width: '100%', marginTop: 8, fontSize: 10, color: 'var(--ok)', display: 'flex', gap: 5, alignItems: 'center', justifyContent: 'center', fontWeight: 600 } },
                          React.createElement(Icon, { name: 'check', size: 11 }), lang === 'th' ? 'เสร็จสถานีนี้' : 'Station done'),
                        // per-station output log (qty / time)
                        (function () {
                          const entries = (lot.log || []).filter(x => x.stepIdx === i);
                          if (entries.length === 0) return null;
                          return React.createElement('div', { style: { marginTop: 8, paddingTop: 7, borderTop: '1px dashed var(--border)' } },
                            entries.slice(0, 6).map((x, k) => React.createElement('div', { key: k, className: 'row', style: { justifyContent: 'space-between', fontSize: 10 } },
                              React.createElement('span', { className: 'mono faint' }, (x.date ? fmtDate(x.date).slice(0, 5) + ' ' : '') + x.time),
                              React.createElement('span', { className: 'mono', style: { fontWeight: 700, color: 'var(--ok)' } }, '+' + fmt(x.qty)))));
                        })())),
                    i < lot.steps.length - 1 && React.createElement('div', { style: { flexShrink: 0, width: 22, display: 'grid', placeItems: 'center', color: 'var(--text-faint)' } }, React.createElement(Icon, { name: 'chevR', size: 16 })));
                })))),

          // Output log — hourly matrix (steps × hour slots) for a selected day
          React.createElement(HourlyOutputTable, { lot, today: state.today, t, lang })))
      ,
      report && React.createElement(ReportModal, { lot: lots.find(l => l.id === report.lotId), stepIdx: report.stepIdx, today: state.today, t, lang,
        maxQ: (report.stepIdx === 0 ? lots.find(l => l.id === report.lotId).qty : lots.find(l => l.id === report.lotId).prog[report.stepIdx - 1]) - lots.find(l => l.id === report.lotId).prog[report.stepIdx],
        onClose: () => setReport(null), onSubmit: (qty, time, date) => { applyOutput(report.lotId, report.stepIdx, qty, time, date); setReport(null); } }));
  }

  function StatRow({ label, v, color, big }) {
    return React.createElement('div', { className: 'row', style: { justifyContent: 'space-between', margin: '2px 0' } },
      React.createElement('span', { style: { fontSize: 10, color: 'var(--text-faint)' } }, label),
      React.createElement('span', { className: 'mono', style: { fontWeight: big ? 700 : 600, fontSize: big ? 15 : 11.5, color } }, window.PG_UI.fmt(v)));
  }

  function ReportModal({ lot, stepIdx, maxQ, today, t, lang, onClose, onSubmit }) {
    const step = lot.steps[stepIdx];
    const [qty, setQty] = React.useState(Math.min(maxQ, 1000));
    const [date, setDate] = React.useState(today);
    const [time, setTime] = React.useState(() => { const n = new Date(); return String(n.getHours()).padStart(2, '0') + ':' + String(n.getMinutes()).padStart(2, '0'); });
    const DateField = window.PG_UI.DateField;
    return React.createElement(Modal, { title: t('sf.reportout'), onClose, width: 440,
      footer: React.createElement(React.Fragment, null,
        React.createElement('button', { className: 'btn', onClick: onClose }, t('btn.cancel')),
        React.createElement('button', { className: 'btn btn-pri', disabled: !qty || qty <= 0, onClick: () => onSubmit(qty, time, date) }, React.createElement(Icon, { name: 'check', size: 14 }), t('btn.confirm'))) },
      React.createElement('div', { style: { background: 'var(--surface-2)', borderRadius: 8, padding: '10px 12px', marginBottom: 14, fontSize: 12 } },
        React.createElement('div', { className: 'row', style: { justifyContent: 'space-between' } }, React.createElement('span', { className: 'faint' }, t('f.station')), React.createElement('b', null, lang === 'th' ? step.nameTh : step.name)),
        React.createElement('div', { className: 'row', style: { justifyContent: 'space-between', marginTop: 4 } }, React.createElement('span', { className: 'faint' }, t('sf.atstation')), React.createElement('b', { className: 'mono' }, window.PG_UI.fmt(maxQ)))),
      React.createElement('div', { className: 'grid g-2', style: { gap: 10, marginBottom: 12 } },
        React.createElement(Field, { label: t('f.date'), required: true }, React.createElement(DateField, { value: date, onChange: setDate })),
        React.createElement(Field, { label: t('f.time') + ' (24 ' + (lang === 'th' ? 'ชม.' : 'hr') + ')', required: true },
          React.createElement('div', { className: 'row', style: { gap: 6, alignItems: 'center' } },
            React.createElement('select', { className: 'select mono', value: (time || '00:00').split(':')[0], onChange: (e) => setTime(e.target.value + ':' + (time || '00:00').split(':')[1]) },
              Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')).map(h => React.createElement('option', { key: h, value: h }, h))),
            React.createElement('span', { className: 'mono', style: { fontWeight: 700 } }, ':'),
            React.createElement('select', { className: 'select mono', value: (time || '00:00').split(':')[1], onChange: (e) => setTime((time || '00:00').split(':')[0] + ':' + e.target.value) },
              Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')).map(m => React.createElement('option', { key: m, value: m }, m))),
            React.createElement('span', { className: 'faint', style: { fontSize: 11 } }, lang === 'th' ? 'น.' : 'hrs')))),
      React.createElement(Field, { label: t('f.output') + ' (' + t('u.units') + ')', required: true },
        React.createElement('input', { className: 'input mono', type: 'number', min: 1, max: maxQ, value: qty, onChange: (e) => setQty(Math.min(maxQ, Math.max(0, +e.target.value))) })),
      React.createElement('div', { className: 'row', style: { gap: 6, marginTop: 8 } },
        [0.25, 0.5, 1].map(f => React.createElement('button', { key: f, className: 'btn btn-sm', onClick: () => setQty(Math.round(maxQ * f)) }, Math.round(f * 100) + '%'))));
  }

  // ---- Hourly output matrix (steps × hour slots) for a selected day ----
  const HOUR_SLOTS = [
    { k: '08', label: '08.00-09.00', start: 8 },
    { k: '09', label: '09.00-10.00', start: 9 },
    { k: '10', label: '10.00-11.00', start: 10 },
    { k: '11', label: '11.00-12.00', start: 11 },
    { k: 'lunch', label: null, start: 12 },
    { k: '13', label: '13.00-14.00', start: 13 },
    { k: '14', label: '14.00-15.00', start: 14 },
    { k: '15', label: '15.00-16.00', start: 15 },
    { k: '16', label: '16.00-17.00', start: 16 },
    { k: '17', label: '17.00-18.00', start: 17 },
    { k: '18', label: '18.00-19.00', start: 18 },
    { k: '19', label: '19.00-20.00', start: 19 },
  ];
  function HourlyOutputTable({ lot, today, t, lang }) {
    const DateField = window.PG_UI.DateField;
    const [day, setDay] = React.useState(today);
    // collect distinct days present in the log (for quick info)
    const matrix = {}; // stepIdx -> slotKey -> qty
    let dayTotal = 0;
    (lot.log || []).forEach(x => {
      const xd = x.date || today;
      if (xd !== day) return;
      const hr = parseInt((x.time || '00:00').slice(0, 2), 10);
      let slot = HOUR_SLOTS.find(sl => sl.k !== 'lunch' && sl.start === hr);
      if (hr === 12) slot = HOUR_SLOTS.find(sl => sl.k === 'lunch');
      if (!slot) slot = hr < 8 ? HOUR_SLOTS[0] : HOUR_SLOTS[HOUR_SLOTS.length - 1];
      const si = (x.stepIdx != null) ? x.stepIdx : lot.steps.findIndex(s => s.name === x.station || s.nameTh === x.station);
      if (si < 0) return;
      matrix[si] = matrix[si] || {};
      matrix[si][slot.k] = (matrix[si][slot.k] || 0) + x.qty;
      dayTotal += x.qty;
    });
    const cols = HOUR_SLOTS;
    return React.createElement('div', { className: 'card' },
      React.createElement('div', { className: 'card-h' },
        React.createElement(Icon, { name: 'clock', size: 15, style: { color: 'var(--primary)' } }),
        React.createElement('h3', null, t('sf.outputlog')),
        React.createElement('div', { className: 'card-h-actions row', style: { gap: 10 } },
          React.createElement('span', { className: 'faint', style: { fontSize: 11.5 } }, t('sf.pickday')),
          React.createElement(DateField, { value: day, onChange: setDay, style: { width: 150 } }),
          React.createElement('span', { className: 'badge badge-soft mono' }, fmt(dayTotal) + ' ' + t('u.units')))),
      React.createElement('div', { style: { overflowX: 'auto' } },
        React.createElement('table', { className: 'tbl', style: { minWidth: 880 } },
          React.createElement('thead', null, React.createElement('tr', null,
            React.createElement('th', { style: { position: 'sticky', left: 0, zIndex: 2, background: 'var(--surface-2)', minWidth: 130 } }, t('sf.outputlog')),
            cols.map(c => React.createElement('th', { key: c.k, className: 'num', style: { whiteSpace: 'nowrap', textAlign: c.k === 'lunch' ? 'center' : 'right', background: c.k === 'lunch' ? 'var(--surface-3)' : 'var(--surface-2)' } },
              c.k === 'lunch' ? (lang === 'th' ? 'พักเที่ยง' : 'Lunch') : c.label)))),
          React.createElement('tbody', null,
            lot.steps.map((st, si) => React.createElement('tr', { key: si },
              React.createElement('td', { style: { position: 'sticky', left: 0, zIndex: 1, background: 'var(--surface)', fontWeight: 600, fontSize: 11.5 } },
                React.createElement('span', { className: 'row', style: { gap: 6 } },
                  React.createElement('span', { style: { width: 16, height: 16, borderRadius: '50%', background: 'var(--surface-3)', color: 'var(--text-muted)', fontSize: 9, fontWeight: 700, display: 'grid', placeItems: 'center' } }, si + 1),
                  lang === 'th' ? st.nameTh : st.name)),
              cols.map(c => {
                const v = (matrix[si] || {})[c.k];
                return React.createElement('td', { key: c.k, className: 'num mono', style: { background: c.k === 'lunch' ? 'var(--surface-3)' : 'transparent', color: v ? 'var(--ok)' : 'var(--text-faint)', fontWeight: v ? 700 : 400 } }, v ? fmt(v) : '');
              }))))) ),
      dayTotal === 0 && React.createElement('div', { className: 'faint', style: { fontSize: 11.5, textAlign: 'center', padding: '12px 0' } }, lang === 'th' ? 'ยังไม่มีการบันทึกผลผลิตในวันที่เลือก' : 'No output reported on the selected day'));
  }

  window.PG_ShopFloor = ShopFloor;
})();
