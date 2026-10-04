// ===================== SPELLS TAB =====================
function renderSpells(c){
  const casters = c.classes.map(k => ({k, info: casterInfo(c, k, D)})).filter(x => x.info);
  if (!casters.length) return panel('Spells', `<div class="empty">None of your classes cast spells yet. Bards, clerics, druids, sorcerers and wizards cast from 1st level; paladins and rangers from 4th.<br><br>
    You can still track spell effects on you (from allies, potions or scrolls) on the <b>Combat &amp; Effects</b> tab.</div>`);
  return `<div class="grid" style="gap:14px">${casters.map(({k, info}) => spellClassPanel(c, k, info)).join('')}</div>`;
}
function spellClassPanel(c, k, info){
  const book = c.spells[k.n] || (c.spells[k.n] = {list:[], used:{}});
  const slots = info.slots.map(s => {
    const used = num(book.used[s.lvl]); const tot = s.total;
    const pips = tot == null ? '' : `<div class="pips">${Array.from({length: tot}, (_, i) => `<button class="pip ${i < used ? 'used' : ''}" data-act="pip" data-cls="${k.n}" data-lvl="${s.lvl}" data-n="${i}" aria-label="Slot ${i + 1}"></button>`).join('')}</div>`;
    return `<div class="slot" style="${tot == null ? 'opacity:.4' : ''}"><div class="lv">${s.lvl === 0 ? '0' : ord(s.lvl)}</div>
      <div class="ct">${tot == null ? '—' : `${Math.max(0, tot - used)}<span class="hint" style="font-size:13px">/${tot}</span>`}</div>
      <div class="dc">DC ${s.dc}${s.dom ? ' · +1 domain' : ''}${s.bonus ? ` · +${s.bonus} bonus` : ''}</div>${!s.scoreOK && tot != null ? '<div class="dc" style="color:var(--bad)">score too low</div>' : ''}${pips}</div>`;
  }).join('');
  const knownLine = info.known ? `<p class="hint" style="margin:6px 0 0">Spells known: ${info.known.map((n, i) => n == null ? null : `${i === 0 ? '0' : ord(i)}: ${n}`).filter(Boolean).join(' · ')}</p>` : '';
  const levels = [...new Set(book.list.map(s => num(s.lvl)))].sort((a, b) => a - b);
  const list = levels.map(L => `<div class="splv">${lvLabel(L)}</div>` + book.list.filter(s => num(s.lvl) === L).map(s => {
    const i = book.list.indexOf(s); const sd = IDX.spells.get(s.n.toLowerCase()); const custom = !sd && libByName('spell', s.n);
    const meta = sd ? [sd.sch, sd.ct, sd.rng, sd.dur].filter(Boolean).join(' · ') : custom ? [custom.sch, custom.dur].filter(Boolean).join(' · ') : '';
    const left = info.ci.spont ? null : Math.max(0, num(s.prep) - num(s.cast));
    return `<div class="sp"><div>${refA('spell', s.n, s.n, custom ? 'custom' : '')}${s.dom ? ' <span class="pill gold">domain</span>' : ''}<div class="meta">${esc(meta)}</div></div>
      <div class="row" style="justify-content:flex-end;gap:4px">
        ${info.ci.spont ? '' : `<span class="hint">prep</span><input type="number" style="width:52px" data-k="spells.${k.n}.list.${i}.prep" data-num="1" id="k-sp-${s.id}" value="${num(s.prep)}" min="0"><span class="pill ${left ? 'acc' : ''}">${left} left</span>`}
        <button class="btn sm pri" data-act="cast" data-cls="${k.n}" data-i="${i}">Cast</button>
        <button class="btn ghost sm" data-act="delSpell" data-cls="${k.n}" data-i="${i}" aria-label="Remove spell">✕</button></div></div>`; }).join('')).join('');
  const domains = k.n === 'Cleric' ? `<div class="row" style="margin-top:8px"><span class="cap">Domains</span>${[0, 1].map(i => `<div style="width:150px">${S('domains.' + i, c.domains[i] || '', [['', '— choose —'], ...DOMAINS], 'data-rerender="1"')}</div>${c.domains[i] ? refA('domain', c.domains[i], 'ⓘ') : ''}`).join('')}</div>` : '';
  return panel(`${k.n} spells`, `<div class="pb">
      <div class="row" style="gap:16px;margin-bottom:8px"><span><span class="cap">Caster level</span> <b>${info.cl}</b></span><span><span class="cap">Casting ability</span> <b>${info.ci.ab} ${sgn(info.mod)}</b></span>
        <span><span class="cap">Type</span> <b>${info.ci.spont ? 'Spontaneous (spells known)' : 'Prepared'}</b></span>${D.asf && ['Bard','Sorcerer','Wizard'].includes(k.n) ? `<span class="pill warn">Arcane spell failure ${D.asf}%</span>` : ''}</div>
      <div class="slots">${slots}</div>${knownLine}${domains}</div>
    <div class="list" style="border-top:1px solid var(--rule)">${list || `<div class="empty">No spells on your list yet. <b>Add spells</b> opens the ${esc(k.n.toLowerCase())} spell list with full descriptions.</div>`}</div>`,
    `<button class="btn sm pri" data-act="addSpell" data-cls="${k.n}">Add spells</button><button class="btn sm" data-act="rest" data-cls="${k.n}" title="Restore all slots and prepared spells">Rest</button>`);
}

