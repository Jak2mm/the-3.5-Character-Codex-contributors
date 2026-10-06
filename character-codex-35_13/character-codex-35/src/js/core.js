// ===================== DATA =====================
const SRD = JSON.parse(document.getElementById('srd-data').textContent);
const ABIL = ['Str','Dex','Con','Int','Wis','Cha'];
const ABIL_FULL = {Str:'Strength',Dex:'Dexterity',Con:'Constitution',Int:'Intelligence',Wis:'Wisdom',Cha:'Charisma'};
const IDX = {};
for (const k of ['spells','feats','skills','conditions','races','classes','weapons','armor','gear','magic','consumables','animals']) {
  if (!SRD[k]) SRD[k] = [];
  IDX[k] = new Map(SRD[k].map(x => [x.n.toLowerCase(), x]));
  for (const x of SRD[k]) if (x.n.includes('’')) IDX[k].set(x.n.toLowerCase().replace(/’/g, "'"), x);
}
const CAST = {Bard:{ab:'Cha',key:'Brd',start:0,spont:true},Cleric:{ab:'Wis',key:'Clr',start:0},Druid:{ab:'Wis',key:'Drd',start:0},
  Paladin:{ab:'Wis',key:'Pal',start:1},Ranger:{ab:'Wis',key:'Rgr',start:1},Sorcerer:{ab:'Cha',key:'Sor',start:0,spont:true},Wizard:{ab:'Int',key:'Wiz',start:0}};
const DOMAINS = ['Air','Animal','Chaos','Death','Destruction','Earth','Evil','Fire','Good','Healing','Knowledge','Law','Luck','Magic','Plant','Protection','Strength','Sun','Travel','Trickery','War','Water'];
const SUBSKILLS = {Craft:['alchemy','armorsmithing','bowmaking','trapmaking','weaponsmithing','blacksmithing','carpentry','leatherworking','stonemasonry'],
  Knowledge:['arcana','architecture and engineering','dungeoneering','geography','history','local','nature','nobility and royalty','religion','the planes'],
  Perform:['act','comedy','dance','keyboard instruments','oratory','percussion instruments','string instruments','wind instruments','sing'],
  Profession:['herbalist','sailor','scribe','soldier','merchant','innkeeper','guide','hunter']};
const ALIGN = ['Lawful Good','Neutral Good','Chaotic Good','Lawful Neutral','True Neutral','Chaotic Neutral','Lawful Evil','Neutral Evil','Chaotic Evil'];
const SIZES = {Fine:{ac:8,gr:-16,hide:16,carry:.125},Diminutive:{ac:4,gr:-12,hide:12,carry:.25},Tiny:{ac:2,gr:-8,hide:8,carry:.5},Small:{ac:1,gr:-4,hide:4,carry:.75},
  Medium:{ac:0,gr:0,hide:0,carry:1},Large:{ac:-1,gr:4,hide:-4,carry:2},Huge:{ac:-2,gr:8,hide:-8,carry:4}};
const HEAVY = [0,10,20,30,40,50,60,70,80,90,100,115,130,150,175,200,230,260,300,350,400,460,520,600,700,800,920,1040,1200,1400];
const LOCS = {equipped:'Worn / wielded',carried:'Carried',pack:'Backpack',mount:'Mount / cart',stored:'Stored (not carried)'};
const QSTAT = {active:['Active','acc'],hold:['On hold','warn'],done:['Completed','good'],failed:['Failed','bad']};

