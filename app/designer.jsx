/* ============================================================
   Module: Production Process Designer (HERO)
   Drag-drop workflow template builder
   ============================================================ */
(function () {
  const { useI18n } = window.PG_I18N;
  const { PageHead, Icon, useToast } = window.PG_UI;
  const e = React.createElement;
  const STEP_ICONS = { issue: 'box', weigh: 'scale', mix: 'designer', fill: 'fg', seal: 'lock', box2: 'box', wrap: 'layers', carton: 'box', qc: 'checkcircle', label: 'items', box: 'box', blend: 'designer', shrink: 'layers' };

  function Designer({ state, setState, canDelete }) {
    const { t, lang } = useI18n();
    const toast = useToast();
    const [tplId, setTplId] = React.useState(state.workflows[0].id);
    const [tplName, setTplName] = React.useState(state.workflows[0].name);
    const [steps, setSteps] = React.useState(() => state.workflows[0].steps.map((s, i) => ({ ...s, uid: 'u' + i })));
    const dragInfo = React.useRef(null);
    const [overIdx, setOverIdx] = React.useState(null);
    const [stepModal, setStepModal] = React.useState(false);

    function saveTemplate() {
      const cleanSteps = steps.map((s, i) => ({ key: s.key, name: s.name, nameTh: s.nameTh, dur: s.dur || 1, ic: s.ic, type: s.type, id: 'st' + i + '_' + s.key }));
      setState(prev => {
        const exists = prev.workflows.some(w => w.id === tplId);
        let workflows;
        if (exists) {
          workflows = prev.workflows.map(w => w.id === tplId ? { ...w, name: tplName, steps: cleanSteps } : w);
        } else {
          const newId = 'WF-' + Date.now().toString(36).slice(-4).toUpperCase();
          workflows = [...prev.workflows, { id: newId, name: tplName, line: null, steps: cleanSteps }];
          setTimeout(() => setTplId(newId), 0);
        }
        return { ...prev, workflows };
      });
      toast(t('toast.tplsaved'));
    }

    function loadTpl(id) {
      const w = state.workflows.find(x => x.id === id);
      setTplId(id); setTplName(w.name);
      setSteps(w.steps.map((s, i) => ({ ...s, uid: 'u' + Date.now() + i })));
    }
    function onDropAt(idx) {
      const di = dragInfo.current; setOverIdx(null); dragInfo.current = null;
      if (!di) return;
      setSteps(prev => {
        let arr = prev.slice();
        if (di.type === 'new') {
          const lib = state.stepLib.find(s => s.key === di.key);
          arr.splice(idx, 0, { ...lib, uid: 'u' + Date.now() });
        } else {
          const from = arr.findIndex(s => s.uid === di.uid);
          if (from === -1) return prev;
          const [m] = arr.splice(from, 1);
          arr.splice(from < idx ? idx - 1 : idx, 0, m);
        }
        return arr;
      });
    }
    const removeStep = (uid) => setSteps(prev => prev.filter(s => s.uid !== uid));
    const totalDur = () => steps.reduce((a, s) => a + (s.dur || 1), 0);
    const usedKeys = steps.map(s => s.key);

    function delTemplate(id) {
      if (!window.confirm(lang === 'th' ? 'ยืนยันลบเทมเพลตนี้?' : 'Delete this template?')) return;
      setState(prev => ({ ...prev, workflows: prev.workflows.filter(w => w.id !== id) }));
      toast(lang === 'th' ? 'ลบเทมเพลตเรียบร้อย' : 'Template deleted');
      if (tplId === id) {
        const next = state.workflows.find(w => w.id !== id);
        if (next) loadTpl(next.id);
        else { setSteps([]); setTplName(lang === 'th' ? 'เทมเพลตใหม่' : 'New Template'); setTplId('new'); }
      }
    }
    function delStep(key) {
      const usedIn = state.workflows.filter(w => w.steps.some(s => s.key === key)).map(w => w.name);
      if (usedIn.length) { toast((lang === 'th' ? 'ลบไม่ได้ — ใช้ในเทมเพลต: ' : 'Cannot delete — used in: ') + usedIn.join(', '), 'warn'); return; }
      if (!window.confirm(lang === 'th' ? 'ยืนยันลบขั้นตอนนี้ออกจากคลัง?' : 'Delete this step from the library?')) return;
      setState(prev => ({ ...prev, stepLib: prev.stepLib.filter(s => s.key !== key) }));
      toast(lang === 'th' ? 'ลบขั้นตอนเรียบร้อย' : 'Step deleted');
    }
    function addStep(form) {
      const k = (form.key || '').trim();
      if (!k) { toast(lang === 'th' ? 'ต้องระบุรหัสขั้นตอน' : 'Step key required', 'warn'); return; }
      if (state.stepLib.some(s => s.key === k)) { toast(lang === 'th' ? 'รหัสขั้นตอนซ้ำ' : 'Step key already exists', 'warn'); return; }
      setState(prev => ({ ...prev, stepLib: [...prev.stepLib, { key: k, name: form.name || form.nameTh, nameTh: form.nameTh || form.name, dur: +form.dur || 1, ic: form.ic, type: form.type === 'qa' ? 'qa' : undefined }] }));
      toast(t('toast.saved')); setStepModal(false);
    }
    function editStep(form) {
      const oldKey = (stepModal && stepModal.step) ? stepModal.step.key : form.key;
      const newKey = (form.key || '').trim();
      if (!newKey) { toast(lang === 'th' ? 'ต้องระบุรหัสขั้นตอน' : 'Step key required', 'warn'); return; }
      if (newKey !== oldKey && state.stepLib.some(s => s.key === newKey)) { toast(lang === 'th' ? 'รหัสขั้นตอนซ้ำ' : 'Step key already exists', 'warn'); return; }
      const patch = (s) => ({ ...s, key: newKey, name: form.name || form.nameTh, nameTh: form.nameTh || form.name, ic: form.ic, type: form.type === 'qa' ? 'qa' : undefined });
      setState(prev => ({ ...prev,
        stepLib: prev.stepLib.map(s => s.key === oldKey ? patch(s) : s),
        // cascade the rename into every template and any in-progress lot that references the old key
        workflows: prev.workflows.map(w => ({ ...w, steps: w.steps.map(st => st.key === oldKey ? patch(st) : st) })),
        lotsWip: prev.lotsWip.map(l => ({ ...l,
          stations: l.stations.map(st => st.step === oldKey ? { ...st, step: newKey } : st),
          outputLog: (l.outputLog || []).map(x => x.step === oldKey ? { ...x, step: newKey } : x) })) }));
      // reflect the change on the open canvas too
      setSteps(prev => prev.map(st => st.key === oldKey ? patch(st) : st));
      toast(t('toast.saved')); setStepModal(false);
    }

    // Template list card
    const tplCard = e('div', { className: 'card' },
      e('div', { className: 'card-h' }, e(Icon, { name: 'layers', size: 15, style: { color: 'var(--primary)' } }), e('h3', null, t('dsg.templates'))),
      e('div', { style: { padding: 8, display: 'flex', flexDirection: 'column', gap: 6 } },
        state.workflows.map(w => e('div', { key: w.id,
          style: { background: tplId === w.id ? 'var(--primary-tint)' : 'var(--surface-2)', border: '1px solid ' + (tplId === w.id ? 'var(--primary)' : 'var(--border)'), borderRadius: 7, padding: '9px 11px' } },
          e('div', { style: { display: 'flex', alignItems: 'flex-start', gap: 6 } },
            e('div', { style: { flex: 1, minWidth: 0, cursor: 'pointer' }, onClick: () => loadTpl(w.id) },
              e('div', { style: { fontSize: 12, fontWeight: 600 } }, w.name),
              e('div', { className: 'faint mono', style: { fontSize: 10, marginTop: 2 } }, w.steps.length + ' ' + (lang === 'th' ? 'ขั้นตอน' : 'steps') + (w.line ? ' · Line ' + w.line : ''))),
            canDelete && e('button', { className: 'btn btn-sm btn-ghost btn-icon', title: t('btn.delete'), onClick: (ev) => { ev.stopPropagation(); delTemplate(w.id); } }, e(Icon, { name: 'trash', size: 12, style: { color: 'var(--danger)' } }))))),
        e('button', { className: 'btn btn-sm', style: { marginTop: 4 }, onClick: () => { setSteps([]); setTplName(lang === 'th' ? 'เทมเพลตใหม่' : 'New Template'); setTplId('new'); } },
          e(Icon, { name: 'plus', size: 13 }), t('btn.new'))));

    // Palette card
    const paletteCard = e('div', { className: 'card' },
      e('div', { className: 'card-h' }, e(Icon, { name: 'designer', size: 15, style: { color: 'var(--primary)' } }), e('h3', null, t('dsg.palette')),
        e('div', { className: 'card-h-actions' },
          e('button', { className: 'btn btn-sm btn-pri', title: (lang === 'th' ? 'เพิ่มขั้นตอน' : 'Add step'), onClick: () => setStepModal({ mode: 'add' }) }, e(Icon, { name: 'plus', size: 12 })))),
      e('div', { style: { padding: 8, display: 'flex', flexDirection: 'column', gap: 6 } },
        state.stepLib.length === 0
          ? e('div', { className: 'empty', style: { fontSize: 11 } }, lang === 'th' ? 'ยังไม่มีขั้นตอนในคลัง' : 'No steps in library')
          : state.stepLib.map(s => e('div', { key: s.key, draggable: true,
            onDragStart: () => { dragInfo.current = { type: 'new', key: s.key }; },
            style: { display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 7, padding: '7px 9px', cursor: 'grab', opacity: usedKeys.includes(s.key) ? 0.55 : 1 } },
            e('span', { style: { width: 24, height: 24, borderRadius: 6, background: 'var(--primary-tint)', color: 'var(--primary)', display: 'grid', placeItems: 'center', flexShrink: 0 } }, e(Icon, { name: STEP_ICONS[s.ic] || 'box', size: 13 })),
            e('div', { style: { minWidth: 0, flex: 1 } },
              e('div', { style: { fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, lang === 'th' ? s.nameTh : s.name),
              e('div', { className: 'mono', style: { fontSize: 9, color: s.type === 'qa' ? 'var(--danger)' : 'var(--text-faint)' } }, s.type === 'qa' ? 'QA · ' + s.key : s.key)),
            canDelete && e('div', { className: 'row', style: { marginLeft: 'auto', gap: 2, flexShrink: 0 } },
              e('button', { className: 'btn btn-sm btn-ghost btn-icon', draggable: false, title: t('btn.edit'),
                onMouseDown: (ev) => ev.stopPropagation(),
                onClick: (ev) => { ev.stopPropagation(); setStepModal({ mode: 'edit', step: s }); } }, e(Icon, { name: 'edit', size: 12 })),
              e('button', { className: 'btn btn-sm btn-ghost btn-icon', draggable: false, title: t('btn.delete'),
                onMouseDown: (ev) => ev.stopPropagation(),
                onClick: (ev) => { ev.stopPropagation(); delStep(s.key); } }, e(Icon, { name: 'trash', size: 12, style: { color: 'var(--danger)' } })))))));

    // Canvas children
    const canvasInner = [];
    if (steps.length === 0) {
      canvasInner.push(e('div', { key: 'empty', className: 'empty', style: { border: '2px dashed var(--border-strong)', borderRadius: 10 } },
        e(Icon, { name: 'designer', size: 26, style: { color: 'var(--text-faint)' } }),
        e('div', { style: { marginTop: 8, fontSize: 12 } }, t('dsg.drophint'))));
    }
    steps.forEach((s, i) => {
      canvasInner.push(e(DropLine, { key: 'd' + i, active: overIdx === i, onOver: () => setOverIdx(i), onDrop: () => onDropAt(i) }));
      canvasInner.push(e(StepRow, { key: s.uid, s, i, lang, t, dragInfo, setOverIdx, onDropAt, removeStep }));
    });
    if (steps.length > 0) canvasInner.push(e(DropLine, { key: 'dend', active: overIdx === steps.length, onOver: () => setOverIdx(steps.length), onDrop: () => onDropAt(steps.length) }));

    const canvasCard = e('div', { className: 'card' },
      e('div', { className: 'card-h' },
        e('input', { value: tplName, onChange: (ev) => setTplName(ev.target.value),
          style: { border: '1px solid transparent', background: 'transparent', fontSize: 14, fontWeight: 600, borderRadius: 5, padding: '3px 6px', width: 240 },
          onFocus: (ev) => ev.target.style.background = 'var(--surface-2)', onBlur: (ev) => ev.target.style.background = 'transparent' }),
        e('div', { className: 'card-h-actions' },
          e('span', { className: 'badge badge-soft' }, steps.length + ' ' + (lang === 'th' ? 'ขั้นตอน' : 'steps')),
          e('button', { className: 'btn btn-sm btn-pri', onClick: saveTemplate }, e(Icon, { name: 'check', size: 13 }), t('btn.savetpl')))),
      e('div', { className: 'card-b' },
        e('div', { onDragOver: (ev) => { ev.preventDefault(); if (steps.length === 0) setOverIdx(0); }, onDrop: () => onDropAt(steps.length), style: { minHeight: 120 } }, canvasInner),
        e('div', { className: 'faint', style: { fontSize: 10.5, marginTop: 10, display: 'flex', gap: 5, alignItems: 'center' } },
          e(Icon, { name: 'drag', size: 12 }), t('dsg.drophint'))));

    return e('div', null,
      e(PageHead, { title: t('dsg.title'), sub: t('dsg.sub') }),
      e('div', { style: { display: 'grid', gridTemplateColumns: '210px 200px 1fr', gap: 14, alignItems: 'start' } },
        tplCard, paletteCard, canvasCard),
      stepModal && e(StepLibModal, { t, lang, editing: stepModal.mode === 'edit' ? stepModal.step : null, onClose: () => setStepModal(false), onSubmit: stepModal.mode === 'edit' ? editStep : addStep }));
  }

  function StepLibModal({ t, lang, editing, onClose, onSubmit }) {
    const Field = window.PG_UI.Field, Modal = window.PG_UI.Modal;
    const IC_OPTIONS = ['box', 'scale', 'blend', 'fill', 'seal', 'box2', 'wrap', 'carton', 'qc', 'label'];
    const [f, setF] = React.useState(editing
      ? { key: editing.key, nameTh: editing.nameTh || '', name: editing.name || '', dur: editing.dur || 1, ic: editing.ic || 'box', type: editing.type === 'qa' ? 'qa' : 'normal' }
      : { key: '', nameTh: '', name: '', dur: 1, ic: 'box', type: 'normal' });
    const set = (k, v) => setF(p => ({ ...p, [k]: v }));
    return e(Modal, { title: editing ? (lang === 'th' ? 'แก้ไขขั้นตอน' : 'Edit Step') : (lang === 'th' ? 'เพิ่มขั้นตอนใหม่' : 'Add New Step'), onClose, width: 460,
      footer: e(React.Fragment, null, e('button', { className: 'btn', onClick: onClose }, t('btn.cancel')),
        e('button', { className: 'btn btn-pri', disabled: !f.key.trim() || (!f.nameTh && !f.name), onClick: () => onSubmit(f) }, t('btn.save'))) },
      e('div', { className: 'grid g-2', style: { gap: 12 } },
        e('div', { style: { gridColumn: 'span 2' } }, e(Field, { label: (lang === 'th' ? 'รหัสขั้นตอน (key)' : 'Step key'), required: true, hint: editing ? (lang === 'th' ? 'เปลี่ยนรหัสได้ — ระบบจะอัปเดตทุกเทมเพลตและล็อตที่อ้างถึงให้อัตโนมัติ' : 'You may change the key — every template and lot referencing it is updated automatically') : null }, e('input', { className: 'input mono', value: f.key, onChange: ev => set('key', ev.target.value.replace(/\s+/g, '')), placeholder: 'mystep' }))),
        e('div', { style: { gridColumn: 'span 2' } }, e(Field, { label: (lang === 'th' ? 'ประเภทขั้นตอน' : 'Step type') },
          e('div', { className: 'row', style: { gap: 8 } },
            [['normal', lang === 'th' ? 'ปกติ' : 'Normal'], ['qa', lang === 'th' ? 'ตรวจคุณภาพ (QA)' : 'Quality check (QA)']].map(opt => e('button', { key: opt[0], type: 'button', onClick: () => set('type', opt[0]),
              style: { flex: 1, padding: '8px 10px', borderRadius: 7, cursor: 'pointer', fontSize: 12, fontWeight: 600, border: '1px solid ' + (f.type === opt[0] ? (opt[0] === 'qa' ? 'var(--danger)' : 'var(--primary)') : 'var(--border)'), background: f.type === opt[0] ? (opt[0] === 'qa' ? 'var(--danger-tint)' : 'var(--primary-tint)') : 'var(--surface-2)', color: f.type === opt[0] ? (opt[0] === 'qa' ? 'var(--danger)' : 'var(--primary)') : 'var(--text-muted)' } }, opt[1]))),
          f.type === 'qa' && e('div', { className: 'faint', style: { fontSize: 10.5, marginTop: 6 } }, lang === 'th' ? 'สถานี QA จะให้กรอกของดี + ของเสีย (Defect) ตอนรายงานผล' : 'A QA station collects good + defect quantities when reporting output'))),
        e('div', { style: { gridColumn: 'span 2' } }, e(Field, { label: (lang === 'th' ? 'ชื่อ (ไทย)' : 'Name (Thai)'), required: true }, e('input', { className: 'input', value: f.nameTh, onChange: ev => set('nameTh', ev.target.value) }))),
        e('div', { style: { gridColumn: 'span 2' } }, e(Field, { label: (lang === 'th' ? 'ชื่อ (อังกฤษ)' : 'Name (English)') }, e('input', { className: 'input', value: f.name, onChange: ev => set('name', ev.target.value) }))),
        e('div', { style: { gridColumn: 'span 2' } }, e(Field, { label: (lang === 'th' ? 'ไอคอน' : 'Icon') },
          e('div', { className: 'row', style: { gap: 6, flexWrap: 'wrap' } }, IC_OPTIONS.map(ic => e('button', { key: ic, type: 'button', onClick: () => set('ic', ic),
            style: { width: 34, height: 34, borderRadius: 7, display: 'grid', placeItems: 'center', cursor: 'pointer', background: f.ic === ic ? 'var(--primary)' : 'var(--surface-2)', color: f.ic === ic ? '#fff' : 'var(--text-muted)', border: '1px solid ' + (f.ic === ic ? 'var(--primary)' : 'var(--border)') } },
            e(Icon, { name: STEP_ICONS[ic] || 'box', size: 15 }))))))));
  }

  function StepRow({ s, i, lang, t, dragInfo, setOverIdx, onDropAt, removeStep }) {
    return e('div', { draggable: true, onDragStart: () => { dragInfo.current = { type: 'move', uid: s.uid }; },
      onDragOver: (ev) => { ev.preventDefault(); setOverIdx(i); }, onDrop: () => onDropAt(i),
      style: { display: 'flex', alignItems: 'center', gap: 11, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', boxShadow: 'var(--shadow-sm)', cursor: 'grab' } },
      e(Icon, { name: 'drag', size: 15, style: { color: 'var(--text-faint)' } }),
      e('span', { style: { width: 26, height: 26, borderRadius: '50%', background: 'var(--primary)', color: '#fff', fontSize: 11, fontWeight: 700, display: 'grid', placeItems: 'center', flexShrink: 0 } }, i + 1),
      e('span', { style: { width: 30, height: 30, borderRadius: 7, background: 'var(--primary-tint)', color: 'var(--primary)', display: 'grid', placeItems: 'center', flexShrink: 0 } }, e(Icon, { name: STEP_ICONS[s.ic] || 'box', size: 15 })),
      e('div', { style: { flex: 1, minWidth: 0 } },
        e('div', { style: { fontSize: 12.5, fontWeight: 600 } }, lang === 'th' ? s.nameTh : s.name),
        e('div', { className: 'faint', style: { fontSize: 10.5 } }, lang === 'th' ? s.name : s.nameTh)),
      s.type === 'qa' && e('span', { className: 'badge', style: { color: 'var(--danger)', background: 'var(--danger-tint)', fontSize: 9.5 } }, 'QA'),
      e('button', { className: 'btn btn-sm btn-ghost btn-icon', onClick: () => removeStep(s.uid), title: t('btn.delete') }, e(Icon, { name: 'trash', size: 14 })));
  }

  function DropLine({ active, onOver, onDrop }) {
    return e('div', { onDragOver: (ev) => { ev.preventDefault(); onOver(); }, onDrop: onDrop,
      style: { height: active ? 22 : 9, transition: 'height .12s', display: 'flex', alignItems: 'center' } },
      active && e('div', { style: { height: 3, width: '100%', background: 'var(--primary)', borderRadius: 2, boxShadow: '0 0 0 3px var(--primary-tint)' } }));
  }

  window.PG_Designer = Designer;
})();
