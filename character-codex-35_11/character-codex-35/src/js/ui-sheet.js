// ===================== UI HELPERS =====================
const TABS = [['sheet','Character'],['skills','Skills & Feats'],['spells','Spells'],['tracker','Combat & Effects'],['items','Items'],['notes','Notes'],['quests','Quests'],['players','Players'],['npcs','NPCs'],['locations','Locations'],['factions','Factions'],['maps','Maps'],['library','Custom Library'],['rules','Rules Lookup']];
function I(path, val, extra=''){ return `<input type="text" id="k-${esc(path)}" data-k="${esc(path)}" value="${esc(val)}" ${extra}>`; }
function N(path, val, extra=''){ return `<input type="number" id="k-${esc(path)}" data-k="${esc(path)}" data-num="1" value="${esc(val === 0 || val ? val : '')}" ${extra}>`; }
function S(path, val, opts, extra=''){ return `<select id="k-${esc(path)}" data-k="${esc(path)}" ${extra}>${opts.map(o => { const [v, l] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(v)}" ${String(v) === String(val) ? 'selected' : ''}>${esc(l)}</option>`; }).join('')}</select>`; }
function T(path, val, extra=''){ return `<textarea id="k-${esc(path)}" data-k="${esc(path)}" ${extra}>${esc(val)}</textarea>`; }
function O(key, cls='', fmt=''){ return `<span class="out ${cls}" data-o="${esc(key)}" data-fmt="${fmt}"></span>`; }
function OT(key, fmt=''){ return `<span data-o="${esc(key)}" data-fmt="${fmt}"></span>`; }
function F(label, inner, cls=''){ return `<div class="f ${cls}"><label>${label}</label>${inner}</div>`; }
function panel(title, body, tools='', cls=''){ return `<section class="panel ${cls}"><div class="ph"><h2>${title}</h2><div class="tools">${tools}</div></div>${body}</section>`; }

let D = {};
function updateOutputs(){
  const c = APP_cur(); if (!c) return; D = derive(c);
  for (const el of $$('[data-o]')){
    let v = D[el.dataset.o]; const f = el.dataset.fmt;
    if (v === undefined || v === null) v = '';
    if (f === 'sgn' && v !== '') v = sgn(v);
    el.textContent = v;
  }
  for (const el of $$('[data-roll]')) el.dataset.bonus = D[el.dataset.roll] ?? 0;
  afterOutputs(c, D);
}
function afterOutputs(c, D){
  const hb = $('#hpMeter'); if (hb){ hb.firstChild.style.width = (D.hpPct * 100) + '%'; hb.className = 'meter ' + (D.hpPct <= .25 ? 'bad' : D.hpPct <= .5 ? 'warn' : ''); }
  const hs = $('#hpState'); if (hs){ hs.textContent = D.hpState; hs.className = 'pill ' + ({Healthy:'good', Bloodied:'warn'}[D.hpState] || 'bad'); }
  const xb = $('#xpMeter'); if (xb) xb.firstChild.style.width = (D.xpPct * 100) + '%';
  for (const row of $$('[data-skrow]')){ const k = row.dataset.skrow; const dot = $('.cs-dot', row); if (dot) dot.classList.toggle('on', !!D['sk.' + k + '.cs']);
    const r = $('input[data-k$=".ranks"]', row); if (r){ const lim = D['sk.' + k + '.cs'] ? D.maxRanks : D.maxCross; r.max = lim; r.style.color = num(r.value) > lim ? 'var(--bad)' : ''; }
    row.style.opacity = D['sk.' + k + '.untrained'] ? .55 : 1; }
  const sp = $('#skPts'); if (sp){ sp.textContent = `${D.skillSpent} of ${D.skillPts} spent`; sp.className = 'pill ' + (D.skillSpent > D.skillPts ? 'bad' : D.skillSpent === D.skillPts ? 'good' : 'acc'); }
  const fp = $('#featPts'); if (fp){ const n = c.feats.length; fp.textContent = `${n} taken · ${D.featSlots} general${D.featBonus ? ' + ' + D.featBonus : ''}`; }
  for (const el of $$('[data-atk]')){ const a = c.attacks.find(x => x.id === el.dataset.atk); if (!a) continue; const r = atkCalc(c, a, D);
    $('.atkb', el).textContent = r.bonus; $('.atkd', el).textContent = r.dmg; $('.atkb', el).dataset.bonus = r.first; }
  const ld = $('#loadInfo'); if (ld) drawLoad(c, D);
  checkStackWarnings(c);
}
function wmatch(w, name){ const words = String(w || '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean); const n = String(name || '').toLowerCase(); return words.length > 0 && words.every(x => n.includes(x)); }
function atkCalc(c, a, D){
  const abm = a.ab === 'Dex' ? D.Dex : a.ab === 'None' ? 0 : D.Str; const kind = a.ab === 'Dex' ? 'ranged' : 'melee';
  const L = D.bonusList || [];
  const ra = resolve(L, b => b.t === 'atk' || b.t === 'atk.' + kind || (b.t === 'atkw' && wmatch(b.w, a.n)));
  const rd = resolve(L, b => b.t === 'dmg' || (b.t === 'dmgw' && wmatch(b.w, a.n)));
  if (D.res){ D.res['atk:' + a.id] = ra; D.res['dmg:' + a.id] = rd; }
  const twf = twfPenalty(c, a);
  if (twf && D.res){ D.res['atk:' + a.id] = {total: ra.total + twf, applied: [...ra.applied, {src:'Two-weapon fighting' + (a.eq === 'off' ? ' (off hand)' : ' (main hand)'), ty:'untyped', v:twf}], supp: ra.supp}; }
  const extra = D.sizeAC + num(a.enh) + num(a.misc) + ra.total + twf;
  const first = D.bab + abm + extra;
  const maxAtk = a.eq === 'off' && c.twf ? offHandAttacks(c) : 4;
  const it = []; for (let b = D.bab, i = 0; i < maxAtk && (i === 0 || b > 0); b -= 5, i++) it.push(sgn(b + abm + extra));
  const offHand = a.eq === 'off' || (a.eq === undefined && a.off); const twoH = a.eq === 'both' ? (weaponInfo(a).hands === 2 && !weaponInfo(a).ranged) : a.two;
  let sb = a.nostr ? 0 : D.Str; if (!a.nostr && twoH && sb > 0) sb = Math.floor(sb * 1.5); if (offHand && sb > 0) sb = Math.floor(sb / 2);
  const db = sb + num(a.enh) + num(a.dmgMisc) + rd.total;
  const dmg = (a.dmg || '—') + (a.dmg && db ? (db > 0 ? '+' + db : '–' + Math.abs(db)) : '') + (a.xdmg ? ' ' + a.xdmg : '');
  return {first, bonus: it.join('/'), dmg};
}

// ===================== RENDER ROOT =====================
function renderCharBar(){
  const sel = $('#charSel'); const list = charList();
  sel.innerHTML = list.map(c => `<option value="${c.id}" ${c.id === APP.curId ? 'selected' : ''}>${esc(c.name || 'Unnamed')} — ${esc(c.classes.map(k => k.n + ' ' + k.lvl).join(' / '))}</option>`).join('') || '<option>No characters</option>';
  $('#rNum').textContent = APP_cur() ? APP_cur().combat.round : 0;
  $('#delWrap').innerHTML = '<button class="btn ghost" id="delChar">Delete</button>';
}
function renderTabs(){
  const c = APP_cur(); const effN = c ? c.effects.filter(e => !e.expired).length : 0;
  $('#tabs').innerHTML = TABS.map(([k, l]) => `<button role="tab" aria-selected="${APP.tab === k}" data-tab="${k}">${l}${k === 'tracker' && effN ? `<span class="badge">${effN}</span>` : ''}</button>`).join('');
}
function renderAll(){
  renderCharBar(); renderTabs();
  const c = APP_cur(); const m = $('#main');
  if (!c){ m.innerHTML = `<div class="panel"><div class="empty"><b>No characters yet.</b><br>Choose <b>New character</b> above to start a sheet, or <b>Import</b> one you exported earlier.</div></div>`; return; }
  const R = {sheet:renderSheet, skills:renderSkills, spells:renderSpells, tracker:renderTracker, items:renderItems, notes:renderNotes, quests:renderQuests, players:renderPlayers, npcs:renderNpcs, locations:renderLocations, factions:renderFactions, maps:renderMaps, library:renderLibrary, rules:renderRules}[APP.tab] || renderSheet;
  D = derive(c); m.innerHTML = R(c); updateOutputs();
  document.documentElement.style.setProperty('--toph', ($('.top').offsetHeight || 0) + 'px');
  if (APP.tab === 'rules' && (APP.rq || '').trim()) highlightReader();
  try { localStorage.setItem('codex35-tab', APP.tab); } catch {}
}

// ===================== SHEET TAB =====================
function renderSheet(c){
  const classOpts = SRD.classes.map(k => k.n);
  const classes = c.classes.map((k, i) => `<div class="row" style="flex-wrap:nowrap">
      <div style="flex:1">${S('classes.' + i + '.n', k.n, classOpts, 'data-rerender="1"')}</div>
      <div style="width:70px">${N('classes.' + i + '.lvl', k.lvl, 'min="1" max="20" data-rerender="1" aria-label="Level"')}</div>
      ${refA('class', k.n, 'ⓘ')}
      ${c.classes.length > 1 ? `<button class="btn ghost sm" data-act="delClass" data-i="${i}" aria-label="Remove class">✕</button>` : ''}</div>`).join('');
  const raceOpts = SRD.races.map(r => r.n);
  const ident = panel('Character', `<div class="pb ident-grid">${portraitBox(c)}<div class="grid" style="gap:12px;min-width:0">
    <div class="fields">
      ${F('Character name', I('name', c.name, 'data-rerender-bar="1"'), 'wide')}
      ${F('Player', I('player', c.player))}
      ${F('Campaign', I('campaign', c.campaign))}
      ${F('Race ' + refA('race', c.race, 'ⓘ'), S('race', c.race, raceOpts, 'data-rerender="1"'))}
      ${F('Alignment', S('align', c.align, ALIGN))}
      ${F('Deity', I('deity', c.deity))}
      ${F('Size', S('size', c.size, [['', 'Auto (' + ((raceData(c.race) || {}).size || 'Medium') + ')'], ...Object.keys(SIZES)], 'data-rerender="1"'))}
    </div>
    <div class="grid g2" style="gap:12px">
      <div><div class="cap" style="margin-bottom:4px">Class &amp; level · character level ${OT('lvl')}</div><div class="grid" style="gap:6px">${classes}</div>
        <button class="btn sm" style="margin-top:6px" data-act="addClass">Add a class (multiclass)</button></div>
      <div><div class="cap">Experience</div><div class="row"><div style="flex:1;min-width:120px">${N('xp', c.xp, 'step="100" style="text-align:left"')}</div><span class="hint">next level at ${OT('xpNext')}</span></div>
        <div class="meter acc" id="xpMeter" style="margin-top:6px"><i></i></div></div>
    </div>
    <div class="fields">${['age','gender','height','weight','eyes','hair','skin'].map(k => F(k[0].toUpperCase() + k.slice(1), I(k, c[k]))).join('')}</div>
  </div></div>`);

  const abil = panel('Ability scores', `<div class="tbl-wrap"><table class="st">
    <thead><tr><th>Ability</th><th>Base</th><th>Racial</th><th title="Other untyped adjustments you type in">Misc</th><th title="Typed bonuses from items, spells and conditions (hover for details)">Bonuses</th><th>Score</th><th>Mod</th><th title="Temporary adjustment (rage, bull's strength, ability damage…)">Temp adj</th><th>Temp mod</th></tr></thead>
    <tbody>${ABIL.map(a => `<tr><td><div class="ab-name">${refA('gloss', a, a.toUpperCase(), 'tag')}<small>${ABIL_FULL[a]}</small></div></td>
      <td>${N('abil.' + a + '.base', c.abil[a].base, 'aria-label="' + a + ' base"')}</td>
      <td><span class="calc-line" data-o="ab.${a}.racialTxt"></span></td>
      <td>${N('abil.' + a + '.enh', c.abil[a].enh)}</td>
      <td><span class="calc-line bd" data-ref="bd" data-name="ab.${a}" data-o="ab.${a}.bonus"></span></td>
      <td><span class="out sm" data-ref="bd" data-name="ab.${a}" data-o="ab.${a}.total"></span></td>
      <td><span class="out roll" data-roll="ab.${a}.mod" data-label="${ABIL_FULL[a]} check" data-o="ab.${a}.mod" data-fmt="sgn" title="Click to roll"></span></td>
      <td>${N('abil.' + a + '.temp', c.abil[a].temp)}</td>
      <td>${O('ab.' + a + '.tmod', 'sm temp', 'sgn')}</td></tr>`).join('')}</tbody></table></div>
    <p class="hint pb" style="padding-top:0">Racial adjustments come from your race. Bonuses come from worn items and active spells or conditions, following the stacking rules. Temp adjustments are for anything else temporary.</p>`);

  const combat = panel('Combat', `<div class="pb grid" style="gap:12px">
    <div class="grid g2" style="gap:10px;grid-template-columns:repeat(auto-fit,minmax(200px,1fr))">
      <div><div class="row" style="justify-content:space-between">${refA('gloss', 'HP', 'HP', 'tag')}<span class="pill" id="hpState"></span></div>
        <div class="fields" style="grid-template-columns:repeat(4,1fr);margin-top:6px">${F('Rolled max', N('hp.max', c.hp.max))}${F('Current', N('hp.cur', c.hp.cur))}${F('NL dmg', N('hp.nl', c.hp.nl))}${F('Temp', N('hp.temp', c.hp.temp))}</div>
        <div class="hint" style="margin-top:4px">Max hit points <b data-o="hpMax" data-ref="bd" data-name="hp"></b> <span data-o="hpBonusTxt"></span></div>
        <div class="meter" id="hpMeter" style="margin-top:6px"><i></i></div>
        <div class="row" style="margin-top:6px"><input type="number" id="hpDelta" placeholder="Amount" style="width:90px"><button class="btn sm" data-act="dmg">Damage</button><button class="btn sm" data-act="heal">Heal</button></div></div>
      <div class="grid" style="gap:8px">
        <div class="statline">${refA('gloss', 'Init', 'Initiative', 'tag')}<span class="out roll" data-roll="init" data-label="Initiative" data-o="init" data-fmt="sgn"></span><span class="hint" data-ref="bd" data-name="init">Dex ${OT('Dex', 'sgn')}, bonus ${OT('initBon', 'sgn')}, misc →</span>${N('initMisc', c.initMisc, 'aria-label="Initiative misc"')}</div>
        <div class="statline">${refA('gloss', 'Speed', 'Speed', 'tag')}<span class="out" data-o="speed"></span><span class="hint" data-ref="bd" data-name="speed">ft. · bonus ${OT('speedBon', 'sgn')}, misc →</span>${N('speedMisc', c.speedMisc, 'step="5" aria-label="Speed misc"')}</div>
        <div class="statline">${refA('gloss', 'Grapple', 'Grapple', 'tag')}<span class="out roll" data-roll="grapple" data-label="Grapple" data-o="grapple" data-fmt="sgn"></span><span class="hint">misc →</span>${N('grMisc', c.grMisc, 'aria-label="Grapple misc"')}</div>
        <div class="statline">${refA('gloss', 'BAB', 'Base atk', 'tag')}<span class="out" style="min-width:0;font-size:15px" data-o="babIter"></span><span class="hint">adjust →</span>${N('babMisc', c.babMisc, 'aria-label="BAB adjustment"')}</div>
      </div>
    </div>
    <div class="tbl-wrap"><table class="st"><thead><tr><th></th><th>Total</th><th>Armor</th><th>Shield</th><th>Natural</th><th>Dex</th><th>Size</th><th title="Deflection, dodge, insight, luck and other AC bonuses">Other</th></tr></thead>
      <tbody><tr><td>${refA('gloss', 'AC', 'AC', 'tag')}</td><td><span class="out" data-o="ac" data-ref="bd" data-name="ac"></span></td>
        <td><span data-o="armorT" data-ref="bd" data-name="ac.armor"></span></td><td><span data-o="shieldT" data-ref="bd" data-name="ac.shield"></span></td><td><span data-o="natT" data-ref="bd" data-name="ac.natural"></span></td>
        <td>${OT('dexAC', 'sgn')}</td><td>${OT('sizeAC', 'sgn')}</td><td><span data-o="acOther" data-ref="bd" data-name="ac.other"></span></td></tr></tbody></table></div>
    <div class="row hint" style="gap:6px"><span class="cap">Your own AC bonuses</span>
      <label class="mini">Natural ${N('ac.nat', c.ac.nat, 'aria-label="Natural armor"')}</label><label class="mini">Deflection ${N('ac.defl', c.ac.defl, 'aria-label="Deflection"')}</label>
      <label class="mini">Dodge ${N('ac.dodge', c.ac.dodge, 'aria-label="Dodge"')}</label><label class="mini">Misc ${N('ac.misc', c.ac.misc, 'aria-label="Misc AC"')}</label></div>
    ${D.noDex ? '<p class="hint" style="margin:0;color:var(--bad)">A condition is denying your Dex bonus (and dodge bonuses) to AC.</p>' : ''}
    <div class="row" style="gap:10px">${refA('gloss', 'Touch', 'Touch', 'tag')}${O('touch')}${refA('gloss', 'FF', 'Flat-footed', 'tag')}${O('ff')}</div>
    <div class="row" style="gap:8px;flex-wrap:nowrap">${refA('gloss', 'DR', 'DR', 'tag')}<div style="flex:1">${I('dr', c.dr, 'placeholder="e.g. 5/magic"')}</div>${refA('gloss', 'SR', 'SR', 'tag')}<div style="width:64px">${I('sr', c.sr)}</div></div>
    <p class="hint" id="spdNote" style="margin:0">${D.speedNote ? esc(D.speedNote) : ''}</p>
  </div>`);

  const saves = panel('Saving throws', `<div class="tbl-wrap"><table class="st"><thead><tr><th>Save</th><th>Total</th><th>Base</th><th>Ability</th><th title="Typed bonuses from items, spells, feats and conditions">Bonuses</th><th>Misc</th><th>Temp</th></tr></thead><tbody>
    ${['Fort','Ref','Will'].map(s => `<tr><td>${refA('gloss', s, {Fort:'Fortitude', Ref:'Reflex', Will:'Will'}[s], 'tag')}</td>
      <td><span class="out roll" data-roll="sv.${s}" data-label="${s} save" data-o="sv.${s}" data-fmt="sgn" data-ref="bd" data-name="sv.${s}"></span></td><td>${OT('sv.' + s + '.base', 'sgn')}</td><td>${OT('sv.' + s + '.ab', 'sgn')}</td>
      <td><span class="calc-line bd" data-ref="bd" data-name="sv.${s}" data-o="sv.${s}.bon"></span></td><td>${N('saves.' + s + '.misc', c.saves[s].misc)}</td><td>${N('saves.' + s + '.temp', c.saves[s].temp)}</td></tr>`).join('')}
    </tbody></table></div><p class="hint pb" style="padding-top:0;margin:0">Click any boxed total to roll a d20 with it.</p>`);

  const armor = renderGearPanel(c);

  const atks = c.attacks.map(a => { const wi = weaponInfo(a); return `<div class="atk ${a.eq ? '' : 'stowed'}" data-atk="${a.id}">
      <div class="nm">${a.eq ? `<span class="pill ${a.eq === 'off' ? 'warn' : 'good'}" title="Currently equipped">${{main:'Main hand', off:'Off hand', both:'Both hands'}[a.eq]}</span>` : '<span class="pill">Not equipped</span>'}
        <div style="flex:1;min-width:0">${I('attacks.' + c.attacks.indexOf(a) + '.n', a.n, 'aria-label="Weapon name"')}</div>${getRef('item', a.n) ? refA('item', a.n, 'ⓘ') : ''}
        ${a.eq ? `<button class="btn sm" data-act="putAway" data-id="${a.id}" title="Sheathe or stow it">Put away</button>` : `<button class="btn sm pri" data-act="wieldAtk" data-id="${a.id}">Wield</button>`}</div>
      ${F('Attack', `<span class="out sm roll atkb" data-label="${esc(a.n)} attack" data-ref="bd" data-name="atk:${a.id}"></span>`)}
      ${F('Uses', S('attacks.' + c.attacks.indexOf(a) + '.ab', a.ab, [['Str', 'Str'], ['Dex', 'Dex'], ['None', '—']]))}
      ${F('Damage', `<span class="out sm atkd" style="min-width:70px" data-ref="bd" data-name="dmg:${a.id}"></span>`)}
      ${F('Base dmg', I('attacks.' + c.attacks.indexOf(a) + '.dmg', a.dmg))}
      ${F('Critical', I('attacks.' + c.attacks.indexOf(a) + '.crit', a.crit))}
      ${F('Enh / misc', `<div class="row" style="flex-wrap:nowrap;gap:3px">${N('attacks.' + c.attacks.indexOf(a) + '.enh', a.enh, 'title="Enhancement (attack and damage)"')}${N('attacks.' + c.attacks.indexOf(a) + '.misc', a.misc, 'title="Misc attack bonus"')}</div>`)}
      ${F('Range · type · notes', I('attacks.' + c.attacks.indexOf(a) + '.note', a.note || [a.rng, a.ty].filter(x => x && x !== '—').join(' · ')))}
      <div class="f"><label>&nbsp;</label><button class="btn ghost sm" data-act="delAtk" data-id="${a.id}" aria-label="Remove attack">✕</button></div>
      <div class="row hint" style="grid-column:1/-1;gap:12px">
        <span>${wi.unknown ? `Hands ${S('attacks.' + c.attacks.indexOf(a) + '.hands', a.hands ?? '', [['', 'auto (1)'], ['0', '0 (natural)'], ['1', '1'], ['2', '2']], 'data-rerender="1" style="width:auto;padding:1px 4px"')}` : `<span class="pill">${wi.hands === 0 ? 'no hands' : wi.hands === 2 ? 'two-handed' : wi.light ? 'light · one hand' : 'one hand'}${wi.ranged ? ' · ranged' : ''}</span>`}</span>
        ${wi.versatile ? `<label><input type="checkbox" data-k="attacks.${c.attacks.indexOf(a)}.two" data-rerender="1" ${a.two ? 'checked' : ''}> Use two-handed (1½ Str)</label>` : ''}
        <label><input type="checkbox" data-k="attacks.${c.attacks.indexOf(a)}.nostr" ${a.nostr ? 'checked' : ''}> No Str to damage</label>
        <button class="btn sm" data-act="rollDmg" data-id="${a.id}">Roll damage</button></div>
      ${ammoRow(c, a)}
    </div>`; }).join('');
  const attacks = panel('Attacks', (c.attacks.length ? handsSummary(c) : '') + (atks || `<div class="empty">No attacks yet. <b>Add weapon</b> picks from the SRD weapon table (damage, critical and range fill in), or add a blank one for spells, natural attacks or homebrew.</div>`),
    `<button class="btn sm pri" data-act="addAtk">Add weapon</button><button class="btn sm" data-act="addAtkBlank">Add blank</button>`);

  const abilsList = c.abilities.map((f, i) => `<div class="li" style="grid-template-columns:minmax(0,1fr) minmax(0,1.2fr) 30px">
     <div>${f.ref ? refA(f.ref.startsWith('custom:') ? 'custom' : 'feature', f.ref.replace(/^custom:/, ''), f.n, f.ref.startsWith('custom:') ? 'custom' : '') : `<b>${esc(f.n)}</b>`}<div class="hint">${esc(f.src || '')}</div></div>
     <div>${I('abilities.' + i + '.note', f.note, 'placeholder="Uses / notes (e.g. 3/day, +2d6)"')}</div>
     <button class="btn ghost sm" data-act="delAbil" data-i="${i}" aria-label="Remove">✕</button></div>`).join('');
  const race = raceData(c.race);
  const special = panel('Special abilities &amp; class features', `<div class="list">${abilsList || '<div class="empty">Add class features (rage, sneak attack, turn undead…) from your classes, or your own.</div>'}${renderItemAbilities(c)}</div>
     ${race ? `<div class="pb" style="border-top:1px solid var(--rule-2)"><div class="cap">Racial traits — ${refA('race', race.n)}</div><p class="hint" style="margin:4px 0 0">Hover or tap the race name for the full list of ${esc(race.n.toLowerCase())} traits.</p></div>` : ''}`,
     `<button class="btn sm pri" data-act="addFeature">Add feature</button>`);
  const bonusP = renderBonusPanel(c);
  const langs = panel('Languages', `<div class="pb">${T('languages', c.languages, 'style="min-height:60px"')}</div>`);

  return `<div class="grid" style="gap:14px">${ident}<div class="grid g2">${abil}${combat}</div><div class="grid g2">${saves}${langs}</div>${armor}${attacks}${bonusP}${special}</div>`;
}

// ===================== SKILLS & FEATS TAB =====================
function renderSkills(c){
  const rows = [];
  for (const sk of SRD.skills){
    if (SUBSKILLS[sk.n]){
      c.subskills.filter(s => s.base === sk.n).forEach(s => { const i = c.subskills.indexOf(s);
        rows.push(skillTr(s.id, `${sk.n} (${s.sub})`, sk, 'subskills.' + i, s, `<button class="btn ghost sm" data-act="delSub" data-id="${s.id}" aria-label="Remove">✕</button>`)); });
      rows.push(`<tr><td colspan="10"><button class="btn sm" data-act="addSub" data-base="${sk.n}">+ ${sk.n}…</button> <span class="hint">${refA('skill', sk.n, 'about ' + sk.n)}</span></td></tr>`);
      continue;
    }
    rows.push(skillTr(sk.n, sk.n, sk, 'skills.' + sk.n, c.skills[sk.n] || {}, ''));
  }
  const skills = panel('Skills', `<div class="pb row" style="justify-content:space-between;padding-bottom:4px"><span class="hint">Max ranks ${OT('maxRanks')} (class) / ${OT('maxCross')} (cross-class) · ${refA('gloss', 'Skillpts', 'how points work')}</span><span class="pill" id="skPts"></span></div>
    <div class="tbl-wrap"><table class="st"><thead><tr><th>Skill</th><th title="Class skill">CS</th><th>Key</th><th>Total</th><th>Ability</th><th>Ranks</th><th>Misc</th><th title="Typed bonuses (items, feats, race, synergy, spells)">Bonus</th><th>Armor</th><th></th></tr></thead><tbody>${rows.join('')}</tbody></table></div>
    <p class="hint pb" style="margin:0">Filled square = class skill for one of your classes. Faded rows are trained-only skills with no ranks. Click a total to roll.</p>`);
  const feats = panel('Feats', `<div class="pb" style="padding-bottom:0"><span class="pill acc" id="featPts"></span></div><div class="list">${c.feats.map((f, i) => `<div class="li" style="grid-template-columns:minmax(0,1fr) minmax(0,1.2fr) 30px">
      <div>${refA(f.custom ? 'custom' : 'feat', f.custom || f.n, f.n, f.custom ? 'custom' : '')}<div class="hint">${esc((IDX.feats.get(f.n.toLowerCase()) || {}).t || (f.custom ? 'Custom' : ''))}</div></div>
      <div>${I('feats.' + i + '.note', f.note, 'placeholder="' + (FEAT_CHOICE[normKey(f.n)] === 'weapon' ? 'Which weapon? (e.g. longsword)' : FEAT_CHOICE[normKey(f.n)] === 'skill' ? 'Which skill? (e.g. Hide)' : 'Notes') + '"')}${featHint(c, f)}</div>
      <button class="btn ghost sm" data-act="delFeat" data-i="${i}" aria-label="Remove feat">✕</button></div>`).join('') || '<div class="empty">No feats yet. <b>Add feat</b> lets you browse every SRD feat with its prerequisites and benefit.</div>'}</div>`,
    `<button class="btn sm pri" data-act="addFeat">Add feat</button>`);
  return `<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,520px),1fr));align-items:start">${skills}${feats}</div>`;
}
function skillTr(key, label, sk, path, x, extra){
  return `<tr data-skrow="${esc(key)}"><td>${refA('skill', label)}${sk.tr ? ' <span class="hint" title="Trained only">•</span>' : ''}</td><td><span class="cs-dot"></span></td><td class="hint">${sk.ab === 'None' ? '—' : sk.ab}</td>
    <td><span class="out sm roll" data-roll="sk.${esc(key)}.total" data-label="${esc(label)}" data-o="sk.${esc(key)}.total" data-fmt="sgn" data-ref="bd" data-name="sk.${esc(key)}"></span></td><td>${OT('sk.' + key + '.ab', 'sgn')}</td>
    <td>${N(path + '.ranks', x.ranks, 'min="0" step="0.5" aria-label="' + esc(label) + ' ranks"')}</td><td>${N(path + '.misc', x.misc, 'aria-label="' + esc(label) + ' misc"')}</td><td class="hint bd" data-ref="bd" data-name="sk.${esc(key)}">${OT('sk.' + key + '.bon')}</td><td class="hint">${OT('sk.' + key + '.acp')}</td><td>${extra}</td></tr>`;
}

