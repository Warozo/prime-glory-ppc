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
      steps: l.stations.map(st => ({ key: st.step, name: st.name, nameTh: st.nameTh, type: st.type, notes: st.notes || {} })),
      prog: l.stations.map(st => st.cumOut),
      defects: l.stations.map(st => st.cumDefect || 0),
      rework: l.stations.map(st => st.reworkDone || 0),
      log: (l.outputLog || []).map(x => ({ ...x })),
    }));
    const [selId, setSelId] = React.useState(lots[0] ? lots[0].id : null);
    const [report, setReport] = React.useState(null); // {lotId, stepIdx}
    const [reworkReq, setReworkReq] = React.useState(null); // {lotId, stepIdx, pending, station}
    const [lineF, setLineF] = React.useState('');
    const [statusF, setStatusF] = React.useState('producing'); // default: show in-progress lots (finished ones don't pile up)

    // filter the lot list by production line + status (producing / done)
    const visibleLots = lots.filter(l => (!lineF || l.line === lineF) && (statusF === 'done' ? isComplete(l) : !isComplete(l)));
    const lot = visibleLots.find(l => l.id === selId) || visibleLots[0] || null;
    // per-station free-text note, stamped per day (station.notes[date])
    function saveNote(stepIdx, date, text) {
      setState(prev => ({ ...prev, lotsWip: prev.lotsWip.map(l => l.id === lot.id ? { ...l, stations: l.stations.map((st, k) => k === stepIdx ? { ...st, notes: { ...(st.notes || {}), [date]: text } } : st) } : l) }));
      toast(lang === 'th' ? 'บันทึกหมายเหตุแล้ว' : 'Note saved');
    }

    function cumIn(l, i) { return i === 0 ? l.qty : l.prog[i - 1]; }
    function wipAt(l, i) { return cumIn(l, i) - l.prog[i]; }
    function isComplete(l) { return l.prog[l.prog.length - 1] >= l.qty; }

    function applyOutput(lotId, stepIdx, qty, time, date, defect) {
      const useDate = date || state.today;
      setState(prev => {
        const lotsWip = prev.lotsWip.map(l => {
          if (l.id !== lotId) return l;
          const sp = l.stations[stepIdx];
          const cumPrev = stepIdx === 0 ? l.qty : l.stations[stepIdx - 1].cumOut;
          // uninspected input still at this station (works for normal & QA: good-inspected + defects already consumed input)
          const inAvail = cumPrev - ((sp.cumOut - (sp.reworkDone || 0)) + (sp.cumDefect || 0));
          const addGood = Math.max(0, Math.min(qty, inAvail));
          const addDefect = Math.max(0, Math.min(defect || 0, inAvail - addGood));
          const stations = l.stations.map((st, i) => i === stepIdx ? { ...st, cumOut: st.cumOut + addGood, cumDefect: (st.cumDefect || 0) + addDefect } : st);
          const stepName = lang === 'th' ? l.stations[stepIdx].nameTh : l.stations[stepIdx].name;
          const outputLog = [{ time, date: useDate, step: l.stations[stepIdx].step, stepIdx, station: stepName, qty: addGood, defect: addDefect }, ...(l.outputLog || [])];
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
          next.orders = prev.orders.map(o => o.id === after.order ? { ...o, status: 'completed', completedAt: prev.today } : o);
        }
        return next;
      });
      toast(t('toast.reported'));
    }

    // QA station: move all pending rework (defects not yet reworked) back into good output,
    // which then flows forward like normal output. Updates FG-pending/completion if it's the last station.
    function reworkDefects(lotId, stepIdx, qty) {
      setState(prev => {
        const target = prev.lotsWip.find(l => l.id === lotId);
        if (!target) return prev;
        const sp = target.stations[stepIdx];
        const pending = Math.max(0, (sp.cumDefect || 0) - (sp.reworkDone || 0));
        const amt = Math.max(0, Math.min(Math.round(qty || 0), pending)); // allow partial rework
        if (amt <= 0) return prev;
        const now = new Date(); const time = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
        const lotsWip = prev.lotsWip.map(l => {
          if (l.id !== lotId) return l;
          const stations = l.stations.map((st, i) => i === stepIdx ? { ...st, cumOut: st.cumOut + amt, reworkDone: (st.reworkDone || 0) + amt } : st);
          const stepName = lang === 'th' ? l.stations[stepIdx].nameTh : l.stations[stepIdx].name;
          const outputLog = [{ time, date: prev.today, step: l.stations[stepIdx].step, stepIdx, station: stepName, qty: amt, rework: true }, ...(l.outputLog || [])];
          return { ...l, stations, outputLog };
        });
        const after = lotsWip.find(l => l.id === lotId);
        const poId = after.po;
        let next = { ...prev, lotsWip };
        const lastOut = (w) => (w.stations[w.stations.length - 1].cumOut || 0);
        const sumForPo = (arr) => arr.filter(w => w.po === poId).reduce((a, w) => a + lastOut(w), 0);
        const producedBefore = sumForPo(prev.lotsWip), producedNow = sumForPo(lotsWip);
        const orderQty = (prev.prodOrders.find(p => p.id === poId) || {}).qty || after.qty;
        if (producedNow > producedBefore) {
          const existing = prev.fgPending.find(f => f.po === poId);
          if (existing) next.fgPending = prev.fgPending.map(f => f.po === poId ? { ...f, produced: producedNow, qty: orderQty } : f);
          else next.fgPending = [{ id: D.genId('FR'), po: poId, fg: after.fg, qty: orderQty, produced: producedNow, receipts: [], completed: prev.today, status: 'pending' }, ...prev.fgPending];
        }
        if (producedBefore < orderQty && producedNow >= orderQty) {
          setTimeout(() => toast(t('toast.completed')), 50);
          next.prodOrders = prev.prodOrders.map(p => p.id === poId ? { ...p, status: 'completed', completedAt: prev.today } : p);
          next.orders = prev.orders.map(o => o.id === after.order ? { ...o, status: 'completed', completedAt: prev.today } : o);
        }
        return next;
      });
      toast(lang === 'th' ? 'ส่ง Rework กลับเป็นผลผลิตดีแล้ว' : 'Rework returned to good output');
    }

    // the lot list shows only the filtered lots (line + status)
    const sortedLots = visibleLots;
    return React.createElement('div', null,
      React.createElement(PageHead, { title: t('sf.title'), sub: t('sf.sub') }),
      React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '230px 1fr', gap: 14, alignItems: 'start' } },

        // Lot list
        React.createElement('div', { className: 'card' },
          React.createElement('div', { className: 'card-h' }, React.createElement(Icon, { name: 'layers', size: 15, style: { color: 'var(--primary)' } }), React.createElement('h3', null, t('sf.lot')),
            React.createElement('span', { className: 'badge badge-soft', style: { marginLeft: 'auto', fontSize: 10 } }, visibleLots.length + ' / ' + lots.length)),
          // filter: production line + status (producing / completed)
          React.createElement('div', { style: { padding: '8px 10px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 7 } },
            React.createElement('select', { className: 'select', style: { width: '100%' }, value: lineF, onChange: e => setLineF(e.target.value) },
              [React.createElement('option', { key: '_all', value: '' }, lang === 'th' ? 'ทุกสายการผลิต' : 'All lines')].concat(
                state.lines.map(ln => React.createElement('option', { key: ln.id, value: ln.id }, ln.name)))),
            React.createElement('div', { className: 'pill-tabs', style: { display: 'flex' } },
              React.createElement('button', { style: { flex: 1 }, className: statusF === 'producing' ? 'on' : '', onClick: () => setStatusF('producing') }, lang === 'th' ? 'กำลังผลิต' : 'Producing'),
              React.createElement('button', { style: { flex: 1 }, className: statusF === 'done' ? 'on' : '', onClick: () => setStatusF('done') }, lang === 'th' ? 'ผลิตเสร็จสิ้น' : 'Completed'))),
          React.createElement('div', { style: { padding: 8, display: 'flex', flexDirection: 'column', gap: 7 } },
            lots.length === 0 && React.createElement('div', { className: 'empty', style: { fontSize: 11 } }, React.createElement(Icon, { name: 'shopfloor', size: 20 }), React.createElement('div', { style: { marginTop: 6 } }, lang === 'th' ? 'ยังไม่มีล็อตการผลิต' : 'No production lots yet'), React.createElement('div', { className: 'faint', style: { fontSize: 10, marginTop: 3 } }, lang === 'th' ? 'จัดใบสั่งลงตารางการผลิตก่อน' : 'Schedule an order first')),
            lots.length > 0 && visibleLots.length === 0 && React.createElement('div', { className: 'empty', style: { fontSize: 11 } }, React.createElement(Icon, { name: 'filter', size: 18 }), React.createElement('div', { style: { marginTop: 6 } }, lang === 'th' ? 'ไม่พบล็อตตามตัวกรอง' : 'No lots match the filter')),
            sortedLots.map(l => {
              const pct = Math.round(l.prog[l.prog.length - 1] / l.qty * 100);
              const done = isComplete(l);
              const on = lot && lot.id === l.id;
              return React.createElement('button', { key: l.id, onClick: () => setSelId(l.id),
                style: { textAlign: 'left', background: on ? 'var(--primary-tint)' : 'var(--surface-2)', border: '1px solid ' + (on ? 'var(--primary)' : 'var(--border)'), borderRadius: 7, padding: 9, cursor: 'pointer' } },
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
              // station chain — wraps to new rows instead of scrolling sideways
              React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(168px, 1fr))', gap: 10, paddingBottom: 6, alignItems: 'start' } },
                lot.steps.map((st, i) => {
                  const isQA = st.type === 'qa';
                  const ci = cumIn(lot, i), out = lot.prog[i];
                  const defectCum = lot.defects[i] || 0, reworked = lot.rework[i] || 0;
                  const pending = Math.max(0, defectCum - reworked);
                  // uninspected/at-station = received minus (good inspected + defects found)
                  const inspected = isQA ? ((out - reworked) + defectCum) : out;
                  const wip = ci - inspected, full = out >= lot.qty;
                  // a station is "locked" until the previous station passes output to it
                  const locked = !full && wip <= 0 && ci <= 0 && pending <= 0;
                  return React.createElement(React.Fragment, { key: i },
                    React.createElement('div', { style: { border: '1px solid ' + (full ? 'color-mix(in srgb,var(--ok) 35%,white)' : wip > 0 ? 'var(--primary)' : 'var(--border)'), borderRadius: 9, overflow: 'hidden', background: full ? 'var(--ok-tint)' : locked ? 'var(--surface-2)' : 'var(--surface)', opacity: locked ? 0.7 : 1 } },
                      React.createElement('div', { style: { padding: '7px 10px', background: full ? 'color-mix(in srgb,var(--ok) 14%,white)' : wip > 0 ? 'var(--primary-tint)' : 'var(--surface-2)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6 } },
                        React.createElement('span', { style: { width: 18, height: 18, borderRadius: '50%', background: full ? 'var(--ok)' : locked ? 'var(--text-faint)' : 'var(--primary)', color: '#fff', fontSize: 9.5, fontWeight: 700, display: 'grid', placeItems: 'center' } }, i + 1),
                        React.createElement('span', { style: { fontSize: 11, fontWeight: 700, lineHeight: 1.15 } }, lang === 'th' ? st.nameTh : st.name),
                        isQA && React.createElement('span', { className: 'badge', style: { marginLeft: 'auto', color: 'var(--danger)', background: 'var(--danger-tint)', fontSize: 8.5, flexShrink: 0 } }, 'QA')),
                      React.createElement('div', { style: { padding: 10 } },
                        React.createElement(StatRow, { label: t('sf.totalin'), v: ci, color: 'var(--text-muted)' }),
                        React.createElement(StatRow, { label: t('sf.atstation'), v: wip, color: wip > 0 ? 'var(--primary)' : 'var(--text-faint)', big: true }),
                        React.createElement(StatRow, { label: isQA ? (lang === 'th' ? 'ผลผลิตดีสะสม' : 'Good output') : t('sf.cumoutput'), v: out, color: full ? 'var(--ok)' : 'var(--text-muted)' }),
                        isQA && React.createElement(StatRow, { label: lang === 'th' ? 'Defect สะสม' : 'Defect total', v: defectCum, color: 'var(--danger)' }),
                        isQA && React.createElement(StatRow, { label: lang === 'th' ? 'ยอดรอ Rework' : 'Pending rework', v: pending, color: 'var(--danger)' }),
                        React.createElement('div', { style: { marginTop: 7 } }, React.createElement(Progress, { value: out / lot.qty * 100, color: full ? 'var(--ok)' : 'var(--primary)', height: 5 })),
                        !isComplete(lot) && wip > 0 && React.createElement('button', { className: 'btn btn-sm btn-pri', style: { width: '100%', marginTop: 8 }, onClick: () => setReport({ lotId: lot.id, stepIdx: i }) },
                          React.createElement(Icon, { name: 'arrowR', size: 12 }), t('btn.report')),
                        isQA && pending > 0 && React.createElement('button', { className: 'btn btn-sm', style: { width: '100%', marginTop: 6, color: 'var(--ok)', borderColor: 'var(--ok)' }, onClick: () => setReworkReq({ lotId: lot.id, stepIdx: i, pending, station: lang === 'th' ? st.nameTh : st.name }) },
                          React.createElement(Icon, { name: 'check', size: 12 }), lang === 'th' ? 'ส่งยอด Rework' : 'Send rework'),
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
                              React.createElement('span', { className: 'mono', style: { fontWeight: 700 } },
                                React.createElement('span', { style: { color: x.rework ? 'var(--primary)' : 'var(--ok)' } }, (x.rework ? '↻' : '+') + fmt(x.qty)),
                                x.defect > 0 && React.createElement('span', { style: { color: 'var(--danger)', marginLeft: 5 } }, '✕' + fmt(x.defect))))));
                        })())),
                    null);
                })))),

          // Output log — hourly matrix (steps × hour slots) for a selected day
          React.createElement(HourlyOutputTable, { lot, today: state.today, t, lang, onSaveNote: saveNote })))
      ,
      report && (function () {
        const rl = lots.find(l => l.id === report.lotId); const i = report.stepIdx;
        const isQA = rl.steps[i].type === 'qa';
        const ci = i === 0 ? rl.qty : rl.prog[i - 1];
        const inspected = isQA ? ((rl.prog[i] - rl.rework[i]) + rl.defects[i]) : rl.prog[i];
        const maxQ = ci - inspected;
        return React.createElement(ReportModal, { lot: rl, stepIdx: i, isQA, maxQ, today: state.today, t, lang,
          onClose: () => setReport(null), onSubmit: (qty, time, date, defect) => { applyOutput(report.lotId, i, qty, time, date, defect); setReport(null); } });
      })(),
      reworkReq && React.createElement(ReworkModal, { req: reworkReq, t, lang,
        onClose: () => setReworkReq(null), onSubmit: (q) => { reworkDefects(reworkReq.lotId, reworkReq.stepIdx, q); setReworkReq(null); } }));
  }

  function ReworkModal({ req, t, lang, onClose, onSubmit }) {
    const Modal = window.PG_UI.Modal, Field = window.PG_UI.Field, fmt = window.PG_UI.fmt;
    const [qty, setQty] = React.useState(0);
    const q = Math.max(0, Math.min(Math.round(+qty || 0), req.pending));
    const submit = () => { if (q > 0) onSubmit(q); };
    return React.createElement(Modal, { title: lang === 'th' ? 'ส่งยอด Rework เสร็จ' : 'Send completed rework', onClose, width: 400,
      footer: React.createElement(React.Fragment, null,
        React.createElement('button', { className: 'btn', onClick: onClose }, t('btn.cancel')),
        React.createElement('button', { className: 'btn btn-pri', disabled: q <= 0, onClick: submit }, React.createElement(Icon, { name: 'check', size: 14 }), t('btn.confirm'))) },
      React.createElement('div', { style: { background: 'var(--surface-2)', borderRadius: 8, padding: '10px 12px', marginBottom: 14, fontSize: 12 } },
        React.createElement('div', { className: 'row', style: { justifyContent: 'space-between' } }, React.createElement('span', { className: 'faint' }, t('f.station')), React.createElement('b', null, req.station)),
        React.createElement('div', { className: 'row', style: { justifyContent: 'space-between', marginTop: 4 } }, React.createElement('span', { className: 'faint' }, lang === 'th' ? 'ยอดรอ Rework' : 'Pending rework'), React.createElement('b', { className: 'mono', style: { color: 'var(--danger)' } }, fmt(req.pending)))),
      React.createElement(Field, { label: (lang === 'th' ? 'จำนวนที่ Rework เสร็จ' : 'Quantity reworked'), required: true, hint: lang === 'th' ? 'ส่งบางส่วนได้ ที่เหลือยังค้างรอ Rework' : 'You can send part of it; the rest stays pending' },
        React.createElement(Numpad, { value: qty, max: req.pending, lang: lang, onChange: setQty, onEnter: submit })),
      React.createElement('div', { className: 'row', style: { gap: 6, marginTop: 8 } },
        React.createElement('button', { className: 'btn btn-sm', onClick: () => setQty(Math.round(req.pending / 2)) }, '50%'),
        React.createElement('button', { className: 'btn btn-sm', onClick: () => setQty(req.pending) }, lang === 'th' ? 'ทั้งหมด' : 'All')));
  }

  function StatRow({ label, v, color, big }) {
    return React.createElement('div', { className: 'row', style: { justifyContent: 'space-between', margin: '2px 0' } },
      React.createElement('span', { style: { fontSize: 10, color: 'var(--text-faint)' } }, label),
      React.createElement('span', { className: 'mono', style: { fontWeight: big ? 700 : 600, fontSize: big ? 15 : 11.5, color } }, window.PG_UI.fmt(v)));
  }

  // Editable note cell (one per process column) at the bottom of the output-log table.
  // Saves on blur when the text changed.
  function NoteCell({ note, onSave }) {
    const [text, setText] = React.useState(note || '');
    React.useEffect(() => { setText(note || ''); }, [note]);
    return React.createElement('td', { style: { padding: 4, verticalAlign: 'top' } },
      React.createElement('textarea', { className: 'input', value: text, rows: 2, placeholder: '—',
        onChange: (ev) => setText(ev.target.value),
        onBlur: () => { if ((text || '') !== (note || '')) onSave(text); },
        style: { fontSize: 10, width: '100%', minWidth: 74, minHeight: 30, resize: 'vertical', lineHeight: 1.3 } }));
  }

  // On-screen number pad for shop-floor entry (digits, Clear, backspace, Enter)
  function Numpad({ value, max, lang, accent, onChange, onEnter }) {
    const set = (n) => onChange(Math.max(0, Math.min(max, Math.round(n) || 0)));
    const press = (d) => { const cur = String(value || 0); set(+((cur === '0' ? '' : cur) + d)); };
    const back = () => { const cur = String(value || 0); set(+(cur.length > 1 ? cur.slice(0, -1) : '0')); };
    const key = (label, fn, extra) => React.createElement('button', { type: 'button', onClick: fn,
      style: Object.assign({ height: 44, fontSize: 18, fontWeight: 700, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)', color: 'var(--text)', cursor: 'pointer' }, extra || {}) }, label);
    return React.createElement('div', null,
      React.createElement('div', { style: { textAlign: 'right', fontFamily: 'IBM Plex Mono, monospace', fontSize: 27, fontWeight: 700, color: accent || 'var(--text)', padding: '5px 14px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, marginBottom: 8 } }, fmt(value || 0) + ' / ' + fmt(max)),
      React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 } },
        ['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(d => key(d, () => press(d))),
        key(lang === 'th' ? 'ล้าง' : 'Clear', () => set(0), { color: 'var(--danger)', fontSize: 14 }),
        key('0', () => press('0')),
        key('⌫', back, { fontSize: 20 }),
        key(lang === 'th' ? 'ตกลง ✓' : 'Enter ✓', onEnter, { gridColumn: 'span 3', background: 'var(--primary)', color: '#fff', borderColor: 'var(--primary)', marginTop: 2 })));
  }

  function ReportModal({ lot, stepIdx, maxQ, isQA, today, t, lang, onClose, onSubmit }) {
    const step = lot.steps[stepIdx];
    const [qty, setQty] = React.useState(0);
    const [defect, setDefect] = React.useState(0);
    const [date, setDate] = React.useState(today);
    const [time, setTime] = React.useState(() => { const n = new Date(); return String(n.getHours()).padStart(2, '0') + ':' + String(n.getMinutes()).padStart(2, '0'); });
    const [active, setActive] = React.useState('good'); // which value the numpad edits (QA: good|defect)
    const DateField = window.PG_UI.DateField;
    const total = qty + (isQA ? defect : 0);
    const canSubmit = total > 0 && total <= maxQ;
    const submit = () => { if (canSubmit) onSubmit(qty, time, date, isQA ? defect : 0); };
    return React.createElement(Modal, { title: t('sf.reportout'), onClose, width: 440,
      footer: React.createElement(React.Fragment, null,
        React.createElement('button', { className: 'btn', onClick: onClose }, t('btn.cancel')),
        React.createElement('button', { className: 'btn btn-pri', disabled: !canSubmit, onClick: submit }, React.createElement(Icon, { name: 'check', size: 14 }), t('btn.confirm'))) },
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
      isQA
        ? React.createElement('div', null,
            React.createElement('div', { className: 'row', style: { gap: 8, marginBottom: 8 } },
              React.createElement('button', { type: 'button', onClick: () => setActive('good'), style: { flex: 1, padding: '7px 10px', borderRadius: 8, cursor: 'pointer', textAlign: 'left', border: '1px solid ' + (active === 'good' ? 'var(--ok)' : 'var(--border)'), background: active === 'good' ? 'var(--ok-tint)' : 'var(--surface-2)' } },
                React.createElement('div', { style: { fontSize: 10.5, color: 'var(--text-muted)' } }, lang === 'th' ? 'ผลผลิตดี' : 'Good'),
                React.createElement('div', { className: 'mono', style: { fontSize: 18, fontWeight: 700, color: 'var(--ok)' } }, fmt(qty))),
              React.createElement('button', { type: 'button', onClick: () => setActive('defect'), style: { flex: 1, padding: '7px 10px', borderRadius: 8, cursor: 'pointer', textAlign: 'left', border: '1px solid ' + (active === 'defect' ? 'var(--danger)' : 'var(--border)'), background: active === 'defect' ? 'var(--danger-tint)' : 'var(--surface-2)' } },
                React.createElement('div', { style: { fontSize: 10.5, color: 'var(--text-muted)' } }, lang === 'th' ? 'ของเสีย (Defect)' : 'Defect'),
                React.createElement('div', { className: 'mono', style: { fontSize: 18, fontWeight: 700, color: 'var(--danger)' } }, fmt(defect)))),
            active === 'good'
              ? React.createElement(Numpad, { value: qty, max: maxQ - defect, lang: lang, accent: 'var(--ok)', onChange: setQty, onEnter: submit })
              : React.createElement(Numpad, { value: defect, max: maxQ - qty, lang: lang, accent: 'var(--danger)', onChange: setDefect, onEnter: submit }))
        : React.createElement('div', null,
            React.createElement('div', { style: { fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 } }, t('f.output') + ' (' + t('u.units') + ')'),
            React.createElement(Numpad, { value: qty, max: maxQ, lang: lang, onChange: setQty, onEnter: submit })),
      React.createElement('div', { className: 'row', style: { gap: 6, marginTop: 10 } },
        [0.25, 0.5, 1].map(f => React.createElement('button', { key: f, className: 'btn btn-sm', onClick: () => { const cap = isQA ? (active === 'defect' ? maxQ - qty : maxQ - defect) : maxQ; const v = Math.round(cap * f); if (isQA && active === 'defect') setDefect(v); else setQty(v); } }, Math.round(f * 100) + '%'))));
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
  function HourlyOutputTable({ lot, today, t, lang, onSaveNote }) {
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
    const stepLabel = (st, si) => (si + 1) + '. ' + (st.type === 'qa' ? 'QA ' : '') + (lang === 'th' ? st.nameTh : st.name);
    const hasNotes = lot.steps.some(st => ((st.notes || {})[day] || '').trim());
    // export the SELECTED DAY only: time-slot rows x process columns, plus the note row
    function exportLog() {
      const headers = [lang === 'th' ? 'ช่วงเวลา' : 'Time'].concat(lot.steps.map(stepLabel));
      const rows = cols.map(c => [c.k === 'lunch' ? (lang === 'th' ? 'พักเที่ยง' : 'Lunch') : c.label]
        .concat(lot.steps.map((st, si) => (matrix[si] || {})[c.k] || 0)));
      rows.push([lang === 'th' ? 'รวม' : 'Total'].concat(lot.steps.map((st, si) => cols.reduce((a, c) => a + ((matrix[si] || {})[c.k] || 0), 0))));
      rows.push([lang === 'th' ? 'หมายเหตุ' : 'Note'].concat(lot.steps.map(st => (st.notes || {})[day] || '')));
      window.PG_UI.exportCsv('output-log-' + lot.id + '-' + day + '.csv', headers, rows);
    }
    return React.createElement('div', { className: 'card' },
      React.createElement('div', { className: 'card-h' },
        React.createElement(Icon, { name: 'clock', size: 15, style: { color: 'var(--primary)' } }),
        React.createElement('h3', null, t('sf.outputlog')),
        React.createElement('div', { className: 'card-h-actions row', style: { gap: 10 } },
          React.createElement('button', { className: 'btn btn-sm', onClick: exportLog, disabled: dayTotal === 0 && !hasNotes }, React.createElement(Icon, { name: 'export', size: 14 }), lang === 'th' ? 'ส่งออก CSV' : 'Export CSV'),
          React.createElement('span', { className: 'faint', style: { fontSize: 11.5 } }, t('sf.pickday')),
          React.createElement(DateField, { value: day, onChange: setDay, style: { width: 150 } }),
          React.createElement('span', { className: 'badge badge-soft mono' }, fmt(dayTotal) + ' ' + t('u.units')))),
      React.createElement('div', { style: { overflowX: 'auto' } },
        React.createElement('table', { className: 'tbl tbl-grid', style: { minWidth: Math.max(560, 120 + lot.steps.length * 92) } },
          // header: time column + one column per step
          React.createElement('thead', null, React.createElement('tr', null,
            React.createElement('th', { style: { position: 'sticky', left: 0, zIndex: 2, background: 'var(--surface-2)', minWidth: 118 } }, lang === 'th' ? 'ช่วงเวลา' : 'Time'),
            lot.steps.map((st, si) => React.createElement('th', { key: si, className: 'num', style: { textAlign: 'right', verticalAlign: 'bottom', whiteSpace: 'normal', background: 'var(--surface-2)', minWidth: 84 } },
              React.createElement('div', { className: 'row', style: { gap: 4, justifyContent: 'flex-end' } },
                st.type === 'qa' && React.createElement('span', { style: { color: 'var(--danger)', fontSize: 8, fontWeight: 700 } }, 'QA'),
                React.createElement('span', { style: { width: 15, height: 15, borderRadius: '50%', background: 'var(--surface-3)', color: 'var(--text-muted)', fontSize: 8.5, fontWeight: 700, display: 'grid', placeItems: 'center', flexShrink: 0 } }, si + 1)),
              React.createElement('div', { style: { fontSize: 9.5, fontWeight: 600, lineHeight: 1.15, marginTop: 2 } }, lang === 'th' ? st.nameTh : st.name))))),
          // body: one row per hour slot
          React.createElement('tbody', null,
            cols.map(c => React.createElement('tr', { key: c.k, style: c.k === 'lunch' ? { background: 'var(--surface-3)' } : null },
              React.createElement('td', { style: { position: 'sticky', left: 0, zIndex: 1, background: c.k === 'lunch' ? 'var(--surface-3)' : 'var(--surface)', fontWeight: 600, fontSize: 11, whiteSpace: 'nowrap' } },
                c.k === 'lunch' ? (lang === 'th' ? 'พักเที่ยง' : 'Lunch') : c.label),
              lot.steps.map((st, si) => {
                const v = (matrix[si] || {})[c.k];
                return React.createElement('td', { key: si, className: 'num mono', style: { color: v ? 'var(--ok)' : 'var(--text-faint)', fontWeight: v ? 700 : 400 } }, v ? fmt(v) : '');
              }))),
            // note row at the very bottom — one editable note per process column
            React.createElement('tr', { style: { borderTop: '2px solid var(--border-strong)' } },
              React.createElement('td', { style: { position: 'sticky', left: 0, zIndex: 1, background: 'var(--surface-2)', fontWeight: 700, fontSize: 11, whiteSpace: 'nowrap' } }, lang === 'th' ? 'หมายเหตุ' : 'Note'),
              lot.steps.map((st, si) => React.createElement(NoteCell, { key: si + '_' + day, note: (st.notes || {})[day] || '', onSave: (txt) => onSaveNote(si, day, txt) }))))) ),
      dayTotal === 0 && React.createElement('div', { className: 'faint', style: { fontSize: 11.5, textAlign: 'center', padding: '12px 0' } }, lang === 'th' ? 'ยังไม่มีการบันทึกผลผลิตในวันที่เลือก' : 'No output reported on the selected day'));
  }

  // ---- QA department board: hourly defects + cumulative defect / pending rework per line & order ----
  function QABoard({ state, go }) {
    const { t, lang } = useI18n();
    const s = state;
    const DateField = window.PG_UI.DateField, Stat = window.PG_UI.Stat;
    const [day, setDay] = React.useState(s.today);
    const [lineF, setLineF] = React.useState('');
    const [statusF, setStatusF] = React.useState('producing'); // default: in-progress orders (finished ones don't pile up)
    const cols = HOUR_SLOTS;
    const LINE_COLORS = { A: '#2d5bd7', B: '#7b5cd9', C: '#1f8a5b', D: '#e08a1e', E: '#cf3b3b', F: '#0e7490', G: '#9333ea' };
    const lotDone = (lot) => { const last = lot.stations[lot.stations.length - 1]; return !!last && (last.cumOut || 0) >= lot.qty; };
    const includeLot = (lot) => (!lineF || lot.line === lineF) && (statusF === 'done' ? lotDone(lot) : !lotDone(lot));

    // break down by EACH QA station (a process can have several QA steps)
    const cum = {};      // line -> po -> stationIdx -> { defect, rework, name, fg }
    const hourly = {};   // line -> po -> stationIdx -> hourKey -> defect qty (selected day)
    let totDefect = 0, totRework = 0;
    s.lotsWip.forEach(lot => {
      if (!includeLot(lot)) return;
      let lotHasQA = false;
      lot.stations.forEach((st, idx) => {
        if (st.type !== 'qa') return;
        lotHasQA = true;
        const d = st.cumDefect || 0, r = st.reworkDone || 0;
        totDefect += d; totRework += r;
        if (d === 0 && r === 0) return;
        cum[lot.line] = cum[lot.line] || {};
        cum[lot.line][lot.po] = cum[lot.line][lot.po] || {};
        cum[lot.line][lot.po][idx] = { defect: d, rework: r, name: lang === 'th' ? st.nameTh : st.name, fg: lot.fg };
      });
      if (!lotHasQA) return;
      (lot.outputLog || []).forEach(e => {
        if (!(e.defect > 0) || e.stepIdx == null) return;
        if ((e.date || s.today) !== day) return;
        const hr = parseInt((e.time || '00:00').slice(0, 2), 10);
        let slot = cols.find(sl => sl.k !== 'lunch' && sl.start === hr);
        if (hr === 12) slot = cols.find(sl => sl.k === 'lunch');
        if (!slot) slot = hr < 8 ? cols[0] : cols[cols.length - 1];
        hourly[lot.line] = hourly[lot.line] || {};
        hourly[lot.line][lot.po] = hourly[lot.line][lot.po] || {};
        hourly[lot.line][lot.po][e.stepIdx] = hourly[lot.line][lot.po][e.stepIdx] || {};
        hourly[lot.line][lot.po][e.stepIdx][slot.k] = (hourly[lot.line][lot.po][e.stepIdx][slot.k] || 0) + e.defect;
      });
    });
    const lineIds = s.lines.filter(l => cum[l.id]).map(l => l.id);
    const hasData = lineIds.length > 0;

    function exportQA() {
      const headers = [lang === 'th' ? 'สาย' : 'Line', lang === 'th' ? 'ใบสั่งผลิต' : 'Production order', lang === 'th' ? 'ขั้น QA' : 'QA step', lang === 'th' ? 'สินค้า' : 'Product']
        .concat(cols.map(c => c.k === 'lunch' ? (lang === 'th' ? 'พักเที่ยง' : 'Lunch') : c.label))
        .concat([lang === 'th' ? 'Defect รวม' : 'Total defect', lang === 'th' ? 'รอ Rework' : 'Pending rework']);
      const rows = [];
      lineIds.forEach(ln => {
        const ln0 = s.lines.find(l => l.id === ln);
        const lineName = ln0 ? ln0.name : 'Line ' + ln;
        Object.keys(cum[ln]).forEach(po => Object.keys(cum[ln][po]).forEach(idx => {
          const info = cum[ln][po][idx];
          const hrow = cols.map(c => (((hourly[ln] || {})[po] || {})[idx] || {})[c.k] || 0);
          rows.push([lineName, po, info.name, D.fgName(s, info.fg, lang)].concat(hrow).concat([info.defect, info.defect - info.rework]));
        }));
      });
      window.PG_UI.exportCsv('qa-defects-' + day + '.csv', headers, rows);
    }

    return React.createElement('div', null,
      React.createElement(PageHead, { title: lang === 'th' ? 'กระดานคุณภาพ (QA)' : 'Quality Board (QA)', sub: lang === 'th' ? 'ติดตาม Defect รายชั่วโมง แยกตามสายผลิตและใบสั่งผลิต' : 'Hourly defects by production line and order' }),
      React.createElement('div', { className: 'grid g-3', style: { marginBottom: 'var(--gap)' } },
        React.createElement(Stat, { label: lang === 'th' ? 'Defect สะสมทั้งหมด' : 'Total defects', value: fmt(totDefect), accent: 'var(--danger)', icon: 'alert' }),
        React.createElement(Stat, { label: lang === 'th' ? 'Rework แล้ว' : 'Reworked', value: fmt(totRework), accent: 'var(--ok)', icon: 'check' }),
        React.createElement(Stat, { label: lang === 'th' ? 'ยอดรอ Rework' : 'Pending rework', value: fmt(totDefect - totRework), accent: 'var(--warn)', icon: 'clock' })),
      React.createElement('div', { className: 'card' },
        React.createElement('div', { className: 'card-h' },
          React.createElement(Icon, { name: 'qc', size: 15, style: { color: 'var(--danger)' } }),
          React.createElement('h3', null, lang === 'th' ? 'Defect รายชั่วโมง' : 'Hourly defects'),
          React.createElement('div', { className: 'card-h-actions row', style: { gap: 8, flexWrap: 'wrap' } },
            React.createElement('select', { className: 'select', style: { width: 148 }, value: lineF, onChange: e => setLineF(e.target.value) },
              [React.createElement('option', { key: '_all', value: '' }, lang === 'th' ? 'ทุกสายการผลิต' : 'All lines')].concat(
                s.lines.map(ln => React.createElement('option', { key: ln.id, value: ln.id }, ln.name)))),
            React.createElement('div', { className: 'pill-tabs' },
              React.createElement('button', { className: statusF === 'producing' ? 'on' : '', onClick: () => setStatusF('producing') }, lang === 'th' ? 'กำลังผลิต' : 'Producing'),
              React.createElement('button', { className: statusF === 'done' ? 'on' : '', onClick: () => setStatusF('done') }, lang === 'th' ? 'ผลิตเสร็จสิ้น' : 'Completed')),
            React.createElement('button', { className: 'btn btn-sm', onClick: exportQA, disabled: !hasData }, React.createElement(Icon, { name: 'export', size: 14 }), lang === 'th' ? 'ส่งออก CSV' : 'Export CSV'),
            React.createElement('span', { className: 'faint', style: { fontSize: 11.5 } }, lang === 'th' ? 'เลือกวัน' : 'Day'),
            React.createElement(DateField, { value: day, onChange: setDay, style: { width: 150 } }))),
        !hasData
          ? React.createElement('div', { className: 'empty', style: { padding: '40px 20px' } },
              React.createElement(Icon, { name: 'qc', size: 26, style: { color: 'var(--text-faint)' } }),
              React.createElement('div', { style: { marginTop: 8, fontSize: 12.5 } }, lang === 'th' ? 'ยังไม่มีข้อมูล Defect จากสถานี QA' : 'No QA defect data yet'),
              React.createElement('div', { className: 'faint', style: { fontSize: 11, marginTop: 3 } }, lang === 'th' ? 'เมื่อสถานี QA รายงานของเสีย จะแสดงที่นี่' : 'Defects reported at QA stations will appear here'))
          : React.createElement('div', { style: { overflowX: 'auto' } },
              React.createElement('table', { className: 'tbl tbl-grid', style: { minWidth: Math.max(760, 280 + cols.length * 54) } },
                React.createElement('thead', null, React.createElement('tr', null,
                  React.createElement('th', { style: { position: 'sticky', left: 0, zIndex: 2, background: 'var(--surface-2)', minWidth: 230 } }, lang === 'th' ? 'สาย / ใบสั่งผลิต · ขั้น QA' : 'Line / Order · QA step'),
                  cols.map(c => React.createElement('th', { key: c.k, className: 'num', style: { whiteSpace: 'nowrap', textAlign: c.k === 'lunch' ? 'center' : 'right', background: c.k === 'lunch' ? 'var(--surface-3)' : 'var(--surface-2)' } }, c.k === 'lunch' ? (lang === 'th' ? 'พักเที่ยง' : 'Lunch') : c.label)),
                  React.createElement('th', { className: 'num', style: { background: 'var(--surface-2)', whiteSpace: 'nowrap' } }, lang === 'th' ? 'Defect รวม' : 'Defect'),
                  React.createElement('th', { className: 'num', style: { background: 'var(--surface-2)', whiteSpace: 'nowrap' } }, lang === 'th' ? 'รอ Rework' : 'Pending'))),
                React.createElement('tbody', null,
                  lineIds.reduce((rows, ln) => {
                    const ln0 = s.lines.find(l => l.id === ln);
                    let lineDefect = 0, linePending = 0;
                    Object.keys(cum[ln]).forEach(po => Object.keys(cum[ln][po]).forEach(idx => { const x = cum[ln][po][idx]; lineDefect += x.defect; linePending += (x.defect - x.rework); }));
                    rows.push(React.createElement('tr', { key: 'L_' + ln, style: { background: 'var(--surface-2)' } },
                      React.createElement('td', { style: { position: 'sticky', left: 0, zIndex: 1, background: 'var(--surface-2)', fontWeight: 700, fontSize: 11.5 } },
                        React.createElement('span', { className: 'row', style: { gap: 6 } },
                          React.createElement('span', { style: { width: 9, height: 9, borderRadius: 2, background: LINE_COLORS[ln] || '#888' } }),
                          (ln0 ? ln0.name : 'Line ' + ln))),
                      cols.map(c => React.createElement('td', { key: c.k, style: { background: c.k === 'lunch' ? 'var(--surface-3)' : 'transparent' } }, '')),
                      React.createElement('td', { className: 'num mono', style: { fontWeight: 700, color: 'var(--danger)' } }, fmt(lineDefect)),
                      React.createElement('td', { className: 'num mono', style: { fontWeight: 700, color: linePending > 0 ? 'var(--warn)' : 'var(--text-faint)' } }, fmt(linePending))));
                    // one row per (order × QA station) so multiple QA steps show separately
                    Object.keys(cum[ln]).forEach(po => {
                      Object.keys(cum[ln][po]).forEach(idx => {
                        const info = cum[ln][po][idx];
                        rows.push(React.createElement('tr', { key: ln + '_' + po + '_' + idx, className: 'clickrow', onClick: () => go('shopfloor') },
                          React.createElement('td', { style: { position: 'sticky', left: 0, zIndex: 1, background: 'var(--surface)', paddingLeft: 26 } },
                            React.createElement('div', { className: 'row', style: { gap: 6 } },
                              React.createElement('span', { className: 'mono', style: { fontSize: 10.5, fontWeight: 600, color: 'var(--primary)' } }, po),
                              React.createElement('span', { style: { fontSize: 11, fontWeight: 600 } }, info.name)),
                            React.createElement('div', { className: 'faint', style: { fontSize: 9.5, marginTop: 1 } }, D.fgName(s, info.fg, lang))),
                          cols.map(c => { const v = (((hourly[ln] || {})[po] || {})[idx] || {})[c.k]; return React.createElement('td', { key: c.k, className: 'num mono', style: { background: c.k === 'lunch' ? 'var(--surface-3)' : 'transparent', color: v ? 'var(--danger)' : 'var(--text-faint)', fontWeight: v ? 700 : 400 } }, v ? fmt(v) : '·'); }),
                          React.createElement('td', { className: 'num mono', style: { fontWeight: 600, color: 'var(--danger)' } }, fmt(info.defect)),
                          React.createElement('td', { className: 'num mono', style: { fontWeight: 600, color: (info.defect - info.rework) > 0 ? 'var(--warn)' : 'var(--text-faint)' } }, fmt(info.defect - info.rework))));
                      });
                    });
                    return rows;
                  }, []))))));
  }

  window.PG_ShopFloor = ShopFloor;
  window.PG_QA = QABoard;
})();
