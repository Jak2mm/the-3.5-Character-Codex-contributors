// ===================== NPCs, LOCATIONS & FACTIONS =====================
const ATTITUDES = [['', 'Unknown'], ['hostile', 'Hostile'], ['unfriendly', 'Unfriendly'], ['indifferent', 'Indifferent'], ['friendly', 'Friendly'], ['helpful', 'Helpful']];
const ATT_PILL = {hostile:'bad', unfriendly:'warn', indifferent:'', friendly:'acc', helpful:'good'};
const NPC_STATUS = [['alive', 'Alive'], ['dead', 'Dead'], ['missing', 'Missing'], ['unknown', 'Unknown']];
const LOC_TYPES = ['', 'City', 'Town', 'Village', 'Keep / castle', 'Temple', 'Tavern / inn', 'Shop', 'Dungeon', 'Ruins', 'Cave', 'Wilderness', 'Region', 'Plane', 'Other'];
const LOC_STATUS = [['heard', 'Heard of'], ['visited', 'Visited'], ['cleared', 'Cleared'], ['avoid', 'Avoid']];
const FAC_TYPES = ['', 'Guild', 'Church / temple', 'Cult', 'Noble house', 'Government', 'Military', 'Thieves / criminal', 'Mercenaries', 'Merchants', 'Arcane order', 'Tribe / clan', 'Secret society', 'Other'];
const NPC_STATS = [['cr', 'CR'], ['hp', 'HP'], ['ac', 'AC'], ['init', 'Init'], ['speed', 'Speed'], ['bab', 'BAB / Grapple'], ['fort', 'Fort'], ['ref', 'Ref'], ['will', 'Will'],
  ['str', 'Str'], ['dex', 'Dex'], ['con', 'Con'], ['int', 'Int'], ['wis', 'Wis'], ['cha', 'Cha']];
const TRUST = [['', 'Not sure yet'], ['close', 'Close friend'], ['trusted', 'Trusted'], ['neutral', 'Neutral'], ['wary', 'Wary'], ['distrust', 'Distrust']];
const TRUST_PILL = {close:'good', trusted:'acc', neutral:'', wary:'warn', distrust:'bad'};
const PC_STATUS = [['active', 'In the party'], ['away', 'Away'], ['left', 'Left the party'], ['dead', 'Dead']];
const WK = {pc:{arr:'players', tab:'players', sel:'pcSel', q:'pcQ', label:'player character', plural:'Players'}, npc:{arr:'npcs', tab:'npcs', sel:'npcSel', q:'npcQ', label:'NPC', plural:'NPCs'}, loc:{arr:'locations', tab:'locations', sel:'locSel', q:'locQ', label:'location', plural:'Locations'},
  fac:{arr:'factions', tab:'factions', sel:'facSel', q:'facQ', label:'faction', plural:'Factions'},
  comp:{arr:'companions', tab:'companions', sel:'compSel', q:'compQ', label:'companion', plural:'Companions'}};

async function imageToDataURL(file, max = 480){
  const url = URL.createObjectURL(file); const img = new Image(); img.src = url; await img.decode();
  const sc = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const cv = document.createElement('canvas'); cv.width = Math.round(img.naturalWidth * sc); cv.height = Math.round(img.naturalHeight * sc);
  const ctx = cv.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height); ctx.drawImage(img, 0, 0, cv.width, cv.height); URL.revokeObjectURL(url);
  let q = .82, data = cv.toDataURL('image/jpeg', q); while (data.length > 120000 && q > .4){ q -= .1; data = cv.toDataURL('image/jpeg', q); }
  return data;
}
const today = () => new Date().toISOString().slice(0, 10);
function newWorld(kind){
  const base = {id:uid(kind), n:'', desc:'', log:[], img:''};
  if (kind === 'npc') return {...base, role:'', race:'', cls:'', align:'', attitude:'', status:'alive', loc:'', fac:'', stats:{}, attacks:'', special:''};
  if (kind === 'pc') return {...base, player:'', race:'', cls:'', align:'', role:'', trust:'', status:'active', deity:'', stats:{}, attacks:'', special:'', opinion:''};
  if (kind === 'loc') return {...base, type:'', region:'', status:'heard', parent:''};
  return {...base, type:'', attitude:'', leader:'', hq:'', goals:''};
}
const wArr = (c, kind) => c[WK[kind].arr] || (c[WK[kind].arr] = []);
const wName = (c, kind, id) => { const x = wArr(c, kind).find(v => v.id === id); return x ? (x.n || 'Unnamed') : ''; };

