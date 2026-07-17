/* ============================================================
   Module: Production Scheduling — Gantt (HERO)
   Drag unscheduled orders onto lines · move · resize
   ============================================================ */
(function () {
  const { useI18n } = window.PG_I18N;
  const { PageHead, Icon, fmt, fmtDate, useToast, PriorityBadge, Modal, Field, DateField } = window.PG_UI;
  const D = window.PG_DATA;

  const DAYS = 12, DAY_W = 62, ROW_H = 82, LABEL_W = 178;
  const LINE_COLORS = { A: '#2d5bd7', B: '#7b5cd9', C: '#1f8a5b' };

  function Schedule({ state, setState, go, readOnly }) {
    const { t, lang } = useI18n();
    const toast = useToast();
    const gridRef = React.useRef(null);
    const drag = React.useRef(null);

    const iso = (dayIdx) => { const dd = new Date(state.today); dd.setDate(dd.getDate() + dayIdx); return dd.toISOString().slice(0, 10); };
    // A bar's `start` is an absolute date — the day it was actually planned for. `startDay` is only
    // its offset from today for drawing, recomputed on every load, never the stored truth: storing
    // the offset made every bar walk forward one column each day and lose its real first day.
    const dayOf = (isoStr) => Math.round((new Date(isoStr) - new Date(state.today)) / 864e5);
    // `startDay` is kept alongside `start` so an older cached bundle still renders these bars.
    const toStored = (list) => list.map(b => ({ ...b, start: iso(b.startDay) }));

    // Bars are persisted in shared state (state.scheduleBars) so they survive navigation.
    // Each bar is ONE allocation of a PO onto a line: { id (alloc id), po (parent PO), qty (sub-qty), line, startDay, days }.
    // Legacy bars used id === po.id with no `.po`; normalise them so po always exists.
    // po === null marks a pre-planned bar (no production order yet); only legacy bars that never
    // stored a po at all fall back to the bar id.
    const [bars, setBarsRaw] = React.useState(() => (state.scheduleBars || []).map(b => ({ ...b,
      po: b.po === undefined ? b.id : b.po,
      // legacy bars have no `start` — anchor them where they currently sit
      startDay: b.start ? dayOf(b.start) : b.startDay })));
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

    // Bars are keyed to the customer order, so a pre-planned bar (placed before a production order
    // exists) keeps counting once the order is reserved and its PO appears.
    const allocatedOfOrder = (orderId) => bars.filter(b => b.order === orderId).reduce((a, b) => a + b.qty, 0);
    const remainingOf = (po) => +(po.qty - allocatedOfOrder(po.order)).toFixed(0);
    // Resolve a bar's production order (pre-planned bars carry no po until the order is reserved)
    const poOfBar = (bar) => state.prodOrders.find(p => (bar.po && p.id === bar.po) || p.order === bar.order);
    // A bar can only be started once its materials are issued
    const READY_ST = ['issued', 'scheduled', 'inprogress', 'completed'];
    const barReady = (bar) => { const p = poOfBar(bar); return !!p && READY_ST.indexOf(p.status) >= 0; };
    const orderOfBar = (bar) => (state.orders || []).find(o => o.id === bar.order);

    // Three pools: ready (materials issued) — draggable & startable; reserved (awaiting issue);
    // and plan (request / waiting) — draggable for pre-planning only, never startable.
    const poolReady = state.prodOrders.filter(p => (p.status === 'issued' || p.status === 'scheduled' || p.status === 'inprogress') && remainingOf(p) > 0);
    const poolWaiting = state.prodOrders.filter(p => p.status === 'reserved');
    const poolPlan = (state.orders || []).filter(o => (o.status === 'request' || o.status === 'waiting') && (o.qty - allocatedOfOrder(o.id)) > 0);

    // Single line order used for BOTH rendering and drag row-index math, so a dragged bar lands
    // on the line under the cursor. Respects the custom order set in Settings and hides lines
    // toggled off there (state.lines array order; l.hidden excludes them from the schedule).
    const sortedLines = state.lines.filter(l => !l.hidden);

    function persist() {
      setState(prev => ({ ...prev, scheduleBars: toStored(barsRef.current),
        // keep each started lot's line in sync with its allocation bar (line is locked post-start, so usually a no-op)
        lotsWip: prev.lotsWip.map(w => { const b = barsRef.current.find(x => x.id === (w.alloc || w.po)); return b && b.line !== w.line ? { ...w, line: b.line } : w; }) }));
    }

    const dayDate = (i) => { const d = new Date(state.today); d.setDate(d.getDate() + startOffset + i); return d; };

    function onBarPointerDown(e, bar, mode) {
      if (readOnly) return; // view-only: no drag / resize
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
      if (readOnly) return; // view-only: cannot place orders
      // Payload is 'po:<id>' for an issued production order, 'order:<id>' for a pre-planned order
      const raw = e.dataTransfer.getData('text/plain'); if (!raw) return;
      let src = null;
      if (raw.indexOf('order:') === 0) {
        const o = poolPlan.find(x => x.id === raw.slice(6)); if (!o) return;
        const rem = +(o.qty - allocatedOfOrder(o.id)).toFixed(0); if (rem <= 0) return;
        src = { kind: 'order', id: o.id, order: o.id, fg: o.fg, priority: o.priority, label: o.id, max: rem };
      } else {
        const po = state.prodOrders.find(p => p.id === (raw.indexOf('po:') === 0 ? raw.slice(3) : raw)); if (!po) return;
        if (!(po.status === 'issued' || po.status === 'scheduled' || po.status === 'inprogress')) return;
        const rem = remainingOf(po); if (rem <= 0) return;
        const o = state.orders.find(x => x.id === po.order) || {};
        src = { kind: 'po', id: po.id, order: po.order, fg: po.fg, priority: o.priority, label: po.id, max: rem };
      }
      const rect = gridRef.current.getBoundingClientRect();
      // account for horizontal scroll of the gantt grid so the day lands under the cursor
      const x = e.clientX - rect.left - LABEL_W + (gridRef.current.scrollLeft || 0);
      const startDay = Math.max(0, Math.min(winEnd - 1, Math.floor(x / DAY_W) + startOffset));
      // ask how much of the (remaining) qty goes on this line — the rest can be dropped elsewhere
      setAllocReq({ src, lineId, startDay, max: src.max });
    }

    // Commit one allocation (sub-qty) onto a line as a new Gantt bar. `src` is either an issued
    // production order or — for pre-planning — a customer order that has no PO yet.
    function placeAllocation(src, lineId, startDay, qty) {
      const q = Math.max(1, Math.min(Math.round(qty), src.max));
      const n = barsRef.current.filter(b => b.order === src.order).length + 1;
      const allocId = src.id + '-' + n;
      const cap = (state.lines.find(l => l.id === lineId) || {}).dailyCap || q;
      const days = Math.max(1, Math.min(4, Math.round(q / cap) || 1));
      // po stays null while pre-planning; poOfBar() picks the PO up once the order is reserved
      const bar = { id: allocId, po: src.kind === 'po' ? src.id : null, order: src.order, fg: src.fg, qty: q, line: lineId, startDay, days, priority: src.priority || 'med' };
      const nextBars = [...barsRef.current, bar];
      setBars(nextBars);
      // Only PLACE the allocation (order → 'scheduled'). No WIP lot yet — that happens on Start.
      // Pre-planning never advances status: the order keeps waiting for its materials.
      setState(prev => ({ ...prev,
        scheduleBars: toStored(nextBars),
        prodOrders: src.kind === 'po' ? prev.prodOrders.map(p => p.id === src.id && p.status === 'issued' ? { ...p, status: 'scheduled' } : p) : prev.prodOrders,
        orders: src.kind === 'po' ? prev.orders.map(o => o.id === src.order && o.status !== 'completed' ? { ...o, status: 'scheduled' } : o) : prev.orders,
      }));
      setAllocReq(null);
      toast(src.kind === 'po' ? t('toast.scheduled') : (lang === 'th' ? 'วางแผนล่วงหน้าแล้ว (ยังเริ่มผลิตไม่ได้)' : 'Pre-planned (not startable yet)'));
    }

    // Start production for ONE allocation: snapshot the line's workflow into a WIP lot, lock the line.
    function startProduction(bar) {
      const po = poOfBar(bar);
      if (!po) { toast(lang === 'th' ? 'ยังเบิกวัตถุดิบไม่เสร็จ' : 'Materials not issued yet'); return; }
      setState(prev => {
        if (prev.lotsWip.some(w => (w.alloc || w.po) === bar.id)) return prev;
        const wf = D.workflowForLine(prev, bar.line);
        const stations = (wf ? wf.steps : []).map(st => ({ step: st.key, name: st.name, nameTh: st.nameTh, type: st.type, wipIn: 0, wipOut: 0, cumOut: 0, wip: 0, cumDefect: 0, reworkDone: 0 }));
        const lot = { id: 'LOT-' + bar.id, alloc: bar.id, po: po.id, order: bar.order, fg: bar.fg, qty: bar.qty, line: bar.line, wf: (wf || {}).id, stations, outputLog: [] };
        const prodOrders = prev.prodOrders.map(p => p.id === po.id && p.status !== 'completed' ? { ...p, status: 'inprogress' } : p);
        // a bar placed before the PO existed carries no po — stamp it now that production is real
        const scheduleBars = (prev.scheduleBars || []).map(b => b.id === bar.id ? { ...b, po: po.id } : b);
        return { ...prev, prodOrders, lotsWip: [...prev.lotsWip, lot], scheduleBars };
      });
      toast(t('toast.started'));
    }

    const todayIdx = -startOffset; // column index of "today" within the window (may be off-window)

    const rangeControls = React.createElement('div', { className: 'row', style: { gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' } },
      readOnly && React.createElement('span', { className: 'badge badge-soft', style: { fontSize: 10.5 } }, lang === 'th' ? 'ดูอย่างเดียว' : 'View only'),
      React.createElement('div', { className: 'pill-tabs' },
        [7, 15, 30].map(n => React.createElement('button', { key: n, className: (startOffset === 0 && dayCount === n) ? 'on' : '', onClick: () => quickRange(n) }, n + (lang === 'th' ? ' วัน' : 'd')))),
      React.createElement(DateField, { value: range.from, onChange: v => setRange(r => ({ ...r, from: v })), style: { width: 138 } }),
      React.createElement('span', { className: 'faint' }, '–'),
      React.createElement(DateField, { value: range.to, onChange: v => setRange(r => ({ ...r, to: v })), style: { width: 138 } }));

    const legend = React.createElement('div', { style: { padding: '8px 14px', borderTop: '1px solid var(--border)', display: 'flex', gap: 16, fontSize: 10.5, color: 'var(--text-muted)', flexWrap: 'wrap' } },
      React.createElement('span', { className: 'row', style: { gap: 5 } }, React.createElement(Icon, { name: 'drag', size: 12 }), lang === 'th' ? 'ลากเพื่อย้าย' : 'Drag to move'),
      React.createElement('span', { className: 'row', style: { gap: 5 } }, React.createElement(Icon, { name: 'arrowR', size: 12 }), lang === 'th' ? 'ลากขอบขวาเพื่อปรับระยะเวลา' : 'Drag right edge to resize'),
      React.createElement('span', { className: 'row', style: { gap: 5 } }, React.createElement(Icon, { name: 'play', size: 12 }), t('sch.starthint')),
      React.createElement('span', { className: 'row', style: { gap: 5 } },
        React.createElement('span', { style: { width: 16, height: 9, borderRadius: 3, border: '1.5px dashed var(--danger)', background: 'color-mix(in srgb, var(--danger) 10%, white)' } }),
        lang === 'th' ? 'แท่งสีแดง = วางแผนล่วงหน้า ยังเริ่มผลิตไม่ได้' : 'Red bar = pre-planned, not startable'));

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
                return React.createElement('div', { key: po.id, draggable: !readOnly,
                  onDragStart: (e) => e.dataTransfer.setData('text/plain', 'po:' + po.id),
                  style: { background: 'var(--surface)', border: '1px solid var(--ok)', borderLeft: '3px solid var(--ok)', borderRadius: 7, padding: 9, cursor: readOnly ? 'default' : 'grab', boxShadow: 'var(--shadow-sm)' } },
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
              }))),
          // Board 3 — pre-planning: orders still at request / waiting. Draggable onto the board so the
          // plan can be seen ahead of time, but they place a red bar that cannot be started.
          React.createElement('div', { className: 'card' },
            React.createElement('div', { className: 'card-h' },
              React.createElement(Icon, { name: 'request', size: 15, style: { color: 'var(--danger)' } }),
              React.createElement('h3', { style: { fontSize: 12 } }, lang === 'th' ? 'วางแผนล่วงหน้า (ยังไม่พร้อมผลิต)' : 'Pre-plan (not ready)'),
              React.createElement('span', { className: 'badge', style: { marginLeft: 'auto', color: 'var(--danger)', background: 'var(--danger-tint)' } }, poolPlan.length)),
            React.createElement('div', { className: 'card-b', style: { display: 'flex', flexDirection: 'column', gap: 8, minHeight: 60 } },
              poolPlan.length === 0 && React.createElement('div', { className: 'empty', style: { fontSize: 11 } }, '—'),
              poolPlan.map(o => {
                const rem = +(o.qty - allocatedOfOrder(o.id)).toFixed(0);
                return React.createElement('div', { key: o.id, draggable: !readOnly,
                  onDragStart: (e) => e.dataTransfer.setData('text/plain', 'order:' + o.id),
                  style: { background: 'var(--surface)', border: '1px solid var(--danger)', borderLeft: '3px solid var(--danger)', borderRadius: 7, padding: 9, cursor: readOnly ? 'default' : 'grab', boxShadow: 'var(--shadow-sm)' } },
                  React.createElement('div', { className: 'row', style: { justifyContent: 'space-between', marginBottom: 3 } },
                    React.createElement('span', { className: 'mono', style: { fontSize: 11, fontWeight: 700, color: 'var(--danger)' } }, o.id),
                    o.priority && React.createElement(PriorityBadge, { p: o.priority })),
                  React.createElement('div', { style: { fontSize: 12, fontWeight: 600 } }, D.fgName(state, o.fg, lang)),
                  React.createElement('div', { className: 'row', style: { justifyContent: 'space-between', marginTop: 5, fontSize: 10.5 } },
                    React.createElement('span', { className: 'mono faint' }, (rem < o.qty ? fmt(rem) + '/' + fmt(o.qty) : fmt(o.qty)) + ' ' + t('u.pcs')),
                    React.createElement('span', { className: 'badge badge-soft', style: { fontSize: 9.5 } }, t('status.' + o.status))),
                  React.createElement('div', { style: { fontSize: 10.5, color: 'var(--text-muted)', marginTop: 4 } }, o.due ? fmtDate(o.due) : ''));
              }),
              poolPlan.length > 0 && React.createElement('div', { className: 'faint', style: { fontSize: 10, textAlign: 'center', marginTop: 2, lineHeight: 1.5 } },
                lang === 'th' ? 'ลากวางเพื่อดูแผน — กดเริ่มผลิตได้เมื่อเบิกวัตถุดิบครบแล้ว' : 'Drag to plan — startable once materials are issued'))) ),

        // Gantt grid
        React.createElement('div', { className: 'card', style: { overflow: 'hidden' } },
          React.createElement('div', { ref: gridRef, style: { overflowX: 'auto' } },
            React.createElement('div', { style: { minWidth: LABEL_W + dayCount * DAY_W } },
              // header
              React.createElement('div', { style: { position: 'sticky', top: 0, zIndex: 2, background: 'var(--surface-2)' } },
                // month band — each month spans its days; label sticks to the left edge while scrolling
                React.createElement('div', { style: { display: 'flex', borderBottom: '1px solid var(--border)' } },
                  React.createElement('div', { style: { width: LABEL_W, flexShrink: 0, position: 'sticky', left: 0, zIndex: 3, background: 'var(--surface-2)' } }, ''),
                  (function () {
                    const groups = [];
                    for (let gi = 0; gi < dayCount; gi++) {
                      const gd = dayDate(gi); const key = gd.getFullYear() + '-' + gd.getMonth();
                      const last = groups[groups.length - 1];
                      if (last && last.key === key) last.count++;
                      else groups.push({ key: key, count: 1, mo: gd.getMonth(), label: gd.toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-US', { month: 'long' }) + ' ' + gd.getFullYear() });
                    }
                    return groups.map(g => React.createElement('div', { key: g.key, style: { width: g.count * DAY_W, flexShrink: 0, borderLeft: '2px solid var(--border-strong)', background: g.mo % 2 ? 'color-mix(in srgb, var(--primary) 8%, var(--surface-2))' : 'var(--surface-2)' } },
                      React.createElement('div', { style: { position: 'sticky', left: LABEL_W + 4, display: 'inline-block', fontSize: 10.5, fontWeight: 700, color: 'var(--primary)', padding: '4px 9px', whiteSpace: 'nowrap' } }, g.label)));
                  })()),
                // day row
                React.createElement('div', { style: { display: 'flex', borderBottom: '1px solid var(--border)' } },
                  React.createElement('div', { style: { width: LABEL_W, flexShrink: 0, padding: '6px 12px', fontSize: 10.5, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '.5px', position: 'sticky', left: 0, zIndex: 3, background: 'var(--surface-2)' } }, t('f.line')),
                  Array.from({ length: dayCount }).map((_, i) => {
                    const dt = dayDate(i); const wd = dt.getDay();
                    const monthStart = i > 0 && dt.getMonth() !== dayDate(i - 1).getMonth();
                    const bg = i === todayIdx ? 'var(--primary-tint)' : (wd === 0 || wd === 6) ? 'var(--surface-3)' : (dt.getMonth() % 2 ? 'color-mix(in srgb, var(--primary) 8%, transparent)' : 'transparent');
                    return React.createElement('div', { key: i, style: { width: DAY_W, flexShrink: 0, textAlign: 'center', padding: '6px 0', borderLeft: monthStart ? '2px solid var(--border-strong)' : '1px solid var(--border)', background: bg } },
                      React.createElement('div', { style: { fontSize: 9, color: 'var(--text-faint)' } }, dt.toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-US', { weekday: 'short' })),
                      React.createElement('div', { style: { fontSize: 12, fontWeight: 700, color: i === todayIdx ? 'var(--primary)' : 'var(--text)' } }, dt.getDate()));
                  }))),
              // rows (same sorted order as the drag math so A, B, C stay in order)
              sortedLines.map(ln => {
                // a bar whose customer order was deleted disappears with it
                const lineBars = bars.filter(b => b.line === ln.id && (state.orders || []).some(o => o.id === b.order));
                // "แผน" counts only allocations overlapping the visible date window, split produced vs not
                const winBars = lineBars.filter(b => b.startDay < winEnd && (b.startDay + b.days) > startOffset);
                const planned = winBars.reduce((a, b) => a + b.qty, 0);
                const producedSum = winBars.reduce((a, b) => { const l = lotOfBar(b); const p = l ? (l.stations[l.stations.length - 1].cumOut || 0) : 0; return a + Math.min(p, b.qty); }, 0);
                const remaining = Math.max(0, planned - producedSum);
                const util = Math.min(100, Math.round(planned / (ln.dailyCap * 3) * 100));
                return React.createElement('div', { key: ln.id, style: { display: 'flex', position: 'relative', borderBottom: '1px solid var(--border)', minHeight: ROW_H } },
                  React.createElement('div', { style: { width: LABEL_W, flexShrink: 0, padding: '9px 12px', borderRight: '1px solid var(--border)', background: 'var(--surface-2)', position: 'sticky', left: 0, zIndex: 2 } },
                    React.createElement('div', { className: 'row', style: { gap: 6 } },
                      React.createElement('span', { style: { width: 8, height: 8, borderRadius: 2, background: LINE_COLORS[ln.id] } }),
                      React.createElement('span', { style: { fontSize: 11.5, fontWeight: 700 } }, ln.name)),
                    React.createElement('div', { className: 'faint mono', style: { fontSize: 9.5, marginTop: 3 } }, '👷 ' + ln.manpower + ' · ' + fmt(ln.dailyCap) + t('u.day')),
                    React.createElement('div', { style: { fontSize: 9.5, marginTop: 2, color: 'var(--text-muted)' } }, t('db.plan') + ' (' + (lang === 'th' ? 'ช่วงนี้' : 'window') + '): ' + fmt(planned) + ' ' + t('u.pcs')),
                    React.createElement('div', { style: { fontSize: 9, marginTop: 1, display: 'flex', gap: 8, flexWrap: 'wrap' } },
                      React.createElement('span', { style: { color: 'var(--st-completed)', fontWeight: 600 } }, '● ' + (lang === 'th' ? 'ผลิตแล้ว ' : 'Done ') + fmt(producedSum)),
                      React.createElement('span', { style: { color: 'var(--warn)', fontWeight: 600 } }, '○ ' + (lang === 'th' ? 'ยังไม่ผลิต ' : 'To do ') + fmt(remaining)))),
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
                    lineBars.map(b => React.createElement(Bar, { key: b.id, bar: b, state, lang, t, startOffset, dayCount, readOnly, active: activeBar === b.id, started: barStarted(b), completed: barCompleted(b),
                      ready: barReady(b), planStatus: (orderOfBar(b) || {}).status,
                      produced: (function () { const l = lotOfBar(b); return l ? (l.stations[l.stations.length - 1].cumOut || 0) : 0; })(),
                      onStart: startProduction, onPointerDown: onBarPointerDown }))));
              }))),
          legend)),
      allocReq && React.createElement(AllocModal, { req: allocReq, state, t, lang,
        onClose: () => setAllocReq(null),
        onSubmit: (q) => placeAllocation(allocReq.src, allocReq.lineId, allocReq.startDay, q) }));
  }

  // Modal: how much of a PO's remaining qty to place on the dropped line
  function AllocModal({ req, state, t, lang, onClose, onSubmit }) {
    const po = req.src, max = req.max;
    const line = state.lines.find(l => l.id === req.lineId) || {};
    const [qty, setQty] = React.useState(String(max));
    const q = Math.max(0, Math.min(Math.round(+qty || 0), max));
    return React.createElement(Modal, { title: (lang === 'th' ? 'แบ่งจำนวนลงสาย · ' : 'Allocate to · ') + (line.name || req.lineId), onClose, width: 440,
      footer: React.createElement(React.Fragment, null,
        React.createElement('button', { className: 'btn', onClick: onClose }, t('btn.cancel')),
        React.createElement('button', { className: 'btn btn-pri', disabled: q <= 0, onClick: () => onSubmit(q) }, React.createElement(Icon, { name: 'check', size: 14 }), lang === 'th' ? 'วางลงสาย' : 'Place')) },
      React.createElement('div', { style: { background: 'var(--surface-2)', borderRadius: 8, padding: '10px 12px', marginBottom: 14, fontSize: 12 } },
        React.createElement('div', { className: 'row', style: { justifyContent: 'space-between' } }, React.createElement('span', { className: 'faint' }, po.kind === 'order' ? (lang === 'th' ? 'ใบสั่ง (วางแผนล่วงหน้า)' : 'Order (pre-plan)') : t('f.po')), React.createElement('b', { className: 'mono' }, po.id)),
        React.createElement('div', { className: 'row', style: { justifyContent: 'space-between', marginTop: 4 } }, React.createElement('span', { className: 'faint' }, t('f.product')), React.createElement('b', null, D.fgName(state, po.fg, lang))),
        React.createElement('div', { className: 'row', style: { justifyContent: 'space-between', marginTop: 4 } }, React.createElement('span', { className: 'faint' }, lang === 'th' ? 'คงเหลือให้แบ่ง' : 'Remaining to place'), React.createElement('b', { className: 'mono', style: { color: 'var(--primary)' } }, fmt(max) + ' ' + t('u.pcs')))),
      React.createElement(Field, { label: lang === 'th' ? 'จำนวนสำหรับสายนี้' : 'Quantity for this line', required: true, hint: (lang === 'th' ? 'สูงสุด ' : 'Max ') + fmt(max) + (lang === 'th' ? ' — ที่เหลือลากไปไลน์อื่นได้' : ' — the rest can go to another line') },
        React.createElement('input', { className: 'input mono', type: 'number', min: 1, max: max, value: qty, autoFocus: true, onChange: (e) => setQty(e.target.value) })),
      React.createElement('div', { className: 'row', style: { gap: 6, marginTop: 8 } },
        React.createElement('button', { className: 'btn btn-sm', onClick: () => setQty(String(Math.round(max / 2))) }, '50%'),
        React.createElement('button', { className: 'btn btn-sm', onClick: () => setQty(String(max)) }, lang === 'th' ? 'ทั้งหมด' : 'All')));
  }

  function Bar({ bar, state, lang, t, startOffset, dayCount, readOnly, active, started, completed, produced, ready, planStatus, onStart, onPointerDown }) {
    // Clip the bar to the visible window. The bar is absolutely positioned, so one longer than the
    // window would stretch the grid's scroll area past the day header and leave a blank strip.
    // Only the drawing is clipped — bar.days is untouched.
    const off = startOffset || 0;
    const winW = dayCount * DAY_W;
    const rawL = (bar.startDay - off) * DAY_W;
    const rawR = rawL + bar.days * DAY_W;
    if (rawR <= 0 || rawL >= winW) return null; // falls entirely outside the window
    const clipL = rawL < 0, clipR = rawR > winW;
    const left = Math.max(0, rawL) + (clipL ? 0 : 3);
    const width = Math.max(14, Math.min(winW, rawR) - Math.max(0, rawL) - (clipL ? 0 : 3) - (clipR ? 0 : 3));
    const overL = clipL ? off - bar.startDay : 0;                          // days hidden to the left
    const overR = clipR ? (bar.startDay + bar.days) - (off + dayCount) : 0; // days hidden to the right
    // A bar whose materials are not issued yet is pre-planning only: soft red, dashed, no Start.
    const col = completed ? 'var(--ok)' : ready ? (LINE_COLORS[bar.line] || '#2d5bd7') : 'var(--danger)';
    const pct = bar.qty > 0 ? Math.min(100, Math.round((produced || 0) / bar.qty * 100)) : 0;
    const valText = started ? (fmt(produced || 0) + '/' + fmt(bar.qty) + ' (' + pct + '%)') : fmt(bar.qty);
    const valColor = started ? (completed ? 'var(--ok)' : 'var(--primary)') : 'var(--text-muted)';
    const barBg = 'color-mix(in srgb,' + col + ' ' + (ready ? 14 : 10) + '%, white)';
    return React.createElement('div', {
      onPointerDown: (e) => onPointerDown(e, bar, 'move'),
      // width follows the duration exactly (can be a single day); the taller row gives room for text
      style: { position: 'absolute', left: left, top: 7, width: width, height: ROW_H - 14,
        background: barBg, border: '1.5px ' + (ready ? 'solid ' : 'dashed ') + col,
        // a clipped end is squared off and loses its edge, so it reads as "continues beyond"
        borderLeft: clipL ? 'none' : '3px solid ' + col,
        borderRight: clipR ? 'none' : ('1.5px ' + (ready ? 'solid ' : 'dashed ') + col),
        borderTopLeftRadius: clipL ? 0 : 6, borderBottomLeftRadius: clipL ? 0 : 6,
        borderTopRightRadius: clipR ? 0 : 6, borderBottomRightRadius: clipR ? 0 : 6,
        cursor: 'grab', boxShadow: active ? '0 4px 14px rgba(18,32,56,.18)' : 'var(--shadow-sm)',
        zIndex: active ? 5 : 1, userSelect: 'none', transition: active ? 'none' : 'box-shadow .15s' } },
      // sticky-left info — SO id + value + product name; stays pinned at the left while scrolling a wide bar
      React.createElement('div', { style: { position: 'sticky', left: LABEL_W + 8, display: 'inline-flex', flexDirection: 'column', gap: 1, padding: '5px 8px', maxWidth: Math.max(60, width), background: barBg, borderRadius: 5, pointerEvents: 'none' } },
        React.createElement('div', { className: 'row', style: { gap: 6 } },
          overL > 0 && React.createElement('span', { className: 'mono', style: { fontSize: 8.5, fontWeight: 700, color: col, whiteSpace: 'nowrap' } }, '←+' + overL + (lang === 'th' ? 'ว.' : 'd')),
          React.createElement('span', { className: 'mono', style: { fontSize: 10, fontWeight: 700, color: col, display: 'flex', alignItems: 'center', gap: 3, whiteSpace: 'nowrap' } },
            started && React.createElement(Icon, { name: 'lock', size: 9 }), bar.id),
          React.createElement('span', { className: 'mono', style: { fontSize: 9, fontWeight: started ? 700 : 400, color: valColor, whiteSpace: 'nowrap' } }, valText)),
        React.createElement('span', { style: { fontSize: 10.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, D.fgName(state, bar.fg, lang))),
      // right end ("ปลาย") — value + start / status
      React.createElement('div', { style: { position: 'absolute', right: clipR ? 4 : 12, top: 6, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 } },
        overR > 0 && React.createElement('span', { className: 'mono', style: { fontSize: 8.5, fontWeight: 700, color: col, background: barBg, borderRadius: 4, padding: '1px 4px', whiteSpace: 'nowrap' } },
          '+' + overR + (lang === 'th' ? ' วัน →' : 'd →')),
        React.createElement('span', { className: 'mono', style: { fontSize: 9.5, fontWeight: started ? 700 : 400, color: valColor, whiteSpace: 'nowrap' } }, valText),
        !ready
          // not startable yet — show why (ขอเปิดผลิต / รอวัตถุดิบ / รอจองวัตถุดิบ)
          ? React.createElement('span', { style: { fontSize: 8.5, fontWeight: 700, color: 'var(--danger)', background: 'var(--danger-tint)', borderRadius: 4, padding: '2px 5px', display: 'flex', alignItems: 'center', gap: 2, whiteSpace: 'nowrap' } },
              React.createElement(Icon, { name: 'clock', size: 8 }), planStatus ? t('status.' + planStatus) : (lang === 'th' ? 'ยังไม่พร้อม' : 'Not ready'))
        : (started || readOnly)
          ? React.createElement('span', { style: { fontSize: 8.5, fontWeight: 700, color: completed ? 'var(--ok)' : 'var(--primary)', display: 'flex', alignItems: 'center', gap: 2 } }, started ? React.createElement(React.Fragment, null, React.createElement(Icon, { name: completed ? 'check' : 'play', size: 8 }), completed ? t('status.completed') : t('sch.producing')) : null)
          : React.createElement('button', { onPointerDown: (e) => e.stopPropagation(), onClick: (e) => { e.stopPropagation(); onStart(bar); },
              style: { fontSize: 8.5, fontWeight: 700, color: '#fff', background: col, border: 'none', borderRadius: 4, padding: '2px 6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2 } },
              React.createElement(Icon, { name: 'play', size: 8 }), t('sch.start'))),
      // resize handle — hidden when the real end is off-window (widen the range to resize there)
      !clipR && React.createElement('div', { onPointerDown: (e) => onPointerDown(e, bar, 'resize'),
        style: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 9, cursor: 'ew-resize', display: 'grid', placeItems: 'center' } },
        React.createElement('div', { style: { width: 3, height: 16, borderRadius: 2, background: col, opacity: .5 } })));
  }

  window.PG_Schedule = Schedule;
})();
