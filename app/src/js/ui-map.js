// ===================== MAPS =====================
// c.maps = [{id, n, img (image key), pins:[{id, kind:'loc'|'npc'|'fac'|'pc', ref, x, y}]}]  (x, y in % of the image)
APP.mapZoom = 100; APP.mapEdit = false; APP.placing = null; APP.pinKind = 'loc';
const PIN_KINDS = [['loc', 'Locations'], ['npc', 'NPCs'], ['fac', 'Factions'], ['pc', 'Players']];

// Maps are kept at up to 4096 px on the long side, cut into 1024 px tiles (each stored picture must stay
// under ~256 KB), plus a small thumbnail for the list. On screen the tiles are drawn onto one canvas.
const MAP_MAX = 4096, MAP_TILE = 1024;
async function mapImageFromFile(file){
  const url = URL.createObjectURL(file); const img = new Image(); img.src = url; await img.decode();
  const sc = Math.min(1, MAP_MAX / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.round(img.naturalWidth * sc), h = Math.round(img.naturalHeight * sc); const cols = Math.ceil(w / MAP_TILE), rows = Math.ceil(h / MAP_TILE);
  const cv = document.createElement('canvas'), ctx = cv.getContext('2d'); ctx.imageSmoothingQuality = 'high'; const data = [];
  for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++){
    const tw = Math.min(MAP_TILE, w - k * MAP_TILE), th = Math.min(MAP_TILE, h - r * MAP_TILE); cv.width = tw; cv.height = th;
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, tw, th); ctx.drawImage(img, k * MAP_TILE / sc, r * MAP_TILE / sc, tw / sc, th / sc, 0, 0, tw, th);
    let q = .92, d = cv.toDataURL('image/jpeg', q); while (d.length > 235000 && q > .45){ q -= .07; d = cv.toDataURL('image/jpeg', q); } data.push(d);
  }
  URL.revokeObjectURL(url); const thumb = await imageToDataURL(file, 360);
  return {thumb, tiles:{w, h, ts:MAP_TILE, cols, rows}, data};
}
function mapStore(m, pic){ mapDrop(m); m.img = IMG.put(pic.thumb); m.tiles = {...pic.tiles, keys: pic.data.map(d => IMG.put(d))}; }
function mapDrop(m){ IMG.drop(m.img); for (const k of (m.tiles && m.tiles.keys) || []) IMG.drop(k); m.img = ''; delete m.tiles; }
const mapReady = m => m.tiles && (m.tiles.keys || []).every(k => IMG.src(k));
function mapPicture(m){
  if (mapReady(m)){ const T = m.tiles; setTimeout(() => drawMapCanvas(m), 0);
    return `<canvas id="mapCanvas" width="${T.w}" height="${T.h}" role="img" aria-label="${esc(m.n)}" style="background:url('${IMG.src(m.img)}') center/100% 100% no-repeat"></canvas>`; }
  if (m.img && IMG.src(m.img)) return `<img src="${IMG.src(m.img)}" alt="${esc(m.n)}" draggable="false">`;
  return '';
}
const MAP_TILE_IMG = {}; // decoded tiles, so re-renders redraw instantly
function drawMapCanvas(m){
  const cv = $('#mapCanvas'); if (!cv) return; const ctx = cv.getContext('2d'); const T = m.tiles;
  T.keys.forEach((k, i) => { const x = (i % T.cols) * T.ts, y = Math.floor(i / T.cols) * T.ts;
    let im = MAP_TILE_IMG[k]; const paint = () => { if (cv.isConnected) ctx.drawImage(im, x, y); };
    if (im && im.complete && im.naturalWidth) paint(); else { if (!im){ im = MAP_TILE_IMG[k] = new Image(); im.src = IMG.src(k); } im.addEventListener('load', paint, {once:true}); } });
}
function curMap(c){ c.maps = c.maps || []; return c.maps.find(m => m.id === APP.mapSel) || c.maps[0] || null; }
function pinTarget(c, p){ return wArr(c, p.kind).find(x => x.id === p.ref); }
function renderMaps(c){
  const m = curMap(c); if (m) APP.mapSel = m.id;
  const list = c.maps.map(x => `<a href="#" class="w-item ${m && x.id === m.id ? 'act' : ''}" data-mapsel="${x.id}">${x.img ? `<img src="${IMG.src(x.img)}" alt="">` : '<span class="w-ph">M</span>'}
      <span class="w-t"><b>${esc(x.n || 'Untitled map')}</b><span class="hint">${(x.pins || []).length} pin${(x.pins || []).length === 1 ? '' : 's'}</span></span></a>`).join('') || '<div class="empty" style="padding:10px">No maps yet.</div>';
  const kind = APP.pinKind; const onMap = new Set(m ? (m.pins || []).filter(p => p.kind === kind).map(p => p.ref) : []);
  const ents = wArr(c, kind).slice().sort((a, b) => (a.n || '').localeCompare(b.n || ''));
  const pal = m ? `<div class="splv">Pin to this map</div>
      <div class="seg" role="tablist">${PIN_KINDS.map(([k, l]) => `<button class="${k === kind ? 'on' : ''}" data-pinkind="${k}">${l}</button>`).join('')}</div>
      <p class="hint" style="margin:6px 10px">Drag one onto the map, or tap it and then tap the map.</p>
      <div class="pin-src">${ents.map(x => `<div class="w-item pin-drag ${APP.placing === kind + ':' + x.id ? 'act' : ''}" draggable="true" data-pinsrc="${kind}:${x.id}" title="Drag onto the map">
          <span class="pin-dot pin-${kind}">${esc((x.n || '?').slice(0, 1).toUpperCase())}</span><span class="w-t"><b>${esc(x.n || 'Unnamed')}</b></span>${onMap.has(x.id) ? '<span class="pill good">on map</span>' : ''}</div>`).join('')
        || `<div class="empty" style="padding:10px">No ${PIN_KINDS.find(k => k[0] === kind)[1].toLowerCase()} yet.<br><button class="btn sm" data-act="wNew" data-kind="${kind}">Add one</button></div>`}</div>` : '';
  const pins = m ? (m.pins || []).map(p => { const x = pinTarget(c, p); if (!x) return '';
      return `<span class="pin pin-${p.kind} ${APP.mapEdit ? 'editing' : ''}" style="left:${p.x}%;top:${p.y}%" data-ref="world" data-name="${p.kind}:${x.id}" data-pin="${p.id}" tabindex="0">
        <span class="pin-dot pin-${p.kind}"><span>${esc((x.n || '?').slice(0, 1).toUpperCase())}</span></span><span class="pin-l">${esc(x.n || 'Unnamed')}</span>${APP.mapEdit ? `<button class="pin-x" data-unpin="${p.id}" aria-label="Remove pin">✕</button>` : ''}</span>`; }).join('') : '';
  const main = m ? `<div class="ph"><h2>${esc(m.n || 'Untitled map')}</h2><div class="tools">
        <button class="btn sm" data-mapzoom="-1" aria-label="Zoom out">−</button><span class="hint" id="mapZoomLbl" style="min-width:42px;text-align:center">${APP.mapZoom}%</span><button class="btn sm" data-mapzoom="1" aria-label="Zoom in">+</button><button class="btn sm" data-mapzoom="0">Fit</button>
        <button class="btn sm ${APP.mapEdit ? 'pri' : ''}" data-act="mapEdit">${APP.mapEdit ? 'Done moving' : 'Move / remove pins'}</button></div></div>
      ${APP.placing ? `<div class="pb place-bar"><b>Tap the map</b> to place ${esc((pinTarget(c, {kind:APP.placing.split(':')[0], ref:APP.placing.split(':')[1]}) || {}).n || '')}. <button class="btn sm ghost" data-act="cancelPlace">Cancel</button></div>` : ''}
      <div class="map-vp" id="mapVp"><div class="map-stage ${APP.placing ? 'placing' : ''} ${APP.mapZoom > 100 ? 'zoomed' : ''}" id="mapStage" style="width:${APP.mapZoom}%">
        ${mapPicture(m) || `<label for="mapFile-${m.id}" class="map-empty"><b>Add the map picture</b><span class="hint">A JPG or PNG of your campaign map, city plan or dungeon</span></label>`}
        ${pins}</div></div>
      <div class="pb row" style="justify-content:space-between;border-top:1px solid var(--rule-2)">
        <div class="row">${F('Map name', I(`maps.${c.maps.indexOf(m)}.n`, m.n, 'data-rerender="1"'))}</div>
        <div class="row"><label for="mapFile-${m.id}" class="btn sm">${m.img ? 'Replace picture' : 'Add picture'}</label><input type="file" accept="image/*" hidden id="mapFile-${m.id}" data-mapfile="${m.id}">
          <button class="btn ghost sm" data-act="mapDel" data-id="${m.id}">Delete map</button></div></div>
      ${m.img && !m.tiles ? `<p class="hint pb" style="margin:0;padding-top:0;color:var(--warn)">This map was saved at the old, lower quality. Use <b>Replace picture</b> with the original file to store it in high resolution; your pins stay where they are.</p>` : ''}
      <p class="hint pb" style="margin:0;padding-top:0">Scroll the mouse wheel to zoom and drag the map to move around (on a phone, pinch and swipe). Hover a pin to see what you know; click it for the full card.</p>`
    : `<div class="empty"><b>No maps yet.</b><br>Upload a world map, city plan or dungeon map, then drop your locations, NPCs, factions and party members onto it.<br><br><label for="mapNewFile" class="btn pri">Upload a map</label></div>`;
  return `<div class="w-grid map-grid"><aside class="panel w-side"><div class="ph"><h2>Maps</h2><div class="tools"><label for="mapNewFile" class="btn sm pri">New map</label></div></div>
      <input type="file" accept="image/*" hidden id="mapNewFile">
      <div class="map-list">${list}</div>${pal}</aside>
    <section class="panel w-main">${main}</section></div>`;
}
function stagePos(e){ const st = $('#mapStage'); const r = st.getBoundingClientRect(); const pt = e.touches ? e.touches[0] : e;
  return {x: Math.max(0, Math.min(100, (pt.clientX - r.left) / r.width * 100)), y: Math.max(0, Math.min(100, (pt.clientY - r.top) / r.height * 100))}; }
