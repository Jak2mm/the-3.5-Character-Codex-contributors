// ===================== UI HELPERS =====================
const TABS = [['sheet','Character'],['skills','Skills & Feats'],['spells','Spells'],['tracker','Combat & Effects'],['items','Items'],['notes','Notes'],['quests','Quests'],['library','Custom Library'],['rules','Rules Lookup']];
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
}
function atkCalc(c, a, D){
  const abm = a.ab === 'Dex' ? D.Dex : a.ab === 'None' ? 0 : D.Str;
  const first = D.bab + abm + D.sizeAC + num(a.enh) + num(a.misc);
  const it = []; for (let b = D.bab, i = 0; i < 4 && (i === 0 || b > 0); b -= 5, i++) it.push(sgn(b + abm + D.sizeAC + num(a.enh) + num(a.misc)));
  let sb = a.nostr ? 0 : D.Str; if (!a.nostr && a.two && sb > 0) sb = Math.floor(sb * 1.5); if (a.off && sb > 0) sb = Math.floor(sb / 2);
  const db = sb + num(a.enh) + num(a.dmgMisc);
  const dmg = (a.dmg || '—') + (a.dmg && db ? (db > 0 ? '+' + db : '–' + Math.abs(db)) : '');
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
  const R = {sheet:renderSheet, skills:renderSkills, spells:renderSpells, tracker:renderTracker, items:renderItems, notes:renderNotes, quests:renderQuests, library:renderLibrary, rules:renderRules}[APP.tab] || renderSheet;
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
  const ident = panel('Character', `<div class="pb grid" style="gap:12px">
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
      <div><div class="cap">Experience</div><div class="row" style="flex-wrap:nowrap">${N('xp', c.xp, 'step="100" style="text-align:left"')}<span class="hint" style="white-space:nowrap">next level at ${OT('xpNext')}</span></div>
        <div class="meter acc" id="xpMeter" style="margin-top:6px"><i></i></div></div>
    </div>
    <div class="fields">${['age','gender','height','weight','eyes','hair','skin'].map(k => F(k[0].toUpperCase() + k.slice(1), I(k, c[k]))).join('')}</div>
  </div>`);

  const abil = panel('Ability scores', `<div class="tbl-wrap"><table class="st">
    <thead><tr><th>Ability</th><th>Base</th><th>Racial</th><th>Enh / misc</th><th>Score</th><th>Mod</th><th title="Temporary adjustment (rage, bull's strength, ability damage…)">Temp adj</th><th>Temp mod</th></tr></thead>
    <tbody>${ABIL.map(a => `<tr><td><div class="ab-name">${refA('gloss', a, a.toUpperCase(), 'tag')}<small>${ABIL_FULL[a]}</small></div></td>
      <td>${N('abil.' + a + '.base', c.abil[a].base, 'aria-label="' + a + ' base"')}</td>
      <td><span class="calc-line" data-o="ab.${a}.racialTxt"></span></td>
      <td>${N('abil.' + a + '.enh', c.abil[a].enh)}</td>
      <td>${O('ab.' + a + '.total', 'sm')}</td>
      <td><span class="out roll" data-roll="ab.${a}.mod" data-label="${ABIL_FULL[a]} check" data-o="ab.${a}.mod" data-fmt="sgn" title="Click to roll"></span></td>
      <td>${N('abil.' + a + '.temp', c.abil[a].temp)}</td>
      <td>${O('ab.' + a + '.tmod', 'sm temp', 'sgn')}</td></tr>`).join('')}</tbody></table></div>
    <p class="hint pb" style="padding-top:0">Racial adjustments come from your race. Temp adjustments override the modifier everywhere until you clear them.</p>`);

  const combat = panel('Combat', `<div class="pb grid" style="gap:12px">
    <div class="grid g2" style="gap:10px;grid-template-columns:repeat(auto-fit,minmax(200px,1fr))">
      <div><div class="row" style="justify-content:space-between">${refA('gloss', 'HP', 'HP', 'tag')}<span class="pill" id="hpState"></span></div>
        <div class="fields" style="grid-template-columns:repeat(4,1fr);margin-top:6px">${F('Max', N('hp.max', c.hp.max))}${F('Current', N('hp.cur', c.hp.cur))}${F('NL dmg', N('hp.nl', c.hp.nl))}${F('Temp', N('hp.temp', c.hp.temp))}</div>
        <div class="meter" id="hpMeter" style="margin-top:6px"><i></i></div>
        <div class="row" style="margin-top:6px"><input type="number" id="hpDelta" placeholder="Amount" style="width:90px"><button class="btn sm" data-act="dmg">Damage</button><button class="btn sm" data-act="heal">Heal</button></div></div>
      <div class="grid" style="gap:8px">
        <div class="statline">${refA('gloss', 'Init', 'Initiative', 'tag')}<span class="out roll" data-roll="init" data-label="Initiative" data-o="init" data-fmt="sgn"></span><span class="hint">Dex ${OT('Dex', 'sgn')}, misc →</span>${N('initMisc', c.initMisc, 'aria-label="Initiative misc"')}</div>
        <div class="statline">${refA('gloss', 'Speed', 'Speed', 'tag')}<span class="out" data-o="speed"></span><span class="hint">ft. misc →</span>${N('speedMisc', c.speedMisc, 'step="5" aria-label="Speed misc"')}</div>
        <div class="statline">${refA('gloss', 'Grapple', 'Grapple', 'tag')}<span class="out roll" data-roll="grapple" data-label="Grapple" data-o="grapple" data-fmt="sgn"></span><span class="hint">misc →</span>${N('grMisc', c.grMisc, 'aria-label="Grapple misc"')}</div>
        <div class="statline">${refA('gloss', 'BAB', 'Base atk', 'tag')}<span class="out" style="min-width:0;font-size:15px" data-o="babIter"></span><span class="hint">adjust →</span>${N('babMisc', c.babMisc, 'aria-label="BAB adjustment"')}</div>
      </div>
    </div>
    <div class="tbl-wrap"><table class="st"><thead><tr><th></th><th>Total</th><th>Armor</th><th>Shield</th><th>Dex</th><th>Size</th><th>Natural</th><th>Deflect</th><th>Dodge</th><th>Misc</th></tr></thead>
      <tbody><tr><td>${refA('gloss', 'AC', 'AC', 'tag')}</td><td>${O('ac')}</td><td>${OT('armorT')}</td><td>${OT('shieldT')}</td><td>${OT('dexAC', 'sgn')}</td><td>${OT('sizeAC', 'sgn')}</td>
        <td>${N('ac.nat', c.ac.nat)}</td><td>${N('ac.defl', c.ac.defl)}</td><td>${N('ac.dodge', c.ac.dodge)}</td><td>${N('ac.misc', c.ac.misc)}</td></tr></tbody></table></div>
    <div class="row" style="gap:10px">${refA('gloss', 'Touch', 'Touch', 'tag')}${O('touch')}${refA('gloss', 'FF', 'Flat-footed', 'tag')}${O('ff')}</div>
    <div class="row" style="gap:8px;flex-wrap:nowrap">${refA('gloss', 'DR', 'DR', 'tag')}<div style="flex:1">${I('dr', c.dr, 'placeholder="e.g. 5/magic"')}</div>${refA('gloss', 'SR', 'SR', 'tag')}<div style="width:64px">${I('sr', c.sr)}</div></div>
    <p class="hint" id="spdNote" style="margin:0">${D.speedNote ? esc(D.speedNote) : ''}</p>
  </div>`);

  const saves = panel('Saving throws', `<div class="tbl-wrap"><table class="st"><thead><tr><th>Save</th><th>Total</th><th>Base</th><th>Ability</th><th>Magic</th><th>Misc</th><th>Temp</th></tr></thead><tbody>
    ${['Fort','Ref','Will'].map(s => `<tr><td>${refA('gloss', s, {Fort:'Fortitude', Ref:'Reflex', Will:'Will'}[s], 'tag')}</td>
      <td><span class="out roll" data-roll="sv.${s}" data-label="${s} save" data-o="sv.${s}" data-fmt="sgn" title="Click to roll"></span></td><td>${OT('sv.' + s + '.base', 'sgn')}</td><td>${OT('sv.' + s + '.ab', 'sgn')}</td>
      <td>${N('saves.' + s + '.magic', c.saves[s].magic)}</td><td>${N('saves.' + s + '.misc', c.saves[s].misc)}</td><td>${N('saves.' + s + '.temp', c.saves[s].temp)}</td></tr>`).join('')}
    </tbody></table></div><p class="hint pb" style="padding-top:0;margin:0">Click any boxed total to roll a d20 with it.</p>`);

  const armor = panel('Armor &amp; shield', `<div class="pb grid" style="gap:10px">
    ${['armor','shield'].map(k => { const a = c[k]; return `<div class="grid" style="gap:6px">
      <div class="row"><span class="cap" style="width:52px">${k}</span><div style="flex:1;min-width:140px">${a.n ? refA('item', a.n) : '<span class="hint">None worn</span>'}</div>
        <button class="btn sm" data-act="pick-${k}">${a.n ? 'Change' : 'Choose'}</button>${a.n ? `<button class="btn ghost sm" data-act="clear-${k}" aria-label="Remove ${k}">✕</button>` : ''}</div>
      <div class="fields" style="grid-template-columns:repeat(auto-fill,minmax(78px,1fr))">${F('AC bonus', N(k + '.bonus', a.bonus))}${F('Enhance', N(k + '.enh', a.enh))}${k === 'armor' ? F('Max Dex', I('armor.mdx', a.mdx, 'placeholder="none"')) : ''}${F('Check pen.', N(k + '.acp', a.acp))}${F('ASF %', N(k + '.asf', a.asf))}</div></div>`; }).join('')}
    <div class="row hint">Total armor check penalty <b>${OT('acp')}</b> · arcane spell failure <b>${OT('asf')}</b>% · effective max Dex <b>${OT('mdx')}</b></div>
  </div>`);

  const atks = c.attacks.map(a => `<div class="atk" data-atk="${a.id}">
      <div class="nm"><div style="flex:1;min-width:0">${I('attacks.' + c.attacks.indexOf(a) + '.n', a.n, 'aria-label="Weapon name"')}</div>${getRef('item', a.n) ? refA('item', a.n, 'ⓘ') : ''}</div>
      ${F('Attack', `<span class="out sm roll atkb" data-label="${esc(a.n)} attack" title="Click to roll"></span>`)}
      ${F('Uses', S('attacks.' + c.attacks.indexOf(a) + '.ab', a.ab, [['Str', 'Str'], ['Dex', 'Dex'], ['None', '—']]))}
      ${F('Damage', `<span class="out sm atkd" style="min-width:70px"></span>`)}
      ${F('Base dmg', I('attacks.' + c.attacks.indexOf(a) + '.dmg', a.dmg))}
      ${F('Critical', I('attacks.' + c.attacks.indexOf(a) + '.crit', a.crit))}
      ${F('Enh / misc', `<div class="row" style="flex-wrap:nowrap;gap:3px">${N('attacks.' + c.attacks.indexOf(a) + '.enh', a.enh, 'title="Enhancement (attack and damage)"')}${N('attacks.' + c.attacks.indexOf(a) + '.misc', a.misc, 'title="Misc attack bonus"')}</div>`)}
      ${F('Range · type · notes', I('attacks.' + c.attacks.indexOf(a) + '.note', a.note || [a.rng, a.ty].filter(x => x && x !== '—').join(' · ')))}
      <div class="f"><label>&nbsp;</label><button class="btn ghost sm" data-act="delAtk" data-id="${a.id}" aria-label="Remove attack">✕</button></div>
      <div class="row hint" style="grid-column:1/-1;gap:12px">
        <label><input type="checkbox" data-k="attacks.${c.attacks.indexOf(a)}.two" ${a.two ? 'checked' : ''}> Two-handed (1½ Str)</label>
        <label><input type="checkbox" data-k="attacks.${c.attacks.indexOf(a)}.off" ${a.off ? 'checked' : ''}> Off-hand (½ Str)</label>
        <label><input type="checkbox" data-k="attacks.${c.attacks.indexOf(a)}.nostr" ${a.nostr ? 'checked' : ''}> No Str to damage</label>
        <button class="btn sm" data-act="rollDmg" data-id="${a.id}">Roll damage</button></div>
    </div>`).join('');
  const attacks = panel('Attacks', atks || `<div class="empty">No attacks yet. <b>Add weapon</b> picks from the SRD weapon table (damage, critical and range fill in), or add a blank one for spells, natural attacks or homebrew.</div>`,
    `<button class="btn sm pri" data-act="addAtk">Add weapon</button><button class="btn sm" data-act="addAtkBlank">Add blank</button>`);

  const abilsList = c.abilities.map((f, i) => `<div class="li" style="grid-template-columns:minmax(0,1fr) minmax(0,1.2fr) 30px">
     <div>${f.ref ? refA(f.ref.startsWith('custom:') ? 'custom' : 'feature', f.ref.replace(/^custom:/, ''), f.n, f.ref.startsWith('custom:') ? 'custom' : '') : `<b>${esc(f.n)}</b>`}<div class="hint">${esc(f.src || '')}</div></div>
     <div>${I('abilities.' + i + '.note', f.note, 'placeholder="Uses / notes (e.g. 3/day, +2d6)"')}</div>
     <button class="btn ghost sm" data-act="delAbil" data-i="${i}" aria-label="Remove">✕</button></div>`).join('');
  const race = raceData(c.race);
  const special = panel('Special abilities &amp; class features', `<div class="list">${abilsList || '<div class="empty">Add class features (rage, sneak attack, turn undead…) from your classes, or your own.</div>'}</div>
     ${race ? `<div class="pb" style="border-top:1px solid var(--rule-2)"><div class="cap">Racial traits — ${refA('race', race.n)}</div><p class="hint" style="margin:4px 0 0">Hover or tap the race name for the full list of ${esc(race.n.toLowerCase())} traits.</p></div>` : ''}`,
     `<button class="btn sm pri" data-act="addFeature">Add feature</button>`);
  const langs = panel('Languages', `<div class="pb">${T('languages', c.languages, 'style="min-height:60px"')}</div>`);

  return `<div class="grid" style="gap:14px">${ident}<div class="grid g2">${abil}${combat}</div><div class="grid g2">${saves}${armor}</div>${attacks}<div class="grid g2">${special}${langs}</div></div>`;
}

