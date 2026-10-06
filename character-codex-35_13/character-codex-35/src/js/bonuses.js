// ===================== TYPED BONUSES & STACKING (SRD "Combining Magical Effects") =====================
// A bonus: {t: target, ty: bonus type, v: value, src: label shown to the player, key: same-effect key, w?: weapon match}
// Targets: Str..Cha · ac · ac.armor · ac.shield · ac.natural · save.all · save.Fort/Ref/Will · atk · atk.melee · atk.ranged · atkw
//          dmg · dmgw · init · speed · hp · skill.all · skill:<Skill label> · skill.ab:<Ability>
const BONUS_TYPES = ['untyped','alchemical','armor','circumstance','competence','deflection','dodge','enhancement','inherent','insight','luck','morale','natural armor','profane','racial','resistance','sacred','shield','size','synergy'];
// Types that stack with themselves (SRD: dodge, most circumstance, racial; unnamed bonuses stack with anything)
const STACKING_TYPES = new Set(['untyped','dodge','circumstance','racial','synergy']);
const TARGET_LABELS = () => [
  ...ABIL.map(a => [a, ABIL_FULL[a]]), ['ac', 'Armor Class'], ['ac.armor', 'AC (armor)'], ['ac.shield', 'AC (shield)'], ['ac.natural', 'AC (natural armor)'],
  ['save.all', 'All saving throws'], ['save.Fort', 'Fortitude save'], ['save.Ref', 'Reflex save'], ['save.Will', 'Will save'],
  ['atk', 'All attack rolls'], ['atk.melee', 'Melee attacks'], ['atk.ranged', 'Ranged attacks'], ['dmg', 'Weapon damage'],
  ['init', 'Initiative'], ['speed', 'Speed (ft.)'], ['hp', 'Max hit points'], ['skill.all', 'All skill checks'],
  ...SRD.skills.filter(s => !SUBSKILLS[s.n]).map(s => ['skill:' + s.n, 'Skill: ' + s.n])];
function targetLabel(t){ const f = TARGET_LABELS().find(x => x[0] === t); return f ? f[1] : t.replace(/^skill:/, 'Skill: '); }

const B = (t, ty, v, extra = {}) => ({t, ty, v, ...extra});
const saves = (ty, v) => ['Fort', 'Ref', 'Will'].map(s => B('save.' + s, ty, v));
const skills = (names, ty, v) => names.map(n => B('skill:' + n, ty, v));
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

