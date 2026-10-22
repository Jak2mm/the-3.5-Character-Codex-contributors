// ===================== RULES LOOKUP TAB =====================
const RULES = SRD.rules || [], CHAPTERS = SRD.chapters || [];
let rulesText = null; // lazily built plain-text index
function rulesIndex(){
  if (!rulesText){ const div = document.createElement('div');
    rulesText = RULES.map(r => { div.innerHTML = r.d.replace(/<\/?(td|th|tr|p|li|br|h\d)[^>]*>/g, ' $& '); return (r.h + ' \n ' + div.textContent).replace(/\s+/g, ' ').toLowerCase(); }); }
  return rulesText;
}
const R_PREF = 'codex35-rules';
(() => { const p = lsGet(R_PREF); if (p){ APP.rq = p.q || ''; APP.rsec = p.s ?? null; } })();
function saveRulesPref(){ lsSet(R_PREF, {q: APP.rq || '', s: APP.rsec}); }
function rTokens(q){ return q.toLowerCase().split(/\s+/).filter(t => t.length > 1 || /\d/.test(t)); }
function rBreadcrumb(i){
  const r = RULES[i]; const trail = []; let lv = r.l;
  for (let j = i - 1; j >= 0 && RULES[j].c === r.c && lv > 1; j--){ if (RULES[j].l < lv){ trail.unshift(RULES[j].h); lv = RULES[j].l; } }
  return [CHAPTERS[r.c], ...trail.filter(h => h !== CHAPTERS[r.c])];
}

