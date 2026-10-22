// ===================== STACKING WARNINGS & BONUS EDITOR =====================
APP.suppSeen = {};
function checkStackWarnings(c){
  const st = bonusStatus(D); const groups = new Map();
  for (const [b, x] of st){ const k = b.src + '|' + b.ty + '|' + x.by.src + '|' + x.why;
    if (!groups.has(k)) groups.set(k, {b, x, targets: new Set()}); groups.get(k).targets.add(b.t === 'atkw' || b.t === 'dmgw' ? bonusText(b).replace(/^[+–-]\d+\s*\w*\s*/, '') : targetLabel(b.t)); }
  const prev = APP.suppSeen[c.id];
  if ($('#modalRoot').innerHTML) return; // don't interrupt an open dialog; checked again after it closes
  APP.suppSeen[c.id] = new Set(groups.keys());
  if (!prev) return; // first look at this character: no pop-up for what was already there
  const fresh = [...groups].filter(([k]) => !prev.has(k)).map(([, g]) => g);
  if (!fresh.length) return;
  const items = fresh.map(({b, x, targets}) => { const tl = [...targets].slice(0, 4).join(', ') + (targets.size > 4 ? '…' : '');
    return x.why === 'same effect'
      ? (b.src === x.by.src ? `<li><b>${esc(b.src)}</b> is already affecting you. The same effect doesn't stack with itself, so only the strongest one counts (${esc(tl)}).</li>`
         : `<li><b>${esc(b.src)}</b> and <b>${esc(x.by.src)}</b> are the same kind of effect, so they don't stack. Only the strongest counts (${esc(tl)}).</li>`)
      : `<li><b>${esc(b.src)}</b>: its ${sgn(num(b.v))} ${esc(b.ty)} ${num(b.v) < 0 ? 'penalty' : 'bonus'} on ${esc(tl)} doesn't stack with <b>${esc(x.by.src)}</b> (${sgn(num(x.by.v))} ${esc(x.by.ty)}). Only the ${num(b.v) < 0 ? 'worst' : 'best'} ${esc(b.ty)} ${num(b.v) < 0 ? 'penalty' : 'bonus'} counts.</li>`; }).join('');
  const bg = openModal(`<div class="modal narrow" role="alertdialog" aria-label="Bonus doesn't stack"><div class="mh"><h3>Doesn't stack</h3><button class="btn ghost" data-close>Close</button></div>
    <div class="mform"><ul class="warnlist">${items}</ul>
    <p class="hint" style="margin:0">Rule: two bonuses of the same type don't stack, even from different items or spells. Dodge, circumstance, racial and untyped bonuses are the exceptions. The overlapped bonus stays on your sheet, crossed out, in case the better one ends.</p></div>
    <div class="mfoot"><a href="#" class="btn" data-rule="Combining Magical Effects">Read the stacking rule</a><button class="btn pri" data-close>Got it</button></div></div>`);
  $$('[data-close]', bg).forEach(x => x.addEventListener('click', closeModal));
}
document.addEventListener('click', e => { const a = e.target.closest('[data-rule]'); if (!a) return; e.preventDefault();
  const i = RULES.findIndex(r => r.h.toLowerCase() === a.dataset.rule.toLowerCase()); if (i < 0) return; closeModal(); APP.rq = ''; APP.tab = 'rules'; renderAll(); openRuleSection(i); });

function bonusChips(bl, st){ return bl.map(b => { const x = st && st.get(b); return `<span class="bchip ${x ? 'off' : num(b.v) < 0 ? 'pen' : ''}" title="${x ? esc('Doesn’t stack with ' + x.by.src) : 'Applies'}">${esc(bonusText(b))}${x ? ' <b>✕</b>' : ''}</span>`; }).join(''); }
// find the live (derived) bonus objects for a source so chips can show their stacking status
function liveBonuses(kind, id){ return (D.bonusList || []).filter(b => b.kind === kind && b.id === id); }