// ---- Magic items: name -> {plus: [allowed values], def, f(plus) -> bonuses}
const ITEM_BONUS = {
  'ring of protection': {plus:[1,2,3,4,5], f:p => [B('ac', 'deflection', p)]},
  'cloak of resistance': {plus:[1,2,3,4,5], f:p => saves('resistance', p)},
  'amulet of natural armor': {plus:[1,2,3,4,5], f:p => [B('ac.natural', 'enhancement', p)]},
  'bracers of armor': {plus:[1,2,3,4,5,6,7,8], f:p => [B('ac.armor', 'armor', p)]},
  'belt of giant strength': {plus:[4,6], f:p => [B('Str', 'enhancement', p)]},
  'gauntlets of ogre power': {plus:[2], f:() => [B('Str', 'enhancement', 2)]},
  'gloves of dexterity': {plus:[2,4,6], f:p => [B('Dex', 'enhancement', p)]},
  'amulet of health': {plus:[2,4,6], f:p => [B('Con', 'enhancement', p)]},
  'headband of intellect': {plus:[2,4,6], f:p => [B('Int', 'enhancement', p)]},
  'periapt of wisdom': {plus:[2,4,6], f:p => [B('Wis', 'enhancement', p)]},
  'cloak of charisma': {plus:[2,4,6], f:p => [B('Cha', 'enhancement', p)]},
  'cloak of elvenkind': {f:() => [B('skill:Hide', 'competence', 5)]},
  'boots of elvenkind': {f:() => [B('skill:Move Silently', 'competence', 5)]},
  'eyes of the eagle': {f:() => [B('skill:Spot', 'competence', 5)]},
  'goggles of minute seeing': {f:() => [B('skill:Search', 'competence', 5)], note:'Search: only when examining within 1 foot'},
  'lens of detection': {f:() => [B('skill:Search', 'competence', 5)]},
  'circlet of persuasion': {f:() => [B('skill.ab:Cha', 'competence', 3)]},
  'vest of escape': {f:() => [B('skill:Open Lock', 'competence', 4), B('skill:Escape Artist', 'competence', 6)]},
  'gloves of swimming and climbing': {f:() => skills(['Swim', 'Climb'], 'competence', 5)},
  'ring of climbing': {f:() => [B('skill:Climb', 'competence', 5)]}, 'ring of climbing, improved': {f:() => [B('skill:Climb', 'competence', 10)]},
  'ring of jumping': {f:() => [B('skill:Jump', 'competence', 5)]}, 'ring of jumping, improved': {f:() => [B('skill:Jump', 'competence', 10)]},
  'ring of swimming': {f:() => [B('skill:Swim', 'competence', 5)]}, 'ring of swimming, improved': {f:() => [B('skill:Swim', 'competence', 10)]},
  'boots of striding and springing': {f:() => [B('speed', 'enhancement', 10), B('skill:Jump', 'competence', 5)]},
  'stone of good luck (luckstone)': {f:() => [...saves('luck', 1), B('skill.all', 'luck', 1)], note:'Also +1 luck on ability checks'},
  'ring of force shield': {f:() => [B('ac.shield', 'shield', 2)]},
  'bracers of archery, lesser': {f:() => [B('atkw', 'competence', 1, {w:'bow'})], note:'Bows only (not crossbows); must be proficient'},
  'bracers of archery, greater': {f:() => [B('atkw', 'competence', 2, {w:'bow'}), B('dmgw', 'competence', 1, {w:'bow'})], note:'Bows only (not crossbows)'},
};
function itemBonusDef(name){ return ITEM_BONUS[normKey(name)]; }

// ---- Feats: name -> f(choice) ; choice is what the player typed in the feat's notes
const FEAT_BONUS = {
  'improved initiative': () => [B('init', 'untyped', 4)],
  'great fortitude': () => [B('save.Fort', 'untyped', 2)],
  'lightning reflexes': () => [B('save.Ref', 'untyped', 2)],
  'iron will': () => [B('save.Will', 'untyped', 2)],
  'toughness': () => [B('hp', 'untyped', 3)],
  'dodge': () => [B('ac', 'dodge', 1)],
  'weapon focus': ch => ch ? [B('atkw', 'untyped', 1, {w:ch})] : [],
  'greater weapon focus': ch => ch ? [B('atkw', 'untyped', 1, {w:ch})] : [],
  'weapon specialization': ch => ch ? [B('dmgw', 'untyped', 2, {w:ch})] : [],
  'greater weapon specialization': ch => ch ? [B('dmgw', 'untyped', 2, {w:ch})] : [],
  'skill focus': ch => ch ? [B('skill:' + canonSkill(ch), 'untyped', 3)] : [],
  'alertness': () => skills(['Listen', 'Spot'], 'untyped', 2), 'acrobatic': () => skills(['Jump', 'Tumble'], 'untyped', 2),
  'agile': () => skills(['Balance', 'Escape Artist'], 'untyped', 2), 'animal affinity': () => skills(['Handle Animal', 'Ride'], 'untyped', 2),
  'athletic': () => skills(['Climb', 'Swim'], 'untyped', 2), 'deceitful': () => skills(['Disguise', 'Forgery'], 'untyped', 2),
  'deft hands': () => skills(['Sleight of Hand', 'Use Rope'], 'untyped', 2), 'diligent': () => skills(['Appraise', 'Decipher Script'], 'untyped', 2),
  'investigator': () => skills(['Gather Information', 'Search'], 'untyped', 2), 'magical aptitude': () => skills(['Spellcraft', 'Use Magic Device'], 'untyped', 2),
  'negotiator': () => skills(['Diplomacy', 'Sense Motive'], 'untyped', 2), 'nimble fingers': () => skills(['Disable Device', 'Open Lock'], 'untyped', 2),
  'persuasive': () => skills(['Bluff', 'Intimidate'], 'untyped', 2), 'self-sufficient': () => skills(['Heal', 'Survival'], 'untyped', 2),
  'stealthy': () => skills(['Hide', 'Move Silently'], 'untyped', 2),
};
const FEAT_CHOICE = {'weapon focus':'weapon', 'greater weapon focus':'weapon', 'weapon specialization':'weapon', 'greater weapon specialization':'weapon', 'skill focus':'skill'};
const FEAT_NOTES = {'combat casting':'+4 on Concentration checks to cast defensively or while grappling (situational, not added)', 'point blank shot':'+1 attack and damage with ranged weapons within 30 ft. (situational, not added)', 'endurance':'+4 on checks and saves listed in the feat (situational, not added)'};