const GLOSS = {
  Str:['Strength','Muscle and physical power. Modifier applies to melee attack rolls, melee and thrown weapon damage, grapple checks, Climb, Jump and Swim checks, and Strength checks. It also sets how much you can carry.'],
  Dex:['Dexterity','Agility, reflexes and balance. Modifier applies to ranged attack rolls, Armor Class (limited by armor\'s max Dex bonus), Reflex saves, initiative, and Balance, Escape Artist, Hide, Move Silently, Open Lock, Ride, Sleight of Hand, Tumble and Use Rope.'],
  Con:['Constitution','Health and stamina. Modifier is added to each Hit Die you roll and to Fortitude saves and Concentration checks. Constitution 0 means death.'],
  Int:['Intelligence','Learning and reasoning. Sets bonus languages and skill points per level, and applies to Appraise, Craft, Decipher Script, Disable Device, Forgery, Knowledge, Search and Spellcraft. Wizards cast with Intelligence.'],
  Wis:['Wisdom','Willpower, common sense and perception. Modifier applies to Will saves and to Heal, Listen, Profession, Sense Motive, Spot and Survival. Clerics, druids, paladins and rangers cast with Wisdom.'],
  Cha:['Charisma','Force of personality and leadership. Applies to Bluff, Diplomacy, Disguise, Gather Information, Handle Animal, Intimidate, Perform and Use Magic Device, and to turning undead. Bards and sorcerers cast with Charisma.'],
  AC:['Armor Class','10 + armor bonus + shield bonus + Dex modifier (capped by armor) + size modifier + natural armor + deflection + dodge and other bonuses. An attack roll equal to or higher than your AC hits.'],
  Touch:['Touch AC','AC against touch attacks: armor, shield and natural armor bonuses do not apply. Dex, size, deflection and dodge still count.'],
  FF:['Flat-Footed AC','AC before you act in combat, or whenever you lose your Dex bonus: no Dex bonus (if positive) and no dodge bonuses.'],
  BAB:['Base Attack Bonus','From your class levels (multiclass characters add each class\'s value). At +6, +11 and +16 you gain an extra attack in a full attack, each at a cumulative –5.'],
  Grapple:['Grapple','Base attack bonus + Strength modifier + special size modifier (Small –4, Large +4) + other modifiers. Used to start and win grapples.'],
  Init:['Initiative','d20 + Dex modifier + other modifiers (Improved Initiative gives +4). Highest goes first.'],
  Fort:['Fortitude Save','Base save from class + Constitution modifier. Resists poison, disease, death effects and physical punishment.'],
  Ref:['Reflex Save','Base save from class + Dexterity modifier. Halves or avoids area attacks like fireballs and traps.'],
  Will:['Will Save','Base save from class + Wisdom modifier. Resists mental influence, charms and illusions.'],
  HP:['Hit Points','At 0 hp you are disabled; at –1 to –9 you are dying (lose 1 hp per round unless stable); at –10 you are dead. Nonlethal damage equal to current hp leaves you staggered; above it, unconscious.'],
  Speed:['Speed','Base land speed per move action. Medium and heavy armor or loads reduce it (dwarves excepted).'],
  SR:['Spell Resistance','A spellcaster must beat this number with a caster level check (d20 + caster level) for a spell that allows SR to affect you.'],
  DR:['Damage Reduction','Ignore this many points of damage from each weapon attack unless the weapon overcomes it (e.g. 5/magic, 10/silver).'],
  Load:['Carrying Capacity','Light load: no penalty. Medium load: max Dex +3, check penalty –3, speed reduced (30→20). Heavy load: max Dex +1, check penalty –6, speed reduced, run ×3. Small creatures carry ¾, Large ×2.'],
  Skillpts:['Skill points','Each class level gives (class skill points + Int modifier, minimum 1); first character level is ×4; humans gain 1 extra per level (4 at 1st). Class skills cost 1 point per rank (max level + 3); cross-class skills cost 2 points per rank (max half that).'],
};

// ===================== UTIL =====================
const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num = v => { const n = parseFloat(v); return isFinite(n) ? n : 0; };
const sgn = n => (n >= 0 ? '+' : '–') + Math.abs(n);
const mod = s => Math.floor((num(s) - 10) / 2);
const uid = (p='x') => p + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const ord = n => n + (['th','st','nd','rd'][(n % 100 > 10 && n % 100 < 14) ? 0 : (n % 10 < 4 ? n % 10 : 0)] || 'th');
const lvLabel = l => l === 0 ? 'Cantrips / 0' : ord(l);
const clone = o => JSON.parse(JSON.stringify(o));
function getPath(o, p){ return p.split('.').reduce((a, k) => a == null ? a : a[k], o); }
function setPath(o, p, v){ const ks = p.split('.'); let a = o; for (let i = 0; i < ks.length - 1; i++){ if (a[ks[i]] == null || typeof a[ks[i]] !== 'object') a[ks[i]] = /^\d+$/.test(ks[i+1]) ? [] : {}; a = a[ks[i]]; } a[ks[ks.length-1]] = v; }
const lsGet = k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
function toast(html, kind=''){ const t = document.createElement('div'); t.className = 'toast ' + kind; t.innerHTML = html; $('#toasts').appendChild(t); setTimeout(() => t.remove(), kind === 'warn' ? 6500 : 3800); }
function rollD(n){ return 1 + Math.floor(Math.random() * n); }
function rollExpr(expr){ // "2d6+3", "1d8+2 +1d6 fire": every dice term and flat modifier is added up
  const str = String(expr).replace(/–/g, '-'); const re = /([+-])?\s*(\d*)d(\d+)|([+-])\s*(\d+)(?![\d]*\s*d)/gi; let m, t = 0, b = 0, any = false; const rs = [];
  while ((m = re.exec(str))){
    if (m[3]){ any = true; const k = parseInt(m[2] || '1'), sd = parseInt(m[3]), sign = m[1] === '-' ? -1 : 1; for (let i = 0; i < k; i++){ const r = rollD(sd); rs.push(r); t += sign * r; } }
    else if (m[5]) b += (m[4] === '-' ? -1 : 1) * parseInt(m[5]);
  }
  return any ? {total: t + b, rolls: rs, bonus: b} : null;
}
function rollToast(label, bonus){ const r = rollD(20); const t = r + bonus;
  toast(`<span class="cap" style="color:inherit;opacity:.8">${esc(label)}</span><br><b>${t}</b> &nbsp;<span style="opacity:.75">d20 ${r} ${sgn(bonus)}${r===20?' · natural 20':r===1?' · natural 1':''}</span>`); }

