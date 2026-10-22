// ===================== PRESTIGE (SPECIALISED) CLASSES =====================
// Prestige classes come from the SRD with their requirements. A prestige class appears in the class
// dropdown once the character meets every requirement the app can check; the rest are listed on
// Rules Lookup → Prestige classes with a tick, cross or question mark for each requirement.
const PRC = SRD.classes.filter(k => k.prestige);
const PRC_DESC = {
  'Arcane Archer': 'An elven archer who blends spellcraft with the bow, making magic arrows and firing spells through them.',
  'Arcane Trickster': 'A rogue-wizard who mixes sneak attacks and stealth with arcane spells, stealing and striking from a distance.',
  'Archmage': 'A master of arcane magic who trades spell slots for high arcana: mastery of elements, spell power and more.',
  'Assassin': 'A killer for hire who studies a target to slay it with one blow, using poison, disguise and a few spells.',
  'Blackguard': 'A dark warrior sworn to evil, with smite good, a fiendish servant and command over undead.',
  'Dragon Disciple': 'A spontaneous caster awakening dragon blood: claws, bite, natural armor, breath weapon and wings.',
  'Duelist': 'A nimble light-blade fighter who adds Intelligence to AC, parries attacks and fights with precision.',
  'Dwarven Defender': 'A dwarven guardian who plants his feet in a defensive stance, gaining AC, damage reduction and toughness.',
  'Eldritch Knight': 'A fighter-wizard who keeps progressing in both sword and spell.',
  'Hierophant': 'A high priest of great power who gives up spell progress for special divine abilities.',
  'Horizon Walker': 'A traveller who masters terrain and, later, the planes, gaining advantages wherever they roam.',
  'Loremaster': 'A scholar-caster who gathers secrets and lore while continuing to grow in spellcasting.',
  'Mystic Theurge': 'A caster of both arcane and divine magic who advances both at once.',
  'Shadowdancer': 'A performer of the shadows who hides in plain sight, steps between shadows and summons a shadow companion.',
  'Thaumaturgist': 'A divine caster who calls outsiders to serve, with better planar ally and summoning spells.',
};
const ARCANE_CL = ['Bard', 'Sorcerer', 'Wizard'], DIVINE_CL = ['Cleric', 'Druid', 'Paladin', 'Ranger'];
const MARTIAL_CL = ['Barbarian', 'Fighter', 'Paladin', 'Ranger'];
const splitOut = s => String(s).split(/,(?![^(\[]*[)\]])/).map(x => x.trim()).filter(Boolean);

// which "+1 level of existing … spellcasting class" a prestige level gives
function advKinds(row){ const t = (row || []).join(' | '); const out = [];
  if (/existing arcane/i.test(t)) out.push('arcane'); if (/existing divine/i.test(t)) out.push('divine');
  if (!out.length && /\+1 level of existing (class|spellcasting class)/i.test(t)) out.push('any'); return out; }
const prcAdvances = cd => cd && cd.prestige && cd.prog.some(r => advKinds(r).length);
function advTargets(c, kind){ return c.classes.filter(k => CAST[k.n] && (kind === 'any' || (kind === 'arcane' ? ARCANE_CL : DIVINE_CL).includes(k.n))).map(k => k.n); }
// extra caster levels a base class gets from prestige classes
function advLevels(c, base){
  let n = 0;
  for (const k of c.classes){ const cd = classData(k.n); if (!cd || !cd.prestige) continue;
    for (let l = 1; l <= Math.min(num(k.lvl), cd.prog.length); l++) for (const kind of advKinds(cd.prog[l - 1])){
      const pick = kind === 'divine' && advKinds(cd.prog[l - 1]).includes('arcane') ? k.adv2 : k.adv;
      const tg = advTargets(c, kind); const target = tg.includes(pick) ? pick : tg[0]; if (target === base) n++; } }
  return n;
}
function maxSpellLevel(c, kind){
  let best = -1;
  for (const k of c.classes){ if (!(kind === 'arcane' ? ARCANE_CL : DIVINE_CL).includes(k.n)) continue; const info = casterInfo(c, k, D); if (!info) continue;
    for (const s of info.slots) if (s.total != null && s.total > 0 && s.scoreOK) best = Math.max(best, s.lvl); }
  return best;
}
function skillRanks(c, name){
  const m = name.match(/^(\w+) \((.+)\)$/);
  if (m && SUBSKILLS[m[1]]) return num((c.subskills.find(s => s.base === m[1] && s.sub.toLowerCase() === m[2].toLowerCase()) || {}).ranks);
  return num((c.skills[name] || {}).ranks);
}
const featsOf = c => c.feats.map(f => ({n: f.n, note: (f.note || '').toLowerCase(), t: ((IDX.feats.get(f.n.toLowerCase()) || {}).t || '').toLowerCase()}));

