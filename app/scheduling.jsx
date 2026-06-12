/* ============================================================
   Module: Production Scheduling — Gantt (HERO)
   Drag unscheduled orders onto lines · move · resize
   ============================================================ */
(function () {
  const { useI18n } = window.PG_I18N;
  const { PageHead, Icon, fmt, fmtDate, useToast, PriorityBadge, Modal, Field, DateField } = window.PG_UI;
  const D = window.PG_DATA;

  const DAYS = 12, DAY_W = 62, ROW_H = 58, LABEL_W = 178;
  const LINE_COLORS = { A: '#2d5bd7', B: '#7b5cd9', C: '#1f8a5b' };

  function Schedule({ state, setState, go }) {
    const { t, lang } = useI18n();
    const toast = useToast();
    const gridRef = React.useRef(null);
    const drag = React.useRef(null);

    const iso = (dayIdx) => { const dd = new Date(state.today); dd.setDate(dd.getDate() + dayIdx); return dd.toISOString().slice(0, 10); };

    // Bars are persisted in shared state (state.scheduleBars) so they survive navigation.
    // Each bar is ONE allocation of a PO onto a line: { id (alloc id), po (parent PO), qty (sub-qty), line, startDay, days }.
    // Legacy bars used id === po.id with no `.po`; normalise them so po always exists.
    const [bars, setBarsRaw] = React.useState(() => (state.scheduleBars || []).map(b => ({ ...b, po: b.po || b.id })));
    const barsRef = React.useRef(bars);
    const setBars = (updater) => setBarsRaw(prev => { const next = typeof updater === 'function' ? updater(prev) : updater; barsRef.current = next; return next; });
    const [activeBar, setActiveBar] = React.useState(null);
    const [allocReq, setAllocReq] = React.useState(null); // { po, lineId, startDay, max } — pending split allocation

    // Visible window: choose a date range (quick 7/15/30 days or custom from–to).
    // Bars stay stored relative to "today"; the window only pans/zooms what is shown,
    // so a bar can be dragged/stretched freely up to the end of the displayed dates.
    const def = React.useMemo(() => { const e = new Date(state.today); e.setDate(e.getDate() + 14); return { from: state.today, to: e.toISOString().slice(0, 10) }; }, [state.today]);
    const [range, setRange] = React.useState(def);
    const quickRange = (n) => { const e = new Date(state.today); e.setDate(e.getDate() + (n - 1)); setRange({ from: state.today, to: e.toISOString().slice(0, 10) }); };
    let _d0 = new Date(range.from), _d1 = new Date(range.to);
    if (isNaN(_d0)) _d0 = new Date(state.today);
    if (isNaN(_d1)) _d1 = new Date(state.today);
    if (_d1 < _d0) { const tmp = _d0; _d0 = _d1; _d1 = tmp; }
    const startOffset = Math.round((_d0 - new Date(state.today)) / 864e5); // window start, in days from today (can be <0)
    const dayCount = Math.max(1, Math.min(60, Math.round((_d1 - _d0) / 864e5) + 1));
    const winEnd = startOffset + dayCount; // exclusive end day-index (relative to today)

    // How much of a PO is already placed on the board, and how much is left to allocate
    const allocatedOf = (poId) => bars.filter(b => b.po === poId).reduce((a, b) => a + b.qty, 0);
    const remainingOf = (po) => +(po.qty - allocatedOf(po.id)).toFixed(0);

    // Two pools: ready (materials issued, still has qty to place) — draggable; waiting (reserved) — not draggable.
    // A split order keeps showing in the ready pool (with its remaining qty) until fully allocated.
    const poolReady = state.prodOrders.filter(p => (p.status === 'issued' || p.status === 'scheduled' || p.status === 'inprogress') && remainingOf(p) > 0);
    const poolWaiting = state.prodOrders.filter(p => p.status === 'reserved');

    // Single sorted line order used for BOTH rendering and drag row-index math,
    // so a dragged bar lands on the line actually under the cursor (A, B, C ...).
    const sortedLines = state.lines.slice().sort((a, b) => a.id.localeCompare(b.id));

    function persist() {
      setState(prev => ({ ...prev, scheduleBars: barsRef.current,
        // keep each started lot's line in sync with its allocation bar (line is locked post-start, so usually a no-op)
        lotsWip: prev.lotsWip.map(w => { const b = barsRef.current.find(x => x.id === (w.alloc || w.po)); return b && b.line !== w.line ? { ...w, line: b.line } : w; }) }));
    }

    const dayDate = (i) => { const d = new Date(state.today); d.setDate(d.getDate() + startOffset + i); return d; };

    function onBarPointerDown(e, bar, mode) {
      e.stopPropagation();
      e.preventDefault();
      // measure the ACTUAL rendered day-cell width and row height so the drag
      // tracks the cursor even if CSS/zoom makes them differ from the constants.
      // NOTE: for resize, e.currentTarget is the handle (a child of the bar), so step up to the bar first.
      const barEl = (mode === 'resize') ? e.currentTarget.parentElement : e.currentTarget;
      const cellsDiv = barEl ? barEl.parentElement : null;       // bars live inside the day-cells container
      const rowEl = cellsDiv ? cellsDiv.parentElement : null;
      const dayCell = cellsDiv ? cellsDiv.querySelector('div') : null; // first child = first day cell
      const dayW = dayCell ? dayCell.getBoundingClientRect().width : DAY_W;
      const rowH = rowEl ? rowEl.getBoundingClientRect().height : ROW_H;
      drag.current = { id: bar.id, mode, startX: e.clientX, startY: e.clientY, oStart: bar.startDay, oDays: bar.days, oLine: bar.line, dayW, rowH };
      setActiveBar(bar.id);
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    }
    // a bar (allocation) is "started" once its own WIP lot exists → line is locked;
    // "completed" once that lot's final-station output reaches its sub-qty
    const lotOfBar = (bar) => state.lotsWip.find(w => (w.alloc || w.po) === bar.id);
    function barStarted(bar) { return !!lotOfBar(bar); }
    function barCompleted(bar) { const l = lotOfBar(bar); return !!l && l.stations[l.stations.length - 1].cumOut >= l.qty; }

    function onMove(e) {
      const d = drag.current; if (!d) return;
      const dDays = Math.round((e.clientX - d.startX) / (d.dayW || DAY_W));
      setBars(prev => prev.map(b => {
        if (b.id !== d.id) return b;
        if (d.mode === 'resize') {
          const days = Math.max(1, Math.min(winEnd - b.startDay, d.oDays + dDays)); // stretch up to the displayed range end
          return { ...b, days };
        } else {
          const startDay = Math.max(0, Math.min(winEnd - b.days, d.oStart + dDays));
          // once production has started on this allocation, keep it on its line (no cross-line move)
          if (barStarted(b)) return { ...b, startDay };
          const dRow = Math.round((e.clientY - d.startY) / (d.rowH || ROW_H));
          // use the SAME sorted order as the rendered rows so it lands on the right line
          const idx = Math.max(0, Math.min(sortedLines.length - 1, sortedLines.findIndex(l => l.id === d.oLine) + dRow));
          return { ...b, startDay, line: sortedLines[idx].id };
        }
      }));
    }
    function onUp() {
      drag.current = null;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      persist(); // save final position to shared state
    }

    // HTML5 drop of an unscheduled production order onto a line
    const [dropLine, setDropLine] = React.useState(null);
    function onDrop(e, lineId) {
      e.preventDefault(); setDropLine(null);
      const poId = e.dataTransfer.getData('text/plain'); if (!poId) return;
      const po = state.prodOrders.find(p => p.id === poId); if (!po) return;
      if (!(po.status === 'issued' || po.status === 'scheduled' || po.status === 'inprogress')) return;
      const rem = remainingOf(po); if (rem <= 0) return;
      const rect = gridRef.current.getBoundingClientRect();
      // account for horizontal scroll of the gantt grid so the day lands under the cursor
      const x = e.clientX - rect.left - LABEL_W + (gridRef.current.scrollLeft || 0);
      const startDay = Math.max(0, Math.min(winEnd - 1, Math.floor(x / DAY_W) + startOffset));
      // ask how much of the (remaining) qty goes on this line — the rest can be dropped elsewhere
      setAllocReq({ po, lineId, startDay, max: rem });
    }

    // Commit one allocation (sub-qty) of a PO onto a line as a new Gantt bar.
    function placeAllocation(po, lineId, startDay, qty) {
      const q = Math.max(1, Math.min(Math.round(qty), remainingOf(po)));
      const n = barsRef.current.filter(b => b.po === po.id).length + 1;
      const allocId = po.id + '-' + n;
      const cap = (state.lines.find(l => l.id === lineId) || {}).dailyCap || q;
      const days = Math.max(1, Math.min(4, Math.round(q / cap) || 1));
      const order = state.orders.find(o => o.id === po.order) || {};
      const bar = { id: allocId, po: po.id, order: po.order, fg: po.fg, qty: q, line: lineId, startDay, days, priority: order.priority || 'med' };
      const nextBars = [...barsRef.current, bar];
      setBars(nextBars);
      // Only PLACE the allocation (order → 'scheduled'). No WIP lot yet — that happens on Start.
      setState(prev => ({ ...prev,
        scheduleBars: nextBars,
        prodOrders: prev.prodOrders.map(p => p.id === po.id && p.status === 'issued' ? { ...p, status: 'scheduled' } : p),
        orders: prev.orders.map(o => o.id === po.order && o.status !== 'completed' ? { ...o, status: 'scheduled' } : o),
      }));
      setAllocReq(null);
      toast(t('toast.scheduled'));
    }

    // Start production for ONE allocation: snapshot the line's workflow into a WIP lot, lock the line.
    function startProduction(bar) {
      setState(prev => {
        if (prev.lotsWip.some(w => (w.alloc || w.po) === bar.id)) return prev;
        const wf = D.workflowForLine(prev, bar.line);
        const stations = (wf ? wf.steps : []).map(st => ({ step: st.key, name: st.name, nameTh: st.nameTh, type: st.type, wipIn: 0, wipOut: 0, cumOut: 0, wip: 0, cumDefect: 0, reworkDone: 0 }));
        const lot = { id: 'LOT-' + bar.id, alloc: bar.id, po: bar.po, order: bar.order, fg: bar.fg, qty: bar.qty, line: bar.line, wf: (wf || {}).id, stations, outputLog: [] };
        const prodOrders = prev.prodOrders.map(p => p.id === bar.po && p.status !== 'completed' ? { ...p, status: 'inprogress' } : p);
        return { ...prev, prodOrders, lotsWip: [...prev.lotsWip, lot] };
      });
      toast(t('toast.started'));
    }

    const todayIdx = -startOffset; // column index of "today" within the window (may be off-window)

    const rangeControls = React.createElement('div', { className: 'row', style: { gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' } },
      React.createElement('div', { className: 'pill-tabs' },
        [7, 15, 30].map(n => React.createElement('button', { key: n, className: (startOffset === 0 && dayCount === n) ? 'on' : '', onClick: () => quickRange(n) }, n + (lang === 'th' ? ' วัน' : 'd')))),
      React.createElement(DateField, { value: range.from, onChange: v => setRange(r => ({ ...r, from: v })), style: { width: 138 } }),
      React.createElement('span', { className: 'faint' }, '–'),
      React.createElement(DateField, { value: range.to, onChange: v => setRange(r => ({ ...r, to: v })), style: { width: 138 } }));

    const legend = React.createElement('div', { style: { padding: '8px 14px', borderTop: '1px solid var(--border)', display: 'flex', gap: 16, fontSize: 10.5, color: 'var(--text-muted)', flexWrap: 'wrap' } },
      React.createElement('span', { className: 'row', style: { gap: 5 } }, React.createElement(Icon, { name: 'drag', size: 12 }), lang === 'th' ? 'ลากเพื่อย้าย' : 'Drag to move'),
      React.createElement('span', { className: 'row', style: { gap: 5 } }, React.createElement(Icon, { name: 'arrowR', size: 12 }), lang === 'th' ? 'ลากขอบขวาเพื่อปรับระยะเวลา' : 'Drag right edge to resize'),
      React.createElement('span', { className: 'row', style: { gap: 5 } }, React.createElement(Icon, { name: 'play', size: 12 }), t('sch.starthint')));

    return React.createElement('div', null,
      React.createElement(PageHead, { title: t('sch.title'), sub: t('sch.sub'), actions: rangeControls }),
      React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '232px 1fr', gap: 14, alignItems: 'start' } },

        // Unscheduled pools (two boards)
        React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 14, position: 'sticky', top: 0 } },
          // Board 1 — ready (materials issued)
          React.createElement('div', { className: 'card' },
            React.createElement('div', { className: 'card-h' },
              React.createElement(Icon, { name: 'check', size: 15, style: { color: 'var(--ok)' } }),
              React.createElement('h3', { style: { fontSize: 12 } }, t('sch.ready')),
              React.createElement('span', { className: 'badge', style: { marginLeft: 'auto', color: 'var(--ok)', background: 'var(--ok-tint)' } }, poolReady.length)),
            React.createElement('div', { className: 'card-b', style: { display: 'flex', flexDirection: 'column', gap: 8, minHeight: 90 } },
              poolReady.length === 0 && React.createElement('div', { className: 'empty', style: { fontSize: 11 } }, React.createElement(Icon, { name: 'box', size: 18 }), React.createElement('div', null, lang === 'th' ? 'ไม่มีใบสั่งพร้อมจัด' : 'No orders ready')),
              poolReady.map(po => {
                const order = state.orders.find(x => x.id === po.order) || {};
                return React.createElement('div', { key: po.id, draggable: true,
                  onDragStart: (e) => e.dataTransfer.setData('text/plain', po.id),
                  style: { background: 'var(--surface)', border: '1px solid var(--ok)', borderLeft: '3px solid var(--ok)', borderRadius: 7, padding: 9, cursor: 'grab', boxShadow: 'var(--shadow-sm)' } },
                  React.createElement('div', { className: 'row', style: { justifyContent: 'space-between', marginBottom: 3 } },
                    React.createElement('span', { className: 'mono', style: { fontSize: 11, fontWeight: 700, color: 'var(--primary)' } }, po.id),
                    order.priority && React.createElement(PriorityBadge, { p: order.priority })),
                  React.createElement('div', { style: { fontSize: 12, fontWeight: 600 } }, D.fgName(state, po.fg, lang)),
                  React.createElement('div', { className: 'row', style: { justifyContent: 'space-between', marginTop: 5, fontSize: 10.5 } },
                    React.createElement('span', { className: 'mono faint' }, (remainingOf(po) < po.qty ? fmt(remainingOf(po)) + '/' + fmt(po.qty) : fmt(po.qty)) + ' ' + t('u.pcs')),
                    React.createElement('span', { className: 'faint' }, order.due ? fmtDate(order.due) : po.order)),
                  remainingOf(po) < po.qty && React.createElement('div', { style: { fontSize: 9.5, color: 'var(--warn)', marginTop: 3 } }, lang === 'th' ? 'แบ่งบางส่วนแล้ว — ลากวางจำนวนที่เหลือได้' : 'Partly allocated — drag to place the rest'));
              }),
              poolReady.length > 0 && React.createElement('div', { className: 'faint', style: { fontSize: 10.5, textAlign: 'center', marginTop: 2, display: 'flex', gap: 5, justifyContent: 'center', alignItems: 'center' } },
                React.createElement(Icon, { name: 'drag', size: 12 }), t('sch.draghint')))),
          // Board 2 — awaiting material issue
          React.createElement('div', { className: 'card' },
            React.createElement('div', { className: 'card-h' },
              React.createElement(Icon, { name: 'clock', size: 15, style: { color: 'var(--warn)' } }),
              React.createElement('h3', { style: { fontSize: 12 } }, t('sch.waiting')),
              React.createElement('span', { className: 'badge', style: { marginLeft: 'auto', color: 'var(--warn)', background: 'var(--warn-tint)' } }, poolWaiting.length)),
            React.createElement('div', { className: 'card-b', style: { display: 'flex', flexDirection: 'column', gap: 8, minHeight: 60 } },
              poolWaiting.length === 0 && React.createElement('div', { className: 'empty', style: { fontSize: 11 } }, '—'),
              poolWaiting.map(po => {
                const order = state.orders.find(x => x.id === po.order) || {};
                return React.createElement('div', { key: po.id,
                  style: { background: 'var(--surface-2)', border: '1px dashed var(--border-strong)', borderRadius: 7, padding: 9, opacity: .9 } },
                  React.createElement('div', { className: 'row', style: { justifyContent: 'space-between', marginBottom: 3 } },
                    React.createElement('span', { className: 'mono', style: { fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' } }, po.id),
                    order.priority && React.createElement(PriorityBadge, { p: order.priority })),
                  React.createElement('div', { style: { fontSize: 12, fontWeight: 600 } }, D.fgName(state, po.fg, lang)),
                  React.createElement('div', { className: 'row', style: { justifyContent: 'space-between', marginTop: 5, fontSize: 10.5 } },
                    React.createElement('span', { className: 'mono faint' }, fmt(po.qty) + ' ' + t('u.pcs')),
                    React.createElement('button', { className: 'btn btn-sm btn-ghost', style: { padding: '2px 7px', fontSize: 10 }, onClick: () => go('issue') }, t('sch.gotoissue'))));
              }))) ),

        // Gantt grid
        React.createElement('div', { className: 'card', style: { overflow: 'hidden' } },
          React.createElement('div', { ref: gridRef, style: { overflowX: 'auto' } },
            React.createElement('div', { style: { minWidth: LABEL_W + dayCount * DAY_W } },
              // header
              React.createElement('div', { style: { display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)', position: 'sticky', top: 0, zIndex: 2 } },
                React.createElement('div', { style: { width: LABEL_W, flexShrink: 0, padding: '8px 12px', fontSize: 10.5, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '.5px' } }, t('f.line')),
                Array.from({ length: dayCount }).map((_, i) => {
                  const dt = dayDate(i); const wd = dt.getDay();
                  return React.createElement('div', { key: i, style: { width: DAY_W, flexShrink: 0, textAlign: 'center', padding: '6px 0', borderLeft: '1px solid var(--border)', background: i === todayIdx ? 'var(--primary-tint)' : (wd === 0 || wd === 6) ? 'var(--surface-3)' : 'transparent' } },
                    React.createElement('div', { style: { fontSize: 9, color: 'var(--text-faint)' } }, dt.toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-US', { weekday: 'short' })),
                    React.createElement('div', { style: { fontSize: 12, fontWeight: 700, color: i === todayIdx ? 'var(--primary)' : 'var(--text)' } }, dt.getDate()));
                })),
              // rows (same sorted order as the drag math so A, B, C stay in order)
              sortedLines.map(ln => {
                const lineBars = bars.filter(b => b.line === ln.id);
                const planned = lineBars.reduce((a, b) => a + b.qty, 0);
                const util = Math.min(100, Math.round(planned / (ln.dailyCap * 3) * 100));
                return React.createElement('div', { key: ln.id, style: { display: 'flex', position: 'relative', borderBottom: '1px solid var(--border)', minHeight: ROW_H } },
                  React.createElement('div', { style: { width: LABEL_W, flexShrink: 0, padding: '9px 12px', borderRight: '1px solid var(--border)', background: 'var(--surface-2)' } },
                    React.createElement('div', { className: 'row', style: { gap: 6 } },
                      React.createElement('span', { style: { width: 8, height: 8, borderRadius: 2, background: LINE_COLORS[ln.id] } }),
                      React.createElement('span', { style: { fontSize: 11.5, fontWeight: 700 } }, ln.name)),
                    React.createElement('div', { className: 'faint mono', style: { fontSize: 9.5, marginTop: 3 } }, '👷 ' + ln.manpower + ' · ' + fmt(ln.dailyCap) + t('u.day')),
                    React.createElement('div', { style: { fontSize: 9.5, marginTop: 2, color: 'var(--text-muted)' } }, t('db.plan') + ': ' + fmt(planned) + ' ' + t('u.pcs'))),
                  // day cells (drop target)
                  React.createElement('div', { onDragOver: (e) => { e.preventDefault(); setDropLine(ln.id); }, onDragLeave: () => setDropLine(null),
                    onDrop: (e) => onDrop(e, ln.id),
                    className: dropLine === ln.id ? 'drag-over' : '',
                    style: { position: 'relative', flex: 1, display: 'flex' } },
                    Array.from({ length: dayCount }).map((_, i) => {
                      const dt = dayDate(i); const wd = dt.getDay();
                      return React.createElement('div', { key: i, style: { width: DAY_W, flexShrink: 0, borderLeft: '1px solid var(--border)', background: i === todayIdx ? 'rgba(45,91,215,.04)' : (wd === 0 || wd === 6) ? 'var(--surface-2)' : 'transparent' } });
                    }),
                    // bars
                    lineBars.map(b => React.createElement(Bar, { key: b.id, bar: b, state, lang, t, startOffset, active: activeBar === b.id, started: barStarted(b), completed: barCompleted(b),
                      produced: (function () { const l = lotOfBar(b); return l ? (l.stations[l.stations.length - 1].cumOut || 0) : 0; })(),
                      onStart: startProduction, onPointerDown: onBarPointerDown }))));
              }))),
          legend)),
      allocReq && React.createElement(AllocModal, { req: allocReq, state, t, lang,
        onClose: () => setAllocReq(null),
        onSubmit: (q) => placeAllocation(allocReq.po, allocReq.lineId, allocReq.startDay, q) }));
  }

  // Modal: how much of a PO's remaining qty to place on the dropped line
  function AllocModal({ req, state, t, lang, onClose, onSubmit }) {
    const po = req.po, max = req.max;
    const line = state.lines.find(l => l.id === req.lineId) || {};
    const [qty, setQty] = React.useState(String(max));
    const q = Math.max(0, Math.min(Math.round(+qty || 0), max));
    return React.createElement(Modal, { title: (lang === 'th' ? 'แบ่งจำนวนลงสาย · ' : 'Allocate to · ') + (line.name || req.lineId), onClose, width: 440,
      footer: React.createElement(React.Fragment, null,
        React.createElement('button', { className: 'btn', onClick: onClose }, t('btn.cancel')),
        React.createElement('button', { className: 'btn btn-pri', disabled: q <= 0, onClick: () => onSubmit(q) }, React.createElement(Icon, { name: 'check', size: 14 }), lang === 'th' ? 'วางลงสาย' : 'Place')) },
      React.createElement('div', { style: { background: 'var(--surface-2)', borderRadius: 8, padding: '10px 12px', marginBottom: 14, fontSize: 12 } },
        React.createElement('div', { className: 'row', style: { justifyContent: 'space-between' } }, React.createElement('span', { className: 'faint' }, t('f.po')), React.createElement('b', { className: 'mono' }, po.id)),
        React.createElement('div', { className: 'row', style: { justifyContent: 'space-between', marginTop: 4 } }, React.createElement('span', { className: 'faint' }, t('f.product')), React.createElement('b', null, D.fgName(state, po.fg, lang))),
        React.createElement('div', { className: 'row', style: { justifyContent: 'space-between', marginTop: 4 } }, React.createElement('span', { className: 'faint' }, lang === 'th' ? 'คงเหลือให้แบ่ง' : 'Remaining to place'), React.createElement('b', { className: 'mono', style: { color: 'var(--primary)' } }, fmt(max) + ' ' + t('u.pcs')))),
      React.createElement(Field, { label: lang === 'th' ? 'จำนวนสำหรับสายนี้' : 'Quantity for this line', required: true, hint: (lang === 'th' ? 'สูงสุด ' : 'Max ') + fmt(max) + (lang === 'th' ? ' — ที่เหลือลากไปไลน์อื่นได้' : ' — the rest can go to another line') },
        React.createElement('input', { className: 'input mono', type: 'number', min: 1, max: max, value: qty, autoFocus: true, onChange: (e) => setQty(e.target.value) })),
      React.createElement('div', { className: 'row', style: { gap: 6, marginTop: 8 } },
        React.createElement('button', { className: 'btn btn-sm', onClick: () => setQty(String(Math.round(max / 2))) }, '50%'),
        React.createElement('button', { className: 'btn btn-sm', onClick: () => setQty(String(max)) }, lang === 'th' ? 'ทั้งหมด' : 'All')));
  }

  function Bar({ bar, state, lang, t, startOffset, active, started, completed, produced, onStart, onPointerDown }) {
    const col = completed ? 'var(--ok)' : (LINE_COLORS[bar.line] || '#2d5bd7');
    const pct = bar.qty > 0 ? Math.min(100, Math.round((produced || 0) / bar.qty * 100)) : 0;
    return React.createElement('div', {
      onPointerDown: (e) => onPointerDown(e, bar, 'move'),
      // keep a minimum width so the start button / status stay readable on short (narrow) bars
      style: { position: 'absolute', left: (bar.startDay - (startOffset || 0)) * DAY_W + 3, top: 7, width: Math.max(bar.days * DAY_W - 6, 140), height: ROW_H - 14,
        background: 'color-mix(in srgb,' + col + ' 14%, white)', border: '1.5px solid ' + col, borderLeft: '3px solid ' + col,
        borderRadius: 6, padding: '4px 8px', cursor: 'grab', boxShadow: active ? '0 4px 14px rgba(18,32,56,.18)' : 'var(--shadow-sm)',
        zIndex: active ? 5 : 1, overflow: 'hidden', userSelect: 'none', transition: active ? 'none' : 'box-shadow .15s' } },
      React.createElement('div', { className: 'row', style: { justifyContent: 'space-between', gap: 4 } },
        React.createElement('span', { className: 'mono', style: { fontSize: 10, fontWeight: 700, color: col, display: 'flex', alignItems: 'center', gap: 3 } },
          started && React.createElement(Icon, { name: 'lock', size: 9 }), bar.id),
        React.createElement('span', { className: 'mono', style: { fontSize: 9.5, fontWeight: started ? 700 : 400, color: started ? (completed ? 'var(--ok)' : 'var(--primary)') : 'var(--text-muted)' } },
          started ? (fmt(produced || 0) + '/' + fmt(bar.qty) + ' (' + pct + '%)') : fmt(bar.qty))),
      React.createElement('div', { className: 'row', style: { justifyContent: 'space-between', gap: 6 } },
        React.createElement('span', { style: { fontSize: 10.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 } }, D.fgName(state, bar.fg, lang)),
        started
          ? React.createElement('span', { style: { fontSize: 8.5, fontWeight: 700, color: completed ? 'var(--ok)' : 'var(--primary)', display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 } }, React.createElement(Icon, { name: completed ? 'check' : 'play', size: 8 }), completed ? t('status.completed') : t('sch.producing'))
          : React.createElement('button', { onPointerDown: (e) => e.stopPropagation(), onClick: (e) => { e.stopPropagation(); onStart(bar); },
              style: { flexShrink: 0, fontSize: 8.5, fontWeight: 700, color: '#fff', background: col, border: 'none', borderRadius: 4, padding: '2px 6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2 } },
              React.createElement(Icon, { name: 'play', size: 8 }), t('sch.start'))),
      // cumulative-output progress bar (once started)
      started && React.createElement('div', { style: { position: 'absolute', left: 4, right: 12, bottom: 2, height: 3, borderRadius: 2, background: 'color-mix(in srgb,' + col + ' 22%, white)' } },
        React.createElement('div', { style: { width: pct + '%', height: '100%', borderRadius: 2, background: col } })),
      // resize handle
      React.createElement('div', { onPointerDown: (e) => onPointerDown(e, bar, 'resize'),
        style: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 9, cursor: 'ew-resize', display: 'grid', placeItems: 'center' } },
        React.createElement('div', { style: { width: 3, height: 16, borderRadius: 2, background: col, opacity: .5 } })));
  }

  window.PG_Schedule = Schedule;
})();
