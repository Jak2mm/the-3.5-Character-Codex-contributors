# Windows and Android apps

The Codex is one web page (`index.html`). The apps are thin wrappers around that same page:

| | What it uses | What people download |
|---|---|---|
| **Windows** | [Tauri](https://tauri.app) (Microsoft Edge WebView2, built into Windows 10 and 11) | `…-Windows-setup.exe` (or `.msi`), about 3–5 MB |
| **Android** | [Capacitor](https://capacitorjs.com) (Android System WebView) | `…-Android.apk` |
| **Any device** | The website itself, installable as an app (PWA) | Nothing. Open the site and choose **Install app** |

Characters are saved on each device, inside the app. Use **Export** and **Import** to move them between devices.
On Android, **Export** opens the share sheet, so you can save the file to Drive or Files, or send it to yourself.

## Building with GitHub (no tools needed on your computer)

1. Copy `native/github-workflow/build-apps.yml` into your repository at **`.github/workflows/build-apps.yml`**
   (it must be in that folder at the top of the repository, not inside the app folder).
2. On GitHub, open **Actions → Build Windows and Android apps → Run workflow**, type a version such as `1.0.0`, and click **Run workflow**.
3. After about 10–15 minutes, the installers appear under **Releases** on your repository's main page.

The workflow finds the app folder by itself: an `app/` folder, the repository root, or the highest-numbered
`character-codex-35_N/character-codex-35` folder. You can also type the folder name when you run it.

Use a higher version number each time (1.0.1, 1.1.0 …). Android only updates an installed app when the new one has a higher version.

## Building on your own computer

You need [Node.js 20+](https://nodejs.org). First build the page: `python tools/build.py`.

**Windows app:** install [Rust](https://rustup.rs) and the Visual Studio C++ Build Tools (see Tauri's prerequisites), then

```bash
cd native/tauri
npm install
npm run build          # installers end up in src-tauri/target/release/bundle/
npm run dev            # or open a test window
```

**Android app:** install [Android Studio](https://developer.android.com/studio) (it brings Java and the Android SDK), then

```bash
cd native/android
npm install
npm run setup          # creates native/android/android, with icons and splash screens
npx cap open android   # opens it in Android Studio: Run ▶ on a phone or emulator, or Build → Build APK
```

After changing the app, run `python tools/build.py` and then `npm run sync` (Android) or `npm run build` (Windows).

## Notes

- **Unsigned builds.** The Windows installer isn't code-signed, so Windows SmartScreen may say "unknown publisher"
  (choose *More info → Run anyway*). The Android APK is signed with a debug key: fine for installing from GitHub, but
  the Google Play Store needs a release key. Both can be added later without changing the app.
- **Icons** are drawn by `tools/make_icons.py` (run it after changing the design).
- `native/www/`, `node_modules/`, `native/android/android/` and `native/tauri/src-tauri/target/` are build output. Don't commit them.