// one requirement → {ok: true | false | null (check it yourself), why}
function checkReq(c, label, text){
  const lc = text.toLowerCase(); const fs = featsOf(c);
  switch (label){
    case 'Race': { if (/^any/i.test(text)) return {ok: null, why: 'Check this one yourself.'};
      const list = text.split(/,| or /).map(s => s.trim().toLowerCase()).filter(Boolean); const ok = list.includes(String(c.race || '').toLowerCase());
      return {ok, why: ok ? '' : `You're ${c.race || 'no race'}.`}; }
    case 'Alignment': { if (!c.align) return {ok: null, why: 'Set your alignment on the sheet.'}; const a = c.align.toLowerCase();
      const m = lc.match(/any (non)?(\w+)/); if (!m) return {ok: a === lc, why: `You're ${c.align}.`};
      const has = m[2] === 'neutral' ? /neutral/.test(a) : a.includes(m[2]); const ok = m[1] ? !has : has; return {ok, why: ok ? '' : `You're ${c.align}.`}; }
    case 'Base Attack Bonus': { const need = num(text.replace('+', '')); return {ok: D.bab >= need, why: D.bab >= need ? '' : `Yours is ${sgn(D.bab)}.`}; }
    case 'Skills': { const miss = [];
      for (const part of splitOut(text)){
        let m = part.match(/Knowledge \(any two\) (\d+) ranks/i);
        if (m){ const n = c.subskills.filter(s => s.base === 'Knowledge' && num(s.ranks) >= +m[1]).length; if (n < 2) miss.push(`two Knowledge skills at ${m[1]} ranks (you have ${n})`); continue; }
        m = part.match(/^(.+?) (\d+) ranks/i); if (!m) continue; const have = skillRanks(c, m[1]); if (have < +m[2]) miss.push(`${m[1]} ${have}/${m[2]}`); }
      return {ok: !miss.length, why: miss.length ? 'Short on: ' + miss.join(', ') + '.' : ''}; }
    case 'Feats': { const miss = [], unsure = [];
      if (/any three metamagic or item creation/i.test(text)){
        const n = fs.filter(f => /metamagic|item creation/.test(f.t)).length; if (n < 3) miss.push(`three metamagic or item creation feats (you have ${n})`);
        const sf = fs.find(f => f.n === 'Skill Focus' && /knowledge/.test(f.note)); if (!sf) (fs.some(f => f.n === 'Skill Focus') ? unsure : miss).push('Skill Focus (a Knowledge skill)');
        return {ok: miss.length ? false : unsure.length ? null : true, why: [miss.length ? 'Missing: ' + miss.join(', ') + '.' : '', unsure.length ? 'Note which skill on your Skill Focus feat.' : ''].join(' ').trim()}; }
      for (const part of splitOut(text)){
        if (/any metamagic feat/i.test(part)){ if (!fs.some(f => /metamagic/.test(f.t))) miss.push('a metamagic feat'); continue; }
        let m = part.match(/^(.+?) in two schools/i); if (m){ const n = fs.filter(f => f.n.toLowerCase() === m[1].toLowerCase()).length; if (n < 2) miss.push(`${m[1]} twice (you have ${n})`); continue; }
        m = part.match(/^(.+?)\s*\((.+)\)$/); const base = (m ? m[1] : part).trim();
        const have = fs.filter(f => f.n.toLowerCase() === base.toLowerCase()); if (!have.length){ miss.push(part); continue; }
        if (m){ const opts = m[2].toLowerCase().split(/ or |,/).map(s => s.trim()); if (!have.some(f => opts.some(o => f.note.includes(o)))) unsure.push(`${part} — write the choice in the feat's note`); } }
      return {ok: miss.length ? false : unsure.length ? null : true, why: [miss.length ? 'Missing: ' + miss.join(', ') + '.' : '', unsure.join('; ')].join(' ').trim()}; }
    case 'Spells': case 'Spellcasting': {
      if (/without preparation/i.test(text)){ const ok = c.classes.some(k => ['Sorcerer', 'Bard'].includes(k.n) && num(k.lvl) > 0); return {ok, why: ok ? '' : 'Needs a sorcerer or bard level.'}; }
      if (/lesser planar ally/i.test(text)){ const d = maxSpellLevel(c, 'divine'); if (d < 4) return {ok: false, why: 'Needs 4th-level divine spells.'};
        const known = Object.values(c.spells || {}).some(b => (b.list || []).some(s => /lesser planar ally/i.test(s.n || ''))); return {ok: known || null, why: known ? '' : 'Add Lesser Planar Ally to your spells to confirm.'}; }
      const checks = [...text.matchAll(/(\d)(?:st|nd|rd|th)[- ]level (arcane|divine)|(arcane|divine) spell of (\d)(?:st|nd|rd|th) level/gi)];
      if (!checks.length) return {ok: null, why: 'Check this one yourself.'};
      const miss = []; for (const m of checks){ const lv = +(m[1] || m[4]), kind = (m[2] || m[3]).toLowerCase(); const have = maxSpellLevel(c, kind); if (have < lv) miss.push(`${ord(lv)}-level ${kind} (your best is ${have < 0 ? 'none' : have})`); }
      if (miss.length) return {ok: false, why: 'Can\'t cast ' + miss.join(' or ') + ' yet.'};
      const extra = /mage hand|five schools|divination/i.test(text); return {ok: extra ? null : true, why: extra ? 'Spell level met; check the rest yourself.' : ''}; }
    case 'Weapon Proficiency': { const ok = c.classes.some(k => MARTIAL_CL.includes(k.n)) || fs.some(f => f.n === 'Martial Weapon Proficiency'); return {ok: ok || null, why: ok ? '' : 'Needs a fighter, barbarian, paladin or ranger level (or check yourself).'}; }
    case 'Languages': { const ok = String(c.languages || '').toLowerCase().includes(lc); return {ok, why: ok ? '' : `Add ${text} to your languages.`}; }
  }
  return {ok: null, why: 'Check this one yourself.'};
}
function prcStatus(c, cd){ const reqs = (cd.req || []).map(([l, t]) => ({l, t, ...checkReq(c, l, t)}));
  return {reqs, ok: !reqs.some(r => r.ok === false), sure: reqs.every(r => r.ok === true)}; }