// ===================== MODEL =====================
function newChar(name='New Adventurer'){
  const c = {id: uid('c'), v:1, name, player:'', classes:[{n:'Fighter', lvl:1}], race:'Human', align:'True Neutral', deity:'', size:'',
    age:'', gender:'', height:'', weight:'', eyes:'', hair:'', skin:'', xp:0, campaign:'',
    abil:{}, hp:{max:10, cur:10, nl:0, temp:0}, dr:'', speedMisc:0, initMisc:0, sr:'',
    ac:{nat:0, defl:0, dodge:0, misc:0}, armor:{n:'', bonus:0, enh:0, mdx:'', acp:0, asf:0}, shield:{n:'', bonus:0, enh:0, acp:0, asf:0},
    saves:{Fort:{magic:0,misc:0,temp:0}, Ref:{magic:0,misc:0,temp:0}, Will:{magic:0,misc:0,temp:0}}, babMisc:0, grMisc:0,
    attacks:[], skills:{}, subskills:[], feats:[], abilities:[], languages:'Common',
    spells:{}, domains:['',''], effects:[], combat:{round:0, turn:0, list:[]},
    items:[], coins:{cp:0, sp:0, gp:0, pp:0}, coinWeight:true, ignoreWeight:false, notes:[], quests:[], players:[], npcs:[], locations:[], factions:[], maps:[], companions:[], updatedAt: Date.now()};
  for (const a of ABIL) c.abil[a] = {base:10, enh:0, temp:0};
  return c;
}
function exampleChar(){
  const c = newChar('Example — Brother Aldric');
  Object.assign(c, {player:'(example — rename or delete me)', classes:[{n:'Cleric', lvl:3}], race:'Dwarf', align:'Lawful Good', deity:'The Forge-Father', xp:3400,
    hp:{max:27, cur:21, nl:0, temp:0}, languages:'Common, Dwarven, Celestial'});
  Object.assign(c.abil, {Str:{base:14,enh:0,temp:0},Dex:{base:10,enh:0,temp:0},Con:{base:14,enh:0,temp:0},Int:{base:10,enh:0,temp:0},Wis:{base:16,enh:0,temp:0},Cha:{base:12,enh:0,temp:0}});
  c.armor = {n:'Chainmail', bonus:5, enh:0, mdx:'2', acp:-5, asf:30}; c.shield = {n:'Shield, heavy wooden', bonus:2, enh:0, acp:-2, asf:15};
  c.attacks = [{id:uid('a'), n:'Mace, heavy', ab:'Str', enh:0, misc:0, dmg:'1d8', crit:'x2', rng:'—', ty:'Bludgeoning', two:false, note:'', eq:'main'},
               {id:uid('a'), n:'Crossbow, light', ab:'Dex', enh:0, misc:0, dmg:'1d8', crit:'19–20/x2', rng:'80 ft.', ty:'Piercing', two:false, nostr:true, note:'80 ft. · Piercing', eq:''}];
  c.skills = {Concentration:{ranks:6, misc:0}, Heal:{ranks:2, misc:0}};
  c.subskills = [{id:uid('s'), base:'Knowledge', sub:'religion', ranks:4, misc:0}];
  c.feats = [{id:uid('f'), n:'Combat Casting', note:''},{id:uid('f'), n:'Extra Turning', note:''}];
  c.domains = ['Good','Protection'];
  c.spells = {Cleric:{list:[{id:uid('p'), n:'Guidance', lvl:0, prep:2, cast:0},{id:uid('p'), n:'Bless', lvl:1, prep:1, cast:0},{id:uid('p'), n:'Shield of Faith', lvl:1, prep:1, cast:0},
    {id:uid('p'), n:'Protection from Evil', lvl:1, prep:1, cast:0, dom:true},{id:uid('p'), n:"Bull's Strength", lvl:2, prep:1, cast:0}], used:{}}};
  c.effects = [{id:uid('e'), n:'Bless', kind:'spell', rounds:28, total:30, note:'+1 morale on attacks, saves vs fear'}];
  c.combat = {round:2, turn:1, list:[{id:uid('i'), n:'Brother Aldric', init:15, me:true, hp:'21/27'},{id:uid('i'), n:'Goblin warband', init:12, hp:''},{id:uid('i'), n:'Hobgoblin captain', init:9, hp:''}]};
  c.items = [{id:uid('it'), n:'Chainmail', t:'armor', qty:1, w:40, loc:'equipped', slot:'body', note:''},{id:uid('it'), n:'Shield, heavy wooden', t:'armor', qty:1, w:10, loc:'equipped', slot:'shield', note:''},
    {id:uid('it'), n:'Mace, heavy', t:'weapon', qty:1, w:8, loc:'equipped', note:''},{id:uid('it'), n:'Crossbow, light', t:'weapon', qty:1, w:4, loc:'carried', note:''},{id:uid('it'), n:'Bolts, crossbow (10)', t:'weapon', qty:2, w:1, loc:'carried', note:''},
    {id:uid('it'), n:'Backpack (empty)', t:'gear', qty:1, w:2, loc:'carried', note:''},{id:uid('it'), n:'Rations, trail (per day)', t:'gear', qty:4, w:1, loc:'pack', note:''},
    {id:uid('it'), n:'Holy symbol, silver', t:'gear', qty:1, w:1, loc:'carried', note:''},{id:uid('it'), n:'Potion of Cure Light Wounds', t:'consumable', qty:2, w:0.1, loc:'carried', note:''}];
  c.coins = {cp:12, sp:30, gp:87, pp:0};
  c.notes = [{id:uid('n'), t:'Session 4 — The Sunken Abbey', date:'', body:'Found the abbot\'s journal in the crypt. Mentions a "bell that rings below the water". The goblins wear the sign of the Black Hand.\nPrior Hesk wants the bell back before the spring festival.'}];
  const loc = {id:uid('loc'), n:'Sunken Abbey', type:'Ruins', region:'Marsh of Tolling', status:'visited', parent:'', desc:'A drowned monastery half under the marsh. The bell tower still stands above the water.', img:'', log:[{date:'', text:'Crypt entrance is behind the collapsed chapter house.'}]};
  const fac = {id:uid('fac'), n:'Black Hand', type:'Cult', attitude:'hostile', leader:'', hq:'', goals:'Unknown. They took the abbey bell.', desc:'Goblins and others marked with a black handprint.', img:'', log:[]};
  const npc = {id:uid('npc'), n:'Prior Hesk', role:'Prior of the river temple', race:'Human', cls:'Cleric?', align:'', attitude:'friendly', status:'alive', loc:loc.id, fac:'', stats:{}, attacks:'', special:'', img:'',
    desc:'Elderly, soft-spoken, worried about the missing bell.', log:[{date:'', text:'Offered 200 gp and the temple\'s favour for the bell. Seems to know more about the Black Hand than he lets on.'}]};
  c.players = [{id:uid('pc'), n:'Wren Ashdown', player:'Sam', race:'Half-elf', cls:'Rogue 3', align:'', role:'Scout, lockpick', trust:'wary', status:'active', deity:'', stats:{ac:'16'}, attacks:'', special:'Disappears in shadows', img:'',
    opinion:'Reliable in a fight, but pockets things when she thinks no one is looking.', desc:'Quick-witted, quiet. Joined us at the river crossing.', log:[{date:'', text:'Knew the Black Hand\'s sign before anyone else did. Says she\'s "seen it around".'}]}];
  c.npcs = [npc]; c.locations = [loc]; c.factions = [fac];
  c.quests = [{id:uid('q'), t:'Recover the Abbey Bell', giver:'Prior Hesk', where:'Sunken Abbey', status:'active', reward:'200 gp + temple favour', note:'', obj:[{t:'Find the crypt entrance',done:true},{t:'Learn who took the bell',done:false},{t:'Return the bell to Hesk',done:false}]}];
  return c;
}

