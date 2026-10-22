// ===================== IMAGE STORE =====================
// Pictures (portraits, NPC/location pictures, maps) are kept apart from the character so a
// character never grows past the storage size limit. A character field holds a key like "img-abc";
// older saves that hold a "data:" URL still display and are moved into the store on load.
// Pictures are kept in IndexedDB (room for big maps); older copies in localStorage are moved over on start-up.
const IDB = {
  db: null,
  open(){ if (IDB.db) return IDB.db; return IDB.db = new Promise((res, rej) => { try { const r = indexedDB.open('codex35', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('img'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); } catch (e){ rej(e); } }); },
  async run(mode, fn){ const db = await IDB.open(); return new Promise((res, rej) => { const tx = db.transaction('img', mode); const out = fn(tx.objectStore('img')); tx.oncomplete = () => res(out && out.result); tx.onerror = () => rej(tx.error); }); },
  put: (k, v) => IDB.run('readwrite', st => { st.put(v, k); }),
  del: k => IDB.run('readwrite', st => { st.delete(k); }),
  async all(){ const db = await IDB.open(); return new Promise((res, rej) => { const out = {}; const rq = db.transaction('img').objectStore('img').openCursor();
    rq.onsuccess = () => { const cur = rq.result; if (cur){ out[cur.key] = cur.value; cur.continue(); } else res(out); }; rq.onerror = () => rej(rq.error); }); },
};
const IMG = {
  cache: {}, dirty: new Set(), gone: new Set(),
  key(){ return 'img-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); },
  put(data, key){ const k = key || IMG.key(); IMG.cache[k] = data; IMG.dirty.add(k); IMG.gone.delete(k); if (typeof scheduleSave === 'function') scheduleSave(); return k; },
  drop(k){ if (!k || String(k).startsWith('data:')) return; delete IMG.cache[k]; IMG.dirty.delete(k); IMG.gone.add(k); try { localStorage.removeItem('codex35-' + k); } catch {} IDB.del(k).catch(() => {}); },
  src(v){ if (!v) return ''; v = String(v); if (v.startsWith('data:')) return v;
    if (!(v in IMG.cache)){ try { const d = localStorage.getItem('codex35-' + v); if (d) IMG.cache[v] = d; } catch {} }
    return IMG.cache[v] || ''; },
  // move inline pictures out of a character into the store
  extract(c){
    let moved = false; const take = v => { if (v && String(v).startsWith('data:')){ moved = true; return IMG.put(v); } return v; };
    c.portrait = take(c.portrait);
    for (const k of ['players', 'npcs', 'locations', 'factions', 'companions']) for (const x of c[k] || []) x.img = take(x.img);
    for (const m of c.maps || []) m.img = take(m.img);
    for (const x of c.companions || []) x.img = take(x.img);
    return moved;
  },
  keysOf(c){ const ks = [c.portrait]; for (const k of ['players', 'npcs', 'locations', 'factions', 'companions']) for (const x of c[k] || []) ks.push(x.img); for (const m of c.maps || []){ ks.push(m.img); if (m.tiles) ks.push(...(m.tiles.keys || [])); }
    return ks.filter(k => k && !String(k).startsWith('data:')); },
  saveLocal(){ const pairs = [...IMG.dirty].filter(k => IMG.cache[k]).map(k => [k, IMG.cache[k]]); if (!pairs.length) return;
    Promise.all(pairs.map(([k, v]) => IDB.put(k, v))).catch(() => { for (const [k, v] of pairs){ try { localStorage.setItem('codex35-' + k, v); } catch {} } }); },
  // load every stored picture, and move old localStorage copies into IndexedDB
  async loadLocal(){
    try { const all = await IDB.all(); for (const [k, v] of Object.entries(all)) if (!(k in IMG.cache) && !IMG.gone.has(k)) IMG.cache[k] = v;
      const old = []; for (let i = 0; i < localStorage.length; i++){ const k = localStorage.key(i); if (k && k.startsWith('codex35-img-')) old.push(k); }
      for (const lk of old){ const k = lk.slice(8), v = localStorage.getItem(lk); if (!(k in IMG.cache)) IMG.cache[k] = v; await IDB.put(k, v); localStorage.removeItem(lk); }
    } catch {}
  },
};
