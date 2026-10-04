// ===================== GEAR SLOTS (magic item body slots, SRD) =====================
const SLOTS = [
  ['head', 'Head', 'Helm, hat, crown, circlet, headband, phylactery', /\b(helm|helmet|hat|crown|circlet|headband|phylactery)\b/i],
  ['eyes', 'Eyes', 'Goggles, lenses', /\b(goggles|lens|lenses|eyes of)\b/i],
  ['neck', 'Neck', 'Amulet, necklace, periapt, scarab, brooch', /\b(amulet|necklace|periapt|scarab|brooch|medallion|pendant)\b/i],
  ['torso', 'Torso', 'Vest, shirt, vestment', /\b(vest|vestment|shirt)\b/i],
  ['body', 'Body', 'Robe or armor', /\b(robe)\b/i],
  ['waist', 'Waist', 'Belt, girdle', /\b(belt|girdle)\b/i],
  ['shoulders', 'Shoulders', 'Cloak, cape, mantle', /\b(cloak|cape|mantle)\b/i],
  ['arms', 'Arms / Wrists', 'Bracers, bracelets', /\b(bracers|bracelet|bracelets)\b/i],
  ['hands', 'Hands', 'Gloves, gauntlets', /\b(gloves|gauntlets)\b/i],
  ['ring1', 'Ring 1', 'Ring', /\bring\b/i], ['ring2', 'Ring 2', 'Ring', /\bring\b/i],
  ['feet', 'Feet', 'Boots, shoes, slippers', /\b(boots|shoes|slippers)\b/i],
  ['shield', 'Shield (held)', 'Shield or buckler', /\b(shield|buckler)\b/i],
];
const SLOT_LABEL = Object.fromEntries(SLOTS.map(s => [s[0], s[1]]));
// what slot an item goes in: 'body' / 'shield' for armor, otherwise by name (custom items can set it)
function itemSlotKind(it){
  const L = it.lib ? libById(it.lib) : null;
  if (L){ if (L.kind === 'armor') return 'body'; if (L.kind === 'shield') return 'shield'; if (L.slot) return L.slot === 'none' ? null : L.slot; }
  const nm = it.n || '';
  if (it.t === 'armor' || IDX.armor.get(nm.toLowerCase())){ const a = IDX.armor.get(nm.toLowerCase()); if (a && /shield|buckler/i.test(a.n)) return 'shield'; if (a && !/spikes|gauntlet, locked/i.test(a.n)) return 'body'; }
  const m = SRD.magic.find(x => x.n.toLowerCase() === nm.toLowerCase());
  if (m && m.cat === 'Ring') return 'ring'; if (m && m.cat === 'Specific Armor/Shield') return /shield/i.test(nm) ? 'shield' : 'body';
  if (/\bring of\b/i.test(nm)) return 'ring';
  if (/\b(armor|mail|plate|breastplate|chain shirt)\b/i.test(nm) && !/bracers of armor/i.test(nm)) return 'body';
  for (const [k, , , re] of SLOTS){ if (k === 'ring1' || k === 'ring2') continue; if (re.test(nm)) return k; }
  return null;
}
const slotMatches = (kind, slot) => kind === slot || (kind === 'ring' && (slot === 'ring1' || slot === 'ring2'));
function slotItem(c, slot){ return c.items.find(i => i.slot === slot); }
function armorStatsFor(it){
  const L = it.lib ? libById(it.lib) : null; if (L && (L.kind === 'armor' || L.kind === 'shield')) return armorSlot(L);
  const d = IDX.armor.get(String(it.n).toLowerCase());
  if (d) return {n:d.n, bonus:parseSigned(d.ac) || 0, enh:0, mdx: /shield|buckler/i.test(d.n) ? undefined : parseSigned(d.mdx), acp:parseSigned(d.acp) || 0, asf:parseSigned(d.asf) || 0};
  return {n:it.n, bonus:0, enh:0, mdx:'', acp:0, asf:0}; // named magic armor: stats typed by hand
}
function unequipSlot(c, slot, quiet){
  const it = slotItem(c, slot); if (!it) return;
  it.slot = null; it.loc = 'carried';
  if (slot === 'body' && c.armor.n === it.n) c.armor = {n:'', bonus:0, enh:0, mdx:'', acp:0, asf:0};
  if (slot === 'shield' && c.shield.n === it.n) c.shield = {n:'', bonus:0, enh:0, acp:0, asf:0};
  if (!quiet) toast(`Took off <b>${esc(it.n)}</b>.`);
}
function equipToSlot(c, it, slot){
  if (!slot){ const k = itemSlotKind(it); slot = k === 'ring' ? (slotItem(c, 'ring1') ? (slotItem(c, 'ring2') ? 'ring1' : 'ring2') : 'ring1') : k; }
  if (!slot){ it.loc = 'equipped'; return; }
  if (it.slot && it.slot !== slot) unequipSlot(c, it.slot, true);
  const old = slotItem(c, slot); if (old && old.id !== it.id){ unequipSlot(c, slot, true); toast(`Swapped <b>${esc(old.n)}</b> (now carried) for <b>${esc(it.n)}</b>.`); }
  it.slot = slot; it.loc = 'equipped';
  const isArmor = slot === 'body' && (IDX.armor.get(it.n.toLowerCase()) || (it.lib && (libById(it.lib) || {}).kind === 'armor') || /\b(armor|mail|plate|breastplate|chain shirt)\b/i.test(it.n));
  if (isArmor){ const s = armorStatsFor(it); c.armor = {n:it.n, bonus:s.bonus, enh:s.enh, mdx: s.mdx ?? '', acp:s.acp, asf:s.asf, lib:it.lib}; }
  else if (slot === 'body' && c.armor.n) c.armor = {n:'', bonus:0, enh:0, mdx:'', acp:0, asf:0};
  if (slot === 'shield'){ const s = armorStatsFor(it); c.shield = {n:it.n, bonus:s.bonus, enh:s.enh, acp:s.acp, asf:s.asf, lib:it.lib};
    const put = []; for (const a of [...c.attacks].reverse()){ if (handsUsed(c).used <= 2) break; if (a.eq && weaponInfo(a).hands > 0){ a.eq = ''; put.push(a.n); } }
    if (put.length){ relabelHands(c); toast(`Strapping on <b>${esc(it.n)}</b> takes a hand, so you put away ${put.map(esc).join(' and ')}.`, 'warn'); } }
}
// older saves: give worn items a slot when the slot is free
function assignSlots(c){
  for (const it of c.items){
    if (it.loc !== 'equipped' || it.slot) continue;
    const k = itemSlotKind(it); if (!k) continue;
    if (k === 'body' && c.armor.n && c.armor.n !== it.n) continue;
    if (k === 'shield' && c.shield.n && c.shield.n !== it.n) continue;
    const slot = k === 'ring' ? (!slotItem(c, 'ring1') ? 'ring1' : !slotItem(c, 'ring2') ? 'ring2' : null) : (!slotItem(c, k) ? k : null);
    if (slot) it.slot = slot;
  }
}