// ===================== TRACKER TAB =====================
function renderTracker(c){
  const cb = c.combat; const order = [...cb.list].sort((a, b) => num(b.init) - num(a.init) || num(b.mod) - num(a.mod));
  const initRows = order.map((x, i) => `<div class="init ${i === cb.turn % Math.max(1, order.length) && cb.round > 0 ? 'cur' : ''}">
    <span class="pos">${i + 1}</span><div>${I('combat.list.' + cb.list.indexOf(x) + '.n', x.n, 'aria-label="Name"')}</div>
    ${N('combat.list.' + cb.list.indexOf(x) + '.init', x.init, 'aria-label="Initiative" data-rerender="1"')}
    <div class="modcol">${N('combat.list.' + cb.list.indexOf(x) + '.mod', x.mod, 'aria-label="Init modifier (tiebreak)" placeholder="mod"')}</div>
    <div class="hpcol">${I('combat.list.' + cb.list.indexOf(x) + '.hp', x.hp, 'placeholder="HP / notes" aria-label="HP or notes"')}</div>
    <button class="btn ghost sm" data-act="delInit" data-id="${x.id}" aria-label="Remove">✕</button></div>`).join('');
  const active = c.effects.filter(e => !e.expired), expired = c.effects.filter(e => e.expired);
  const effRow = e => { const i = c.effects.indexOf(e); const pct = e.rounds != null && e.total ? Math.max(0, e.rounds / e.total) : 1;
    const t = e.kind === 'spell' ? 'spell' : e.kind === 'condition' ? 'cond' : null;
    return `<div class="eff ${e.expired ? 'expired' : ''}"><div>
        <div class="row" style="gap:6px">${t && getRef(t, e.n) ? refA(t, e.n) : `<b>${esc(e.n)}</b>`}<span class="pill ${e.kind === 'condition' ? 'warn' : e.kind === 'spell' ? 'acc' : ''}">${esc(e.kind)}</span>
          ${e.expired ? '<span class="pill bad">ended</span>' : e.rounds == null ? '<span class="pill">no countdown</span>' : `<span class="pill good">${fmtRounds(e.rounds)} left</span>`}</div>
        ${e.rounds != null ? `<div class="meter ${pct < .25 ? 'bad' : pct < .5 ? 'warn' : 'acc'}" style="margin-top:6px"><i style="width:${pct * 100}%"></i></div>` : ''}
        <div style="margin-top:6px">${I('effects.' + i + '.note', e.note, 'placeholder="Effect notes (bonus, save DC, source)…"')}</div></div>
      <div class="ctl">${e.expired ? `<button class="btn sm" data-act="effRenew" data-id="${e.id}">Renew</button>` : `<span class="hint">rounds</span>${N('effects.' + i + '.rounds', e.rounds, 'min="0" aria-label="Rounds remaining" data-rerender="1"')}`}
        <button class="btn ghost sm" data-act="delEff" data-id="${e.id}" aria-label="Remove effect">✕</button></div></div>`; };
  const roundP = panel('Round counter', `<div class="pb round-big">
      <div><div class="cap">Round</div><div class="n">${cb.round}</div></div>
      <div class="grid" style="gap:6px;flex:1;min-width:220px">
        <div class="row"><button class="btn pri" data-act="nextTurn">Next turn</button><button class="btn" data-act="nextRound">Next round</button><button class="btn" data-act="prevRound">Undo round</button></div>
        <div class="row"><button class="btn sm" data-act="rollMyInit">Roll my initiative (${sgn(D.init)})</button><button class="btn sm ghost" data-act="endCombat">End encounter</button></div>
        <p class="hint" style="margin:0">Each new round counts every timed effect down by one round (1 minute = 10 rounds). Effects that reach zero are marked ended so you can renew or clear them.</p>
      </div></div>`);
  const initP = panel('Initiative order', `<div class="list">${initRows || '<div class="empty">Add combatants with their initiative results. The list sorts highest first and highlights whose turn it is.</div>'}</div>
      <div class="pb row" style="border-top:1px solid var(--rule-2)"><input type="text" id="newInitName" placeholder="Name (e.g. Orc #2)" style="flex:2;min-width:140px"><input type="number" id="newInitVal" placeholder="Init" style="width:80px"><button class="btn sm pri" data-act="addInit">Add</button></div>`,
    `<button class="btn sm" data-act="sortInit">Re-sort</button><button class="btn sm ghost" data-act="clearInit">Clear</button>`);
  const effP = panel('Active spells &amp; conditions', `<div class="list">${active.map(effRow).join('') || '<div class="empty">Nothing affecting you right now. Add a condition (shaken, prone, fatigued…), a spell effect, or cast a spell from the <b>Spells</b> tab to track it here.</div>'}</div>
      ${expired.length ? `<div class="splv row" style="justify-content:space-between"><span>Ended</span><button class="btn sm" data-act="clearExpired">Clear ended</button></div><div class="list">${expired.map(effRow).join('')}</div>` : ''}`,
    `<button class="btn sm pri" data-act="addCond">Add condition</button><button class="btn sm" data-act="addSpellEff">Add spell effect</button><button class="btn sm" data-act="addCustomEff">Custom</button>`);
  return `<div class="grid" style="gap:14px">${roundP}<div class="grid g2" style="align-items:start">${effP}${initP}</div></div>`;
}