function featHint(c, f){
  const k = normKey(f.n); const ch = FEAT_CHOICE[k];
  if (ch && !String(f.note || '').trim()) return `<div class="hint" style="color:var(--warn);margin-top:2px">Type the ${ch} above and the bonus applies automatically.</div>`;
  if (FEAT_BONUS[k]){ const bl = FEAT_BONUS[k](String(f.note || '').trim()); return `<div class="hint" style="margin-top:2px">Auto: ${bl.map(b => esc(bonusText(b))).join(', ')}</div>`; }
  if (FEAT_NOTES[k]) return `<div class="hint" style="margin-top:2px">${esc(FEAT_NOTES[k])}</div>`;
  return '';
}
function bonusText(b){ const t = b.t === 'atkw' ? `attacks with ${b.w}` : b.t === 'dmgw' ? `damage with ${b.w}` : b.t.startsWith('skill.ab:') ? `${b.t.slice(9)}-based skills` : targetLabel(b.t).replace(/^Skill: /, '');
  return `${sgn(num(b.v))} ${b.ty === 'untyped' ? '' : b.ty + ' '}${b.t === 'speed' ? 'ft. speed' : t.replace(/^(All|Melee|Ranged|Weapon|Max)\b/, m => m.toLowerCase())}`.replace(/\s+/g, ' '); }