function addPin(c, key, pos){
  const m = curMap(c); if (!m) return; const [kind, ref] = key.split(':'); m.pins = m.pins || [];
  const ex = m.pins.find(p => p.kind === kind && p.ref === ref);
  const x = Math.round(pos.x * 10) / 10, y = Math.round(pos.y * 10) / 10;
  if (ex){ ex.x = x; ex.y = y; } else m.pins.push({id:uid('pin'), kind, ref, x, y});
  APP.placing = null; markDirty(); renderAll();
}
function openPinCard(key){
  const r = worldRef(key); if (!r) return; const [kind, id] = key.split(':');
  const bg = openModal(`<div class="modal narrow" role="dialog" aria-label="${esc(r.title)}"><div class="mh"><h3>${esc(r.title)}</h3><button class="btn ghost" data-close>Close</button></div>
    <div class="mprev"><p class="hint" style="margin-top:0">${esc({npc:'NPC', loc:'Location', fac:'Faction', pc:'Player character'}[kind])}</p>${r.html}</div>
    <div class="mfoot"><span></span><button class="btn pri" id="pinOpen">Open full page</button></div></div>`);
  $('#pinOpen', bg).addEventListener('click', () => jumpWorld(key));
}
// ---- events ----
document.addEventListener('click', e => {
  const t = e.target;
  const ms = t.closest('[data-mapsel]'); if (ms){ e.preventDefault(); APP.mapSel = ms.dataset.mapsel; APP.placing = null; renderAll(); return; }
  const pk = t.closest('[data-pinkind]'); if (pk){ APP.pinKind = pk.dataset.pinkind; renderAll(); return; }
  const z = t.closest('[data-mapzoom]'); if (z){ const d = +z.dataset.mapzoom; const vp = $('#mapVp'); const r = vp && vp.getBoundingClientRect();
    setMapZoom(d === 0 ? 100 : APP.mapZoom * (d > 0 ? 1.25 : 0.8), r ? r.left + r.width / 2 : 0, r ? r.top + r.height / 2 : 0); return; }
  const un = t.closest('[data-unpin]'); if (un){ e.stopPropagation(); const c = APP_cur(); const m = curMap(c); m.pins = m.pins.filter(p => p.id !== un.dataset.unpin); markDirty(); renderAll(); return; }
  const src = t.closest('[data-pinsrc]'); if (src && !t.closest('[data-act]')){ APP.placing = APP.placing === src.dataset.pinsrc ? null : src.dataset.pinsrc; renderAll(); return; }
  const pin = t.closest('.pin'); if (pin && !APP.mapEdit){ hideTip(); openPinCard(pin.dataset.name); return; }
  const st = t.closest('#mapStage'); if (st && APP.placing && !pin){ addPin(APP_cur(), APP.placing, stagePos(e)); return; }
});
document.addEventListener('keydown', e => { const pin = e.target.closest && e.target.closest('.pin'); if (pin && e.key === 'Enter' && !APP.mapEdit) openPinCard(pin.dataset.name); });
document.addEventListener('dragstart', e => { const s = e.target.closest && e.target.closest('[data-pinsrc]'); if (s){ e.dataTransfer.setData('text/plain', 'pin:' + s.dataset.pinsrc); e.dataTransfer.effectAllowed = 'copy'; } });
document.addEventListener('dragover', e => { if (e.target.closest && e.target.closest('#mapStage')) e.preventDefault(); });
document.addEventListener('drop', e => { const st = e.target.closest && e.target.closest('#mapStage'); if (!st) return; const d = e.dataTransfer.getData('text/plain');
  if (d && d.startsWith('pin:')){ e.preventDefault(); addPin(APP_cur(), d.slice(4), stagePos(e)); } });
