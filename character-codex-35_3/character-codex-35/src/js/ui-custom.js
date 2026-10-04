// ===================== CUSTOM ITEMS: weapons, armor, special abilities, bonuses, spells =====================
// Library item: {id, t:'item', n, d, w, cost, kind:'gear'|'weapon'|'armor'|'shield',
//   wpn:{base, dS, dM, crit, rng, ty, ab, two, enh, mw, specials:[], xdmg},
//   arm:{base, bonus, mdx, acp, asf, enh, mw, specials:[]},
//   bon:[typed bonuses], abil:[{n, uses, d}], spells:[{n, mode:'day'|'charges'|'atwill', uses, cost, cl}], charges}
const WEAPON_SPECIALS = {
  'flaming':{x:'+1d6 fire'}, 'frost':{x:'+1d6 cold'}, 'shock':{x:'+1d6 electricity'},
  'flaming burst':{x:'+1d6 fire', note:'+1d10 fire on a critical hit (×3: +2d10, ×4: +3d10)'},
  'icy burst':{x:'+1d6 cold', note:'+1d10 cold on a critical hit (×3: +2d10, ×4: +3d10)'},
  'shocking burst':{x:'+1d6 electricity', note:'+1d10 electricity on a critical hit (×3: +2d10, ×4: +3d10)'},
  'thundering':{note:'+1d8 sonic on a critical hit (×3: +2d8, ×4: +3d8)'},
  'holy':{note:'+2d6 vs evil creatures'}, 'unholy':{note:'+2d6 vs good creatures'}, 'axiomatic':{note:'+2d6 vs chaotic creatures'}, 'anarchic':{note:'+2d6 vs lawful creatures'},
  'bane':{note:'+2 enhancement and +2d6 damage vs the chosen creature type'}, 'keen':{keen:true}, 'merciful':{x:'+1d6 nonlethal', note:'All damage is nonlethal'},
  'vicious':{x:'+2d6', note:'Also deals 1d6 to you on each hit'}, 'speed':{note:'One extra attack at full BAB in a full attack'},
  'distance':{note:'Range increment doubled'}, 'returning':{note:'Returns to your hand after a thrown attack'}, 'seeking':{note:'Ignores miss chance from concealment'},
  'defending':{note:'Move some of the enhancement bonus to AC each round'}, 'ghost touch':{note:'Full damage to incorporeal creatures'},
  'disruption':{note:'Undead struck must make DC 14 Will save or be destroyed'}, 'wounding':{note:'Each hit deals 1 point of Con damage'},
  'vorpal':{note:'On a natural 20 confirmed critical, severs the head'}, 'brilliant energy':{note:'Ignores nonliving matter and armor/shield bonuses'},
};
const ARMOR_SPECIALS = {
  'shadow':[B('skill:Hide', 'competence', 5)], 'shadow, improved':[B('skill:Hide', 'competence', 10)], 'shadow, greater':[B('skill:Hide', 'competence', 15)],
  'silent moves':[B('skill:Move Silently', 'competence', 5)], 'silent moves, improved':[B('skill:Move Silently', 'competence', 10)], 'silent moves, greater':[B('skill:Move Silently', 'competence', 15)],
  'slick':[B('skill:Escape Artist', 'competence', 5)], 'slick, improved':[B('skill:Escape Artist', 'competence', 10)], 'slick, greater':[B('skill:Escape Artist', 'competence', 15)],
};
// SRD magic items that are also weapons (rods and staffs)
const MAGIC_WEAPONS = {
  'rod of withering': {base:'Mace, light', enh:1, nodmg:true, note:'Melee touch attack: 1d4 Str damage and 1d4 Con damage, no hit point damage'},
  'rod of alertness': {base:'Mace, light', enh:1},
  'rod of flailing': {base:'Flail, dire', enh:3, note:'Only after activating (changes from a rod into a dire flail)'},
  'rod of lordly might': {base:'Mace, light', enh:2, note:'Buttons change it to a +1 flaming longsword, +4 battleaxe or +3 shortspear/longspear'},
  'rod of python': {base:'Quarterstaff', enh:1},
  'rod of thunder and lightning': {base:'Mace, light', enh:2, note:'Thunder 1/day (+3, stun DC 16); Lightning 1/day (+2d6 electricity)'},
  'rod of viper': {base:'Mace, heavy', enh:2, note:'Poison on hit 1/day (Fort DC 14)'},
  'staff of power': {base:'Quarterstaff', enh:2, note:'Can spend a charge on a hit to deal double damage'},
};
function magicWeaponAttack(name, size){
  const m = MAGIC_WEAPONS[normKey(name)]; if (!m) return null; const w = IDX.weapons.get(m.base.toLowerCase()); if (!w) return null;
  const a = attackFromSRD(w); return Object.assign(a, {n:name, enh:m.enh, dmg: m.nodmg ? '' : a.dmg, note:[m.note, a.note].filter(Boolean).join(' · ')});
}
const specialName = n => String(n).replace(/^\((Weapon|Armor) ability\) /, '').replace(/_/g, '');
const SPECIAL_LIST = kind => SRD.magic.filter(m => m.cat === (kind === 'weapon' ? 'Weapon Special Ability' : 'Armor Special Ability')).map(m => specialName(m.n));

