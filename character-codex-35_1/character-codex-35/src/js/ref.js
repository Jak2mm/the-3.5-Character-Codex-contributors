// ===================== REFERENCE LOOKUP =====================
function stat(pairs){ const r = pairs.filter(p => p[1] !== undefined && p[1] !== null && p[1] !== ''); if (!r.length) return '';
  return '<dl class="statblock">' + r.map(p => `<dt>${esc(p[0])}</dt><dd>${esc(p[1])}</dd>`).join('') + '</dl>'; }
function textToHtml(t){ return String(t || '').split(/\n\s*\n/).map(p => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join(''); }
function getRef(type, name){
  if (!name) return null; const k = String(name).toLowerCase(); let x;
  switch (type){
    case 'spell':
      x = IDX.spells.get(k); if (!x){ const L = libByName('spell', name); if (L) return customRef(L); return null; }
      return {title:x.n, sub:x.sch, html: stat([['Level',x.lvl],['Components',x.comp],['Casting time',x.ct],['Range',x.rng],['Target',x.tgt],['Area',x.area],['Effect',x.eff],['Duration',x.dur],['Saving throw',x.save],['Spell resistance',x.sr]]) + `<div class="rt">${x.d}</div>`};
    case 'feat':
      x = IDX.feats.get(k); if (!x){ const L = libByName('feat', name); if (L) return customRef(L); return null; }
      return {title:x.n, sub:x.t, html:`<div class="rt">${x.d}</div>`};
    case 'skill': {
      const base = k.replace(/\s*\(.*\)$/, ''); x = IDX.skills.get(base); if (!x) return null;
      return {title:name, sub: x.ab + (x.tr ? ' · trained only' : '') + (x.acp ? ' · armor check penalty' : ''), html:`<div class="rt">${x.d}</div>`}; }
    case 'cond':
      x = IDX.conditions.get(k); if (!x){ const L = libByName('condition', name); if (L) return customRef(L); return null; }
      return {title:x.n, sub:'Condition', html:`<div class="rt">${x.d}</div>`};
    case 'race':
      x = raceData(name); if (!x) return null;
      return {title:x.n, sub:`${x.size} · ${x.spd} ft.`, html:`<div class="rt">${x.d}</div>`};
    case 'class': {
      x = classData(name); if (!x) return null;
      const feats = x.f.map(f => f.n).join(', ');
      return {title:x.n, sub:`d${x.hd} · ${x.sp} + Int skill points`, html: stat([['Hit die','d' + x.hd],['Alignment',x.al],['Skill points',x.sp + ' + Int mod per level'],['Class skills',x.cs.join(', ')]]) + `<div class="rt"><p><b>Features:</b> ${esc(feats)}</p></div>`}; }
    case 'feature': {
      const [cn, fn] = String(name).split('|'); const cd = classData(cn); if (!cd){ const L = libByName('ability', fn || name); return L ? customRef(L) : null; }
      x = cd.f.find(f => f.n.toLowerCase() === String(fn).toLowerCase()); if (!x) return null;
      return {title:x.n, sub:cd.n + ' class feature', html:`<div class="rt">${x.d}</div>`}; }
    case 'racial': {
      const L = libByName('ability', name); return L ? customRef(L) : null; }
    case 'weapon':
      x = IDX.weapons.get(k); if (!x) return null;
      return {title:x.n, sub:`${x.cat} · ${x.sub}`, html: stat([['Cost',x.cost],['Damage (S/M)',x.dS + ' / ' + x.dM],['Critical',x.crit],['Range',x.rng],['Weight',x.w ? x.w + ' lb.' : '—'],['Type',x.ty]]) + (x.d ? `<div class="rt">${x.d}</div>` : '<p class="hint">No special rules beyond the table entry.</p>')};
    case 'armor':
      x = IDX.armor.get(k); if (!x) return null;
      return {title:x.n, sub:x.cat, html: stat([['Cost',x.cost],['AC bonus',x.ac],['Max Dex',x.mdx],['Check penalty',x.acp],['Spell failure',x.asf],['Speed (30/20)',x.s30 + ' / ' + x.s20],['Weight',x.w ? x.w + ' lb.' : '—']]) + (x.d ? `<div class="rt">${x.d}</div>` : '')};
    case 'gear':
      x = IDX.gear.get(k); if (!x) return null;
      return {title:x.n, sub:x.cat, html: stat([['Cost',x.cost],['Weight',x.w ? x.w + ' lb.' : '—']]) + (x.d ? `<div class="rt">${x.d}</div>` : '<p class="hint">Standard adventuring item; no special rules.</p>')};
    case 'magic':
      x = IDX.magic.get(k); if (!x) return null;
      return {title:x.n, sub:x.cat, html: stat([['Price',x.price],['Weight',x.w ? x.w + ' lb.' : '']]) + `<div class="rt">${x.d}</div>`};
    case 'item': {
      for (const t of ['weapon','armor','gear','magic']){ const r = getRef(t, name); if (r) return r; }
      const L = libByName('item', name); return L ? customRef(L) : null; }
    case 'custom': { const L = libById(name); return L ? customRef(L) : null; }
    case 'gloss': { const g = GLOSS[name]; return g ? {title:g[0], sub:'Rules summary', html:`<div class="rt"><p>${esc(g[1])}</p></div>`} : null; }
    case 'domain': {
      const sp = SRD.spells.filter(s => s.c[name] != null).sort((a, b) => a.c[name] - b.c[name]);
      return {title:name + ' Domain', sub:'Cleric domain spells', html:'<div class="rt"><p>' + sp.map(s => `${s.c[name]}: ${esc(s.n)}`).join('<br>') + '</p></div>'}; }
  }
  return null;
}
function customRef(L){
  const T = {item:'Custom item', feat:'Custom feat', spell:'Custom spell', ability:'Custom ability', condition:'Custom condition'};
  const pairs = L.t === 'item' ? [['Cost',L.cost],['Weight',L.w ? L.w + ' lb.' : '']] : L.t === 'spell' ? [['Level',L.lvl],['School',L.sch],['Duration',L.dur]] : L.t === 'feat' ? [['Prerequisites',L.pre]] : [];
  return {title:L.n, sub:T[L.t] || 'Custom', html: stat(pairs) + `<div class="rt">${textToHtml(L.d) || '<p class="hint">No description yet.</p>'}</div>`, custom:true};
}
const refA = (type, name, label, cls='') => `<span class="ref ${cls}" tabindex="0" data-ref="${esc(type)}" data-name="${esc(name)}">${esc(label ?? name)}</span>`;

// ===================== TOOLTIP =====================
const tipEl = document.getElementById('tip'); let tipFor = null;
function showTip(el, x, y){
  const r = getRef(el.dataset.ref, el.dataset.name); if (!r){ hideTip(); return; }
  tipFor = el;
  tipEl.innerHTML = `<div class="th"><span>${esc(r.title)}</span><span style="opacity:.75;font-weight:600">${esc(r.sub || '')}</span></div><div class="tb">${r.html}</div>`;
  tipEl.hidden = false; placeTip(x, y);
}
function placeTip(x, y){
  const w = tipEl.offsetWidth, h = tipEl.offsetHeight, vw = innerWidth, vh = innerHeight;
  let L = x + 16, T = y + 16; if (L + w > vw - 8) L = Math.max(8, x - w - 16); if (T + h > vh - 8) T = Math.max(8, vh - h - 8);
  tipEl.style.left = L + 'px'; tipEl.style.top = T + 'px';
}
function hideTip(){ tipEl.hidden = true; tipFor = null; }
document.addEventListener('mouseover', e => { const el = e.target.closest('[data-ref]'); if (el && matchMedia('(hover:hover)').matches){ if (el !== tipFor) showTip(el, e.clientX, e.clientY); } else if (tipFor && !e.target.closest('#tip')) hideTip(); });
document.addEventListener('mousemove', e => { if (tipFor && !tipEl.hidden) placeTip(e.clientX, e.clientY); });
document.addEventListener('focusin', e => { const el = e.target.closest('[data-ref]'); if (el && el.classList.contains('ref')){ const b = el.getBoundingClientRect(); showTip(el, b.left, b.bottom); } });
document.addEventListener('focusout', e => { if (e.target.closest('[data-ref]')) hideTip(); });
document.addEventListener('scroll', hideTip, true);
// click / tap opens a full detail modal
document.addEventListener('click', e => { const el = e.target.closest('.ref[data-ref]'); if (!el) return; e.preventDefault(); hideTip(); openDetail(el.dataset.ref, el.dataset.name); });
document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('.ref[data-ref]')){ hideTip(); openDetail(e.target.dataset.ref, e.target.dataset.name); } if (e.key === 'Escape') closeModal(); });
function openDetail(type, name){
  const r = getRef(type, name); if (!r) return;
  openModal(`<div class="modal narrow" role="dialog" aria-label="${esc(r.title)}"><div class="mh"><h3>${esc(r.title)}</h3><button class="btn ghost" data-close>Close</button></div>
    <div class="mprev"><p class="hint" style="margin-top:0">${esc(r.sub || '')}</p>${r.html}</div>
    <div class="mfoot"><span class="hint">Want the surrounding rules?</span><button class="btn" id="dt-rules">Search rules for “${esc(r.title)}”</button></div></div>`);
  const b = document.getElementById('dt-rules'); if (b) b.addEventListener('click', () => lookupRules(r.title.replace(/\s*\(.*\)$/, '')));
}