// ===================== LOOKUPS =====================
function classData(n){ return IDX.classes.get(String(n).toLowerCase()); }
function raceData(n){ return IDX.races.get(String(n).toLowerCase()); }
function totalLevel(c){ return c.classes.reduce((s, k) => s + Math.max(0, num(k.lvl)), 0); }
function progVal(cls, lvl, col){ const cd = classData(cls); if (!cd || lvl < 1) return 0; const row = cd.prog[Math.min(lvl, 20) - 1]; return row ? num(String(row[col]).replace('–','-').split('/')[0]) : 0; }
function libEntries(t){ return (APP.lib.entries || []).filter(e => !t || e.t === t); }
function libById(id){ return (APP.lib.entries || []).find(e => e.id === id); }
function libByName(t, n){ return (APP.lib.entries || []).find(e => e.t === t && e.n.toLowerCase() === String(n).toLowerCase()); }

// ===================== DERIVED =====================
function derive(c){
  const D = {}; const lvl = totalLevel(c); D.lvl = lvl;
  const race = raceData(c.race) || {adj:{}, size:'Medium', spd:30};
  const size = c.size || race.size || 'Medium'; D.size = size; const SZ = SIZES[size] || SIZES.Medium;
  // typed bonuses from items, feats, effects, race, class and the sheet's own AC boxes
  const BL = collectBonuses(c); const L = BL.list; D.res = {}; D.bonusList = L; D.noDex = BL.noDex;
  const R = (key, match) => { const r = resolve(L, match); D.res[key] = r; return r; };
  // D.why[key] = {parts:[[label, value, 'base'?]], total, note} — what each total is made of (shown on hover)
  D.why = {}; const TB = r => r.applied.map(b => [`${b.src} (${b.ty})`, num(b.v)]);
  const W = (key, parts, total, note, unit) => { D.why[key] = {parts: parts.filter(p => p[2] === 'base' || num(p[1]) !== 0), total, note, unit}; };
  let conNoBonus = 0;
  for (const a of ABIL){
    const x = c.abil[a] || {}; const racial = race.adj[a] || 0;
    const bon = R('ab.' + a, b => b.t === a).total;
    const total = num(x.base) + racial + num(x.enh) + bon; const m = mod(total);
    if (a === 'Con') conNoBonus = mod(num(x.base) + racial + num(x.enh));
    const temp = num(x.temp); const tScore = total + temp; const tm = mod(tScore);
    D['ab.'+a+'.racial'] = racial; D['ab.'+a+'.racialTxt'] = racial ? sgn(racial) : '—'; D['ab.'+a+'.bonus'] = bon ? sgn(bon) : '—';
    D['ab.'+a+'.total'] = total; D['ab.'+a+'.mod'] = m;
    D['ab.'+a+'.tscore'] = temp ? tScore : ''; D['ab.'+a+'.tmod'] = temp ? tm : '';
    D[a] = temp ? tm : m; D[a+'Score'] = temp ? tScore : total;
    W('ab.' + a, [['Base score', num(x.base), 'base'], [`Racial (${c.race || 'race'})`, racial], ['Misc (your entry)', num(x.enh)], ...TB(D.res['ab.' + a])], total,
      `Modifier ${sgn(m)} = (score − 10) ÷ 2, rounded down.` + (temp ? ` With your temp adjustment of ${sgn(temp)}: score ${tScore}, modifier ${sgn(tm)} (this is the one used everywhere).` : ''));
  }
  L.push(...classAbilityBonuses(c, D));
  // BAB & saves
  let bab = 0, fort = 0, ref = 0, will = 0;
  for (const k of c.classes){ const l = num(k.lvl); bab += progVal(k.n, l, 1); fort += progVal(k.n, l, 2); ref += progVal(k.n, l, 3); will += progVal(k.n, l, 4); }
  const clsParts = col => c.classes.filter(k => num(k.lvl) > 0).map(k => [`${k.n} ${num(k.lvl)}`, progVal(k.n, num(k.lvl), col), 'base']);
  W('bab', [...clsParts(1), ['Adjustment (your entry)', num(c.babMisc)]], bab + num(c.babMisc), 'Base attack bonus from each class\'s table. Each +5 above +1 gives another attack at −5.');
  bab += num(c.babMisc); D.bab = bab;
  const it = []; for (let b = bab; it.length < 4 && (it.length === 0 || b > 0); b -= 5) it.push(sgn(b)); D.babIter = it.join('/');
  const base = {Fort:fort, Ref:ref, Will:will}, sab = {Fort:'Con', Ref:'Dex', Will:'Wis'};
  for (const s of ['Fort','Ref','Will']){ const x = c.saves[s] || {}; D['sv.'+s+'.base'] = base[s]; D['sv.'+s+'.ab'] = D[sab[s]];
    const bon = R('sv.' + s, b => b.t === 'save.' + s || b.t === 'save.all').total; D['sv.'+s+'.bon'] = bon ? sgn(bon) : '—';
    D['sv.'+s] = base[s] + D[sab[s]] + bon + num(x.magic) + num(x.misc) + num(x.temp);
    W('sv.' + s, [...clsParts({Fort:2, Ref:3, Will:4}[s]).map(p => [p[0] + ' (base save)', p[1], 'base']), [`${ABIL_FULL[sab[s]]} modifier`, D[sab[s]], 'base'], ...TB(D.res['sv.' + s]), ['Misc (your entry)', num(x.misc) + num(x.magic)], ['Temp (your entry)', num(x.temp)]], D['sv.' + s]); }
  // armor class
  const loadInfo = carry(c, D);
  let mdx = c.armor.mdx === '' || c.armor.mdx == null || !c.armor.n ? 99 : num(c.armor.mdx);
  if (loadInfo.load === 'medium') mdx = Math.min(mdx, 3); if (loadInfo.load === 'heavy') mdx = Math.min(mdx, 1);
  let dexAC = Math.min(D.Dex, mdx); if (BL.noDex) dexAC = Math.min(0, dexAC);
  D.dexAC = dexAC; D.mdx = mdx === 99 ? '—' : sgn(mdx);
  const arm = R('ac.armor', b => b.t === 'ac.armor').total, shd = R('ac.shield', b => b.t === 'ac.shield').total, nat = R('ac.natural', b => b.t === 'ac.natural').total;
  const othR = R('ac.other', b => b.t === 'ac'); const dodge = othR.applied.filter(b => b.ty === 'dodge').reduce((s, b) => s + num(b.v), 0);
  const oth = othR.total - (BL.noDex ? dodge : 0);
  D.armorT = arm; D.shieldT = shd; D.natT = nat; D.acOther = sgn(oth); D.sizeAC = SZ.ac;
  D.ac = 10 + arm + shd + nat + dexAC + SZ.ac + oth;
  D.touch = 10 + dexAC + SZ.ac + oth;
  D.ff = 10 + arm + shd + nat + Math.min(0, dexAC) + SZ.ac + othR.total - dodge;
  const dexNote = (dexAC !== D.Dex ? `Dex ${sgn(D.Dex)}` : "Dex modifier") + (dexAC !== D.Dex ? ` limited to ${sgn(dexAC)}` + (BL.noDex ? ' (a condition denies your Dex bonus)' : mdx < 99 ? ` (max Dex ${sgn(mdx)} from ${c.armor.n && num(c.armor.mdx) === mdx ? c.armor.n : loadInfo.load + ' load'})` : '') : '');
  const othParts = TB(othR).filter(p => !(BL.noDex && / \(dodge\)$/.test(p[0])));
  W('ac', [['Base', 10, 'base'], ...TB(D.res['ac.armor']), ...TB(D.res['ac.shield']), ...TB(D.res['ac.natural']), [dexNote, dexAC, 'base'], [`Size (${size})`, SZ.ac], ...othParts], D.ac);
  W('touch', [['Base', 10, 'base'], [dexNote, dexAC, 'base'], [`Size (${size})`, SZ.ac], ...othParts], D.touch, 'Touch attacks ignore armor, shield and natural armor bonuses.');
  W('ff', [['Base', 10, 'base'], ...TB(D.res['ac.armor']), ...TB(D.res['ac.shield']), ...TB(D.res['ac.natural']), ['Dex (only a penalty counts)', Math.min(0, dexAC)], [`Size (${size})`, SZ.ac], ...TB(othR).filter(p => !/ \(dodge\)$/.test(p[0]))], D.ff, 'Flat-footed: you lose your Dex bonus and dodge bonuses to AC.');
  W('ac.armor', TB(D.res['ac.armor']), arm); W('ac.shield', TB(D.res['ac.shield']), shd); W('ac.natural', TB(D.res['ac.natural']), nat); W('ac.other', othParts, oth, 'Deflection, dodge, insight, luck and other AC bonuses, including the boxes you fill in under the table.');
  W('dexAC', [[`Dex modifier`, D.Dex, 'base'], ...(dexAC !== D.Dex ? [['Limit', dexAC - D.Dex]] : [])], dexAC, dexNote);
  D.res.ac = {applied: [...D.res['ac.armor'].applied, ...D.res['ac.shield'].applied, ...D.res['ac.natural'].applied, ...othR.applied], supp: [...D.res['ac.armor'].supp, ...D.res['ac.shield'].supp, ...D.res['ac.natural'].supp, ...othR.supp]};
  let acp = num(c.armor.acp) + num(c.shield.acp); if (loadInfo.load === 'medium') acp = Math.min(acp, -3); if (loadInfo.load === 'heavy') acp = Math.min(acp, -6);
  D.acp = acp; D.asf = num(c.armor.asf) + num(c.shield.asf);
  W('acp', [[c.armor.n || 'Armor', num(c.armor.acp), 'base'], [c.shield.n || 'Shield', num(c.shield.acp)], ...(acp !== num(c.armor.acp) + num(c.shield.acp) ? [[`${loadInfo.load} load (worse penalty used)`, acp - num(c.armor.acp) - num(c.shield.acp)]] : [])], acp, 'Applies to Balance, Climb, Escape Artist, Hide, Jump, Move Silently, Sleight of Hand and Tumble (double for Swim).');
  const ib = R('init', b => b.t === 'init').total; D.initBon = ib;
  D.init = D.Dex + ib + num(c.initMisc);
  W('init', [['Dex modifier', D.Dex, 'base'], ...TB(D.res.init), ['Misc (your entry)', num(c.initMisc)]], D.init);
  D.grapple = bab + D.Str + SZ.gr + num(c.grMisc); D.sizeGr = SZ.gr;
  W('grapple', [['Base attack bonus', bab, 'base'], ['Str modifier', D.Str, 'base'], [`Size (${size})`, SZ.gr], ['Misc (your entry)', num(c.grMisc)]], D.grapple);
  const sb = R('speed', b => b.t === 'speed').total;
  D.speed = (race.spd || 30) + sb + num(c.speedMisc); D.raceSpd = race.spd || 30; D.speedBon = sb;
  W('speed', [[`${c.race || 'Base'} speed`, race.spd || 30, 'base'], ...TB(D.res.speed), ['Misc (your entry)', num(c.speedMisc)]], D.speed, 'Armor and heavy loads can slow you; enter that in misc if it applies.', ' ft.');
  D.hpBonus = R('hp', b => b.t === 'hp').total + (D.Con - conNoBonus) * lvl; D.hpMax = num(c.hp.max) + D.hpBonus;
  W('hp', [['Rolled max (your entry)', num(c.hp.max), 'base'], ...TB(D.res.hp), ['Con modifier changes × level', (D.Con - conNoBonus) * lvl]], D.hpMax, 'Your rolled max should already include your normal Con modifier. Items or spells that change Con add or remove hit points here.');
  D.hpBonusTxt = D.hpBonus ? `${sgn(D.hpBonus)} from feats/Con changes` : '';
  // HP
  D.hpPct = D.hpMax ? Math.max(0, Math.min(1, num(c.hp.cur) / D.hpMax)) : 0;
  D.hpState = num(c.hp.cur) <= -10 ? 'Dead' : num(c.hp.cur) < 0 ? 'Dying' : num(c.hp.cur) === 0 ? 'Disabled' : (num(c.hp.nl) && num(c.hp.nl) >= num(c.hp.cur)) ? (num(c.hp.nl) === num(c.hp.cur) ? 'Staggered' : 'Unconscious') : num(c.hp.cur) < D.hpMax / 2 ? 'Bloodied' : 'Healthy';
  // XP
  D.xpNext = lvl * (lvl + 1) * 500; D.xpPct = Math.min(1, num(c.xp) / (D.xpNext || 1));
  // skills
  const csSet = new Set(); for (const k of c.classes){ const cd = classData(k.n); if (cd) cd.cs.forEach(s => csSet.add(s)); }
  D.csSet = csSet;
  const maxR = lvl + 3; D.maxRanks = maxR; D.maxCross = maxR / 2;
  let spent = 0;
  const skillRow = (key, name, sk, ranks, misc) => {
    const isCS = isClassSkill(csSet, name);
    const ab = sk.ab === 'None' ? 0 : D[sk.ab] || 0;
    let pen = 0; if (sk.acp) pen = acp * (sk.n === 'Swim' ? 2 : 1);
    let sz = sk.n === 'Hide' ? SZ.hide : 0;
    const lname = ('skill:' + name).toLowerCase();
    const bon = R('sk.' + key, b => b.t.toLowerCase() === lname || b.t === 'skill.all' || b.t === 'skill.ab:' + sk.ab).total;
    D['sk.'+key+'.cs'] = isCS; D['sk.'+key+'.ab'] = ab; D['sk.'+key+'.acp'] = pen || ''; D['sk.'+key+'.bon'] = bon ? sgn(bon) : '';
    D['sk.'+key+'.total'] = ab + num(ranks) + num(misc) + pen + sz + bon;
    W('sk.' + key, [['Ranks', num(ranks), 'base'], [sk.ab === 'None' ? 'No ability' : `${sk.ab} modifier`, ab, 'base'], ['Armor check penalty' + (sk.n === 'Swim' ? ' (×2)' : ''), pen], ['Size (Hide)', sz], ...TB(D.res['sk.' + key]), ['Misc (your entry)', num(misc)]], D['sk.'+key+'.total'],
      `${isCS ? 'Class skill' : 'Cross-class skill'}: max ranks ${isCS ? maxR : maxR / 2}.${sk.tr && !num(ranks) ? ' Trained only, so you can\'t use it without ranks.' : ''}`);
    D['sk.'+key+'.untrained'] = sk.tr && !num(ranks);
    spent += num(ranks) * (isCS ? 1 : 2);
  };
  for (const sk of SRD.skills){ if (SUBSKILLS[sk.n]) continue; const x = c.skills[sk.n] || {}; skillRow(sk.n, sk.n, sk, x.ranks, x.misc); }
  for (const s of c.subskills){ const sk = IDX.skills.get(s.base.toLowerCase()); if (sk) skillRow(s.id, `${s.base} (${s.sub})`, sk, s.ranks, s.misc); }
  let pts = 0;
  c.classes.forEach((k, i) => { const cd = classData(k.n); if (!cd) return; const per = Math.max(1, cd.sp + mod(D.IntScore - num(c.abil.Int.temp)) + (c.race === 'Human' ? 1 : 0)); pts += per * num(k.lvl) + (i === 0 && num(k.lvl) > 0 ? per * 3 : 0); });
  D.skillPts = pts; D.skillSpent = spent;
  W('skillPts', c.classes.map((k, i) => { const cd = classData(k.n); if (!cd) return null; const per = Math.max(1, cd.sp + mod(D.IntScore - num(c.abil.Int.temp)) + (c.race === 'Human' ? 1 : 0));
    return [`${k.n} ${num(k.lvl)}: ${per}/level${i === 0 ? ' (×4 at 1st level)' : ''}`, per * num(k.lvl) + (i === 0 && num(k.lvl) > 0 ? per * 3 : 0), 'base']; }).filter(Boolean), pts,
    `Per level: class skill points + Int modifier${c.race === 'Human' ? ' + 1 (human)' : ''}, minimum 1. Class skills cost 1 point per rank, cross-class skills 2.`);
  // feats
  let feats = 1 + Math.floor(lvl / 3) + (c.race === 'Human' ? 1 : 0); let bonus = [];
  for (const k of c.classes){ const l = num(k.lvl);
    if (k.n === 'Fighter') bonus.push(`${1 + Math.floor(l / 2)} fighter bonus`);
    if (k.n === 'Wizard' && Math.floor(l / 5)) bonus.push(`${Math.floor(l / 5)} wizard bonus`);
    if (k.n === 'Monk') bonus.push(`${l >= 6 ? 3 : l >= 2 ? 2 : 1} monk bonus`);
    if (k.n === 'Rogue' && l >= 10) bonus.push(`${Math.floor((l - 7) / 3)} rogue special (may be feats)`); }
  D.featSlots = feats; D.featBonus = bonus.join(', ');
  W('featSlots', [['1st level', 1, 'base'], ['Every 3 levels', Math.floor(lvl / 3)], ['Human', c.race === 'Human' ? 1 : 0]], feats, bonus.length ? 'Plus class bonus feats: ' + bonus.join(', ') + '.' : '');
  for (const a of c.attacks) atkCalc(c, a, D);
  return D;
}
function isClassSkill(csSet, name){
  if (csSet.has(name)) return true;
  const m = name.match(/^(\w+) \((.+)\)$/);
  if (m){ if (csSet.has(m[1])) return true; if (m[1] === 'Knowledge' && csSet.has('Knowledge (all)')) return true; }
  return false;
}
function carry(c, D){
  const s = Math.max(0, Math.round(D.StrScore != null ? D.StrScore : 10));
  let heavy; if (s <= 29) heavy = HEAVY[s]; else { const base = HEAVY[20 + (s % 10)]; heavy = base * Math.pow(4, Math.floor((s - 20) / 10)); }
  const size = (SIZES[c.size || (raceData(c.race) || {}).size || 'Medium'] || SIZES.Medium).carry; heavy = Math.floor(heavy * size);
  const light = Math.floor(heavy / 3), medium = Math.floor(heavy * 2 / 3);
  let w = 0; for (const it of c.items){ if (it.loc !== 'stored' && it.loc !== 'mount') w += num(it.w) * num(it.qty || 1); }
  const coins = num(c.coins.cp) + num(c.coins.sp) + num(c.coins.gp) + num(c.coins.pp);
  const cw = c.coinWeight ? coins / 50 : 0; w += cw;
  const r2 = x => Math.round(x * 100) / 100;
  if (c.ignoreWeight) return {light, medium, heavy, w: 0, coinW: 0, load: 'light', ignored: true, realW: r2(w)}; // table option: encumbrance off
  const load = w <= light ? 'light' : w <= medium ? 'medium' : w <= heavy ? 'heavy' : 'over';
  return {light, medium, heavy, w: r2(w), coinW: r2(cw), load};
}

