// ===================== # MENTIONS IN NOTES =====================
// Type # in a note (or any linked text box) to pick an NPC, location, faction, player or map from a list.
// Picking one writes its exact name, which the normal name-linking then turns into a link.
const MENTION_KINDS = [
  {kind:'npc', label:'NPC', plural:'NPCs', words:['npc', 'npcs', 'person', 'people']},
  {kind:'loc', label:'Location', plural:'Locations', words:['location', 'locations', 'loc', 'place', 'places']},
  {kind:'fac', label:'Faction', plural:'Factions', words:['faction', 'factions', 'fac', 'guild', 'group']},
  {kind:'pc', label:'Player', plural:'Players', words:['player', 'players', 'pc', 'pcs', 'party']},
  {kind:'map', label:'Map', plural:'Maps', words:['map', 'maps']},
];
const MENTION_FIELDS = '.lt textarea, #wlog-new';
let MN = null; // {ta, start, end, items, sel}

function mentionEntries(c, kind){
  const arr = kind === 'map' ? (c.maps || []) : wArr(c, kind);
  return arr.filter(x => (x.n || '').trim()).map(x => ({type:'pick', kind, id:x.id, n:x.n.trim(),
    sub: kind === 'npc' ? [x.role, wName(c, 'loc', x.loc)].filter(Boolean).join(' · ') : kind === 'loc' ? [x.type, x.region].filter(Boolean).join(' · ')
      : kind === 'fac' ? x.type || '' : kind === 'pc' ? [x.race, x.cls].filter(Boolean).join(' ') : `${(x.pins || []).length} pins`}))
    .sort((a, b) => a.n.localeCompare(b.n));
}
const mWordStart = (name, q) => { const n = name.toLowerCase().replace(/^the\s+/, ''); return n.startsWith(q) || name.toLowerCase().includes(' ' + q) || name.toLowerCase().startsWith(q); };
function mentionItems(c, raw){
  const q = raw.toLowerCase().replace(/^\s+/, ''); const [w, ...restA] = q.split(/\s+/); const rest = restA.join(' ').trim();
  const cat = MENTION_KINDS.find(k => k.words.includes(w));
  if (cat && (q.endsWith(' ') || rest || q === w)){ // "#npc" or "#npc pri" → that list
    const list = mentionEntries(c, cat.kind).filter(e => !rest || mWordStart(e.n, rest));
    const out = [{type:'head', text: cat.plural + (rest ? ` matching “${rest}”` : '')}, ...list.slice(0, 40)];
    if (!list.length) out.push({type:'none', text: rest ? 'No match.' : `No ${cat.plural.toLowerCase()} yet.`});
    if (rest && cat.kind !== 'map' && !list.some(e => e.n.toLowerCase() === rest)) out.push({type:'new', kind:cat.kind, n: raw.trim().split(/\s+/).slice(1).join(' '), label:cat.label});
    return out;
  }
  const out = [];
  const cats = MENTION_KINDS.filter(k => !q || k.words.some(x => x.startsWith(q)));
  if (cats.length) out.push({type:'head', text:'Choose a list'}, ...cats.map(k => ({type:'cat', kind:k.kind, word:k.label, n:k.plural, sub: `${mentionEntries(c, k.kind).length}`})));
  if (q){ const names = MENTION_KINDS.flatMap(k => mentionEntries(c, k.kind).filter(e => mWordStart(e.n, q)).map(e => ({...e, sub: k.label + (e.sub ? ' · ' + e.sub : '')})));
    if (names.length) out.push({type:'head', text:'Names'}, ...names.slice(0, 20)); }
  return out.some(i => i.type === 'pick' || i.type === 'cat') ? out : [];
}
// where the # token is: from a # (at start or after a space/punctuation) up to the caret, on one line
function mentionToken(ta){
  const pos = ta.selectionStart; if (pos !== ta.selectionEnd) return null; const before = ta.value.slice(0, pos);
  const i = before.lastIndexOf('#'); if (i < 0 || pos - i > 40) return null; const tok = before.slice(i + 1);
  if (/[\n#]/.test(tok) || (i > 0 && /[\p{L}\p{N}]/u.test(before[i - 1]))) return null;
  return {start:i, end:pos, q:tok};
}
function caretXY(ta, pos){
  const cs = getComputedStyle(ta); const d = document.createElement('div');
  for (const p of ['boxSizing', 'width', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'borderTopWidth', 'borderLeftWidth', 'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'wordSpacing', 'textIndent', 'tabSize']) d.style[p] = cs[p];
  Object.assign(d.style, {position:'absolute', visibility:'hidden', whiteSpace:'pre-wrap', overflowWrap:'break-word', top:'0', left:'-9999px'});
  d.textContent = ta.value.slice(0, pos); const sp = document.createElement('span'); sp.textContent = '​'; d.appendChild(sp); document.body.appendChild(d);
  const r = ta.getBoundingClientRect(); const x = r.left + sp.offsetLeft - ta.scrollLeft, y = r.top + sp.offsetTop - ta.scrollTop + parseFloat(cs.lineHeight || 20);
  d.remove(); return {x, y};
}
function mentionClose(){ MN = null; const m = $('#mentionBox'); if (m) m.remove(); }
function mentionRender(){
  let box = $('#mentionBox'); if (!MN){ if (box) box.remove(); return; }
  if (!box){ box = document.createElement('div'); box.id = 'mentionBox'; box.className = 'mention'; box.setAttribute('role', 'listbox'); document.body.appendChild(box); }
  box.innerHTML = MN.items.map((it, i) => it.type === 'head' ? `<div class="mh2">${esc(it.text)}</div>` : it.type === 'none' ? `<div class="mfoot2">${esc(it.text)}</div>`
    : `<div class="mo ${i === MN.sel ? 'act' : ''}" role="option" data-mi="${i}">${it.type === 'new' ? `<b>＋</b> New ${esc(it.label === 'NPC' ? 'NPC' : it.label.toLowerCase())} “${esc(it.n)}”`
      : `<span class="pin-dot pin-${it.kind}">${esc((it.type === 'cat' ? it.word : it.n).slice(0, 1).toUpperCase())}</span><span>${esc(it.n)}</span>${it.sub ? `<span class="s">${esc(it.sub)}</span>` : ''}`}</div>`).join('')
    + `<div class="mfoot2">↑ ↓ to move · Enter to pick · Esc to close</div>`;
  const p = caretXY(MN.ta, MN.start); const w = box.offsetWidth, h = box.offsetHeight;
  box.style.left = Math.max(8, Math.min(p.x, innerWidth - w - 8)) + 'px';
  box.style.top = (p.y + h > innerHeight - 8 ? Math.max(8, p.y - h - 24) : p.y + 4) + 'px';
  const a = $('.mo.act', box); if (a) a.scrollIntoView({block:'nearest'});
}
function mentionUpdate(ta){
  const t = mentionToken(ta); const c = APP_cur(); if (!t || !c){ mentionClose(); return; }
  const items = mentionItems(c, t.q); if (!items.length){ mentionClose(); return; }
  const sel = items.findIndex(i => i.type === 'pick' || i.type === 'cat' || i.type === 'new');
  MN = {ta, ...t, items, sel: MN && MN.ta === ta && MN.items.length === items.length && items[MN.sel] && items[MN.sel].type !== 'head' ? MN.sel : sel}; mentionRender();
}
function mentionPick(i){
  const it = MN && MN.items[i]; if (!it || it.type === 'head' || it.type === 'none') return; const ta = MN.ta; const c = APP_cur();
  if (it.type === 'cat'){ ta.setRangeText('#' + it.word + ' ', MN.start, MN.end, 'end'); ta.dispatchEvent(new Event('input', {bubbles:true})); mentionUpdate(ta); return; }
  let name = it.n;
  if (it.type === 'new'){ const x = newWorld(it.kind); x.n = it.n; wArr(c, it.kind).push(x); toast(`Added the ${it.label === 'NPC' ? 'NPC' : it.label.toLowerCase()} <b>${esc(it.n)}</b>. Fill in the details on its page later.`); }
  ta.setRangeText(name + ' ', MN.start, MN.end, 'end'); mentionClose(); ta.dispatchEvent(new Event('input', {bubbles:true})); ta.focus();
}
document.addEventListener('input', e => { const ta = e.target; if (ta.matches && ta.matches(MENTION_FIELDS)) mentionUpdate(ta); });
document.addEventListener('click', e => { if (e.target.matches && e.target.matches(MENTION_FIELDS)) mentionUpdate(e.target); });
document.addEventListener('keydown', e => {
  if (!MN || e.target !== MN.ta) return; const pickable = MN.items.map((it, i) => ['pick', 'cat', 'new'].includes(it.type) ? i : -1).filter(i => i >= 0);
  const at = pickable.indexOf(MN.sel);
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp'){ e.preventDefault(); MN.sel = pickable[(at + (e.key === 'ArrowDown' ? 1 : pickable.length - 1)) % pickable.length]; mentionRender(); }
  else if (e.key === 'Enter' || e.key === 'Tab'){ if (MN.sel >= 0){ e.preventDefault(); mentionPick(MN.sel); } }
  else if (e.key === 'Escape'){ e.preventDefault(); e.stopPropagation(); mentionClose(); }
}, true);
document.addEventListener('mousedown', e => { const o = e.target.closest && e.target.closest('#mentionBox'); if (!o) return; e.preventDefault(); const mo = e.target.closest('[data-mi]'); if (mo) mentionPick(+mo.dataset.mi); });
document.addEventListener('focusout', e => { if (MN && e.target === MN.ta) setTimeout(() => { if (MN && document.activeElement !== MN.ta) mentionClose(); }, 0); });
window.addEventListener('scroll', () => { if (MN) mentionRender(); }, true);