function libItemBonuses(L){
  const out = [...(L.bon || [])];
  if ((L.kind === 'armor' || L.kind === 'shield') && L.arm) for (const sp of L.arm.specials || []){ const b = ARMOR_SPECIALS[normKey(sp)]; if (b) out.push(...b); }
  return out;
}
function keenCrit(c){
  const m = String(c || '').match(/^(\d+)\s*[–-]\s*20(.*)$/); if (m){ const lo = parseInt(m[1]); return `${21 - 2 * (21 - lo)}–20${m[2]}`; }
  return '19–20/' + String(c || 'x2').replace(/^\/?/, '');
}
function weaponAttack(L, size){
  const w = L.wpn || {}; const specials = (w.specials || []).map(s => [s, WEAPON_SPECIALS[normKey(s)] || {}]);
  const xd = [w.xdmg, ...specials.map(([, d]) => d.x)].filter(Boolean).join(' ');
  const notes = [w.rng && w.rng !== '—' ? w.rng : '', w.ty, ...specials.map(([s, d]) => d.note ? `${s}: ${d.note}` : '')].filter(Boolean).join(' · ');
  let crit = w.crit || 'x2'; if (specials.some(([, d]) => d.keen)) crit = keenCrit(crit);
  return {n:L.n, lib:L.id, ab:w.ab || 'Str', enh:num(w.enh), misc: (w.mw && !num(w.enh)) ? 1 : 0, dmg: (size === 'Small' || size === 'Tiny' ? w.dS : w.dM) || w.dM || '1d6', xdmg: xd, crit, note: notes, two: !!w.two, nostr: !!w.nostr};
}
function armorSlot(L){ const a = L.arm || {}; return {n:L.n, lib:L.id, bonus:num(a.bonus), enh:num(a.enh), mdx: L.kind === 'armor' ? (a.mdx === '' || a.mdx == null ? '' : a.mdx) : undefined, acp: Math.min(0, num(a.acp) + (a.mw && num(a.acp) < 0 ? 1 : 0)), asf:num(a.asf)}; }

