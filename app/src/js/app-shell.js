// ===================== INSTALLABLE APP (PWA) & THE WINDOWS / ANDROID APPS =====================
// The same page runs in a browser, as an installed web app, inside the Windows app (Tauri)
// and inside the Android app (Capacitor). This file holds the few things that differ.
const NATIVE = {
  android: !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()),
  windows: !!(window.__TAURI_INTERNALS__ || window.__TAURI__) || location.hostname === 'tauri.localhost' || location.protocol === 'tauri:',
};
NATIVE.any = NATIVE.android || NATIVE.windows;
if (NATIVE.any) document.documentElement.classList.add('native', NATIVE.android ? 'native-android' : 'native-windows');

// Save a text file (character export). Android: share sheet (save to Drive/Files, send by email…).
async function saveTextFile(fname, data, type = 'application/json'){
  if (NATIVE.android){
    const P = (window.Capacitor && window.Capacitor.Plugins) || {};
    if (P.Filesystem){
      const r = await P.Filesystem.writeFile({path: fname, data, directory: 'CACHE', encoding: 'utf8'});
      if (P.Share){ try { await P.Share.share({title: fname, files: [r.uri], dialogTitle: 'Save or send ' + fname}); return true; } catch (e){ if (/cancel/i.test(String(e && e.message))) return 'cancelled'; } }
      await P.Filesystem.writeFile({path: fname, data, directory: 'DOCUMENTS', encoding: 'utf8', recursive: true}); toast(`Saved <b>${esc(fname)}</b> in your Documents folder.`); return true;
    }
  }
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([data], {type})); a.download = fname; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500); return true;
}

// Offline support + "Install app" button — only on a normal https website (e.g. GitHub Pages)
const PWA_OK = 'serviceWorker' in navigator && !NATIVE.any && window.top === window && !/claude/i.test(location.hostname)
  && (location.protocol === 'https:' && !/^(localhost|127\.0\.0\.1)$/.test(location.hostname) || /[?&]pwatest\b/.test(location.search)); // ?pwatest lets developers try it on a local server
if (PWA_OK){
  window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
  let installEvt = null; const btn = () => document.getElementById('installApp');
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; const b = btn(); if (b) b.hidden = false; });
  window.addEventListener('appinstalled', () => { installEvt = null; const b = btn(); if (b) b.hidden = true; toast('Installed. Open <b>3.5 Character Codex</b> from your Start menu or home screen.'); });
  document.addEventListener('click', async e => { if (!e.target.closest('#installApp') || !installEvt) return; installEvt.prompt(); try { await installEvt.userChoice; } catch {} installEvt = null; const b = btn(); if (b) b.hidden = true; });
}
// Android's file picker can grey out .json files when the type filter is set, so let it show everything
if (NATIVE.android){ const f = document.getElementById('impFile'); if (f) f.removeAttribute('accept'); }