function renderGearPanel(c){
  const st = bonusStatus(D);
  const cards = SLOTS.map(([k, label, hint]) => {
    const it = slotItem(c, k); const L = it && it.lib ? libById(it.lib) : null;
    const name = it ? (L ? refA('custom', L.id, it.n, 'custom') : getRef('item', it.n) ? refA('item', it.n) : `<b>${esc(it.n)}</b>`) + (it.plus && !L ? ` <b>+${it.plus}</b>` : '') : `<span class="hint">${esc(hint)}</span>`;
    const live = it ? liveBonuses('item', it.id) : [];
    const extras = L ? [(L.abil || []).length ? `${L.abil.length} abilit${L.abil.length === 1 ? 'y' : 'ies'}` : '', (L.spells || []).length ? `${L.spells.length} spell${L.spells.length === 1 ? '' : 's'}` : ''].filter(Boolean).join(' · ') : '';
    const armorFields = it && k === 'body' && c.armor.n === it.n ? `<div class="fields slotstats">${F('AC', N('armor.bonus', c.armor.bonus))}${F('Enh', N('armor.enh', c.armor.enh))}${F('Max Dex', I('armor.mdx', c.armor.mdx, 'placeholder="none"'))}${F('Check', N('armor.acp', c.armor.acp))}${F('ASF %', N('armor.asf', c.armor.asf))}</div>`
      : it && k === 'shield' && c.shield.n === it.n ? `<div class="fields slotstats">${F('AC', N('shield.bonus', c.shield.bonus))}${F('Enh', N('shield.enh', c.shield.enh))}${F('Check', N('shield.acp', c.shield.acp))}${F('ASF %', N('shield.asf', c.shield.asf))}</div>` : '';
    return `<div class="slot-card ${it ? 'full' : ''}"><div class="slot-h"><span class="slot-l">${esc(label)}</span>
        <span class="row" style="gap:2px">${it ? `<button class="btn ghost sm" data-act="slotEdit" data-id="${it.id}" title="Bonuses / item">Edit</button><button class="btn ghost sm" data-act="unslot" data-slot="${k}" aria-label="Take off ${esc(it.n)}">✕</button>` : ''}<button class="btn sm" data-act="slotPick" data-slot="${k}">${it ? 'Change' : 'Equip'}</button></span></div>
      <div class="slot-n">${name}</div>
      ${live.length ? `<div class="bchips">${bonusChips(live, st)}</div>` : ''}${extras ? `<div class="hint">${esc(extras)}</div>` : ''}${armorFields}</div>`;
  }).join('');
  return panel('Gear', `<div class="slot-grid">${cards}</div>
    <div class="pb row hint" style="border-top:1px solid var(--rule-2)">Armor check penalty <b>${OT('acp')}</b> · arcane spell failure <b>${OT('asf')}</b>% · max Dex <b>${OT('mdx')}</b> · one item per slot (two rings). Items worn here apply their bonuses, abilities and spells; clashing bonuses pop up a warning.</div>`);
}
function openSlotPicker(c, slot){
  const fits = it => slotMatches(itemSlotKind(it), slot);
  const kindFor = n => itemSlotKind({n});
  const entries = [];
  c.items.filter(it => fits(it) && (!it.slot || it.slot === slot)).forEach(it => entries.push({name:it.n, sub: it.slot ? 'worn: ' + SLOT_LABEL[it.slot] : 'in your pack', cat:'Your items', type: it.lib ? 'custom' : 'item', key: it.lib || it.n, lib: it.lib ? libById(it.lib) : null, inv: it}));
  libEntries('item').filter(L => slotMatches(L.kind === 'armor' ? 'body' : L.kind === 'shield' ? 'shield' : L.slot || kindFor(L.n), slot) && !c.items.some(i => i.lib === L.id))
    .forEach(L => entries.push({name:L.n, sub:'custom', cat:'Custom library', type:'custom', key:L.id, lib:L}));
  if (slot === 'body') SRD.armor.filter(a => !/shield|buckler|spikes|gauntlet/i.test(a.n)).forEach(a => entries.push({name:a.n, sub:`${a.ac} AC · ${a.cost}`, cat:'Armor', type:'armor', key:a.n, data:a}));
  if (slot === 'shield') SRD.armor.filter(a => /shield|buckler/i.test(a.n) && !/spikes/i.test(a.n)).forEach(a => entries.push({name:a.n, sub:`${a.ac} AC · ${a.cost}`, cat:'Shields', type:'armor', key:a.n, data:a}));
  SRD.magic.filter(m => !/ability/.test(m.cat) && slotMatches(kindFor(m.n), slot)).forEach(m => entries.push({name:m.n, sub:m.price || '', cat:'Magic: ' + m.cat, type:'magic', key:m.n, data:m}));
  const label = SLOT_LABEL[slot];
  openPicker({title:`Equip: ${label}`, kind:'_slot', entries, onPick: e => {
    let it = e.inv;
    if (!it){ it = e.lib ? {id:uid('it'), n:e.name, t:'custom', lib:e.lib.id, qty:1, w:num(e.lib.w), loc:'carried', note:''}
      : {id:uid('it'), n:e.name, t:e.type, qty:1, w:num((e.data || {}).w), loc:'carried', note:''}; c.items.push(it); }
    const def = itemBonusDef(it.n); if (def && def.plus && !it.plus) it.plus = def.plus[0];
    equipToSlot(c, it, slot); if (it.lib) onItemAdded(c, it);
    markDirty(); renderAll();
    if (def && def.plus && def.plus.length > 1 && !e.inv){ closeModal(); editItemBonuses(c, it); toast(`Equipped <b>${esc(it.n)}</b>. Pick its bonus.`); return 'handled'; }
    toast(`Equipped <b>${esc(it.n)}</b> (${esc(label)}).`); return false; }});
}