// Editor for the typed bonuses of an item, effect, feat or library entry
// opts: {title, rows, plusOpts, plus, rowsFor(plus), onSave(rows|null, plus), resettable}
function openBonusEditor(opts){
  let rows = clone(opts.rows || []); let plus = opts.plus; let custom = !!opts.custom;
  const targets = [...TARGET_LABELS(), ['atkw', 'Attacks with a weapon…'], ['dmgw', 'Damage with a weapon…']];
  const bg = openModal(`<div class="modal narrow" role="dialog"><div class="mh"><h3>${esc(opts.title)}</h3><button class="btn ghost" data-close>Close</button></div>
    <div class="mform" id="be-body"></div>
    <div class="mfoot"><div class="row">${opts.resettable ? '<button class="btn ghost" id="be-reset">Reset to SRD</button>' : ''}</div><div class="row"><button class="btn" data-close>Cancel</button><button class="btn pri" id="be-save">Save</button></div></div></div>`);
  $$('[data-close]', bg).forEach(x => x.addEventListener('click', closeModal));
  const body = $('#be-body', bg);
  function draw(){
    body.innerHTML = (opts.plusOpts && opts.plusOpts.length > 1 ? `<div class="row"><span class="cap">Item bonus</span><select id="be-plus" style="width:auto">${opts.plusOpts.map(p => `<option value="${p}" ${p === num(plus) ? 'selected' : ''}>+${p}</option>`).join('')}</select><span class="hint">Pick the version you have.</span></div>` : '') +
      (rows.length ? rows.map((b, i) => `<div class="bonus-row" data-i="${i}">
        <select data-f="t" aria-label="Applies to">${targets.map(([v, l]) => `<option value="${esc(v)}" ${v === b.t ? 'selected' : ''}>${esc(l)}</option>`).join('')}${targets.some(t => t[0] === b.t) ? '' : `<option selected value="${esc(b.t)}">${esc(targetLabel(b.t))}</option>`}</select>
        <select data-f="ty" aria-label="Bonus type">${BONUS_TYPES.map(t => `<option ${t === b.ty ? 'selected' : ''}>${t}</option>`).join('')}</select>
        <input type="number" data-f="v" value="${num(b.v)}" aria-label="Value">
        <input type="text" class="wcol" data-f="w" value="${esc(b.w || '')}" placeholder="${b.t === 'atkw' || b.t === 'dmgw' ? 'weapon name' : '—'}" ${b.t === 'atkw' || b.t === 'dmgw' ? '' : 'disabled'} aria-label="Weapon">
        <button class="btn ghost sm" data-del="${i}" aria-label="Remove bonus">✕</button></div>`).join('') : '<p class="hint" style="margin:0">No bonuses. Add one below, for example +2 deflection to Armor Class.</p>') +
      `<div><button class="btn sm" id="be-add">Add a bonus</button></div>
       <p class="hint" style="margin:0">Use the bonus type printed in the item or spell description (enhancement, deflection, resistance…). Untyped bonuses always stack; typed ones don't stack with the same type.</p>`;
    const ps = $('#be-plus', body); if (ps) ps.addEventListener('change', () => { plus = num(ps.value); if (!custom && opts.rowsFor) rows = opts.rowsFor(plus); draw(); });
    $('#be-add', body).addEventListener('click', () => { rows.push({t:'ac', ty:'untyped', v:1}); custom = true; draw(); });
    $$('[data-del]', body).forEach(x => x.addEventListener('click', () => { rows.splice(+x.dataset.del, 1); custom = true; draw(); }));
    $$('.bonus-row', body).forEach(r => r.addEventListener('change', e => { const i = +r.dataset.i; const f = e.target.dataset.f; if (!f) return;
      rows[i][f] = f === 'v' ? num(e.target.value) : e.target.value; custom = true; if (f === 't') draw(); }));
  }
  draw();
  const rs = $('#be-reset', bg); if (rs) rs.addEventListener('click', () => { custom = false; rows = opts.rowsFor ? opts.rowsFor(plus) : []; draw(); });
  $('#be-save', bg).addEventListener('click', () => { const clean = rows.filter(b => b.t && num(b.v)).map(b => { const o = {t:b.t, ty:b.ty || 'untyped', v:num(b.v)}; if (b.w) o.w = b.w; return o; });
    opts.onSave(custom ? clean : null, plus); closeModal(); renderAll(); });
}
function editItemBonuses(c, it){
  const def = itemBonusDef(it.n); const L = it.lib && libById(it.lib);
  openBonusEditor({title:`Bonuses: ${it.n}`, rows: itemBonuses(it), plusOpts: def && def.plus, plus: it.plus || (def && def.plus ? def.plus[0] : 0),
    rowsFor: p => def ? def.f(p) : (L && L.bon) || [], resettable: !!def, custom: Array.isArray(it.bon),
    onSave:(rows, plus) => { if (rows) it.bon = rows; else delete it.bon; if (def && def.plus) it.plus = plus; markDirty(); }});
}
function editEffectBonuses(c, e){
  const auto = effectBonuses(c, {...e, bon: undefined}).b;
  openBonusEditor({title:`Bonuses: ${e.n}`, rows: Array.isArray(e.bon) ? e.bon : auto, rowsFor: () => auto, resettable: auto.length > 0, custom: Array.isArray(e.bon),
    onSave:(rows) => { if (rows) e.bon = rows; else delete e.bon; markDirty(); }});
}
function editLibBonuses(L){
  openBonusEditor({title:`Bonuses: ${L.n}`, rows: L.bon || [], custom: true, onSave:(rows) => { L.bon = rows || []; markLibDirty(); }});
}