// ---- Spell effects on you: name -> f(casterLevel) -> {b: bonuses, note}
const SPELL_BONUS = {
  'bless': () => ({b:[B('atk', 'morale', 1)], note:'+1 morale on saves vs fear (situational)'}),
  'bane': () => ({b:[B('atk', 'untyped', -1)], note:'–1 on saves vs fear (situational)'}),
  'aid': () => ({b:[B('atk', 'morale', 1)], note:'+1 morale on saves vs fear; temporary hp 1d8 + CL (max +10)'}),
  'prayer': () => ({b:[B('atk', 'luck', 1), B('dmg', 'luck', 1), ...saves('luck', 1), B('skill.all', 'luck', 1)]}),
  'heroism': () => ({b:[B('atk', 'morale', 2), ...saves('morale', 2), B('skill.all', 'morale', 2)]}),
  'heroism, greater': () => ({b:[B('atk', 'morale', 4), ...saves('morale', 4), B('skill.all', 'morale', 4)], note:'Immune to fear; temporary hp = CL (max 20)'}),
  'good hope': () => ({b:[B('atk', 'morale', 2), B('dmg', 'morale', 2), ...saves('morale', 2), B('skill.all', 'morale', 2)], note:'Also +2 morale on ability checks'}),
  'crushing despair': () => ({b:[B('atk', 'untyped', -2), B('dmg', 'untyped', -2), ...saves('untyped', -2), B('skill.all', 'untyped', -2)], note:'Also –2 on ability checks'}),
  'divine favor': cl => { const v = clamp(Math.floor(cl / 3), 1, 6); return {b:[B('atk', 'luck', v), B('dmg', 'luck', v)]}; },
  'shield of faith': cl => ({b:[B('ac', 'deflection', clamp(2 + Math.floor(cl / 6), 2, 5))]}),
  'barkskin': cl => ({b:[B('ac.natural', 'enhancement', clamp(2 + Math.max(0, Math.floor((cl - 3) / 3)), 2, 5))]}),
  'mage armor': () => ({b:[B('ac.armor', 'armor', 4)]}),
  'shield': () => ({b:[B('ac.shield', 'shield', 4)]}),
  'magic vestment': cl => ({b:[B('ac.armor', 'enhancement', clamp(Math.floor(cl / 4), 1, 5))], note:'Assumes it was cast on your armor; if cast on your shield, edit the effect bonus'}),
  'resistance': () => ({b:saves('resistance', 1)}),
  'haste': () => ({b:[B('atk', 'untyped', 1), B('ac', 'dodge', 1), B('save.Ref', 'dodge', 1), B('speed', 'enhancement', 30)], note:'One extra attack at full BAB in a full attack'}),
  'slow': () => ({b:[B('atk', 'untyped', -1), B('ac', 'untyped', -1), B('save.Ref', 'untyped', -1)], note:'Only a single move or standard action each turn; speed halved'}),
  'rage': () => ({b:[B('Str', 'morale', 2), B('Con', 'morale', 2), B('save.Will', 'morale', 1), B('ac', 'untyped', -2)]}),
  'enlarge person': () => ({b:[B('Str', 'size', 2), B('Dex', 'size', -2), B('atk', 'size', -1), B('ac', 'size', -1)], note:'Size becomes Large: 10 ft. reach; weapons deal Large damage'}),
  'reduce person': () => ({b:[B('Str', 'size', -2), B('Dex', 'size', 2), B('atk', 'size', 1), B('ac', 'size', 1)], note:'Size becomes Small; weapons deal Small damage'}),
  'righteous might': () => ({b:[B('Str', 'size', 4), B('Con', 'size', 2), B('ac.natural', 'enhancement', 2), B('atk', 'size', -1), B('ac', 'size', -1)], note:'Size becomes Large; also gains damage reduction'}),
  'longstrider': () => ({b:[B('speed', 'enhancement', 10)]}),
  'expeditious retreat': () => ({b:[B('speed', 'enhancement', 30)]}),
  'divine power': () => ({b:[B('Str', 'enhancement', 6)], note:'Base attack bonus becomes equal to your character level; temporary hp = CL'}),
  'transformation': () => ({b:[B('Str', 'enhancement', 4), B('Dex', 'enhancement', 4), B('Con', 'enhancement', 4), B('ac.natural', 'natural armor', 4), B('save.Fort', 'competence', 5)], note:'Base attack bonus becomes equal to your character level; you can\'t cast spells'}),
  'heroes’ feast': () => ({b:[B('atk', 'morale', 1), B('save.Will', 'morale', 1)], note:'Immune to poison and fear; temporary hp 1d8 + ½ CL'}),
  'bull’s strength': () => ({b:[B('Str', 'enhancement', 4)]}), 'cat’s grace': () => ({b:[B('Dex', 'enhancement', 4)]}),
  'bear’s endurance': () => ({b:[B('Con', 'enhancement', 4)]}), 'fox’s cunning': () => ({b:[B('Int', 'enhancement', 4)]}),
  'owl’s wisdom': () => ({b:[B('Wis', 'enhancement', 4)]}), 'eagle’s splendor': () => ({b:[B('Cha', 'enhancement', 4)]}),
  'protection from evil': () => ({b:[], note:'+2 deflection to AC and +2 resistance on saves against evil creatures only (situational)'}),
  'protection from good': () => ({b:[], note:'+2 deflection to AC and +2 resistance on saves against good creatures only (situational)'}),
  'protection from chaos': () => ({b:[], note:'+2 deflection to AC and +2 resistance on saves against chaotic creatures only (situational)'}),
  'protection from law': () => ({b:[], note:'+2 deflection to AC and +2 resistance on saves against lawful creatures only (situational)'}),
  'guidance': () => ({b:[], note:'+1 competence on one attack, save or skill check of your choice (add it when you roll)'}),
  'barbarian rage': lvl => { const v = lvl >= 20 ? 8 : lvl >= 11 ? 6 : 4; return {b:[B('Str', 'morale', v), B('Con', 'morale', v), B('save.Will', 'morale', v / 2), B('ac', 'untyped', -2)], note:'Can\'t use Cha-, Dex- or Int-based skills (except Balance, Escape Artist, Intimidate, Ride), Concentration, or spells'}; },
};
['bull’s strength','cat’s grace','bear’s endurance','fox’s cunning','owl’s wisdom','eagle’s splendor'].forEach(n => SPELL_BONUS[n + ', mass'] = SPELL_BONUS[n]);

