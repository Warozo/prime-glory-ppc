/* ============================================================
   Module: Warehouse — Receiving + Material Issue (HERO)
   ============================================================ */
(function () {
  const { useI18n } = window.PG_I18N;
  const { PageHead, Icon, fmt, fmtDate, DateField, Modal, Field, useToast, Stat } = window.PG_UI;
  const D = window.PG_DATA;

  /* ---------------- Raw Material Receiving ---------------- */
  function Receiving({ state, setState }) {
    const { t, lang } = useI18n();
    const toast = useToast();
    const [show, setShow] = React.useState(false);

    const nearExp = state.lots.filter(l => { const d = (new Date(l.expiry) - new Date(state.today)) / 864e5; return d <= 30 && l.remaining > 0; });

    // filter for the recent-receipts table
    const [fq, setFq] = React.useState('');
    const [fFrom, setFFrom] = React.useState('');
    const [fTo, setFTo] = React.useState('');
    const [fSup, setFSup] = React.useState('');
    const rNeedle = fq.trim().toLowerCase();
    const recFiltered = state.receipts.filter(r => {
      if (fSup && r.supplier !== fSup) return false;
      if (fFrom && (r.recv || '') < fFrom) return false;
      if (fTo && (r.recv || '') > fTo) return false;
      if (rNeedle) { const hay = (r.id + ' ' + (r.supplier || '') + ' ' + D.rmName(state, r.rm, lang) + ' ' + r.rm + ' ' + (r.lot || '')).toLowerCase(); if (hay.indexOf(rNeedle) < 0) return false; }
      return true;
    });
    const recSuppliers = Array.from(new Set(state.receipts.map(r => r.supplier).filter(Boolean)));

    function receive(form) {
      const id = (form.id || '').trim();
      if (!id) { toast(lang === 'th' ? 'กรอกเลขที่ GR' : 'Enter GR number', 'warn'); return; }
      if (state.receipts.some(r => r.id === id)) { toast(lang === 'th' ? 'เลขที่ GR ซ้ำ' : 'GR number already exists', 'warn'); return; }
      const lotId = D.genId('L');
      setState(prev => ({ ...prev,
        receipts: [{ id, recv: form.recv, supplier: form.supplier, rm: form.rm, qty: +form.qty, lot: form.lot, expiry: form.expiry }, ...prev.receipts],
        lots: [{ id: lotId, rm: form.rm, supplier: form.supplier, qty: +form.qty, remaining: +form.qty, lot: form.lot, expiry: form.expiry, recv: form.recv }, ...prev.lots],
      }));
      toast(t('toast.received')); setShow(false);
    }

    return React.createElement('div', null,
      React.createElement(PageHead, { title: t('wh.recv.title'), sub: t('wh.recv.sub'),
        actions: React.createElement('button', { className: 'btn btn-pri', onClick: () => setShow(true) }, React.createElement(Icon, { name: 'plus', size: 15 }), t('btn.receive')) }),
      React.createElement('div', { className: 'grid g-4', style: { marginBottom: 'var(--gap)' } },
        React.createElement(Stat, { label: t('wh.batches'), value: state.lots.filter(l => l.remaining > 0).length, accent: 'var(--primary)', icon: 'box' }),
        React.createElement(Stat, { label: t('db.rmstock'), value: state.raw.length, unit: t('rawmat'), accent: 'var(--st-scheduled)', icon: 'items' }),
        React.createElement(Stat, { label: t('db.nearexpiry'), value: nearExp.length, accent: 'var(--warn)', icon: 'clock', foot: '≤ 30 ' + (lang === 'th' ? 'วัน' : 'days') }),
        React.createElement(Stat, { label: t('wh.recentrecv'), value: state.receipts.length, accent: 'var(--st-completed)', icon: 'receive' })),
      React.createElement('div', { className: 'grid g-12' },
        React.createElement('div', { className: 'span-7' },
          React.createElement('div', { className: 'card' },
            React.createElement('div', { className: 'card-h' }, React.createElement(Icon, { name: 'receive', size: 15, style: { color: 'var(--primary)' } }), React.createElement('h3', null, t('wh.recentrecv'))),
            React.createElement('div', { style: { padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' } },
              React.createElement('input', { className: 'input', style: { flex: '1 1 150px', minWidth: 120 }, placeholder: lang === 'th' ? 'ค้นหา GR# / ชื่อ / ล็อต / ผู้ขาย' : 'Search GR# / name / lot / supplier', value: fq, onChange: e => setFq(e.target.value) }),
              React.createElement(DateField, { value: fFrom, onChange: setFFrom, style: { width: 130 } }),
              React.createElement('span', { className: 'faint' }, '–'),
              React.createElement(DateField, { value: fTo, onChange: setFTo, style: { width: 130 } }),
              React.createElement('select', { className: 'select', style: { width: 150 }, value: fSup, onChange: e => setFSup(e.target.value) },
                [React.createElement('option', { key: '_all', value: '' }, lang === 'th' ? 'ทุกผู้ขาย' : 'All suppliers')].concat(recSuppliers.map(s => React.createElement('option', { key: s, value: s }, s)))),
              React.createElement('span', { className: 'badge badge-soft', style: { fontSize: 11 } }, recFiltered.length + ' / ' + state.receipts.length),
              (fq || fFrom || fTo || fSup) && React.createElement('button', { className: 'btn btn-sm', onClick: () => { setFq(''); setFFrom(''); setFTo(''); setFSup(''); } }, lang === 'th' ? 'ล้าง' : 'Clear')),
            React.createElement('table', { className: 'tbl' },
              React.createElement('thead', null, React.createElement('tr', null,
                ['id', 'date', 'supplier', 'item', 'qty', 'lot', 'expiry'].map((k, i) => React.createElement('th', { key: k, className: i === 4 ? 'num' : '' },
                  k === 'id' ? 'GR#' : t('f.' + (k === 'date' ? 'date' : k === 'item' ? 'name' : k === 'qty' ? 'qty' : k))) ))),
              React.createElement('tbody', null,
                recFiltered.map(r => React.createElement('tr', { key: r.id },
                  React.createElement('td', { className: 'mono', style: { fontWeight: 600, color: 'var(--primary)' } }, r.id),
                  React.createElement('td', { className: 'mono faint' }, fmtDate(r.recv)),
                  React.createElement('td', null, r.supplier),
                  React.createElement('td', null, React.createElement('div', { style: { fontWeight: 600 } }, D.rmName(state, r.rm, lang)), React.createElement('div', { className: 'mono faint', style: { fontSize: 10 } }, r.rm)),
                  React.createElement('td', { className: 'num mono', style: { fontWeight: 600 } }, fmt(r.qty)),
                  React.createElement('td', { className: 'mono' }, r.lot),
                  React.createElement('td', { className: 'mono faint' }, r.expiry)))))) ),
        React.createElement('div', { className: 'span-5' },
          React.createElement('div', { className: 'card' },
            React.createElement('div', { className: 'card-h' }, React.createElement(Icon, { name: 'box', size: 15, style: { color: 'var(--primary)' } }), React.createElement('h3', null, t('wh.batches'))),
            React.createElement('div', { style: { maxHeight: 360, overflowY: 'auto' } },
              React.createElement('table', { className: 'tbl' },
                React.createElement('thead', null, React.createElement('tr', null, React.createElement('th', null, t('f.lot')), React.createElement('th', { className: 'num' }, t('f.available')), React.createElement('th', null, t('f.expiry')))),
                React.createElement('tbody', null,
                  state.lots.filter(l => l.remaining > 0).map(l => {
                    const days = Math.round((new Date(l.expiry) - new Date(state.today)) / 864e5);
                    return React.createElement('tr', { key: l.id },
                      React.createElement('td', null, React.createElement('div', { style: { fontWeight: 600 } }, D.rmName(state, l.rm, lang)), React.createElement('div', { className: 'mono faint', style: { fontSize: 10 } }, l.lot)),
                      React.createElement('td', { className: 'num mono', style: { fontWeight: 600 } }, fmt(l.remaining) + ' ' + D.rmUnit(state, l.rm)),
                      React.createElement('td', null, React.createElement('span', { className: 'badge', style: { color: days <= 14 ? 'var(--danger)' : days <= 30 ? 'var(--warn)' : 'var(--text-muted)', background: days <= 14 ? 'var(--danger-tint)' : days <= 30 ? 'var(--warn-tint)' : 'var(--surface-3)' } }, fmtDate(l.expiry) + ' · ' + days + (lang === 'th' ? ' วัน' : 'd'))));
                  })))))) ),
      show && React.createElement(ReceiveModal, { state, t, lang, onClose: () => setShow(false), onSubmit: receive }));
  }

  function ReceiveModal({ state, t, lang, onClose, onSubmit }) {
    const [f, setF] = React.useState({ id: '', recv: state.today, supplier: '', rm: state.raw[0].code, qty: '', lot: '', expiry: '' });
    const set = (k, v) => setF(p => ({ ...p, [k]: v }));
    const valid = f.id.trim() && f.qty && f.lot && f.expiry && f.supplier.trim();
    return React.createElement(Modal, { title: t('wh.recv.title'), onClose, width: 540,
      footer: React.createElement(React.Fragment, null,
        React.createElement('button', { className: 'btn', onClick: onClose }, t('btn.cancel')),
        React.createElement('button', { className: 'btn btn-pri', disabled: !valid, onClick: () => onSubmit(f) }, React.createElement(Icon, { name: 'check', size: 14 }), t('btn.receive'))) },
      React.createElement('div', { className: 'grid g-2', style: { gap: 12 } },
        React.createElement('div', { style: { gridColumn: 'span 2' } }, React.createElement(Field, { label: 'GR#', required: true, hint: lang === 'th' ? 'กรอกเลขที่เอกสารรับเข้าเอง เช่น GR-3652' : 'Enter your own GR number, e.g. GR-3652' }, React.createElement('input', { className: 'input mono', value: f.id, onChange: e => set('id', e.target.value), placeholder: 'GR-____' }))),
        React.createElement(Field, { label: t('f.date'), required: true }, React.createElement(DateField, { value: f.recv, onChange: v => set('recv', v) })),
        React.createElement(Field, { label: t('f.supplier'), required: true, hint: (state.suppliers || []).length === 0 ? (lang === 'th' ? 'เพิ่มผู้ขายได้ที่ ทะเบียนคู่ค้า/พนักงาน' : 'Add suppliers in the Partners registry') : null },
          React.createElement('select', { className: 'select', value: f.supplier, onChange: e => set('supplier', e.target.value) },
            [React.createElement('option', { key: '', value: '' }, lang === 'th' ? '— เลือกผู้ขาย —' : '— select supplier —')].concat((state.suppliers || []).map(sp => React.createElement('option', { key: sp, value: sp }, sp))))),
        React.createElement('div', { style: { gridColumn: 'span 2' } }, React.createElement(Field, { label: t('rawmat'), required: true },
          React.createElement('select', { className: 'select', value: f.rm, onChange: e => set('rm', e.target.value) },
            state.raw.map(r => React.createElement('option', { key: r.code, value: r.code }, r.code + ' · ' + (lang === 'th' ? r.nameTh : r.name) + ' (' + r.unit + ')'))))),
        React.createElement(Field, { label: t('f.qty'), required: true }, React.createElement('input', { className: 'input mono', type: 'number', value: f.qty, onChange: e => set('qty', e.target.value), placeholder: '0' })),
        React.createElement(Field, { label: t('f.lot'), required: true }, React.createElement('input', { className: 'input mono', value: f.lot, onChange: e => set('lot', e.target.value), placeholder: 'e.g. RH26-0500' })),
        React.createElement('div', { style: { gridColumn: 'span 2' } }, React.createElement(Field, { label: t('f.expiry'), required: true }, React.createElement(DateField, { value: f.expiry, onChange: v => set('expiry', v) })))));
  }

  window.PG_Receiving = Receiving;
})();