// spells
function casterInfo(c, k, D){
  const ci = CAST[k.n]; const cd = classData(k.n); if (!ci || !cd) return null;
  const l = Math.min(20, num(k.lvl) + (typeof advLevels === 'function' ? advLevels(c, k.n) : 0)); if (l < 1) return null;
  const row = cd.prog[l - 1] || []; const m = D[ci.ab];
  const slots = [];
  for (let i = 0; i < 10; i++){
    const col = 6 + i - ci.start; const sl = i - 0; if (i < ci.start) continue;
    const v = row[col]; if (v == null) continue;
    let base = null, dom = 0; if (v && v !== '—') { const p = String(v).split('+'); base = num(p[0]); dom = p[1] ? num(p[1]) : 0; }
    let bonus = 0; if (base != null && sl >= 1 && m >= sl) bonus = Math.floor((m - sl) / 4) + 1;
    const scoreOK = D[ci.ab + 'Score'] >= 10 + sl;
    slots.push({lvl: sl, base, dom, bonus, total: base == null ? null : base + bonus + dom, dc: 10 + sl + m, scoreOK});
  }
  let known = null; if (cd.known && cd.known.length){ const kr = cd.known[l - 1]; if (kr) known = kr.slice(1).map(x => x === '—' ? null : num(x)); }
  const cl = ci.start === 1 ? (l >= 4 ? Math.floor(l / 2) : 0) : l;
  return {ci, slots, known, cl, mod: m};
}
function parseDuration(dur, cl){
  if (!dur) return {rounds:null, text:'—'};
  const d = dur.toLowerCase(); cl = Math.max(1, cl || 1);
  if (/^instantaneous/.test(d)) return {rounds:null, text:'Instantaneous', inst:true};
  if (/^permanent/.test(d)) return {rounds:null, text:'Permanent'};
  const units = {round:1, rd:1, minute:10, min:10, hour:600, hr:600, day:14400};
  const re = /(\d+d\d+|\d+)\s*(rounds?|rds?\.?|minutes?|min\.?|hours?|hr\.?|days?)\s*(?:\/\s*(\d+\s*)?levels?|per\s+level)?/;
  const m = d.match(re);
  if (!m){ return {rounds:null, text: dur}; }
  const unit = units[m[2].replace(/s?\.?$/,'').replace(/s$/,'')] || units[m[2].slice(0,3)] || 1;
  let n; let rolled = '';
  if (/d/.test(m[1])){ const r = rollExpr(m[1]); n = r.total; rolled = ` (rolled ${m[1]} = ${r.total})`; } else n = parseInt(m[1]);
  const perLvl = /level/.test(m[0]); let mult = 1;
  if (perLvl){ mult = m[3] ? Math.floor(cl / parseInt(m[3])) || 1 : cl; }
  const rounds = n * unit * mult;
  return {rounds, text: dur + rolled, conc: /^concentration/.test(d)};
}
function fmtRounds(r){
  if (r == null) return '—';
  if (r < 10) return r + (r === 1 ? ' round' : ' rounds');
  if (r < 600) { const mn = Math.floor(r / 10), rr = r % 10; return mn + ' min' + (rr ? ` ${rr} rd` : ''); }
  const h = Math.floor(r / 600), mn = Math.floor((r % 600) / 10); return h + ' hr' + (mn ? ` ${mn} min` : '');
}
