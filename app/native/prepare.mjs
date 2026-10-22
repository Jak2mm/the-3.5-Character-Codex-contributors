// Copies the built app (../index.html and its icons) into native/www, which both the
// Windows app (Tauri) and the Android app (Capacitor) package. Run after tools/build.py.
//   node native/prepare.mjs
import {cpSync, mkdirSync, rmSync, existsSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
const here = dirname(fileURLToPath(import.meta.url)), root = join(here, '..'), www = join(here, 'www');
if (!existsSync(join(root, 'index.html'))) { console.error('index.html not found. Run: python tools/build.py'); process.exit(1); }
rmSync(www, {recursive: true, force: true}); mkdirSync(www, {recursive: true});
cpSync(join(root, 'index.html'), join(www, 'index.html'));
cpSync(join(root, 'icons'), join(www, 'icons'), {recursive: true});
console.log('Copied index.html and icons into native/www');