// ===================== ITEMS TAB =====================
function drawLoad(c, D){
  const L = carry(c, D); const el = $('#loadInfo'); if (!el) return;
  const pc = (a, b, x) => Math.max(0, Math.min(1, (x - a) / (b - a))) * 100;
  el.innerHTML = `<div class="row" style="justify-content:space-between"><span><b class="big" style="font-size:26px">${L.w}</b> lb. carried${L.coinW ? ` <span class="hint">(coins ${L.coinW} lb.)</span>` : ''}</span>
    <span class="pill ${{light:'good', medium:'warn', heavy:'bad', over:'bad'}[L.load]}">${{light:'Light load', medium:'Medium load', heavy:'Heavy load', over:'Over capacity'}[L.load]}</span></div>
    <div class="loadbar"><div><i style="width:${pc(0, L.light, L.w)}%"></i></div><div><i style="width:${pc(L.light, L.medium, L.w)}%"></i></div><div><i style="width:${pc(L.medium, L.heavy, L.w)}%"></i></div></div>
    <div class="row hint" style="justify-content:space-between;font-variant-numeric:tabular-nums"><span>Light ≤ ${L.light}</span><span>Medium ≤ ${L.medium}</span><span>Heavy ≤ ${L.heavy} lb.</span></div>
    <p class="hint" style="margin:4px 0 0">Lift overhead ${L.heavy} · lift off ground ${L.heavy * 2} · push/drag ${L.heavy * 5} lb. Based on Str ${D.StrScore}, ${D.size}. ${refA('gloss', 'Load', 'Load penalties')}</p>`;
}
function renderItems(c){
  const groups = Object.keys(LOCS).map(loc => { const its = c.items.filter(i => (i.loc || 'carried') === loc); if (!its.length) return '';
    const w = its.reduce((s, i) => s + num(i.w) * num(i.qty || 1), 0);
    return `<div class="splv row" style="justify-content:space-between"><span>${LOCS[loc]}</span><span>${Math.round(w * 100) / 100} lb.${loc === 'stored' || loc === 'mount' ? ' · not counted' : ''}</span></div>` + its.map(it => { const i = c.items.indexOf(it);
      const t = it.t === 'custom' ? 'custom' : 'item'; const key = it.t === 'custom' ? (it.lib || it.n) : it.n; const has = it.t === 'custom' ? !!libById(it.lib) || !!libByName('item', it.n) : !!getRef('item', it.n);
      return `<div class="it"><div style="min-width:0"><div class="row" style="flex-wrap:nowrap;gap:6px"><div style="flex:1;min-width:0">${I('items.' + i + '.n', it.n, 'aria-label="Item name"')}</div>${has ? refA(it.lib ? 'custom' : 'item', it.lib || it.n, 'ⓘ', it.lib ? 'custom' : '') : ''}</div>
          <div style="margin-top:4px">${I('items.' + i + '.note', it.note, 'placeholder="Notes, charges, who carries it…" style="font-size:13px;padding:3px 6px"')}</div></div>
        ${N('items.' + i + '.qty', it.qty, 'min="0" aria-label="Quantity" data-rerender="1"')}
        ${N('items.' + i + '.w', it.w, 'min="0" step="0.25" aria-label="Weight each" data-rerender="1"')}
        <span class="w wt-total">${Math.round(num(it.w) * num(it.qty || 1) * 100) / 100} lb.</span>
        <div class="loc">${S('items.' + i + '.loc', it.loc || 'carried', Object.entries(LOCS), 'data-rerender="1" aria-label="Location"')}</div>
        <button class="btn ghost sm" data-act="delItem" data-id="${it.id}" aria-label="Remove item">✕</button></div>`; }).join(''); }).join('');
  const items = panel('Equipment', `<div class="it head"><span>Item</span><span>Qty</span><span>Lb. each</span><span class="wt-total" style="text-align:right">Total</span><span class="loc">Where</span><span></span></div>
      <div class="list">${groups || '<div class="empty">Your pack is empty. <b>Add item</b> browses SRD weapons, armor, gear and magic items with weights and descriptions; <b>New custom item</b> makes your own.</div>'}</div>`,
    `<button class="btn sm pri" data-act="addItem">Add item</button><button class="btn sm gold" data-act="newCustomItem">New custom item</button>`);
  const coins = panel('Money &amp; load', `<div class="pb grid" style="gap:12px">
      <div class="coins">${['pp','gp','sp','cp'].map(k => F(k.toUpperCase(), N('coins.' + k, c.coins[k], 'min="0" data-rerender="1"'))).join('')}</div>
      <div class="row hint" style="justify-content:space-between"><span>Total value ≈ <b>${(num(c.coins.pp) * 10 + num(c.coins.gp) + num(c.coins.sp) / 10 + num(c.coins.cp) / 100).toLocaleString(undefined, {maximumFractionDigits:2})} gp</b></span>
        <label><input type="checkbox" data-k="coinWeight" ${c.coinWeight ? 'checked' : ''} data-rerender="1"> Coins have weight (50 per lb.)</label></div>
      <div id="loadInfo"></div></div>`);
  return `<div class="grid items-grid">${items}${coins}</div>`;
}

