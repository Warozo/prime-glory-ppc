/* ============================================================
   Module: Production Process Designer (HERO)
   Drag-drop workflow template builder
   ============================================================ */
(function () {
  const { useI18n } = window.PG_I18N;
  const { PageHead, Icon, useToast } = window.PG_UI;
  const e = React.createElement;
  const STEP_ICONS = { issue: 'box', weigh: 'scale', mix: 'designer', fill: 'fg', seal: 'lock', box2: 'box', wrap: 'layers', carton: 'box', qc: 'checkcircle', label: 'items', box: 'box', blend: 'designer', shrink: 'layers' };

  function Designer({ state, setState }) {
    const { t, lang } = useI18n();
    const toast = useToast();
    const [tplId, setTplId] = React.useState(state.workflows[0].id);
    const [tplName, setTplName] = React.useState(state.workflows[0].name);
    const [steps, setSteps] = React.useState(() => state.workflows[0].steps.map((s, i) => ({ ...s, uid: 'u' + i })));
    const dragInfo = React.useRef(null);
    const [overIdx, setOverIdx] = React.useState(null);

    function saveTemplate() {
      const cleanSteps = steps.map((s, i) => ({ key: s.key, name: s.name, nameTh: s.nameTh, dur: s.dur || 1, ic: s.ic, id: 'st' + i + '_' + s.key }));
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

    // Template list card
    const tplCard = e('div', { className: 'card' },
      e('div', { className: 'card-h' }, e(Icon, { name: 'layers', size: 15, style: { color: 'var(--primary)' } }), e('h3', null, t('dsg.templates'))),
      e('div', { style: { padding: 8, display: 'flex', flexDirection: 'column', gap: 6 } },
        state.workflows.map(w => e('button', { key: w.id, onClick: () => loadTpl(w.id),
          style: { textAlign: 'left', background: tplId === w.id ? 'var(--primary-tint)' : 'var(--surface-2)', border: '1px solid ' + (tplId === w.id ? 'var(--primary)' : 'var(--border)'), borderRadius: 7, padding: '9px 11px', cursor: 'pointer' } },
          e('div', { style: { fontSize: 12, fontWeight: 600 } }, w.name),
          e('div', { className: 'faint mono', style: { fontSize: 10, marginTop: 2 } }, w.steps.length + ' ' + (lang === 'th' ? 'ขั้นตอน' : 'steps') + ' · Line ' + w.line))),
        e('button', { className: 'btn btn-sm', style: { marginTop: 4 }, onClick: () => { setSteps([]); setTplName(lang === 'th' ? 'เทมเพลตใหม่' : 'New Template'); setTplId('new'); } },
          e(Icon, { name: 'plus', size: 13 }), t('btn.new'))));

    // Palette card
    const paletteCard = e('div', { className: 'card' },
      e('div', { className: 'card-h' }, e(Icon, { name: 'designer', size: 15, style: { color: 'var(--primary)' } }), e('h3', null, t('dsg.palette'))),
      e('div', { style: { padding: 8, display: 'flex', flexDirection: 'column', gap: 6 } },
        state.stepLib.map(s => e('div', { key: s.key, draggable: true,
          onDragStart: () => { dragInfo.current = { type: 'new', key: s.key }; },
          style: { display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 7, padding: '7px 9px', cursor: 'grab', opacity: usedKeys.includes(s.key) ? 0.55 : 1 } },
          e('span', { style: { width: 24, height: 24, borderRadius: 6, background: 'var(--primary-tint)', color: 'var(--primary)', display: 'grid', placeItems: 'center', flexShrink: 0 } }, e(Icon, { name: STEP_ICONS[s.ic] || 'box', size: 13 })),
          e('div', { style: { minWidth: 0 } },
            e('div', { style: { fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, lang === 'th' ? s.nameTh : s.name),
            e('div', { className: 'faint', style: { fontSize: 9.5 } }, s.dur + (lang === 'th' ? ' ชม.' : 'h'))),
          e(Icon, { name: 'plus', size: 12, style: { marginLeft: 'auto', color: 'var(--text-faint)' } })))));

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
          e('span', { className: 'badge badge-soft' }, steps.length + ' ' + (lang === 'th' ? 'ขั้นตอน' : 'steps') + ' · ' + totalDur() + (lang === 'th' ? ' ชม.' : 'h')),
          e('button', { className: 'btn btn-sm btn-pri', onClick: saveTemplate }, e(Icon, { name: 'check', size: 13 }), t('btn.savetpl')))),
      e('div', { className: 'card-b' },
        e('div', { onDragOver: (ev) => { ev.preventDefault(); if (steps.length === 0) setOverIdx(0); }, onDrop: () => onDropAt(steps.length), style: { minHeight: 120 } }, canvasInner),
        e('div', { className: 'faint', style: { fontSize: 10.5, marginTop: 10, display: 'flex', gap: 5, alignItems: 'center' } },
          e(Icon, { name: 'drag', size: 12 }), t('dsg.drophint'))));

    return e('div', null,
      e(PageHead, { title: t('dsg.title'), sub: t('dsg.sub') }),
      e('div', { style: { display: 'grid', gridTemplateColumns: '210px 200px 1fr', gap: 14, alignItems: 'start' } },
        tplCard, paletteCard, canvasCard));
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
      e('span', { className: 'badge badge-soft mono' }, t('dsg.duration') + ' ' + (s.dur || 1) + (lang === 'th' ? ' ชม.' : 'h')),
      e('button', { className: 'btn btn-sm btn-ghost btn-icon', onClick: () => removeStep(s.uid), title: t('btn.delete') }, e(Icon, { name: 'trash', size: 14 })));
  }

  function DropLine({ active, onOver, onDrop }) {
    return e('div', { onDragOver: (ev) => { ev.preventDefault(); onOver(); }, onDrop: onDrop,
      style: { height: active ? 22 : 9, transition: 'height .12s', display: 'flex', alignItems: 'center' } },
      active && e('div', { style: { height: 3, width: '100%', background: 'var(--primary)', borderRadius: 2, boxShadow: '0 0 0 3px var(--primary-tint)' } }));
  }

  window.PG_Designer = Designer;
})();
