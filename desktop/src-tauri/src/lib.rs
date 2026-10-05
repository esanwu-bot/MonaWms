// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

/// 返回桌面端运行环境信息（登录页展示）
#[tauri::command]
fn app_info() -> serde_json::Value {
    serde_json::json!({
        "name": "MonaWMS Desktop",
        "version": env!("CARGO_PKG_VERSION"),
        "os": std::env::consts::OS,
        "arch": std::env::consts::ARCH,
    })
}

/// 模拟条码扫描枪读取。
/// 生产环境可替换为串口 / 键盘楔入(HID)扫描枪实现，前端调用方式不变。
#[tauri::command]
fn scan_barcode() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    format!("SCAN{:010}", secs % 10_000_000_000)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, app_info, scan_barcode])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