// ===================== SKILLS & FEATS TAB =====================
function renderSkills(c){
  const rows = [];
  for (const sk of SRD.skills){
    if (SUBSKILLS[sk.n]){
      c.subskills.filter(s => s.base === sk.n).forEach(s => { const i = c.subskills.indexOf(s);
        rows.push(skillTr(s.id, `${sk.n} (${s.sub})`, sk, 'subskills.' + i, s, `<button class="btn ghost sm" data-act="delSub" data-id="${s.id}" aria-label="Remove">✕</button>`)); });
      rows.push(`<tr><td colspan="9"><button class="btn sm" data-act="addSub" data-base="${sk.n}">+ ${sk.n}…</button> <span class="hint">${refA('skill', sk.n, 'about ' + sk.n)}</span></td></tr>`);
      continue;
    }
    rows.push(skillTr(sk.n, sk.n, sk, 'skills.' + sk.n, c.skills[sk.n] || {}, ''));
  }
  const skills = panel('Skills', `<div class="pb row" style="justify-content:space-between;padding-bottom:4px"><span class="hint">Max ranks ${OT('maxRanks')} (class) / ${OT('maxCross')} (cross-class) · ${refA('gloss', 'Skillpts', 'how points work')}</span><span class="pill" id="skPts"></span></div>
    <div class="tbl-wrap"><table class="st"><thead><tr><th>Skill</th><th title="Class skill">CS</th><th>Key</th><th>Total</th><th>Ability</th><th>Ranks</th><th>Misc</th><th>Armor</th><th></th></tr></thead><tbody>${rows.join('')}</tbody></table></div>
    <p class="hint pb" style="margin:0">Filled square = class skill for one of your classes. Faded rows are trained-only skills with no ranks. Click a total to roll.</p>`);
  const feats = panel('Feats', `<div class="pb" style="padding-bottom:0"><span class="pill acc" id="featPts"></span></div><div class="list">${c.feats.map((f, i) => `<div class="li" style="grid-template-columns:minmax(0,1fr) minmax(0,1.2fr) 30px">
      <div>${refA(f.custom ? 'custom' : 'feat', f.custom || f.n, f.n, f.custom ? 'custom' : '')}<div class="hint">${esc((IDX.feats.get(f.n.toLowerCase()) || {}).t || (f.custom ? 'Custom' : ''))}</div></div>
      <div>${I('feats.' + i + '.note', f.note, 'placeholder="Choice / notes (e.g. Weapon Focus: longsword)"')}</div>
      <button class="btn ghost sm" data-act="delFeat" data-i="${i}" aria-label="Remove feat">✕</button></div>`).join('') || '<div class="empty">No feats yet. <b>Add feat</b> lets you browse every SRD feat with its prerequisites and benefit.</div>'}</div>`,
    `<button class="btn sm pri" data-act="addFeat">Add feat</button>`);
  return `<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,520px),1fr));align-items:start">${skills}${feats}</div>`;
}
function skillTr(key, label, sk, path, x, extra){
  return `<tr data-skrow="${esc(key)}"><td>${refA('skill', label)}${sk.tr ? ' <span class="hint" title="Trained only">•</span>' : ''}</td><td><span class="cs-dot"></span></td><td class="hint">${sk.ab === 'None' ? '—' : sk.ab}</td>
    <td><span class="out sm roll" data-roll="sk.${esc(key)}.total" data-label="${esc(label)}" data-o="sk.${esc(key)}.total" data-fmt="sgn"></span></td><td>${OT('sk.' + key + '.ab', 'sgn')}</td>
    <td>${N(path + '.ranks', x.ranks, 'min="0" step="0.5" aria-label="' + esc(label) + ' ranks"')}</td><td>${N(path + '.misc', x.misc, 'aria-label="' + esc(label) + ' misc"')}</td><td class="hint">${OT('sk.' + key + '.acp')}</td><td>${extra}</td></tr>`;
}