// sources and the stacking status of each of their bonuses
function bonusStatus(D){
  const st = new Map(); // bonus object -> {by}
  for (const k in D.res || {}){ const r = D.res[k]; if (!r || !r.supp) continue; for (const x of r.supp) if (!st.has(x.b)) st.set(x.b, x); }
  return st;
}
function renderBonusPanel(c){
  const L = (D.bonusList || []).filter(b => b.kind !== 'sheet' && b.kind !== 'armor');
  if (!L.length) return panel('Bonuses in effect', '<div class="empty">No typed bonuses yet. Worn magic items, feats like Iron Will, your race, skill synergies and active spells or conditions show up here, with the stacking rules applied.</div>');
  const st = bonusStatus(D); const groups = new Map();
  for (const b of L){ const g = groups.get(b.src) || []; g.push(b); groups.set(b.src, g); }
  const rows = [...groups].map(([src, bl]) => { const kind = bl[0].kind;
    const chips = bl.map(b => { const x = st.get(b); return `<span class="bchip ${x ? 'off' : num(b.v) < 0 ? 'pen' : ''}" title="${x ? esc(`Doesn't stack: ${x.by.src} gives ${sgn(num(x.by.v))} ${x.by.ty}`) : 'Applied'}">${esc(bonusText(b))}${x ? ' <b>✕</b>' : ''}</span>`; }).join('');
    const anyOff = bl.some(b => st.has(b));
    return `<div class="li" style="grid-template-columns:minmax(0,220px) minmax(0,1fr)"><div><b>${esc(src)}</b><div class="hint">${esc({item:'Worn item', feat:'Feat', effect:'Spell / condition', race:'Race', class:'Class feature', synergy:'Skill synergy'}[kind] || '')}</div>${anyOff ? '<span class="pill warn">doesn’t fully stack</span>' : ''}</div><div class="bchips">${chips}</div></div>`; }).join('');
  return panel('Bonuses in effect', `<div class="list">${rows}</div><p class="hint pb" style="margin:0">Crossed-out bonuses are overlapped by a better bonus of the same type, so they don't count. Hover any total on the sheet to see exactly what adds up. ${'<a href="#" class="ref-rule" data-rule="Combining Magical Effects">Stacking rules</a>'}</p>`);
}

// ===================== PORTRAIT =====================
function portraitBox(c){
  return `<div class="portrait-col"><div class="portrait ${c.portrait ? 'has' : ''}" id="portraitDrop" title="${c.portrait ? 'Click to enlarge' : 'Add a portrait'}">
      ${c.portrait ? `<img src="${IMG.src(c.portrait)}" alt="Portrait of ${esc(c.name)}" id="portraitImg">` : `<label for="portraitFile" class="portrait-empty"><span class="pe-icon" aria-hidden="true"></span><b>Add portrait</b><span class="hint">Choose an image, drag one here, or paste</span></label>`}
    </div><input type="file" id="portraitFile" accept="image/*" hidden>
    ${c.portrait ? `<div class="row" style="justify-content:center;gap:4px"><label for="portraitFile" class="btn sm">Change</label><button class="btn ghost sm" data-act="delPortrait">Remove</button></div>` : ''}</div>`;
}
async function setPortraitFromFile(file){
  const c = APP_cur(); if (!c || !file || !/^image\//.test(file.type)){ if (file) toast('That file isn\'t an image. Try a JPG, PNG or WebP.', 'warn'); return; }
  try {
    const url = URL.createObjectURL(file); const img = new Image(); img.src = url; await img.decode();
    const max = 480; const sc = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const cv = document.createElement('canvas'); cv.width = Math.round(img.naturalWidth * sc); cv.height = Math.round(img.naturalHeight * sc);
    const ctx = cv.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height); ctx.drawImage(img, 0, 0, cv.width, cv.height); URL.revokeObjectURL(url);
    let q = .85, data = cv.toDataURL('image/jpeg', q); while (data.length > 160000 && q > .4){ q -= .1; data = cv.toDataURL('image/jpeg', q); }
    IMG.drop(c.portrait); c.portrait = IMG.put(data); markDirty(); renderAll(); toast('Portrait saved.');
  } catch { toast('That image couldn\'t be read. Try saving it as a JPG or PNG first.', 'warn'); }
}
document.addEventListener('change', e => { if (e.target.id === 'portraitFile'){ const f = e.target.files[0]; e.target.value = ''; setPortraitFromFile(f); } });
document.addEventListener('dragover', e => { const d = e.target.closest && e.target.closest('#portraitDrop'); if (d){ e.preventDefault(); d.classList.add('drag'); } });
document.addEventListener('dragleave', e => { const d = e.target.closest && e.target.closest('#portraitDrop'); if (d) d.classList.remove('drag'); });
document.addEventListener('drop', e => { const d = e.target.closest && e.target.closest('#portraitDrop'); if (!d) return; e.preventDefault(); d.classList.remove('drag'); const f = [...(e.dataTransfer.files || [])].find(x => /^image\//.test(x.type)); if (f) setPortraitFromFile(f); });
document.addEventListener('paste', e => { if (APP.tab !== 'sheet' || e.target.closest('input,textarea')) return; const f = [...(e.clipboardData && e.clipboardData.files || [])].find(x => /^image\//.test(x.type)); if (f){ e.preventDefault(); setPortraitFromFile(f); } });
document.addEventListener('click', e => { if (e.target.id !== 'portraitImg') return; const c = APP_cur();
  const bg = openModal(`<div class="modal narrow" role="dialog" aria-label="Portrait"><div class="mh"><h3>${esc(c.name)}</h3><button class="btn ghost" data-close>Close</button></div><div class="mprev" style="text-align:center"><img src="${IMG.src(c.portrait)}" alt="Portrait of ${esc(c.name)}" style="max-height:70vh"></div></div>`); });
