/* ============================================================
   Module: FG Sales / Issue
   Deduct finished-good stock against a sales document (FIFO by lot)
   and log a sales-out report.
   ============================================================ */
(function () {
  const { useI18n } = window.PG_I18N;
  const { PageHead, Icon, fmt, fmtDate, DateField, Modal, Field, useToast, Stat } = window.PG_UI;
  const D = window.PG_DATA;
  const e = React.createElement;

  function FGSales({ state, setState }) {
    const { t, lang } = useI18n();
    const toast = useToast();
    const [show, setShow] = React.useState(false);

    const sales = state.fgSales || [];
    const totalOut = sales.reduce((a, s) => a + s.lines.reduce((b, l) => b + l.qty, 0), 0);
    const fgTotal = state.fgStock.reduce((a, x) => a + x.qty, 0);

    function commit(form) {
      setState(prev => {
        // deduct each line from its specific chosen lot
        let fgStock = prev.fgStock.map(x => ({ ...x }));
        form.lines.forEach(ln => {
          const s = fgStock.find(x => x.fg === ln.fg && x.lot === ln.lot);
          if (s) s.qty = Math.max(0, s.qty - ln.qty);
        });
        fgStock = fgStock.filter(x => x.qty > 0);
        const rec = { id: form.id.trim(), customer: form.customer, rep: form.rep, date: form.date,
          lines: form.lines.map(l => ({ ...l })), total: form.lines.reduce((a, l) => a + l.qty, 0) };
        return { ...prev, fgStock, fgSales: [rec, ...(prev.fgSales || [])] };
      });
      toast(t('toast.sold')); setShow(false);
    }

    return e('div', null,
      e(PageHead, { title: t('fgs.title'), sub: t('fgs.sub'),
        actions: e('button', { className: 'btn btn-pri', onClick: () => setShow(true) }, e(Icon, { name: 'plus', size: 15 }), t('fgs.new')) }),

      e('div', { className: 'grid g-4', style: { marginBottom: 'var(--gap)' } },
        e(Stat, { label: t('fgs.docs'), value: sales.length, accent: 'var(--primary)', icon: 'orders' }),
        e(Stat, { label: t('fgs.totalout'), value: fmt(totalOut), unit: t('u.pcs'), accent: 'var(--st-completed)', icon: 'export' }),
        e(Stat, { label: t('db.fgstock'), value: fmt(fgTotal), unit: t('u.pcs'), accent: 'var(--st-scheduled)', icon: 'fg' }),
        e(Stat, { label: t('f.product'), value: state.fg.length, accent: 'var(--st-waiting)', icon: 'items' })),

      e('div', { className: 'grid g-12' },
        // Sales documents / report
        e('div', { className: 'span-8' },
          e('div', { className: 'card' },
            e('div', { className: 'card-h' }, e(Icon, { name: 'export', size: 15, style: { color: 'var(--primary)' } }), e('h3', null, t('fgs.report')),
              e('span', { className: 'card-h-actions badge badge-soft' }, sales.length + ' ' + t('fgs.docs'))),
            sales.length === 0
              ? e('div', { className: 'empty' }, e(Icon, { name: 'export', size: 24 }), e('div', { style: { marginTop: 8 } }, t('tbl.noresults')))
              : e('table', { className: 'tbl' },
                  e('thead', null, e('tr', null,
                    e('th', null, t('fgs.docno')), e('th', null, t('f.date')), e('th', null, t('f.customer')),
                    e('th', null, t('fgs.salesrep')), e('th', null, t('f.product')), e('th', { className: 'num' }, t('fgs.totalout')))),
                  e('tbody', null, sales.map(s => e('tr', { key: s.id },
                    e('td', { className: 'mono', style: { fontWeight: 600, color: 'var(--primary)' } }, s.id),
                    e('td', { className: 'mono faint' }, fmtDate(s.date)),
                    e('td', null, s.customer),
                    e('td', null, s.rep || '—'),
                    e('td', null, e('div', { style: { display: 'flex', flexDirection: 'column', gap: 2 } },
                      s.lines.map((l, i) => e('span', { key: i, style: { fontSize: 11.5 } },
                        D.fgName(state, l.fg, lang),
                        l.lot && e('span', { className: 'mono faint', style: { marginLeft: 5, fontSize: 10 } }, '[' + l.lot + ']'),
                        e('span', { className: 'mono faint', style: { marginLeft: 6 } }, '×' + fmt(l.qty)))))),
                    e('td', { className: 'num mono', style: { fontWeight: 700, color: 'var(--st-completed)' } }, fmt(s.total))))))) ),

        // Current FG stock
        e('div', { className: 'span-4' },
          e('div', { className: 'card' },
            e('div', { className: 'card-h' }, e(Icon, { name: 'fg', size: 15, style: { color: 'var(--primary)' } }), e('h3', null, t('db.fgstock'))),
            e('table', { className: 'tbl' },
              e('thead', null, e('tr', null, e('th', null, t('f.product')), e('th', { className: 'num' }, t('f.onhand')))),
              e('tbody', null, state.fg.map(f => {
                const oh = D.fgOnHand(state, f.code);
                return e('tr', { key: f.code },
                  e('td', { style: { fontWeight: 600 } }, lang === 'th' ? f.nameTh : f.name),
                  e('td', { className: 'num mono', style: { fontWeight: 600, color: oh > 0 ? 'var(--text)' : 'var(--text-faint)' } }, fmt(oh)));
              }))))) ),

      show && e(SalesModal, { state, t, lang, onClose: () => setShow(false), onSubmit: commit }));
  }

  function SalesModal({ state, t, lang, onClose, onSubmit }) {
    const e = React.createElement;
    const lotsFor = (fg) => state.fgStock.filter(x => x.fg === fg && x.qty > 0);
    const lotQty = (fg, lot) => { const s = state.fgStock.find(x => x.fg === fg && x.lot === lot); return s ? s.qty : 0; };
    // default to first FG that has stock
    const firstFg = (state.fg.find(x => lotsFor(x.code).length > 0) || state.fg[0]).code;
    const firstLot = (lotsFor(firstFg)[0] || {}).lot || '';
    const [f, setF] = React.useState({ id: '', customer: '', rep: '', date: state.today, lines: [{ fg: firstFg, lot: firstLot, qty: '' }] });
    const set = (k, v) => setF(p => ({ ...p, [k]: v }));
    const setLine = (i, k, v) => setF(p => ({ ...p, lines: p.lines.map((l, idx) => {
      if (idx !== i) return l;
      const nl = { ...l, [k]: v };
      // when product changes, reset to its first available lot
      if (k === 'fg') { nl.lot = (lotsFor(v)[0] || {}).lot || ''; }
      return nl;
    }) }));
    const addLine = () => setF(p => ({ ...p, lines: [...p.lines, { fg: firstFg, lot: firstLot, qty: '' }] }));
    const delLine = (i) => setF(p => ({ ...p, lines: p.lines.filter((_, idx) => idx !== i) }));

    const lineErr = (l) => { const q = +l.qty; if (!q || q <= 0) return true; if (!l.lot) return true; return q > lotQty(l.fg, l.lot); };
    const valid = f.id.trim() && f.customer.trim() && f.lines.length > 0 && f.lines.every(l => !lineErr(l));

    const rows = f.lines.map((l, i) => {
      const lots = lotsFor(l.fg);
      const avail = lotQty(l.fg, l.lot);
      const over = +l.qty > avail;
      return e('div', { key: i, style: { display: 'grid', gridTemplateColumns: '1fr 130px 110px 32px', gap: 8, alignItems: 'start' } },
        e('select', { className: 'select', value: l.fg, onChange: ev => setLine(i, 'fg', ev.target.value) },
          state.fg.map(x => e('option', { key: x.code, value: x.code }, (lang === 'th' ? x.nameTh : x.name) + ' (' + t('f.onhand') + ' ' + fmt(D.fgOnHand(state, x.code)) + ')'))),
        e('select', { className: 'select mono', value: l.lot, onChange: ev => setLine(i, 'lot', ev.target.value), disabled: lots.length === 0 },
          lots.length === 0
            ? [e('option', { key: 'none', value: '' }, lang === 'th' ? '— ไม่มีล็อต —' : '— no lots —')]
            : lots.map(s => e('option', { key: s.lot, value: s.lot }, s.lot + ' · ' + fmt(s.qty)))),
        e('div', null,
          e('input', { className: 'input mono', type: 'number', value: l.qty, placeholder: '0', max: avail, onChange: ev => setLine(i, 'qty', ev.target.value),
            style: over ? { borderColor: 'var(--danger)', boxShadow: '0 0 0 3px var(--danger-tint)' } : null }),
          over && e('div', { style: { fontSize: 10, color: 'var(--danger)', marginTop: 2 } }, t('fgs.nostock'))),
        e('button', { className: 'btn btn-sm btn-ghost btn-icon', disabled: f.lines.length === 1, onClick: () => delLine(i) }, e(Icon, { name: 'trash', size: 14 })));
    });

    return e(Modal, { title: t('fgs.new'), onClose, width: 620,
      footer: e(React.Fragment, null,
        e('button', { className: 'btn', onClick: onClose }, t('btn.cancel')),
        e('button', { className: 'btn btn-pri', disabled: !valid, onClick: () => onSubmit({ ...f, lines: f.lines.map(l => ({ fg: l.fg, lot: l.lot, qty: +l.qty })) }) },
          e(Icon, { name: 'export', size: 14 }), t('fgs.confirm'))) },
      e('div', { className: 'grid g-2', style: { gap: 12, marginBottom: 16 } },
        e('div', { style: { gridColumn: 'span 2' } }, e(Field, { label: t('fgs.docno'), required: true, hint: lang === 'th' ? 'เช่น INV-2026-001' : 'e.g. INV-2026-001' },
          e('input', { className: 'input mono', value: f.id, onChange: ev => set('id', ev.target.value), placeholder: 'INV-____' }))),
        e(Field, { label: t('f.customer'), required: true }, e('input', { className: 'input', value: f.customer, onChange: ev => set('customer', ev.target.value), placeholder: lang === 'th' ? 'ชื่อลูกค้า' : 'Customer name' })),
        e(Field, { label: t('f.date'), required: true }, e(DateField, { value: f.date, onChange: v => set('date', v) })),
        e('div', { style: { gridColumn: 'span 2' } }, e(Field, { label: t('fgs.salesrep') }, e('input', { className: 'input', value: f.rep, onChange: ev => set('rep', ev.target.value), placeholder: lang === 'th' ? 'ชื่อพนักงานขาย' : 'Sales rep name' })))),
      e('div', { style: { borderTop: '1px solid var(--border)', paddingTop: 12 } },
        e('div', { className: 'row', style: { marginBottom: 8 } },
          e('span', { style: { fontSize: 12, fontWeight: 700 } }, t('fgs.line')),
          e('button', { className: 'btn btn-sm', style: { marginLeft: 'auto' }, onClick: addLine }, e(Icon, { name: 'plus', size: 13 }), t('fgs.additem'))),
        e('div', { style: { display: 'grid', gridTemplateColumns: '1fr 130px 110px 32px', gap: 8, marginBottom: 6, fontSize: 10, fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '.4px' } },
          e('span', null, t('f.product')), e('span', null, t('f.lot')), e('span', null, t('f.qty')), e('span', null, '')),
        e('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } }, rows)));
  }

  window.PG_FGSales = FGSales;
})();
