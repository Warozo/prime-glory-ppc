/* ============================================================
   App shell — login · sidebar · topbar · routing · tweaks
   ============================================================ */
(function () {
  const { tr, I18nContext } = window.PG_I18N;
  const { Icon, ToastProvider, useToast } = window.PG_UI;
  const D = window.PG_DATA;

  const NAV = [
    { sec: 'navsec.overview', items: [ { k: 'dashboard', ic: 'dashboard' } ] },
    { sec: 'navsec.planning', items: [ { k: 'orders', ic: 'orders' }, { k: 'flow', ic: 'flow', badge: 'waiting' }, { k: 'schedule', ic: 'schedule' } ] },
    { sec: 'navsec.production', items: [ { k: 'designer', ic: 'designer' }, { k: 'shopfloor', ic: 'shopfloor' }, { k: 'qa', ic: 'checkcircle' } ] },
    { sec: 'navsec.warehouse', items: [ { k: 'receiving', ic: 'receive' }, { k: 'issue', ic: 'issue' }, { k: 'fgreceiving', ic: 'fg' }, { k: 'fgsales', ic: 'export' }, { k: 'stock', ic: 'warehouse' } ] },
    { sec: 'navsec.master', items: [ { k: 'items', ic: 'items' }, { k: 'bom', ic: 'bom' }, { k: 'partners', ic: 'users' }, { k: 'settings', ic: 'factory' } ] },
    { sec: 'navsec.admin', items: [ { k: 'users', ic: 'users' } ] },
  ];
  const NAV_LABEL = { dashboard: 'nav.dashboard', orders: 'nav.orders', flow: 'nav.flow', schedule: 'nav.schedule', designer: 'nav.designer', shopfloor: 'nav.shopfloor', qa: 'nav.qa', receiving: 'nav.receiving', issue: 'nav.issue', fgreceiving: 'nav.fgreceiving', fgsales: 'nav.fgsales', stock: 'nav.stock', items: 'nav.items', bom: 'nav.bom', partners: 'nav.partners', settings: 'nav.settings', users: 'nav.users' };

  // Everything except User Management — shared by PPC and Management
  const ALL_BUT_USERS = ['dashboard', 'orders', 'flow', 'schedule', 'designer', 'shopfloor', 'qa', 'receiving', 'issue', 'fgreceiving', 'fgsales', 'stock', 'items', 'bom', 'partners', 'settings'];
  const PERMS = {
    admin: 'all',                                                       // เห็นทั้งหมด
    ppc: ALL_BUT_USERS,                                                 // ทั้งหมด ยกเว้นจัดการผู้ใช้งาน
    management: ALL_BUT_USERS,                                          // ทั้งหมด ยกเว้นจัดการผู้ใช้งาน
    warehouse: ['receiving', 'issue', 'fgreceiving', 'fgsales', 'stock'], // เฉพาะคลังสินค้า
    production: ['dashboard', 'schedule', 'designer', 'shopfloor', 'qa'], // เฉพาะการผลิต + คุณภาพ
  };
  function allowed(role, key) { const p = PERMS[role]; return p === 'all' || p.includes(key); }
  // First page a role is allowed to see — used as its landing/default route
  function firstAllowed(role) { const p = PERMS[role]; return p === 'all' ? 'dashboard' : (p[0] || 'dashboard'); }

  const ROUTES = {
    dashboard: (p) => React.createElement(window.PG_Dashboard, p),
    orders: (p) => React.createElement(window.PG_CustomerOrders, p),
    flow: (p) => React.createElement(window.PG_OrderFlow, p),
    schedule: (p) => React.createElement(window.PG_Schedule, p),
    designer: (p) => React.createElement(window.PG_Designer, p),
    shopfloor: (p) => React.createElement(window.PG_ShopFloor, p),
    qa: (p) => React.createElement(window.PG_QA, p),
    receiving: (p) => React.createElement(window.PG_Receiving, p),
    issue: (p) => React.createElement(window.PG_Issue, p),
    fgreceiving: (p) => React.createElement(window.PG_FGReceiving, p),
    fgsales: (p) => React.createElement(window.PG_FGSales, p),
    stock: (p) => React.createElement(window.PG_Stock, p),
    items: (p) => React.createElement(window.PG_ItemMaster, p),
    bom: (p) => React.createElement(window.PG_BOM, p),
    partners: (p) => React.createElement(window.PG_Partners, p),
    settings: (p) => React.createElement(window.PG_Settings, p),
    users: (p) => React.createElement(window.PG_Users, p),
  };

  /* ---------------- Login ---------------- */
  function Login({ lang, setLang, onLogin }) {
    const t = (k) => tr(lang, k);
    const [u, setU] = React.useState('admin');
    const [p, setP] = React.useState('');
    const [err, setErr] = React.useState('');
    const [busy, setBusy] = React.useState(false);
    const submit = async () => {
      if (busy) return;
      setBusy(true); setErr('');
      // Authenticate against the live shared snapshot (so users added later
      // via User Management can sign in), falling back to the seed offline.
      let users;
      try { const st = await window.PG_DATA.loadState(); users = (st && st.users) || []; }
      catch (e) { users = window.PG_DATA.buildState().users; }
      setBusy(false);
      const found = users.find(x => x.username === u.trim() && x.password === p);
      if (!found) { setErr(lang === 'th' ? 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' : 'Invalid username or password'); return; }
      if (found.status !== 'A') { setErr(lang === 'th' ? 'บัญชีถูกปิดใช้งาน' : 'Account is inactive'); return; }
      onLogin(found.role);
    };
    return React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', height: '100%' } },
      React.createElement('div', { style: { background: 'linear-gradient(155deg,rgba(27,46,77,.78),rgba(15,28,49,.86)), url(app/login-bg.png) center/cover no-repeat', backgroundColor: '#0f1c31', color: '#fff', padding: '56px 60px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', overflow: 'hidden' } },
        React.createElement('div', { style: { position: 'absolute', inset: 0, opacity: .06, backgroundImage: 'repeating-linear-gradient(45deg,#fff 0 1px,transparent 1px 22px)' } }),
        React.createElement('div', { className: 'row', style: { gap: 12, position: 'relative' } },
          React.createElement('div', { className: 'sb-logo', style: { width: 38, height: 38, fontSize: 18 } }, 'PG'),
          React.createElement('div', null, React.createElement('div', { style: { fontWeight: 700, fontSize: 18 } }, 'Prime Glory'),
            React.createElement('div', { style: { fontSize: 11, color: '#aebbcf' } }, t('app.tagline')))),
        React.createElement('div', { style: { position: 'relative' } },
          React.createElement('div', { style: { fontSize: 27, fontWeight: 700, lineHeight: 1.3, letterSpacing: '-.5px' } }, lang === 'th' ? 'วางแผน ผลิต ควบคุม' : 'Plan. Produce. Control.'),
          React.createElement('div', { style: { fontSize: 13.5, color: '#aebbcf', marginTop: 12, lineHeight: 1.6, maxWidth: 380 } }, lang === 'th' ? 'ระบบ PPC สำหรับโรงงานเครื่องสำอาง — รวมการวางแผนการผลิต คลังวัตถุดิบ ติดตามหน้างาน และคลังสินค้าไว้ในที่เดียว' : 'A unified PPC platform for cosmetics manufacturing — planning, materials, shop-floor and warehouse in one place.')),
        React.createElement('div', { style: { position: 'relative', fontSize: 11, color: '#6f7f99' } }, '© 2026 Prime Glory Manufacturing')),
      React.createElement('div', { style: { display: 'grid', placeItems: 'center', background: 'var(--surface)' } },
        React.createElement('div', { style: { width: 340 } },
          React.createElement('div', { className: 'row', style: { justifyContent: 'space-between', marginBottom: 28 } },
            React.createElement('div', null, React.createElement('h1', { style: { margin: 0, fontSize: 22 } }, t('btn.login')),
              React.createElement('div', { className: 'faint', style: { fontSize: 12, marginTop: 3 } }, lang === 'th' ? 'เข้าสู่ระบบเพื่อดำเนินการต่อ' : 'Sign in to continue')),
            React.createElement(LangToggle, { lang, setLang })),
          React.createElement('div', { className: 'field', style: { marginBottom: 14 } },
            React.createElement('label', null, t('f.username')),
            React.createElement('div', { className: 'row', style: { gap: 0 } }, React.createElement('input', { className: 'input', value: u, onChange: e => setU(e.target.value) }))),
          React.createElement('div', { className: 'field', style: { marginBottom: err ? 10 : 20 } },
            React.createElement('label', null, t('f.password')),
            React.createElement('input', { className: 'input', type: 'password', value: p, onChange: e => { setP(e.target.value); setErr(''); }, onKeyDown: e => { if (e.key === 'Enter') submit(); } })),
          err && React.createElement('div', { style: { fontSize: 11.5, color: 'var(--danger)', marginBottom: 14, display: 'flex', gap: 6, alignItems: 'center' } }, React.createElement(Icon, { name: 'alert', size: 13 }), err),
          React.createElement('button', { className: 'btn btn-pri', style: { width: '100%', height: 38 }, disabled: busy, onClick: submit }, busy ? (lang === 'th' ? 'กำลังตรวจสอบ…' : 'Checking…') : t('btn.login'), React.createElement(Icon, { name: 'arrowR', size: 15 })))));
  }

  function LangToggle({ lang, setLang }) {
    return React.createElement('div', { className: 'lang-toggle' },
      React.createElement('button', { className: lang === 'th' ? 'on' : '', onClick: () => setLang('th') }, 'ไทย'),
      React.createElement('button', { className: lang === 'en' ? 'on' : '', onClick: () => setLang('en') }, 'EN'));
  }

  /* ---------------- Role switcher ---------------- */
  function RoleSwitch({ role, setRole, lang }) {
    const t = (k) => tr(lang, k);
    const initials = { admin: 'SA', ppc: 'SP', warehouse: 'NW', production: 'AS', management: 'PK' };
    return React.createElement('div', { className: 'role-pick', style: { position: 'relative' } },
      React.createElement('div', { className: 'role-avatar' }, initials[role]),
      React.createElement('div', { className: 'role-meta' },
        React.createElement('div', { className: 'role-name' }, t('role.' + role).replace(/\s*\(.*\)/, ''))));
  }

  /* ---------------- Shell ---------------- */
  function Shell({ tweaks, setTweak, lang, setLang, onLogout }) {
    const [route, setRoute] = React.useState(() => firstAllowed(tweaks.role));
    const [state, setStateRaw] = React.useState(null);
    const t = (k, v) => tr(lang, k, v);
    const role = tweaks.role;

    // setState passed to modules: update React state AND persist the snapshot.
    const setState = React.useCallback((updater) => {
      setStateRaw(prev => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        D.saveState(next);
        return next;
      });
    }, []);

    // Load shared snapshot from Supabase, then subscribe to remote changes
    // (other tabs / other users) and apply them locally without re-saving.
    React.useEffect(() => {
      let mounted = true;
      D.loadState().then(s => { if (mounted) setStateRaw(s); });
      const unsub = D.subscribe(remote => { if (mounted) setStateRaw(remote); });
      return () => { mounted = false; unsub(); };
    }, []);

    React.useEffect(() => { if (!allowed(role, route)) setRoute(firstAllowed(role)); }, [role]);

    const go = (r) => { if (allowed(role, r)) setRoute(r); };
    React.useEffect(() => { window.__pgGo = go; });

    if (!state) return React.createElement('div', { style: { display: 'grid', placeItems: 'center', height: '100vh', background: 'var(--bg)', color: 'var(--text-muted)', fontSize: 14 } },
      lang === 'th' ? 'กำลังโหลดข้อมูลจากเซิร์ฟเวอร์…' : 'Loading data from server…');

    // Delete actions are limited to admin and PPC across all modules
    const canDelete = role === 'admin' || role === 'ppc';
    const props = { state, setState, go, canDelete, role };
    const waitingCount = (state.orders || []).filter(o => o.status === 'waiting').length;

    const curLabel = t(NAV_LABEL[route] || 'nav.dashboard');
    const curSec = (NAV.find(s => s.items.some(i => i.k === route)) || {}).sec;

    return React.createElement('div', { className: 'app' },
      // Sidebar
      React.createElement('aside', { className: 'sidebar' },
        React.createElement('div', { className: 'sb-brand' },
          React.createElement('div', { className: 'sb-logo' }, 'PG'),
          React.createElement('div', { className: 'sb-brand-text' },
            React.createElement('div', { className: 'sb-brand-name' }, 'Prime Glory'),
            React.createElement('div', { className: 'sb-brand-sub' }, lang === 'th' ? 'ระบบ PPC' : 'PPC System'))),
        React.createElement('div', { className: 'sb-scroll' },
          NAV.map(sec => {
            const items = sec.items.filter(i => allowed(role, i.k));
            if (!items.length) return null;
            return React.createElement('div', { key: sec.sec },
              React.createElement('div', { className: 'sb-section-label' }, t(sec.sec)),
              items.map(it => React.createElement('button', { key: it.k, className: 'nav-item' + (route === it.k ? ' active' : ''), title: t(NAV_LABEL[it.k]), onClick: () => go(it.k) },
                React.createElement(Icon, { name: it.ic, size: 17, className: 'nav-ic' }),
                React.createElement('span', { className: 'nav-label' }, t(NAV_LABEL[it.k])),
                it.badge === 'waiting' && waitingCount > 0 && React.createElement('span', { className: 'nav-badge alert' }, waitingCount))));
          })),
        // collapse/expand toggle pinned at the bottom of the sidebar
        React.createElement('button', { className: 'sb-collapse', title: lang === 'th' ? 'พับ/กางเมนู' : 'Collapse / expand', onClick: () => setTweak('sidebar', tweaks.sidebar === 'collapsed' ? 'expanded' : 'collapsed') },
          React.createElement(Icon, { name: tweaks.sidebar === 'collapsed' ? 'chevR' : 'chevL', size: 16, className: 'nav-ic' }),
          React.createElement('span', { className: 'nav-label' }, lang === 'th' ? 'พับเมนู' : 'Collapse'))),
      // Main
      React.createElement('div', { className: 'main' },
        React.createElement('header', { className: 'topbar' },
          React.createElement('button', { className: 'tb-collapse', onClick: () => setTweak('sidebar', tweaks.sidebar === 'collapsed' ? 'expanded' : 'collapsed') },
            React.createElement(Icon, { name: 'menu', size: 17 })),
          React.createElement('div', { className: 'tb-crumbs' },
            curSec && React.createElement('span', null, t(curSec)),
            curSec && React.createElement(Icon, { name: 'chevR', size: 13 }),
            React.createElement('span', { className: 'tb-crumb-cur' }, curLabel)),
          React.createElement('div', { className: 'tb-spacer' }),
          React.createElement('div', { className: 'tb-search' }, React.createElement(Icon, { name: 'search', size: 15 }), React.createElement('input', { placeholder: t('app.search') })),
          React.createElement(LangToggle, { lang, setLang }),
          React.createElement('button', { className: 'tb-icon-btn' }, React.createElement(Icon, { name: 'bell', size: 16 }), React.createElement('span', { className: 'tb-dot' })),
          React.createElement('button', { className: 'tb-icon-btn', title: t('btn.login'), onClick: onLogout }, React.createElement(Icon, { name: 'logout', size: 16 })),
          React.createElement(RoleSwitch, { role, setRole: (r) => setTweak('role', r), lang })),
        React.createElement('main', { className: 'content' },
          (ROUTES[allowed(role, route) ? route : firstAllowed(role)] || ROUTES.dashboard)(props))));
  }

  /* ---------------- Root ---------------- */
  const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{ "role": "ppc", "density": "compact", "sidebar": "expanded" }/*EDITMODE-END*/;

  function Root() {
    const { useTweaks, TweaksPanel, TweakSection, TweakRadio } = window;
    const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);
    const [lang, setLangRaw] = React.useState(() => localStorage.getItem('pg_lang') || 'th');
    const [auth, setAuth] = React.useState(() => localStorage.getItem('pg_auth') === '1');
    const setLang = (l) => { setLangRaw(l); localStorage.setItem('pg_lang', l); };

    React.useEffect(() => { document.body.setAttribute('data-density', tweaks.density); }, [tweaks.density]);
    React.useEffect(() => { document.body.setAttribute('data-sidebar', tweaks.sidebar); }, [tweaks.sidebar]);
    React.useEffect(() => { document.body.setAttribute('lang', lang); }, [lang]);

    const t = (k, v) => tr(lang, k, v);
    const login = (role) => { setAuth(true); localStorage.setItem('pg_auth', '1'); if (role) { setTweak('role', role); localStorage.setItem('pg_role', role); } };
    const logout = () => { setAuth(false); localStorage.removeItem('pg_auth'); };

    return React.createElement(I18nContext.Provider, { value: { lang, t } },
      React.createElement(ToastProvider, null,
        auth ? React.createElement(Shell, { tweaks, setTweak, lang, setLang, onLogout: logout })
             : React.createElement(Login, { lang, setLang, onLogin: login }),
        React.createElement(TweaksPanel, { title: 'Tweaks' },
          React.createElement(TweakSection, { label: lang === 'th' ? 'บทบาทผู้ใช้' : 'Active role' }),
          React.createElement(TweakRadio, { label: lang === 'th' ? 'บทบาท' : 'Role', value: tweaks.role,
            options: ['admin', 'ppc', 'warehouse', 'production', 'management'], onChange: (v) => setTweak('role', v) }),
          React.createElement(TweakSection, { label: lang === 'th' ? 'การแสดงผล' : 'Display' }),
          React.createElement(TweakRadio, { label: lang === 'th' ? 'ความหนาแน่น' : 'Density', value: tweaks.density,
            options: ['compact', 'comfortable'], onChange: (v) => setTweak('density', v) }),
          React.createElement(TweakRadio, { label: lang === 'th' ? 'แถบเมนู' : 'Sidebar', value: tweaks.sidebar,
            options: ['expanded', 'collapsed'], onChange: (v) => setTweak('sidebar', v) }))));
  }

  window.PG_Root = Root;
})();