function renderRules(c){
  return `<div class="rules-grid">
    <aside class="panel rules-side"><div class="ph"><h2>Rules lookup</h2><div class="tools"><span class="hint">Press <kbd>/</kbd> to search</span></div></div>
      <div class="pb" style="border-bottom:1px solid var(--rule-2)"><input type="search" id="rq" placeholder="Search the rules (e.g. grapple, flanking, cover)…" value="${esc(APP.rq || '')}" autocomplete="off" aria-label="Search rules"></div>
      <div class="rules-list" id="rulesList">${rulesSide()}</div></aside>
    <section class="panel rules-read" id="rulesRead">${rulesReader()}</section></div>`;
}
function rulesSide(){
  const q = (APP.rq || '').trim();
  if (!q){ // table of contents
    const cur = APP.rsec != null && RULES[APP.rsec] ? RULES[APP.rsec].c : -1;
    return `<a href="#" class="toc l1 prc-link ${APP.rsec === -1 ? 'act' : ''}" data-rsec="-1">Prestige (specialised) classes — requirements</a><div class="splv">Chapters</div>` + CHAPTERS.map((ch, ci) => {
      const items = RULES.map((r, i) => [r, i]).filter(([r]) => r.c === ci && r.l <= 3);
      return `<details ${ci === cur ? 'open' : ''}><summary>${esc(ch)}</summary>${items.map(([r, i]) => `<a href="#" class="toc l${r.l} ${i === APP.rsec ? 'act' : ''}" data-rsec="${i}">${esc(r.l === 1 ? 'Introduction' : r.h)}</a>`).join('')}</details>`; }).join('');
  }
  const toks = rTokens(q); if (!toks.length) return '<div class="empty">Type at least two letters.</div>';
  // quick matches: spells, feats, conditions, skills, items, class features
  const ql = q.toLowerCase(); const quick = [];
  const addQ = (type, name, label, kind) => { if (quick.length < 14) quick.push(`<span class="qchip">${refA(type, name, label)} <span class="pill">${kind}</span></span>`); };
  SRD.conditions.forEach(x => x.n.toLowerCase().includes(ql) && addQ('cond', x.n, x.n, 'condition'));
  SRD.skills.forEach(x => x.n.toLowerCase().includes(ql) && addQ('skill', x.n, x.n, 'skill'));
  SRD.feats.forEach(x => x.n.toLowerCase().includes(ql) && addQ('feat', x.n, x.n, 'feat'));
  SRD.spells.forEach(x => x.n.toLowerCase().includes(ql) && addQ('spell', x.n, x.n, 'spell'));
  SRD.classes.forEach(k => k.f.forEach(f => f.n.toLowerCase().includes(ql) && addQ('feature', k.n + '|' + f.n, f.n, k.n.toLowerCase())));
  ['weapons', 'armor', 'gear', 'magic'].forEach(t => SRD[t].forEach(x => x.n.toLowerCase().includes(ql) && addQ('item', x.n, x.n, 'item')));
  libEntries().forEach(e => e.n.toLowerCase().includes(ql) && addQ('custom', e.id, e.n, 'custom'));
  // rule sections, scored
  const idx = rulesIndex(); const hits = [];
  idx.forEach((t, i) => { if (!toks.every(k => t.includes(k))) return; const h = RULES[i].h.toLowerCase();
    let s = 0; toks.forEach(k => { if (h.includes(k)) s += 25; if (h === ql) s += 60; let p = -1, n = 0; while ((p = t.indexOf(k, p + 1)) >= 0 && n < 20) n++; s += n; });
    if (h.startsWith(ql)) s += 30; hits.push([s, i]); });
  hits.sort((a, b) => b[0] - a[0]);
  const snip = i => { const t = idx[i]; const k = toks[0]; let p = t.indexOf(k, RULES[i].h.length); if (p < 0) p = 0;
    const a = Math.max(0, p - 60); let s = (a ? '…' : '') + t.slice(a, p + 110) + '…';
    s = esc(s); toks.forEach(k => { s = s.replace(new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), m => `<mark>${m}</mark>`); }); return s; };
  return (quick.length ? `<div class="splv">Quick matches</div><div class="qchips">${quick.join('')}</div>` : '') +
    `<div class="splv">${hits.length} rule section${hits.length === 1 ? '' : 's'}</div>` +
    (hits.slice(0, 60).map(([, i]) => `<a href="#" class="rhit ${i === APP.rsec ? 'act' : ''}" data-rsec="${i}"><b>${esc(RULES[i].h)}</b><span class="hint">${esc(rBreadcrumb(i).join(' › '))}</span><span class="sn">${snip(i)}</span></a>`).join('')
      || '<div class="empty">No rules text matches every word. Try fewer or different words.</div>');
}
function rulesReader(){
  const i = APP.rsec; if (i === -1) return prcOverview(APP_cur());
  if (i == null || !RULES[i]) return `<div class="pb rules-welcome"><h3>Look up any rule</h3>
    <p class="hint">Search the System Reference Document by keyword, or browse the chapters on the left. Quick matches link straight to spells, feats, conditions, skills and items.</p>
    <div class="splv" style="margin-top:12px">Common lookups</div><div class="qchips">${['Attacks of Opportunity', 'Flanking', 'Grapple', 'Cover', 'Concealment', 'Charge', 'Full Attack', 'Two-Weapon Fighting', 'Concentration', 'Turn or Rebuke Undead', 'Death, Dying, and Healing', 'Carrying Capacity', 'Saving Throw'].map(h => { const j = RULES.findIndex(r => r.h.toLowerCase() === h.toLowerCase()) ; return j < 0 ? '' : `<a href="#" class="btn sm" data-rsec="${j}">${esc(h)}</a>`; }).join('')}</div></div>`;
  const r = RULES[i]; let html = `<div class="rt">${r.d}</div>`;
  for (let j = i + 1; j < RULES.length && RULES[j].c === r.c && RULES[j].l > r.l; j++){
    const lv = Math.min(4, RULES[j].l - r.l + 2); html += `<h${lv} class="rh">${esc(RULES[j].h)}</h${lv}><div class="rt">${RULES[j].d}</div>`; }
  let prev = null, next = null;
  for (let j = i - 1; j >= 0; j--) if (RULES[j].l <= 3){ prev = j; break; }
  for (let j = i + 1; j < RULES.length; j++) if (RULES[j].l <= Math.max(3, r.l)){ next = j; break; }
  return `<div class="ph"><h2>${esc(r.l === 1 ? CHAPTERS[r.c] : r.h)}</h2><div class="tools">
      ${prev != null ? `<button class="btn sm" data-rsec="${prev}" title="${esc(RULES[prev].h)}">‹ Prev</button>` : ''}${next != null ? `<button class="btn sm" data-rsec="${next}" title="${esc(RULES[next].h)}">Next ›</button>` : ''}</div></div>
    <div class="pb"><div class="crumb">${rBreadcrumb(i).map(esc).join(' <span>›</span> ')}</div><div class="rules-body">${html}</div>
    <p class="hint" style="margin-top:16px">System Reference Document v3.5 · Open Game Content</p></div>`;
}
function highlightReader(){
  const toks = rTokens(APP.rq || ''); const root = $('#rulesRead .rules-body'); if (!root || !toks.length) return;
  const re = new RegExp('(' + toks.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')', 'gi');
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); const nodes = []; let n;
  while ((n = walker.nextNode())) if (re.test(n.nodeValue)) nodes.push(n);
  for (const node of nodes){ const span = document.createElement('span'); span.innerHTML = esc(node.nodeValue).replace(re, '<mark>$1</mark>'); node.replaceWith(...span.childNodes); }
  const first = root.querySelector('mark'); if (first) first.scrollIntoView({block:'center'});
}
function openRuleSection(i){
  APP.rsec = i; saveRulesPref();
  const rd = $('#rulesRead'); if (!rd){ APP.tab = 'rules'; renderAll(); return; }
  rd.innerHTML = rulesReader(); $$('#rulesList [data-rsec]').forEach(a => a.classList.toggle('act', +a.dataset.rsec === i));
  if ((APP.rq || '').trim()) highlightReader(); else rd.scrollIntoView({block:'start'});
  if (matchMedia('(max-width: 860px)').matches) rd.scrollIntoView({block:'start'});
}
let rqTimer = null;
document.addEventListener('input', e => { if (e.target.id !== 'rq') return; APP.rq = e.target.value; clearTimeout(rqTimer);
  rqTimer = setTimeout(() => { const l = $('#rulesList'); if (l){ l.innerHTML = rulesSide(); l.scrollTop = 0; } saveRulesPref(); }, 160); });
document.addEventListener('keydown', e => { if (e.target.id === 'rq' && e.key === 'Enter'){ const a = $('#rulesList .rhit'); if (a) openRuleSection(+a.dataset.rsec); } });
document.addEventListener('click', e => { const a = e.target.closest('[data-rsec]'); if (!a) return; e.preventDefault(); openRuleSection(+a.dataset.rsec); });
document.addEventListener('keydown', e => {
  if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return; if (e.target.closest('input,textarea,select,[contenteditable]')) return;
  e.preventDefault(); if (APP.tab !== 'rules'){ APP.tab = 'rules'; renderAll(); } const q = $('#rq'); if (q){ q.focus(); q.select(); }
});
function lookupRules(q){ APP.rq = q; APP.tab = 'rules'; closeModal(); saveRulesPref(); renderAll(); const l = $('#rq'); if (l) l.focus(); }
