// ===================== INPUT BINDING =====================
let barTimer = null;
function readVal(el){ if (el.type === 'checkbox') return el.checked; if (el.dataset.num) return el.value === '' ? '' : num(el.value); return el.value; }
$('#main').addEventListener('input', e => {
  const el = e.target; if (el.id === 'noteQ'){ APP.noteQ = el.value; const pos = el.selectionStart; renderAll(); const q = $('#noteQ'); if (q){ q.focus(); q.setSelectionRange(pos, pos); } return; }
  const k = el.dataset.k; if (!k) return; const c = APP_cur(); if (!c) return;
  const v = readVal(el); setPath(c, k, v);
  const m = k.match(/^effects\.(\d+)\.rounds$/);
  if (m){ const ef = c.effects[+m[1]]; if (ef){ if (v === '') ef.rounds = null; else { if (!ef.total || v > ef.total) ef.total = v; ef.expired = v <= 0 && ef.total > 0 ? ef.expired : false; } } }
  markDirty(); updateOutputs();
  if (el.dataset.rerenderBar){ clearTimeout(barTimer); barTimer = setTimeout(renderCharBar, 400); }
  if (el.type === 'checkbox' && el.dataset.rerender) renderAll();
});
$('#main').addEventListener('change', e => { const el = e.target; if (el.dataset.rerender && el.type !== 'checkbox') renderAll(); });

// ===================== ACTIONS =====================
function armConfirm(btn, label='Confirm?'){
  if (btn.dataset.armed) return true;
  btn.dataset.armed = '1'; const old = btn.textContent; btn.textContent = label; btn.style.color = 'var(--bad)';
  setTimeout(() => { if (btn.isConnected){ delete btn.dataset.armed; btn.textContent = old; btn.style.color = ''; } }, 3000);
  return false;
}
const parseSigned = s => { const t = String(s || '').replace('–', '-').replace('%', '').trim(); return t === '' || t === '—' ? '' : num(t); };
function addToItems(c, name, type, w, extra = {}){ if (c.items.some(i => i.n.toLowerCase() === name.toLowerCase())) return false; c.items.push({id:uid('it'), n:name, t:type, qty:1, w:num(w), loc:'carried', note:'', ...extra}); return true; }
function addEffect(c, eff){ c.effects.push(Object.assign({id:uid('e'), note:'', expired:false}, eff)); }
function castCL(c){ let best = 0; for (const k of c.classes){ const info = casterInfo(c, k, D); if (info) best = Math.max(best, info.cl); } return best || totalLevel(c); }

function nextRound(c){
  c.combat.round++; const ended = [];
  for (const e of c.effects){ if (e.expired || e.rounds == null) continue; e.rounds = Math.max(0, num(e.rounds) - 1); if (e.rounds <= 0){ e.expired = true; ended.push(e.n); } }
  if (ended.length) toast(`<b>${ended.map(esc).join(', ')}</b> ${ended.length === 1 ? 'has' : 'have'} ended.`, 'warn');
  if (ended.includes('Barbarian Rage') && num((c.classes.find(k => k.n === 'Barbarian') || {}).lvl) < 17 && !c.effects.some(e => !e.expired && e.n === 'Fatigued')){
    const r = 10 * 6; addEffect(c, {n:'Fatigued', kind:'condition', rounds:null, total:null, note:'Fatigued after rage (lasts for the rest of the encounter)'}); toast('Rage ended: you are <b>fatigued</b>.', 'warn'); }
}
function prevRound(c){
  if (c.combat.round <= 0) return; c.combat.round--;
  for (const e of c.effects){ if (e.rounds == null) continue; if (e.expired || num(e.rounds) < num(e.total)){ e.rounds = num(e.rounds) + 1; e.expired = false; } }
}