// ---- Conditions: name -> {b, noDex, note, key (fear/fatigue escalate instead of stacking)}
const fearPen = () => [B('atk', 'untyped', -2), ...saves('untyped', -2), B('skill.all', 'untyped', -2)];
const COND_BONUS = {
  'shaken': {b:fearPen(), key:'fear', note:'Also –2 on ability checks'},
  'frightened': {b:fearPen(), key:'fear', note:'Must flee; also –2 on ability checks'},
  'panicked': {b:fearPen(), key:'fear', note:'Drops held items and flees; –2 on ability checks'},
  'sickened': {b:[B('atk', 'untyped', -2), B('dmg', 'untyped', -2), ...saves('untyped', -2), B('skill.all', 'untyped', -2)], note:'Also –2 on ability checks'},
  'fatigued': {b:[B('Str', 'untyped', -2), B('Dex', 'untyped', -2)], key:'fatigue', note:'Can\'t run or charge'},
  'exhausted': {b:[B('Str', 'untyped', -6), B('Dex', 'untyped', -6)], key:'fatigue', note:'Half speed'},
  'entangled': {b:[B('atk', 'untyped', -2), B('Dex', 'untyped', -4)], note:'Half speed, can\'t run or charge; Concentration to cast'},
  'dazzled': {b:[B('atk', 'untyped', -1), B('skill:Search', 'untyped', -1), B('skill:Spot', 'untyped', -1)]},
  'blinded': {b:[B('ac', 'untyped', -2), B('skill:Search', 'untyped', -4), B('skill.ab:Str', 'untyped', -4), B('skill.ab:Dex', 'untyped', -4)], noDex:true, note:'Half speed; opponents have total concealment (50% miss)'},
  'deafened': {b:[B('init', 'untyped', -4)], note:'20% spell failure with verbal components; auto-fail Listen'},
  'cowering': {b:[B('ac', 'untyped', -2)], noDex:true}, 'stunned': {b:[B('ac', 'untyped', -2)], noDex:true, note:'Drops held items; no actions'},
  'flat-footed': {b:[], noDex:true}, 'helpless': {b:[], noDex:true, note:'Treated as Dex 0 (–5 AC); melee attackers get +4'},
  'paralyzed': {b:[], noDex:true, note:'Effective Str and Dex 0; helpless'},
  'prone': {b:[B('atk.melee', 'untyped', -4)], note:'+4 AC vs ranged attacks, –4 AC vs melee attacks (situational)'},
  'pinned': {b:[], noDex:true, note:'Held immobile in a grapple'},
  'grappling': {b:[], note:'No threatened area; lose Dex to AC against opponents you aren\'t grappling'},
  'energy drained': {b:[], note:'–1 per negative level on attacks, saves, skills and checks: add a custom effect with the right number'},
  'nauseated': {b:[], note:'Only a single move action each turn'},
};

