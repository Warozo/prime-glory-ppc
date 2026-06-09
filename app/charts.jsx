/* ============================================================
   Charts — lightweight SVG data-viz (no external libs)
   ============================================================ */
(function () {
  const C_PRIMARY = '#2d5bd7', C_LIGHT = '#a9c0f2', C_OK = '#1f8a5b', C_WARN = '#e08a1e', C_DANGER = '#cf3b3b';
  function fmt(n) { return (n || 0).toLocaleString('en-US'); }

  /* Grouped bars — Plan vs Actual per line */
  function PlanActualChart({ data, labels }) {
    const W = 380, H = 190, pad = { l: 38, r: 10, t: 14, b: 26 };
    const max = Math.max(...data.flatMap(d => [d.plan, d.actual])) * 1.1;
    const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
    const groupW = iw / data.length, bw = Math.min(26, groupW / 3);
    const y = v => pad.t + ih - (v / max) * ih;
    const ticks = [0, .25, .5, .75, 1].map(f => Math.round(max * f));
    return React.createElement('svg', { viewBox: `0 0 ${W} ${H}`, width: '100%', style: { display: 'block' } },
      ticks.map((tk, i) => React.createElement('g', { key: i },
        React.createElement('line', { x1: pad.l, x2: W - pad.r, y1: y(tk), y2: y(tk), stroke: '#eef1f6', strokeWidth: 1 }),
        React.createElement('text', { x: pad.l - 5, y: y(tk) + 3, textAnchor: 'end', fontSize: 8.5, fill: '#8a94a6' }, tk >= 1000 ? (tk / 1000) + 'k' : tk))),
      data.map((d, i) => {
        const cx = pad.l + groupW * i + groupW / 2;
        return React.createElement('g', { key: i },
          React.createElement('rect', { x: cx - bw - 2, y: y(d.plan), width: bw, height: pad.t + ih - y(d.plan), rx: 2, fill: C_LIGHT }),
          React.createElement('rect', { x: cx + 2, y: y(d.actual), width: bw, height: pad.t + ih - y(d.actual), rx: 2, fill: C_PRIMARY }),
          React.createElement('text', { x: cx, y: H - 9, textAnchor: 'middle', fontSize: 9, fill: '#586173', fontWeight: 600 }, (labels ? labels[i] : '') || ('Line ' + d.line)));
      }));
  }

  /* Columns — daily / hourly output */
  function ColumnChart({ data, valueKey = 'out', labelKey = 't', color = C_PRIMARY, height = 170, highlightLast }) {
    const W = 380, H = height, pad = { l: 34, r: 8, t: 14, b: 24 };
    const max = Math.max(...data.map(d => d[valueKey]), 1) * 1.12;
    const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
    const bw = Math.min(30, (iw / data.length) * 0.6);
    const step = iw / data.length;
    const y = v => pad.t + ih - (v / max) * ih;
    return React.createElement('svg', { viewBox: `0 0 ${W} ${H}`, width: '100%', style: { display: 'block' } },
      [0, .5, 1].map((f, i) => React.createElement('line', { key: i, x1: pad.l, x2: W - pad.r, y1: y(max * f), y2: y(max * f), stroke: '#eef1f6' })),
      data.map((d, i) => {
        const cx = pad.l + step * i + step / 2;
        const v = d[valueKey];
        const isLast = highlightLast && i === data.length - 1;
        return React.createElement('g', { key: i },
          React.createElement('rect', { x: cx - bw / 2, y: y(v), width: bw, height: Math.max(0, pad.t + ih - y(v)), rx: 2, fill: isLast ? C_WARN : color, opacity: v === 0 ? 0.25 : 1 }),
          v > 0 && React.createElement('text', { x: cx, y: y(v) - 4, textAnchor: 'middle', fontSize: 8, fill: '#586173', fontWeight: 600 }, v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v),
          React.createElement('text', { x: cx, y: H - 8, textAnchor: 'middle', fontSize: 8.5, fill: '#8a94a6' }, d[labelKey]));
      }));
  }

  /* Line chart — cumulative / hourly trend */
  function LineChart({ data, valueKey = 'out', labelKey = 't', color = C_PRIMARY, height = 170, area = true }) {
    const W = 380, H = height, pad = { l: 34, r: 10, t: 14, b: 24 };
    const max = Math.max(...data.map(d => d[valueKey]), 1) * 1.15;
    const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
    const x = i => pad.l + (iw / (data.length - 1)) * i;
    const y = v => pad.t + ih - (v / max) * ih;
    const pts = data.map((d, i) => [x(i), y(d[valueKey])]);
    const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0] + ' ' + p[1]).join(' ');
    const areaP = line + ` L${x(data.length - 1)} ${pad.t + ih} L${pad.l} ${pad.t + ih} Z`;
    return React.createElement('svg', { viewBox: `0 0 ${W} ${H}`, width: '100%', style: { display: 'block' } },
      React.createElement('defs', null, React.createElement('linearGradient', { id: 'lg', x1: 0, y1: 0, x2: 0, y2: 1 },
        React.createElement('stop', { offset: '0%', stopColor: color, stopOpacity: .22 }),
        React.createElement('stop', { offset: '100%', stopColor: color, stopOpacity: 0 }))),
      [0, .5, 1].map((f, i) => React.createElement('line', { key: i, x1: pad.l, x2: W - pad.r, y1: y(max * f), y2: y(max * f), stroke: '#eef1f6' })),
      area && React.createElement('path', { d: areaP, fill: 'url(#lg)' }),
      React.createElement('path', { d: line, fill: 'none', stroke: color, strokeWidth: 2, strokeLinejoin: 'round' }),
      pts.map((p, i) => React.createElement('circle', { key: i, cx: p[0], cy: p[1], r: 2.6, fill: '#fff', stroke: color, strokeWidth: 1.6 })),
      data.map((d, i) => React.createElement('text', { key: 'l' + i, x: x(i), y: H - 8, textAnchor: 'middle', fontSize: 8.5, fill: '#8a94a6' }, d[labelKey])));
  }

  /* Gauge — capacity utilization */
  function Gauge({ value, label, size = 120 }) {
    const r = size / 2 - 10, cx = size / 2, cy = size / 2;
    const circ = Math.PI * r; // half circle
    const col = value >= 85 ? C_DANGER : value >= 70 ? C_WARN : C_OK;
    const off = circ * (1 - value / 100);
    return React.createElement('div', { style: { textAlign: 'center' } },
      React.createElement('svg', { viewBox: `0 0 ${size} ${size / 1.55}`, width: size },
        React.createElement('path', { d: `M10 ${cy} A ${r} ${r} 0 0 1 ${size - 10} ${cy}`, fill: 'none', stroke: '#eef1f6', strokeWidth: 9, strokeLinecap: 'round' }),
        React.createElement('path', { d: `M10 ${cy} A ${r} ${r} 0 0 1 ${size - 10} ${cy}`, fill: 'none', stroke: col, strokeWidth: 9, strokeLinecap: 'round', strokeDasharray: circ, strokeDashoffset: off, style: { transition: 'stroke-dashoffset .6s ease' } }),
        React.createElement('text', { x: cx, y: cy - 4, textAnchor: 'middle', fontSize: 19, fontWeight: 700, fill: '#18202e' }, value + '%')),
      React.createElement('div', { style: { fontSize: 11, color: '#586173', fontWeight: 600, marginTop: -4 } }, label));
  }

  /* Horizontal bars — WIP by station */
  function HBars({ data, labelKey, valueKey = 'qty', color = C_PRIMARY }) {
    const max = Math.max(...data.map(d => d[valueKey]), 1);
    return React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 9 } },
      data.map((d, i) => React.createElement('div', { key: i },
        React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 } },
          React.createElement('span', { style: { color: '#586173', fontWeight: 500 } }, d[labelKey]),
          React.createElement('span', { className: 'mono', style: { fontWeight: 600, color: '#18202e' } }, fmt(d[valueKey]))),
        React.createElement('div', { style: { height: 9, background: '#eef2f7', borderRadius: 5, overflow: 'hidden' } },
          React.createElement('div', { style: { width: (d[valueKey] / max * 100) + '%', height: '100%', background: color, borderRadius: 5, transition: 'width .5s ease' } })))));
  }

  /* Donut — stock split */
  function Donut({ segments, size = 120, center }) {
    const r = size / 2 - 9, cx = size / 2, cy = size / 2, circ = 2 * Math.PI * r;
    const total = segments.reduce((a, s) => a + s.value, 0) || 1;
    let acc = 0;
    return React.createElement('div', { style: { position: 'relative', width: size, height: size } },
      React.createElement('svg', { viewBox: `0 0 ${size} ${size}`, width: size, style: { transform: 'rotate(-90deg)' } },
        React.createElement('circle', { cx, cy, r, fill: 'none', stroke: '#eef2f7', strokeWidth: 11 }),
        segments.map((s, i) => {
          const len = (s.value / total) * circ;
          const el = React.createElement('circle', { key: i, cx, cy, r, fill: 'none', stroke: s.color, strokeWidth: 11,
            strokeDasharray: `${len} ${circ - len}`, strokeDashoffset: -acc, strokeLinecap: 'butt' });
          acc += len; return el;
        })),
      center && React.createElement('div', { style: { position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' } }, center));
  }

  /* Stacked columns — daily output split by production line */
  function StackedColumns({ days, series, colors, height = 200 }) {
    // days: [{label, total, parts:{lineId:qty}}]; series: [lineId,...]
    const W = 460, H = height, pad = { l: 38, r: 10, t: 16, b: 26 };
    const max = Math.max(...days.map(d => d.total), 1) * 1.14;
    const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
    const step = iw / days.length, bw = Math.min(34, step * 0.6);
    const y = v => pad.t + ih - (v / max) * ih;
    const ticks = [0, .5, 1].map(f => Math.round(max * f));
    return React.createElement('svg', { viewBox: `0 0 ${W} ${H}`, width: '100%', style: { display: 'block' } },
      ticks.map((tk, i) => React.createElement('g', { key: i },
        React.createElement('line', { x1: pad.l, x2: W - pad.r, y1: y(tk), y2: y(tk), stroke: '#eef1f6' }),
        React.createElement('text', { x: pad.l - 5, y: y(tk) + 3, textAnchor: 'end', fontSize: 8.5, fill: '#8a94a6' }, tk >= 1000 ? (tk / 1000).toFixed(tk >= 10000 ? 0 : 1) + 'k' : tk))),
      days.map((d, i) => {
        const cx = pad.l + step * i + step / 2;
        let acc = 0;
        const segs = series.map((ln, si) => {
          const v = d.parts[ln] || 0; if (v <= 0) return null;
          const yTop = y(acc + v), hgt = Math.max(0, y(acc) - y(acc + v));
          acc += v;
          return React.createElement('rect', { key: si, x: cx - bw / 2, y: yTop, width: bw, height: hgt, fill: colors[ln] || '#2d5bd7' });
        });
        return React.createElement('g', { key: i },
          segs,
          d.total > 0 && React.createElement('text', { x: cx, y: y(d.total) - 4, textAnchor: 'middle', fontSize: 8.5, fill: '#586173', fontWeight: 600 }, d.total >= 1000 ? (d.total / 1000).toFixed(1) + 'k' : d.total),
          React.createElement('text', { x: cx, y: H - 9, textAnchor: 'middle', fontSize: 8.5, fill: '#8a94a6' }, d.label));
      }));
  }

  window.PG_CHARTS = { PlanActualChart, ColumnChart, LineChart, Gauge, HBars, Donut, StackedColumns, fmt };
})();