function attackFromSRD(w){ const ranged = /Ranged/.test(w.sub); const small = D.size === 'Small' || D.size === 'Tiny';
  return {id:uid('a'), n:w.n, ab:ranged ? 'Dex' : 'Str', enh:0, misc:0, dmg:String(small ? w.dS : w.dM).split('/')[0], crit:String(w.crit).split('/x').length > 2 ? String(w.crit).split('/')[0] : w.crit, note:[w.rng, w.ty, String(w.dM).includes('/') ? 'double weapon (other end: ' + String(small ? w.dS : w.dM).split('/')[1] + ')' : ''].filter(x => x && x !== '—').join(' · '),
    two:/Two-Handed/.test(w.sub), nostr: ranged && /bow|crossbow|net/i.test(w.n) && !/sling/i.test(w.n)}; }
const ACT = {
  delPortrait: (c, b) => { if (!armConfirm(b, 'Remove?')) return 'noRender'; delete c.portrait; },
  addClass: c => c.classes.push({n:'Fighter', lvl:1}),
  delClass: (c, b) => c.classes.splice(+b.dataset.i, 1),
  dmg: c => { const a = num($('#hpDelta').value); if (!a) return; let left = a; const t = num(c.hp.temp); if (t > 0){ const u = Math.min(t, left); c.hp.temp = t - u; left -= u; } c.hp.cur = num(c.hp.cur) - left; toast(`Took <b>${a}</b> damage`); },
  heal: c => { const a = num($('#hpDelta').value); if (!a) return; c.hp.cur = Math.min(num(c.hp.max), num(c.hp.cur) + a); c.hp.nl = Math.max(0, num(c.hp.nl) - a); toast(`Healed <b>${a}</b>`); },
  'pick-armor': c => openPicker({title:'Choose armor', kind:'armor', onPick: e => { const d = e.data;
    c.armor = d ? {n:d.n, bonus:parseSigned(d.ac), enh:0, mdx:parseSigned(d.mdx), acp:parseSigned(d.acp) || 0, asf:parseSigned(d.asf) || 0} : Object.assign(c.armor, {n:e.name});
    if (d) addToItems(c, d.n, 'armor', d.w, {loc:'equipped'}); markDirty(); renderAll(); }}),
  'pick-shield': c => openPicker({title:'Choose shield', kind:'shield', onPick: e => { const d = e.data;
    c.shield = {n:d.n, bonus:parseSigned(d.ac), enh:0, acp:parseSigned(d.acp) || 0, asf:parseSigned(d.asf) || 0}; addToItems(c, d.n, 'armor', d.w, {loc:'equipped'}); markDirty(); renderAll(); }}),
  'clear-armor': c => { c.armor = {n:'', bonus:0, enh:0, mdx:'', acp:0, asf:0}; },
  'clear-shield': c => { c.shield = {n:'', bonus:0, enh:0, acp:0, asf:0}; },
  addAtk: c => openPicker({title:'Add a weapon attack', kind:'weapon', onPick: e => {
    if (e.type === 'custom'){ c.attacks.push(e.lib.kind === 'weapon' ? {id:uid('a'), ...weaponAttack(e.lib, D.size)} : {id:uid('a'), n:e.name, ab:'Str', enh:0, misc:0, dmg:'', crit:'x2', note:'', two:false}); }
    else if (e.type === 'magic'){ c.attacks.push(magicWeaponAttack(e.name)); if (addToItems(c, e.name, 'magic', (e.data || {}).w || 0, {loc:'equipped'})) toast(`Also added <b>${esc(e.name)}</b> to your items`); }
    else { const w = e.data; c.attacks.push(attackFromSRD(w));
      if (addToItems(c, w.n, 'weapon', w.w)) toast(`Also added <b>${esc(w.n)}</b> to your items`); }
    markDirty(); renderAll(); }}),
  addAtkBlank: c => c.attacks.push({id:uid('a'), n:'New attack', ab:'Str', enh:0, misc:0, dmg:'1d6', crit:'x2', note:'', two:false}),
  delAtk: (c, b) => { c.attacks = c.attacks.filter(a => a.id !== b.dataset.id); },
  rollDmg: (c, b) => { const a = c.attacks.find(x => x.id === b.dataset.id); const r = atkCalc(c, a, D); const x = rollExpr(r.dmg);
    if (x) toast(`<span class="cap" style="color:inherit;opacity:.8">${esc(a.n)} damage</span><br><b>${x.total}</b> &nbsp;<span style="opacity:.75">${esc(r.dmg)} → [${x.rolls.join(', ')}]${x.bonus ? ' ' + sgn(x.bonus) : ''}</span>`); return 'noRender'; },
  addFeature: c => openPicker({title:'Add class feature or ability', kind:'feature', onPick: e => {
    c.abilities.push({n:e.name, ref: e.type === 'custom' ? 'custom:' + e.key : e.key, src: e.type === 'custom' ? 'Custom' : e.cat, note:''}); markDirty(); renderAll(); }}),
  delAbil: (c, b) => c.abilities.splice(+b.dataset.i, 1),
  addSub: (c, b) => { const base = b.dataset.base; const opts = SUBSKILLS[base];
    const bg = openModal(`<div class="modal narrow"><div class="mh"><h3>Add ${esc(base)}</h3><button class="btn ghost" data-close>Close</button></div><div class="mform">
      ${F('Specialty', `<select id="ss-sel">${opts.map(o => `<option>${esc(o)}</option>`).join('')}<option value="__other">Other…</option></select>`)}
      ${F('Other specialty', '<input type="text" id="ss-other" placeholder="Type your own">')}</div>
      <div class="mfoot"><span></span><button class="btn pri" id="ss-add">Add</button></div></div>`);
    $('#ss-add', bg).addEventListener('click', () => { let s = $('#ss-sel', bg).value; if (s === '__other' || $('#ss-other', bg).value.trim()) s = $('#ss-other', bg).value.trim() || s; if (!s || s === '__other') return;
      c.subskills.push({id:uid('s'), base, sub:s, ranks:0, misc:0}); markDirty(); closeModal(); renderAll(); }); return 'noRender'; },
  delSub: (c, b) => { c.subskills = c.subskills.filter(s => s.id !== b.dataset.id); },
  addFeat: c => openPicker({title:'Add a feat', kind:'feat', subFn: e => e.type === 'custom' ? 'Custom' : (e.data.pre ? 'Req: ' + e.data.pre.slice(0, 50) : e.sub), onPick: e => {
    c.feats.push(e.type === 'custom' ? {id:uid('f'), n:e.name, custom:e.key, note:''} : {id:uid('f'), n:e.name, note:''}); markDirty(); renderAll(); return true; }}),
  delFeat: (c, b) => c.feats.splice(+b.dataset.i, 1),
  addSpell: (c, b) => { const cls = b.dataset.cls; const key = CAST[cls].key;
    const lists = [[key, cls + ' list']]; if (cls === 'Cleric') c.domains.filter(Boolean).forEach(d => lists.push([d, d + ' domain'])); lists.push(['*', 'All spells']);
    openPicker({title:`Add ${cls.toLowerCase()} spells`, kind:'spell', noCat:false,
      filters:[{id:'cl', label:'Spell list', options:lists, value:key}, {id:'lv', label:'Level', options:[['', 'Any level'], ...Array.from({length:10}, (_, i) => [i, i === 0 ? 'Level 0' : 'Level ' + i])], value:''}],
      match:(e, fv) => { if (e.type === 'custom') return true; const L = fv.cl === '*' ? Object.values(e.data.c)[0] : e.data.c[fv.cl]; return L != null && (fv.lv === '' || L === +fv.lv); },
      sort:(a, b, fv) => { const la = a.type === 'custom' ? 0 : (a.data.c[fv.cl] ?? 0), lb = b.type === 'custom' ? 0 : (b.data.c[fv.cl] ?? 0); return la - lb || a.name.localeCompare(b.name); },
      subFn:(e, fv) => e.type === 'custom' ? (e.lib.lvl || 'Custom') : fv.cl === '*' ? e.sub : 'Level ' + e.data.c[fv.cl],
      onPick:(e, bg) => { const fl = $('#pf-cl', bg).value; const book = c.spells[cls] || (c.spells[cls] = {list:[], used:{}});
        const lvl = e.type === 'custom' ? (parseInt(String(e.lib.lvl).match(/\d/)) || 0) : (e.data.c[fl === '*' ? key : fl] ?? Object.values(e.data.c)[0] ?? 0);
        book.list.push({id:uid('p'), n:e.name, lvl, prep:1, cast:0, dom: fl !== key && fl !== '*'}); markDirty(); renderAll(); return true; }}); return 'noRender'; },
  delSpell: (c, b) => c.spells[b.dataset.cls].list.splice(+b.dataset.i, 1),
  cast: (c, b) => { const cls = b.dataset.cls; const book = c.spells[cls]; const s = book.list[+b.dataset.i]; const info = casterInfo(c, c.classes.find(k => k.n === cls), D);
    const slot = info.slots.find(x => x.lvl === num(s.lvl)); const used = num(book.used[s.lvl]);
    if (!info.ci.spont && num(s.cast) >= num(s.prep)){ toast(`No prepared copies of <b>${esc(s.n)}</b> left.`, 'warn'); return 'noRender'; }
    if (slot && slot.total != null && used >= slot.total){ toast(`No ${lvLabel(num(s.lvl))}-level slots left.`, 'warn'); return 'noRender'; }
    book.used[s.lvl] = used + 1; if (!info.ci.spont) s.cast = num(s.cast) + 1;
    const sd = IDX.spells.get(s.n.toLowerCase()) || libByName('spell', s.n); const dur = parseDuration(sd && sd.dur, info.cl);
    if (dur.rounds != null){ addEffect(c, {n:s.n, kind:'spell', cl:info.cl, rounds:dur.rounds, total:dur.rounds, note:`Cast as ${cls} CL ${info.cl} · ${dur.text}`});
      toast(`Cast <b>${esc(s.n)}</b>. Tracking ${fmtRounds(dur.rounds)} on Combat &amp; Effects.`); }
    else toast(`Cast <b>${esc(s.n)}</b>${dur.inst ? ' (instantaneous)' : ''}.`); },
  pip: (c, b) => { const book = c.spells[b.dataset.cls]; const n = +b.dataset.n; const used = num(book.used[b.dataset.lvl]); book.used[b.dataset.lvl] = n < used ? n : n + 1; },
  rest: (c, b) => { const book = c.spells[b.dataset.cls]; if (!book) return; book.used = {}; book.list.forEach(s => s.cast = 0); toast(`${esc(b.dataset.cls)} spells restored.`); },
  nextTurn: c => { const n = c.combat.list.length; if (c.combat.round === 0){ c.combat.round = 1; c.combat.turn = 0; return; } c.combat.turn++; if (n === 0 || c.combat.turn >= n){ c.combat.turn = 0; nextRound(c); } },
  nextRound: c => { if (c.combat.round === 0) c.combat.round = 1; else { c.combat.turn = 0; nextRound(c); } },
  prevRound: c => { prevRound(c); c.combat.turn = 0; },
  rollMyInit: c => { const r = rollD(20); let me = c.combat.list.find(x => x.me); if (!me){ me = {id:uid('i'), n:c.name, me:true, hp:''}; c.combat.list.push(me); }
    me.init = r + D.init; me.mod = D.init; me.n = c.name; toast(`Initiative <b>${me.init}</b> <span style="opacity:.75">d20 ${r} ${sgn(D.init)}</span>`); },
  endCombat: (c, b) => { if (!armConfirm(b, 'End? Click again')) return 'noRender'; c.combat.round = 0; c.combat.turn = 0; c.combat.list = c.combat.list.filter(x => x.me); },
  addInit: c => { const n = $('#newInitName').value.trim(); if (!n) { $('#newInitName').focus(); return 'noRender'; } c.combat.list.push({id:uid('i'), n, init: num($('#newInitVal').value), hp:''}); setTimeout(() => $('#newInitName') && $('#newInitName').focus(), 0); },
  delInit: (c, b) => { c.combat.list = c.combat.list.filter(x => x.id !== b.dataset.id); },
  sortInit: () => {},
  clearInit: (c, b) => { if (!armConfirm(b)) return 'noRender'; c.combat.list = []; c.combat.turn = 0; },
  addCond: c => openPicker({title:'Add a condition', kind:'cond', noCat:true, onPick: e => { addEffect(c, {n:e.name, kind:'condition', rounds:null, total:null, ...(e.type === 'custom' ? {lib:e.key} : {})}); markDirty(); renderAll(); }}),
  addSpellEff: c => openPicker({title:'Track a spell effect', kind:'spell', filters:[{id:'cl2', label:'Caster level', options:Array.from({length:20}, (_, i) => [i + 1, 'Caster level ' + (i + 1)]), value:castCL(c)}],
    subFn: e => e.type === 'custom' ? (e.lib.dur || 'Custom') : (e.data.dur || ''),
    onPick:(e, bg) => { const cl = num($('#pf-cl2', bg).value); const sd = e.type === 'custom' ? e.lib : e.data; const dur = parseDuration(sd.dur, cl);
      addEffect(c, {n:e.name, kind:'spell', cl, rounds:dur.rounds, total:dur.rounds, note:`CL ${cl} · ${dur.text}`}); markDirty(); renderAll(); }}),
  addCustomEff: c => addEffect(c, {n:'New effect', kind:'custom', rounds:10, total:10, note:''}),
  delEff: (c, b) => { c.effects = c.effects.filter(e => e.id !== b.dataset.id); },
  effRenew: (c, b) => { const e = c.effects.find(x => x.id === b.dataset.id); e.rounds = e.total || 10; e.expired = false; },
  clearExpired: c => { c.effects = c.effects.filter(e => !e.expired); },
  addItem: c => openPicker({title:'Add items', kind:'item', onPick: e => {
    let it;
    if (e.type === 'custom'){ it = {id:uid('it'), n:e.name, t:'custom', lib:e.key, qty:1, w:num(e.lib.w), loc:'carried', note:''}; c.items.push(it); onItemAdded(c, it); markDirty(); renderAll(); return true; }
    else it = {id:uid('it'), n:e.name, t:e.type, qty:1, w:num((e.data || {}).w), loc:'carried', note:''};
    const def = itemBonusDef(it.n); if (def){ it.loc = 'equipped'; if (def.plus) it.plus = def.plus[0]; }
    c.items.push(it); markDirty(); renderAll();
    if (def && def.plus && def.plus.length > 1){ closeModal(); editItemBonuses(c, it); toast(`Equipped <b>${esc(it.n)}</b>. Pick its bonus.`); return 'handled'; }
    if (def) toast(`Equipped <b>${esc(it.n)}</b>. Its bonuses now apply.`);
    return true; }}),
  itemBon: (c, b) => { editItemBonuses(c, c.items.find(i => i.id === b.dataset.id)); return 'noRender'; },
  effBon: (c, b) => { editEffectBonuses(c, c.effects.find(e => e.id === b.dataset.id)); return 'noRender'; },
  libBon: (c, b) => { editLibBonuses(libById(b.dataset.id)); return 'noRender'; },
  rage: c => { const lvl = num((c.classes.find(k => k.n === 'Barbarian') || {}).lvl); const v = lvl >= 20 ? 8 : lvl >= 11 ? 6 : 4;
    const conMod = D.Con + v / 2; const r = Math.max(1, 3 + conMod); if (c.combat.round === 0) c.combat.round = 1;
    addEffect(c, {n:'Barbarian Rage', kind:'ability', ref:'Barbarian|Rage (Ex)', rounds:r, total:r, note:`Lasts 3 + Con modifier = ${r} rounds`}); toast(`Raging for <b>${r}</b> rounds.`); },
  newCustomItem: c => { openLibEditor(null, 'item', e => { const it = {id:uid('it'), n:e.name, t:'custom', lib:e.key, qty:1, w:num(e.lib.w), loc:'carried', note:''}; c.items.push(it); onItemAdded(c, it); markDirty(); }); return 'noRender'; },
  delItem: (c, b) => { const it = c.items.find(i => i.id === b.dataset.id); c.items = c.items.filter(i => i.id !== b.dataset.id); if (it) onItemRemoved(c, it); },
  editItem: (c, b) => { openItemEditor(b.dataset.id); return 'noRender'; },
  customize: (c, b) => { customizeItem(c, c.items.find(i => i.id === b.dataset.id)); return 'noRender'; },
  wield: (c, b) => { const it = c.items.find(i => i.id === b.dataset.id); const L = it.lib && libById(it.lib);
    if (L) c.attacks.push({id:uid('a'), ...weaponAttack(L, D.size)}); else if (MAGIC_WEAPONS[normKey(it.n)]) c.attacks.push(magicWeaponAttack(it.n)); else { const w = IDX.weapons.get(it.n.toLowerCase()); c.attacks.push(attackFromSRD(w)); }
    it.loc = 'equipped'; toast(`<b>${esc(it.n)}</b> added to your attacks.`); },
  wear: (c, b) => { const it = c.items.find(i => i.id === b.dataset.id); const L = it.lib && libById(it.lib); let slot = L ? L.kind : (/shield|buckler/i.test(it.n) ? 'shield' : 'armor'); const old = c[slot].n;
    if (L){ c[slot] = armorSlot(L); } else { const d = IDX.armor.get(it.n.toLowerCase());
      c[slot] = slot === 'armor' ? {n:d.n, bonus:parseSigned(d.ac), enh:0, mdx:parseSigned(d.mdx), acp:parseSigned(d.acp) || 0, asf:parseSigned(d.asf) || 0} : {n:d.n, bonus:parseSigned(d.ac), enh:0, acp:parseSigned(d.acp) || 0, asf:parseSigned(d.asf) || 0}; }
    c.items.forEach(x => { if (x.id !== it.id && x.loc === 'equipped' && old && x.n === old) x.loc = 'carried'; }); it.loc = 'equipped'; toast(`Now wearing <b>${esc(it.n)}</b> as your ${slot}.`); },
  itemPip: (c, b) => { const it = c.items.find(i => i.id === b.dataset.id); it.used = it.used || {}; const n = +b.dataset.n; const used = num(it.used[b.dataset.k]); it.used[b.dataset.k] = n < used ? n : n + 1; },
  restItems: c => { c.items.forEach(it => { if (it.used) it.used = {}; }); toast('Per-day item uses restored.'); },
  castItem: (c, b) => { const it = c.items.find(i => i.id === b.dataset.id); const L = libById(it.lib); const s = L.spells[+b.dataset.i]; it.used = it.used || {}; const k = 's' + b.dataset.i;
    if (s.mode === 'day' && num(it.used[k]) >= Math.max(1, num(s.uses))){ toast(`No uses of <b>${esc(s.n)}</b> left today.`, 'warn'); return 'noRender'; }
    if (s.mode === 'once' && num(it.used[k])){ toast(`<b>${esc(it.n)}</b>'s ${esc(s.n)} is used up.`, 'warn'); return 'noRender'; }
    if (s.mode === 'charges'){ const cost = num(s.cost || 1); const have = num(it.charges ?? L.charges); if (have < cost){ toast(`Not enough charges left in <b>${esc(it.n)}</b>.`, 'warn'); return 'noRender'; } it.charges = have - cost; }
    else if (s.mode !== 'atwill') it.used[k] = num(it.used[k]) + 1;
    const sd = IDX.spells.get(s.n.toLowerCase()) || libByName('spell', s.n); const cl = num(s.cl) || 1; const dur = parseDuration(sd && sd.dur, cl);
    if (dur.rounds != null){ addEffect(c, {n:s.n, kind:'spell', cl, rounds:dur.rounds, total:dur.rounds, note:`From ${it.n} · CL ${cl} · ${dur.text}${s.dc ? ' · DC ' + s.dc : ''}`}); toast(`Used <b>${esc(s.n)}</b> from ${esc(it.n)}. Tracking ${fmtRounds(dur.rounds)}.`); }
    else toast(`Used <b>${esc(s.n)}</b> from ${esc(it.n)}${s.dc ? ` (DC ${s.dc})` : ''}.`); },
  addNote: c => { c.notes.unshift({id:uid('n'), t:'', date:new Date().toISOString().slice(0, 10), body:''}); APP.noteQ = ''; setTimeout(() => { const t = $('input.title'); if (t) t.focus(); }, 0); },
  delNote: (c, b) => { if (!armConfirm(b, 'Delete?')) return 'noRender'; c.notes = c.notes.filter(n => n.id !== b.dataset.id); },
  addQuest: c => { c.quests.unshift({id:uid('q'), t:'', giver:'', where:'', status:'active', reward:'', note:'', obj:[{t:'', done:false}]}); setTimeout(() => { const t = $('.quest input.title'); if (t) t.focus(); }, 0); },
  delQuest: (c, b) => { if (!armConfirm(b, 'Delete?')) return 'noRender'; c.quests = c.quests.filter(q => q.id !== b.dataset.id); },
  addObj: (c, b) => { c.quests.find(q => q.id === b.dataset.q).obj.push({t:'', done:false}); },
  delObj: (c, b) => { c.quests.find(q => q.id === b.dataset.q).obj.splice(+b.dataset.j, 1); },
  libNew: (c, b) => { openLibEditor(null, b.dataset.t); return 'noRender'; },
  libEdit: (c, b) => { openLibEditor(b.dataset.id); return 'noRender'; },
  libGive: (c, b) => { const e = libById(b.dataset.id); const it = {id:uid('it'), n:e.n, t:'custom', lib:e.id, qty:1, w:num(e.w), loc:'carried', note:''}; c.items.push(it); toast(`Added <b>${esc(e.n)}</b> to ${esc(c.name)}'s items`); onItemAdded(c, it); },
};
document.addEventListener('click', e => {
  const roll = e.target.closest('.roll'); if (roll){ rollToast(roll.dataset.label || 'Roll', num(roll.dataset.bonus)); return; }
  const tab = e.target.closest('[data-tab]'); if (tab){ APP.tab = tab.dataset.tab; renderAll(); window.scrollTo({top:0}); return; }
  const b = e.target.closest('[data-act]'); if (!b) return; const c = APP_cur(); if (!c) return;
  const fn = ACT[b.dataset.act]; if (!fn) return;
  const r = fn(c, b); if (r === 'noRender') return;
  markDirty(); renderAll();
});

