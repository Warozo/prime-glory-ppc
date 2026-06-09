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
        const before = prev.lotsWip.find(l => l.id === lotId);
        const after = lotsWip.find(l => l.id === lotId);
        const lastIdx = after.stations.length - 1;
        const producedBefore = before.stations[lastIdx].cumOut;
        const producedNow = after.stations[lastIdx].cumOut;
        let next = { ...prev, lotsWip };

        // last station produced more → make that quantity available for FG receiving immediately
        if (producedNow > producedBefore) {
          const existing = prev.fgPending.find(f => f.po === after.po);
          if (existing) {
            next.fgPending = prev.fgPending.map(f => f.po === after.po ? { ...f, produced: producedNow } : f);
          } else {
            next.fgPending = [{ id: D.genId('FR'), po: after.po, fg: after.fg, qty: after.qty, produced: producedNow, receipts: [], completed: prev.today, status: 'pending' }, ...prev.fgPending];
          }
        }
        // whole lot finished → close PO + order (record completion date)
        const justCompleted = producedBefore < after.qty && producedNow >= after.qty;
        if (justCompleted) {
          setTimeout(() => toast(t('toast.completed')), 50);
          next.prodOrders = prev.prodOrders.map(p => p.id === after.po ? { ...p, status: 'completed', completedAt: prev.today } : p);
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

          // Output log
          React.createElement('div', { className: 'card' },
            React.createElement('div', { className: 'card-h' }, React.createElement(Icon, { name: 'clock', size: 15, style: { color: 'var(--primary)' } }), React.createElement('h3', null, t('sf.outputlog')),
              React.createElement('span', { className: 'card-h-actions faint', style: { fontSize: 11 } }, lot.log.reduce((a, x) => a + x.qty, 0) + ' ' + t('u.units'))),
            React.createElement('div', { style: { maxHeight: 220, overflowY: 'auto' } },
              React.createElement('table', { className: 'tbl' },
                React.createElement('thead', null, React.createElement('tr', null,
                  React.createElement('th', { style: { width: 92 } }, t('f.date')), React.createElement('th', { style: { width: 54 } }, t('f.time')), React.createElement('th', null, t('f.station')), React.createElement('th', { className: 'num' }, t('f.output')))),
                React.createElement('tbody', null,
                  lot.log.map((x, i) => React.createElement('tr', { key: i },
                    React.createElement('td', { className: 'mono faint' }, x.date ? fmtDate(x.date) : '—'),
                    React.createElement('td', { className: 'mono', style: { fontWeight: 600 } }, x.time),
                    React.createElement('td', null, x.station),
                    React.createElement('td', { className: 'num mono', style: { fontWeight: 600, color: 'var(--ok)' } }, '+' + fmt(x.qty))))))))))
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
        React.createElement(Field, { label: t('f.time'), required: true }, React.createElement('input', { className: 'input mono', type: 'time', value: time, onChange: (e) => setTime(e.target.value) }))),
      React.createElement(Field, { label: t('f.output') + ' (' + t('u.units') + ')', required: true },
        React.createElement('input', { className: 'input mono', type: 'number', min: 1, max: maxQ, value: qty, onChange: (e) => setQty(Math.min(maxQ, Math.max(0, +e.target.value))) })),
      React.createElement('div', { className: 'row', style: { gap: 6, marginTop: 8 } },
        [0.25, 0.5, 1].map(f => React.createElement('button', { key: f, className: 'btn btn-sm', onClick: () => setQty(Math.round(maxQ * f)) }, Math.round(f * 100) + '%'))));
  }

  window.PG_ShopFloor = ShopFloor;
})();
