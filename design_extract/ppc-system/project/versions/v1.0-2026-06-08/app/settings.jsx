/* ============================================================
   Module: Settings — Production Lines + Workflow Templates
   PPC can add/remove lines (A–G), set manpower & daily plan,
   and review/rename workflow template types.
   ============================================================ */
(function () {
  const { useI18n } = window.PG_I18N;
  const { PageHead, Icon, fmt, Modal, Field, useToast } = window.PG_UI;
  const e = React.createElement;
  const LINE_IDS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
  const LINE_COLORS = { A: '#2d5bd7', B: '#7b5cd9', C: '#1f8a5b', D: '#e08a1e', E: '#cf3b3b', F: '#0e7490', G: '#9333ea' };

  function Settings({ state, setState, go }) {
    const { t, lang } = useI18n();
    const toast = useToast();
    const [edit, setEdit] = React.useState(null); // line being edited or {id:null} for new

    const usedIds = state.lines.map(l => l.id);
    const freeIds = LINE_IDS.filter(id => !usedIds.includes(id));

    function saveLine(form) {
      setState(prev => {
        const exists = prev.lines.some(l => l.id === form.id);
        const lines = exists
          ? prev.lines.map(l => l.id === form.id ? { ...l, name: form.name, manpower: +form.manpower, dailyCap: +form.dailyCap, wf: form.wf } : l)
          : [...prev.lines, { id: form.id, name: form.name, manpower: +form.manpower, dailyCap: +form.dailyCap, wf: form.wf }];
        // keep a workflow bound to this line if chosen
        let workflows = prev.workflows;
        if (form.wf) workflows = prev.workflows.map(w => w.id === form.wf ? { ...w, line: form.id } : w);
        return { ...prev, lines, workflows };
      });
      toast(t('toast.saved')); setEdit(null);
    }
    function removeLine(id) {
      // block if a production order is active on this line
      const active = state.prodOrders.some(p => p.line === id && p.status !== 'completed');
      if (active) { toast(lang === 'th' ? 'มีงานผลิตบนสายนี้ ลบไม่ได้' : 'Line has active production — cannot remove', 'warn'); return; }
      setState(prev => ({ ...prev, lines: prev.lines.filter(l => l.id !== id) }));
      toast(t('toast.deleted'), 'warn');
    }

    const totalCap = state.lines.reduce((a, l) => a + (l.dailyCap || 0), 0);

    return e('div', null,
      e(PageHead, { title: t('set.title'), sub: t('set.sub') }),
      e('div', { style: { display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 14, alignItems: 'start' } },

        // Production lines
        e('div', { className: 'card' },
          e('div', { className: 'card-h' },
            e(Icon, { name: 'factory', size: 15, style: { color: 'var(--primary)' } }),
            e('div', null, e('h3', null, t('set.lines')), e('div', { className: 'sub' }, state.lines.length + ' ' + (lang === 'th' ? 'สาย' : 'lines') + ' · ' + t('set.totalcap') + ' ' + fmt(totalCap) + t('u.day'))),
            e('div', { className: 'card-h-actions' },
              e('button', { className: 'btn btn-sm btn-pri', disabled: freeIds.length === 0,
                onClick: () => setEdit({ id: freeIds[0], name: 'Line ' + freeIds[0], manpower: 6, dailyCap: 8000, wf: '' }) },
                e(Icon, { name: 'plus', size: 13 }), t('set.addline')))),
          e('table', { className: 'tbl' },
            e('thead', null, e('tr', null,
              e('th', null, t('f.line')), e('th', { className: 'num' }, t('f.manpower')), e('th', { className: 'num' }, t('set.dailyplan')),
              e('th', null, t('dsg.templates')), e('th', { style: { width: 80 } }, ''))),
            e('tbody', null, state.lines.map(l => {
              const wf = state.workflows.find(w => w.id === l.wf) || state.workflows.find(w => w.line === l.id);
              return e('tr', { key: l.id },
                e('td', null, e('div', { className: 'row', style: { gap: 8 } },
                  e('span', { style: { width: 10, height: 10, borderRadius: 3, background: LINE_COLORS[l.id] || '#888' } }),
                  e('div', null, e('div', { style: { fontWeight: 600 } }, l.name), e('div', { className: 'mono faint', style: { fontSize: 10 } }, 'Line ' + l.id)))),
                e('td', { className: 'num mono' }, '👷 ' + l.manpower),
                e('td', { className: 'num mono', style: { fontWeight: 700, color: 'var(--primary)' } }, fmt(l.dailyCap)),
                e('td', null, wf ? e('span', { className: 'badge badge-soft', style: { fontSize: 10 } }, wf.name) : e('span', { className: 'faint', style: { fontSize: 11 } }, '—')),
                e('td', null, e('div', { className: 'row', style: { gap: 4, justifyContent: 'flex-end' } },
                  e('button', { className: 'btn btn-sm btn-ghost btn-icon', onClick: () => setEdit({ ...l, wf: l.wf || (wf ? wf.id : '') }) }, e(Icon, { name: 'edit', size: 13 })),
                  e('button', { className: 'btn btn-sm btn-ghost btn-icon', onClick: () => removeLine(l.id) }, e(Icon, { name: 'trash', size: 13, style: { color: 'var(--danger)' } })))));
            }))),
          e('div', { style: { padding: '9px 14px', borderTop: '1px solid var(--border)', fontSize: 10.5, color: 'var(--text-faint)', display: 'flex', gap: 6, alignItems: 'center' } },
            e(Icon, { name: 'alert', size: 12 }), t('set.planhint'))),

        // Workflow templates
        e('div', { className: 'card' },
          e('div', { className: 'card-h' },
            e(Icon, { name: 'designer', size: 15, style: { color: 'var(--primary)' } }),
            e('h3', null, t('set.wftypes')),
            e('button', { className: 'btn btn-sm card-h-actions', onClick: () => go('designer') }, e(Icon, { name: 'edit', size: 13 }), t('btn.edit'))),
          e('div', { style: { padding: 8, display: 'flex', flexDirection: 'column', gap: 8 } },
            state.workflows.map(w => e('div', { key: w.id, style: { background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px' } },
              e('div', { className: 'row', style: { justifyContent: 'space-between' } },
                e('span', { style: { fontWeight: 600, fontSize: 12.5 } }, w.name),
                e('span', { className: 'mono faint', style: { fontSize: 10 } }, w.line ? 'Line ' + w.line : (lang === 'th' ? 'ยังไม่ผูกสาย' : 'unassigned'))),
              e('div', { className: 'row', style: { gap: 4, marginTop: 6, flexWrap: 'wrap' } },
                w.steps.map((s, i) => e('span', { key: i, style: { fontSize: 9.5, background: 'var(--surface-3)', borderRadius: 4, padding: '2px 6px', color: 'var(--text-muted)' } },
                  (i + 1) + '. ' + (lang === 'th' ? s.nameTh : s.name))))))))),

      edit && e(LineModal, { state, t, lang, line: edit, freeIds, onClose: () => setEdit(null), onSubmit: saveLine }));
  }

  function LineModal({ state, t, lang, line, freeIds, onClose, onSubmit }) {
    const isNew = !state.lines.some(l => l.id === line.id);
    const [f, setF] = React.useState({ id: line.id, name: line.name, manpower: line.manpower, dailyCap: line.dailyCap, wf: line.wf || '' });
    const set = (k, v) => setF(p => ({ ...p, [k]: v }));
    const idOptions = isNew ? freeIds : [line.id];
    return e(Modal, { title: (isNew ? t('set.addline') : t('btn.edit')) + ' · ' + (lang === 'th' ? 'สายการผลิต' : 'Line'), onClose, width: 480,
      footer: e(React.Fragment, null, e('button', { className: 'btn', onClick: onClose }, t('btn.cancel')),
        e('button', { className: 'btn btn-pri', disabled: !f.name || !f.dailyCap, onClick: () => onSubmit(f) }, t('btn.save'))) },
      e('div', { className: 'grid g-2', style: { gap: 12 } },
        e(Field, { label: lang === 'th' ? 'รหัสสาย' : 'Line ID', required: true },
          e('select', { className: 'select', value: f.id, onChange: ev => set('id', ev.target.value), disabled: !isNew },
            idOptions.map(id => e('option', { key: id, value: id }, 'Line ' + id)))),
        e(Field, { label: t('f.manpower'), required: true }, e('input', { className: 'input mono', type: 'number', value: f.manpower, onChange: ev => set('manpower', ev.target.value) })),
        e('div', { style: { gridColumn: 'span 2' } }, e(Field, { label: t('f.name'), required: true }, e('input', { className: 'input', value: f.name, onChange: ev => set('name', ev.target.value), placeholder: 'Line A — Serum' }))),
        e('div', { style: { gridColumn: 'span 2' } }, e(Field, { label: t('set.dailyplan') + ' (' + t('u.pcs') + t('u.day') + ')', required: true, hint: t('set.planhint') },
          e('input', { className: 'input mono', type: 'number', value: f.dailyCap, onChange: ev => set('dailyCap', ev.target.value), placeholder: '8000' }))),
        e('div', { style: { gridColumn: 'span 2' } }, e(Field, { label: t('set.deftpl') },
          e('select', { className: 'select', value: f.wf, onChange: ev => set('wf', ev.target.value) },
            [e('option', { key: '', value: '' }, lang === 'th' ? '— ไม่ผูก —' : '— none —')].concat(state.workflows.map(w => e('option', { key: w.id, value: w.id }, w.name))))))));
  }

  window.PG_Settings = Settings;
})();