// ---------- name links inside free text ----------
function worldIndex(c){
  const out = [];
  for (const kind of ['pc', 'npc', 'loc', 'fac']) for (const x of wArr(c, kind)){
    let n = String(x.n || '').trim();
    if (kind === 'loc' || kind === 'fac') n = n.replace(/^the\s+/i, ''); // "The Black Hand" also matches "Black Hand" / "the Black Hand"
    if (n.length >= 3) out.push({n, kind, id:x.id}); }
  return out.sort((a, b) => b.n.length - a.n.length);
}
function linkify(text, c){
  const idx = worldIndex(c); let html = esc(text || '');
  if (idx.length){
    const map = new Map(idx.map(e => [e.n.toLowerCase(), e]));
    const re = new RegExp('(^|[^\\p{L}\\p{N}])(' + idx.map(e => esc(e.n).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')(?![\\p{L}\\p{N}])', 'giu');
    html = html.replace(re, (m, pre, name) => { const e = map.get(name.toLowerCase().replace(/&amp;/g, '&').replace(/&#39;/g, "'")) || idx.find(x => esc(x.n).toLowerCase() === name.toLowerCase());
      return e ? `${pre}<span class="ref wl wl-${e.kind}" tabindex="0" data-ref="world" data-name="${e.kind}:${e.id}">${name}</span>` : m; });
  }
  return html.replace(/\n/g, '<br>');
}
// a text block that reads with name links and edits on click
function LT(path, val, placeholder = 'Click to write…', rows = 4){
  return `<div class="lt" data-lt="${esc(path)}"><div class="lt-view" tabindex="0" title="Click to edit">${val ? linkify(val, APP_cur()) : `<span class="hint">${esc(placeholder)}</span>`}</div>
    <textarea data-k="${esc(path)}" id="k-${esc(path)}" rows="${rows}" hidden placeholder="${esc(placeholder)}">${esc(val || '')}</textarea></div>`;
}
document.addEventListener('click', e => {
  const v = e.target.closest('.lt-view'); if (!v || e.target.closest('.ref')) return;
  const box = v.closest('.lt'); const ta = $('textarea', box); const vh = v.offsetHeight; v.hidden = true; ta.hidden = false;
  fitTA(ta, vh); ta.focus({preventScroll:true}); ta.setSelectionRange(ta.value.length, ta.value.length);
});
// ---- text boxes keep their size: they open at least as big as the text you were reading, grow as you type,
// and remember a size you drag them to (per box, across re-renders and reloads)
APP.taH = {}; try { APP.taH = JSON.parse(localStorage.getItem('codex35-ta') || '{}'); } catch {}
function taKey(k){ const c = APP_cur(); const m = String(k || '').match(/^(\w+)\.(\d+)\.(.+)$/); const x = m && c && Array.isArray(c[m[1]]) && c[m[1]][+m[2]];
  return (c ? c.id + ':' : '') + (x && x.id ? x.id + '.' + m[3] : k); }
function saveTA(ta){ const h = ta.offsetHeight; if (!h) return; APP.taH[taKey(ta.dataset.k)] = h; ta._h = h; clearTimeout(saveTA.t); saveTA.t = setTimeout(() => { try { localStorage.setItem('codex35-ta', JSON.stringify(APP.taH)); } catch {} }, 400); }
function fitTA(ta, atLeast = 0){ const want = Math.max(APP.taH[taKey(ta.dataset.k)] || 0, atLeast); const top = window.scrollY;
  ta.style.height = 'auto'; const need = ta.scrollHeight + 2; ta.style.height = Math.max(need, want, 0) + 'px'; window.scrollTo({top}); ta._h = ta.offsetHeight; }
function applyTASizes(){ for (const ta of $$('textarea[data-k]')){ const h = APP.taH[taKey(ta.dataset.k)]; if (h) ta.style.height = h + 'px'; } }
document.addEventListener('input', e => { const ta = e.target; if (!ta.matches || !ta.matches('textarea[data-k]')) return;
  if (ta.scrollHeight > ta.clientHeight){ const top = window.scrollY; ta.style.height = (ta.scrollHeight + 2) + 'px'; window.scrollTo({top}); saveTA(ta); } });
// a drag of the resize handle (mouse or touch) is remembered, including making a box smaller
document.addEventListener('pointerup', () => { for (const ta of $$('textarea[data-k]')) if (ta.offsetHeight && ta._h !== undefined && Math.abs(ta.offsetHeight - ta._h) > 2) saveTA(ta); });
document.addEventListener('pointerdown', e => { const ta = e.target; if (ta.matches && ta.matches('textarea[data-k]')) ta._h = ta.offsetHeight; });
document.addEventListener('keydown', e => { const v = e.target.closest && e.target.closest('.lt-view'); if (v && e.key === 'Enter' && !e.target.closest('.ref')){ e.preventDefault(); v.click(); } });
document.addEventListener('focusout', e => {
  const ta = e.target; if (!ta.matches || !ta.matches('.lt textarea')) return;
  const box = ta.closest('.lt'); const v = $('.lt-view', box); const ph = ta.getAttribute('placeholder');
  v.innerHTML = ta.value ? linkify(ta.value, APP_cur()) : `<span class="hint">${esc(ph)}</span>`; ta.hidden = true; v.hidden = false;
});
function worldRef(key){
  const [kind, id] = String(key).split(':'); const c = APP_cur(); const x = c && wArr(c, kind).find(v => v.id === id); if (!x) return null;
  const last = (x.log || [])[0];
  const bits = kind === 'pc' ? [x.player ? 'played by ' + x.player : '', x.race, x.cls, x.role, (TRUST.find(t => t[0] === x.trust) || [])[1], x.status !== 'active' ? (PC_STATUS.find(t => t[0] === x.status) || [])[1] : '']
    : kind === 'npc' ? [x.role, x.race, x.cls, x.status !== 'alive' ? x.status : '', x.attitude, wName(c, 'loc', x.loc), wName(c, 'fac', x.fac)]
    : kind === 'loc' ? [x.type, x.region, wName(c, 'loc', x.parent), (LOC_STATUS.find(s => s[0] === x.status) || [])[1]]
    : [x.type, x.attitude ? x.attitude + ' to you' : '', x.leader ? 'led by ' + wName(c, 'npc', x.leader) : '', x.hq ? 'based at ' + wName(c, 'loc', x.hq) : ''];
  const stats = kind === 'npc' || kind === 'pc' ? NPC_STATS.filter(([k]) => (x.stats || {})[k]).map(([k, l]) => `${l} ${esc(x.stats[k])}`).join(' · ') : '';
  return {title: x.n || 'Unnamed', sub: {pc:'Player character', npc:'NPC', loc:'Location', fac:'Faction'}[kind] + ' · click to open',
    html: `${x.img ? `<img src="${IMG.src(x.img)}" alt="" style="float:right;width:84px;height:84px;object-fit:cover;margin:0 0 6px 10px;border:1px solid var(--rule)">` : ''}
      <p class="hint" style="margin-top:0">${esc(bits.filter(Boolean).join(' · '))}</p>${stats ? `<p style="font-size:13px">${stats}</p>` : ''}
      <div class="rt">${x.opinion ? `<p><b>Your opinion:</b> ${esc(x.opinion)}</p>` : ''}${x.desc ? `<p>${esc(x.desc).replace(/\n/g, '<br>')}</p>` : ''}${last ? `<p><b>Latest${last.date ? ' (' + esc(last.date) + ')' : ''}:</b> ${esc(last.text)}</p>` : ''}${!x.desc && !last ? '<p class="hint">Nothing written yet.</p>' : ''}</div>`};
}
function jumpWorld(key){ const [kind, id] = String(key).split(':'); APP[WK[kind].sel] = id; APP.tab = WK[kind].tab; APP[WK[kind].q] = ''; closeModal(); hideTip(); renderAll(); window.scrollTo({top:0}); }

// ---------- list & detail ----------
function worldList(kind, c){
  const arr = wArr(c, kind); const q = (APP[WK[kind].q] || '').toLowerCase(); const sel = APP[WK[kind].sel];
  const hay = x => [x.n, x.player, x.opinion, x.role, x.race, x.type, x.region, x.goals, x.desc, ...(x.log || []).map(l => l.text)].join(' ').toLowerCase();
  const shown = arr.filter(x => !q || hay(x).includes(q)).sort((a, b) => (a.n || '~').localeCompare(b.n || '~'));
  return shown.map(x => {
    const sub = kind === 'pc' ? [x.cls, x.race, x.player ? '(' + x.player + ')' : ''] : kind === 'npc' ? [x.role, x.race, wName(c, 'loc', x.loc)] : kind === 'loc' ? [x.type, x.region || wName(c, 'loc', x.parent)] : [x.type, x.hq ? wName(c, 'loc', x.hq) : ''];
    const pill = kind === 'loc' ? `<span class="pill ${x.status === 'visited' ? 'good' : x.status === 'cleared' ? 'acc' : x.status === 'avoid' ? 'bad' : ''}">${(LOC_STATUS.find(s => s[0] === x.status) || ['', ''])[1]}</span>`
      : kind === 'pc' ? (x.status === 'dead' ? '<span class="pill bad">dead</span>' : x.status === 'left' ? '<span class="pill">left</span>' : x.trust ? `<span class="pill ${TRUST_PILL[x.trust]}">${(TRUST.find(t => t[0] === x.trust) || [])[1]}</span>` : '')
      : kind === 'npc' && x.status === 'dead' ? '<span class="pill bad">dead</span>' : x.attitude ? `<span class="pill ${ATT_PILL[x.attitude]}">${x.attitude}</span>` : '';
    return `<a href="#" class="w-item ${x.id === sel ? 'act' : ''}" data-wsel="${kind}:${x.id}">${x.img ? `<img src="${IMG.src(x.img)}" alt="">` : `<span class="w-ph">${esc((x.n || '?').slice(0, 1).toUpperCase())}</span>`}
      <span class="w-t"><b>${esc(x.n || 'Unnamed')}</b><span class="hint">${esc(sub.filter(Boolean).join(' · '))}</span></span>${pill}</a>`; }).join('')
    || `<div class="empty">${q ? 'Nothing matches that search.' : `No ${WK[kind].plural.toLowerCase()} yet.`}</div>`;
}
function logBlock(kind, i, x){
  const arr = WK[kind].arr;
  return `<div class="w-sec"><div class="cap">What you've learned</div>
    <div class="row" style="align-items:flex-start;margin-top:4px"><textarea id="wlog-new" rows="2" placeholder="Add something new you found out… (saved with today's date)" style="flex:1;min-height:56px"></textarea><button class="btn pri" data-act="wLogAdd" data-kind="${kind}" data-id="${x.id}">Add</button></div>
    <div class="w-log">${(x.log || []).map((l, j) => `<div class="w-log-e"><div class="row" style="justify-content:space-between"><input type="date" data-k="${arr}.${i}.log.${j}.date" id="k-wl-${x.id}-${j}" value="${esc(l.date)}" style="width:auto;padding:2px 4px"><button class="btn ghost sm" data-act="wLogDel" data-kind="${kind}" data-id="${x.id}" data-j="${j}" aria-label="Delete entry">✕</button></div>
      ${LT(`${arr}.${i}.log.${j}.text`, l.text, 'Click to write…', 2)}</div>`).join('') || '<p class="hint" style="margin:6px 0 0">Nothing logged yet. Each entry is dated, so you can see how your knowledge grew.</p>'}</div></div>`;
}
function imgBox(kind, x){
  return `<div class="w-img">${x.img ? `<img src="${IMG.src(x.img)}" alt="Picture of ${esc(x.n)}" class="w-zoom">` : `<label for="wimg-${x.id}" class="portrait-empty"><span class="pe-icon" aria-hidden="true"></span><b>Add picture</b></label>`}</div>
    <input type="file" accept="image/*" hidden id="wimg-${x.id}" data-wimg="${kind}:${x.id}">
    ${x.img ? `<div class="row" style="justify-content:center;gap:4px"><label for="wimg-${x.id}" class="btn sm">Change</label><button class="btn ghost sm" data-act="wImgDel" data-kind="${kind}" data-id="${x.id}">Remove</button></div>` : ''}`;
}
const chipLink = (kind, x) => `<a href="#" class="bchip w-chip" data-wjump="${kind}:${x.id}">${esc(x.n || 'Unnamed')}</a>`;
function worldDetail(kind, c, x, i){
  const arr = WK[kind].arr; const P = f => `${arr}.${i}.${f}`;
  const opts = k => [['', '—'], ...wArr(c, k).filter(v => v.id !== x.id).map(v => [v.id, v.n || 'Unnamed'])];
  let fields = '', extra = '', links = '';
  const statsBlock = `<div class="w-sec"><div class="row" style="justify-content:space-between"><span class="cap">Stats (fill in as you learn them)</span>
        <button class="btn sm" data-act="npcInit" data-kind="${kind}" data-id="${x.id}" title="Roll initiative and add them to the Combat tab">Add to initiative</button></div>
        <div class="w-stats">${NPC_STATS.filter(([k]) => kind === 'npc' || k !== 'cr').map(([k, l]) => F(l, I(`${P('stats')}.${k}`, (x.stats || {})[k], 'placeholder="?"'))).join('')}</div>
        <div class="fields" style="margin-top:8px">${F('Attacks', T(P('attacks'), x.attacks, 'rows="2" placeholder="e.g. Longsword +8 (1d8+3, 19–20/×2)"'), 'wide')}${F('Special abilities / spells', T(P('special'), x.special, 'rows="2" placeholder="Anything you\'ve seen them do"'), 'wide')}</div></div>`;
  if (kind === 'pc'){
    fields = `<div class="fields">${F('Character name', I(P('n'), x.n, 'data-rerender-list="pc" placeholder="Character name"'), 'wide')}${F('Played by', I(P('player'), x.player, 'placeholder="Player\'s real name"'))}${F('Party role', I(P('role'), x.role, 'placeholder="e.g. Healer, scout, face"'))}</div>
      <div class="fields">${F('Race', I(P('race'), x.race))}${F('Class / level', I(P('cls'), x.cls, 'placeholder="e.g. Fighter 3 / Rogue 1"'))}${F('Alignment', I(P('align'), x.align))}${F('Deity', I(P('deity'), x.deity))}
        ${F('How you feel about them', S(P('trust'), x.trust, TRUST, 'data-rerender="1"'))}${F('Status', S(P('status'), x.status, PC_STATUS, 'data-rerender="1"'))}</div>`;
    extra = `<div class="w-sec">${F('Your opinion of them', LT(P('opinion'), x.opinion, 'What you think of them, how far you trust them, any history between your characters…', 3))}</div>` + statsBlock;
  } else if (kind === 'npc'){
    fields = `<div class="fields">${F('Name', I(P('n'), x.n, 'data-rerender-list="npc" placeholder="Name"'), 'wide')}${F('Role / title', I(P('role'), x.role, 'placeholder="e.g. Innkeeper, cult leader"'))}${F('Faction', S(P('fac'), x.fac, opts('fac'), 'data-rerender="1"'))}</div>
      <div class="fields">${F('Race', I(P('race'), x.race))}${F('Class / level', I(P('cls'), x.cls, 'placeholder="e.g. Wizard 5"'))}${F('Alignment', I(P('align'), x.align))}
        ${F('Attitude ' + refA('skill', 'Diplomacy', 'ⓘ'), S(P('attitude'), x.attitude, ATTITUDES, 'data-rerender="1"'))}${F('Status', S(P('status'), x.status, NPC_STATUS, 'data-rerender="1"'))}${F('Where found', S(P('loc'), x.loc, opts('loc'), 'data-rerender="1"'))}</div>`;
    extra = statsBlock;
  } else if (kind === 'loc'){
    fields = `<div class="fields">${F('Name', I(P('n'), x.n, 'data-rerender-list="loc" placeholder="Name"'), 'wide')}${F('Type', S(P('type'), x.type, LOC_TYPES.map(t => [t, t || '—'])))}${F('Status', S(P('status'), x.status, LOC_STATUS, 'data-rerender="1"'))}</div>
      <div class="fields">${F('Region', I(P('region'), x.region, 'placeholder="e.g. The Vale"'))}${F('Inside / part of', S(P('parent'), x.parent, opts('loc'), 'data-rerender="1"'))}</div>`;
    const here = c.npcs.filter(n => n.loc === x.id), inside = c.locations.filter(l => l.parent === x.id), facs = c.factions.filter(f => f.hq === x.id);
    if (here.length || inside.length || facs.length) links = `<div class="bchips">${here.map(n => chipLink('npc', n)).join('')}${facs.map(f => chipLink('fac', f)).join('')}${inside.map(l => chipLink('loc', l)).join('')}</div><p class="hint" style="margin:0">People, factions and places linked here.</p>`;
  } else {
    fields = `<div class="fields">${F('Name', I(P('n'), x.n, 'data-rerender-list="fac" placeholder="Name"'), 'wide')}${F('Type', S(P('type'), x.type, FAC_TYPES.map(t => [t, t || '—'])))}${F('Attitude to you', S(P('attitude'), x.attitude, ATTITUDES, 'data-rerender="1"'))}</div>
      <div class="fields">${F('Leader', S(P('leader'), x.leader, [['', '—'], ...c.npcs.map(n => [n.id, n.n || 'Unnamed'])], 'data-rerender="1"'))}${F('Headquarters', S(P('hq'), x.hq, [['', '—'], ...c.locations.map(l => [l.id, l.n || 'Unnamed'])], 'data-rerender="1"'))}</div>`;
    extra = `<div class="w-sec">${F('Goals', LT(P('goals'), x.goals, 'What do they want? Who are their enemies?', 3))}</div>`;
    const members = c.npcs.filter(n => n.fac === x.id);
    links = `<div class="bchips">${members.map(n => chipLink('npc', n)).join('') || '<span class="hint">No members yet: set an NPC\'s Faction to link them.</span>'}</div>`;
  }
  return `<div class="pb grid" style="gap:14px">
    <div class="w-head"><div class="w-imgcol">${imgBox(kind, x)}</div><div class="grid" style="gap:10px;min-width:0">${fields}${links}</div></div>
    ${F('Description', LT(P('desc'), x.desc, kind === 'npc' ? 'Appearance, personality, what they want…' : kind === 'loc' ? 'What it looks like, who runs it, dangers, rumours…' : 'Who they are, what they\'re known for…', 4))}
    ${extra}${logBlock(kind, i, x)}
    <div class="row" style="justify-content:flex-end"><button class="btn ghost" data-act="wDel" data-kind="${kind}" data-id="${x.id}">Delete ${WK[kind].label}</button></div></div>`;
}
function renderWorld(kind, c){
  const arr = wArr(c, kind); const x = arr.find(n => n.id === APP[WK[kind].sel]) || arr[0]; if (x) APP[WK[kind].sel] = x.id;
  const intro = {pc:'Keep track of the other characters in your party: who they are, what you\'ve learned about them, and what you think of them.', npc:'Add the people you meet: their stats as you learn them, what they\'re like, and everything you find out over time.', loc:'Add towns, dungeons, inns and anywhere you go or hear about, and build up what you know about each.', fac:'Track guilds, churches, cults and noble houses: who leads them, where they\'re based, what they want, and who belongs.'}[kind];
  return `<div class="w-grid"><aside class="panel w-side"><div class="ph"><h2>${WK[kind].plural}</h2><div class="tools"><button class="btn sm pri" data-act="wNew" data-kind="${kind}">New ${WK[kind].label}</button></div></div>
      <div class="pb" style="border-bottom:1px solid var(--rule-2)"><input type="search" id="wq-${kind}" data-wq="${kind}" placeholder="Search names and notes…" value="${esc(APP[WK[kind].q] || '')}"></div>
      <div class="w-list" id="wlist-${kind}">${worldList(kind, c)}</div></aside>
    <section class="panel w-main">${x ? `<div class="ph"><h2 id="wtitle">${esc(x.n || 'Unnamed ' + WK[kind].label)}</h2></div>${worldDetail(kind, c, x, arr.indexOf(x))}` : `<div class="empty"><b>No ${WK[kind].plural.toLowerCase()} yet.</b><br>${intro}<br><br><button class="btn pri" data-act="wNew" data-kind="${kind}">New ${WK[kind].label}</button></div>`}</section></div>`;
}
const renderPlayers = c => renderWorld('pc', c), renderNpcs = c => renderWorld('npc', c), renderLocations = c => renderWorld('loc', c), renderFactions = c => renderWorld('fac', c);

// ---------- events ----------
document.addEventListener('click', e => {
  const s = e.target.closest('[data-wsel],[data-wjump]'); if (!s) return; e.preventDefault();
  const [kind, id] = (s.dataset.wsel || s.dataset.wjump).split(':'); APP[WK[kind].sel] = id; APP.tab = WK[kind].tab; renderAll();
  if (matchMedia('(max-width: 860px)').matches){ const p = $('.w-main'); if (p) p.scrollIntoView({block:'start'}); }
});
document.addEventListener('input', e => {
  const k = e.target.dataset && e.target.dataset.wq; if (k){ APP[WK[k].q] = e.target.value; const l = $('#wlist-' + k); if (l) l.innerHTML = worldList(k, APP_cur()); return; }
  const r = e.target.dataset && e.target.dataset.rerenderList; if (!r) return;
  clearTimeout(e.target._t); e.target._t = setTimeout(() => { const l = $('#wlist-' + r); if (l) l.innerHTML = worldList(r, APP_cur()); const h = $('#wtitle'); if (h) h.textContent = e.target.value || 'Unnamed ' + WK[r].label; }, 250);
});
document.addEventListener('change', async e => { const t = e.target.dataset && e.target.dataset.wimg; if (!t) return; const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  if (!/^image\//.test(f.type)){ toast('That file isn\'t an image.', 'warn'); return; }
  const [kind, id] = t.split(':'); const c = APP_cur(); const x = wArr(c, kind).find(v => v.id === id);
  try { const d = await imageToDataURL(f, 360); IMG.drop(x.img); x.img = IMG.put(d); markDirty(); renderAll(); } catch { toast('That image couldn\'t be read.', 'warn'); } });
document.addEventListener('click', e => { const im = e.target.closest('.w-zoom'); if (!im) return;
  openModal(`<div class="modal narrow" role="dialog"><div class="mh"><h3>Picture</h3><button class="btn ghost" data-close>Close</button></div><div class="mprev" style="text-align:center"><img src="${im.src}" alt="" style="max-height:70vh"></div></div>`); });