// ---- Races (unconditional racial bonuses only)
const RACE_BONUS = {
  'Elf': () => skills(['Listen', 'Search', 'Spot'], 'racial', 2),
  'Gnome': () => [B('skill:Listen', 'racial', 2), B('skill:Craft (alchemy)', 'racial', 2)],
  'Half-Elf': () => [...skills(['Listen', 'Search', 'Spot'], 'racial', 1), ...skills(['Diplomacy', 'Gather Information'], 'racial', 2)],
  'Halfling': () => [...skills(['Climb', 'Jump', 'Move Silently', 'Listen'], 'racial', 2), ...saves('racial', 1)],
};
// ---- Skill synergies (unconditional ones from the SRD skill descriptions): 5 ranks in A give +2 to B
const SYNERGY = [['Bluff', 'Diplomacy'], ['Bluff', 'Intimidate'], ['Bluff', 'Sleight of Hand'], ['Handle Animal', 'Ride'], ['Jump', 'Tumble'],
  ['Tumble', 'Balance'], ['Tumble', 'Jump'], ['Knowledge (arcana)', 'Spellcraft'], ['Knowledge (local)', 'Gather Information'],
  ['Knowledge (nobility and royalty)', 'Diplomacy'], ['Sense Motive', 'Diplomacy'], ['Survival', 'Knowledge (nature)']];

function canonSkill(ch){ const k = String(ch).trim().toLowerCase(); const s = SRD.skills.find(x => x.n.toLowerCase() === k); if (s) return s.n;
  const m = k.match(/^(\w+)\s*\((.+)\)$/); if (m){ const b = SRD.skills.find(x => x.n.toLowerCase() === m[1]); if (b) return `${b.n} (${m[2]})`; } return String(ch).trim(); }
