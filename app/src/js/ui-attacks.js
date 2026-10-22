// ===================== WIELDING (hands) & AMMUNITION =====================
// a.eq: 'main' | 'off' | 'both' | '' (stowed). Two hands; a non-buckler shield uses one.
function weaponBase(a){
  const L = a.lib ? libById(a.lib) : null; if (L && L.wpn && L.wpn.base) return IDX.weapons.get(L.wpn.base.toLowerCase());
  const mw = MAGIC_WEAPONS[normKey(a.n)]; if (mw) return IDX.weapons.get(mw.base.toLowerCase());
  return IDX.weapons.get(String(a.n || '').toLowerCase()) || null;
}
function weaponInfo(a){
  const w = weaponBase(a); const n = w ? w.n.toLowerCase() : '';
  if (a.hands != null && a.hands !== '') return {hands:num(a.hands), light:false, ranged:a.ab === 'Dex', base:w};
  if (!w) return {hands:1, light:false, ranged:a.ab === 'Dex', base:null, unknown:true};
  const sub = w.sub || '';
  if (/Unarmed/.test(sub) || /gauntlet|spiked armor/.test(n)) return {hands:0, light:true, ranged:false, base:w, natural:true};
  if (/Ranged/.test(sub)){
    if (/crossbow, hand|dart|javelin|shuriken|sling|bolas|net|axe, throwing|hammer, light/.test(n)) return {hands:1, light:true, ranged:true, base:w, thrown:!/crossbow|sling/.test(n)};
    return {hands:2, light:false, ranged:true, base:w}; // bows, light/heavy/repeating crossbows
  }
  if (/Two-Handed/.test(sub) || String(w.dM).includes('/')) return {hands:2, light:false, ranged:false, base:w};
  if (/Light/.test(sub)) return {hands:1, light:true, ranged:false, base:w};
  return {hands: a.two ? 2 : 1, light:false, ranged:false, base:w, versatile:true}; // one-handed
}
function shieldHand(c){ return c.shield.n && !/buckler/i.test(c.shield.n) ? 1 : 0; }
function handsUsed(c, exceptId){
  let used = shieldHand(c); const who = [];
  if (used) who.push(c.shield.n + ' (shield)');
  for (const a of c.attacks){ if (!a.eq || a.id === exceptId) continue; const h = weaponInfo(a).hands; if (h){ used += h; who.push(`${a.n} (${h === 2 ? 'both hands' : a.eq === 'off' ? 'off hand' : 'main hand'})`); } }
  return {used, who};
}
function relabelHands(c){
  const eq = c.attacks.filter(a => a.eq && weaponInfo(a).hands > 0);
  const one = eq.filter(a => weaponInfo(a).hands === 1); eq.filter(a => weaponInfo(a).hands === 2).forEach(a => a.eq = 'both');
  if (one.length){ const main = one.find(a => a.eq === 'main') || one[0]; one.forEach(a => a.eq = a === main ? 'main' : 'off'); }
  c.attacks.forEach(a => { if (a.eq && weaponInfo(a).hands === 0) a.eq = 'main'; a.off = a.eq === 'off'; });
  if (!c.attacks.some(a => a.eq === 'off')) c.twf = false;
}
// try to put a weapon in hand; returns true, or shows why it can't
function equipAttack(c, a, opts = {}){
  const info = weaponInfo(a); const {used, who} = handsUsed(c, a.id);
  if (info.hands === 0 || used + info.hands <= 2){ a.eq = info.hands === 2 ? 'both' : (c.attacks.some(x => x.eq === 'main' && x.id !== a.id && weaponInfo(x).hands === 1) ? 'off' : 'main'); relabelHands(c); return true; }
  if (opts.quiet) return false;
  const free = Math.max(0, 2 - used);
  const why = `<b>${esc(a.n)}</b> needs ${info.hands === 2 ? 'both hands' : 'one hand'}${info.ranged && info.hands === 2 ? ' (bows and most crossbows need two hands to fire)' : ''}, and you have ${free ? 'only one hand' : 'no hands'} free.`;
  const bg = openModal(`<div class="modal narrow" role="alertdialog" aria-label="Hands full"><div class="mh"><h3>Hands full</h3><button class="btn ghost" data-close>Close</button></div>
    <div class="mform"><p style="margin:0">${why}</p><p class="hint" style="margin:0">In your hands: ${who.map(esc).join(', ')}.</p>
    <p class="hint" style="margin:0">You have two hands. A shield (except a buckler) takes one; two-handed weapons, bows and light or heavy crossbows take both. Putting a weapon away is a move action; dropping one is free.</p></div>
    <div class="mfoot"><button class="btn" data-close>Cancel</button><button class="btn pri" id="swapIn">Put the others away and wield it</button></div></div>`);
  $('#swapIn', bg).addEventListener('click', () => {
    for (const x of c.attacks) if (x.eq && x.id !== a.id && weaponInfo(x).hands > 0){ x.eq = ''; if (handsUsed(c, a.id).used + info.hands <= 2) break; }
    if (handsUsed(c, a.id).used + info.hands > 2 && shieldHand(c)){ const it = slotItem(c, 'shield'); if (it) unequipSlot(c, 'shield', true); else c.shield = {n:'', bonus:0, enh:0, acp:0, asf:0}; toast('Shield put away (it no longer counts toward AC).', 'warn'); }
    a.eq = info.hands === 2 ? 'both' : 'main'; relabelHands(c); markDirty(); closeModal(); renderAll(); toast(`Now wielding <b>${esc(a.n)}</b>.`);
  });
  return false;
}
function autoEquipNew(c, a){ if (!equipAttack(c, a, {quiet:true})) toast(`<b>${esc(a.n)}</b> is ready but not in hand: your hands are full. Use its <b>Wield</b> button to swap.`, 'warn'); }
// older saves: wield what fits, in list order
function assignHands(c){ if (c.attacks.some(a => a.eq !== undefined)) return; c.attacks.forEach(a => { a.eq = ''; }); c.attacks.forEach(a => equipAttack(c, a, {quiet:true})); }