// ===================== NOTES TAB =====================
function renderNotes(c){
  const q = (APP.noteQ || '').toLowerCase();
  const notes = c.notes.filter(n => !q || (n.t + ' ' + n.body).toLowerCase().includes(q));
  return panel('Game notes', `<div class="pb row"><input type="search" id="noteQ" placeholder="Search notes…" value="${esc(APP.noteQ || '')}" style="flex:1;min-width:160px;background:var(--sheet);border:1px solid var(--rule);padding:6px 8px"></div>
    <div class="list">${notes.map(n => { const i = c.notes.indexOf(n); return `<div class="note"><div class="note-h">${I('notes.' + i + '.t', n.t, 'class="title" placeholder="Session / topic" aria-label="Note title"')}
      <input type="date" data-k="notes.${i}.date" id="k-notes.${i}.date" value="${esc(n.date)}" aria-label="Date"><button class="btn ghost sm" data-act="delNote" data-id="${n.id}" aria-label="Delete note">Delete</button></div>
      ${T('notes.' + i + '.body', n.body, 'rows="6" placeholder="What happened, NPCs met, clues, loot…"')}</div>`; }).join('') || `<div class="empty">${q ? 'No notes match that search.' : 'No notes yet. <b>New note</b> starts a page for this session.'}</div>`}</div>`,
    `<button class="btn sm pri" data-act="addNote">New note</button>`);
}

