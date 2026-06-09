/* ============================================================
   Module: Production Scheduling — Gantt (HERO)
   Drag unscheduled orders onto lines · move · resize
   ============================================================ */
(function () {
  const { useI18n } = window.PG_I18N;
  const { PageHead, Icon, fmt, fmtDate, useToast, PriorityBadge } = window.PG_UI;
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
    const [bars, setBarsRaw] = React.useState(() => (state.scheduleBars || []).map(b => ({ ...b })));
    const barsRef = React.useRef(bars);
    const setBars = (updater) => setBarsRaw(prev => { const next = typeof updater === 'function' ? updater(prev) : updater; barsRef.current = next; return next; });
    const [activeBar, setActiveBar] = React.useState(null);

    // Two pools: ready (materials issued) — draggable; waiting (reserved, not yet issued) — not draggable
    const poolReady = state.prodOrders.filter(p => p.status === 'issued' && !p.line);
    const poolWaiting = state.prodOrders.filter(p => p.status === 'reserved' && !p.line);

    function persist() {
      setState(prev => ({ ...prev, scheduleBars: barsRef.current,
        prodOrders: prev.prodOrders.map(p => { const b = barsRef.current.find(x => x.id === p.id); return b ? { ...p, line: b.line, start: iso(b.startDay), days: b.days } : p; }),
        // keep the shop-floor WIP lot on the same line as its Gantt bar (until production starts, line can change)
        lotsWip: prev.lotsWip.map(w => { const b = barsRef.current.find(x => x.id === w.po); return b && b.line !== w.line ? { ...w, line: b.line } : w; }) }));
    }

    const dayDate = (i) => { const d = new Date(state.today); d.setDate(d.getDate() + i); return d; };

    function onBarPointerDown(e, bar, mode) {
      e.stopPropagation();
      e.preventDefault();
      drag.current = { id: bar.id, mode, startX: e.clientX, startY: e.clientY, oStart: bar.startDay, oDays: bar.days, oLine: bar.line };
      setActiveBar(bar.id);
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    }
    // a lot is "started" once production has begun (PPC pressed Start) → line is locked
    function lotStarted(poId) {
      const p = state.prodOrders.find(x => x.id === poId);
      return !!(p && (p.status === 'inprogress' || p.status === 'completed'));
    }
    function lotCompleted(poId) {
      const p = state.prodOrders.find(x => x.id === poId);
      return !!(p && p.status === 'completed');
    }

    function onMove(e) {
      const d = drag.current; if (!d) return;
      const dDays = Math.round((e.clientX - d.startX) / DAY_W);
      setBars(prev => prev.map(b => {
        if (b.id !== d.id) return b;
        if (d.mode === 'resize') {
          const days = Math.max(1, Math.min(DAYS - b.startDay, d.oDays + dDays));
          return { ...b, days };
        } else {
          const startDay = Math.max(0, Math.min(DAYS - b.days, d.oStart + dDays));
          // once production has started on this lot, keep it on its line (no cross-line move)
          if (lotStarted(b.id)) return { ...b, startDay };
          const dRow = Math.round((e.clientY - d.startY) / ROW_H);
          const idx = Math.max(0, Math.min(state.lines.length - 1, state.lines.findIndex(l => l.id === d.oLine) + dRow));
          return { ...b, startDay, line: state.lines[idx].id };
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
      const po = state.prodOrders.find(p => p.id === poId); if (!po || po.status !== 'issued') return;
      const rect = gridRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left - LABEL_W;
      const startDay = Math.max(0, Math.min(DAYS - 2, Math.floor(x / DAY_W)));
      const days = Math.max(1, Math.min(4, Math.round(po.qty / (state.lines.find(l => l.id === lineId).dailyCap))));
      const order = state.orders.find(o => o.id === po.order) || {};
      const bar = { id: po.id, order: po.order, fg: po.fg, qty: po.qty, line: lineId, startDay, days, priority: order.priority || 'med' };
      const nextBars = [...barsRef.current, bar];
      setBars(nextBars);
      // Only PLACE the order on a line (status 'scheduled'). No WIP lot yet — that happens on Start.
      setState(prev => ({ ...prev,
        scheduleBars: nextBars,
        prodOrders: prev.prodOrders.map(p => p.id === poId ? { ...p, line: lineId, start: iso(startDay), days, status: 'scheduled' } : p),
        orders: prev.orders.map(o => o.id === po.order ? { ...o, status: 'scheduled' } : o),
      }));
      toast(t('toast.scheduled'));
    }

    // Start production: freeze the CURRENT line's workflow template, create the WIP lot, lock the line.
    function startProduction(bar) {
      setState(prev => {
        const wf = D.workflowForLine(prev, bar.line);
        const wfSnapshot = wf ? wf.steps.map(s => ({ ...s })) : null;
        const prodOrders = prev.prodOrders.map(p => p.id === bar.id ? { ...p, line: bar.line, status: 'inprogress', wf: (wf || {}).id || p.wf, wfSnapshot } : p);
        const targetPo = prodOrders.find(p => p.id === bar.id);
        const lotsWip = prev.lotsWip.some(w => w.po === bar.id) ? prev.lotsWip : [...prev.lotsWip, D.buildWipLot(prev, targetPo)];
        return { ...prev, prodOrders, lotsWip };
      });
      toast(t('toast.started'));
    }

    const todayIdx = 0;

    const legend = React.createElement('div', { style: { padding: '8px 14px', borderTop: '1px solid var(--border)', display: 'flex', gap: 16, fontSize: 10.5, color: 'var(--text-muted)', flexWrap: 'wrap' } },
      React.createElement('span', { className: 'row', style: { gap: 5 } }, React.createElement(Icon, { name: 'drag', size: 12 }), lang === 'th' ? 'ลากเพื่อย้าย' : 'Drag to move'),
      React.createElement('span', { className: 'row', style: { gap: 5 } }, React.createElement(Icon, { name: 'arrowR', size: 12 }), lang === 'th' ? 'ลากขอบขวาเพื่อปรับระยะเวลา' : 'Drag right edge to resize'),
      React.createElement('span', { className: 'row', style: { gap: 5 } }, React.createElement(Icon, { name: 'play', size: 12 }), t('sch.starthint')));

    return React.createElement('div', null,
      React.createElement(PageHead, { title: t('sch.title'), sub: t('sch.sub') }),
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
                    React.createElement('span', { className: 'mono faint' }, fmt(po.qty) + ' ' + t('u.pcs')),
                    React.createElement('span', { className: 'faint' }, order.due ? fmtDate(order.due) : po.order)));
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
            React.createElement('div', { style: { minWidth: LABEL_W + DAYS * DAY_W } },
              // header
              React.createElement('div', { style: { display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)', position: 'sticky', top: 0, zIndex: 2 } },
                React.createElement('div', { style: { width: LABEL_W, flexShrink: 0, padding: '8px 12px', fontSize: 10.5, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '.5px' } }, t('f.line')),
                Array.from({ length: DAYS }).map((_, i) => {
                  const dt = dayDate(i); const wd = dt.getDay();
                  return React.createElement('div', { key: i, style: { width: DAY_W, flexShrink: 0, textAlign: 'center', padding: '6px 0', borderLeft: '1px solid var(--border)', background: i === todayIdx ? 'var(--primary-tint)' : (wd === 0 || wd === 6) ? 'var(--surface-3)' : 'transparent' } },
                    React.createElement('div', { style: { fontSize: 9, color: 'var(--text-faint)' } }, dt.toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-US', { weekday: 'short' })),
                    React.createElement('div', { style: { fontSize: 12, fontWeight: 700, color: i === todayIdx ? 'var(--primary)' : 'var(--text)' } }, dt.getDate()));
                })),
              // rows
              state.lines.map(ln => {
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
                    Array.from({ length: DAYS }).map((_, i) => {
                      const dt = dayDate(i); const wd = dt.getDay();
                      return React.createElement('div', { key: i, style: { width: DAY_W, flexShrink: 0, borderLeft: '1px solid var(--border)', background: i === todayIdx ? 'rgba(45,91,215,.04)' : (wd === 0 || wd === 6) ? 'var(--surface-2)' : 'transparent' } });
                    }),
                    // bars
                    lineBars.map(b => React.createElement(Bar, { key: b.id, bar: b, state, lang, t, active: activeBar === b.id, started: lotStarted(b.id), completed: lotCompleted(b.id),
                      onStart: startProduction, onPointerDown: onBarPointerDown }))));
              }))),
          legend)));
  }

  function Bar({ bar, state, lang, t, active, started, completed, onStart, onPointerDown }) {
    const col = completed ? 'var(--ok)' : (LINE_COLORS[bar.line] || '#2d5bd7');
    return React.createElement('div', {
      onPointerDown: (e) => onPointerDown(e, bar, 'move'),
      style: { position: 'absolute', left: bar.startDay * DAY_W + 3, top: 7, width: bar.days * DAY_W - 6, height: ROW_H - 14,
        background: 'color-mix(in srgb,' + col + ' 14%, white)', border: '1.5px solid ' + col, borderLeft: '3px solid ' + col,
        borderRadius: 6, padding: '4px 8px', cursor: 'grab', boxShadow: active ? '0 4px 14px rgba(18,32,56,.18)' : 'var(--shadow-sm)',
        zIndex: active ? 5 : 1, overflow: 'hidden', userSelect: 'none', transition: active ? 'none' : 'box-shadow .15s' } },
      React.createElement('div', { className: 'row', style: { justifyContent: 'space-between', gap: 4 } },
        React.createElement('span', { className: 'mono', style: { fontSize: 10, fontWeight: 700, color: col, display: 'flex', alignItems: 'center', gap: 3 } },
          started && React.createElement(Icon, { name: 'lock', size: 9 }), bar.id),
        React.createElement('span', { className: 'mono', style: { fontSize: 9.5, color: 'var(--text-muted)' } }, fmt(bar.qty))),
      React.createElement('div', { className: 'row', style: { justifyContent: 'space-between', gap: 6 } },
        React.createElement('span', { style: { fontSize: 10.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 } }, D.fgName(state, bar.fg, lang)),
        started
          ? React.createElement('span', { style: { fontSize: 8.5, fontWeight: 700, color: completed ? 'var(--ok)' : 'var(--primary)', display: 'flex', alignItems: 'center', gap: 2 } }, React.createElement(Icon, { name: completed ? 'check' : 'play', size: 8 }), completed ? t('status.completed') : t('sch.producing'))
          : React.createElement('button', { onPointerDown: (e) => e.stopPropagation(), onClick: (e) => { e.stopPropagation(); onStart(bar); },
              style: { flexShrink: 0, fontSize: 8.5, fontWeight: 700, color: '#fff', background: col, border: 'none', borderRadius: 4, padding: '2px 6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2 } },
              React.createElement(Icon, { name: 'play', size: 8 }), t('sch.start'))),
      // resize handle
      React.createElement('div', { onPointerDown: (e) => onPointerDown(e, bar, 'resize'),
        style: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 9, cursor: 'ew-resize', display: 'grid', placeItems: 'center' } },
        React.createElement('div', { style: { width: 3, height: 16, borderRadius: 2, background: col, opacity: .5 } })));
  }

  window.PG_Schedule = Schedule;
})();
