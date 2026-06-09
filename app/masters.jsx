/* ============================================================
   Modules: Item Master · BOM · Customer Orders · Users
   ============================================================ */
(function () {
  const { useI18n } = window.PG_I18N;
  const { PageHead, Icon, fmt, fmtDate, DateField, Modal, Field, useToast, StatusBadge, PriorityBadge } = window.PG_UI;
  const D = window.PG_DATA;

  /* ---------------- Item Master ---------------- */
  function ItemMaster({ state, setState }) {
    const { t, lang } = useI18n();
    const toast = useToast();
    const [tab, setTab] = React.useState('rm');
    const [modal, setModal] = React.useState(null); // { mode:'add' } | { mode:'edit', item }
    const items = tab === 'rm' ? state.raw : state.fg;
    const key = tab === 'rm' ? 'raw' : 'fg';

    function save(f) {
      if (modal.mode === 'add' && items.some(x => x.code === f.code.trim())) {
        toast(lang === 'th' ? 'รหัสนี้มีอยู่แล้ว' : 'Code already exists', 'warn'); return;
      }
      setState(prev => {
        const list = prev[key].slice();
        const rec = { name: f.name || f.nameTh, nameTh: f.nameTh || f.name, unit: f.unit, cat: f.cat };
        if (modal.mode === 'edit') {
          const i = list.findIndex(x => x.code === modal.item.code);
          if (i !== -1) list[i] = { ...list[i], ...rec };
        } else {
          list.push({ code: f.code.trim(), status: 'A', ...rec });
        }
        return { ...prev, [key]: list };
      });
      toast(t('toast.saved')); setModal(null);
    }

    function del(it) {
      if (tab === 'rm') {
        const usedBom = Object.keys(state.boms).filter(fg => state.boms[fg].lines.some(l => l.rm === it.code));
        if (usedBom.length) { toast((lang === 'th' ? 'ลบไม่ได้ — ใช้ใน BOM: ' : 'Cannot delete — used in BOM: ') + usedBom.join(', '), 'warn'); return; }
        if (state.lots.some(l => l.rm === it.code)) { toast(lang === 'th' ? 'ลบไม่ได้ — ยังมีล็อตคงคลังอยู่' : 'Cannot delete — stock lots exist', 'warn'); return; }
      } else {
        if ((state.orders || []).some(o => o.fg === it.code)) { toast(lang === 'th' ? 'ลบไม่ได้ — มีคำสั่งซื้ออ้างอิง' : 'Cannot delete — referenced by orders', 'warn'); return; }
      }
      if (!window.confirm((lang === 'th' ? 'ยืนยันลบ ' : 'Delete ') + it.code + ' · ' + (lang === 'th' ? it.nameTh : it.name) + ' ?')) return;
      setState(prev => {
        if (tab === 'fg') { const boms = { ...prev.boms }; delete boms[it.code]; return { ...prev, fg: prev.fg.filter(x => x.code !== it.code), boms }; }
        return { ...prev, raw: prev.raw.filter(x => x.code !== it.code) };
      });
      toast(lang === 'th' ? 'ลบเรียบร้อย' : 'Deleted', 'warn');
    }

    return React.createElement('div', null,
      React.createElement(PageHead, { title: t('nav.items'), sub: t('navsec.master'),
        actions: React.createElement('div', { className: 'row', style: { gap: 10 } },
          React.createElement('div', { className: 'pill-tabs' },
            React.createElement('button', { className: tab === 'rm' ? 'on' : '', onClick: () => setTab('rm') }, t('rawmat')),
            React.createElement('button', { className: tab === 'fg' ? 'on' : '', onClick: () => setTab('fg') }, t('finished'))),
          React.createElement('button', { className: 'btn btn-pri', onClick: () => setModal({ mode: 'add' }) }, React.createElement(Icon, { name: 'plus', size: 15 }), t('btn.new'))) }),
      React.createElement('div', { className: 'card' },
        React.createElement('table', { className: 'tbl' },
          React.createElement('thead', null, React.createElement('tr', null,
            React.createElement('th', null, tab === 'rm' ? 'RM ' + t('f.code') : 'FG ' + t('f.code')),
            React.createElement('th', null, t('f.name')), React.createElement('th', null, t('f.unit')), React.createElement('th', null, t('f.category')), React.createElement('th', null, t('f.status')),
            React.createElement('th', { style: { width: 90 } }, ''))),
          React.createElement('tbody', null, items.length === 0
            ? React.createElement('tr', null, React.createElement('td', { colSpan: 6, className: 'empty' }, t('tbl.noresults')))
            : items.map(it => React.createElement('tr', { key: it.code },
            React.createElement('td', { className: 'mono', style: { fontWeight: 600, color: 'var(--primary)' } }, it.code),
            React.createElement('td', null, React.createElement('div', { style: { fontWeight: 600 } }, lang === 'th' ? it.nameTh : it.name), React.createElement('div', { className: 'faint', style: { fontSize: 10.5 } }, lang === 'th' ? it.name : it.nameTh)),
            React.createElement('td', { className: 'mono' }, it.unit),
            React.createElement('td', null, React.createElement('span', { className: 'badge badge-soft' }, it.cat)),
            React.createElement('td', null, React.createElement('span', { className: 'badge', style: { color: it.status === 'A' ? 'var(--ok)' : 'var(--text-muted)', background: it.status === 'A' ? 'var(--ok-tint)' : 'var(--surface-3)' } }, it.status === 'A' ? t('f.active') : t('f.inactive'))),
            React.createElement('td', { className: 'num' }, React.createElement('div', { className: 'row', style: { gap: 4, justifyContent: 'flex-end' } },
              React.createElement('button', { className: 'btn btn-sm btn-ghost btn-icon', title: t('btn.edit'), onClick: () => setModal({ mode: 'edit', item: it }) }, React.createElement(Icon, { name: 'edit', size: 13 })),
              React.createElement('button', { className: 'btn btn-sm btn-ghost btn-icon', title: t('btn.delete'), onClick: () => del(it) }, React.createElement(Icon, { name: 'trash', size: 13, style: { color: 'var(--danger)' } })))))))) ),
      modal && React.createElement(ItemModal, { tab, t, lang, edit: modal.mode === 'edit' ? modal.item : null, onClose: () => setModal(null), onSubmit: save }));
  }

  function ItemModal({ tab, t, lang, edit, onClose, onSubmit }) {
    const [f, setF] = React.useState(edit
      ? { code: edit.code, name: edit.name, nameTh: edit.nameTh, unit: edit.unit, cat: edit.cat }
      : { code: '', name: '', nameTh: '', unit: 'pcs', cat: '' });
    const set = (k, v) => setF(p => ({ ...p, [k]: v }));
    return React.createElement(Modal, { title: (edit ? t('btn.edit') : t('btn.new')) + ' · ' + (tab === 'rm' ? t('rawmat') : t('finished')), onClose, width: 480,
      footer: React.createElement(React.Fragment, null, React.createElement('button', { className: 'btn', onClick: onClose }, t('btn.cancel')),
        React.createElement('button', { className: 'btn btn-pri', disabled: !f.code || (!f.name && !f.nameTh), onClick: () => onSubmit(f) }, t('btn.save'))) },
      React.createElement('div', { className: 'grid g-2', style: { gap: 12 } },
        React.createElement(Field, { label: t('f.code'), required: true }, React.createElement('input', { className: 'input mono', value: f.code, disabled: !!edit, onChange: e => set('code', e.target.value), placeholder: tab === 'rm' ? 'RM014' : 'FG006' })),
        React.createElement(Field, { label: t('f.unit'), required: true }, React.createElement('select', { className: 'select', value: f.unit, onChange: e => set('unit', e.target.value) }, ['pcs', 'kg', 'g', 'L', 'ml'].map(u => React.createElement('option', { key: u }, u)))),
        React.createElement('div', { style: { gridColumn: 'span 2' } }, React.createElement(Field, { label: (lang === 'th' ? 'ชื่อ (ไทย)' : 'Name (Thai)'), required: true }, React.createElement('input', { className: 'input', value: f.nameTh, onChange: e => set('nameTh', e.target.value) }))),
        React.createElement('div', { style: { gridColumn: 'span 2' } }, React.createElement(Field, { label: (lang === 'th' ? 'ชื่อ (อังกฤษ)' : 'Name (English)') }, React.createElement('input', { className: 'input', value: f.name, onChange: e => set('name', e.target.value) }))),
        React.createElement('div', { style: { gridColumn: 'span 2' } }, React.createElement(Field, { label: t('f.category') }, React.createElement('input', { className: 'input', value: f.cat, onChange: e => set('cat', e.target.value), placeholder: tab === 'rm' ? 'Active / Base / Packaging' : 'Serum / Foundation / Lip' })))));
  }

  /* ---------------- BOM Management ---------------- */
  function BOM({ state, setState }) {
    const { t, lang } = useI18n();
    const toast = useToast();
    const [fgCode, setFgCode] = React.useState(state.fg[0].code);
    const [calcQty, setCalcQty] = React.useState(10000);
    const [editLine, setEditLine] = React.useState(null); // { idx, rm, qty, unit } or { idx:-1 } for new
    const [fgEdit, setFgEdit] = React.useState(null);
    const bom = state.boms[fgCode];
    const req = fgCode ? D.bomRequirement(state, fgCode, calcQty) : [];

    // keep selection valid if the current FG gets deleted (here or in another tab)
    React.useEffect(() => { if (state.fg.length && !state.fg.some(f => f.code === fgCode)) setFgCode(state.fg[0].code); }, [state.fg.length]);

    function saveFg(form) {
      setState(prev => ({ ...prev, fg: prev.fg.map(x => x.code === fgEdit.code ? { ...x, name: form.name || form.nameTh, nameTh: form.nameTh || form.name, unit: form.unit, cat: form.cat } : x) }));
      toast(t('toast.saved')); setFgEdit(null);
    }
    function delFg(f) {
      if ((state.orders || []).some(o => o.fg === f.code)) { toast(lang === 'th' ? 'ลบไม่ได้ — มีคำสั่งซื้ออ้างอิง' : 'Cannot delete — referenced by orders', 'warn'); return; }
      if (!window.confirm((lang === 'th' ? 'ยืนยันลบสินค้า ' : 'Delete product ') + f.code + ' · ' + (lang === 'th' ? f.nameTh : f.name) + ' ?')) return;
      setState(prev => { const boms = { ...prev.boms }; delete boms[f.code]; return { ...prev, fg: prev.fg.filter(x => x.code !== f.code), boms }; });
      toast(lang === 'th' ? 'ลบเรียบร้อย' : 'Deleted', 'warn');
    }

    function ensureBom(prev) {
      const boms = { ...prev.boms };
      if (!boms[fgCode]) boms[fgCode] = { version: 'v1.0', lines: [] };
      else boms[fgCode] = { ...boms[fgCode], lines: boms[fgCode].lines.slice() };
      return boms;
    }
    function saveLine(line) {
      setState(prev => {
        const boms = ensureBom(prev);
        const lines = boms[fgCode].lines;
        if (line.idx === -1) lines.push({ rm: line.rm, qty: +line.qty, unit: line.unit });
        else lines[line.idx] = { rm: line.rm, qty: +line.qty, unit: line.unit };
        return { ...prev, boms };
      });
      toast(t('toast.bomsaved')); setEditLine(null);
    }
    function delLine(idx) {
      setState(prev => { const boms = ensureBom(prev); boms[fgCode].lines.splice(idx, 1); return { ...prev, boms }; });
      toast(t('toast.deleted'), 'warn');
    }
    function bumpVersion() {
      setState(prev => { const boms = ensureBom(prev); const v = boms[fgCode].version || 'v1.0';
        const n = parseFloat(v.replace(/[^0-9.]/g, '')) || 1.0; boms[fgCode] = { ...boms[fgCode], version: 'v' + (n + 0.1).toFixed(1) }; return { ...prev, boms }; });
      toast(t('toast.bomsaved'));
    }

    return React.createElement('div', null,
      React.createElement(PageHead, { title: t('nav.bom'), sub: t('navsec.master') }),
      React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '230px 1fr', gap: 14, alignItems: 'start' } },
        React.createElement('div', { className: 'card' },
          React.createElement('div', { className: 'card-h' }, React.createElement(Icon, { name: 'bom', size: 15, style: { color: 'var(--primary)' } }), React.createElement('h3', null, t('finished'))),
          React.createElement('div', { style: { padding: 8, display: 'flex', flexDirection: 'column', gap: 6 } },
            state.fg.length === 0
              ? React.createElement('div', { className: 'empty', style: { fontSize: 12 } }, t('tbl.noresults'))
              : state.fg.map(f => React.createElement('div', { key: f.code,
                style: { background: fgCode === f.code ? 'var(--primary-tint)' : 'var(--surface-2)', border: '1px solid ' + (fgCode === f.code ? 'var(--primary)' : 'var(--border)'), borderRadius: 7, padding: 9 } },
                React.createElement('div', { style: { cursor: 'pointer' }, onClick: () => setFgCode(f.code) },
                  React.createElement('div', { className: 'row', style: { justifyContent: 'space-between' } }, React.createElement('span', { className: 'mono', style: { fontSize: 11, fontWeight: 700, color: 'var(--primary)' } }, f.code), state.boms[f.code] && React.createElement('span', { className: 'badge badge-soft mono', style: { fontSize: 9.5 } }, state.boms[f.code].version)),
                  React.createElement('div', { style: { fontSize: 12, fontWeight: 600, marginTop: 2 } }, lang === 'th' ? f.nameTh : f.name)),
                React.createElement('div', { className: 'row', style: { gap: 4, justifyContent: 'flex-end', marginTop: 6 } },
                  React.createElement('button', { className: 'btn btn-sm btn-ghost btn-icon', title: t('btn.edit'), onClick: (e) => { e.stopPropagation(); setFgEdit(f); } }, React.createElement(Icon, { name: 'edit', size: 12 })),
                  React.createElement('button', { className: 'btn btn-sm btn-ghost btn-icon', title: t('btn.delete'), onClick: (e) => { e.stopPropagation(); delFg(f); } }, React.createElement(Icon, { name: 'trash', size: 12, style: { color: 'var(--danger)' } }))))) ) ),
        React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 14 } },
          React.createElement('div', { className: 'card' },
            React.createElement('div', { className: 'card-h' },
              React.createElement(Icon, { name: 'bom', size: 15, style: { color: 'var(--primary)' } }),
              React.createElement('div', null, React.createElement('h3', null, D.fgName(state, fgCode, lang)), React.createElement('div', { className: 'sub' }, t('f.version') + ' ' + (bom ? bom.version : '—') + ' · ' + (bom ? bom.lines.length : 0) + ' ' + t('rawmat'))),
              React.createElement('div', { className: 'card-h-actions' },
                React.createElement('button', { className: 'btn btn-sm', onClick: bumpVersion, title: t('bom.newver') }, React.createElement(Icon, { name: 'edit', size: 13 }), t('bom.newver')),
                React.createElement('button', { className: 'btn btn-sm btn-pri', onClick: () => setEditLine({ idx: -1, rm: state.raw[0].code, qty: '', unit: 'g' }) }, React.createElement(Icon, { name: 'plus', size: 13 }), t('bom.addline')))),
            React.createElement('table', { className: 'tbl' },
              React.createElement('thead', null, React.createElement('tr', null, React.createElement('th', null, t('f.code')), React.createElement('th', null, t('rawmat')), React.createElement('th', { className: 'num' }, t('bom.qtyper')), React.createElement('th', null, t('f.unit')), React.createElement('th', { style: { width: 80 } }, ''))),
              React.createElement('tbody', null, (bom && bom.lines.length) ? bom.lines.map((l, i) => React.createElement('tr', { key: i },
                React.createElement('td', { className: 'mono', style: { fontWeight: 600, color: 'var(--primary)' } }, l.rm),
                React.createElement('td', { style: { fontWeight: 600 } }, D.rmName(state, l.rm, lang)),
                React.createElement('td', { className: 'num mono', style: { fontWeight: 600 } }, l.qty),
                React.createElement('td', { className: 'mono' }, l.unit),
                React.createElement('td', { className: 'num' }, React.createElement('div', { className: 'row', style: { gap: 4, justifyContent: 'flex-end' } },
                  React.createElement('button', { className: 'btn btn-sm btn-ghost btn-icon', onClick: () => setEditLine({ idx: i, rm: l.rm, qty: l.qty, unit: l.unit }) }, React.createElement(Icon, { name: 'edit', size: 13 })),
                  React.createElement('button', { className: 'btn btn-sm btn-ghost btn-icon', onClick: () => delLine(i) }, React.createElement(Icon, { name: 'trash', size: 13, style: { color: 'var(--danger)' } })))))) 
                : React.createElement('tr', null, React.createElement('td', { colSpan: 5, className: 'empty' }, t('tbl.noresults')))))),
          React.createElement('div', { className: 'card' },
            React.createElement('div', { className: 'card-h' }, React.createElement(Icon, { name: 'calc', size: 15, style: { color: 'var(--primary)' } }), React.createElement('h3', null, lang === 'th' ? 'คำนวณความต้องการวัตถุดิบ' : 'Material Requirement Calculation'),
              React.createElement('div', { className: 'card-h-actions row', style: { gap: 8 } },
                React.createElement('span', { className: 'faint', style: { fontSize: 11 } }, t('f.qty')),
                React.createElement('input', { className: 'input mono', type: 'number', value: calcQty, onChange: e => setCalcQty(Math.max(0, +e.target.value)), style: { width: 110 } }),
                React.createElement('span', { className: 'faint', style: { fontSize: 11 } }, t('u.pcs')))),
            React.createElement('table', { className: 'tbl' },
              React.createElement('thead', null, React.createElement('tr', null, React.createElement('th', null, t('rawmat')), React.createElement('th', { className: 'num' }, t('f.required')), React.createElement('th', { className: 'num' }, t('f.onhand')), React.createElement('th', { className: 'num' }, t('f.shortage')))),
              React.createElement('tbody', null, req.map(r => React.createElement('tr', { key: r.rm },
                React.createElement('td', { style: { fontWeight: 600 } }, D.rmName(state, r.rm, lang), React.createElement('span', { className: 'mono faint', style: { fontSize: 10, marginLeft: 6 } }, r.rm)),
                React.createElement('td', { className: 'num mono', style: { fontWeight: 700 } }, fmt(r.need) + ' ' + r.unit),
                React.createElement('td', { className: 'num mono' }, fmt(r.onHand) + ' ' + r.unit),
                React.createElement('td', { className: 'num mono', style: { fontWeight: 700, color: r.short > 0 ? 'var(--danger)' : 'var(--ok)' } }, r.short > 0 ? '-' + fmt(r.short) : '✓')))))))),
      fgEdit && React.createElement(ItemModal, { tab: 'fg', t, lang, edit: fgEdit, onClose: () => setFgEdit(null), onSubmit: saveFg }),
      editLine && React.createElement(BomLineModal, { state, t, lang, line: editLine, onClose: () => setEditLine(null), onSubmit: saveLine }));
  }

  function BomLineModal({ state, t, lang, line, onClose, onSubmit }) {
    const [f, setF] = React.useState({ rm: line.rm, qty: line.qty, unit: line.unit });
    const set = (k, v) => setF(p => ({ ...p, [k]: v }));
    return React.createElement(Modal, { title: (line.idx === -1 ? t('bom.addline') : t('bom.editline')), onClose, width: 460,
      footer: React.createElement(React.Fragment, null, React.createElement('button', { className: 'btn', onClick: onClose }, t('btn.cancel')),
        React.createElement('button', { className: 'btn btn-pri', disabled: !f.qty || +f.qty <= 0, onClick: () => onSubmit({ idx: line.idx, ...f }) }, t('btn.save'))) },
      React.createElement('div', { className: 'grid g-2', style: { gap: 12 } },
        React.createElement('div', { style: { gridColumn: 'span 2' } }, React.createElement(Field, { label: t('rawmat'), required: true },
          React.createElement('select', { className: 'select', value: f.rm, onChange: e => set('rm', e.target.value) },
            state.raw.map(r => React.createElement('option', { key: r.code, value: r.code }, r.code + ' · ' + (lang === 'th' ? r.nameTh : r.name)))))),
        React.createElement(Field, { label: t('bom.qtyper'), required: true }, React.createElement('input', { className: 'input mono', type: 'number', step: 'any', value: f.qty, onChange: e => set('qty', e.target.value), placeholder: '0' })),
        React.createElement(Field, { label: t('f.unit'), required: true }, React.createElement('select', { className: 'select', value: f.unit, onChange: e => set('unit', e.target.value) }, ['g', 'kg', 'ml', 'L', 'pcs'].map(u => React.createElement('option', { key: u }, u))))));
  }

  /* ---------------- Customer Orders ---------------- */
  function CustomerOrders({ state, setState, go }) {
    const { t, lang } = useI18n();
    const toast = useToast();
    const [show, setShow] = React.useState(false);

    function add(f) {
      const id = f.id.trim();
      if (prev_exists(state, id)) { toast(lang === 'th' ? 'เลขที่คำสั่งซื้อซ้ำ' : 'Order number already exists', 'warn'); return; }
      setState(prev => ({ ...prev, orders: [{ id, customer: f.customer, fg: f.fg, qty: +f.qty, due: f.due, priority: f.priority, status: 'request' }, ...prev.orders] }));
      toast(t('toast.saved')); setShow(false);
    }
    function prev_exists(s, id) { return s.orders.some(o => o.id === id); }
    function del(id) { setState(prev => ({ ...prev, orders: prev.orders.filter(o => o.id !== id) })); toast(t('toast.deleted'), 'warn'); }

    return React.createElement('div', null,
      React.createElement(PageHead, { title: t('nav.orders'), sub: t('navsec.planning'),
        actions: React.createElement('button', { className: 'btn btn-pri', onClick: () => setShow(true) }, React.createElement(Icon, { name: 'plus', size: 15 }), t('btn.new')) }),
      React.createElement('div', { className: 'card' },
        React.createElement('table', { className: 'tbl' },
          React.createElement('thead', null, React.createElement('tr', null,
            React.createElement('th', null, t('f.order')), React.createElement('th', null, t('f.customer')), React.createElement('th', null, t('f.product')),
            React.createElement('th', { className: 'num' }, t('f.qty')), React.createElement('th', null, t('f.duedate')), React.createElement('th', null, t('f.priority')), React.createElement('th', null, t('f.status')), React.createElement('th', { style: { width: 60 } }, ''))),
          React.createElement('tbody', null, state.orders.length === 0
            ? React.createElement('tr', null, React.createElement('td', { colSpan: 8, className: 'empty' }, t('tbl.noresults')))
            : state.orders.map(o => React.createElement('tr', { key: o.id, className: 'clickrow' },
            React.createElement('td', { className: 'mono', style: { fontWeight: 600, color: 'var(--primary)' }, onClick: () => go('flow') }, o.id),
            React.createElement('td', { onClick: () => go('flow') }, o.customer),
            React.createElement('td', { style: { fontWeight: 600 }, onClick: () => go('flow') }, D.fgName(state, o.fg, lang)),
            React.createElement('td', { className: 'num mono', style: { fontWeight: 600 }, onClick: () => go('flow') }, fmt(o.qty)),
            React.createElement('td', { className: 'mono faint', onClick: () => go('flow') }, fmtDate(o.due)),
            React.createElement('td', { onClick: () => go('flow') }, React.createElement(PriorityBadge, { p: o.priority })),
            React.createElement('td', { onClick: () => go('flow') }, React.createElement(StatusBadge, { status: o.status })),
            React.createElement('td', null, o.status === 'request'
              ? React.createElement('button', { className: 'btn btn-sm btn-ghost btn-icon', title: t('btn.delete'), onClick: (e) => { e.stopPropagation(); del(o.id); } }, React.createElement(Icon, { name: 'trash', size: 14, style: { color: 'var(--danger)' } }))
              : React.createElement('span', { className: 'faint', style: { fontSize: 14 } }, '—')))))) ),
      show && React.createElement(OrderModal, { state, t, lang, onClose: () => setShow(false), onSubmit: add }));
  }

  function OrderModal({ state, t, lang, onClose, onSubmit }) {
    const [f, setF] = React.useState({ id: '', customer: state.customers[0], fg: state.fg[0].code, qty: '', due: state.today, priority: 'med' });
    const set = (k, v) => setF(p => ({ ...p, [k]: v }));
    return React.createElement(Modal, { title: t('btn.new') + ' · ' + t('nav.orders'), onClose, width: 520,
      footer: React.createElement(React.Fragment, null, React.createElement('button', { className: 'btn', onClick: onClose }, t('btn.cancel')),
        React.createElement('button', { className: 'btn btn-pri', disabled: !f.qty || !f.id.trim(), onClick: () => onSubmit(f) }, t('btn.save'))) },
      React.createElement('div', { className: 'grid g-2', style: { gap: 12 } },
        React.createElement('div', { style: { gridColumn: 'span 2' } }, React.createElement(Field, { label: t('f.order'), required: true, hint: lang === 'th' ? 'กรอกเลขที่เอง เช่น SO-2496' : 'Enter your own number, e.g. SO-2496' }, React.createElement('input', { className: 'input mono', value: f.id, onChange: e => set('id', e.target.value), placeholder: 'SO-____' }))),
        React.createElement(Field, { label: t('f.customer'), required: true }, React.createElement('select', { className: 'select', value: f.customer, onChange: e => set('customer', e.target.value) }, state.customers.map(c => React.createElement('option', { key: c }, c)))),
        React.createElement(Field, { label: t('f.product'), required: true }, React.createElement('select', { className: 'select', value: f.fg, onChange: e => set('fg', e.target.value) }, state.fg.map(x => React.createElement('option', { key: x.code, value: x.code }, lang === 'th' ? x.nameTh : x.name)))),
        React.createElement(Field, { label: t('f.qty'), required: true }, React.createElement('input', { className: 'input mono', type: 'number', value: f.qty, onChange: e => set('qty', e.target.value), placeholder: '0' })),
        React.createElement(Field, { label: t('f.duedate'), required: true }, React.createElement(DateField, { value: f.due, onChange: v => set('due', v) })),
        React.createElement('div', { style: { gridColumn: 'span 2' } }, React.createElement(Field, { label: t('f.priority') }, React.createElement('select', { className: 'select', value: f.priority, onChange: e => set('priority', e.target.value) },
          [['high', t('pri.high')], ['med', t('pri.med')], ['low', t('pri.low')]].map(p => React.createElement('option', { key: p[0], value: p[0] }, p[1])))))));
  }

  /* ---------------- User Management ---------------- */
  function Users({ state, setState }) {
    const { t, lang } = useI18n();
    const toast = useToast();
    const [show, setShow] = React.useState(false);
    const ROLE_COLOR = { admin: '#cf3b3b', ppc: '#2d5bd7', warehouse: '#7b5cd9', production: '#e08a1e', management: '#1f8a5b' };

    function toggle(id) { setState(prev => ({ ...prev, users: prev.users.map(u => u.id === id ? { ...u, status: u.status === 'A' ? 'I' : 'A' } : u) })); toast(t('toast.saved')); }
    function add(f) {
      if (state.users.some(u => u.username === f.username.trim())) { toast(lang === 'th' ? 'ชื่อผู้ใช้ซ้ำ' : 'Username already exists', 'warn'); return; }
      setState(prev => ({ ...prev, users: [...prev.users, { id: 'U' + (prev.users.length + 1).toString().padStart(2, '0'), username: f.username.trim(), name: f.name, email: f.email, role: f.role, status: 'A', last: prev.today, password: f.password }] }));
      toast(t('toast.usercreated')); setShow(false);
    }
    function resetPw(u) {
      const np = Math.random().toString(36).slice(2, 8);
      setState(prev => ({ ...prev, users: prev.users.map(x => x.id === u.id ? { ...x, password: np } : x) }));
      toast((lang === 'th' ? 'รหัสผ่านใหม่: ' : 'New password: ') + np);
    }

    return React.createElement('div', null,
      React.createElement(PageHead, { title: t('nav.users'), sub: t('navsec.admin'),
        actions: React.createElement('button', { className: 'btn btn-pri', onClick: () => setShow(true) }, React.createElement(Icon, { name: 'plus', size: 15 }), t('btn.new')) }),
      React.createElement('div', { className: 'card' },
        React.createElement('table', { className: 'tbl' },
          React.createElement('thead', null, React.createElement('tr', null,
            React.createElement('th', null, t('f.name')), React.createElement('th', null, t('f.username')), React.createElement('th', null, t('f.password')), React.createElement('th', null, t('f.email')),
            React.createElement('th', null, t('f.role')), React.createElement('th', null, lang === 'th' ? 'เข้าใช้ล่าสุด' : 'Last login'), React.createElement('th', null, t('f.status')), React.createElement('th', { style: { width: 170 } }, ''))),
          React.createElement('tbody', null, state.users.map(u => React.createElement('tr', { key: u.id },
            React.createElement('td', null, React.createElement('div', { className: 'row', style: { gap: 9 } },
              React.createElement('span', { style: { width: 28, height: 28, borderRadius: '50%', background: ROLE_COLOR[u.role], color: '#fff', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700 } }, u.name.split(' ').map(x => x[0]).join('').slice(0, 2)),
              React.createElement('span', { style: { fontWeight: 600 } }, u.name))),
            React.createElement('td', { className: 'mono' }, u.username),
            React.createElement('td', null, React.createElement(PwCell, { pw: u.password || '\u2014' })),
            React.createElement('td', { className: 'faint' }, u.email),
            React.createElement('td', null, React.createElement('span', { className: 'badge', style: { color: ROLE_COLOR[u.role], background: 'color-mix(in srgb,' + ROLE_COLOR[u.role] + ' 12%,white)' } }, t('role.' + u.role))),
            React.createElement('td', { className: 'mono faint' }, fmtDate(u.last)),
            React.createElement('td', null, React.createElement('span', { className: 'badge', style: { color: u.status === 'A' ? 'var(--ok)' : 'var(--text-muted)', background: u.status === 'A' ? 'var(--ok-tint)' : 'var(--surface-3)' } }, u.status === 'A' ? t('f.active') : t('f.inactive'))),
            React.createElement('td', null, React.createElement('div', { className: 'row', style: { gap: 5 } },
              React.createElement('button', { className: 'btn btn-sm', onClick: () => resetPw(u), title: t('users.resetpw') }, React.createElement(Icon, { name: 'lock', size: 12 })),
              React.createElement('button', { className: 'btn btn-sm', onClick: () => toggle(u.id) }, u.status === 'A' ? t('f.inactive') : t('f.active')))))))) ),
      show && React.createElement(UserModal, { state, t, onClose: () => setShow(false), onSubmit: add }));
  }

  function PwCell({ pw }) {
    const [show, setShow] = React.useState(false);
    return React.createElement('button', { onClick: () => setShow(s => !s), title: 'show/hide',
      style: { display: 'inline-flex', alignItems: 'center', gap: 6, border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'IBM Plex Mono, monospace', fontSize: 11.5, color: 'var(--text-muted)' } },
      React.createElement('span', null, show ? pw : '\u2022\u2022\u2022\u2022\u2022\u2022'),
      React.createElement(window.PG_UI.Icon, { name: 'search', size: 11, style: { opacity: .5 } }));
  }

  function UserModal({ state, t, onClose, onSubmit }) {
    const [f, setF] = React.useState({ name: '', username: '', email: '', role: 'ppc', password: '' });
    const set = (k, v) => setF(p => ({ ...p, [k]: v }));
    const gen = () => set('password', Math.random().toString(36).slice(2, 10));
    return React.createElement(Modal, { title: t('btn.new') + ' · ' + t('nav.users'), onClose, width: 480,
      footer: React.createElement(React.Fragment, null, React.createElement('button', { className: 'btn', onClick: onClose }, t('btn.cancel')),
        React.createElement('button', { className: 'btn btn-pri', disabled: !f.name || !f.username || !f.password, onClick: () => onSubmit(f) }, t('users.create'))) },
      React.createElement('div', { className: 'grid g-2', style: { gap: 12 } },
        React.createElement('div', { style: { gridColumn: 'span 2' } }, React.createElement(Field, { label: t('f.name'), required: true }, React.createElement('input', { className: 'input', value: f.name, onChange: e => set('name', e.target.value) }))),
        React.createElement(Field, { label: t('f.username'), required: true }, React.createElement('input', { className: 'input mono', value: f.username, onChange: e => set('username', e.target.value), placeholder: 'first.last' })),
        React.createElement(Field, { label: t('f.role'), required: true }, React.createElement('select', { className: 'select', value: f.role, onChange: e => set('role', e.target.value) },
          ['admin', 'ppc', 'warehouse', 'production', 'management'].map(r => React.createElement('option', { key: r, value: r }, t('role.' + r))))),
        React.createElement('div', { style: { gridColumn: 'span 2' } }, React.createElement(Field, { label: t('f.password'), required: true, hint: t('users.pwhint') },
          React.createElement('div', { className: 'row', style: { gap: 8 } },
            React.createElement('input', { className: 'input mono', value: f.password, onChange: e => set('password', e.target.value), placeholder: '••••••••' }),
            React.createElement('button', { className: 'btn btn-sm', type: 'button', onClick: gen }, t('users.generate'))))),
        React.createElement('div', { style: { gridColumn: 'span 2' } }, React.createElement(Field, { label: t('f.email') }, React.createElement('input', { className: 'input', type: 'email', value: f.email, onChange: e => set('email', e.target.value) })))));
  }

  window.PG_ItemMaster = ItemMaster;
  window.PG_BOM = BOM;
  window.PG_CustomerOrders = CustomerOrders;
  window.PG_Users = Users;
})();
