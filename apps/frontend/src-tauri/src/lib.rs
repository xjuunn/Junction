use tauri::Manager;
use window_vibrancy::{apply_blur, apply_mica};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap();
            #[cfg(target_os = "windows")]
            {
                if let Err(e) = apply_mica(&window, None) {
                    eprintln!("无法应用Mica, fallback to blur: {:?}", e);
                    apply_blur(&window, Some((18, 18, 18, 125))).unwrap();
                }
            }

            #[cfg(target_os = "macos")]
            {
                apply_vibrancy(&window, NSVisualEffectMaterial::HudWindow, None, None)
                    .expect("不受支持的平台! 'apply_vibrancy'仅支持macOS");
            }

            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}