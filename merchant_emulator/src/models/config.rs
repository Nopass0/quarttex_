use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    pub api_base_url: String,
    pub callback_server_port: u16,
    pub data_dir: PathBuf,
    pub export_dir: PathBuf,
    pub log_level: String,
    pub device_emulator_enabled: bool,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            api_base_url: "http://localhost:3000".to_string(),
            callback_server_port: 8080,
            data_dir: dirs::data_dir()
                .unwrap_or_else(|| PathBuf::from("."))
                .join("merchant-emulator"),
            export_dir: dirs::download_dir()
                .unwrap_or_else(|| PathBuf::from("."))
                .join("merchant-emulator-exports"),
            log_level: "info".to_string(),
            device_emulator_enabled: true,
        }
    }
}