// keep characters' attacks and armor in step with an edited custom item
function syncLinked(L){
  for (const c of Object.values(APP.chars)){ let ch = false;
    c.attacks.forEach((a, i) => { if (a.lib === L.id && L.kind === 'weapon'){ const keep = {id:a.id, misc2:a.misc2}; c.attacks[i] = Object.assign({}, a, weaponAttack(L, derive(c).size), keep); ch = true; } });
    for (const slot of ['armor', 'shield']) if (c[slot].lib === L.id && (L.kind === slot)){ c[slot] = Object.assign({}, c[slot], armorSlot(L)); ch = true; }
    c.items.forEach(it => { if (it.lib === L.id && it.n !== L.n){ it.n = L.n; ch = true; } });
    if (ch) markDirty(c.id); }
}
// what happens when an item lands in a character's inventory
function onItemAdded(c, it){
  const L = it.lib ? libById(it.lib) : null; const msgs = [];
  if (L){ if (L.charges && it.charges == null) it.charges = num(L.charges);
    if (L.kind === 'weapon'){ it.loc = 'equipped'; if (!c.attacks.some(a => a.lib === L.id)){ c.attacks.push({id:uid('a'), ...weaponAttack(L, derive(c).size)}); msgs.push('added to your attacks'); } }
    else if (L.kind === 'armor' || L.kind === 'shield'){ if (!c[L.kind].n){ c[L.kind] = armorSlot(L); it.loc = 'equipped'; msgs.push(`now worn as your ${L.kind}`); } else msgs.push(`use “Wear” on the Items tab to swap it in`); }
    else if (libItemBonuses(L).length || (L.abil || []).length){ it.loc = 'equipped'; msgs.push('worn, so its bonuses and abilities apply'); }
    if ((L.spells || []).length) msgs.push('its spells are on the Spells tab');
  }
  if (msgs.length) toast(`<b>${esc(it.n)}</b>: ${msgs.join('; ')}.`);
}
function onItemRemoved(c, it){
  if (!it.lib) return; const before = c.attacks.length; c.attacks = c.attacks.filter(a => a.lib !== it.lib || c.items.some(x => x.lib === it.lib && x.id !== it.id));
  for (const slot of ['armor', 'shield']) if (c[slot].lib === it.lib && !c.items.some(x => x.lib === it.lib && x.id !== it.id)) c[slot] = {n:'', bonus:0, enh:0, mdx:'', acp:0, asf:0};
  if (c.attacks.length < before) toast(`Removed <b>${esc(it.n)}</b> from your attacks too.`);
}
// "Customize" an SRD item into an editable library copy
function customizeItem(c, it){
  const x = (it.t === 'weapon' && IDX.weapons.get(it.n.toLowerCase())) || (it.t === 'armor' && IDX.armor.get(it.n.toLowerCase())) || null;
  const ref = getRef(it.t === 'magic' ? 'magic' : 'item', it.n); const div = document.createElement('div'); div.innerHTML = ref ? ref.html.replace(/<dl[\s\S]*?<\/dl>/, '') : '';
  const L = {id:uid('L'), t:'item', n:it.n, d:div.textContent.trim().slice(0, 3000), w:num(it.w), cost:'', kind:'gear'};
  if (it.t === 'weapon' && x){ L.kind = 'weapon'; L.wpn = {base:x.n, dS:x.dS, dM:x.dM, crit:x.crit, rng:x.rng, ty:x.ty, ab:/Ranged/.test(x.sub) ? 'Dex' : 'Str', two:/Two-Handed/.test(x.sub), enh:0, mw:false, specials:[]}; L.cost = x.cost; }
  if (it.t === 'armor' && x){ L.kind = /shield|buckler/i.test(x.n) ? 'shield' : 'armor'; L.arm = {base:x.n, bonus:num(String(x.ac).replace('+', '')), mdx: x.mdx === '—' ? '' : num(String(x.mdx).replace('+', '')), acp:num(String(x.acp).replace('–', '-')), asf:num(String(x.asf).replace('%', '')), enh:0, mw:false, specials:[]}; L.cost = x.cost; }
  const mw = MAGIC_WEAPONS[normKey(it.n)]; const bw = mw && IDX.weapons.get(mw.base.toLowerCase());
  if (bw){ L.kind = 'weapon'; L.wpn = {base:bw.n, dS: mw.nodmg ? '' : bw.dS, dM: mw.nodmg ? '' : bw.dM, crit:bw.crit, rng:bw.rng, ty:bw.ty, ab:'Str', two:false, enh:mw.enh, mw:false, specials:[], xdmg:''}; }
  const bl = itemBonuses(it); if (bl.length) L.bon = clone(bl);
  APP.lib.entries.push(L); markLibDirty();
  it.lib = L.id; it.t = 'custom'; delete it.bon; markDirty();
  openItemEditor(L.id);
}