// ===================== MODAL =====================
function openModal(html){ const root = $('#modalRoot'); root.innerHTML = `<div class="modal-bg">${html}</div>`;
  root.firstChild.addEventListener('mousedown', e => { if (e.target === root.firstChild) closeModal(); });
  $$('[data-close]', root).forEach(b => b.addEventListener('click', closeModal)); return root.firstChild; }
function closeModal(){ $('#modalRoot').innerHTML = ''; hideTip(); }

// ===================== PICKER =====================
// opts: {title, kind, onPick(entry), filters:[{id,label,options:[[v,l]],value}], match(entry, fv), extra}
function pickerEntries(kind){
  const L = t => libEntries(t).map(e => ({name:e.n, sub:'Custom', cat:'Custom', type:'custom', key:e.id, lib:e}));
  switch (kind){
    case 'spell': return SRD.spells.map(s => ({name:s.n, sub:s.lvl, cat:s.sch.split(' ')[0], type:'spell', key:s.n, data:s})).concat(L('spell').map(e => ({...e, data:{c:{}, lvlNum:num(e.lib.lvl)}})));
    case 'feat': return SRD.feats.map(f => ({name:f.n, sub:f.t, cat:f.t, type:'feat', key:f.n, data:f})).concat(L('feat'));
    case 'cond': return SRD.conditions.map(f => ({name:f.n, sub:'Condition', cat:'SRD', type:'cond', key:f.n})).concat(L('condition'));
    case 'item': return [].concat(
      SRD.weapons.map(w => ({name:w.n, sub:`${w.cost} · ${w.w || 0} lb.`, cat:'Weapons', type:'weapon', key:w.n, data:w})),
      SRD.armor.map(w => ({name:w.n, sub:`${w.cost} · ${w.w || 0} lb.`, cat:'Armor & shields', type:'armor', key:w.n, data:w})),
      SRD.gear.map(w => ({name:w.n, sub:`${w.cost} · ${w.w || 0} lb.`, cat:'Gear: ' + w.cat, type:'gear', key:w.n, data:w})),
      SRD.magic.map(w => ({name:w.n, sub:w.price || '', cat:'Magic: ' + w.cat, type:'magic', key:w.n, data:w})),
      L('item').map(e => ({...e, sub:`${e.lib.cost || ''} ${e.lib.w ? '· ' + e.lib.w + ' lb.' : ''}`})));
    case 'weapon': return SRD.weapons.filter(w => w.dM !== '—').map(w => ({name:w.n, sub:`${w.dM} · ${w.crit}`, cat:w.cat, type:'weapon', key:w.n, data:w}))
      .concat(L('item').map(e => ({...e, sub:'Custom item'})));
    case 'armor': return SRD.armor.filter(a => !/shield|buckler|spikes|gauntlet/i.test(a.n)).map(a => ({name:a.n, sub:`${a.ac} AC · max Dex ${a.mdx}`, cat:a.cat, type:'armor', key:a.n, data:a}))
      .concat(SRD.magic.filter(m => m.cat === 'Specific Armor/Shield').map(m => ({name:m.n, sub:m.price || '', cat:'Specific magic', type:'magic', key:m.n})));
    case 'shield': return SRD.armor.filter(a => /shield|buckler/i.test(a.n) && !/spikes/i.test(a.n)).map(a => ({name:a.n, sub:`${a.ac} AC`, cat:a.cat, type:'armor', key:a.n, data:a}));
    case 'feature': {
      const out = []; for (const k of APP_cur().classes){ const cd = classData(k.n); if (!cd) continue;
        cd.f.forEach(f => { if (/^Weapon and Armor Proficiency$/.test(f.n)) return; out.push({name:f.n, sub:cd.n, cat:cd.n, type:'feature', key:cd.n + '|' + f.n}); }); }
      return out.concat(L('ability')); }
  }
  return [];
}
function openPicker(opts){
  const all = pickerEntries(opts.kind);
  const cats = [...new Set(all.map(e => e.cat))].sort();
  const filters = opts.filters || [];
  const fhtml = filters.map(f => `<select id="pf-${f.id}" aria-label="${esc(f.label)}">${f.options.map(o => `<option value="${esc(o[0])}" ${String(o[0]) === String(f.value ?? '') ? 'selected' : ''}>${esc(o[1])}</option>`).join('')}</select>`).join('');
  const catSel = opts.noCat ? '' : `<select id="pf-cat" aria-label="Category"><option value="">All categories</option>${cats.map(c => `<option>${esc(c)}</option>`).join('')}</select>`;
  const bg = openModal(`<div class="modal" role="dialog" aria-label="${esc(opts.title)}"><div class="mh"><h3>${esc(opts.title)}</h3><button class="btn ghost" data-close>Close</button></div>
    <div class="mfilters"><input type="search" id="pf-q" placeholder="Search by name…" autocomplete="off">${fhtml}${catSel}</div>
    <div class="mbody"><div class="mlist" id="pf-list"></div><div class="mprev" id="pf-prev"><p class="hint">Hover or select an entry to read it here.</p></div></div>
    <div class="mfoot"><span class="hint" id="pf-count"></span><div class="row">${opts.extra || ''}<button class="btn" id="pf-custom">Create custom…</button><button class="btn pri" id="pf-add" disabled>Add</button></div></div></div>`);
  let sel = null, shown = [];
  const q = $('#pf-q', bg), list = $('#pf-list', bg), prev = $('#pf-prev', bg);
  function preview(e){ const r = e.type === 'custom' ? customRef(e.lib) : getRef(e.type, e.key);
    prev.innerHTML = r ? `<h4>${esc(r.title)}</h4><p class="hint" style="margin-top:0">${esc(r.sub || '')}</p>${r.html}` : `<h4>${esc(e.name)}</h4>`; }
  function draw(){
    const t = q.value.trim().toLowerCase(); const fv = {}; filters.forEach(f => fv[f.id] = $('#pf-' + f.id, bg).value);
    const cat = opts.noCat ? '' : $('#pf-cat', bg).value;
    shown = all.filter(e => (!t || e.name.toLowerCase().includes(t)) && (!cat || e.cat === cat) && (!opts.match || opts.match(e, fv)));
    if (opts.sort) shown.sort((a, b) => opts.sort(a, b, fv));
    list.innerHTML = shown.slice(0, 700).map((e, i) => `<div class="opt" data-i="${i}"><span>${esc(e.name)}${e.type === 'custom' ? ' <span class="pill gold">custom</span>' : ''}</span><span class="s">${esc(opts.subFn ? opts.subFn(e, fv) : e.sub || '')}</span></div>`).join('') || '<div class="empty">Nothing matches. Try a shorter search, or create a custom entry.</div>';
    $('#pf-count', bg).textContent = `${shown.length} match${shown.length === 1 ? '' : 'es'}`;
  }
  list.addEventListener('mouseover', e => { const o = e.target.closest('.opt'); if (o) preview(shown[o.dataset.i]); });
  list.addEventListener('click', e => { const o = e.target.closest('.opt'); if (!o) return; $$('.opt.act', list).forEach(x => x.classList.remove('act')); o.classList.add('act'); sel = shown[o.dataset.i]; preview(sel); $('#pf-add', bg).disabled = false; });
  list.addEventListener('dblclick', e => { const o = e.target.closest('.opt'); if (o){ sel = shown[o.dataset.i]; pick(); } });
  function pick(){ if (!sel) return; const keep = opts.onPick(sel, bg); if (keep){ toast(`Added <b>${esc(sel.name)}</b>`); } else closeModal(); }
  $('#pf-add', bg).addEventListener('click', pick);
  $('#pf-custom', bg).addEventListener('click', () => { const t = {spell:'spell', feat:'feat', cond:'condition', item:'item', weapon:'item', armor:'item', shield:'item', feature:'ability'}[opts.kind] || 'item'; closeModal(); openLibEditor(null, t, opts.onPick); });
  q.addEventListener('input', draw); $$('select', bg).forEach(s => s.addEventListener('change', draw));
  draw(); setTimeout(() => q.focus(), 30);
}