const reqIcon = ok => ok === true ? '<span class="rq ok" title="Met">✓</span>' : ok === false ? '<span class="rq no" title="Not met">✗</span>' : '<span class="rq maybe" title="Check yourself">?</span>';

// class dropdown: core classes, plus prestige classes you qualify for (and the one already chosen)
function classOptionsHtml(c, current){
  const core = SRD.classes.filter(k => !k.prestige).map(k => `<option ${k.n === current ? 'selected' : ''}>${esc(k.n)}</option>`).join('');
  const pr = PRC.filter(k => k.n === current || prcStatus(c, k).ok).map(k => `<option ${k.n === current ? 'selected' : ''}>${esc(k.n)}</option>`).join('');
  return core + (pr ? `<optgroup label="Prestige (specialised) classes">${pr}</optgroup>` : '');
}
function classRowExtra(c, k, i){
  const cd = classData(k.n); if (!cd || !cd.prestige) return '';
  const kinds = [...new Set(cd.prog.flatMap(advKinds))]; const st = prcStatus(c, cd);
  const sel = (kind, field) => { const tg = advTargets(c, kind); if (!tg.length) return `<span class="hint">no ${kind === 'any' ? '' : kind + ' '}spellcasting class yet</span>`;
    return `<select data-k="classes.${i}.${field}" data-rerender="1" aria-label="Class that gains spellcasting" style="width:auto">${tg.map(n => `<option ${n === (k[field] || tg[0]) ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select>`; };
  const adv = kinds.length ? `<span class="hint">Spells per day go to</span> ${kinds.includes('arcane') ? sel('arcane', 'adv') : kinds.includes('any') ? sel('any', 'adv') : ''}${kinds.includes('divine') ? ' ' + sel('divine', kinds.includes('arcane') ? 'adv2' : 'adv') : ''}` : '';
  const warn = !st.ok ? `<span class="pill bad">requirements not met</span>` : '';
  return adv || warn ? `<div class="row prc-extra" style="gap:6px;margin:-2px 0 2px 4px;flex-wrap:wrap">${warn}${adv}</div>` : '';
}

// Rules Lookup → Prestige classes overview
function prcOverview(c){
  const cards = PRC.map(cd => { const st = c ? prcStatus(c, cd) : null; const have = c && c.classes.some(k => k.n === cd.n);
    const adv = cd.prog.some(r => advKinds(r).length);
    return `<article class="prc-card ${st && st.ok ? 'can' : ''}"><div class="prc-h"><h3>${refA('class', cd.n, esc(cd.n))}</h3>
        ${have ? '<span class="pill acc">your class</span>' : st ? (st.ok ? `<span class="pill good">${st.sure ? 'you qualify' : 'probably qualify'}</span>` : '<span class="pill">not yet</span>') : ''}</div>
      <p class="prc-d">${esc(PRC_DESC[cd.n] || '')}</p>
      <p class="hint" style="margin:0 0 6px">d${cd.hd} hit die · ${cd.sp} + Int skill points · ${cd.prog.length} levels${adv ? ' · keeps your spellcasting going' : ''}</p>
      <ul class="prc-req">${(st ? st.reqs : cd.req.map(([l, t]) => ({l, t, ok: null}))).map(r => `<li>${reqIcon(r.ok)}<span><b>${esc(r.l)}:</b> ${esc(r.t)}${r.why ? `<span class="hint"> — ${esc(r.why)}</span>` : ''}</span></li>`).join('')}</ul>
      <button class="btn sm" data-prcopen="${esc(cd.n)}">Full rules: table and features</button></article>`; }).join('');
  return `<div class="ph"><h2>Prestige (specialised) classes</h2></div><div class="pb">
    <p class="hint" style="margin-top:0">Prestige classes are specialised classes you can take once you meet their requirements. ${c ? `Ticks and crosses are checked against <b>${esc(c.name || 'your character')}</b>; a question mark means the app can't check it, so confirm it with your DM. Classes you qualify for appear in the Class dropdown on the Character tab.` : ''}</p>
    <div class="prc-grid">${cards}</div><p class="hint" style="margin-top:16px">System Reference Document v3.5 · Open Game Content</p></div>`;
}
function openPrcDetail(n){
  const cd = classData(n); if (!cd) return;
  const tbl = `<div class="tbl-wrap"><table class="bdt prc-tbl"><thead><tr>${(cd.hdr || []).map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${cd.prog.map(r => `<tr>${r.map(x => `<td>${esc(x)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  openModal(`<div class="modal" role="dialog" aria-label="${esc(cd.n)}"><div class="mh"><h3>${esc(cd.n)}</h3><button class="btn ghost" data-close>Close</button></div>
    <div class="mprev" style="overflow:auto"><p>${esc(PRC_DESC[cd.n] || '')}</p>
      <dl class="statblock"><dt>Hit die</dt><dd>d${cd.hd}</dd><dt>Skill points</dt><dd>${cd.sp} + Int modifier per level</dd><dt>Class skills</dt><dd>${esc(cd.cs.join(', '))}</dd>${cd.req.map(([l, t]) => `<dt>${esc(l)}</dt><dd>${esc(t)}</dd>`).join('')}</dl>
      ${tbl}<div class="rt">${cd.f.map(f => f.d).join('')}${cd.extra || ''}</div></div></div>`);
}
document.addEventListener('click', e => { const b = e.target.closest('[data-prcopen]'); if (b){ e.preventDefault(); openPrcDetail(b.dataset.prcopen); } });