// ===================== QUESTS TAB =====================
function renderQuests(c){
  const order = ['active', 'hold', 'done', 'failed'];
  const qs = [...c.quests].sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status));
  const cards = qs.map(q => { const i = c.quests.indexOf(q); const done = q.obj.filter(o => o.done).length, tot = q.obj.length; const pct = tot ? done / tot : (q.status === 'done' ? 1 : 0);
    return `<div class="quest"><div class="qh">${I('quests.' + i + '.t', q.t, 'class="title" placeholder="Quest name" aria-label="Quest name"')}
        <div style="width:140px">${S('quests.' + i + '.status', q.status, Object.entries(QSTAT).map(([k, v]) => [k, v[0]]), 'data-rerender="1" aria-label="Status"')}</div>
        <span class="pill ${QSTAT[q.status][1]}">${done}/${tot} objectives</span><button class="btn ghost sm" data-act="delQuest" data-id="${q.id}" aria-label="Delete quest">Delete</button></div>
      <div class="pb grid" style="gap:10px">
        <div class="meter ${q.status === 'failed' ? 'bad' : 'acc'}"><i style="width:${pct * 100}%"></i></div>
        <div class="fields">${F('Quest giver', I('quests.' + i + '.giver', q.giver))}${F('Location', I('quests.' + i + '.where', q.where))}${F('Reward', I('quests.' + i + '.reward', q.reward), 'wide')}</div>
        <div><div class="cap">Objectives</div>${q.obj.map((o, j) => `<div class="obj ${o.done ? 'done' : ''}"><input type="checkbox" data-k="quests.${i}.obj.${j}.done" ${o.done ? 'checked' : ''} data-rerender="1" aria-label="Done">
            ${I('quests.' + i + '.obj.' + j + '.t', o.t, 'placeholder="Objective"')}<button class="btn ghost sm" data-act="delObj" data-q="${q.id}" data-j="${j}" aria-label="Remove objective">✕</button></div>`).join('')}
          <button class="btn sm" style="margin-top:4px" data-act="addObj" data-q="${q.id}">Add objective</button></div>
        ${F('Notes', T('quests.' + i + '.note', q.note, 'rows="3" placeholder="Leads, deadlines, who to talk to…"'))}</div></div>`; }).join('');
  return `<div class="grid" style="gap:14px"><div class="row" style="justify-content:space-between"><span class="hint">${c.quests.filter(q => q.status === 'active').length} active · ${c.quests.filter(q => q.status === 'done').length} completed</span><button class="btn pri" data-act="addQuest">New quest</button></div>
    ${cards || '<div class="panel"><div class="empty">No quests tracked. <b>New quest</b> adds one with objectives you can tick off as the party progresses.</div></div>'}</div>`;
}

