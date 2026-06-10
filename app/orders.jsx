/* ============================================================
   Module: Order Status Flow + Material Reservation (HERO)
   5-status pipeline · BOM shortage check · reservation
   ============================================================ */
(function () {
  const { useI18n } = window.PG_I18N;
  const { Card, PageHead, Icon, fmt, fmtDate, DateField, Modal, Field, StatusBadge, PriorityBadge, useToast, Progress } = window.PG_UI;
  const D = window.PG_DATA;

  const FLOW = ['request', 'waiting', 'reserved', 'scheduled', 'completed'];
  const NEXT = { request: 'waiting', waiting: 'reserved', reserved: 'scheduled', scheduled: 'completed' };

  function OrderFlow({ state, setState, go, canDelete }) {
    const { t, lang } = useI18n();
    const toast = useToast();
    const [sel, setSel] = React.useState(null);

    const order = sel ? state.orders.find(o => o.id === sel) : null;

    const PREV = { waiting: 'request', reserved: 'waiting' };
    function back(o) {
      const pv = PREV[o.status];
      if (!pv) return;
      // block stepping back out of 'reserved' once materials have been issued
      if (o.status === 'reserved') {
        const po = prev_po(state, o.id);
        if (po && po.status !== 'reserved') { toast(lang === 'th' ? 'เบิกวัตถุดิบแล้ว ย้อนสถานะไม่ได้' : 'Materials already issued — cannot step back', 'warn'); return; }
      }
      setState(prev => {
        const next = { ...prev, orders: prev.orders.map(x => x.id === o.id ? { ...x, status: pv } : x) };
        if (o.status === 'reserved') {
          const reserved = { ...(prev.reservedByRm || {}) };
          D.bomRequirement(prev, o.fg, o.qty).forEach(r => { reserved[r.rm] = +(Math.max(0, (reserved[r.rm] || 0) - r.need).toFixed(2)); });
          next.reservedByRm = reserved;
          next.prodOrders = prev.prodOrders.filter(p => !(p.order === o.id && p.status === 'reserved'));
        }
        return next;
      });
      toast(t('toast.reverted'), 'warn');
    }
    function prev_po(s, oid) { return s.prodOrders.find(p => p.order === oid); }

    // Cancel a reservation while the order has NOT yet started production
    // (status still 'reserved'). Releases any outstanding reservation, returns
    // every already-issued lot back to stock, drops the issue records and the
    // production order, and sends the order back to 'waiting'.
    function cancelReservation(o) {
      if (!window.confirm(lang === 'th' ? 'ยกเลิกการจอง และคืนวัตถุดิบที่เบิกไปแล้วทั้งหมด?' : 'Cancel reservation and return all issued materials?')) return;
      setState(prev => {
        const next = { ...prev };
        const poRec = prev.prodOrders.find(p => p.order === o.id);
        const reserved = { ...(prev.reservedByRm || {}) };
        // release the outstanding reservation only if nothing was issued yet
        if (poRec && poRec.status === 'reserved') {
          D.bomRequirement(prev, o.fg, o.qty).forEach(r => { reserved[r.rm] = +(Math.max(0, (reserved[r.rm] || 0) - r.need).toFixed(2)); });
        }
        // return physically-issued stock to its lots and drop those issue txns
        const lots = prev.lots.map(l => ({ ...l }));
        const keep = [];
        (prev.issues || []).forEach(tx => {
          const belongs = (tx.order && tx.order === o.id) || (poRec && tx.ref && tx.ref === poRec.id);
          if (belongs) { const lot = lots.find(l => l.lot === tx.lot && l.rm === tx.rm); if (lot) lot.remaining = +(lot.remaining + tx.qty).toFixed(2); }
          else keep.push(tx);
        });
        next.lots = lots;
        next.reservedByRm = reserved;
        next.issues = keep;
        next.prodOrders = prev.prodOrders.filter(p => p.order !== o.id);
        next.orders = prev.orders.map(x => x.id === o.id ? { ...x, status: 'waiting' } : x);
        return next;
      });
      setSel(null);
      toast(lang === 'th' ? 'ยกเลิกการจองและคืนวัตถุดิบเรียบร้อย' : 'Reservation cancelled and materials returned', 'warn');
    }

    function del(o) {
      // only deletable before reservation (request / waiting)
      if (o.status !== 'request' && o.status !== 'waiting') return;
      setState(prev => ({ ...prev, orders: prev.orders.filter(x => x.id !== o.id) }));
      setSel(null);
      toast(t('toast.deleted'), 'warn');
    }

    function advance(o, poId) {
      const nx = NEXT[o.status];
      if (!nx) return;
      setState(prev => {
        const next = { ...prev, orders: prev.orders.map(x => x.id === o.id ? { ...x, status: nx } : x) };
        if (nx === 'reserved') {
          const reserved = { ...(prev.reservedByRm || {}) };
          D.bomRequirement(prev, o.fg, o.qty).forEach(r => { reserved[r.rm] = +(((reserved[r.rm] || 0) + r.need).toFixed(2)); });
          next.reservedByRm = reserved;
          const wf = D.workflowForLine(prev, null);
          const id = (poId && poId.trim()) || D.genId('PO');
          next.prodOrders = [...prev.prodOrders, { id, order: o.id, customer: o.customer, fg: o.fg, qty: o.qty, line: null, start: null, days: 1, status: 'reserved', wf: wf.id }];
        }
        return next;
      });
      const msgs = { waiting: 'toast.saved', reserved: 'toast.reserved', scheduled: 'toast.scheduled', completed: 'toast.completed' };
      toast(t(msgs[nx] || 'toast.saved'));
      if (nx === 'reserved') toast(t('toast.pocreated'));
    }
    // when reserving, ask for a PO name first
    const [poNaming, setPoNaming] = React.useState(null);
    function requestAdvance(o) {
      if (NEXT[o.status] === 'reserved') { setPoNaming(o); return; }
      advance(o);
    }

    return React.createElement('div', null,
      React.createElement(PageHead, { title: t('flow.title'), sub: t('flow.sub'),
        actions: React.createElement('button', { className: 'btn btn-pri', onClick: () => go('orders') },
          React.createElement(Icon, { name: 'plus', size: 15 }), t('btn.new')) }),

      // Pipeline board — 6 columns: 3 plan stages + 3 production stages (derived from live progress)
      (function () {
        const SC = window.PG_UI.STATUS_COLOR;
        const COLS = [
          { key: 'request',  label: t('status.request'),   color: SC.request,   items: state.orders.filter(o => o.status === 'request') },
          { key: 'waiting',  label: t('status.waiting'),   color: SC.waiting,   items: state.orders.filter(o => o.status === 'waiting') },
          { key: 'reserved', label: t('status.reserved'),  color: SC.reserved,  items: state.orders.filter(o => o.status === 'reserved') },
          { key: 'scheduled', label: t('status.scheduled'), color: SC.scheduled, variant: 'scheduled',
            items: state.orders.filter(o => o.status === 'scheduled') },
          { key: 'produced', label: t('status.completed'), color: 'var(--st-completed)', variant: 'produced',
            items: state.orders.filter(o => o.status === 'completed' && D.orderProgress(state, o).received < o.qty) },
          { key: 'fgdone',   label: lang === 'th' ? 'รับเข้าคลังสำเร็จรูปเสร็จ' : 'FG fully received', color: 'var(--primary)', variant: 'fgdone',
            items: state.orders.filter(o => o.status === 'completed' && D.orderProgress(state, o).received >= o.qty) },
        ];
        return React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 10, alignItems: 'start' } },
          COLS.map(col => React.createElement('div', { key: col.key, style: { background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 9, minHeight: 200 } },
            React.createElement('div', { style: { padding: '10px 12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 7 } },
              React.createElement('span', { style: { width: 9, height: 9, borderRadius: 3, background: col.color, flexShrink: 0 } }),
              React.createElement('span', { style: { fontSize: 11, fontWeight: 700, lineHeight: 1.2 } }, col.label),
              React.createElement('span', { style: { marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: 'var(--text-faint)' } }, col.items.length)),
            React.createElement('div', { style: { padding: 8, display: 'flex', flexDirection: 'column', gap: 8 } },
              col.items.length === 0 && React.createElement('div', { className: 'faint', style: { fontSize: 10.5, textAlign: 'center', padding: '14px 0' } }, '—'),
              col.items.map(o => React.createElement(OrderCard, { key: o.id, o, state, lang, onClick: () => setSel(o.id),
                onDelete: (canDelete && (o.status === 'request' || o.status === 'waiting')) ? () => del(o) : null,
                prog: col.variant ? Object.assign({ variant: col.variant, qty: o.qty }, D.orderProgress(state, o)) : null }))))));
      })(),

      order && React.createElement(OrderDetail, { order, state, setState, t, lang, onClose: () => setSel(null), onAdvance: requestAdvance, onBack: back, onCancelReserve: cancelReservation, go }),
      poNaming && React.createElement(PoNameModal, { order: poNaming, state, t, lang,
        onClose: () => setPoNaming(null),
        onSubmit: (poId) => { const o = poNaming; setPoNaming(null); advance(o, poId); } }));
  }

  function PoNameModal({ order, state, t, lang, onClose, onSubmit }) {
    const taken = state.prodOrders.map(p => p.id);
    const [pid, setPid] = React.useState('');
    const dup = pid.trim() && taken.includes(pid.trim());
    return React.createElement(Modal, { title: t('btn.createpo'), onClose, width: 440,
      footer: React.createElement(React.Fragment, null,
        React.createElement('button', { className: 'btn', onClick: onClose }, t('btn.cancel')),
        React.createElement('button', { className: 'btn btn-pri', disabled: !pid.trim() || dup, onClick: () => onSubmit(pid.trim()) }, React.createElement(Icon, { name: 'lock', size: 14 }), t('btn.reserve'))) },
      React.createElement('div', { style: { background: 'var(--surface-2)', borderRadius: 8, padding: '10px 12px', marginBottom: 14, fontSize: 12 } },
        React.createElement('div', { className: 'row', style: { justifyContent: 'space-between' } }, React.createElement('span', { className: 'faint' }, t('f.order')), React.createElement('b', { className: 'mono' }, order.id)),
        React.createElement('div', { className: 'row', style: { justifyContent: 'space-between', marginTop: 4 } }, React.createElement('span', { className: 'faint' }, t('f.product')), React.createElement('b', null, D.fgName(state, order.fg, lang)))),
      React.createElement(Field, { label: t('flow.poname'), required: true, hint: lang === 'th' ? 'ตั้งชื่อใบสั่งผลิตเอง เช่น PO-2607-01' : 'Name the production order, e.g. PO-2607-01' },
        React.createElement('input', { className: 'input mono', value: pid, autoFocus: true, onChange: e => setPid(e.target.value), placeholder: 'PO-____' })),
      dup && React.createElement('div', { style: { fontSize: 11, color: 'var(--danger)', marginTop: 6 } }, lang === 'th' ? 'เลขใบสั่งผลิตนี้ถูกใช้แล้ว' : 'This PO number is already used'));
  }

  // small inline stat row for a card: label + value with a colour
  function cardStat(label, value, color) {
    return React.createElement('div', { className: 'row', style: { justifyContent: 'space-between', fontSize: 10 } },
      React.createElement('span', { className: 'faint' }, label),
      React.createElement('span', { className: 'mono', style: { fontWeight: 700, color: color } }, value));
  }

  function OrderCard({ o, state, lang, onClick, onDelete, prog }) {
    const { t } = useI18n();
    const req = D.bomRequirement(state, o.fg, o.qty);
    const shortCount = req.filter(r => r.short > 0).length;
    return React.createElement('div', { style: { position: 'relative' } },
      onDelete && React.createElement('button', { title: t('btn.delete'), onClick: (e) => { e.stopPropagation(); onDelete(); },
        style: { position: 'absolute', top: 6, right: 6, zIndex: 2, width: 22, height: 22, borderRadius: 5, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-faint)', display: 'grid', placeItems: 'center', cursor: 'pointer' },
        onMouseEnter: (e) => { e.currentTarget.style.color = 'var(--danger)'; e.currentTarget.style.borderColor = 'var(--danger)'; },
        onMouseLeave: (e) => { e.currentTarget.style.color = 'var(--text-faint)'; e.currentTarget.style.borderColor = 'var(--border)'; } },
        React.createElement(Icon, { name: 'trash', size: 12 })),
      React.createElement('button', { onClick, style: { width: '100%', textAlign: 'left', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 7, padding: 10, cursor: 'pointer', boxShadow: 'var(--shadow-sm)' } },
      React.createElement('div', { className: 'row', style: { justifyContent: 'space-between', marginBottom: 4, paddingRight: onDelete ? 24 : 0 } },
        React.createElement('span', { className: 'mono', style: { fontSize: 11, fontWeight: 700, color: 'var(--primary)' } }, o.id),
        React.createElement(PriorityBadge, { p: o.priority })),
      React.createElement('div', { style: { fontSize: 12, fontWeight: 600, marginBottom: 2 } }, D.fgName(state, o.fg, lang)),
      React.createElement('div', { className: 'faint', style: { fontSize: 10.5 } }, o.customer),
      React.createElement('div', { className: 'row', style: { justifyContent: 'space-between', marginTop: 7, fontSize: 10.5 } },
        React.createElement('span', { className: 'mono', style: { fontWeight: 600 } }, fmt(o.qty) + ' ' + t('u.pcs')),
        React.createElement('span', { className: 'faint row', style: { gap: 3 } }, React.createElement(Icon, { name: 'clock', size: 11 }), fmtDate(o.due))),
      o.status === 'waiting' && shortCount > 0 && React.createElement('div', { style: { marginTop: 7, fontSize: 10, color: 'var(--danger)', fontWeight: 600, display: 'flex', gap: 4, alignItems: 'center' } },
        React.createElement(Icon, { name: 'alert', size: 11 }), shortCount + ' ' + t('f.shortage')),
      // production progress (scheduled / produced / fg-received cards)
      prog && React.createElement('div', { style: { marginTop: 7, paddingTop: 7, borderTop: '1px dashed var(--border)', display: 'flex', flexDirection: 'column', gap: 4 } },
        prog.variant === 'scheduled' && React.createElement('span', { className: 'badge', style: { alignSelf: 'flex-start', fontSize: 9, color: prog.started ? 'var(--primary)' : 'var(--text-muted)', background: prog.started ? 'var(--primary-tint)' : 'var(--surface-3)' } },
          prog.started ? (lang === 'th' ? '● กำลังผลิต' : '● In production') : (lang === 'th' ? 'รอผลิต' : 'Waiting to start')),
        // scheduled: show produced & received only if there is an amount
        prog.variant === 'scheduled' && prog.produced > 0 && cardStat(lang === 'th' ? 'ผลิตเสร็จ' : 'Produced', fmt(prog.produced) + '/' + fmt(prog.qty), 'var(--st-completed)'),
        prog.variant === 'scheduled' && prog.received > 0 && cardStat(lang === 'th' ? 'รับเข้าแล้ว' : 'Received', fmt(prog.received) + '/' + fmt(prog.qty), 'var(--ok)'),
        // produced card: production done, show FG received progress
        prog.variant === 'produced' && cardStat(lang === 'th' ? 'ผลิตเสร็จ' : 'Produced', fmt(prog.qty) + '/' + fmt(prog.qty), 'var(--st-completed)'),
        prog.variant === 'produced' && cardStat(lang === 'th' ? 'รับเข้าแล้ว' : 'Received', fmt(prog.received) + '/' + fmt(prog.qty), prog.received > 0 ? 'var(--ok)' : 'var(--text-faint)'),
        // fg-done card: fully received
        prog.variant === 'fgdone' && cardStat(lang === 'th' ? 'รับเข้าครบ' : 'Received', fmt(prog.received) + '/' + fmt(prog.qty), 'var(--ok)'))));
  }

  function OrderDetail({ order, state, setState, t, lang, onClose, onAdvance, onBack, onCancelReserve, go }) {
    // For orders already past reservation, materials are already secured — don't recompute shortage
    const committed = order.status === 'reserved' || order.status === 'scheduled' || order.status === 'completed';
    const req = D.bomRequirement(state, order.fg, order.qty, committed);
    const hasShort = req.some(r => r.short > 0);
    const canBack = order.status === 'waiting';        // step back to request (no stock involved)
    const canCancel = order.status === 'reserved';     // cancel reservation + return issued stock
    const bom = state.boms[order.fg];
    const nx = NEXT[order.status];

    return React.createElement(Modal, { title: t('f.po') + ' · ' + order.id, onClose, width: 640,
      footer: React.createElement(React.Fragment, null,
        React.createElement('button', { className: 'btn', onClick: onClose }, t('btn.close')),
        canBack && React.createElement('button', { className: 'btn', style: { marginRight: 'auto' }, onClick: () => onBack(order) },
          React.createElement(Icon, { name: 'chevL', size: 14 }), t('btn.back')),
        canCancel && React.createElement('button', { className: 'btn', style: { marginRight: 'auto', color: 'var(--danger)', borderColor: 'var(--danger)' }, onClick: () => onCancelReserve(order) },
          React.createElement(Icon, { name: 'trash', size: 14 }), lang === 'th' ? 'ยกเลิกจอง' : 'Cancel reservation'),
        order.status === 'scheduled' || order.status === 'reserved'
          ? React.createElement('button', { className: 'btn btn-pri', onClick: () => go('schedule') },
            React.createElement(Icon, { name: 'schedule', size: 14 }), t('nav.schedule')) :
        nx && React.createElement('button', { className: 'btn btn-pri', disabled: nx === 'reserved' && hasShort,
          onClick: () => onAdvance(order) },
          React.createElement(Icon, { name: nx === 'reserved' ? 'lock' : 'arrowR', size: 14 }),
          nx === 'reserved' ? t('btn.reserve') : t('flow.moveto') + ' ' + t('status.' + nx))) },

      React.createElement('div', { className: 'row', style: { justifyContent: 'space-between', marginBottom: 14 } },
        React.createElement('div', null,
          React.createElement('div', { style: { fontSize: 16, fontWeight: 700 } }, D.fgName(state, order.fg, lang)),
          React.createElement('div', { className: 'faint', style: { fontSize: 12 } }, order.customer + ' · ' + fmt(order.qty) + ' ' + t('u.pcs') + ' · ' + t('f.duedate') + ' ' + fmtDate(order.due))),
        React.createElement('div', { style: { textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' } },
          React.createElement(StatusBadge, { status: order.status }),
          React.createElement(PriorityBadge, { p: order.priority }))),

      // Flow stepper
      React.createElement('div', { className: 'row', style: { gap: 0, marginBottom: 16 } },
        FLOW.map((st, i) => {
          const done = FLOW.indexOf(order.status) >= i;
          const cur = order.status === st;
          return React.createElement('div', { key: st, style: { flex: 1, display: 'flex', alignItems: 'center' } },
            React.createElement('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: '0 0 auto' } },
              React.createElement('div', { style: { width: 22, height: 22, borderRadius: '50%', display: 'grid', placeItems: 'center', background: done ? window.PG_UI.STATUS_COLOR[st] : 'var(--surface-3)', color: done ? '#fff' : 'var(--text-faint)', fontSize: 10, fontWeight: 700, boxShadow: cur ? '0 0 0 3px color-mix(in srgb,' + window.PG_UI.STATUS_COLOR[st] + ' 25%,white)' : 'none' } },
                done ? React.createElement(Icon, { name: 'check', size: 12 }) : i + 1)),
            i < FLOW.length - 1 && React.createElement('div', { style: { flex: 1, height: 2, background: FLOW.indexOf(order.status) > i ? window.PG_UI.STATUS_COLOR[FLOW[i + 1]] : 'var(--border)' } }));
        })),

      // Reservation / shortage panel — once committed (reserved+), show success, no recompute
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 } },
        React.createElement('h3', { style: { margin: 0, fontSize: 13 } }, t('flow.reservation')),
        React.createElement('span', { className: 'faint', style: { fontSize: 11 } }, '· BOM ' + (bom ? bom.version : '') + ' · ' + t('flow.matcheck')),
        committed
          ? React.createElement('span', { className: 'badge', style: { marginLeft: 'auto', color: 'var(--ok)', background: 'var(--ok-tint)' } },
            React.createElement(Icon, { name: 'checkcircle', size: 12 }), t('flow.reserved_ok'))
          : React.createElement('span', { className: 'badge', style: { marginLeft: 'auto', color: hasShort ? 'var(--danger)' : 'var(--ok)', background: hasShort ? 'var(--danger-tint)' : 'var(--ok-tint)' } },
            React.createElement(Icon, { name: hasShort ? 'alert' : 'checkcircle', size: 12 }), hasShort ? t('flow.hasshort') : t('flow.allavail'))),

      React.createElement('div', { style: { border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' } },
        React.createElement('table', { className: 'tbl' },
          React.createElement('thead', null, React.createElement('tr', null,
            React.createElement('th', null, t('rawmat')),
            React.createElement('th', { className: 'num' }, committed ? t('f.reserved') : t('f.required')),
            React.createElement('th', { className: 'num' }, t('f.onhand')),
            committed ? null : React.createElement('th', { style: { width: 110 } }, t('f.available')),
            React.createElement('th', { className: 'num' }, committed ? t('f.status') : t('f.shortage')))),
          React.createElement('tbody', null,
            req.map(r => {
              const ratio = Math.min(100, r.available / r.need * 100);
              if (committed) {
                return React.createElement('tr', { key: r.rm },
                  React.createElement('td', null,
                    React.createElement('div', { style: { fontWeight: 600 } }, D.rmName(state, r.rm, lang)),
                    React.createElement('div', { className: 'mono faint', style: { fontSize: 10 } }, r.rm)),
                  React.createElement('td', { className: 'num mono', style: { fontWeight: 600 } }, fmt(r.need) + ' ' + r.unit),
                  React.createElement('td', { className: 'num mono' }, fmt(r.onHand) + ' ' + r.unit),
                  React.createElement('td', { className: 'num' }, React.createElement('span', { className: 'badge', style: { color: 'var(--ok)', background: 'var(--ok-tint)' } }, React.createElement(Icon, { name: 'check', size: 11 }), t('flow.reserved_ok'))));
              }
              return React.createElement('tr', { key: r.rm },
                React.createElement('td', null,
                  React.createElement('div', { style: { fontWeight: 600 } }, D.rmName(state, r.rm, lang)),
                  React.createElement('div', { className: 'mono faint', style: { fontSize: 10 } }, r.rm)),
                React.createElement('td', { className: 'num mono', style: { fontWeight: 600 } }, fmt(r.need) + ' ' + r.unit),
                React.createElement('td', { className: 'num mono' }, fmt(r.onHand) + ' ' + r.unit),
                React.createElement('td', null,
                  React.createElement('div', { className: 'mono', style: { fontSize: 10.5, marginBottom: 3, color: r.short > 0 ? 'var(--danger)' : 'var(--text-muted)' } }, fmt(r.available) + ' ' + r.unit),
                  React.createElement(Progress, { value: ratio, color: r.short > 0 ? 'var(--danger)' : 'var(--ok)' })),
                React.createElement('td', { className: 'num mono', style: { fontWeight: 700, color: r.short > 0 ? 'var(--danger)' : 'var(--text-faint)' } }, r.short > 0 ? '-' + fmt(r.short) + ' ' + r.unit : '✓'));
            })))),
      hasShort && order.status === 'waiting' && React.createElement('div', { style: { marginTop: 10, fontSize: 11.5, color: 'var(--text-muted)', display: 'flex', gap: 8, alignItems: 'center' } },
        React.createElement(Icon, { name: 'alert', size: 14, style: { color: 'var(--warn)' } }),
        lang === 'th' ? 'ต้องรับเข้าวัตถุดิบที่ขาดก่อนจึงจะจองและเปิดใบสั่งผลิตได้' : 'Receive the shortage materials before reserving and creating the PO.',
        React.createElement('button', { className: 'btn btn-sm', style: { marginLeft: 'auto' }, onClick: () => go('receiving') }, t('nav.receiving'))),

      // Procurement tracking for the short materials (editable any time while waiting)
      hasShort && order.status === 'waiting' && React.createElement(ProcurementPanel, { order, state, setState, t, lang, shorts: req.filter(r => r.short > 0) }));
  }

  // Editable status + expected-arrival per short material; persisted to state.procurement
  function ProcurementPanel({ order, state, setState, t, lang, shorts }) {
    const PROC = D.PROC_STATUS;
    const COLORS = { pending: ['var(--text-muted)', 'var(--surface-3)'], ordered: ['var(--st-scheduled)', 'var(--primary-tint)'], transit: ['var(--warn)', 'var(--warn-tint)'] };
    const proc = (state.procurement && state.procurement[order.id]) || {};
    function setProc(rm, patch) {
      setState(prev => {
        const procurement = { ...(prev.procurement || {}) };
        const forOrder = { ...(procurement[order.id] || {}) };
        forOrder[rm] = { status: 'pending', eta: '', ...(forOrder[rm] || {}), ...patch };
        procurement[order.id] = forOrder;
        return { ...prev, procurement };
      });
    }
    return React.createElement('div', { style: { marginTop: 16 } },
      React.createElement('h3', { style: { margin: '0 0 8px', fontSize: 13 } }, lang === 'th' ? 'สถานะการจัดหาวัตถุดิบที่ขาด' : 'Procurement status of short materials'),
      React.createElement('div', { style: { border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' } },
        React.createElement('table', { className: 'tbl' },
          React.createElement('thead', null, React.createElement('tr', null,
            React.createElement('th', null, t('rawmat')),
            React.createElement('th', { className: 'num' }, t('f.shortage')),
            React.createElement('th', { style: { width: 160 } }, lang === 'th' ? 'สถานะจัดหา' : 'Status'),
            React.createElement('th', { style: { width: 170 } }, lang === 'th' ? 'วันคาดว่าจะมา' : 'Expected arrival'))),
          React.createElement('tbody', null, shorts.map(r => {
            const p = proc[r.rm] || { status: 'pending', eta: '' };
            return React.createElement('tr', { key: r.rm },
              React.createElement('td', null, React.createElement('div', { style: { fontWeight: 600 } }, D.rmName(state, r.rm, lang)), React.createElement('div', { className: 'mono faint', style: { fontSize: 10 } }, r.rm)),
              React.createElement('td', { className: 'num mono', style: { color: 'var(--danger)', fontWeight: 700 } }, '-' + fmt(r.short) + ' ' + r.unit),
              React.createElement('td', null, React.createElement('select', { className: 'select', value: p.status, onChange: e => setProc(r.rm, { status: e.target.value }), style: { color: (COLORS[p.status] || [])[0] } },
                Object.keys(PROC).map(k => React.createElement('option', { key: k, value: k }, lang === 'th' ? PROC[k].th : PROC[k].en)))),
              React.createElement('td', null, React.createElement(DateField, { value: p.eta || '', onChange: v => setProc(r.rm, { eta: v }) })));
          })))));
  }

  window.PG_OrderFlow = OrderFlow;
})();
