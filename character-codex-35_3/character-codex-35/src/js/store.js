// ===================== APP STATE & PERSISTENCE =====================
const LS_KEY = 'codex35-v1';
const APP = {chars:{}, lib:{entries:[]}, curId:null, tab:'sheet', mode:'local', db:null, uid:null, dirty:new Set(), libDirty:false, writing:{}, remoteQueue:null};
function APP_cur(){ return APP.chars[APP.curId]; }
function charList(){ return Object.values(APP.chars).sort((a, b) => a.name.localeCompare(b.name)); }

function migrate(c){ // fill missing fields from defaults so older saves keep working
  const d = newChar(c.name);
  for (const k of Object.keys(d)) if (c[k] === undefined) c[k] = d[k];
  for (const a of ABIL) c.abil[a] = Object.assign({base:10, enh:0, temp:0}, c.abil[a] || {});
  for (const s of ['Fort','Ref','Will']){ c.saves[s] = Object.assign({magic:0, misc:0, temp:0}, c.saves[s] || {}); if (num(c.saves[s].magic)){ c.saves[s].misc = num(c.saves[s].misc) + num(c.saves[s].magic); c.saves[s].magic = 0; } }
  c.combat = Object.assign({round:0, turn:0, list:[]}, c.combat || {});
  return c;
}

let saveTimer = null;
function markDirty(id = APP.curId){ if (!id) return; const c = APP.chars[id]; if (c) c.updatedAt = Date.now(); APP.dirty.add(id); scheduleSave(); }
function markLibDirty(){ APP.lib.updatedAt = Date.now(); APP.libDirty = true; scheduleSave(); }
function scheduleSave(){ setSync('busy', 'Saving…'); clearTimeout(saveTimer); saveTimer = setTimeout(flush, 700); }
async function flush(){
  const ids = [...APP.dirty]; APP.dirty.clear(); const lib = APP.libDirty; APP.libDirty = false;
  // local mirror is always written (fast, survives offline)
  lsSet(LS_KEY, {chars:APP.chars, lib:APP.lib, curId:APP.curId});
  if (APP.mode !== 'db'){ setSync('local', 'Saved in this browser'); return; }
  try {
    for (const id of ids){ if (APP.chars[id]) await writeDoc(id, APP.chars[id]); }
    if (lib) await writeDoc('library', APP.lib);
    await writeDoc('prefs', {curId: APP.curId});
    setSync('ok', 'Synced');
  } catch (e){
    const code = e && e.code;
    if (code === 'quota_exceeded') toast('Your saved data is full. Delete an old character or long notes to free space.', 'warn');
    else if (code === 'invalid_argument') { toast('This copy can\'t save online (view-only access). Changes are kept in this browser.', 'warn'); APP.mode = 'local'; }
    else { ids.forEach(i => APP.dirty.add(i)); if (lib) APP.libDirty = true; setTimeout(flush, 4000); }
    setSync('local', code === 'invalid_argument' ? 'This browser only' : 'Retrying…');
  }
}
async function writeDoc(id, data){
  const prev = APP.writing[id] || Promise.resolve();
  const p = prev.catch(() => {}).then(() => APP.db.collection('data/users/' + APP.uid).doc(id).set(clone(data)));
  APP.writing[id] = p; return p;
}
async function removeDoc(id){ if (APP.mode === 'db'){ try { await APP.db.collection('data/users/' + APP.uid).doc(id).delete(); } catch {} } }
function setSync(cls, txt){ const s = $('#sync'); if (!s) return; s.className = 'sync ' + cls; s.textContent = txt; }

function loadLocal(){
  const L = lsGet(LS_KEY);
  if (L && L.chars && Object.keys(L.chars).length){ APP.chars = L.chars; APP.lib = L.lib || {entries:[]}; APP.curId = L.curId; }
  for (const id in APP.chars) migrate(APP.chars[id]);
  if (!APP.chars[APP.curId]) APP.curId = (charList()[0] || {}).id || null;
}

async function connectDb(){
  if (!window.claude || !window.claude.use){ setSync('local', 'Saved in this browser'); return; }
  let db = null, user = null;
  try { [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]); } catch {}
  const id = user ? await user.id().catch(() => null) : null;
  if (!db || !id){ setSync('local', 'This browser only'); return; }
  APP.db = db; APP.uid = id;
  const col = db.collection('data/users/' + id);
  let first = true;
  col.onSnapshot(snap => {
    const remote = {}; let lib = null, prefs = null;
    for (const d of snap.docs){ const v = d.data(); if (!v) continue;
      if (d.id === 'library') lib = v; else if (d.id === 'prefs') prefs = v; else if (d.id.startsWith('c-')) remote[d.id] = clone(v); }
    if (first){
      if (snap.metadata && snap.metadata.fromCache && snap.empty) return; // wait for the server's answer
      first = false; APP.mode = 'db';
      if (!Object.keys(remote).length){
        // empty online store: upload whatever this browser has (or the example)
        if (!Object.keys(APP.chars).length){ const ex = exampleChar(); APP.chars[ex.id] = ex; APP.curId = ex.id; }
        Object.keys(APP.chars).forEach(cid => APP.dirty.add(cid)); APP.libDirty = true; flush(); renderAll(); return;
      }
      APP.chars = {}; for (const k in remote) APP.chars[k] = migrate(remote[k]);
      if (lib) APP.lib = clone(lib);
      APP.curId = (prefs && APP.chars[prefs.curId]) ? prefs.curId : (APP.chars[APP.curId] ? APP.curId : charList()[0].id);
      setSync('ok', 'Synced'); renderAll(); return;
    }
    // live updates from another device / tab
    if (snap.metadata && snap.metadata.hasPendingWrites) return;
    let changedCur = false, changedList = false;
    for (const k in remote){ const loc = APP.chars[k];
      if (!loc){ APP.chars[k] = migrate(remote[k]); changedList = true; continue; }
      if (APP.dirty.has(k)) continue;
      if ((remote[k].updatedAt || 0) > (loc.updatedAt || 0)){ APP.chars[k] = migrate(remote[k]); if (k === APP.curId) changedCur = true; else changedList = true; }
    }
    for (const k in APP.chars){ if (!remote[k] && !APP.dirty.has(k) && k !== APP.curId){ delete APP.chars[k]; changedList = true; } }
    if (lib && !APP.libDirty && (lib.updatedAt || 0) > (APP.lib.updatedAt || 0)){ APP.lib = clone(lib); changedList = true; }
    if (changedCur){ const ae = document.activeElement; if (ae && ae.matches('input,textarea,select') && $('#main').contains(ae)) APP.remoteQueue = true; else renderAll(); }
    else if (changedList) renderCharBar();
  }, err => { setSync('local', 'This browser only'); APP.mode = 'local'; });
}
document.addEventListener('focusout', () => { if (APP.remoteQueue){ setTimeout(() => { const ae = document.activeElement; if (!(ae && ae.matches('input,textarea,select'))){ APP.remoteQueue = null; renderAll(); } }, 50); } });
