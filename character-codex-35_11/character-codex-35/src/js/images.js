// ===================== IMAGE STORE =====================
// Pictures (portraits, NPC/location pictures, maps) are kept apart from the character so a
// character never grows past the storage size limit. A character field holds a key like "img-abc";
// older saves that hold a "data:" URL still display and are moved into the store on load.
const IMG = {
  cache: {}, dirty: new Set(), gone: new Set(),
  key(){ return 'img-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); },
  put(data, key){ const k = key || IMG.key(); IMG.cache[k] = data; IMG.dirty.add(k); IMG.gone.delete(k); if (typeof scheduleSave === 'function') scheduleSave(); return k; },
  drop(k){ if (!k || String(k).startsWith('data:')) return; delete IMG.cache[k]; IMG.dirty.delete(k); IMG.gone.add(k); try { localStorage.removeItem('codex35-' + k); } catch {} },
  src(v){ if (!v) return ''; v = String(v); if (v.startsWith('data:')) return v;
    if (!(v in IMG.cache)){ try { const d = localStorage.getItem('codex35-' + v); if (d) IMG.cache[v] = d; } catch {} }
    return IMG.cache[v] || ''; },
  // move inline pictures out of a character into the store
  extract(c){
    let moved = false; const take = v => { if (v && String(v).startsWith('data:')){ moved = true; return IMG.put(v); } return v; };
    c.portrait = take(c.portrait);
    for (const k of ['players', 'npcs', 'locations', 'factions']) for (const x of c[k] || []) x.img = take(x.img);
    for (const m of c.maps || []) m.img = take(m.img);
    return moved;
  },
  keysOf(c){ const ks = [c.portrait]; for (const k of ['players', 'npcs', 'locations', 'factions']) for (const x of c[k] || []) ks.push(x.img); for (const m of c.maps || []) ks.push(m.img);
    return ks.filter(k => k && !String(k).startsWith('data:')); },
  saveLocal(){ for (const k of IMG.dirty){ try { localStorage.setItem('codex35-' + k, IMG.cache[k]); } catch {} } },
};
