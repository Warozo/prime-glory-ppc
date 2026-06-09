/* ============================================================
   Module: Management Dashboard (focused monitoring view)
   ============================================================ */
(function () {
  const { useI18n } = window.PG_I18N;
  const { Card, Stat, PageHead, Icon, fmt, fmtDate } = window.PG_UI;
  const { StackedColumns, Donut } = window.PG_CHARTS;
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

    // --- Daily output (last 7 days) split by line, from reported shop-floor output ---
    const days = [];
    for (let i = 6; i >= 0; i--) { const dt = new Date(s.today); dt.setDate(dt.getDate() - i); days.push(dt.toISOString().slice(0, 10)); }
    const linesWithOutput = [];
    const dayMap = days.map(iso => ({ iso, label: fmtDate(iso).slice(0, 5), total: 0, parts: {} }));
    s.lotsWip.forEach(lot => {
      const lastStep = lot.stations[lot.stations.length - 1].step;
      (lot.outputLog || []).forEach(e => {
        if (e.step !== lastStep && e.station !== lot.stations[lot.stations.length - 1].name && e.station !== lot.stations[lot.stations.length - 1].nameTh) return;
        const dd = e.date || s.today;
        const slot = dayMap.find(x => x.iso === dd);
        if (!slot) return;
        slot.parts[lot.line] = (slot.parts[lot.line] || 0) + e.qty;
        slot.total += e.qty;
        if (!linesWithOutput.includes(lot.line)) linesWithOutput.push(lot.line);
      });
    });
    const hasOutput = dayMap.some(d => d.total > 0);

    return React.createElement('div', null,
      React.createElement(PageHead, { title: t('db.title'), sub: t('db.sub') }),

      // KPI row
      React.createElement('div', { className: 'grid g-4', style: { marginBottom: 'var(--gap)' } },
        React.createElement(Stat, { label: t('db.running'), value: running, accent: 'var(--primary)', icon: 'play', foot: t('navsec.production') }),
        React.createElement(Stat, { label: t('db.waiting'), value: waiting, accent: 'var(--st-waiting)', icon: 'alert', foot: t('flow.shortage') }),
        React.createElement(Stat, { label: t('db.scheduled'), value: scheduled, accent: 'var(--st-scheduled)', icon: 'schedule', foot: t('nav.schedule') }),
        React.createElement(Stat, { label: t('db.completedmonth'), value: completedMonth, accent: 'var(--st-completed)', icon: 'checkcircle', foot: fmtDate(s.today) })),

      // Daily output by line (full width)
      React.createElement('div', { style: { marginBottom: 'var(--gap)' } },
        React.createElement(Card, { title: t('db.dailyoutput'), icon: 'dashboard',
          actions: linesWithOutput.length > 0 && React.createElement('div', { className: 'row', style: { gap: 12 } },
            linesWithOutput.map(ln => React.createElement('span', { key: ln, className: 'row', style: { gap: 5, fontSize: 10.5, color: 'var(--text-muted)' } },
              React.createElement('span', { style: { width: 9, height: 9, borderRadius: 2, background: LINE_COLORS[ln] || '#2d5bd7' } }), 'Line ' + ln))) },
          hasOutput
            ? React.createElement(StackedColumns, { days: dayMap, series: linesWithOutput, colors: LINE_COLORS, height: 220 })
            : React.createElement('div', { className: 'empty', style: { padding: '46px 20px' } },
                React.createElement(Icon, { name: 'dashboard', size: 26, style: { color: 'var(--text-faint)' } }),
                React.createElement('div', { style: { marginTop: 8, fontSize: 12.5 } }, lang === 'th' ? 'ยังไม่มียอดผลิตที่ส่งเข้ามา' : 'No reported output yet'),
                React.createElement('div', { className: 'faint', style: { fontSize: 11, marginTop: 3 } }, lang === 'th' ? 'ยอดผลิตสะสมรายวันต่อสายการผลิตจะแสดงที่นี่' : 'Cumulative daily output per line will appear here')))),

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

  // aggregate FG stock by product
  function aggFg(s) {
    const m = {};
    s.fgStock.forEach(x => { m[x.fg] = (m[x.fg] || 0) + x.qty; });
    return Object.keys(m).map(fg => ({ fg, qty: m[fg] }));
  }

  window.PG_Dashboard = Dashboard;
})();