// ---------- the editor ----------
function openItemEditor(id, onDone){
  const isNew = !id; const E = id ? clone(libById(id)) : {id: uid('L'), t:'item', n:'', d:'', w:0, cost:'', kind:'gear'};
  E.wpn = Object.assign({base:'', dS:'1d4', dM:'1d6', crit:'x2', rng:'—', ty:'Slashing', ab:'Str', two:false, enh:0, mw:false, specials:[], xdmg:''}, E.wpn || {});
  E.arm = Object.assign({base:'', bonus:0, mdx:'', acp:0, asf:0, enh:0, mw:false, specials:[]}, E.arm || {});
  E.bon = E.bon || []; E.abil = E.abil || []; E.spells = E.spells || [];
  const bg = openModal(`<div class="modal" role="dialog" aria-label="Custom item"><div class="mh"><h3>${isNew ? 'New custom item' : 'Edit custom item'}</h3><button class="btn ghost" data-close>Close</button></div>
    <div class="mform ie" id="ie-body"></div>
    <div class="mfoot"><div class="confirm" id="ie-delwrap">${isNew ? '' : '<button class="btn ghost" id="ie-del">Delete</button>'}</div><div class="row"><button class="btn" data-close>Cancel</button><button class="btn pri" id="ie-save">Save item</button></div></div></div>`);
  $$('[data-close]', bg).forEach(x => x.addEventListener('click', closeModal));
  const body = $('#ie-body', bg);
  const weapons = SRD.weapons.filter(w => w.dM !== '—'), armors = SRD.armor.filter(a => !/spikes|gauntlet/i.test(a.n));
  const opt = (v, l, sel) => `<option value="${esc(v)}" ${String(v) === String(sel) ? 'selected' : ''}>${esc(l)}</option>`;
  const enhOpts = sel => [0, 1, 2, 3, 4, 5].map(n => opt(n, n ? `+${n}` : 'None', sel)).join('');
  const inp = (path, val, extra = '') => `<input type="text" data-e="${path}" value="${esc(val ?? '')}" ${extra}>`;
  const numI = (path, val, extra = '') => `<input type="number" data-e="${path}" data-num="1" value="${esc(val ?? '')}" ${extra}>`;
  const chk = (path, val, label) => `<label class="mini"><input type="checkbox" data-e="${path}" ${val ? 'checked' : ''}> ${label}</label>`;
  const specChips = kind => { const arr = kind === 'weapon' ? E.wpn.specials : E.arm.specials;
    return `<div class="bchips">${arr.map((s, i) => `<span class="bchip" style="background:var(--accent-soft);color:var(--accent)">${refA('magic', `(${kind === 'weapon' ? 'Weapon' : 'Armor'} ability) ${s}`, s)} <button class="btn ghost sm" data-delspec="${kind}:${i}" aria-label="Remove ${esc(s)}" style="padding:0 2px">✕</button></span>`).join('') || '<span class="hint">None</span>'}</div>
      <div class="row" style="margin-top:6px"><select id="ie-addspec-${kind}" style="width:auto;max-width:100%"><option value="">Add a special ability…</option>${SPECIAL_LIST(kind).map(s => opt(s, s, '')).join('')}</select></div>`; };
  function draw(){
    const k = E.kind;
    body.innerHTML = `
      <div class="fields">${F('Name', inp('n', E.n, 'placeholder="e.g. Flametongue, Gran\'s Lucky Cloak"'), 'wide')}
        ${F('Kind', `<select data-e="kind" data-redraw="1">${[['gear', 'Wondrous item / gear'], ['weapon', 'Weapon'], ['armor', 'Armor'], ['shield', 'Shield']].map(([v, l]) => opt(v, l, k)).join('')}</select>`)}
        ${F('Weight (lb.)', numI('w', E.w, 'step="0.25" min="0"'))}${F('Cost / value', inp('cost', E.cost, 'placeholder="e.g. 8,315 gp"'))}</div>
      ${k === 'weapon' ? `<section class="ie-sec"><div class="splv">Weapon</div><div class="pb grid" style="gap:10px">
        <div class="fields">${F('Based on', `<select id="ie-wbase"><option value="">Choose a weapon to copy its stats…</option>${weapons.map(w => opt(w.n, w.n, E.wpn.base)).join('')}</select>`, 'wide')}
          ${F('Enhancement', `<select data-e="wpn.enh" data-num="1">${enhOpts(E.wpn.enh)}</select>`)}${F('Attack uses', `<select data-e="wpn.ab">${opt('Str', 'Str (melee/thrown)', E.wpn.ab)}${opt('Dex', 'Dex (ranged)', E.wpn.ab)}</select>`)}</div>
        <div class="fields">${F('Damage (Small)', inp('wpn.dS', E.wpn.dS))}${F('Damage (Medium)', inp('wpn.dM', E.wpn.dM))}${F('Critical', inp('wpn.crit', E.wpn.crit))}${F('Range', inp('wpn.rng', E.wpn.rng))}${F('Damage type', inp('wpn.ty', E.wpn.ty))}${F('Extra damage', inp('wpn.xdmg', E.wpn.xdmg, 'placeholder="e.g. +1d4 acid"'))}</div>
        <div class="row">${chk('wpn.mw', E.wpn.mw, 'Masterwork (+1 attack when not magic)')}${chk('wpn.two', E.wpn.two, 'Two-handed (1½ Str to damage)')}${chk('wpn.nostr', E.wpn.nostr, 'No Str to damage (bows, crossbows)')}</div>
        <div><div class="cap">Special abilities</div>${specChips('weapon')}<p class="hint" style="margin:4px 0 0">Flaming, frost and shock add their dice to damage; keen widens the threat range; the rest are noted on the attack.</p></div></div></section>` : ''}
      ${k === 'armor' || k === 'shield' ? `<section class="ie-sec"><div class="splv">${k === 'armor' ? 'Armor' : 'Shield'}</div><div class="pb grid" style="gap:10px">
        <div class="fields">${F('Based on', `<select id="ie-abase"><option value="">Choose ${k === 'armor' ? 'armor' : 'a shield'} to copy its stats…</option>${armors.filter(a => (k === 'shield') === /shield|buckler/i.test(a.n)).map(a => opt(a.n, a.n, E.arm.base)).join('')}</select>`, 'wide')}
          ${F('Enhancement', `<select data-e="arm.enh" data-num="1">${enhOpts(E.arm.enh)}</select>`)}</div>
        <div class="fields">${F(k === 'armor' ? 'Armor bonus' : 'Shield bonus', numI('arm.bonus', E.arm.bonus))}${k === 'armor' ? F('Max Dex', inp('arm.mdx', E.arm.mdx, 'placeholder="none"')) : ''}${F('Check penalty', numI('arm.acp', E.arm.acp))}${F('Spell failure %', numI('arm.asf', E.arm.asf))}</div>
        <div class="row">${chk('arm.mw', E.arm.mw, 'Masterwork (check penalty 1 lower)')}</div>
        <div><div class="cap">Special abilities</div>${specChips(k)}<p class="hint" style="margin:4px 0 0">Shadow, silent moves and slick add their skill bonuses automatically.</p></div></div></section>` : ''}
      <section class="ie-sec"><div class="splv">Stat bonuses</div><div class="pb grid" style="gap:6px">
        ${E.bon.map((b, i) => bonusRowHtml(b, i)).join('') || '<p class="hint" style="margin:0">No stat bonuses. Add one for things like +2 enhancement to Strength or +1 deflection to AC.</p>'}
        <div><button class="btn sm" data-add="bon">Add a stat bonus</button></div></div></section>
      <section class="ie-sec"><div class="splv">Special abilities & uses</div><div class="pb grid" style="gap:6px">
        ${E.abil.length ? '<div class="ie-row ie-head" style="grid-template-columns:minmax(0,1.2fr) 120px minmax(0,2fr) 30px"><span>Ability</span><span>Uses</span><span>Description</span><span></span></div>' : ''}
        ${E.abil.map((a, i) => `<div class="ie-row" style="grid-template-columns:minmax(0,1.2fr) 120px minmax(0,2fr) 30px">${inp(`abil.${i}.n`, a.n, 'placeholder="Ability name (e.g. Fire breath)"')}${inp(`abil.${i}.uses`, a.uses, 'placeholder="e.g. 3/day"')}${inp(`abil.${i}.d`, a.d, 'placeholder="What it does"')}<button class="btn ghost sm" data-delrow="abil:${i}" aria-label="Remove">✕</button></div>`).join('') || '<p class="hint" style="margin:0">Abilities appear under Special abilities on the Character tab while the item is worn, with a use tracker for “N/day”.</p>'}
        <div><button class="btn sm" data-add="abil">Add an ability</button></div></div></section>
      <section class="ie-sec"><div class="splv">Spells</div><div class="pb grid" style="gap:6px">
        <div class="row">${F('Max charges (wands, staffs)', numI('charges', E.charges, 'min="0" style="width:110px" placeholder="none"'))}</div>
        ${E.spells.length ? '<div class="ie-row ie-head" style="grid-template-columns:minmax(0,1.4fr) 130px 70px 70px 70px 30px"><span>Spell</span><span>How it works</span><span>Uses / cost</span><span>Caster lvl</span><span>Save DC</span><span></span></div>' : ''}
        ${E.spells.map((sp, i) => `<div class="ie-row" style="grid-template-columns:minmax(0,1.4fr) 130px 70px 70px 70px 30px">
          <div class="row" style="flex-wrap:nowrap;gap:4px">${inp(`spells.${i}.n`, sp.n, 'placeholder="Spell"')}<button class="btn sm" data-pickspell="${i}">Pick</button></div>
          <select data-e="spells.${i}.mode" data-redraw="1">${opt('day', 'Uses per day', sp.mode)}${opt('charges', 'Uses charges', sp.mode)}${opt('atwill', 'At will', sp.mode)}${opt('once', 'Single use', sp.mode)}</select>
          ${sp.mode === 'day' ? numI(`spells.${i}.uses`, sp.uses, 'min="1" title="Uses per day" aria-label="Uses per day"') : sp.mode === 'charges' ? numI(`spells.${i}.cost`, sp.cost ?? 1, 'min="1" title="Charges per use" aria-label="Charges per use"') : '<span></span>'}
          ${numI(`spells.${i}.cl`, sp.cl, 'min="1" title="Caster level" placeholder="CL" aria-label="Caster level"')}
          ${numI(`spells.${i}.dc`, sp.dc, 'min="0" title="Save DC" placeholder="DC" aria-label="Save DC"')}
          <button class="btn ghost sm" data-delrow="spells:${i}" aria-label="Remove">✕</button></div>`).join('') || '<p class="hint" style="margin:0">Spells show up on the Spells tab with a Cast button, uses or charges, and duration tracking. Any character can use them.</p>'}
        <div><button class="btn sm" data-add="spells">Add a spell</button></div></div></section>
      ${F('Description (shown on hover)', `<textarea data-e="d" rows="5">${esc(E.d || '')}</textarea>`)}`;
  }
  function bonusRowHtml(b, i){
    const targets = [...TARGET_LABELS(), ['atkw', 'Attacks with a weapon…'], ['dmgw', 'Damage with a weapon…']];
    return `<div class="bonus-row"><select data-e="bon.${i}.t" data-redraw="1">${targets.map(([v, l]) => opt(v, l, b.t)).join('')}</select>
      <select data-e="bon.${i}.ty">${BONUS_TYPES.map(t => opt(t, t, b.ty)).join('')}</select>${numI(`bon.${i}.v`, b.v)}
      ${inp(`bon.${i}.w`, b.w, `class="wcol" placeholder="${b.t === 'atkw' || b.t === 'dmgw' ? 'weapon name' : '—'}" ${b.t === 'atkw' || b.t === 'dmgw' ? '' : 'disabled'}`)}
      <button class="btn ghost sm" data-delrow="bon:${i}" aria-label="Remove">✕</button></div>`;
  }
  const readE = el => el.type === 'checkbox' ? el.checked : el.dataset.num ? (el.value === '' ? '' : num(el.value)) : el.value;
  body.addEventListener('input', e => { const el = e.target; if (el.dataset.e && el.tagName !== 'SELECT') setPath(E, el.dataset.e, readE(el)); });
  body.addEventListener('change', e => { const el = e.target;
    if (el.dataset.e){ setPath(E, el.dataset.e, readE(el)); if (el.dataset.redraw) draw(); return; }
    if (el.id === 'ie-wbase'){ const w = IDX.weapons.get(el.value.toLowerCase()); if (w){ Object.assign(E.wpn, {base:w.n, dS:w.dS, dM:w.dM, crit:w.crit, rng:w.rng, ty:w.ty, ab:/Ranged/.test(w.sub) ? 'Dex' : 'Str', two:/Two-Handed/.test(w.sub), nostr:/Ranged/.test(w.sub) && /bow|crossbow|net/i.test(w.n) && !/sling/i.test(w.n)}); if (!E.w) E.w = w.w; } draw(); }
    if (el.id === 'ie-abase'){ const a = IDX.armor.get(el.value.toLowerCase()); if (a){ Object.assign(E.arm, {base:a.n, bonus:num(String(a.ac).replace('+', '')), mdx: a.mdx === '—' ? '' : num(String(a.mdx).replace('+', '')), acp:num(String(a.acp).replace('–', '-')), asf:num(String(a.asf).replace('%', ''))}); if (!E.w) E.w = a.w; } draw(); }
    if (el.id === 'ie-addspec-weapon' && el.value){ E.wpn.specials.push(el.value); draw(); }
    if (el.id && el.id.startsWith('ie-addspec-') && el.id !== 'ie-addspec-weapon' && el.value){ E.arm.specials.push(el.value); draw(); }
  });
  body.addEventListener('click', e => {
    const a = e.target.closest('[data-add]'); if (a){ const k = a.dataset.add;
      if (k === 'bon') E.bon.push({t:'ac', ty:'enhancement', v:1}); if (k === 'abil') E.abil.push({n:'', uses:'', d:''}); if (k === 'spells') E.spells.push({n:'', mode:'day', uses:1, cl:''}); draw(); return; }
    const d = e.target.closest('[data-delrow]'); if (d){ const [k, i] = d.dataset.delrow.split(':'); E[k].splice(+i, 1); draw(); return; }
    const s = e.target.closest('[data-delspec]'); if (s){ const [k, i] = s.dataset.delspec.split(':'); (k === 'weapon' ? E.wpn.specials : E.arm.specials).splice(+i, 1); draw(); return; }
    const p = e.target.closest('[data-pickspell]'); if (p){ const i = +p.dataset.pickspell; pickSpellInline(sp => { E.spells[i].n = sp.n; if (!E.spells[i].cl) E.spells[i].cl = Math.max(1, ...Object.values(sp.c).map(l => l * 2 - 1)); draw(); }); }
  });
  draw(); setTimeout(() => { const n = $('[data-e="n"]', body); if (n) n.focus(); }, 30);
  $('#ie-save', bg).addEventListener('click', () => {
    E.n = String(E.n || '').trim(); if (!E.n){ $('[data-e="n"]', body).focus(); toast('Give the item a name first.', 'warn'); return; }
    E.bon = E.bon.filter(b => b.t && num(b.v)).map(b => { const o = {t:b.t, ty:b.ty || 'untyped', v:num(b.v)}; if (b.w) o.w = b.w; return o; });
    E.abil = E.abil.filter(a => String(a.n || '').trim()); E.spells = E.spells.filter(s => String(s.n || '').trim());
    if (E.kind !== 'weapon') delete E.wpn; if (E.kind !== 'armor' && E.kind !== 'shield') delete E.arm;
    const arr = APP.lib.entries; const ix = arr.findIndex(x => x.id === E.id); if (ix >= 0) arr[ix] = E; else arr.push(E);
    markLibDirty(); syncLinked(E); closeModal(); toast(`Saved <b>${esc(E.n)}</b>.`);
    if (onDone) onDone({name:E.n, type:'custom', key:E.id, lib:E}); renderAll();
  });
  const del = $('#ie-del', bg); if (del) del.addEventListener('click', () => {
    $('#ie-delwrap', bg).innerHTML = `<span class="hint">Delete from the library? Characters keep their copy.</span><button class="btn" id="ie-del2" style="color:var(--bad)">Delete</button>`;
    $('#ie-del2', bg).addEventListener('click', () => { APP.lib.entries = APP.lib.entries.filter(x => x.id !== E.id); markLibDirty(); closeModal(); renderAll(); });
  });
}
// small spell chooser layered over the item editor
function pickSpellInline(cb){
  const host = document.createElement('div'); host.className = 'modal-bg'; host.style.zIndex = 70;
  host.innerHTML = `<div class="modal narrow"><div class="mh"><h3>Choose a spell</h3><button class="btn ghost" data-x>Close</button></div><div class="mfilters"><input type="search" id="ps-q" placeholder="Search spells…"></div><div class="mlist" id="ps-list" style="max-height:50vh"></div></div>`;
  document.body.appendChild(host); const q = $('#ps-q', host), list = $('#ps-list', host); let shown = [];
  const draw = () => { const t = q.value.trim().toLowerCase(); shown = SRD.spells.filter(s => !t || s.n.toLowerCase().includes(t)).slice(0, 200);
    list.innerHTML = shown.map((s, i) => `<div class="opt" data-i="${i}"><span data-ref="spell" data-name="${esc(s.n)}">${esc(s.n)}</span><span class="s">${esc(s.lvl)}</span></div>`).join(''); };
  q.addEventListener('input', draw); draw(); setTimeout(() => q.focus(), 20);
  const close = () => host.remove();
  host.addEventListener('click', e => { if (e.target === host || e.target.closest('[data-x]')) return close(); const o = e.target.closest('.opt'); if (o && !e.target.closest('.ref')){ cb(shown[o.dataset.i]); close(); } });
}

