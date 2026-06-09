/* ============================================================
   UI kit — icons, badges, cards, table, modal, toasts, forms
   Exposed on window for all module scripts.
   ============================================================ */
(function () {
  const { useI18n } = window.PG_I18N;

  /* ---------- Icons (stroke, 24 viewBox) ---------- */
  const P = {
    dashboard: 'M4 13h6V4H4v9zm0 7h6v-5H4v5zm10 0h6V11h-6v9zm0-16v5h6V4h-6z',
    orders: 'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m-6 9h6m-6 4h4',
    flow: 'M5 3v4M3 5h4M6 17v4m-2-2h4M13 3l1.9 5.1L20 10l-5.1 1.9L13 17l-1.9-5.1L6 10l5.1-1.9L13 3z',
    schedule: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
    designer: 'M5 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM19 17a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM5 7v6a4 4 0 0 0 4 4h8M14 3h5v5',
    shopfloor: 'M2 20h20M4 20V8l5 3V8l5 3V8l5 3v9M9 20v-4h4v4',
    receive: 'M3 7l9-4 9 4-9 4-9-4zM3 7v10l9 4 9-4V7M12 11v10',
    issue: 'M21 16V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l3-1.7M16 12h6m-3-3l3 3-3 3',
    fg: 'M16 3h5v5M21 3l-7 7M8 21H3v-5M3 21l7-7M3 8V3h5M3 3l7 7M21 16v5h-5M21 21l-7-7',
    warehouse: 'M3 21V8l9-5 9 5v13M3 21h18M7 21v-8h10v8',
    items: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-14L4 7m8 4v10m0-10L4 7v10l8 4',
    bom: 'M12 2l3 3-3 3-3-3 3-3zM6 13l3 3-3 3-3-3 3-3zm12 0l3 3-3 3-3-3 3-3zM12 5v5M9 16h6M12 10v3',
    users: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm14 10v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
    search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm10 2l-4.3-4.3',
    bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0',
    plus: 'M12 5v14M5 12h14',
    edit: 'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z',
    trash: 'M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6',
    x: 'M18 6L6 18M6 6l12 12',
    check: 'M20 6L9 17l-5-5',
    checkcircle: 'M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4L12 14.01l-3-3',
    alert: 'M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4m0 4h.01',
    filter: 'M22 3H2l8 9.5V19l4 2v-8.5L22 3z',
    export: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
    chevR: 'M9 18l6-6-6-6',
    chevD: 'M6 9l6 6 6-6',
    chevL: 'M15 18l-6-6 6-6',
    menu: 'M3 12h18M3 6h18M3 18h18',
    clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2',
    drag: 'M9 5h.01M9 12h.01M9 19h.01M15 5h.01M15 12h.01M15 19h.01',
    box: 'M21 16V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16zM3.3 7L12 12l8.7-5M12 22V12',
    scale: 'M12 3v18M5 21h14M7 7l-4 7h8L7 7zm10 0l-4 7h8l-4-7zM7 7l5-2 5 2',
    arrowR: 'M5 12h14M12 5l7 7-7 7',
    lock: 'M5 11h14a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2zM7 11V7a5 5 0 0 1 10 0v4',
    user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
    logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
    trendUp: 'M23 6l-9.5 9.5-5-5L1 18M17 6h6v6',
    trendDown: 'M23 18l-9.5-9.5-5 5L1 6M17 18h6v-6',
    factory: 'M2 20h20M4 20V8l5 3V8l5 3V8l5 3v9M9 20v-4h4v4',
    globe: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20z',
    dots: 'M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM12 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm0 14a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
    play: 'M5 3l14 9-14 9V3z',
    layers: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
    calc: 'M9 7h6M9 11h.01M13 11h.01M9 15h.01M13 15h.01M5 3h14a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z',
  };

  function Icon({ name, size = 18, className = '', style, strokeWidth = 1.8 }) {
    const dd = P[name] || P.box;
    return React.createElement('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
      stroke: 'currentColor', strokeWidth, strokeLinecap: 'round', strokeLinejoin: 'round', className, style },
      React.createElement('path', { d: dd }));
  }

  /* ---------- Status / Priority badges ---------- */
  const STATUS_COLOR = {
    request: 'var(--st-request)', waiting: 'var(--st-waiting)', reserved: 'var(--st-reserved)',
    scheduled: 'var(--st-scheduled)', completed: 'var(--st-completed)', inprogress: 'var(--primary)',
    pending: 'var(--st-pending)', accepted: 'var(--st-completed)',
  };
  function StatusBadge({ status }) {
    const { t } = useI18n();
    const c = STATUS_COLOR[status] || 'var(--text-muted)';
    return React.createElement('span', { className: 'badge', style: { color: c, background: 'color-mix(in srgb, ' + c + ' 12%, white)' } },
      React.createElement('span', { className: 'dot' }), t('status.' + status));
  }
  const PRI_COLOR = { high: 'var(--pri-high)', med: 'var(--pri-med)', low: 'var(--pri-low)' };
  function PriorityBadge({ p }) {
    const { t } = useI18n();
    const c = PRI_COLOR[p];
    return React.createElement('span', { className: 'badge', style: { color: c, background: 'color-mix(in srgb, ' + c + ' 12%, white)' } },
      React.createElement('span', { className: 'dot' }), t('pri.' + (p === 'med' ? 'med' : p)));
  }

  /* ---------- Card ---------- */
  function Card({ title, sub, actions, children, className = '', bodyClass = '', noBody, icon, style }) {
    return React.createElement('div', { className: 'card ' + className, style },
      (title || actions) && React.createElement('div', { className: 'card-h' },
        icon && React.createElement(Icon, { name: icon, size: 16, style: { color: 'var(--primary)' } }),
        title && React.createElement('div', null,
          React.createElement('h3', null, title),
          sub && React.createElement('div', { className: 'sub' }, sub)),
        actions && React.createElement('div', { className: 'card-h-actions' }, actions)),
      noBody ? children : React.createElement('div', { className: 'card-b ' + bodyClass }, children));
  }

  /* ---------- Stat ---------- */
  function Stat({ label, value, unit, accent = 'var(--primary)', icon, foot, trend }) {
    return React.createElement('div', { className: 'stat' },
      React.createElement('div', { className: 'stat-accent', style: { background: accent } }),
      React.createElement('div', { className: 'stat-label' }, icon && React.createElement(Icon, { name: icon, size: 13 }), label),
      React.createElement('div', { className: 'stat-val' }, value, unit && React.createElement('small', null, ' ' + unit)),
      foot && React.createElement('div', { className: 'stat-foot ' + (trend === 'up' ? 'trend-up' : trend === 'down' ? 'trend-down' : 'faint') },
        trend && React.createElement(Icon, { name: trend === 'up' ? 'trendUp' : 'trendDown', size: 12 }), foot));
  }

  /* ---------- Progress ---------- */
  function Progress({ value, color = 'var(--primary)', height = 7 }) {
    return React.createElement('div', { className: 'progress', style: { height } },
      React.createElement('i', { style: { width: Math.min(100, Math.max(0, value)) + '%', background: color } }));
  }

  /* ---------- Modal ---------- */
  function Modal({ title, onClose, children, footer, width }) {
    React.useEffect(() => {
      const h = (e) => { if (e.key === 'Escape') onClose && onClose(); };
      window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
    }, [onClose]);
    return React.createElement('div', { className: 'modal-scrim', onMouseDown: (e) => { if (e.target === e.currentTarget) onClose && onClose(); } },
      React.createElement('div', { className: 'modal', style: width ? { width } : null },
        React.createElement('div', { className: 'modal-h' },
          React.createElement('h3', null, title),
          React.createElement('button', { className: 'x-btn', onClick: onClose }, React.createElement(Icon, { name: 'x', size: 18 }))),
        React.createElement('div', { className: 'modal-b' }, children),
        footer && React.createElement('div', { className: 'modal-f' }, footer)));
  }

  /* ---------- Field / Select ---------- */
  function Field({ label, required, children, hint }) {
    return React.createElement('div', { className: 'field' },
      label && React.createElement('label', null, label, required && React.createElement('span', { className: 'req' }, ' *')),
      children,
      hint && React.createElement('div', { className: 'faint', style: { fontSize: 10.5 } }, hint));
  }

  /* ---------- Toast host ---------- */
  const ToastCtx = React.createContext(() => {});
  function ToastProvider({ children }) {
    const [list, setList] = React.useState([]);
    const push = React.useCallback((msg, kind = 'ok') => {
      const id = Math.random().toString(36).slice(2);
      setList(l => [...l, { id, msg, kind }]);
      setTimeout(() => setList(l => l.filter(x => x.id !== id)), 2600);
    }, []);
    return React.createElement(ToastCtx.Provider, { value: push },
      children,
      React.createElement('div', { className: 'toast-wrap' },
        list.map(tt => React.createElement('div', { key: tt.id, className: 'toast ' + tt.kind },
          React.createElement(Icon, { name: tt.kind === 'warn' ? 'alert' : 'checkcircle', size: 17, className: 't-ic' }),
          React.createElement('span', null, tt.msg)))));
  }
  function useToast() { return React.useContext(ToastCtx); }

  /* ---------- Page head ---------- */
  function PageHead({ title, sub, actions }) {
    return React.createElement('div', { className: 'page-head' },
      React.createElement('div', null,
        React.createElement('h1', null, title),
        sub && React.createElement('p', null, sub)),
      actions && React.createElement('div', { style: { marginLeft: 'auto', display: 'flex', gap: 8 } }, actions));
  }

  function fmt(n) { return (n == null ? 0 : n).toLocaleString('en-US'); }

  // Format an ISO date (YYYY-MM-DD) or Date as DD/MM/YYYY
  function fmtDate(d) {
    if (!d) return '';
    let dt = d;
    if (typeof d === 'string') {
      const m = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (m) return m[3] + '/' + m[2] + '/' + m[1];
      dt = new Date(d);
    }
    if (dt instanceof Date && !isNaN(dt)) {
      const p = (n) => String(n).padStart(2, '0');
      return p(dt.getDate()) + '/' + p(dt.getMonth() + 1) + '/' + dt.getFullYear();
    }
    return String(d);
  }

  // Parse a DD/MM/YYYY string to ISO YYYY-MM-DD (returns '' if incomplete/invalid)
  function parseDMY(s) {
    const m = (s || '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!m) return '';
    const dd = +m[1], mm = +m[2], yy = +m[3];
    if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return '';
    return yy + '-' + String(mm).padStart(2, '0') + '-' + String(dd).padStart(2, '0');
  }

  // Date input that DISPLAYS DD/MM/YYYY but stores ISO. value/onChange use ISO strings.
  function DateField({ value, onChange, className, style, placeholder }) {
    const [text, setText] = React.useState(fmtDate(value));
    React.useEffect(() => { setText(fmtDate(value)); }, [value]);
    const onText = (v) => { setText(v); const iso = parseDMY(v); if (iso) onChange(iso); else if (!v) onChange(''); };
    return React.createElement('div', { style: { position: 'relative', ...(style || {}) } },
      React.createElement('input', { className: (className || 'input') + ' mono', value: text, placeholder: placeholder || 'DD/MM/YYYY',
        onChange: (e) => onText(e.target.value), style: { paddingRight: 34, width: '100%' } }),
      React.createElement('span', { style: { position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)', pointerEvents: 'none', display: 'grid', placeItems: 'center' } },
        React.createElement(Icon, { name: 'schedule', size: 15 })),
      // transparent native date input overlaying the icon — clicking it opens the OS calendar
      React.createElement('input', { type: 'date', value: value || '', onChange: (e) => onChange(e.target.value),
        title: '', 'aria-label': 'calendar',
        style: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 36, opacity: 0, cursor: 'pointer', border: 'none', padding: 0, background: 'transparent' } }));
  }

  window.PG_UI = { Icon, StatusBadge, PriorityBadge, Card, Stat, Progress, Modal, Field,
    ToastProvider, useToast, PageHead, fmt, fmtDate, parseDMY, DateField, STATUS_COLOR };
})();
