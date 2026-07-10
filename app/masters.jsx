/* ============================================================
   Modules: Item Master · BOM · Customer Orders · Users
   ============================================================ */
(function () {
  const { useI18n } = window.PG_I18N;
  const { PageHead, Icon, fmt, fmtDate, DateField, Modal, Field, useToast, StatusBadge, PriorityBadge } = window.PG_UI;
  const D = window.PG_DATA;

  /* ---------------- Item Master ---------------- */
  // Reusable filter bar: search (code/name) + category + status, with a result count
  function ItemFilterBar({ lang, q, setQ, catF, setCatF, statusF, setStatusF, cats, count, total }) {
    const e = React.createElement;
    return e('div', { className: 'card', style: { marginBottom: 'var(--gap)', padding: 12 } },
      e('div', { className: 'row', style: { gap: 10, flexWrap: 'wrap', alignItems: 'center' } },
        e('input', { className: 'input', style: { flex: '1 1 220px', minWidth: 180 }, placeholder: lang === 'th' ? 'ค้นหา รหัส / ชื่อ' : 'Search code / name', value: q, onChange: ev => setQ(ev.target.value) }),
        e('select', { className: 'select', style: { width: 168 }, value: catF, onChange: ev => setCatF(ev.target.value) },
          [e('option', { key: '_all', value: '' }, lang === 'th' ? 'ทุกหมวดหมู่' : 'All categories')].concat(cats.map(c => e('option', { key: c, value: c }, c)))),
        e('select', { className: 'select', style: { width: 150 }, value: statusF, onChange: ev => setStatusF(ev.target.value) },
          e('option', { value: '' }, lang === 'th' ? 'ทุกสถานะ' : 'All statuses'),
          e('option', { value: 'A' }, lang === 'th' ? 'ใช้งาน' : 'Active'),
          e('option', { value: 'I' }, lang === 'th' ? 'ปิดใช้งาน' : 'Inactive')),
        e('span', { className: 'badge badge-soft', style: { fontSize: 11 } }, count + ' / ' + total),
        (q || catF || statusF) && e('button', { className: 'btn btn-sm', onClick: () => { setQ(''); setCatF(''); setStatusF(''); } }, lang === 'th' ? 'ล้าง' : 'Clear')));
  }

  function ItemMaster({ state, setState, canDelete }) {
    const { t, lang } = useI18n();
    const toast = useToast();
    const [tab, setTab] = React.useState('rm');
    const [modal, setModal] = React.useState(null); // { mode:'add' } | { mode:'edit', item }
    const items = tab === 'rm' ? state.raw : state.fg;
    const key = tab === 'rm' ? 'raw' : 'fg';
    const [q, setQ] = React.useState('');
    const [catF, setCatF] = React.useState('');
    const [statusF, setStatusF] = React.useState('');
    const switchTab = (tb) => { setTab(tb); setQ(''); setCatF(''); setStatusF(''); };
    const cats = Array.from(new Set(items.map(x => x.cat).filter(Boolean)));
    const needle = q.trim().toLowerCase();
    const filtered = items.filter(it => {
      if (statusF && (statusF === 'A' ? it.status !== 'A' : it.status === 'A')) return false;
      if (catF && it.cat !== catF) return false;
      if (needle) { const hay = (it.code + ' ' + (it.nameTh || '') + ' ' + (it.name || '') + ' ' + (it.cat || '')).toLowerCase(); if (hay.indexOf(needle) < 0) return false; }
      return true;
    });

    function toggleStatus(it) {
      setState(prev => ({ ...prev, [key]: prev[key].map(x => x.code === it.code ? { ...x, status: x.status === 'A' ? 'I' : 'A' } : x) }));
      toast(it.status === 'A' ? (lang === 'th' ? 'ปิดใช้งานแล้ว' : 'Set inactive') : (lang === 'th' ? 'เปิดใช้งานแล้ว' : 'Set active'), 'warn');
    }

    function save(f) {
      if (modal.mode === 'add' && items.some(x => x.code === f.code.trim())) {
        toast(lang === 'th' ? 'รหัสนี้มีอยู่แล้ว' : 'Code already exists', 'warn'); return;
      }
      setState(prev => {
        const list = prev[key].slice();
        const rec = { name: f.name || f.nameTh, nameTh: f.nameTh || f.name, unit: f.unit, cat: f.cat, status: f.status || 'A' };
        if (modal.mode === 'edit') {
          const i = list.findIndex(x => x.code === modal.item.code);
          if (i !== -1) list[i] = { ...list[i], ...rec };
        } else {
          list.push({ code: f.code.trim(), ...rec });
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
            React.createElement('button', { className: tab === 'rm' ? 'on' : '', onClick: () => switchTab('rm') }, t('rawmat')),
            React.createElement('button', { className: tab === 'fg' ? 'on' : '', onClick: () => switchTab('fg') }, t('finished'))),
          React.createElement('button', { className: 'btn btn-pri', onClick: () => setModal({ mode: 'add' }) }, React.createElement(Icon, { name: 'plus', size: 15 }), t('btn.new'))) }),
      React.createElement(ItemFilterBar, { lang, q, setQ, catF, setCatF, statusF, setStatusF, cats, count: filtered.length, total: items.length }),
      React.createElement('div', { className: 'card' },
        React.createElement('table', { className: 'tbl' },
          React.createElement('thead', null, React.createElement('tr', null,
            React.createElement('th', null, tab === 'rm' ? 'RM ' + t('f.code') : 'FG ' + t('f.code')),
            React.createElement('th', null, t('f.name')), React.createElement('th', null, t('f.unit')), React.createElement('th', null, t('f.category')), React.createElement('th', null, t('f.status')),
            React.createElement('th', { style: { width: 120 } }, ''))),
          React.createElement('tbody', null, filtered.length === 0
            ? React.createElement('tr', null, React.createElement('td', { colSpan: 6, className: 'empty' }, t('tbl.noresults')))
            : filtered.map(it => React.createElement('tr', { key: it.code, style: { opacity: it.status === 'A' ? 1 : 0.55 } },
            React.createElement('td', { className: 'mono', style: { fontWeight: 600, color: 'var(--primary)' } }, it.code),
            React.createElement('td', null, React.createElement('div', { style: { fontWeight: 600 } }, lang === 'th' ? it.nameTh : it.name), React.createElement('div', { className: 'faint', style: { fontSize: 10.5 } }, lang === 'th' ? it.name : it.nameTh)),
            React.createElement('td', { className: 'mono' }, it.unit),
            React.createElement('td', null, React.createElement('span', { className: 'badge badge-soft' }, it.cat)),
            React.createElement('td', null, React.createElement('span', { className: 'badge', style: { color: it.status === 'A' ? 'var(--ok)' : 'var(--text-muted)', background: it.status === 'A' ? 'var(--ok-tint)' : 'var(--surface-3)' } }, it.status === 'A' ? t('f.active') : t('f.inactive'))),
            React.createElement('td', { className: 'num' }, React.createElement('div', { className: 'row', style: { gap: 4, justifyContent: 'flex-end' } },
              React.createElement('button', { className: 'btn btn-sm', title: it.status === 'A' ? t('f.inactive') : t('f.active'), onClick: () => toggleStatus(it) }, it.status === 'A' ? t('f.inactive') : t('f.active')),
              React.createElement('button', { className: 'btn btn-sm btn-ghost btn-icon', title: t('btn.edit'), onClick: () => setModal({ mode: 'edit', item: it }) }, React.createElement(Icon, { name: 'edit', size: 13 })),
              canDelete && React.createElement('button', { className: 'btn btn-sm btn-ghost btn-icon', title: t('btn.delete'), onClick: () => del(it) }, React.createElement(Icon, { name: 'trash', size: 13, style: { color: 'var(--danger)' } })))))))) ),
      modal && React.createElement(ItemModal, { tab, t, lang, edit: modal.mode === 'edit' ? modal.item : null, onClose: () => setModal(null), onSubmit: save }));
  }

  function ItemModal({ tab, t, lang, edit, onClose, onSubmit }) {
    const [f, setF] = React.useState(edit
      ? { code: edit.code, name: edit.name, nameTh: edit.nameTh, unit: edit.unit, cat: edit.cat, status: edit.status || 'A' }
      : { code: '', name: '', nameTh: '', unit: 'pcs', cat: '', status: 'A' });
    const set = (k, v) => setF(p => ({ ...p, [k]: v }));
    return React.createElement(Modal, { title: (edit ? t('btn.edit') : t('btn.new')) + ' · ' + (tab === 'rm' ? t('rawmat') : t('finished')), onClose, width: 480,
      footer: React.createElement(React.Fragment, null, React.createElement('button', { className: 'btn', onClick: onClose }, t('btn.cancel')),
        React.createElement('button', { className: 'btn btn-pri', disabled: !f.code || (!f.name && !f.nameTh), onClick: () => onSubmit(f) }, t('btn.save'))) },
      React.createElement('div', { className: 'grid g-2', style: { gap: 12 } },
        React.createElement(Field, { label: t('f.code'), required: true }, React.createElement('input', { className: 'input mono', value: f.code, disabled: !!edit, onChange: e => set('code', e.target.value), placeholder: tab === 'rm' ? 'RM014' : 'FG006' })),
        React.createElement(Field, { label: t('f.unit'), required: true }, React.createElement('select', { className: 'select', value: f.unit, onChange: e => set('unit', e.target.value) }, ['pcs', 'kg', 'g', 'L', 'ml'].map(u => React.createElement('option', { key: u }, u)))),
        React.createElement('div', { style: { gridColumn: 'span 2' } }, React.createElement(Field, { label: (lang === 'th' ? 'ชื่อสาร' : 'Substance name'), required: true }, React.createElement('input', { className: 'input', value: f.nameTh, onChange: e => set('nameTh', e.target.value) }))),
        React.createElement('div', { style: { gridColumn: 'span 2' } }, React.createElement(Field, { label: 'INCI Name' }, React.createElement('input', { className: 'input', value: f.name, onChange: e => set('name', e.target.value) }))),
        React.createElement(Field, { label: t('f.category') }, React.createElement('input', { className: 'input', value: f.cat, onChange: e => set('cat', e.target.value), placeholder: tab === 'rm' ? 'Active / Base / Packaging' : 'Serum / Foundation / Lip' })),
        React.createElement(Field, { label: t('f.status') }, React.createElement('select', { className: 'select', value: f.status, onChange: e => set('status', e.target.value) },
          React.createElement('option', { value: 'A' }, t('f.active')),
          React.createElement('option', { value: 'I' }, t('f.inactive'))))));
  }

  /* ---------------- BOM Management ---------------- */
  function BOM({ state, setState, canDelete, readOnly }) {
    const { t, lang } = useI18n();
    const toast = useToast();
    const [fgCode, setFgCode] = React.useState(state.fg[0].code);
    const [calcQty, setCalcQty] = React.useState(10000);
    const [editLine, setEditLine] = React.useState(null); // { idx, rm, qty, unit } or { idx:-1 } for new
    const [fgEdit, setFgEdit] = React.useState(null);
    const [draft, setDraft] = React.useState(null); // { lines } while creating a new version (reorder session)
    const dragIdx = React.useRef(null);
    const bom = state.boms[fgCode];
    // leaving a draft when switching product
    React.useEffect(() => { setDraft(null); }, [fgCode]);
    const req = fgCode ? D.bomRequirement(state, fgCode, calcQty) : [];

    // keep selection valid if the current FG gets deleted (here or in another tab)
    React.useEffect(() => { if (state.fg.length && !state.fg.some(f => f.code === fgCode)) setFgCode(state.fg[0].code); }, [state.fg.length]);

    function saveFg(form) {
      if (readOnly) return;
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
    // "New version" no longer saves immediately — it opens a reorder draft that must be confirmed.
    const nextVersion = (v) => { const n = parseFloat((v || 'v1.0').replace(/[^0-9.]/g, '')) || 1.0; return 'v' + (n + 0.1).toFixed(1); };
    function enterVersion() { setDraft({ lines: (bom ? bom.lines.slice() : []) }); }
    function cancelVersion() { setDraft(null); dragIdx.current = null; }
    function confirmVersion() {
      setState(prev => {
        const boms = ensureBom(prev); const cur = boms[fgCode];
        boms[fgCode] = { ...cur, lines: draft.lines.slice(), version: nextVersion(cur.version) };
        return { ...prev, boms };
      });
      toast(t('toast.bomsaved')); setDraft(null); dragIdx.current = null;
    }
    function reorderDraft(from, to) {
      if (from == null || to == null || from === to) return;
      setDraft(d => { const lines = d.lines.slice(); const m = lines.splice(from, 1)[0]; lines.splice(to, 0, m); return { lines: lines }; });
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
                !readOnly && React.createElement('div', { className: 'row', style: { gap: 4, justifyContent: 'flex-end', marginTop: 6 } },
                  React.createElement('button', { className: 'btn btn-sm btn-ghost btn-icon', title: t('btn.edit'), onClick: (e) => { e.stopPropagation(); setFgEdit(f); } }, React.createElement(Icon, { name: 'edit', size: 12 })),
                  canDelete && React.createElement('button', { className: 'btn btn-sm btn-ghost btn-icon', title: t('btn.delete'), onClick: (e) => { e.stopPropagation(); delFg(f); } }, React.createElement(Icon, { name: 'trash', size: 12, style: { color: 'var(--danger)' } }))))) ) ),
        React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 14 } },
          React.createElement('div', { className: 'card' },
            React.createElement('div', { className: 'card-h' },
              React.createElement(Icon, { name: 'bom', size: 15, style: { color: 'var(--primary)' } }),
              React.createElement('div', null, React.createElement('h3', null, D.fgName(state, fgCode, lang)),
                React.createElement('div', { className: 'sub' }, t('f.version') + ' ' + (bom ? bom.version : '—') + ' · ' + ((draft ? draft.lines.length : (bom ? bom.lines.length : 0))) + ' ' + t('rawmat')
                  + (draft ? ' · ' + (lang === 'th' ? 'กำลังสร้าง ' + nextVersion(bom ? bom.version : 'v1.0') + ' — ลากเพื่อจัดลำดับ' : 'creating ' + nextVersion(bom ? bom.version : 'v1.0') + ' — drag to reorder') : ''))),
              readOnly
                ? React.createElement('div', { className: 'card-h-actions' }, React.createElement('span', { className: 'badge badge-soft', style: { fontSize: 10.5 } }, lang === 'th' ? 'ดูอย่างเดียว' : 'View only'))
                : draft
                  ? React.createElement('div', { className: 'card-h-actions row', style: { gap: 6 } },
                      React.createElement('button', { className: 'btn btn-sm', onClick: cancelVersion }, t('btn.cancel')),
                      React.createElement('button', { className: 'btn btn-sm btn-pri', onClick: confirmVersion }, React.createElement(Icon, { name: 'checkcircle', size: 13 }), lang === 'th' ? 'บันทึกยืนยันสูตรผลิต' : 'Confirm & save formula'))
                  : React.createElement('div', { className: 'card-h-actions row', style: { gap: 6 } },
                      React.createElement('button', { className: 'btn btn-sm', onClick: enterVersion, title: t('bom.newver') }, React.createElement(Icon, { name: 'edit', size: 13 }), t('bom.newver')),
                      React.createElement('button', { className: 'btn btn-sm btn-pri', onClick: () => setEditLine({ idx: -1, rm: state.raw[0].code, qty: '', unit: 'g' }) }, React.createElement(Icon, { name: 'plus', size: 13 }), t('bom.addline')))),
            React.createElement('table', { className: 'tbl' },
              React.createElement('thead', null, React.createElement('tr', null, draft && React.createElement('th', { style: { width: 28 } }, ''), React.createElement('th', null, t('f.code')), React.createElement('th', null, t('rawmat')), React.createElement('th', { className: 'num' }, t('bom.qtyper')), React.createElement('th', null, t('f.unit')), React.createElement('th', { style: { width: 80 } }, ''))),
              React.createElement('tbody', null, (function () {
                const rows = draft ? draft.lines : ((bom && bom.lines) || []);
                if (!rows.length) return React.createElement('tr', null, React.createElement('td', { colSpan: draft ? 6 : 5, className: 'empty' }, t('tbl.noresults')));
                return rows.map((l, i) => React.createElement('tr', Object.assign({ key: i }, draft ? {
                    draggable: true,
                    onDragStart: () => { dragIdx.current = i; },
                    onDragOver: (e) => e.preventDefault(),
                    onDrop: () => { reorderDraft(dragIdx.current, i); dragIdx.current = null; },
                    style: { cursor: 'grab' }
                  } : {}),
                  draft && React.createElement('td', { style: { color: 'var(--text-faint)', textAlign: 'center' }, title: lang === 'th' ? 'ลากเพื่อจัดลำดับ' : 'Drag to reorder' }, '⣿'),
                  React.createElement('td', { className: 'mono', style: { fontWeight: 600, color: 'var(--primary)' } }, l.rm),
                  React.createElement('td', { style: { fontWeight: 600 } }, D.rmName(state, l.rm, lang)),
                  React.createElement('td', { className: 'num mono', style: { fontWeight: 600 } }, l.qty),
                  React.createElement('td', { className: 'mono' }, l.unit),
                  React.createElement('td', { className: 'num' }, (draft || readOnly) ? null : React.createElement('div', { className: 'row', style: { gap: 4, justifyContent: 'flex-end' } },
                    React.createElement('button', { className: 'btn btn-sm btn-ghost btn-icon', onClick: () => setEditLine({ idx: i, rm: l.rm, qty: l.qty, unit: l.unit }) }, React.createElement(Icon, { name: 'edit', size: 13 })),
                    canDelete && React.createElement('button', { className: 'btn btn-sm btn-ghost btn-icon', onClick: () => delLine(i) }, React.createElement(Icon, { name: 'trash', size: 13, style: { color: 'var(--danger)' } }))))));
              })()))),
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
    const [f, setF] = React.useState({ rm: line.rm, qty: line.qty });
    const set = (k, v) => setF(p => ({ ...p, [k]: v }));
    // the unit always follows the raw material's unit from the item master (no manual select)
    const rmUnit = (state.raw.find(r => r.code === f.rm) || {}).unit || 'pcs';
    return React.createElement(Modal, { title: (line.idx === -1 ? t('bom.addline') : t('bom.editline')), onClose, width: 460,
      footer: React.createElement(React.Fragment, null, React.createElement('button', { className: 'btn', onClick: onClose }, t('btn.cancel')),
        React.createElement('button', { className: 'btn btn-pri', disabled: !f.qty || +f.qty <= 0, onClick: () => onSubmit({ idx: line.idx, rm: f.rm, qty: f.qty, unit: rmUnit }) }, t('btn.save'))) },
      React.createElement('div', { className: 'grid g-2', style: { gap: 12 } },
        React.createElement('div', { style: { gridColumn: 'span 2' } }, React.createElement(Field, { label: t('rawmat'), required: true },
          React.createElement('select', { className: 'select', value: f.rm, onChange: e => set('rm', e.target.value) },
            state.raw.map(r => React.createElement('option', { key: r.code, value: r.code }, r.code + ' · ' + (lang === 'th' ? r.nameTh : r.name) + ' (' + (r.unit || '') + ')'))))),
        React.createElement(Field, { label: t('bom.qtyper'), required: true }, React.createElement('input', { className: 'input mono', type: 'number', step: 'any', value: f.qty, onChange: e => set('qty', e.target.value), placeholder: '0' })),
        React.createElement(Field, { label: t('f.unit') + (lang === 'th' ? ' (จากรายการสินค้า)' : ' (from item master)') },
          React.createElement('div', { className: 'input mono', style: { display: 'flex', alignItems: 'center', background: 'var(--surface-2)', color: 'var(--text-muted)', fontWeight: 600 } }, rmUnit))));
  }

  /* ---------------- Customer Orders ---------------- */
  // Derived order status (mirrors the order-flow cards) — used by both the status
  // badge and the status filter so they always agree. order.status is never changed.
  const ORDER_STATUS_ORDER = ['request', 'waiting', 'reserved', 'scheduled', 'inprogress', 'produced', 'fgdone'];
  const ORDER_STATUS = {
    request:    { th: 'ขอเปิดผลิต',     en: 'Request',       c: 'var(--text-muted)',   bg: 'var(--surface-3)' },
    waiting:    { th: 'รอวัตถุดิบ',      en: 'Waiting',       c: 'var(--st-waiting)',   bg: 'var(--warn-tint)' },
    reserved:   { th: 'จองวัตถุดิบ',     en: 'Reserved',      c: 'var(--st-reserved)',  bg: 'var(--primary-tint)' },
    scheduled:  { th: 'จัดตารางแล้ว',    en: 'Scheduled',     c: 'var(--st-scheduled)', bg: 'var(--primary-tint)' },
    inprogress: { th: 'กำลังผลิต',       en: 'In production', c: 'var(--primary)',      bg: 'var(--primary-tint)' },
    produced:   { th: 'ผลิตเสร็จ',       en: 'Produced',      c: 'var(--st-completed)', bg: 'var(--ok-tint)' },
    fgdone:     { th: 'รับเข้าคลังเสร็จ', en: 'FG received',   c: '#fff',                bg: 'var(--primary)' },
  };
  function derivedStatusKey(o, pr) {
    if (o.status === 'scheduled') return pr.started ? 'inprogress' : 'scheduled';
    if (o.status === 'completed') return pr.received >= o.qty ? 'fgdone' : 'produced';
    return o.status; // request / waiting / reserved
  }
  function orderStatusBadge(o, pr, lang) {
    const s = ORDER_STATUS[derivedStatusKey(o, pr)] || { th: o.status, en: o.status, c: 'var(--text-muted)', bg: 'var(--surface-3)' };
    return React.createElement('span', { className: 'badge', style: { color: s.c, background: s.bg } }, lang === 'th' ? s.th : s.en);
  }

  function CustomerOrders({ state, setState, go, canDelete }) {
    const { t, lang } = useI18n();
    const toast = useToast();
    const [show, setShow] = React.useState(false);
    const [q, setQ] = React.useState('');
    const [statusSel, setStatusSel] = React.useState([]); // empty = show all
    const toggleStatus = (k) => setStatusSel(p => p.includes(k) ? p.filter(x => x !== k) : [...p, k]);

    function add(f) {
      const id = f.id.trim();
      if (prev_exists(state, id)) { toast(lang === 'th' ? 'เลขที่คำสั่งซื้อซ้ำ' : 'Order number already exists', 'warn'); return; }
      setState(prev => ({ ...prev, orders: [{ id, customer: f.customer, fg: f.fg, qty: +f.qty, due: f.due, priority: f.priority, status: 'request' }, ...prev.orders] }));
      toast(t('toast.saved')); setShow(false);
    }
    function prev_exists(s, id) { return s.orders.some(o => o.id === id); }
    function del(id) { setState(prev => ({ ...prev, orders: prev.orders.filter(o => o.id !== id) })); toast(t('toast.deleted'), 'warn'); }

    // apply search (order id / customer / product) + status multi-select
    const needle = q.trim().toLowerCase();
    const filtered = state.orders.filter(o => {
      const pr = D.orderProgress(state, o);
      if (statusSel.length && !statusSel.includes(derivedStatusKey(o, pr))) return false;
      if (needle) {
        const hay = (o.id + ' ' + (o.customer || '') + ' ' + D.fgName(state, o.fg, lang)).toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });

    return React.createElement('div', null,
      React.createElement(PageHead, { title: t('nav.orders'), sub: t('navsec.planning'),
        actions: React.createElement('button', { className: 'btn btn-pri', onClick: () => setShow(true) }, React.createElement(Icon, { name: 'plus', size: 15 }), t('btn.new')) }),
      // Filter bar
      React.createElement('div', { className: 'card', style: { marginBottom: 'var(--gap)', padding: 12 } },
        React.createElement('div', { className: 'row', style: { gap: 10, flexWrap: 'wrap', alignItems: 'center' } },
          React.createElement('input', { className: 'input', style: { flex: '1 1 260px', minWidth: 200 }, placeholder: lang === 'th' ? 'ค้นหา เลขที่คำสั่งซื้อ / ลูกค้า / สินค้า' : 'Search order no. / customer / product', value: q, onChange: e => setQ(e.target.value) }),
          React.createElement('span', { className: 'badge badge-soft', style: { fontSize: 11 } }, filtered.length + ' / ' + state.orders.length),
          (q || statusSel.length > 0) && React.createElement('button', { className: 'btn btn-sm', onClick: () => { setQ(''); setStatusSel([]); } }, lang === 'th' ? 'ล้างตัวกรอง' : 'Clear')),
        React.createElement('div', { className: 'row', style: { gap: 6, flexWrap: 'wrap', marginTop: 10, alignItems: 'center' } },
          React.createElement('span', { className: 'faint', style: { fontSize: 11, marginRight: 2 } }, lang === 'th' ? 'สถานะ:' : 'Status:'),
          ORDER_STATUS_ORDER.map(k => {
            const on = statusSel.includes(k); const s = ORDER_STATUS[k];
            return React.createElement('button', { key: k, onClick: () => toggleStatus(k),
              style: { fontSize: 11, padding: '3px 11px', borderRadius: 20, cursor: 'pointer', border: '1px solid ' + (on ? s.c : 'var(--border)'), background: on ? s.bg : 'var(--surface)', color: on ? s.c : 'var(--text-muted)', fontWeight: on ? 700 : 500 } },
              lang === 'th' ? s.th : s.en);
          }),
          statusSel.length === 0 && React.createElement('span', { className: 'faint', style: { fontSize: 10.5 } }, lang === 'th' ? '(ไม่เลือก = แสดงทั้งหมด)' : '(none = show all)'))),
      React.createElement('div', { className: 'card' },
        React.createElement('table', { className: 'tbl' },
          React.createElement('thead', null, React.createElement('tr', null,
            React.createElement('th', null, t('f.order')), React.createElement('th', null, t('f.customer')), React.createElement('th', null, t('f.product')),
            React.createElement('th', { className: 'num' }, t('f.qty')),
            React.createElement('th', { className: 'num' }, lang === 'th' ? 'ผลิตเสร็จ' : 'Produced'),
            React.createElement('th', { className: 'num' }, lang === 'th' ? 'รับเข้า FG' : 'FG received'),
            React.createElement('th', null, t('f.duedate')), React.createElement('th', null, t('f.priority')), React.createElement('th', null, t('f.status')), React.createElement('th', { style: { width: 60 } }, ''))),
          React.createElement('tbody', null, filtered.length === 0
            ? React.createElement('tr', null, React.createElement('td', { colSpan: 10, className: 'empty' }, t('tbl.noresults')))
            : filtered.map(o => {
            const pr = D.orderProgress(state, o);
            return React.createElement('tr', { key: o.id, className: 'clickrow' },
            React.createElement('td', { className: 'mono', style: { fontWeight: 600, color: 'var(--primary)' }, onClick: () => go('flow') }, o.id),
            React.createElement('td', { onClick: () => go('flow') }, o.customer),
            React.createElement('td', { style: { fontWeight: 600 }, onClick: () => go('flow') }, D.fgName(state, o.fg, lang)),
            React.createElement('td', { className: 'num mono', style: { fontWeight: 600 }, onClick: () => go('flow') }, fmt(o.qty)),
            React.createElement('td', { className: 'num mono', style: { fontWeight: 600, color: pr.produced > 0 ? 'var(--st-completed)' : 'var(--text-faint)' }, onClick: () => go('flow') }, pr.produced > 0 ? fmt(pr.produced) : '–'),
            React.createElement('td', { className: 'num mono', style: { fontWeight: 600, color: pr.received > 0 ? 'var(--ok)' : 'var(--text-faint)' }, onClick: () => go('flow') }, pr.received > 0 ? fmt(pr.received) : '–'),
            React.createElement('td', { className: 'mono faint', onClick: () => go('flow') }, fmtDate(o.due)),
            React.createElement('td', { onClick: () => go('flow') }, React.createElement(PriorityBadge, { p: o.priority })),
            React.createElement('td', { onClick: () => go('flow') }, orderStatusBadge(o, pr, lang, t)),
            React.createElement('td', null, (o.status === 'request' && canDelete)
              ? React.createElement('button', { className: 'btn btn-sm btn-ghost btn-icon', title: t('btn.delete'), onClick: (e) => { e.stopPropagation(); del(o.id); } }, React.createElement(Icon, { name: 'trash', size: 14, style: { color: 'var(--danger)' } }))
              : React.createElement('span', { className: 'faint', style: { fontSize: 14 } }, '—')));
            }))) ),
      show && React.createElement(OrderModal, { state, t, lang, onClose: () => setShow(false), onSubmit: add }));
  }

  function OrderModal({ state, t, lang, onClose, onSubmit }) {
    const [f, setF] = React.useState({ id: '', customer: '', fg: state.fg[0].code, qty: '', due: state.today, priority: 'med' });
    const set = (k, v) => setF(p => ({ ...p, [k]: v }));
    return React.createElement(Modal, { title: t('btn.new') + ' · ' + t('nav.orders'), onClose, width: 520,
      footer: React.createElement(React.Fragment, null, React.createElement('button', { className: 'btn', onClick: onClose }, t('btn.cancel')),
        React.createElement('button', { className: 'btn btn-pri', disabled: !f.qty || !f.id.trim() || !f.customer.trim(), onClick: () => onSubmit(f) }, t('btn.save'))) },
      React.createElement('div', { className: 'grid g-2', style: { gap: 12 } },
        React.createElement('div', { style: { gridColumn: 'span 2' } }, React.createElement(Field, { label: t('f.order'), required: true, hint: lang === 'th' ? 'กรอกเลขที่เอง เช่น SO-2496' : 'Enter your own number, e.g. SO-2496' }, React.createElement('input', { className: 'input mono', value: f.id, onChange: e => set('id', e.target.value), placeholder: 'SO-____' }))),
        React.createElement(Field, { label: t('f.customer'), required: true, hint: (state.customers || []).length === 0 ? (lang === 'th' ? 'เพิ่มลูกค้าได้ที่ ทะเบียนคู่ค้า/พนักงาน' : 'Add customers in the Partners registry') : null },
          React.createElement('select', { className: 'select', value: f.customer, onChange: e => set('customer', e.target.value) },
            [React.createElement('option', { key: '', value: '' }, lang === 'th' ? '— เลือกลูกค้า —' : '— select customer —')].concat((state.customers || []).map(c => React.createElement('option', { key: c, value: c }, c))))),
        React.createElement(Field, { label: t('f.product'), required: true }, React.createElement('select', { className: 'select', value: f.fg, onChange: e => set('fg', e.target.value) }, state.fg.map(x => React.createElement('option', { key: x.code, value: x.code }, lang === 'th' ? x.nameTh : x.name)))),
        React.createElement(Field, { label: t('f.qty'), required: true }, React.createElement('input', { className: 'input mono', type: 'number', value: f.qty, onChange: e => set('qty', e.target.value), placeholder: '0' })),
        React.createElement(Field, { label: t('f.duedate'), required: true }, React.createElement(DateField, { value: f.due, onChange: v => set('due', v) })),
        React.createElement('div', { style: { gridColumn: 'span 2' } }, React.createElement(Field, { label: t('f.priority') }, React.createElement('select', { className: 'select', value: f.priority, onChange: e => set('priority', e.target.value) },
          [['high', t('pri.high')], ['med', t('pri.med')], ['low', t('pri.low')]].map(p => React.createElement('option', { key: p[0], value: p[0] }, p[1])))))));
  }

  /* ---------------- User Management ---------------- */
  function Users({ state, setState, canDelete }) {
    const { t, lang } = useI18n();
    const toast = useToast();
    const [modal, setModal] = React.useState(null); // { mode:'add' } | { mode:'edit', user }
    const ROLE_COLOR = { admin: '#cf3b3b', staff: '#2d5bd7', ppc: '#2d5bd7', warehouse: '#7b5cd9', production: '#e08a1e', management: '#1f8a5b' };
    const ALL_KEYS = (window.PG_NAV || []).reduce((a, s) => a.concat(s.items.map(i => i.k)), []);
    const LEGACY = { ppc: ALL_KEYS.filter(k => k !== 'users'), management: ALL_KEYS.filter(k => k !== 'users'), warehouse: ['receiving', 'issue', 'fgreceiving', 'fgsales', 'stock'], production: ['dashboard', 'schedule', 'designer', 'shopfloor', 'qa'] };
    const permCount = (u) => u.role === 'admin' ? ALL_KEYS.length : (Array.isArray(u.perms) ? u.perms.length : (LEGACY[u.role] || []).length);

    const D = window.PG_DATA;
    const efail = (msg) => toast((lang === 'th' ? 'ซิงก์บัญชีล็อกอินไม่สำเร็จ: ' : 'Auth sync failed: ') + msg, 'warn');
    async function toggle(id) {
      const u = state.users.find(x => x.id === id); if (!u) return;
      const next = u.status === 'A' ? 'I' : 'A';
      const r = await D.adminUser('setBanned', { email: D.emailFor(u), banned: next === 'I' });
      if (!r.ok) { efail(r.error); return; }
      setState(prev => ({ ...prev, users: prev.users.map(x => x.id === id ? { ...x, status: next } : x) })); toast(t('toast.saved'));
    }
    async function resetPw(u) {
      const np = Math.random().toString(36).slice(2, 8);
      const r = await D.adminUser('setPassword', { email: D.emailFor(u), password: np });
      if (!r.ok) { efail(r.error); return; }
      // password lives only in Supabase Auth now — not stored in app_state
      toast((lang === 'th' ? 'รหัสผ่านใหม่: ' : 'New password: ') + np);
    }
    async function save(f) {
      const uname = f.username.trim();
      const isEdit = modal.mode === 'edit';
      if (state.users.some(u => u.username === uname && (!isEdit || u.id !== modal.user.id))) {
        toast(lang === 'th' ? 'ชื่อผู้ใช้ซ้ำ' : 'Username already exists', 'warn'); return;
      }
      const role = f.admin ? 'admin' : 'staff';
      const perms = f.admin ? [] : (f.perms || []);
      // view-only sections (subset of granted perms; admins are always full access)
      const viewOnly = f.admin ? [] : (f.viewOnly || []).filter(k => perms.indexOf(k) >= 0);
      // keep at least one active Admin (full access)
      if (isEdit && modal.user.role === 'admin' && role !== 'admin') {
        const activeAdmins = state.users.filter(x => x.role === 'admin' && x.status === 'A');
        if (activeAdmins.length <= 1) { toast(lang === 'th' ? 'ต้องมีผู้ดูแลระบบ (สิทธิ์เต็ม) อย่างน้อย 1 คน' : 'Keep at least one Admin (full access)', 'warn'); return; }
      }
      if (isEdit) {
        const newEmail = D.emailFor({ email: f.email, username: uname });
        const r = await D.adminUser('update', { oldEmail: D.emailFor(modal.user), email: newEmail, password: f.password || undefined, meta: { username: uname, name: f.name, app_id: modal.user.id, role: role } });
        if (!r.ok) { efail(r.error); return; }
        setState(prev => ({ ...prev, users: prev.users.map(u => u.id === modal.user.id
          ? { ...u, name: f.name, username: uname, email: f.email, role, perms, viewOnly } : u) }));
        toast(t('toast.saved')); setModal(null); return;
      }
      const nums = state.users.map(x => parseInt((x.id || '').replace(/\D/g, ''), 10)).filter(n => !isNaN(n));
      const id = 'U' + String((nums.length ? Math.max.apply(null, nums) : 0) + 1).padStart(2, '0');
      const email = D.emailFor({ email: f.email, username: uname });
      const r = await D.adminUser('create', { email: email, password: f.password, meta: { username: uname, name: f.name, app_id: id, role: role } });
      if (!r.ok) { efail(r.error); return; }
      setState(prev => ({ ...prev, users: [...prev.users, { id, username: uname, name: f.name, email: f.email, role, perms, viewOnly, status: 'A', last: prev.today }] }));
      toast(t('toast.usercreated')); setModal(null);
    }
    async function del(u) {
      const activeAdmins = state.users.filter(x => x.role === 'admin' && x.status === 'A');
      if (u.role === 'admin' && activeAdmins.length <= 1) { toast(lang === 'th' ? 'ลบไม่ได้ — ต้องมีผู้ดูแลระบบที่ใช้งานอย่างน้อย 1 คน' : 'Cannot delete — keep at least one active admin', 'warn'); return; }
      if (!window.confirm((lang === 'th' ? 'ยืนยันลบผู้ใช้ ' : 'Delete user ') + u.username + ' ?')) return;
      const r = await D.adminUser('delete', { email: D.emailFor(u) });
      if (!r.ok) { efail(r.error); return; }
      setState(prev => ({ ...prev, users: prev.users.filter(x => x.id !== u.id) }));
      toast(lang === 'th' ? 'ลบผู้ใช้เรียบร้อย' : 'User deleted', 'warn');
    }

    return React.createElement('div', null,
      React.createElement(PageHead, { title: t('nav.users'), sub: t('navsec.admin'),
        actions: React.createElement('button', { className: 'btn btn-pri', onClick: () => setModal({ mode: 'add' }) }, React.createElement(Icon, { name: 'plus', size: 15 }), t('btn.new')) }),
      React.createElement('div', { className: 'card' },
        React.createElement('table', { className: 'tbl' },
          React.createElement('thead', null, React.createElement('tr', null,
            React.createElement('th', null, t('f.name')), React.createElement('th', null, t('f.username')), React.createElement('th', null, t('f.password')), React.createElement('th', null, t('f.email')),
            React.createElement('th', null, lang === 'th' ? 'สิทธิ์การเข้าถึง' : 'Access'), React.createElement('th', null, lang === 'th' ? 'เข้าใช้ล่าสุด' : 'Last login'), React.createElement('th', null, t('f.status')), React.createElement('th', { style: { width: 230 } }, ''))),
          React.createElement('tbody', null, state.users.map(u => React.createElement('tr', { key: u.id },
            React.createElement('td', null, React.createElement('div', { className: 'row', style: { gap: 9 } },
              React.createElement('span', { style: { width: 28, height: 28, borderRadius: '50%', background: ROLE_COLOR[u.role] || '#2d5bd7', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700 } }, u.name.split(' ').map(x => x[0]).join('').slice(0, 2)),
              React.createElement('span', { style: { fontWeight: 600 } }, u.name))),
            React.createElement('td', { className: 'mono' }, u.username),
            React.createElement('td', null, React.createElement('span', { className: 'faint', style: { display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5 }, title: lang === 'th' ? '\u0e23\u0e2b\u0e31\u0e2a\u0e1c\u0e48\u0e32\u0e19\u0e40\u0e01\u0e47\u0e1a\u0e2d\u0e22\u0e48\u0e32\u0e07\u0e1b\u0e25\u0e2d\u0e14\u0e20\u0e31\u0e22\u0e43\u0e19 Supabase Auth \u2014 \u0e43\u0e0a\u0e49\u0e1b\u0e38\u0e48\u0e21\u0e01\u0e38\u0e0d\u0e41\u0e08\u0e40\u0e1e\u0e37\u0e48\u0e2d\u0e23\u0e35\u0e40\u0e0b\u0e47\u0e15' : 'Password is stored securely in Supabase Auth \u2014 use the key button to reset' }, React.createElement(Icon, { name: 'lock', size: 11 }), 'Supabase Auth')),
            React.createElement('td', { className: 'faint' }, u.email),
            React.createElement('td', null, u.role === 'admin'
              ? React.createElement('span', { className: 'badge', style: { color: 'var(--danger)', background: 'var(--danger-tint)' } }, lang === 'th' ? 'ผู้ดูแลระบบ (สิทธิ์เต็ม)' : 'Admin (full)')
              : React.createElement('span', { className: 'badge badge-soft' }, permCount(u) + '/' + ALL_KEYS.length + (lang === 'th' ? ' ส่วน' : ' sections'))),
            React.createElement('td', { className: 'mono faint' }, fmtDate(u.last)),
            React.createElement('td', null, React.createElement('span', { className: 'badge', style: { color: u.status === 'A' ? 'var(--ok)' : 'var(--text-muted)', background: u.status === 'A' ? 'var(--ok-tint)' : 'var(--surface-3)' } }, u.status === 'A' ? t('f.active') : t('f.inactive'))),
            React.createElement('td', null, React.createElement('div', { className: 'row', style: { gap: 5 } },
              React.createElement('button', { className: 'btn btn-sm btn-icon', onClick: () => setModal({ mode: 'edit', user: u }), title: t('btn.edit') }, React.createElement(Icon, { name: 'edit', size: 12 })),
              React.createElement('button', { className: 'btn btn-sm', onClick: () => resetPw(u), title: t('users.resetpw') }, React.createElement(Icon, { name: 'lock', size: 12 })),
              React.createElement('button', { className: 'btn btn-sm', onClick: () => toggle(u.id) }, u.status === 'A' ? t('f.inactive') : t('f.active')),
              canDelete && React.createElement('button', { className: 'btn btn-sm btn-icon', onClick: () => del(u), title: t('btn.delete') }, React.createElement(Icon, { name: 'trash', size: 12, style: { color: 'var(--danger)' } })))))))) ),
      modal && React.createElement(UserModal, { state, t, lang, edit: modal.mode === 'edit' ? modal.user : null, onClose: () => setModal(null), onSubmit: save }));
  }

  function PwCell({ pw }) {
    const [show, setShow] = React.useState(false);
    return React.createElement('button', { onClick: () => setShow(s => !s), title: 'show/hide',
      style: { display: 'inline-flex', alignItems: 'center', gap: 6, border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'IBM Plex Mono, monospace', fontSize: 11.5, color: 'var(--text-muted)' } },
      React.createElement('span', null, show ? pw : '\u2022\u2022\u2022\u2022\u2022\u2022'),
      React.createElement(window.PG_UI.Icon, { name: 'search', size: 11, style: { opacity: .5 } }));
  }

  function UserModal({ state, t, lang, edit, onClose, onSubmit }) {
    const NAV = window.PG_NAV || [];
    const ALL_KEYS = NAV.reduce((a, s) => a.concat(s.items.map(i => i.k)), []);
    const LEGACY = { ppc: ALL_KEYS.filter(k => k !== 'users'), management: ALL_KEYS.filter(k => k !== 'users'), warehouse: ['receiving', 'issue', 'fgreceiving', 'fgsales', 'stock'], production: ['dashboard', 'schedule', 'designer', 'shopfloor', 'qa'] };
    const initPerms = edit
      ? (edit.role === 'admin' ? ['dashboard'] : (Array.isArray(edit.perms) ? edit.perms.slice() : (LEGACY[edit.role] || ['dashboard']).slice()))
      : ['dashboard'];
    const VIEWONLY_KEYS = window.PG_VIEWONLY_KEYS || ['schedule', 'bom'];
    const [f, setF] = React.useState({ name: edit ? edit.name : '', username: edit ? edit.username : '', email: edit ? (edit.email || '') : '', password: '', admin: edit ? edit.role === 'admin' : false, perms: initPerms, viewOnly: edit && Array.isArray(edit.viewOnly) ? edit.viewOnly.slice() : [] });
    const set = (k, v) => setF(p => ({ ...p, [k]: v }));
    // toggling a section off also clears any view-only flag on it
    const togglePerm = (k) => setF(p => { const has = p.perms.indexOf(k) >= 0; return { ...p, perms: has ? p.perms.filter(x => x !== k) : p.perms.concat([k]), viewOnly: has ? p.viewOnly.filter(x => x !== k) : p.viewOnly }; });
    const setViewOnly = (k, on) => setF(p => ({ ...p, viewOnly: on ? (p.viewOnly.indexOf(k) >= 0 ? p.viewOnly : p.viewOnly.concat([k])) : p.viewOnly.filter(x => x !== k) }));
    const setAll = (on) => setF(p => ({ ...p, perms: on ? ALL_KEYS.slice() : [], viewOnly: on ? p.viewOnly : [] }));
    const gen = () => set('password', Math.random().toString(36).slice(2, 10));
    const valid = f.name && f.username.trim() && (edit || f.password) && (f.admin || f.perms.length > 0);
    return React.createElement(Modal, { title: (edit ? t('btn.edit') : t('btn.new')) + ' · ' + t('nav.users'), onClose, width: 560,
      footer: React.createElement(React.Fragment, null, React.createElement('button', { className: 'btn', onClick: onClose }, t('btn.cancel')),
        React.createElement('button', { className: 'btn btn-pri', disabled: !valid, onClick: () => onSubmit(f) }, edit ? t('btn.save') : t('users.create'))) },
      React.createElement('div', { className: 'grid g-2', style: { gap: 12 } },
        React.createElement('div', { style: { gridColumn: 'span 2' } }, React.createElement(Field, { label: t('f.name'), required: true }, React.createElement('input', { className: 'input', value: f.name, onChange: e => set('name', e.target.value) }))),
        React.createElement(Field, { label: t('f.username'), required: true }, React.createElement('input', { className: 'input mono', value: f.username, onChange: e => set('username', e.target.value), placeholder: 'first.last' })),
        React.createElement(Field, { label: t('f.email') }, React.createElement('input', { className: 'input', type: 'email', value: f.email, onChange: e => set('email', e.target.value) })),
        React.createElement('div', { style: { gridColumn: 'span 2' } }, React.createElement(Field, { label: t('f.password'), required: !edit, hint: edit ? (lang === 'th' ? 'เว้นว่างถ้าไม่เปลี่ยนรหัสผ่าน' : 'Leave blank to keep current password') : t('users.pwhint') },
          React.createElement('div', { className: 'row', style: { gap: 8 } },
            React.createElement('input', { className: 'input mono', value: f.password, onChange: e => set('password', e.target.value), placeholder: '••••••••' }),
            React.createElement('button', { className: 'btn btn-sm', type: 'button', onClick: gen }, t('users.generate'))))),
        React.createElement('div', { style: { gridColumn: 'span 2', borderTop: '1px solid var(--border)', paddingTop: 12 } },
          React.createElement('label', { style: { display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 } },
            React.createElement('input', { type: 'checkbox', checked: f.admin, onChange: e => set('admin', e.target.checked) }),
            React.createElement('span', null, lang === 'th' ? 'ผู้ดูแลระบบ (สิทธิ์เต็ม — เห็นทุกส่วน)' : 'Admin (full access — all sections)')),
          f.admin
            ? React.createElement('div', { className: 'faint', style: { fontSize: 11.5, marginTop: 8 } }, lang === 'th' ? 'ผู้ใช้นี้เห็นและจัดการได้ทุกส่วน รวมถึงจัดการผู้ใช้' : 'This user can see and manage everything, including users')
            : React.createElement('div', { style: { marginTop: 10 } },
                React.createElement('div', { className: 'row', style: { marginBottom: 8 } },
                  React.createElement('span', { style: { fontSize: 11.5, fontWeight: 600, color: 'var(--text-muted)' } }, (lang === 'th' ? 'อนุญาตให้เห็นแถบเมนู ' : 'Visible sections ') + '(' + f.perms.length + '/' + ALL_KEYS.length + ')'),
                  React.createElement('div', { className: 'row', style: { marginLeft: 'auto', gap: 6 } },
                    React.createElement('button', { type: 'button', className: 'btn btn-sm', onClick: () => setAll(true) }, lang === 'th' ? 'เลือกทั้งหมด' : 'All'),
                    React.createElement('button', { type: 'button', className: 'btn btn-sm', onClick: () => setAll(false) }, lang === 'th' ? 'ล้าง' : 'None'))),
                React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 18px' } },
                  NAV.map(sec => React.createElement('div', { key: sec.sec },
                    React.createElement('div', { style: { fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px', color: 'var(--text-faint)', marginBottom: 4 } }, t(sec.sec)),
                    sec.items.map(it => {
                      const on = f.perms.indexOf(it.k) >= 0;
                      const canVO = VIEWONLY_KEYS.indexOf(it.k) >= 0;
                      const vo = f.viewOnly.indexOf(it.k) >= 0;
                      return React.createElement('div', { key: it.k, style: { display: 'flex', alignItems: 'center', gap: 7, padding: '3px 0', fontSize: 12 } },
                        React.createElement('label', { style: { display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', flex: 1, minWidth: 0 } },
                          React.createElement('input', { type: 'checkbox', checked: on, onChange: () => togglePerm(it.k) }),
                          React.createElement('span', null, t('nav.' + it.k))),
                        canVO && on && React.createElement('div', { className: 'row', style: { gap: 3, flexShrink: 0 } },
                          React.createElement('button', { type: 'button', className: 'btn btn-sm' + (!vo ? ' btn-pri' : ''), style: { padding: '1px 7px', fontSize: 10 }, onClick: () => setViewOnly(it.k, false), title: lang === 'th' ? 'ใช้งานได้เต็ม' : 'Full access' }, lang === 'th' ? 'ใช้งาน' : 'Full'),
                          React.createElement('button', { type: 'button', className: 'btn btn-sm' + (vo ? ' btn-pri' : ''), style: { padding: '1px 7px', fontSize: 10 }, onClick: () => setViewOnly(it.k, true), title: lang === 'th' ? 'ดูอย่างเดียว แก้ไขไม่ได้' : 'View only' }, lang === 'th' ? 'ดูอย่างเดียว' : 'View')));
                    }))))))));
  }

  /* ---------------- Partners / Staff registry ---------------- */
  // Manages the lists used by the customer/supplier/sales-rep dropdowns.
  function Partners({ state, setState, canDelete }) {
    const { t, lang } = useI18n();
    const toast = useToast();
    const [modal, setModal] = React.useState(null); // { listKey, mode, index, value }

    const LISTS = [
      { key: 'customers', icon: 'orders', th: 'ลูกค้า', en: 'Customers', subTh: 'ใช้ใน คำสั่งซื้อลูกค้า + เอกสารขาย', subEn: 'Used in customer orders + sales documents', codeMap: 'customerCodes', codeTh: 'รหัสลูกค้า', codeEn: 'Customer code' },
      { key: 'suppliers', icon: 'receive', th: 'ผู้ขาย / ซัพพลายเออร์', en: 'Suppliers', subTh: 'ใช้ใน รับเข้าวัตถุดิบ', subEn: 'Used in material receiving', codeMap: 'supplierCodes', codeTh: 'รหัสผู้ขาย / ซัพพลายเออร์', codeEn: 'Supplier code' },
      { key: 'salesReps', icon: 'users', th: 'พนักงานขาย', en: 'Sales reps', subTh: 'ใช้ใน สร้างเอกสารขาย (ผู้บันทึก)', subEn: 'Used in sales documents (recorded by)' },
    ];
    const cfgOf = (k) => LISTS.find(l => l.key === k);
    const listOf = (k) => state[k] || [];
    const codeOf = (cfg, name) => (cfg && cfg.codeMap && state[cfg.codeMap] && state[cfg.codeMap][name]) || '';

    function save(form) {
      const name = (form.value || '').trim();
      if (!name) return;
      const key = form.listKey;
      const cfg = cfgOf(key);
      const cur = listOf(key);
      const dupAt = cur.findIndex(x => x.toLowerCase() === name.toLowerCase());
      if (dupAt >= 0 && dupAt !== form.index) { toast(lang === 'th' ? 'ชื่อนี้มีอยู่แล้ว' : 'Name already exists', 'warn'); return; }
      setState(prev => {
        const arr = (prev[key] || []).slice();
        const next = { ...prev };
        const oldName = form.mode === 'edit' ? arr[form.index] : null;
        if (form.mode === 'edit') arr[form.index] = name; else arr.push(name);
        next[key] = arr;
        if (cfg && cfg.codeMap) {
          const cm = { ...(prev[cfg.codeMap] || {}) };
          if (oldName && oldName !== name) delete cm[oldName];
          cm[name] = (form.code || '').trim();
          next[cfg.codeMap] = cm;
        }
        return next;
      });
      toast(t('toast.saved')); setModal(null);
    }
    function del(key, index) {
      if (!window.confirm(lang === 'th' ? 'ลบรายการนี้?' : 'Delete this entry?')) return;
      const cfg = cfgOf(key);
      setState(prev => {
        const next = { ...prev, [key]: (prev[key] || []).filter((_, i) => i !== index) };
        if (cfg && cfg.codeMap && prev[cfg.codeMap]) { const cm = { ...prev[cfg.codeMap] }; delete cm[(prev[key] || [])[index]]; next[cfg.codeMap] = cm; }
        return next;
      });
      toast(t('toast.deleted'), 'warn');
    }

    return React.createElement('div', null,
      React.createElement(PageHead, { title: lang === 'th' ? 'ทะเบียนคู่ค้า / พนักงาน' : 'Partners & staff registry', sub: lang === 'th' ? 'จัดการรายชื่อลูกค้า ผู้ขาย และพนักงานขาย สำหรับใช้เป็นตัวเลือกในฟอร์ม' : 'Manage customers, suppliers and sales reps used as form dropdowns' }),
      React.createElement('div', { className: 'grid g-3', style: { alignItems: 'start' } },
        LISTS.map(L => React.createElement('div', { key: L.key, className: 'card' },
          React.createElement('div', { className: 'card-h' },
            React.createElement(Icon, { name: L.icon, size: 15, style: { color: 'var(--primary)' } }),
            React.createElement('div', null, React.createElement('h3', null, lang === 'th' ? L.th : L.en), React.createElement('div', { className: 'sub' }, lang === 'th' ? L.subTh : L.subEn)),
            React.createElement('button', { className: 'btn btn-sm btn-pri card-h-actions', onClick: () => setModal({ listKey: L.key, mode: 'add', index: -1, value: '', code: '', codeTh: L.codeTh, codeEn: L.codeEn }) }, React.createElement(Icon, { name: 'plus', size: 13 }), t('btn.new'))),
          React.createElement('div', { style: { padding: 8, display: 'flex', flexDirection: 'column', gap: 6 } },
            listOf(L.key).length === 0
              ? React.createElement('div', { className: 'empty', style: { fontSize: 11 } }, lang === 'th' ? 'ยังไม่มีรายชื่อ' : 'No entries yet')
              : listOf(L.key).map((name, i) => React.createElement('div', { key: i, className: 'row', style: { justifyContent: 'space-between', gap: 8, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 7, padding: '8px 10px' } },
                  React.createElement('div', { style: { minWidth: 0, display: 'flex', alignItems: 'center', gap: 7 } },
                    L.codeMap && codeOf(L, name) && React.createElement('span', { className: 'badge badge-soft mono', style: { fontSize: 9.5, flexShrink: 0 } }, codeOf(L, name)),
                    React.createElement('span', { style: { fontSize: 12.5, fontWeight: 600, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, name)),
                  React.createElement('div', { className: 'row', style: { gap: 2, flexShrink: 0 } },
                    React.createElement('button', { className: 'btn btn-sm btn-ghost btn-icon', title: t('btn.edit'), onClick: () => setModal({ listKey: L.key, mode: 'edit', index: i, value: name, code: codeOf(L, name), codeTh: L.codeTh, codeEn: L.codeEn }) }, React.createElement(Icon, { name: 'edit', size: 13 })),
                    canDelete && React.createElement('button', { className: 'btn btn-sm btn-ghost btn-icon', title: t('btn.delete'), onClick: () => del(L.key, i) }, React.createElement(Icon, { name: 'trash', size: 13, style: { color: 'var(--danger)' } }))))))))),
      modal && React.createElement(PartnerModal, { modal, lang, t, onClose: () => setModal(null), onSubmit: save }));
  }

  function PartnerModal({ modal, lang, t, onClose, onSubmit }) {
    const [value, setValue] = React.useState(modal.value || '');
    const [code, setCode] = React.useState(modal.code || '');
    const hasCode = !!modal.codeTh;
    const submit = () => { if (value.trim()) onSubmit(Object.assign({}, modal, { value, code })); };
    return React.createElement(Modal, { title: (modal.mode === 'edit' ? (lang === 'th' ? 'แก้ไขรายชื่อ' : 'Edit entry') : (lang === 'th' ? 'เพิ่มรายชื่อ' : 'Add entry')), onClose, width: 420,
      footer: React.createElement(React.Fragment, null,
        React.createElement('button', { className: 'btn', onClick: onClose }, t('btn.cancel')),
        React.createElement('button', { className: 'btn btn-pri', disabled: !value.trim(), onClick: submit }, t('btn.save'))) },
      React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 12 } },
        React.createElement(Field, { label: lang === 'th' ? 'ชื่อ' : 'Name', required: true },
          React.createElement('input', { className: 'input', value: value, autoFocus: true, onChange: e => setValue(e.target.value), onKeyDown: e => { if (e.key === 'Enter') submit(); } })),
        hasCode && React.createElement(Field, { label: lang === 'th' ? modal.codeTh : modal.codeEn },
          React.createElement('input', { className: 'input mono', value: code, onChange: e => setCode(e.target.value), onKeyDown: e => { if (e.key === 'Enter') submit(); } }))));
  }

  window.PG_ItemMaster = ItemMaster;
  window.PG_BOM = BOM;
  window.PG_CustomerOrders = CustomerOrders;
  window.PG_Users = Users;
  window.PG_Partners = Partners;
})();