// Two-weapon fighting penalties (SRD Combat II, Table: Two-Weapon Fighting Penalties)
function twfPenalty(c, a){
  if (!c.twf || !(a.eq === 'main' || a.eq === 'off')) return 0;
  const off = c.attacks.find(x => x.eq === 'off'); if (!off) return 0;
  const light = weaponInfo(off).light; const feat = c.feats.some(f => normKey(f.n) === 'two-weapon fighting');
  let main = -6, offp = -10; if (light){ main += 2; offp += 2; } if (feat){ main += 2; offp += 6; }
  return a.eq === 'main' ? main : offp;
}
function offHandAttacks(c){ let n = 1; if (c.feats.some(f => normKey(f.n) === 'improved two-weapon fighting')) n++; if (c.feats.some(f => normKey(f.n) === 'greater two-weapon fighting')) n++; return n; }

// ---------- ammunition ----------
function ammoKind(a){ const w = weaponBase(a); const n = (w ? w.n : a.n || '').toLowerCase();
  if (/crossbow/.test(n)) return 'bolt'; if (/bow/.test(n)) return 'arrow'; if (/sling/.test(n)) return 'bullet'; return null; }
const AMMO_RE = {arrow:/\barrows?\b/i, bolt:/\bbolts?\b/i, bullet:/\bbullets?\b/i};
const AMMO_LABEL = {arrow:'arrows', bolt:'bolts', bullet:'sling bullets'};
const AMMO_SRD = {arrow:'Arrows (20)', bolt:'Bolts, crossbow (10)', bullet:'Bullets, sling (10)'};
function packSize(n){ const m = String(n).match(/\((\d+)\)/); return m ? parseInt(m[1]) : 1; }
function ammoCount(it){ return it.count != null ? num(it.count) : packSize(it.n) * num(it.qty || 1); }
function ammoItems(c, a){ const k = ammoKind(a); if (!k) return []; return c.items.filter(it => AMMO_RE[k].test(it.n) && !/^\s*(longbow|shortbow|crossbow|sling)\b/i.test(it.n)); }
function ammoFor(c, a){ const list = ammoItems(c, a); return list.find(it => it.id === a.ammo) || list[0] || null; }
// returns false when the shot can't be made
function fireAmmo(c, a){
  const k = ammoKind(a); if (!k) return true; const it = ammoFor(c, a);
  if (!it){ toast(`No ${AMMO_LABEL[k]} in your items for <b>${esc(a.n)}</b>.`, 'warn'); return false; }
  const n = ammoCount(it); if (n <= 0){ toast(`Out of ${esc(it.n.replace(/\s*\(\d+\)/, ''))}.`, 'warn'); return false; }
  it.count = n - 1; a.ammo = it.id; markDirty();
  setTimeout(() => { const el = $(`[data-ammocount="${a.id}"]`); if (el) el.value = it.count; }, 0);
  if (it.count <= 3) toast(`${it.count ? 'Only ' + it.count : 'No'} ${AMMO_LABEL[k]} left.`, 'warn');
  return true;
}
function ammoRow(c, a){
  const k = ammoKind(a); if (!k) return ''; const list = ammoItems(c, a); const cur = ammoFor(c, a);
  if (!list.length) return `<div class="ammo row"><span class="cap">Ammo</span><span class="hint">No ${AMMO_LABEL[k]} in your items.</span><button class="btn sm" data-act="addAmmo" data-id="${a.id}">Add ${esc(AMMO_SRD[k])}</button></div>`;
  return `<div class="ammo row"><span class="cap">Ammo</span>
    <select data-act-change="pickAmmo" data-id="${a.id}" style="width:auto;max-width:220px" aria-label="Ammunition">${list.map(it => `<option value="${it.id}" ${cur && it.id === cur.id ? 'selected' : ''}>${esc(it.n)}</option>`).join('')}</select>
    <input type="number" min="0" style="width:72px" data-ammocount="${a.id}" data-item="${cur.id}" value="${ammoCount(cur)}" aria-label="Ammunition left"><span class="hint">left · 1 used per attack roll</span>
    ${getRef('item', cur.n) ? refA('item', cur.n, 'ⓘ') : ''}</div>`;
}
function handsSummary(c){
  const chips = []; const shield = shieldHand(c) ? c.shield.n : '';
  const main = c.attacks.find(a => a.eq === 'main' && weaponInfo(a).hands === 1), both = c.attacks.find(a => a.eq === 'both'), off = c.attacks.find(a => a.eq === 'off');
  if (both) chips.push(`<span class="hand-chip"><b>Both hands</b> ${esc(both.n)}</span>`);
  else { chips.push(`<span class="hand-chip ${main ? '' : 'empty'}"><b>Main hand</b> ${main ? esc(main.n) : 'empty'}</span>`);
    chips.push(`<span class="hand-chip ${off || shield ? '' : 'empty'}"><b>Off hand</b> ${off ? esc(off.n) : shield ? esc(shield) + ' (shield)' : 'empty'}</span>`); }
  const twf = off && main ? `<label class="mini" title="Fighting with both weapons this round applies the two-weapon fighting penalties"><input type="checkbox" data-k="twf" data-rerender="1" ${c.twf ? 'checked' : ''}> Attacking with both (two-weapon fighting)</label>` : '';
  return `<div class="pb row hands-bar">${chips.join('')}${twf}</div>`;
}

function pushAttack(c, a){ c.attacks.push(a); a.eq = ''; autoEquipNew(c, a); return c.attacks.length; }