// ---------- spells and abilities granted by items ----------
function itemSpellSources(c){ return c.items.filter(it => it.loc !== 'stored').map(it => ({it, L: it.lib ? libById(it.lib) : null})).filter(x => x.L && (x.L.spells || []).length); }
function itemAbilitySources(c){ return c.items.filter(it => it.loc === 'equipped').map(it => ({it, L: it.lib ? libById(it.lib) : null})).filter(x => x.L && (x.L.abil || []).length); }
const usesPerDay = u => { const m = String(u || '').match(/(\d+)\s*\/\s*day/i); return m ? parseInt(m[1]) : 0; };
function renderItemSpells(c){
  const src = itemSpellSources(c); if (!src.length) return '';
  const rows = src.map(({it, L}) => {
    const charges = L.charges ? `<span class="row" style="gap:4px"><span class="cap">Charges</span><input type="number" min="0" style="width:70px" data-k="items.${c.items.indexOf(it)}.charges" data-num="1" id="k-ch-${it.id}" value="${num(it.charges ?? L.charges)}"><span class="hint">/ ${num(L.charges)}</span></span>` : '';
    const sp = (L.spells || []).map((s, i) => { const sd = IDX.spells.get(s.n.toLowerCase()); const used = num((it.used || {})['s' + i]);
      let uses = ''; if (s.mode === 'day'){ const n = Math.max(1, num(s.uses)); uses = `<div class="pips" style="justify-content:flex-start">${Array.from({length:n}, (_, j) => `<button class="pip ${j < used ? 'used' : ''}" data-act="itemPip" data-id="${it.id}" data-k="s${i}" data-n="${j}" aria-label="Use ${j + 1}"></button>`).join('')}</div><span class="hint">${Math.max(0, n - used)}/${n} per day</span>`; }
      else if (s.mode === 'charges') uses = `<span class="hint">${num(s.cost || 1)} charge${num(s.cost || 1) === 1 ? '' : 's'} per use</span>`;
      else if (s.mode === 'once') uses = `<span class="hint">${used ? 'used up' : 'single use'}</span>`; else uses = '<span class="hint">at will</span>';
      return `<div class="sp"><div>${sd ? refA('spell', s.n) : `<b>${esc(s.n)}</b>`}<div class="meta">${esc([s.cl ? 'CL ' + s.cl : '', s.dc ? 'DC ' + s.dc : '', sd ? sd.dur : ''].filter(Boolean).join(' · '))}</div></div>
        <div class="row" style="justify-content:flex-end;gap:6px">${uses}<button class="btn sm pri" data-act="castItem" data-id="${it.id}" data-i="${i}">Use</button></div></div>`; }).join('');
    return `<div class="splv row" style="justify-content:space-between"><span>${refA('custom', L.id, it.n, 'custom')}${it.loc !== 'equipped' ? ' <span class="pill">carried</span>' : ''}</span>${charges}</div>${sp}`; }).join('');
  return panel('Spells from items', `<div class="list">${rows}</div>`, `<button class="btn sm" data-act="restItems" title="Restore per-day item uses">New day</button>`);
}
function renderItemAbilities(c){
  const src = itemAbilitySources(c); if (!src.length) return '';
  return `<div class="splv">From worn items</div>` + src.map(({it, L}) => (L.abil || []).map((a, i) => { const n = usesPerDay(a.uses); const used = num((it.used || {})['a' + i]);
    return `<div class="li" style="grid-template-columns:minmax(0,1fr) auto"><div><span class="ref custom" tabindex="0" data-ref="itemabil" data-name="${L.id}|${i}">${esc(a.n)}</span><div class="hint">${esc(it.n)}${a.uses ? ' · ' + esc(a.uses) : ''}</div></div>
      <div class="row" style="gap:6px">${n ? `<div class="pips">${Array.from({length:n}, (_, j) => `<button class="pip ${j < used ? 'used' : ''}" data-act="itemPip" data-id="${it.id}" data-k="a${i}" data-n="${j}" aria-label="Use ${j + 1}"></button>`).join('')}</div><span class="hint">${Math.max(0, n - used)} left</span>` : ''}</div></div>`; }).join('')).join('');
}
