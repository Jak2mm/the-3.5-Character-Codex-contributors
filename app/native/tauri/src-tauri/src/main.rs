// The Windows app is a window around the same index.html the website uses.
// Characters are saved inside the app's own storage on this computer.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running the 3.5 Character Codex");
}
