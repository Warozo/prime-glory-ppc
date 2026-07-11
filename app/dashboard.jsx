/* ============================================================
   Module: Management Dashboard (focused monitoring view)
   ============================================================ */
(function () {
  const { useI18n } = window.PG_I18N;
  const { Card, Stat, PageHead, Icon, fmt, fmtDate } = window.PG_UI;
  const { StackedColumns, LineChart, Donut } = window.PG_CHARTS;
  const D = window.PG_DATA;
  const LINE_COLORS = { A: '#2d5bd7', B: '#7b5cd9', C: '#1f8a5b', D: '#e08a1e', E: '#cf3b3b', F: '#0e7490', G: '#9333ea' };

  function Dashboard({ state, go }) {
    const { t, lang } = useI18n();
    const s = state;
    const running = s.prodOrders.filter(p => p.status === 'inprogress').length;
    const waiting = s.orders.filter(o => o.status === 'waiting').length;
    const scheduled = s.orders.filter(o => o.status === 'scheduled').length;
    // completed THIS MONTH (by completion date if present, else count all completed in session)
    const thisMonth = s.today.slice(0, 7);
    const completedMonth = s.prodOrders.filter(p => p.status === 'completed' && (!p.completedAt || p.completedAt.slice(0, 7) === thisMonth)).length
      || s.orders.filter(o => o.status === 'completed').length;

    const nearExpiry = s.lots.filter(l => {
      const days = (new Date(l.expiry) - new Date(s.today)) / 864e5; return days <= 30 && l.remaining > 0;
    }).sort((x, y) => new Date(x.expiry) - new Date(y.expiry));
    const fgTotal = s.fgStock.reduce((a2, x) => a2 + x.qty, 0);

    // Orders still waiting on materials, with each short material's procurement status + ETA
    const waitMat = s.orders.filter(o => o.status === 'waiting').map(o => {
      const shorts = D.bomRequirement(s, o.fg, o.qty).filter(r => r.short > 0).map(r => {
        const p = (s.procurement && s.procurement[o.id] && s.procurement[o.id][r.rm]) || { status: 'pending', eta: '' };
        return { rm: r.rm, short: r.short, unit: r.unit, status: p.status, eta: p.eta };
      });
      return { id: o.id, customer: o.customer, fg: o.fg, shorts };
    }).filter(o => o.shorts.length > 0);

    const hasOutput = false; // (daily output now handled by DailyOutputPanel below)

    return React.createElement('div', null,
      React.createElement(PageHead, { title: t('db.title'), sub: t('db.sub') }),

      // KPI row
      React.createElement('div', { className: 'grid g-4', style: { marginBottom: 'var(--gap)' } },
        React.createElement(Stat, { label: t('db.running'), value: running, accent: 'var(--primary)', icon: 'play', foot: t('navsec.production') }),
        React.createElement(Stat, { label: t('db.waiting'), value: waiting, accent: 'var(--st-waiting)', icon: 'alert', foot: t('flow.shortage') }),
        React.createElement(Stat, { label: t('db.scheduled'), value: scheduled, accent: 'var(--st-scheduled)', icon: 'schedule', foot: t('nav.schedule') }),
        React.createElement(Stat, { label: t('db.completedmonth'), value: completedMonth, accent: 'var(--st-completed)', icon: 'checkcircle', foot: fmtDate(s.today) })),

      // Orders waiting for materials — name, material, status, expected arrival
      React.createElement('div', { style: { marginBottom: 'var(--gap)' } },
        React.createElement(Card, { title: lang === 'th' ? 'ใบสั่งผลิตรอวัตถุดิบ' : 'Orders waiting for materials', icon: 'alert',
          actions: React.createElement('span', { className: 'badge', style: { color: 'var(--st-waiting)', background: 'var(--warn-tint)' } }, waitMat.length) },
          waitMat.length === 0
            ? React.createElement('div', { className: 'faint', style: { fontSize: 12 } }, lang === 'th' ? 'ไม่มีใบสั่งผลิตที่รอวัตถุดิบ' : 'No orders waiting for materials')
            : React.createElement('table', { className: 'tbl' },
              React.createElement('thead', null, React.createElement('tr', null,
                React.createElement('th', null, lang === 'th' ? 'ใบสั่งผลิต' : 'Order'),
                React.createElement('th', null, t('f.product')),
                React.createElement('th', null, lang === 'th' ? 'วัตถุดิบที่รอ' : 'Material'),
                React.createElement('th', { className: 'num' }, t('f.shortage')),
                React.createElement('th', null, lang === 'th' ? 'สถานะ' : 'Status'),
                React.createElement('th', null, lang === 'th' ? 'วันคาดการณ์' : 'Expected'))),
              React.createElement('tbody', null, waitMat.reduce((rows, o) => {
                o.shorts.forEach((sh, j) => {
                  const st = D.PROC_STATUS[sh.status] || D.PROC_STATUS.pending;
                  const c = { pending: ['var(--text-muted)', 'var(--surface-3)'], ordered: ['var(--st-scheduled)', 'var(--primary-tint)'], transit: ['var(--warn)', 'var(--warn-tint)'] }[sh.status] || ['var(--text-muted)', 'var(--surface-3)'];
                  rows.push(React.createElement('tr', { key: o.id + '_' + sh.rm, className: 'clickrow', style: { cursor: 'pointer' }, onClick: () => go('flow') },
                    j === 0 ? React.createElement('td', { rowSpan: o.shorts.length, style: { verticalAlign: 'top' } }, React.createElement('div', { className: 'mono', style: { fontWeight: 700, color: 'var(--primary)' } }, o.id), React.createElement('div', { className: 'faint', style: { fontSize: 10.5 } }, o.customer)) : null,
                    j === 0 ? React.createElement('td', { rowSpan: o.shorts.length, style: { verticalAlign: 'top', fontWeight: 600 } }, D.fgName(s, o.fg, lang)) : null,
                    React.createElement('td', null, React.createElement('div', { style: { fontWeight: 600 } }, D.rmName(s, sh.rm, lang)), React.createElement('div', { className: 'mono faint', style: { fontSize: 10 } }, sh.rm)),
                    React.createElement('td', { className: 'num mono', style: { color: 'var(--danger)', fontWeight: 700 } }, '-' + fmt(sh.short) + ' ' + sh.unit),
                    React.createElement('td', null, React.createElement('span', { className: 'badge', style: { color: c[0], background: c[1] } }, lang === 'th' ? st.th : st.en)),
                    React.createElement('td', { className: 'mono faint' }, sh.eta ? fmtDate(sh.eta) : '—')));
                });
                return rows;
              }, []))))),

      // Daily output by line — compact line chart + filterable table
      React.createElement('div', { style: { marginBottom: 'var(--gap)' } },
        React.createElement(DailyOutputPanel, { state: s, lang, t, go })),

      // FG stock + near expiry
      React.createElement('div', { className: 'grid g-2' },
        React.createElement(Card, { title: t('db.fgstock'), icon: 'fg' },
          s.fgStock.length === 0
            ? React.createElement('div', { className: 'empty', style: { fontSize: 12 } }, t('tbl.noresults'))
            : React.createElement('div', { className: 'row', style: { gap: 18 } },
              React.createElement(Donut, { size: 124, segments: aggFg(s).map((x, i) => ({ value: x.qty, color: ['#2d5bd7', '#5b86ed', '#7b5cd9', '#1f8a5b', '#e08a1e', '#0e7490'][i % 6] })),
                center: React.createElement('div', null,
                  React.createElement('div', { style: { fontSize: 17, fontWeight: 700 } }, fgTotal >= 1000 ? (fgTotal / 1000).toFixed(1) + 'k' : fgTotal),
                  React.createElement('div', { style: { fontSize: 9, color: 'var(--text-faint)' } }, t('u.pcs'))) }),
              React.createElement('div', { style: { flex: 1, display: 'flex', flexDirection: 'column', gap: 7 } },
                aggFg(s).map((x, i) => React.createElement('div', { key: i, className: 'row', style: { fontSize: 11.5, justifyContent: 'space-between' } },
                  React.createElement('span', { className: 'row', style: { gap: 6 } },
                    React.createElement('span', { style: { width: 8, height: 8, borderRadius: 2, background: ['#2d5bd7', '#5b86ed', '#7b5cd9', '#1f8a5b', '#e08a1e', '#0e7490'][i % 6] } }),
                    D.fgName(s, x.fg, lang)),
                  React.createElement('span', { className: 'mono', style: { fontWeight: 600 } }, fmt(x.qty))))))),
        React.createElement(Card, { title: t('db.nearexpiry'), icon: 'clock',
          actions: React.createElement('span', { className: 'badge', style: { color: 'var(--danger)', background: 'var(--danger-tint)' } }, nearExpiry.length) },
          React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
            nearExpiry.length === 0 ? React.createElement('div', { className: 'faint', style: { fontSize: 12 } }, lang === 'th' ? 'ไม่มีวัตถุดิบใกล้หมดอายุ' : 'No materials near expiry') :
            nearExpiry.slice(0, 6).map(l => {
              const dys = Math.round((new Date(l.expiry) - new Date(s.today)) / 864e5);
              return React.createElement('div', { key: l.id, className: 'row', style: { justifyContent: 'space-between', fontSize: 11.5 } },
                React.createElement('div', null,
                  React.createElement('div', { style: { fontWeight: 600 } }, D.rmName(s, l.rm, lang)),
                  React.createElement('div', { className: 'mono faint', style: { fontSize: 10 } }, l.lot + ' · ' + t('f.expiry') + ' ' + fmtDate(l.expiry))),
                React.createElement('span', { className: 'badge', style: { color: dys <= 14 ? 'var(--danger)' : 'var(--warn)', background: dys <= 14 ? 'var(--danger-tint)' : 'var(--warn-tint)' } }, dys + ' ' + (lang === 'th' ? 'วัน' : 'd'))); })))));
  }

  // ---- Daily output: compact line chart + filterable per-line table ----
  function DailyOutputPanel({ state, lang, t, go }) {
    const s = state;
    const DateField = window.PG_UI.DateField;
    const def = React.useMemo(() => { const f = new Date(s.today); f.setDate(f.getDate() - 14); return { from: f.toISOString().slice(0, 10), to: s.today }; }, [s.today]);
    const [range, setRange] = React.useState(def);
    function quick(n) { const f = new Date(s.today); f.setDate(f.getDate() - (n - 1)); setRange({ from: f.toISOString().slice(0, 10), to: s.today }); }

    // date list (cap 60)
    let d0 = new Date(range.from), d1 = new Date(range.to);
    if (isNaN(d0)) d0 = new Date(def.from); if (isNaN(d1)) d1 = new Date(def.to);
    if (d1 < d0) { const tmp = d0; d0 = d1; d1 = tmp; }
    const dates = [];
    for (let d = new Date(d0); d <= d1 && dates.length < 60; d.setDate(d.getDate() + 1)) dates.push(d.toISOString().slice(0, 10));

    // per line → per production order → per day, from final-step output.
    // (one order can appear under several lines, supporting split production.)
    const grid = {};        // line -> po -> date -> qty
    const lineByDate = {};  // line -> date -> qty (line subtotal)
    const totalByDate = {}; // date -> qty (grand total)
    const poInfo = {};      // po -> { fg, order }
    s.lotsWip.forEach(lot => {
      const last = lot.stations[lot.stations.length - 1];
      poInfo[lot.po] = { fg: lot.fg, order: lot.order };
      (lot.outputLog || []).forEach(e => {
        const isLast = e.step === last.step || e.station === last.name || e.station === last.nameTh;
        if (!isLast) return;
        const dd = e.date || s.today;
        grid[lot.line] = grid[lot.line] || {};
        grid[lot.line][lot.po] = grid[lot.line][lot.po] || {};
        grid[lot.line][lot.po][dd] = (grid[lot.line][lot.po][dd] || 0) + e.qty;
        lineByDate[lot.line] = lineByDate[lot.line] || {};
        lineByDate[lot.line][dd] = (lineByDate[lot.line][dd] || 0) + e.qty;
        totalByDate[dd] = (totalByDate[dd] || 0) + e.qty;
      });
    });
    const showLines = s.lines.filter(l => grid[l.id]).map(l => l.id);
    const grandTotal = dates.reduce((a, iso) => a + (totalByDate[iso] || 0), 0);
    const hasOut = grandTotal > 0;
    const rowSum = (m) => dates.reduce((a, iso) => a + ((m || {})[iso] || 0), 0);

    function exportDaily() {
      const headers = [lang === 'th' ? 'สายการผลิต' : 'Line', lang === 'th' ? 'ใบสั่งผลิต' : 'Production order', lang === 'th' ? 'สินค้า' : 'Product']
        .concat(dates.map(iso => fmtDate(iso))).concat([lang === 'th' ? 'รวม' : 'Total']);
      const rows = [];
      showLines.forEach(ln => {
        const ln0 = s.lines.find(l => l.id === ln);
        const lineName = ln0 ? ln0.name : 'Line ' + ln;
        Object.keys(grid[ln] || {}).forEach(po => {
          const info = poInfo[po] || {};
          rows.push([lineName, po, D.fgName(s, info.fg, lang)].concat(dates.map(iso => (grid[ln][po] || {})[iso] || 0)).concat([rowSum(grid[ln][po])]));
        });
      });
      rows.push([lang === 'th' ? 'รวมทุกสาย' : 'All lines', '', ''].concat(dates.map(iso => totalByDate[iso] || 0)).concat([grandTotal]));
      window.PG_UI.exportCsv('daily-output-' + range.from + '_' + range.to + '.csv', headers, rows);
    }

    return React.createElement(Card, { title: t('db.dailyoutput'), icon: 'dashboard',
      actions: React.createElement('div', { className: 'row', style: { gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' } },
        React.createElement('button', { className: 'btn btn-sm', onClick: exportDaily, disabled: !hasOut }, React.createElement(Icon, { name: 'export', size: 14 }), lang === 'th' ? 'ส่งออก CSV' : 'Export CSV'),
        React.createElement('div', { className: 'pill-tabs' },
          [7, 15, 30].map(n => React.createElement('button', { key: n, className: dates.length === n ? 'on' : '', onClick: () => quick(n) }, n + (lang === 'th' ? ' วัน' : 'd')))),
        React.createElement(DateField, { value: range.from, onChange: v => setRange(r => ({ ...r, from: v })), style: { width: 138 } }),
        React.createElement('span', { className: 'faint' }, '–'),
        React.createElement(DateField, { value: range.to, onChange: v => setRange(r => ({ ...r, to: v })), style: { width: 138 } })) },
      hasOut
        ? React.createElement('div', { style: { overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 8 } },
            React.createElement('table', { className: 'tbl', style: { minWidth: Math.max(620, 220 + dates.length * 58) } },
              React.createElement('thead', null, React.createElement('tr', null,
                React.createElement('th', { style: { position: 'sticky', left: 0, zIndex: 2, background: 'var(--surface-2)', minWidth: 210 } }, lang === 'th' ? 'สายการผลิต / ใบสั่งผลิต' : 'Line / Production order'),
                dates.map(iso => React.createElement('th', { key: iso, className: 'num', style: { whiteSpace: 'nowrap' } }, fmtDate(iso).slice(0, 5))),
                React.createElement('th', { className: 'num', style: { background: 'var(--surface-2)', whiteSpace: 'nowrap' } }, lang === 'th' ? 'รวม' : 'Total'))),
              React.createElement('tbody', null,
                showLines.reduce((rows, ln) => {
                  const ln0 = s.lines.find(l => l.id === ln);
                  const pos = Object.keys(grid[ln] || {});
                  // line header row (with per-day subtotal)
                  rows.push(React.createElement('tr', { key: 'L_' + ln, style: { background: 'var(--surface-2)' } },
                    React.createElement('td', { style: { position: 'sticky', left: 0, zIndex: 1, background: 'var(--surface-2)', fontWeight: 700, fontSize: 11.5 } },
                      React.createElement('span', { className: 'row', style: { gap: 6 } },
                        React.createElement('span', { style: { width: 9, height: 9, borderRadius: 2, background: LINE_COLORS[ln] || '#2d5bd7' } }),
                        (ln0 ? ln0.name : 'Line ' + ln))),
                    dates.map(iso => { const v = (lineByDate[ln] || {})[iso]; return React.createElement('td', { key: iso, className: 'num mono', style: { fontWeight: 700 } }, v ? fmt(v) : '·'); }),
                    React.createElement('td', { className: 'num mono', style: { fontWeight: 700, background: 'var(--surface-3)' } }, fmt(rowSum(lineByDate[ln])))));
                  // one row per production order under this line
                  pos.forEach(po => {
                    const info = poInfo[po] || {};
                    rows.push(React.createElement('tr', { key: ln + '_' + po, className: 'clickrow', onClick: () => go('shopfloor') },
                      React.createElement('td', { style: { position: 'sticky', left: 0, zIndex: 1, background: 'var(--surface)', paddingLeft: 26 } },
                        React.createElement('span', { className: 'mono', style: { fontSize: 11, fontWeight: 600, color: 'var(--primary)' } }, po),
                        React.createElement('span', { className: 'faint', style: { fontSize: 10.5, marginLeft: 6 } }, D.fgName(s, info.fg, lang))),
                      dates.map(iso => { const v = (grid[ln][po] || {})[iso]; return React.createElement('td', { key: iso, className: 'num mono', style: { color: v ? 'var(--st-completed)' : 'var(--text-faint)', fontWeight: v ? 600 : 400 } }, v ? fmt(v) : '·'); }),
                      React.createElement('td', { className: 'num mono', style: { fontWeight: 600, background: 'var(--surface-2)' } }, fmt(rowSum(grid[ln][po])))));
                  });
                  return rows;
                }, []).concat([
                  React.createElement('tr', { key: '_grand', style: { borderTop: '2px solid var(--border-strong)' } },
                    React.createElement('td', { style: { position: 'sticky', left: 0, zIndex: 1, background: 'var(--surface-2)', fontWeight: 700, fontSize: 11.5 } }, lang === 'th' ? 'รวมทุกสาย' : 'All lines'),
                    dates.map(iso => React.createElement('td', { key: iso, className: 'num mono', style: { fontWeight: 700, background: 'var(--surface-2)' } }, totalByDate[iso] ? fmt(totalByDate[iso]) : '·')),
                    React.createElement('td', { className: 'num mono', style: { fontWeight: 700, background: 'var(--surface-3)' } }, fmt(grandTotal)))
                ]))))
        : React.createElement('div', { className: 'empty', style: { padding: '40px 20px' } },
            React.createElement(Icon, { name: 'dashboard', size: 26, style: { color: 'var(--text-faint)' } }),
            React.createElement('div', { style: { marginTop: 8, fontSize: 12.5 } }, lang === 'th' ? 'ยังไม่มียอดผลิตในช่วงที่เลือก' : 'No output in the selected range'),
            React.createElement('div', { className: 'faint', style: { fontSize: 11, marginTop: 3 } }, lang === 'th' ? 'ยอดผลิตรายวันต่อสาย แยกตามใบสั่งผลิต จะแสดงที่นี่' : 'Daily output per line, by production order, will appear here')));
  }

  // aggregate FG stock by product
  function aggFg(s) {
    const m = {};
    s.fgStock.forEach(x => { m[x.fg] = (m[x.fg] || 0) + x.qty; });
    return Object.keys(m).map(fg => ({ fg, qty: m[fg] }));
  }

  window.PG_Dashboard = Dashboard;
})();
