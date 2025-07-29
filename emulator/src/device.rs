use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Device {
    pub id: String,
    pub name: String,
    pub device_code: Option<String>,
    pub token: Option<String>,
    pub is_connected: bool,
    pub battery_level: u8,
    pub network_info: String,
    pub device_model: String,
    pub android_version: String,
    pub app_version: String,
    pub created_at: DateTime<Utc>,
    pub last_active_at: Option<DateTime<Utc>>,
}

impl Device {
    pub fn new(name: String) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            name,
            device_code: None,
            token: None,
            is_connected: false,
            battery_level: 85,
            network_info: "Wi-Fi".to_string(),
            device_model: "Google Pixel 7".to_string(),
            android_version: "13".to_string(),
            app_version: "1.0.0".to_string(),
            created_at: Utc::now(),
            last_active_at: None,
        }
    }

    pub fn connect(&mut self, device_code: String, token: String) {
        self.device_code = Some(device_code);
        self.token = Some(token);
        self.is_connected = true;
        self.last_active_at = Some(Utc::now());
    }

    pub fn disconnect(&mut self) {
        self.is_connected = false;
        self.token = None;
    }
}