function normKey(n){ return String(n || '').toLowerCase().replace(/'/g, '’').trim(); }

// Collect every bonus affecting the character, each tagged with its source
function collectBonuses(c){
  const out = [], notes = []; const add = (list, src, key, kind, id) => list.forEach(b => out.push({...b, src, key: key + (b.key ? '' : ''), kind, id}));
  // worn armor & shield
  if (c.armor.n){ add([B('ac.armor', 'armor', num(c.armor.bonus))], c.armor.n, 'armor:' + c.armor.n, 'armor');
    if (num(c.armor.enh)) add([B('ac.armor', 'enhancement', num(c.armor.enh))], c.armor.n + ' (enhancement)', 'armorenh:' + c.armor.n, 'armor'); }
  if (c.shield.n){ add([B('ac.shield', 'shield', num(c.shield.bonus))], c.shield.n, 'shield:' + c.shield.n, 'armor');
    if (num(c.shield.enh)) add([B('ac.shield', 'enhancement', num(c.shield.enh))], c.shield.n + ' (enhancement)', 'shieldenh:' + c.shield.n, 'armor'); }
  // AC boxes typed on the sheet
  const man = [['ac.natural', 'natural armor', c.ac.nat, 'Natural armor (sheet)'], ['ac', 'deflection', c.ac.defl, 'Deflection (sheet)'], ['ac', 'dodge', c.ac.dodge, 'Dodge (sheet)'], ['ac', 'untyped', c.ac.misc, 'Misc AC (sheet)']];
  man.forEach(([t, ty, v, s]) => { if (num(v)) add([B(t, ty, num(v))], s, 'sheet:' + s, 'sheet'); });
  // worn items
  for (const it of c.items){ if (it.loc !== 'equipped') continue; const bl = itemBonuses(it); if (bl.length) add(bl, it.n + (it.plus ? ` +${it.plus}` : ''), 'item:' + normKey(it.n) + ':' + it.id, 'item', it.id); }
  // feats
  for (const f of c.feats){ const fn = FEAT_BONUS[normKey(f.n)]; if (fn){ const ch = String(f.note || '').trim(); add(fn(ch), f.n + (ch ? ` (${ch})` : ''), 'feat:' + normKey(f.n) + ':' + normKey(ch), 'feat', f.id); }
    if (f.bon) add(f.bon, f.n, 'feat:' + f.id, 'feat', f.id); }
  // active effects
  for (const e of c.effects){ if (e.expired) continue; const bl = effectBonuses(c, e); if (bl.b.length) add(bl.b, e.n, (bl.group ? 'grp:' + bl.group : 'eff:' + normKey(e.n)), 'effect', e.id); }
  // race
  const rb = RACE_BONUS[c.race]; if (rb) add(rb(), c.race + ' (racial)', 'race', 'race');
  // classes
  const cl = n => num((c.classes.find(k => k.n === n) || {}).lvl);
  const monk = cl('Monk'); if (monk && !c.armor.n && !c.shield.n){ const cd = classData('Monk'); const row = cd && cd.prog[Math.min(20, monk) - 1];
    const tab = row ? num(String(row[8]).replace('–', '-')) : 0; if (tab) add([B('ac', 'untyped', tab)], 'Monk AC bonus (level)', 'monklvl', 'class');
    const spd = row ? num(String(row[9])) : 0; if (spd) add([B('speed', 'untyped', spd)], 'Monk fast movement', 'monkspd', 'class'); }
  const barb = cl('Barbarian'); if (barb && !/heavy|half-plate|full plate|splint|banded/i.test(c.armor.n || '')) add([B('speed', 'untyped', 10)], 'Barbarian fast movement', 'barbspd', 'class');
  // familiar's gift to its master (Alertness-style bonuses)
  if (typeof familiarBonuses === 'function') familiarBonuses(c).forEach(b => out.push(b));
  // synergies
  const rk = name => { const m = name.match(/^(\w+) \((.+)\)$/); if (m && SUBSKILLS[m[1]]) return num((c.subskills.find(s => s.base === m[1] && s.sub === m[2]) || {}).ranks); return num((c.skills[name] || {}).ranks); };
  SYNERGY.forEach(([a, b]) => { if (rk(a) >= 5) add([B('skill:' + b, 'synergy', 2)], `${a} 5+ ranks (synergy)`, 'syn:' + a + '>' + b, 'synergy'); });
  // conditions that remove Dex from AC
  const noDex = c.effects.some(e => !e.expired && (COND_BONUS[normKey(e.n)] || {}).noDex);
  return {list: out, noDex};
}
function itemBonuses(it){
  if (Array.isArray(it.bon)) return it.bon;
  if (it.lib){ const L = libById(it.lib); if (L) return libItemBonuses(L); }
  const def = itemBonusDef(it.n); if (!def) return [];
  const p = it.plus || (def.plus ? def.plus[0] : 0); return def.f(p);
}
function effectBonuses(c, e){
  if (Array.isArray(e.bon)) return {b: e.bon};
  const k = normKey(e.n);
  if (e.kind === 'condition'){ const d = COND_BONUS[k] || (e.lib && libById(e.lib) && {b: libById(e.lib).bon || []}); return d ? {b: d.b || [], group: d.key} : {b: []}; }
  const fn = SPELL_BONUS[k]; if (fn){ const lvl = k === 'barbarian rage' ? num((c.classes.find(x => x.n === 'Barbarian') || {}).lvl) : num(e.cl || totalLevel(c)); return {b: fn(lvl).b}; }
  const L = libByName('spell', e.n); if (L && Array.isArray(L.bon)) return {b: L.bon};
  return {b: []};
}
function effectNote(c, e){ const k = normKey(e.n);
  if (e.kind === 'condition') return (COND_BONUS[k] || {}).note || '';
  const fn = SPELL_BONUS[k]; return fn ? (fn(num(e.cl || totalLevel(c))).note || '') : ''; }
function hasAutoBonuses(kind, name){ const k = normKey(name);
  return kind === 'item' ? !!ITEM_BONUS[k] : kind === 'feat' ? !!FEAT_BONUS[k] : kind === 'condition' ? !!COND_BONUS[k] : !!SPELL_BONUS[k]; }

// Apply stacking rules to the bonuses that affect one statistic
function resolve(list, match){
  const cand = list.filter(match); const applied = [], supp = [];
  // 1) the same effect twice: only the best applies
  const best = new Map();
  for (const b of cand){ const k = b.key + '|' + b.ty; const cur = best.get(k);
    if (!cur){ best.set(k, b); continue; }
    const better = b.v < 0 && cur.v < 0 ? b.v < cur.v : b.v > cur.v;
    if (better){ supp.push({b: cur, by: b, why:'same effect'}); best.set(k, b); } else supp.push({b, by: cur, why:'same effect'}); }
  // 2) same type: bonuses don't stack (except dodge, circumstance, racial, synergy, untyped); typed penalties: only the worst
  const byType = new Map();
  for (const b of best.values()){
    if (STACKING_TYPES.has(b.ty)){ applied.push(b); continue; }
    const sign = b.v < 0 ? '-' : '+'; const k = b.ty + sign; const cur = byType.get(k);
    if (!cur){ byType.set(k, b); continue; }
    const better = b.v < 0 ? b.v < cur.v : b.v > cur.v;
    if (better){ supp.push({b: cur, by: b, why:'type'}); byType.set(k, b); } else supp.push({b, by: cur, why:'type'});
  }
  applied.push(...byType.values());
  return {total: applied.reduce((s, b) => s + num(b.v), 0), applied, supp};
}

// Class features that depend on final ability modifiers (added after abilities are worked out)
function classAbilityBonuses(c, D){
  const out = []; const cl = n => num((c.classes.find(k => k.n === n) || {}).lvl);
  if (cl('Monk') && !c.armor.n && !c.shield.n && D.Wis > 0) out.push({...B('ac', 'untyped', D.Wis), src:'Monk AC bonus (Wis)', key:'monkwis', kind:'class'});
  for (const k of c.classes){ const cd = classData(k.n); const col = cd && cd.prestige ? (cd.hdr || []).indexOf('AC Bonus') : -1; const row = col > 0 && cd.prog[Math.min(num(k.lvl), cd.prog.length) - 1];
    const v = row ? num(String(row[col]).replace('+', '')) : 0; if (v) out.push({...B('ac', 'dodge', v), src:`${k.n} AC bonus`, key:'prcac:' + k.n, kind:'class'}); }
  if (cl('Paladin') >= 2 && D.Cha > 0) saves('untyped', D.Cha).forEach(b => out.push({...b, src:'Divine grace (Cha)', key:'divinegrace', kind:'class'}));
  return out;
}
