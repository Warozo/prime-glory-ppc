/* ============================================================
   Module: Material Issue (rewrite)
   - Issue by Production Order with per-lot selection (FEFO default)
   - Additional issue with lot selection
   - Transaction log of all issues
   ============================================================ */
(function () {
  const { useI18n } = window.PG_I18N;
  const { PageHead, Icon, fmt, fmtDate, Modal, Field, useToast } = window.PG_UI;
  const D = window.PG_DATA;
  const e = React.createElement;

  function Issue({ state, setState }) {
    const { t, lang } = useI18n();
    const toast = useToast();
    const [tab, setTab] = React.useState('po');
    const issuablePOs = state.prodOrders.filter(p => p.status === 'reserved' || p.status === 'issued');
    const [poId, setPoId] = React.useState(issuablePOs[0] ? issuablePOs[0].id : null);
    const po = state.prodOrders.find(p => p.id === poId);
    const isIssued = po && po.status !== 'reserved';
    const req = po ? D.bomRequirement(state, po.fg, po.qty, true) : [];

    const [picker, setPicker] = React.useState(null); // {mode:'po'|'add', ...}
    const [add, setAdd] = React.useState({ rm: state.raw[0].code, reason: 'loss', po: '' });
    const reasons = lang === 'th'
      ? { loss: 'วัตถุดิบสูญเสีย', rework: 'งานแก้ไข (Rework)', adjust: 'ปรับยอดการผลิต' }
      : { loss: 'Material loss', rework: 'Rework', adjust: 'Production adjustment' };

    const nowTime = () => { const n = new Date(); return String(n.getHours()).padStart(2, '0') + ':' + String(n.getMinutes()).padStart(2, '0'); };

    // Commit a PO issue: picks = { rmCode: [{lotId, qty}] }
    function commitPO(picks) {
      setState(prev => {
        const lots = prev.lots.map(l => ({ ...l }));
        const reserved = { ...(prev.reservedByRm || {}) };
        const txns = [];
        const time = nowTime();
        Object.keys(picks).forEach(rm => {
          const lotMap = picks[rm] || {};
          Object.keys(lotMap).forEach(lotId => {
            const q = lotMap[lotId];
            if (!q || q <= 0) return;
            const lot = lots.find(l => l.id === lotId);
            if (!lot) return;
            const take = Math.min(lot.remaining, q);
            lot.remaining = +(lot.remaining - take).toFixed(3);
            txns.push({ id: D.genId('ISS'), date: prev.today, time, type: 'po', ref: poId, order: po.order, rm, lot: lot.lot, qty: take, unit: D.rmUnit(prev, rm), reason: '' });
          });
          const r = req.find(x => x.rm === rm);
          if (r) reserved[rm] = +(Math.max(0, (reserved[rm] || 0) - r.need).toFixed(2));
        });
        const prodOrders = prev.prodOrders.map(p => p.id === poId ? { ...p, status: 'issued' } : p);
        return { ...prev, lots, reservedByRm: reserved, prodOrders, issues: [...txns, ...(prev.issues || [])] };
      });
      toast(t('toast.issued')); setPicker(null);
    }

    // Commit an additional issue: { rm, reason, po, picks:[{lotId, qty}] }
    function commitAdd(form) {
      setState(prev => {
        const lots = prev.lots.map(l => ({ ...l }));
        const txns = []; const time = nowTime();
        form.picks.forEach(p => {
          if (p.qty <= 0) return;
          const lot = lots.find(l => l.id === p.lotId); if (!lot) return;
          const take = Math.min(lot.remaining, p.qty);
          lot.remaining = +(lot.remaining - take).toFixed(3);
          txns.push({ id: D.genId('ISS'), date: prev.today, time, type: 'add', ref: form.po || '', order: '', rm: form.rm, lot: lot.lot, qty: take, unit: D.rmUnit(prev, form.rm), reason: reasons[form.reason] });
        });
        return { ...prev, lots, issues: [...txns, ...(prev.issues || [])] };
      });
      toast(t('toast.issued')); setPicker(null);
    }

    const head = e(PageHead, { title: t('wh.issue.title'), sub: t('wh.issue.sub'),
      actions: e('div', { className: 'pill-tabs' },
        e('button', { className: tab === 'po' ? 'on' : '', onClick: () => setTab('po') }, t('wh.issue.bypo')),
        e('button', { className: tab === 'add' ? 'on' : '', onClick: () => setTab('add') }, t('wh.issue.add')),
        e('button', { className: tab === 'log' ? 'on' : '', onClick: () => setTab('log') }, t('wh.issue.log'))) });

    // ---- PO list ----
    const poList = e('div', { className: 'card' },
      e('div', { className: 'card-h' }, e(Icon, { name: 'issue', size: 15, style: { color: 'var(--primary)' } }), e('h3', null, t('f.po'))),
      e('div', { style: { padding: 8, display: 'flex', flexDirection: 'column', gap: 6 } },
        issuablePOs.length === 0 ? e('div', { className: 'empty', style: { fontSize: 11 } }, lang === 'th' ? 'ยังไม่มีใบสั่งผลิตรอเบิก' : 'No production orders to issue') :
        issuablePOs.map(p => e('button', { key: p.id, onClick: () => setPoId(p.id),
          style: { textAlign: 'left', background: poId === p.id ? 'var(--primary-tint)' : 'var(--surface-2)', border: '1px solid ' + (poId === p.id ? 'var(--primary)' : 'var(--border)'), borderRadius: 7, padding: 9, cursor: 'pointer' } },
          e('div', { className: 'row', style: { justifyContent: 'space-between' } },
            e('span', { className: 'mono', style: { fontSize: 11, fontWeight: 700, color: 'var(--primary)' } }, p.id),
            e('span', { className: 'badge', style: { fontSize: 9.5, color: p.status !== 'reserved' ? 'var(--ok)' : 'var(--st-reserved)', background: p.status !== 'reserved' ? 'var(--ok-tint)' : 'var(--primary-tint)' } }, p.status !== 'reserved' ? '✓ ' + t('btn.issued') : t('status.reserved'))),
          e('div', { style: { fontSize: 12, fontWeight: 600, marginTop: 2 } }, D.fgName(state, p.fg, lang)),
          e('div', { className: 'mono faint', style: { fontSize: 10, marginTop: 2 } }, (p.order || '') + ' · ' + fmt(p.qty) + ' ' + t('u.pcs'))))));

    // ---- PO detail ----
    const reqRows = req.map(r => e('tr', { key: r.rm },
      e('td', null, e('div', { style: { fontWeight: 600 } }, D.rmName(state, r.rm, lang)), e('div', { className: 'mono faint', style: { fontSize: 10 } }, r.rm)),
      e('td', { className: 'num mono', style: { fontWeight: 600 } }, fmt(r.need) + ' ' + r.unit),
      e('td', { className: 'num mono' }, fmt(r.onHand) + ' ' + r.unit),
      e('td', null, isIssued
        ? e('span', { className: 'badge', style: { color: 'var(--ok)', background: 'var(--ok-tint)' } }, '✓ ' + t('btn.issued'))
        : e('span', { className: 'badge', style: { color: r.short > 0 ? 'var(--danger)' : 'var(--ok)', background: r.short > 0 ? 'var(--danger-tint)' : 'var(--ok-tint)' } }, r.short > 0 ? t('f.shortage') : '✓ ' + t('f.available')))));
    const poDetail = po && e('div', { className: 'card' },
      e('div', { className: 'card-h' },
        e(Icon, { name: 'calc', size: 15, style: { color: 'var(--primary)' } }),
        e('div', null, e('h3', null, t('wh.issue.bypo') + ' · ' + po.id), e('div', { className: 'sub' }, isIssued ? '✓ ' + t('status.issued') + ' · ' + (lang === 'th' ? 'ไปจัดตารางได้' : 'ready to schedule') : t('wh.issue.auto') + ' · BOM ' + state.boms[po.fg].version)),
        e('div', { className: 'card-h-actions' }, isIssued
          ? e('span', { className: 'badge', style: { color: 'var(--ok)', background: 'var(--ok-tint)' } }, e(Icon, { name: 'checkcircle', size: 13 }), t('btn.issued'))
          : e('button', { className: 'btn btn-pri', onClick: () => setPicker({ mode: 'po' }) }, e(Icon, { name: 'issue', size: 14 }), t('wh.issue.selectlot')))),
      e('table', { className: 'tbl' },
        e('thead', null, e('tr', null, e('th', null, t('rawmat')), e('th', { className: 'num' }, isIssued ? t('btn.issued') : t('f.required')), e('th', { className: 'num' }, t('f.onhand')), e('th', null, t('f.status')))),
        e('tbody', null, reqRows)));
    const poView = e('div', { style: { display: 'grid', gridTemplateColumns: '230px 1fr', gap: 14, alignItems: 'start' } }, poList, poDetail);

    // ---- Additional issue ----
    const addLots = D.rmLotsFEFO(state, add.rm);
    const activePOs = state.prodOrders.filter(p => p.status === 'reserved' || p.status === 'issued' || p.status === 'inprogress' || p.status === 'scheduled');
    const addView = e('div', { style: { maxWidth: 600 } },
      e('div', { className: 'card' },
        e('div', { className: 'card-h' }, e(Icon, { name: 'issue', size: 15, style: { color: 'var(--warn)' } }), e('h3', null, t('wh.issue.add'))),
        e('div', { className: 'card-b', style: { display: 'flex', flexDirection: 'column', gap: 14 } },
          e(Field, { label: t('f.po'), required: true, hint: lang === 'th' ? 'ระบุใบสั่งผลิตที่ต้องเบิกวัตถุดิบไปใช้' : 'Production order this issue is for' },
            activePOs.length === 0
              ? e('div', { className: 'faint', style: { fontSize: 12 } }, lang === 'th' ? 'ยังไม่มีใบสั่งผลิตที่กำลังผลิต' : 'No active production orders')
              : e('select', { className: 'select', value: add.po, onChange: ev => setAdd(a => ({ ...a, po: ev.target.value })) },
                  [e('option', { key: '', value: '' }, lang === 'th' ? '— เลือกใบสั่งผลิต —' : '— select PO —')].concat(
                    activePOs.map(p => e('option', { key: p.id, value: p.id }, p.id + ' · ' + D.fgName(state, p.fg, lang) + ' (' + fmt(p.qty) + ' ' + t('u.pcs') + ')'))))),
          e(Field, { label: t('rawmat'), required: true },
            e('select', { className: 'select', value: add.rm, onChange: ev => setAdd(a => ({ ...a, rm: ev.target.value })) },
              state.raw.map(r => e('option', { key: r.code, value: r.code }, r.code + ' · ' + (lang === 'th' ? r.nameTh : r.name) + ' (' + t('f.available') + ' ' + fmt(D.rmOnHand(state, r.code)) + ' ' + r.unit + ')')))),
          e(Field, { label: t('f.reason'), required: true },
            e('select', { className: 'select', value: add.reason, onChange: ev => setAdd(a => ({ ...a, reason: ev.target.value })) },
              Object.keys(reasons).map(k => e('option', { key: k, value: k }, reasons[k])))),
          e('div', { style: { fontSize: 11.5, color: 'var(--text-muted)' } }, lang === 'th' ? 'เลือกล็อตที่จะเบิก (เรียงตามวันหมดอายุก่อน-หลัง)' : 'Pick lots to issue (sorted earliest-expiry first)'),
          e('button', { className: 'btn btn-pri', style: { alignSelf: 'flex-start' }, disabled: addLots.length === 0 || !add.po, onClick: () => setPicker({ mode: 'add' }) },
            e(Icon, { name: 'issue', size: 14 }), t('wh.issue.selectlot')))));

    // ---- Transaction log ----
    const issues = state.issues || [];
    const logView = e('div', { className: 'card' },
      e('div', { className: 'card-h' }, e(Icon, { name: 'clock', size: 15, style: { color: 'var(--primary)' } }), e('h3', null, t('wh.issue.log')),
        e('span', { className: 'card-h-actions badge badge-soft' }, issues.length + ' ' + (lang === 'th' ? 'รายการ' : 'records'))),
      issues.length === 0
        ? e('div', { className: 'empty', style: { fontSize: 12 } }, e(Icon, { name: 'clock', size: 22 }), e('div', { style: { marginTop: 8 } }, t('tbl.noresults')))
        : e('table', { className: 'tbl' },
            e('thead', null, e('tr', null,
              e('th', null, t('f.date')), e('th', { style: { width: 54 } }, t('f.time')), e('th', null, t('wh.issue.type')),
              e('th', null, t('rawmat')), e('th', null, t('f.lot')), e('th', { className: 'num' }, t('f.qty')), e('th', null, t('wh.issue.refcol')))),
            e('tbody', null, issues.map(x => e('tr', { key: x.id },
              e('td', { className: 'mono faint' }, fmtDate(x.date)),
              e('td', { className: 'mono faint' }, x.time),
              e('td', null, e('span', { className: 'badge', style: { color: x.type === 'po' ? 'var(--primary)' : 'var(--warn)', background: x.type === 'po' ? 'var(--primary-tint)' : 'var(--warn-tint)' } }, x.type === 'po' ? t('wh.issue.bypo') : t('wh.issue.add'))),
              e('td', null, e('div', { style: { fontWeight: 600 } }, D.rmName(state, x.rm, lang)), e('div', { className: 'mono faint', style: { fontSize: 10 } }, x.rm)),
              e('td', { className: 'mono' }, x.lot),
              e('td', { className: 'num mono', style: { fontWeight: 700, color: 'var(--danger)' } }, '-' + fmt(x.qty) + ' ' + x.unit),
              e('td', { className: 'mono faint', style: { fontSize: 11 } }, x.type === 'po' ? x.ref : ((x.ref ? x.ref + ' · ' : '') + x.reason))))) ));

    return e('div', null, head,
      tab === 'po' ? poView : tab === 'add' ? addView : logView,
      picker && picker.mode === 'po' && e(LotPickerPO, { state, t, lang, req, onClose: () => setPicker(null), onSubmit: commitPO }),
      picker && picker.mode === 'add' && e(LotPickerAdd, { state, t, lang, rm: add.rm, reason: add.reason, po: add.po, reasons, onClose: () => setPicker(null), onSubmit: commitAdd }));
  }

  // Build FEFO default allocation for a needed qty across lots
  function fefoAlloc(lots, need) {
    const picks = {}; let rem = need;
    for (const l of lots) { if (rem <= 1e-9) break; const take = Math.min(l.remaining, rem); picks[l.id] = +take.toFixed(3); rem -= take; }
    return picks;
  }

  // Lot picker for PO: one allocation per required RM
  function LotPickerPO({ state, t, lang, req, onClose, onSubmit }) {
    const initial = {};
    req.forEach(r => { const lots = D.rmLotsFEFO(state, r.rm); initial[r.rm] = fefoAlloc(lots, r.need); });
    const [alloc, setAlloc] = React.useState(initial);
    const submitGuard = React.useRef(false);
    const setQ = (rm, lotId, v) => setAlloc(a => ({ ...a, [rm]: { ...a[rm], [lotId]: Math.max(0, +v || 0) } }));
    const allocSum = (rm) => Object.values(alloc[rm] || {}).reduce((s, q) => s + q, 0);
    const valid = req.every(r => Math.abs(allocSum(r.rm) - r.need) < 0.001);
    const submit = () => { if (!valid || submitGuard.current) return; submitGuard.current = true; onSubmit(alloc); };

    const body = req.map(r => {
      const lots = D.rmLotsFEFO(state, r.rm);
      return e('div', { key: r.rm, style: { border: '1px solid var(--border)', borderRadius: 8, padding: 12, marginBottom: 12 } },
        e('div', { className: 'row', style: { justifyContent: 'space-between', marginBottom: 8 } },
          e('div', null, e('b', { style: { fontSize: 13 } }, D.rmName(state, r.rm, lang)), e('span', { className: 'mono faint', style: { fontSize: 10, marginLeft: 6 } }, r.rm)),
          e('span', { className: 'mono', style: { fontSize: 11, fontWeight: 700, color: Math.abs(allocSum(r.rm) - r.need) < 0.0005 ? 'var(--ok)' : 'var(--danger)' } }, fmt(+allocSum(r.rm).toFixed(3)) + ' / ' + fmt(r.need) + ' ' + r.unit)),
        e('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
          lots.map((l, i) => {
            const days = Math.round((new Date(l.expiry) - new Date(state.today)) / 864e5);
            return e('div', { key: l.id, className: 'row', style: { gap: 10, background: 'var(--surface-2)', borderRadius: 6, padding: '6px 9px' } },
              i === 0 && e('span', { className: 'badge', style: { color: 'var(--ok)', background: 'var(--ok-tint)', fontSize: 9 } }, 'FEFO'),
              e('div', { style: { flex: 1, minWidth: 0 } },
                e('div', { className: 'mono', style: { fontSize: 11, fontWeight: 600 } }, l.lot),
                e('div', { className: 'faint', style: { fontSize: 10 } }, t('f.expiry') + ' ' + fmtDate(l.expiry) + ' · ' + t('f.available') + ' ' + fmt(l.remaining) + ' ' + D.rmUnit(state, r.rm) + (days <= 30 ? ' · ' + days + (lang === 'th' ? ' วัน' : 'd') : ''))),
              e('input', { className: 'input mono', type: 'number', step: 'any', value: (alloc[r.rm] || {})[l.id] || 0, max: l.remaining, onChange: ev => setQ(r.rm, l.id, ev.target.value), style: { width: 90 } }));
          })));
    });

    return e(Modal, { title: t('wh.issue.selectlot'), onClose, width: 600,
      footer: e(React.Fragment, null, e('button', { className: 'btn', onClick: onClose }, t('btn.cancel')),
        e('button', { className: 'btn btn-pri', disabled: !valid, onClick: submit }, e(Icon, { name: 'check', size: 14 }), t('btn.issue'))) },
      e('div', { style: { fontSize: 11.5, color: 'var(--text-muted)', marginBottom: 12 } }, lang === 'th' ? 'ระบบเลือกล็อตที่ใกล้หมดอายุก่อนให้อัตโนมัติ (FEFO) — ปรับได้ตามต้องการ' : 'Lots near expiry are auto-selected first (FEFO) — adjust as needed'),
      body);
  }

  // Lot picker for additional issue (single RM)
  function LotPickerAdd({ state, t, lang, rm, reason, po, reasons, onClose, onSubmit }) {
    const lots = D.rmLotsFEFO(state, rm);
    const [alloc, setAlloc] = React.useState({});
    const submitGuard = React.useRef(false);
    const setQ = (lotId, v) => setAlloc(a => ({ ...a, [lotId]: Math.max(0, +v || 0) }));
    const total = Object.values(alloc).reduce((s, q) => s + q, 0);
    const overAny = lots.some(l => (alloc[l.id] || 0) > l.remaining);
    const valid = total > 0 && !overAny;
    const submit = () => { if (!valid || submitGuard.current) return; submitGuard.current = true; onSubmit({ rm, reason, po, picks: Object.keys(alloc).map(lotId => ({ lotId, qty: alloc[lotId] })) }); };

    return e(Modal, { title: t('wh.issue.selectlot') + ' · ' + D.rmName(state, rm, lang), onClose, width: 540,
      footer: e(React.Fragment, null, e('button', { className: 'btn', onClick: onClose }, t('btn.cancel')),
        e('button', { className: 'btn btn-pri', disabled: !valid, onClick: submit }, e(Icon, { name: 'check', size: 14 }), t('btn.issue') + (total > 0 ? ' · ' + fmt(+total.toFixed(3)) : ''))) },
      e('div', { style: { fontSize: 11.5, color: 'var(--text-muted)', marginBottom: 10 } }, (po ? t('f.po') + ' ' + po + ' · ' : '') + t('f.reason') + ': ' + reasons[reason]),
      e('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
        lots.map((l, i) => {
          const days = Math.round((new Date(l.expiry) - new Date(state.today)) / 864e5);
          return e('div', { key: l.id, className: 'row', style: { gap: 10, background: 'var(--surface-2)', borderRadius: 6, padding: '7px 10px' } },
            i === 0 && e('span', { className: 'badge', style: { color: 'var(--ok)', background: 'var(--ok-tint)', fontSize: 9 } }, 'FEFO'),
            e('div', { style: { flex: 1, minWidth: 0 } },
              e('div', { className: 'mono', style: { fontSize: 11.5, fontWeight: 600 } }, l.lot),
              e('div', { className: 'faint', style: { fontSize: 10 } }, t('f.expiry') + ' ' + fmtDate(l.expiry) + ' · ' + t('f.available') + ' ' + fmt(l.remaining) + ' ' + D.rmUnit(state, rm) + (days <= 30 ? ' · ' + days + (lang === 'th' ? ' วัน' : 'd') : ''))),
            e('input', { className: 'input mono', type: 'number', step: 'any', value: alloc[l.id] || 0, max: l.remaining, onChange: ev => setQ(l.id, ev.target.value), style: { width: 100, borderColor: (alloc[l.id] || 0) > l.remaining ? 'var(--danger)' : undefined } }));
        })));
  }

  window.PG_Issue = Issue;
})();