// ===================== CHARACTER BAR =====================
$('#charSel').addEventListener('change', e => { APP.curId = e.target.value; scheduleSave(); renderAll(); });
$('#newChar').addEventListener('click', () => { const c = newChar(); APP.chars[c.id] = c; APP.curId = c.id; APP.tab = 'sheet'; markDirty(c.id); renderAll(); setTimeout(() => { const n = $('#k-name'); if (n){ n.focus(); n.select(); } }, 0); });
$('#dupChar').addEventListener('click', () => { const s = APP_cur(); if (!s) return; const c = clone(s); c.id = uid('c'); c.name = s.name + ' (copy)'; APP.chars[c.id] = c; APP.curId = c.id; markDirty(c.id); renderAll(); toast('Copied. You are now editing the copy.'); });
document.addEventListener('click', async e => {
  if (e.target.id !== 'delChar') return; const c = APP_cur(); if (!c) return;
  if (!armConfirm(e.target, `Delete ${c.name.split(' ')[0] || 'character'}?`)) return;
  delete APP.chars[c.id]; APP.dirty.delete(c.id); await removeDoc(c.id); APP.curId = (charList()[0] || {}).id || null; scheduleSave(); renderAll(); toast('Character deleted.');
});
$('#expChar').addEventListener('click', async () => {
  const c = APP_cur(); if (!c) return; const data = JSON.stringify({format:'codex35', version:1, character:c, library:APP.lib.entries}, null, 2);
  const fname = (c.name || 'character').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-') + '.json';
  let dl = null; try { dl = await window.claude?.use?.('downloads'); } catch {}
  if (dl){ try { await dl.save({filename:fname, data}); toast('Exported.'); return; } catch (err){ if (err && err.code && err.code !== 'unavailable'){ return; } } }
  if (!window.claude){ // running on its own (e.g. GitHub Pages): a normal browser download works
    try { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([data], {type:'application/json'})); a.download = fname; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); toast('Exported.'); return; } catch {} }
  const bg = openModal(`<div class="modal narrow"><div class="mh"><h3>Export ${esc(c.name)}</h3><button class="btn ghost" data-close>Close</button></div><div class="mform"><p class="hint" style="margin:0">Copy this text and save it as <b>${esc(fname)}</b>. Use Import to load it again.</p><textarea id="expTxt" rows="14" style="font-family:ui-monospace,monospace;font-size:12px">${esc(data)}</textarea></div><div class="mfoot"><span></span><button class="btn pri" id="expCopy">Copy</button></div></div>`);
  $('#expCopy', bg).addEventListener('click', async () => { const t = $('#expTxt', bg); try { await navigator.clipboard.writeText(t.value); toast('Copied to clipboard.'); } catch { t.select(); toast('Press Ctrl/Cmd + C to copy.'); } });
});
$('#impFile').addEventListener('change', async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  try { const j = JSON.parse(await f.text()); const ch = j.character || (j.abil ? j : null); if (!ch) throw new Error('No character found in that file.');
    const c = migrate(clone(ch)); c.id = uid('c'); c.updatedAt = Date.now(); APP.chars[c.id] = c; APP.curId = c.id;
    if (Array.isArray(j.library)){ let n = 0; for (const L of j.library){ if (!libById(L.id) && !libByName(L.t, L.n)){ APP.lib.entries.push(L); n++; } } if (n) markLibDirty(); }
    markDirty(c.id); renderAll(); toast(`Imported <b>${esc(c.name)}</b>.`);
  } catch (err){ toast('That file couldn\'t be read as a character export. ' + esc(err.message || ''), 'warn'); }
});
$('#rNext').addEventListener('click', () => { const c = APP_cur(); if (!c) return; ACT.nextRound(c); markDirty(); renderAll(); });
$('#rPrev').addEventListener('click', () => { const c = APP_cur(); if (!c) return; ACT.prevRound(c); markDirty(); renderAll(); });

// ===================== BOOT =====================
loadLocal();
try { const t = localStorage.getItem('codex35-tab'); if (t && TABS.some(x => x[0] === t)) APP.tab = t; } catch {}
if (location.hash && TABS.some(x => x[0] === location.hash.slice(1))) APP.tab = location.hash.slice(1);
if (!Object.keys(APP.chars).length){ const ex = exampleChar(); APP.chars[ex.id] = ex; APP.curId = ex.id; }
renderAll();
connectDb();