// ===================== LIBRARY TAB =====================
const LIBT = {item:'Items', feat:'Feats', spell:'Spells', ability:'Special abilities', condition:'Conditions'};
function renderLibrary(c){
  const sections = Object.entries(LIBT).map(([t, l]) => { const es = libEntries(t);
    return `<div class="splv row" style="justify-content:space-between"><span>${l} (${es.length})</span><button class="btn sm" data-act="libNew" data-t="${t}">New ${t === 'ability' ? 'ability' : t}</button></div>` +
      (es.map(e => `<div class="li" style="grid-template-columns:minmax(0,1fr) auto"><div>${refA('custom', e.id, e.n, 'custom')}<div class="hint">${esc(String(e.d || '').slice(0, 140))}${String(e.d || '').length > 140 ? '…' : ''}</div></div>
        <div class="row">${t === 'item' ? `<button class="btn sm pri" data-act="libGive" data-id="${e.id}">Add to ${esc(c.name.split(' ')[0] || 'character')}</button>` : ''}<button class="btn sm" data-act="libEdit" data-id="${e.id}">Edit</button></div></div>`).join('') || `<div class="empty" style="padding:10px">No custom ${l.toLowerCase()} yet.</div>`); }).join('');
  return panel('Custom library', `<p class="pb hint" style="margin:0;border-bottom:1px solid var(--rule-2)">Homebrew and campaign-specific entries. They're shared by all your characters and appear in every picker next to the SRD entries, with your description on hover.</p><div class="list">${sections}</div>`);
}
function openLibEditor(id, type, onDone){
  const e = id ? clone(libById(id)) : {id: uid('L'), t:type || 'item', n:'', d:''};
  const t = e.t;
  const extra = t === 'item' ? `<div class="fields">${F('Weight (lb.)', `<input type="number" id="le-w" step="0.25" min="0" value="${esc(e.w ?? '')}">`)}${F('Cost / value', `<input type="text" id="le-cost" value="${esc(e.cost || '')}" placeholder="e.g. 250 gp">`)}</div>`
    : t === 'spell' ? `<div class="fields">${F('Level', `<input type="text" id="le-lvl" value="${esc(e.lvl || '')}" placeholder="e.g. Sor/Wiz 2">`)}${F('School', `<input type="text" id="le-sch" value="${esc(e.sch || '')}">`)}${F('Duration', `<input type="text" id="le-dur" value="${esc(e.dur || '')}" placeholder="e.g. 1 min./level">`)}</div>`
    : t === 'feat' ? F('Prerequisites', `<input type="text" id="le-pre" value="${esc(e.pre || '')}">`) : '';
  const bg = openModal(`<div class="modal narrow" role="dialog"><div class="mh"><h3>${id ? 'Edit' : 'New'} custom ${t === 'ability' ? 'ability' : t}</h3><button class="btn ghost" data-close>Close</button></div>
    <div class="mform">${F('Name', `<input type="text" id="le-n" value="${esc(e.n)}" placeholder="Name">`)}${extra}${F('Description (shown on hover)', `<textarea id="le-d" rows="8">${esc(e.d || '')}</textarea>`)}</div>
    <div class="mfoot"><div class="confirm" id="le-delwrap">${id ? '<button class="btn ghost" id="le-del">Delete</button>' : ''}</div><div class="row"><button class="btn" data-close>Cancel</button><button class="btn pri" id="le-save">Save</button></div></div></div>`);
  $$('[data-close]', bg).forEach(b => b.addEventListener('click', closeModal));
  setTimeout(() => $('#le-n', bg).focus(), 30);
  $('#le-save', bg).addEventListener('click', () => {
    e.n = $('#le-n', bg).value.trim(); if (!e.n){ $('#le-n', bg).focus(); return; }
    e.d = $('#le-d', bg).value;
    if (t === 'item'){ e.w = num($('#le-w', bg).value); e.cost = $('#le-cost', bg).value; }
    if (t === 'spell'){ e.lvl = $('#le-lvl', bg).value; e.sch = $('#le-sch', bg).value; e.dur = $('#le-dur', bg).value; }
    if (t === 'feat'){ e.pre = $('#le-pre', bg).value; }
    const arr = APP.lib.entries; const ix = arr.findIndex(x => x.id === e.id); if (ix >= 0) arr[ix] = e; else arr.push(e);
    markLibDirty(); closeModal(); toast(`Saved <b>${esc(e.n)}</b> to your library`);
    if (onDone) onDone({name:e.n, type:'custom', key:e.id, lib:e}); renderAll();
  });
  const del = $('#le-del', bg); if (del) del.addEventListener('click', () => {
    $('#le-delwrap', bg).innerHTML = `<span class="hint">Delete for all characters?</span><button class="btn" id="le-del2" style="color:var(--bad)">Delete</button>`;
    $('#le-del2', bg).addEventListener('click', () => { APP.lib.entries = APP.lib.entries.filter(x => x.id !== e.id); markLibDirty(); closeModal(); renderAll(); });
  });
}