// move pins (edit mode) with mouse or touch
let pinDrag = null;
document.addEventListener('pointerdown', e => { if (!APP.mapEdit) return; const pin = e.target.closest('.pin'); if (!pin || e.target.closest('.pin-x')) return; e.preventDefault(); pinDrag = {el: pin, id: pin.dataset.pin}; pin.setPointerCapture && pin.setPointerCapture(e.pointerId); });
document.addEventListener('pointermove', e => { if (!pinDrag) return; const p = stagePos(e); pinDrag.el.style.left = p.x + '%'; pinDrag.el.style.top = p.y + '%'; pinDrag.pos = p; });
document.addEventListener('pointerup', () => { if (!pinDrag) return; const c = APP_cur(); const m = curMap(c); const p = (m.pins || []).find(x => x.id === pinDrag.id);
  if (p && pinDrag.pos){ p.x = Math.round(pinDrag.pos.x * 10) / 10; p.y = Math.round(pinDrag.pos.y * 10) / 10; markDirty(); } pinDrag = null; });
document.addEventListener('change', async e => {
  const t = e.target; if (t.id !== 'mapNewFile' && !t.dataset.mapfile) return; const f = t.files[0]; t.value = ''; if (!f) return;
  if (!/^image\//.test(f.type)){ toast('That file isn\'t an image. Try a JPG or PNG.', 'warn'); return; }
  const c = APP_cur(); toast('Loading map…');
  try { const data = await mapImageFromFile(f); c.maps = c.maps || [];
    if (t.id === 'mapNewFile'){ const m = {id:uid('map'), n:f.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '), img:'', pins:[]}; mapStore(m, data); c.maps.push(m); APP.mapSel = m.id; APP.mapZoom = 100; }
    else { const m = c.maps.find(x => x.id === t.dataset.mapfile); mapStore(m, data); }
    markDirty(); renderAll(); toast('Map saved.');
  } catch { toast('That image couldn\'t be read. Try saving it as a JPG or PNG first.', 'warn'); }
});

// ---- zoom with the mouse wheel / pinch, drag to pan ----
const MAP_ZMIN = 50, MAP_ZMAX = 1200;
function setMapZoom(z, cx, cy){
  const vp = $('#mapVp'), st = $('#mapStage'); z = Math.round(Math.max(MAP_ZMIN, Math.min(MAP_ZMAX, z)));
  if (!vp || !st){ APP.mapZoom = z; return; }
  const old = APP.mapZoom; if (z === old) return; const r = vp.getBoundingClientRect();
  const ox = cx - r.left, oy = cy - r.top; const px = vp.scrollLeft + ox, py = vp.scrollTop + oy; const k = z / old;
  APP.mapZoom = z; st.style.width = z + '%'; vp.scrollLeft = px * k - ox; vp.scrollTop = py * k - oy;
  const l = $('#mapZoomLbl'); if (l) l.textContent = z + '%'; st.classList.toggle('zoomed', z > 100);
}
document.addEventListener('wheel', e => {
  const vp = e.target.closest && e.target.closest('#mapVp'); if (!vp || !$('#mapStage img, #mapStage canvas')) return;
  e.preventDefault(); hideTip();
  const step = Math.exp(-Math.sign(e.deltaY) * Math.min(Math.abs(e.deltaY), 120) / 600); // ~1.2× per notch
  setMapZoom(APP.mapZoom * step, e.clientX, e.clientY);
}, {passive:false});
let mapPan = null, mapSuppressClick = false; const mapTouches = new Map();
document.addEventListener('pointerdown', e => {
  const st = e.target.closest && e.target.closest('#mapStage'); if (!st || e.button > 0) return;
  if (APP.mapEdit && e.target.closest('.pin')) return; // moving a pin instead
  if (e.target.closest('.pin-x')) return;
  const vp = $('#mapVp');
  if (e.pointerType === 'touch'){ mapTouches.set(e.pointerId, {x:e.clientX, y:e.clientY});
    if (mapTouches.size === 2){ const [a, b] = [...mapTouches.values()]; mapPan = {pinch:true, d:Math.hypot(a.x - b.x, a.y - b.y), z:APP.mapZoom}; }
    return; } // one finger: the browser scrolls the map natively
  mapPan = {x:e.clientX, y:e.clientY, sl:vp.scrollLeft, st:vp.scrollTop, moved:false};
});
document.addEventListener('pointermove', e => {
  if (e.pointerType === 'touch' && mapTouches.has(e.pointerId)){ mapTouches.set(e.pointerId, {x:e.clientX, y:e.clientY});
    if (mapPan && mapPan.pinch && mapTouches.size === 2){ const [a, b] = [...mapTouches.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y);
      setMapZoom(mapPan.z * d / mapPan.d, (a.x + b.x) / 2, (a.y + b.y) / 2); mapSuppressClick = true; } return; }
  if (!mapPan || mapPan.pinch) return; const dx = e.clientX - mapPan.x, dy = e.clientY - mapPan.y;
  if (!mapPan.moved && Math.hypot(dx, dy) < 5) return;
  if (!mapPan.moved){ mapPan.moved = true; hideTip(); const st = $('#mapStage'); if (st) st.classList.add('panning'); }
  const vp = $('#mapVp'); vp.scrollLeft = mapPan.sl - dx; vp.scrollTop = mapPan.st - dy;
});
const endPan = e => { if (e.pointerType === 'touch'){ mapTouches.delete(e.pointerId); if (mapTouches.size < 2 && mapPan && mapPan.pinch) mapPan = null; return; }
  if (!mapPan) return; if (mapPan.moved) mapSuppressClick = true; const st = $('#mapStage'); if (st) st.classList.remove('panning'); mapPan = null; };
document.addEventListener('pointerup', endPan); document.addEventListener('pointercancel', endPan);
// a drag shouldn't count as a click (so it doesn't drop a pin or open a card)
document.addEventListener('click', e => { if (mapSuppressClick && e.target.closest && e.target.closest('#mapStage')){ e.stopPropagation(); e.preventDefault(); } mapSuppressClick = false; }, true);
